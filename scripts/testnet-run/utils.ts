import { ethers } from "hardhat";
import { CCMPGateway__factory } from "../../typechain-types";
import type { CCMPMessageStruct } from "../../typechain-types/contracts/AxelarAdaptor";

const CCMPMessageRoutedTopic = "0xb163bf360fef1e41e4f6cecd0a3e58913c8abcbc45c112f1fb963f2ac9d047e5";

export const getCCMPMessagePayloadFromSourceTx = async (txHash: string): Promise<CCMPMessageStruct> => {
  const [signer] = await ethers.getSigners();
  const receipt = await ethers.provider.getTransactionReceipt(txHash);
  const gateway = CCMPGateway__factory.connect(receipt.to, signer);
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
    args,
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
    gasFeePaymentArgs: args,
  };
};
