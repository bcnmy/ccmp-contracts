import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import { ICCMPGateway__factory } from "../../typechain-types";
import { SampleContract__factory } from "../../typechain-types";
import { AxelarGMPRecoveryAPI, Environment, GatewayTx } from "@axelar-network/axelarjs-sdk";
import { GMPStatus } from "@axelar-network/axelarjs-sdk/dist/src/libs/TransactionRecoveryApi/AxelarRecoveryApi";
import { getCCMPMessagePayloadFromSourceTx } from "./utils";

import {
  fromContracts,
  toContracts,
  toChainId,
  fromChainId,
  exitGateway,
  sourceGateway,
  sourceHyphen,
  exitBatchHelper,
  sourceToken,
  toChain,
} from "./config";
import type { CCMPMessageStruct } from "../../typechain-types/contracts/interfaces/ICCMPGateway.sol/ICCMPGateway";

// const contracts = {
//   80001: {
//     CCMPExecutor: "0xAe4D41d1105896FC976e19681A42d3057Ee6c528",
//     AxelarAdaptor: "0x2BFA42C7359E789b2A78612B79510d09660B2E16",
//     WormholeAdaptor: "0x69a5eB67Dd7E9949C2D229E185273c30B3ab8C33",
//     CCMPConfigurationFacet: "0x690Af3506e145F14602C2f9f48b2c14C233bb1b3",
//     CCMPReceiverMessageFacet: "0x09d4b57F8ca6433FF5Df5Fac9C9BDCDfdc981e99",
//     CCMPSendMessageFacet: "0x1C1503a60A25FEe240EF5bF9996F8Fa39b14A195",
//     DiamondCutFacet: "0x12790f446A8Ab3359560cF6e513D6B4F73c85Ea3",
//     DiamondLoupeFacet: "0x61ec1d2f679e81Db68F4c809474C0D2A55496671",
//     DiamondInit: "0x9ab126305CbC757bF035d6b4d549675FdBE5f1B5",
//     Diamond: "0x5dB92fdAC16d027A3Fef6f438540B5818b6f66D5",
//     sampleContract: "0x9B9A1bE28bB12C78f0D02400D8755591Cd517739",

//     wormholeBridgeAddress: "0x0CBE91CF822c73C2315FB05100C2F714765d5c20",
//     emitterChain: "polygon" as ChainName,

//     hyphen: "0xDe4e4CDa407Eee8d9E76261a1F2d229A572743dE",
//     token: "0xeaBc4b91d9375796AA4F69cC764A4aB509080A58",
//     lpToken: "0x48E2577e5f781CBb3374912a31b1aa39c9E11d39",
//     liquidityProviders: "0xFD210117F5b9d98Eb710295E30FFF77dF2d80002",
//     liquidityFarming: "0xf97859fb869329933b40F36A86E7e44f334Ed16a",
//     decimals: 18,

//     batchHelper: "0xa759C8Db00DadBE0599E3a38B19B5C0E12e43BBe",
//   },
//   43113: {
//     CCMPExecutor: "0x320D8cfCA5d07FB88230626b12672708511B23D9",
//     AxelarAdaptor: "0x2aC78FF75EC3E1349fcC2d2ea30cf56318f93f25",
//     WormholeAdaptor: "0x41614647D4316230F11F1688a23A3DD3E92bcad5",
//     CCMPConfigurationFacet: "0x05e2861f30D818488D6470073F4b5342c571456a",
//     CCMPReceiverMessageFacet: "0xe001CD72Fd8DaB89DCb15D9AF878976C0661f19e",
//     CCMPSendMessageFacet: "0x8Fd6A634b9af487c005dB2c6bBc72fc50fdB55Da",
//     DiamondCutFacet: "0x50C45a33da35b9dD85c58C26589d68b15a95e9ed",
//     DiamondLoupeFacet: "0x79a76426Ba58aE18dAF6F1d17FD66FbAC4201be6",
//     DiamondInit: "0x1797DD06071319527d3C0d5ED19CeB46a56986cb",
//     Diamond: "0x53B309Ff259e568309A19810E3bF1647B6922afd",
//     sampleContract: "0xb145AF113BFa7bfe91E11F951d88d00B9127BBC9",

//     wormholeBridgeAddress: "0x7bbcE28e64B3F8b84d876Ab298393c38ad7aac4C",
//     emitterChain: "avalanche" as ChainName,

//     hyphen: "0xb726675394b2ddee2c897ad31a62c7545ad7c68d",
//     token: "0xC74dB45a7D3416249763c151c6324Ceb6B3217fd",
//     decimals: 6,
//   },
// };

// const chains = {
//   4002: {
//     url: process.env.FANTOM_TESTNET_URL!,
//   },
//   97: {
//     url: process.env.BSC_TESTNET_URL!,
//   },
//   80001: {
//     url: process.env.MUMBAI_URL!,
//   },
//   43113: {
//     url: process.env.FUJI_URL!,
//   },
// };

// const fromChainId = 43113;
// const toChainId = 80001;

// const fromContracts = contracts[fromChainId];
// const toContracts = contracts[toChainId];

// const toChain = chains[toChainId];

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
  const { Diamond: CCMPGatewayAddrTo } = toContracts;
  const provider = new ethers.providers.JsonRpcProvider(toChain.url);

  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  const gateway = ICCMPGateway__factory.connect(CCMPGatewayAddrTo, wallet);
  try {
    const executeParams = await sdk.queryExecuteParams(txHash);
    console.log(executeParams);
    const { hash, wait } = await gateway.receiveMessage(message, abiCoder.encode(["string"], ["he"]), false, {
      // gasPrice: ethers.utils.parseUnits("50", "gwei"),
      // gasLimit: 1000000,
    });
    console.log(`Submitted exit transaction ${hash} on exit chain.`);
    const { blockNumber } = await wait();
    console.log(`Transaction ${hash} confirmed on exit chain at block ${blockNumber}`);
  } catch (e) {
    console.error(`Error executing transaction`, e);
    const errorData = (e as any).error?.data || (e as any).error?.error?.data || (e as any).error?.error?.error?.data;
    if (errorData) {
      const error = gateway.interface.parseError(errorData);
      console.log(error);
    } else {
      console.log(JSON.stringify((e as any).error, null, 2));
    }
  }
};

const simpleMessage = async () => {
  const [signer] = await ethers.getSigners();

  const { Diamond: CCMPGatewayFromAddr } = fromContracts;
  const { sampleContract: SampleContractToAddr, AxelarAdaptor: AxelarAdaptorToAddr } = toContracts;

  const gateway = ICCMPGateway__factory.connect(CCMPGatewayFromAddr, signer);

  const sampleContract = SampleContract__factory.connect(SampleContractToAddr, signer);
  const calldata = sampleContract.interface.encodeFunctionData("emitEvent", ["Hello World"]);

  try {
    // const { hash, wait } = await gateway.sendMessage(
    //   toChainId,
    //   "axelar",
    //   [
    //     {
    //       to: SampleContractToAddr,
    //       _calldata: calldata,
    //     },
    //     {
    //       to: SampleContractToAddr,
    //       _calldata: calldata,
    //     },
    //     {
    //       to: SampleContractToAddr,
    //       _calldata: calldata,
    //     },
    //   ],
    //   {
    //     feeTokenAddress: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    //     feeAmount: 0,
    //     relayer: signer.address,
    //   },
    //   abiCoder.encode(["string"], [AxelarAdaptorToAddr]),
    //   {
    //     // gasLimit: 1000000,
    //   }
    // );

    // console.log(`Source chain hash: ${hash}`);
    // await wait();

    const hash = "0xa754010e0734e5c5a151acd7660c91d788c069ecc4fa5b1a1126542052bcfa17";

    const ccmpMessage = await getCCMPMessagePayloadFromSourceTx(hash);
    console.log(ccmpMessage);

    await waitUntilTxStatus(hash, [GMPStatus.DEST_EXECUTE_ERROR, GMPStatus.UNKNOWN_ERROR, GMPStatus.DEST_EXECUTED]);

    await executeApprovedTransaction(hash, ccmpMessage);
  } catch (e) {
    console.error(`Error executing transaction`, e);
    const errorData = (e as any).error?.data;
    if (errorData) {
      console.log(errorData);
      const error = gateway.interface.parseError(errorData);
      console.log(error);
    } else {
      console.log(e);
    }
  }
};

const preCheck = async () => {
  const fromGateway = sourceGateway();
  const toGateway = exitGateway();

  if ((await fromGateway.gateway(toChainId)) === ethers.constants.AddressZero) {
    console.log(`Gateway not set on source chain`);
    await (await fromGateway.setGateway(toChainId, toContracts.Diamond)).wait();
  }

  if ((await toGateway.gateway(fromChainId)) === ethers.constants.AddressZero) {
    console.log(`Gateway not set on exit chain`);
    await (await toGateway.setGateway(fromChainId, fromContracts.Diamond)).wait();
  }
};

const hyphenDepositAndCallWithBatchHelper = async () => {
  await preCheck();

  const hyphen = sourceHyphen();
  const gateway = sourceGateway();
  const sourceDecimals = BigNumber.from(10).pow(fromContracts.decimals);
  const token = sourceToken();
  const signerAddress = await gateway.signer.getAddress();
  const batchHelper = exitBatchHelper();

  const approval = await token.allowance(signerAddress, fromContracts.hyphen);
  console.log(`Approval To Hyphen: ${approval.toString()}`);
  if (approval.lt(ethers.constants.MaxInt256.div(2))) {
    console.log(`Approving token transfer to hyphen...`);
    await token.approve(fromContracts.hyphen, ethers.constants.MaxUint256);
  }

  try {
    const { hash, wait } = await hyphen.depositAndCall(
      {
        toChainId,
        tokenAddress: fromContracts.token,
        receiver: batchHelper.address,
        amount: BigNumber.from(100).mul(sourceDecimals),
        tag: "CCMPTest",
        payloads: [
          {
            to: toContracts.batchHelper,
            _calldata: batchHelper.interface.encodeFunctionData("execute", [
              toContracts.token,
              toContracts.lpToken,
              toContracts.liquidityProviders,
              toContracts.liquidityFarming,
              signerAddress,
            ]),
          },
        ],
        gasFeePaymentArgs: {
          feeTokenAddress: fromContracts.token,
          feeAmount: BigNumber.from(10).mul(sourceDecimals),
          relayer: "0x0000000000000000000000000000000000000001",
        },
        adaptorName: "axelar",
        routerArgs: abiCoder.encode(["uint256"], [0]),
        hyphenArgs: [],
      },
      {
        gasLimit: 1000000,
      }
    );
    await wait(1);

    // const hash = "0xf84a3b3c2ba05d6f12010311f5f8cbb03bd1b86a5e30737b884e3c61e8b37804";

    console.log(`Source chain hash: ${hash}`);

    const ccmpMessage = await getCCMPMessagePayloadFromSourceTx(hash);
    await waitUntilTxStatus(hash, [GMPStatus.DEST_EXECUTE_ERROR, GMPStatus.UNKNOWN_ERROR, GMPStatus.DEST_EXECUTED]);

    await executeApprovedTransaction(hash, ccmpMessage);
  } catch (e) {
    console.error(`Error executing transaction`);
    console.log(e);
    const errorData = (e as any).error?.data || (e as any).error?.error?.data || (e as any).error?.error?.error?.data;
    if (errorData) {
      console.log(errorData);
      const error = gateway.interface.parseError(errorData);
      console.log(error);
    }
  }
};

hyphenDepositAndCallWithBatchHelper();
