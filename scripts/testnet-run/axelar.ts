import { ethers } from 'hardhat';
import { BigNumber } from 'ethers';
import { ICCMPGateway__factory } from '../../typechain-types';
import { SampleContract__factory } from '../../typechain-types';
import { AxelarGMPRecoveryAPI, Environment, GatewayTx } from '@axelar-network/axelarjs-sdk';
import { GMPStatus } from '@axelar-network/axelarjs-sdk/dist/src/libs/TransactionRecoveryApi/AxelarRecoveryApi';
import { getCCMPMessagePayloadFromSourceTx } from './utils';

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
} from '../config';
import type { CCMPMessageStruct } from '../../typechain-types/contracts/interfaces/ICCMPGateway.sol/ICCMPGateway';

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
  const { AxelarAdaptor: AxelarAdaptorFrom } = fromContracts.ccmp;
  const { Diamond: CCMPGatewayAddrTo } = toContracts.ccmp;
  const provider = new ethers.providers.JsonRpcProvider(toChain.url);

  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  const gateway = ICCMPGateway__factory.connect(CCMPGatewayAddrTo, wallet);
  try {
    const executeParams = await sdk.queryExecuteParams(txHash);
    console.log(executeParams);
    const { hash, wait } = await gateway.receiveMessage(
      message,
      abiCoder.encode(['string'], ['he']),
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
    console.error(`Error executing transaction`, e);
    const errorData =
      (e as any).error?.data ||
      (e as any).error?.error?.data ||
      (e as any).error?.error?.error?.data;
    if (errorData) {
      const error = gateway.interface.parseError(errorData);
      console.log(error);
    } else {
      console.log(JSON.stringify((e as any).error, null, 2));
    }
  }
};

const preCheck = async () => {
  const fromGateway = sourceGateway();
  const toGateway = exitGateway();

  if ((await fromGateway.gateway(toChainId)) === ethers.constants.AddressZero) {
    console.log(`Gateway not set on source chain`);
    await (await fromGateway.setGateway(toChainId, toContracts.ccmp.Diamond)).wait();
  }

  if ((await toGateway.gateway(fromChainId)) === ethers.constants.AddressZero) {
    console.log(`Gateway not set on exit chain`);
    await (await toGateway.setGateway(fromChainId, fromContracts.ccmp.Diamond)).wait();
  }
};

const hyphenDepositAndCallWithBatchHelper = async () => {
  await preCheck();

  const hyphen = sourceHyphen();
  const gateway = sourceGateway();
  const sourceDecimals = BigNumber.from(10).pow(fromContracts.test.decimals);
  const token = sourceToken();
  const signerAddress = await gateway.signer.getAddress();
  const batchHelper = exitBatchHelper();

  const approval = await token.allowance(signerAddress, fromContracts.hyphen.liquidityPool);
  console.log(`Approval To Hyphen: ${approval.toString()}`);
  if (approval.lt(ethers.constants.MaxInt256.div(2))) {
    console.log(`Approving token transfer to hyphen...`);
    await token.approve(fromContracts.hyphen.liquidityPool, ethers.constants.MaxUint256);
  }

  try {
    const { hash, wait } = await hyphen.depositAndCall(
      {
        toChainId,
        tokenAddress: fromContracts.test.token,
        receiver: batchHelper.address,
        amount: BigNumber.from(100).mul(sourceDecimals),
        tag: 'CCMPTest',
        payloads: [
          {
            to: toContracts.test.batchHelper,
            _calldata: batchHelper.interface.encodeFunctionData('execute', [
              toContracts.test.token,
              toContracts.hyphen.lpToken,
              toContracts.hyphen.liquidityProviders,
              toContracts.hyphen.liquidityFarming,
              signerAddress,
            ]),
          },
        ],
        gasFeePaymentArgs: {
          feeTokenAddress: fromContracts.test.token,
          feeAmount: BigNumber.from(10).mul(sourceDecimals),
          relayer: '0x0000000000000000000000000000000000000001',
        },
        adaptorName: 'axelar',
        routerArgs: abiCoder.encode(['uint256'], [0]),
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
    await waitUntilTxStatus(hash, [
      GMPStatus.DEST_EXECUTE_ERROR,
      GMPStatus.UNKNOWN_ERROR,
      GMPStatus.DEST_EXECUTED,
    ]);

    await executeApprovedTransaction(hash, ccmpMessage);
  } catch (e) {
    console.error(`Error executing transaction`);
    console.log(e);
    const errorData =
      (e as any).error?.data ||
      (e as any).error?.error?.data ||
      (e as any).error?.error?.error?.data;
    if (errorData) {
      console.log(errorData);
      const error = gateway.interface.parseError(errorData);
      console.log(error);
    }
  }
};

hyphenDepositAndCallWithBatchHelper();
