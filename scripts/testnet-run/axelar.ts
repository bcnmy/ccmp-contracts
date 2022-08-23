import { ethers } from "hardhat";
import { CCMPGateway__factory } from "../../typechain-types";
import { SampleContract__factory } from "../../typechain-types";
import { AxelarGMPRecoveryAPI, Environment, GatewayTx } from "@axelar-network/axelarjs-sdk";
import { GMPStatus } from "@axelar-network/axelarjs-sdk/dist/src/libs/TransactionRecoveryApi/AxelarRecoveryApi";
import { CCMPMessageStruct } from "../../typechain-types/contracts/AxelarAdaptor";

const gatewayFuji = "0x40FB0a105f2A35b1612bD01698b6c4649d2f19B3";
const axelarAdatorFuji = "0x9ee106c59dDEE6C9157fE007FD929834bde5054d";
const sampleContractFuji = "0x37285a8d96431F7DdaCB91a0fb69d5f073e6F261";

const gatewayMumbai = "0x80493DaA7a69FC1c7F980EFaF4beB0A669DFe6A1";
const sampleContractMumbai = "0xE3052F1bcF1F576457D231e91AF3803c6604DD7f";
const axelarAdaptorMumbai = "0x2766571e087AaF4642f9CF39e656FE286614D377";

const CCMPMessageRoutedTopic = "0xfe1e7fb1915d5db248f6ae7bcdec9c3104ca4f9379a152d313349626504466f6";

const sdk = new AxelarGMPRecoveryAPI({
  environment: Environment.TESTNET,
});

const abiCoder = new ethers.utils.AbiCoder();

const waitUntilTxStatus = async (txHash: string, expectedStatus: GMPStatus) => {
  await new Promise<void>((resolve, reject) => {
    const interval = setInterval(async () => {
      try {
        const status = await sdk.queryTransactionStatus(txHash);
        console.log(`Status of Transaction Hash ${txHash}: ${status.status}`);
        if (status.status === expectedStatus) {
          console.log(`Transaction Hash ${txHash}: ${expectedStatus}`);
          clearInterval(interval);
          resolve();
        }
      } catch (e) {
        console.error(`Error querying transaction status: ${e}`);
      }
    }, 1000);
  });
};

const executeApprovedTransaction = async (txHash: string, message: CCMPMessageStruct) => {
  console.log(`Executing source transaction message ${txHash} on exit chain...`);
  const provider = new ethers.providers.JsonRpcProvider(process.env.MUMBAI_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  const gateway = CCMPGateway__factory.connect(gatewayMumbai, wallet);
  try {
    const { commandId } = (await sdk.queryExecuteParams(txHash)).data;
    const { hash, wait } = await gateway.receiveMessage(
      message,
      abiCoder.encode(["bytes32", "string"], [commandId, ethers.utils.getAddress(axelarAdatorFuji)]),
      {
        gasPrice: ethers.utils.parseUnits("50", "gwei"),
        // gasLimit: 400000,
      }
    );
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

const getCCMPMessagePayloadFromSourceTx = async (txHash: string): Promise<CCMPMessageStruct> => {
  const [signer] = await ethers.getSigners();
  const receipt = await ethers.provider.getTransactionReceipt(txHash);
  const gateway = CCMPGateway__factory.connect(gatewayFuji, signer);
  const log = receipt.logs.find((log) => log.topics[0] === CCMPMessageRoutedTopic);
  if (!log) {
    throw new Error(`No CCMP message routed log found for transaction ${txHash}`);
  }
  const data = gateway.interface.parseLog(log);
  const {
    sender,
    sourceGateway,
    sourceAdaptor,
    sourceChainId,
    destinationGateway,
    destinationChainId,
    nonce,
    routerAdaptor,
    payload,
  } = data.args;
  return {
    sender,
    sourceGateway,
    sourceChainId,
    sourceAdaptor,
    destinationChainId,
    destinationGateway,
    nonce,
    routerAdaptor,
    payload,
  };
};

(async () => {
  const [signer] = await ethers.getSigners();
  const gateway = CCMPGateway__factory.connect(gatewayFuji, signer);

  const sampleContract = SampleContract__factory.connect(sampleContractFuji, signer);
  const calldata = sampleContract.interface.encodeFunctionData("emitEvent", ["Hello World"]);
  const ccmpOperationData = abiCoder.encode(["address", "bytes"], [sampleContractMumbai, calldata]);

  try {
    const { hash, wait } = await gateway.sendMessage(
      80001,
      "axelar",
      [
        {
          operation: 0,
          data: ccmpOperationData,
        },
        {
          operation: 0,
          data: ccmpOperationData,
        },
        {
          operation: 0,
          data: ccmpOperationData,
        },
      ],
      abiCoder.encode(["string"], [axelarAdaptorMumbai])
    );

    console.log(`Source chain hash: ${hash}`);
    await wait();

    const ccmpMessage = await getCCMPMessagePayloadFromSourceTx(hash);
    console.log(ccmpMessage);

    await waitUntilTxStatus(hash, GMPStatus.DEST_GATEWAY_APPROVED);

    await executeApprovedTransaction(hash, ccmpMessage);
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
