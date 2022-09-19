import { ethers } from "hardhat";
import { CCMPGateway__factory, SampleContract__factory } from "../../typechain-types";
import { getCCMPMessagePayloadFromSourceTx } from "./utils";
import { NodeHttpTransport } from "@improbable-eng/grpc-web-node-http-transport";
import { getSignedVAA, getEmitterAddressEth, parseSequenceFromLogEth } from "@certusone/wormhole-sdk";
import type { CCMPMessageStruct } from "../../typechain-types/contracts/AxelarAdaptor";

const gatewayFuji = "0xa7Bd4f70E4d467E2f35B2c3edD7EC1E7f1e18B2b";
const wormholeAdapterFuji = "0x1172c99289451B5EaDDefDCB650411E512183099";
const sampleContractFuji = "0xBA11fA3Af8CA0D2199CFe91eC4c25eaff54Badb4";
const bridgeAddressFuji = "0x7bbcE28e64B3F8b84d876Ab298393c38ad7aac4C";

const gatewayMumbai = "0x07a7747Dee8fFED4Fd622A67F9245050e63D2f7C";
const sampleContractMumbai = "0xb87a4E3B9cFD35Bd11d23993715C21b6a39c7c63";

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
      {
        mode: 0,
        feeTokenAddress: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
        feeAmount: 0,
        feeSourcePayloadIndex: 0,
        relayer: gatewayFuji,
      },
      abiCoder.encode(["uint256"], [CONSISTENCY_LEVEL])
    );

    console.log(`Source chain hash: ${hash}`);
    await wait(5);

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
