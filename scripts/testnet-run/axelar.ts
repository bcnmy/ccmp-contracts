import { ethers } from "hardhat";
import { ICCMPGateway__factory } from "../../typechain-types";
import { SampleContract__factory } from "../../typechain-types";
import { AxelarGMPRecoveryAPI, Environment, GatewayTx } from "@axelar-network/axelarjs-sdk";
import { GMPStatus } from "@axelar-network/axelarjs-sdk/dist/src/libs/TransactionRecoveryApi/AxelarRecoveryApi";
import type { CCMPMessageStruct } from "../../typechain-types/contracts/CCMPGateway";
import { getCCMPMessagePayloadFromSourceTx } from "./utils";

const contracts = {
  4002: {
    CCMPGateway: "0xaA02b9E819321838c932B0eD3e1dBE75F0CFAD5a",
    CCMPExecutor: "0x4bc978BDA72711fb1b10a2D990768cc08ad91253",
    AxelarAdaptor: "0x4F93dBD44B74B5f401AFeB934DD6210204875796",
    WormholeAdaptor: "0x2b7F95cb023a8346a57993B9585a524cbD485f91",
    sampleContract: "0x882a62Cfc40D191b5F32ab8C42FFac6393Cf298f",
  },
  97: {
    CCMPGateway: "0x57101E1129E8E32c5D54bCe46a1c0528161c0079",
    CCMPExecutor: "0xa3d42d67eAA9a5168B468DcB2507E244DCfb35cf",
    AxelarAdaptor: "0xcC3671499BC2a96792f01B039DEF9E7B812beCF9",
    WormholeAdaptor: "0xb0617498576Fbe331dB4724fEB697197038A7dB5",
    sampleContract: "0x964AFBf634DB15bb0a9122bae90eD8FaAC760179",
  },
  80001: {
    CCMPGateway: "0x9E224d8e8a88c48994E120B299dC7C78EbAeE5De",
    CCMPExecutor: "0xc34FC692537C51c949E2D4B62635F032153Fcc48",
    AxelarAdaptor: "0x6D59D60778C68B5FA85fd77965580Fe9f09b4ec8",
    WormholeAdaptor: "0x511274aAF461D40C1911900DC5aF4bFbe3c354bD",
    sampleContract: "0xb28500030E6738Be0540551B5b78C447e746b2d2",
  },
};

const chains = {
  4002: {
    url: process.env.FANTOM_TESTNET_URL!,
  },
  97: {
    url: process.env.BSC_TESTNET_URL!,
  },
  80001: {
    url: process.env.MUMBAI_URL!,
  },
};

const fromContracts = contracts[97];
const toContracts = contracts[80001];

const toChain = chains[80001];

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
  const { AxelarAdaptor: AxelarAdaptorFrom } = fromContracts;
  const { CCMPGateway: CCMPGatewayAddrTo } = toContracts;
  const provider = new ethers.providers.JsonRpcProvider(toChain.url);

  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  const gateway = ICCMPGateway__factory.connect(CCMPGatewayAddrTo, wallet);
  try {
    const { commandId } = (await sdk.queryExecuteParams(txHash)).data;
    // const commandId = "0xa1c6a58af35571dba84a8198a036d1548180438abfda616d09c1856b182d3769";
    const executeParams = await sdk.queryExecuteParams(txHash);
    console.log(executeParams);
    const { hash, wait } = await gateway.receiveMessage(
      message,
      abiCoder.encode(["bytes32", "string"], [commandId, ethers.utils.getAddress(AxelarAdaptorFrom)]),
      false,
      {
        // gasPrice: ethers.utils.parseUnits("50", "gwei"),
        // gasLimit: 1000000,
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

  const { CCMPGateway: CCMPGatewayFromAddr } = fromContracts;
  const { sampleContract: SampleContractToAddr, AxelarAdaptor: AxelarAdaptorToAddr } = toContracts;

  const gateway = ICCMPGateway__factory.connect(CCMPGatewayFromAddr, signer);

  const sampleContract = SampleContract__factory.connect(SampleContractToAddr, signer);
  const calldata = sampleContract.interface.encodeFunctionData("emitEvent", ["Hello World"]);

  try {
    const { hash, wait } = await gateway.sendMessage(
      80001,
      "axelar",
      [
        {
          to: SampleContractToAddr,
          _calldata: calldata,
        },
        {
          to: SampleContractToAddr,
          _calldata: calldata,
        },
        {
          to: SampleContractToAddr,
          _calldata: calldata,
        },
      ],
      {
        feeTokenAddress: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
        feeAmount: 0,
        relayer: signer.address,
      },
      abiCoder.encode(["string"], [AxelarAdaptorToAddr])
    );

    console.log(`Source chain hash: ${hash}`);
    await wait();

    const ccmpMessage = await getCCMPMessagePayloadFromSourceTx(hash);
    console.log(ccmpMessage);

    await waitUntilTxStatus(hash, [GMPStatus.DEST_EXECUTE_ERROR, GMPStatus.UNKNOWN_ERROR, GMPStatus.DEST_EXECUTED]);

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
