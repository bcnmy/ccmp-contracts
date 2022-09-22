import { ethers } from "hardhat";
import { CCMPGateway__factory, SampleContract__factory } from "../../typechain-types";
import { getCCMPMessagePayloadFromSourceTx } from "./utils";
import { NodeHttpTransport } from "@improbable-eng/grpc-web-node-http-transport";
import { getSignedVAA, getEmitterAddressEth, parseSequenceFromLogEth } from "@certusone/wormhole-sdk";
import type { CCMPMessageStruct } from "../../typechain-types/contracts/CCMPGateway";

/**
 * Polygon:
 * Contracts: 
   CCMPGateway: 0xdB44222Ca41a66F334201d9716D5472742913fE4
   CCMPExecutor: 0xbf6Fa3c4aF92cdA0125320855412d48d304E26c2
   WormholeAdaptor: 0xc919F44ff2ddBcD47cD8a3596dD8009f80Dbbb88
   sampleContract: 0x50216dD1B7B9D4F8ccdA2d122678E7a58F69D56d
 */

/**
 * Goerli:
 * Contracts: 
   CCMPGateway: 0x58dFB44951948b39a5E9ED2172c53E9a47bF1Dff
   CCMPExecutor: 0x19347b86a9d3ea4D3CAC4155e5585FEC0Df88BB2
   WormholeAdaptor: 0x0fBBe55CFCEa316250b821F5c1ba91F0fc4fb425
   sampleContract: 0x27299702283E766A701258B5dFaa949c90574918*
 */

const gatewayGoerli = "0x58dFB44951948b39a5E9ED2172c53E9a47bF1Dff";
const wormholeAdapterGoerli = "0x0fBBe55CFCEa316250b821F5c1ba91F0fc4fb425";
const sampleContractGoerli = "0xBA11fA3Af8CA0D2199CFe91eC4c25eaff54Badb4";
const bridgeAddressGoerli = "0x706abc4E45D419950511e474C7B9Ed348A4a716c";

const gatewayMumbai = "0xdB44222Ca41a66F334201d9716D5472742913fE4";
const wormholeAdaptorMumbai = "0xc919F44ff2ddBcD47cD8a3596dD8009f80Dbbb88";
const sampleContractMumbai = "0x50216dD1B7B9D4F8ccdA2d122678E7a58F69D56d";
const bridgeAddressMumbai = "0x0CBE91CF822c73C2315FB05100C2F714765d5c20";

const emitterChain = "ethereum";

const wormholeRpcHost = "https://wormhole-v2-testnet-api.certus.one";

const abiCoder = new ethers.utils.AbiCoder();

const CONSISTENCY_LEVEL = 1;

const getVaa = async (sourceTxHash: string): Promise<Uint8Array> => {
  const emitter = getEmitterAddressEth(wormholeAdapterGoerli);
  console.log(`Emitter Address for Wormhole Adapter goerli: ${emitter}`);

  const receipt = await ethers.provider.getTransactionReceipt(sourceTxHash);

  console.log(receipt);
  const sequence = parseSequenceFromLogEth(receipt, bridgeAddressGoerli);
  console.log(`Sequence for Wormhole Adapter Goerli: ${sequence}`);

  console.log(`Getting VAA for source transaction ${sourceTxHash}...`);
  return new Promise<Uint8Array>((resolve, reject) => {
    const id = setInterval(async () => {
      try {
        console.log(wormholeRpcHost, emitterChain, emitter, sequence);
        const { vaaBytes } = await getSignedVAA(wormholeRpcHost, emitterChain, emitter, sequence, {
          transport: NodeHttpTransport(),
        });
        clearInterval(id);
        resolve(vaaBytes);
      } catch (e) {
        console.log("VAA Not found", e);
      }
    }, 2000);
  });
};

const executeApprovedTransaction = async (txHash: string, message: CCMPMessageStruct, vaa: Uint8Array) => {
  console.log(`Executing source transaction ${txHash} on exit chain...`);
  const provider = new ethers.providers.JsonRpcProvider(process.env.MUMBAI_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  const gateway = CCMPGateway__factory.connect(gatewayMumbai, wallet);
  try {
    const { hash, wait } = await gateway.receiveMessage(message, vaa, {
      // gasPrice: ethers.utils.parseUnits("50", "gwei"),
    });
    console.log(`Submitted exit transaction ${hash} on exit chain.`);
    const { blockNumber } = await wait(5);
    console.log(`Transaction ${hash} confirmed on exit chain at block ${blockNumber}`);
  } catch (e) {
    console.error(`Error executing transaction`);
    const errorData = (e as any).error?.data || (e as any).error?.error?.data || (e as any).error?.error?.error?.data;
    if (errorData) {
      const error = gateway.interface.parseError(errorData);
      console.log(error);
    } else {
      console.log(JSON.stringify((e as any).error, null, 2));
    }
  }
};

(async () => {
  const [signer] = await ethers.getSigners();
  const networkId = (await ethers.provider.getNetwork()).chainId;

  const gateway = CCMPGateway__factory.connect(gatewayGoerli, signer);

  const sampleContract = SampleContract__factory.connect(sampleContractGoerli, signer);
  const calldata = sampleContract.interface.encodeFunctionData("emitEvent", ["Hello World"]);

  try {
    const { hash, wait } = await gateway.sendMessage(
      80001,
      "wormhole",
      [
        {
          to: sampleContractMumbai,
          _calldata: calldata,
        },
        {
          to: sampleContractMumbai,
          _calldata: calldata,
        },
        {
          to: sampleContractMumbai,
          _calldata: calldata,
        },
      ],
      {
        feeTokenAddress: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
        feeAmount: 0,
        relayer: gatewayMumbai,
      },
      abiCoder.encode(["uint256"], [CONSISTENCY_LEVEL]),
      {
        gasPrice: 50 * 1e9,
      }
    );

    console.log(`Source chain hash: ${hash}`);
    await wait();

    const ccmpMessage = await getCCMPMessagePayloadFromSourceTx(hash);

    const vaa = await getVaa(hash);

    await executeApprovedTransaction(hash, ccmpMessage, vaa);
  } catch (e) {
    console.error(`Error executing transaction`);
    const errorData = (e as any).error?.data;
    if (errorData) {
      console.log(errorData);
      const error = gateway.interface.parseError(errorData);
      console.log(error);
    } else {
      console.log(e);
    }
  }
})();
