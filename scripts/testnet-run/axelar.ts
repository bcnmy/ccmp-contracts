import { ethers } from "hardhat";
import { CCMPGateway__factory } from "../../typechain-types";
import { SampleContract__factory } from "../../typechain-types";
import { AxelarGMPRecoveryAPI, Environment, GatewayTx } from "@axelar-network/axelarjs-sdk";
import { GMPStatus } from "@axelar-network/axelarjs-sdk/dist/src/libs/TransactionRecoveryApi/AxelarRecoveryApi";
import { CCMPMessageStruct } from "../../typechain-types/contracts/AxelarAdaptor";
import { getCCMPMessagePayloadFromSourceTx } from "./utils";

const gatewayFuji = "0xe73B00374b9B1dc3831ef7F3Fc389A485d4eDd92";
const axelarAdatorFuji = "0x7db0c0244CB14960e4628cA855A5ce6c6F6C3475";
const sampleContractFuji = "0x2761B67709aB1cdedE276314bD322a113d6858B5";

const gatewayMumbai = "0x4a69Eb6f8e590A2a5AC31Ee57F9Ed1A5f7ea72E2";
const sampleContractMumbai = "0x6eDA69DFd55F23Ee20ca1575CC79Aa79Ce453eBb";
const axelarAdaptorMumbai = "0xd4835D316252D66A85a0B7e919dB03538a84E17e";

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

(async () => {
  const [signer] = await ethers.getSigners();
  const networkId = (await ethers.provider.getNetwork()).chainId;
  if (networkId != 43113) {
    throw new Error("Run script on fuji");
  }

  const gateway = CCMPGateway__factory.connect(gatewayFuji, signer);

  const sampleContract = SampleContract__factory.connect(sampleContractFuji, signer);
  const calldata = sampleContract.interface.encodeFunctionData("emitEvent", ["Hello World"]);

  try {
    const { hash, wait } = await gateway.sendMessage(
      80001,
      "axelar",
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
        }
      ],
      {
        feeTokenAddress: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
        feeAmount: 0,
        relayer: gatewayFuji,
      },
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
