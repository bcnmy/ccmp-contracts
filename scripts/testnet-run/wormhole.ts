import { ethers } from "hardhat";
import { CCMPGateway__factory, SampleContract__factory } from "../../typechain-types";
import { getCCMPMessagePayloadFromSourceTx } from "./utils";
import { NodeHttpTransport } from "@improbable-eng/grpc-web-node-http-transport";
import { getSignedVAA, getEmitterAddressEth, parseSequenceFromLogEth } from "@certusone/wormhole-sdk";
import type { CCMPMessageStruct } from "../../typechain-types/contracts/AxelarAdaptor";

const gatewayFuji = "0xe73B00374b9B1dc3831ef7F3Fc389A485d4eDd92";
const wormholeAdapterFuji = "0x3775Cb56244fF117300eEc21b6E44aDb970777C6";
const sampleContractFuji = "0x2761B67709aB1cdedE276314bD322a113d6858B5";
const bridgeAddressFuji = "0x7bbcE28e64B3F8b84d876Ab298393c38ad7aac4C";

const gatewayMumbai = "0x4a69Eb6f8e590A2a5AC31Ee57F9Ed1A5f7ea72E2";
const sampleContractMumbai = "0x6eDA69DFd55F23Ee20ca1575CC79Aa79Ce453eBb";

const wormholeRpcHost = "https://wormhole-v2-testnet-api.certus.one";

const abiCoder = new ethers.utils.AbiCoder();

const CONSISTENCY_LEVEL = 1;

const getVaa = async (sourceTxHash: string): Promise<Uint8Array> => {
  const emmitter = getEmitterAddressEth(wormholeAdapterFuji);
  console.log(`Emitter Address for Wormhole Adapter Fuji: ${emmitter}`);

  const receipt = await ethers.provider.getTransactionReceipt(sourceTxHash);

  const sequence = parseSequenceFromLogEth(receipt, bridgeAddressFuji);
  console.log(`Sequence for Wormhole Adapter Fuji: ${sequence}`);

  console.log(`Getting VAA for source transaction ${sourceTxHash}...`);
  return new Promise<Uint8Array>((resolve, reject) => {
    const id = setTimeout(async () => {
      try {
        const { vaaBytes } = await getSignedVAA(wormholeRpcHost, 6, emmitter, sequence, {
          transport: NodeHttpTransport(),
        });
        clearTimeout(id);
        resolve(vaaBytes);
      } catch (e) {
        console.log(e);
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
      gasPrice: ethers.utils.parseUnits("50", "gwei"),
    });
    console.log(`Submitted exit transaction ${hash} on exit chain.`);
    const { blockNumber } = await wait();
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
  if (networkId != 43113) {
    throw new Error("Run script on fuji");
  }

  const gateway = CCMPGateway__factory.connect(gatewayFuji, signer);

  const sampleContract = SampleContract__factory.connect(sampleContractFuji, signer);
  const calldata = sampleContract.interface.encodeFunctionData("emitEvent", ["Hello World"]);
  const ccmpOperationData = abiCoder.encode(["address", "bytes"], [sampleContractMumbai, calldata]);

  try {
    const { hash, wait } = await gateway.sendMessage(
      80001,
      "wormhole",
      [
        {
          operationType: 0,
          data: ccmpOperationData,
        },
        {
          operationType: 0,
          data: ccmpOperationData,
        },
        {
          operationType: 0,
          data: ccmpOperationData,
        },
      ],
      abiCoder.encode(["uint256"], [CONSISTENCY_LEVEL])
    );

    console.log(`Source chain hash: ${hash}`);
    await wait();

    const ccmpMessage = await getCCMPMessagePayloadFromSourceTx(hash);
    console.log(ccmpMessage);

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
