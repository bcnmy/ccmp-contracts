import { ethers } from 'hardhat';
import axios from 'axios';
import { ICCMPGateway__factory } from '../../typechain-types';
import { fromContracts, fromChainId } from '../config';

(async () => {
  const ws = {
    5: 'wss://eth-goerli.g.alchemy.com/v2/ZGJiJpJ7HRiXFhj-f-XTcP2IhzOqJkNG',
    43113: 'wss://api.avax-test.network/ext/bc/C/ws',
    80001: 'wss://polygon-mumbai.g.alchemy.com/v2/vIasnJoALys9KzrsnZO_XFxBUYiFvhuA',
    420: 'wss://opt-goerli.g.alchemy.com/v2/AyBOfM4TgnPFt6PM7GsWodGmsyRLgva-',
    421613: 'wss://arb-goerli.g.alchemy.com/v2/G7Le1MzAcFgLuG6lIVw73_1wsZotpr28',
  };

  Object.entries(ws).forEach(([chainId, url]) => {
    const provider = new ethers.providers.WebSocketProvider(url);
    const gateway = ICCMPGateway__factory.connect(fromContracts.ccmp.Diamond, provider);
    gateway.on('*', async (data) => {
      if (data.event === 'CCMPMessageRouted') {
        console.log(`Message received on chainId ${chainId}`);
        const {
          hash,
          sender,
          sourceGateway,
          sourceAdaptor,
          sourceChainId,
          destinationGateway,
          destinationChainId,
          nonce,
          routerAdaptor,
          gasFeePaymentArgs,
          payload,
        } = data.args;
        const ccmpMessage = {
          hash,
          sender,
          sourceGateway,
          sourceAdaptor,
          sourceChainId: sourceChainId.toString(),
          destinationGateway,
          destinationChainId: destinationChainId.toString(),
          nonce: nonce.toString(),
          routerAdaptor,
          gasFeePaymentArgs: {
            FeeAmount: gasFeePaymentArgs.feeAmount.toString(),
            FeeTokenAddress: gasFeePaymentArgs.feeTokenAddress,
            Relayer: gasFeePaymentArgs.relayer,
          },
          payload: payload.map((p: any) => ({
            To: p.to,
            Calldata: p._calldata,
          })),
        };
        console.log('CCMPMessage: ', JSON.stringify(ccmpMessage, null, 2));
        const response = await axios.post(
          `http://localhost:3000/api/v1/cross-chain/process/indexer`,
          {
            chainId: sourceChainId.toNumber(),
            data: ccmpMessage,
            txHash: data.transactionHash,
          }
        );
        console.log('Response: ', response.data);
      }
    });
  });
})();
