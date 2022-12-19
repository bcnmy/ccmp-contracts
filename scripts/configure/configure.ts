import { ethers } from 'hardhat';
import {
  HyperlaneAdaptor__factory,
  ICCMPGateway__factory,
  WormholeAdaptor__factory,
} from '../../typechain-types';
import { contracts } from '../config';

export const configureGateway = async (chainId: keyof typeof contracts, debug: boolean = false) => {
  const [signer] = await ethers.getSigners();
  debug && console.log(`Configuring gateway on chainId ${chainId}...`);
  const Gateway = ICCMPGateway__factory.connect(contracts[chainId].ccmp.Diamond, signer);
  const gatewayList = Object.entries(contracts)
    .filter(([_chainId, _]) => chainId.toString() !== _chainId.toString())
    .map(([_chainId, { ccmp }]) => [_chainId, ccmp.Diamond]);
  debug && console.log(`Gateway list: ${JSON.stringify(gatewayList, null, 2)}`);
  const { wait, hash } = await Gateway.setGatewayBatch(
    gatewayList.map(([chainId, _]) => chainId),
    gatewayList.map(([_, gateway]) => gateway)
  );
  debug && console.log(`Gateway set tx hash: ${hash}`);
  const { blockNumber, status } = await wait();
  if (status === 1) {
    debug && console.log(`Gateway set tx successful at block ${blockNumber}`);
  } else {
    debug && console.error(`Gateway set tx failed at block ${blockNumber}`);
  }
};

export const configureWormholeAdaptor = async (
  chainId: keyof typeof contracts,
  debug: boolean = false
) => {
  const [signer] = await ethers.getSigners();
  debug && console.log(`Configuring wormhole adaptor on chainId ${chainId}...`);
  const wormholeAddress = contracts[chainId].ccmp.WormholeAdaptor;
  if (!wormholeAddress) {
    debug && console.log(`No WormholeAdaptor found on chainId ${chainId}`);
    return;
  }
  const WormholeAdaptor = WormholeAdaptor__factory.connect(wormholeAddress, signer);
  const wormoleAdaptorList = Object.entries(contracts)
    .filter(([_chainId, _]) => chainId.toString() !== _chainId.toString())
    .map(([_chainId, { ccmp }]) => [_chainId, ccmp.WormholeAdaptor])
    .filter(([_, wormholeAdaptor]) => !!wormholeAdaptor);
  debug && console.log(`Wormhole Adaptor list: ${JSON.stringify(wormoleAdaptorList, null, 2)}`);
  const { wait, hash } = await WormholeAdaptor.setWormholeAdaptorAddressBatch(
    wormoleAdaptorList.map(([chainId, _]) => chainId),
    wormoleAdaptorList.map(([_, gateway]) => gateway)
  );
  debug && console.log(`Wormhole Adaptor Set set tx hash: ${hash}`);
  const { blockNumber, status } = await wait();
  if (status === 1) {
    debug && console.log(`Worhole Adaptor Set tx successful at block ${blockNumber}`);
  } else {
    debug && console.error(`Wormhole Adaptor Set tx failed at block ${blockNumber}`);
  }
};

export const configureHyperlaneAdaptor = async (
  chainId: keyof typeof contracts,
  debug: boolean = false
) => {
  const [signer] = await ethers.getSigners();
  debug && console.log(`Configuring hyperlane adaptor on chainId ${chainId}...`);
  const hyperlaneAddress = contracts[chainId].ccmp.HyperlaneAdaptor;
  if (!hyperlaneAddress) {
    debug && console.log(`No HyperlaneAdaptor found on chainId ${chainId}`);
    return;
  }
  const HyperlaneAdaptor = HyperlaneAdaptor__factory.connect(hyperlaneAddress, signer);
  const hyperlaneAdaptorList = Object.entries(contracts)
    .filter(([_chainId, _]) => chainId.toString() !== _chainId.toString())
    .map(([_chainId, { ccmp }]) => [_chainId, ccmp.HyperlaneAdaptor])
    .filter(([_, hyperlaneAdaptor]) => !!hyperlaneAdaptor);
  debug && console.log(`Hyperlane Adaptor list: ${JSON.stringify(hyperlaneAdaptorList, null, 2)}`);
  const { wait, hash } = await HyperlaneAdaptor.setHyperlaneAdaptorBatch(
    hyperlaneAdaptorList.map(([chainId, _]) => chainId),
    hyperlaneAdaptorList.map(([_, gateway]) => gateway)
  );
  debug && console.log(`Hyperlane Adaptor Set set tx hash: ${hash}`);
  const { blockNumber, status } = await wait();
  if (status === 1) {
    debug && console.log(`Hyperlane Adaptor Set tx successful at block ${blockNumber}`);
  } else {
    debug && console.error(`Hyperlane Adaptor Set tx failed at block ${blockNumber}`);
  }
};

if (require.main === module) {
  (async () => {
    const signer = (await ethers.getSigners())[0];
    const chainId = (await signer.getChainId()) as keyof typeof contracts;
    await configureGateway(chainId, true);
    await configureWormholeAdaptor(chainId, true);
    await configureHyperlaneAdaptor(chainId, true);
  })();
}
