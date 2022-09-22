import { ethers } from "hardhat";
import { CCMPGateway__factory } from "../../typechain-types";
import { SampleContract__factory } from "../../typechain-types";
import { AxelarGMPRecoveryAPI, Environment, GatewayTx } from "@axelar-network/axelarjs-sdk";
import { GMPStatus } from "@axelar-network/axelarjs-sdk/dist/src/libs/TransactionRecoveryApi/AxelarRecoveryApi";
import type { CCMPMessageStruct } from "../../typechain-types/contracts/CCMPGateway";
import { getCCMPMessagePayloadFromSourceTx } from "./utils";

/**
 * Fantom Testnet
 * Contracts: 
   CCMPGateway: 0xaA02b9E819321838c932B0eD3e1dBE75F0CFAD5a
   CCMPExecutor: 0x4bc978BDA72711fb1b10a2D990768cc08ad91253
   AxelarAdaptor: 0x4F93dBD44B74B5f401AFeB934DD6210204875796
   WormholeAdaptor: 0x2b7F95cb023a8346a57993B9585a524cbD485f91
   sampleContract: 0x882a62Cfc40D191b5F32ab8C42FFac6393Cf298f
 */

/**
 * Polygon Testnet:
 * Contracts: 
   CCMPGateway: 0xdB44222Ca41a66F334201d9716D5472742913fE4
   CCMPExecutor: 0xbf6Fa3c4aF92cdA0125320855412d48d304E26c2
   WormholeAdaptor: 0x30AAf26d3ebe9ba1510707c89e510c1fffd5d2B3
   Axelar Adaptor: 0x8Cf61439Cb1d9468a4Bf37BA57A048eC1dA475A1
   sampleContract: 0x50216dD1B7B9D4F8ccdA2d122678E7a58F69D56d
 */
const gatewayFantom = "0xaA02b9E819321838c932B0eD3e1dBE75F0CFAD5a";
const axelarAdatorFantom = "0x4F93dBD44B74B5f401AFeB934DD6210204875796";
const sampleContractFantom = "0x882a62Cfc40D191b5F32ab8C42FFac6393Cf298f";

const gatewayMumbai = "0xdB44222Ca41a66F334201d9716D5472742913fE4";
const sampleContractMumbai = "0x50216dD1B7B9D4F8ccdA2d122678E7a58F69D56d";
const axelarAdaptorMumbai = "0x8Cf61439Cb1d9468a4Bf37BA57A048eC1dA475A1";

const sdk = new AxelarGMPRecoveryAPI({
  environment: Environment.TESTNET,
});

const abiCoder = new ethers.utils.AbiCoder();

const waitUntilTxStatus = async (txHash: string, expectedStatus: GMPStatus[]) => {
  await new Promise<void>((resolve, reject) => {
    const interval = setInterval(async () => {
      try {
        const status = await sdk.queryTransactionStatus(txHash);
        console.log(`Status of Transaction Hash ${txHash}: ${status.status}`);
        if (expectedStatus.includes(status.status)) {
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
      abiCoder.encode(["bytes32", "string"], [commandId, ethers.utils.getAddress(axelarAdatorFantom)]),
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
  if (networkId != 4002) {
    throw new Error("Run script on fantom testnet");
  }

  const gateway = CCMPGateway__factory.connect(gatewayFantom, signer);

  const sampleContract = SampleContract__factory.connect(sampleContractFantom, signer);
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
        },
      ],
      {
        feeTokenAddress: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
        feeAmount: 0,
        relayer: gatewayFantom,
      },
      abiCoder.encode(["string"], [axelarAdaptorMumbai])
    );

    console.log(`Source chain hash: ${hash}`);
    await wait();

    const ccmpMessage = await getCCMPMessagePayloadFromSourceTx(hash);
    console.log(ccmpMessage);

    await waitUntilTxStatus(hash, [GMPStatus.DEST_EXECUTE_ERROR, GMPStatus.UNKNOWN_ERROR]);

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
