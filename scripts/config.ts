import type { ChainName } from '@certusone/wormhole-sdk';
import { ethers } from 'hardhat';
import { ICCMPGateway__factory, ERC20Token__factory } from '../typechain-types';

export const contracts = {
  5: {
    ccmp: {
      CCMPExecutor: '0x8A97B3CD2451DA24a78D9827E4f3511A573cC7B3',
      WormholeAdaptor: '0x84fEe39095b18962b875588dF7F9Ad1bE87e8653',
      HyperlaneAdaptor: '0xDc490a8408605D4A411d1eba33b1C62148511293',
      CCMPConfigurationFacet: '0x1EDaF22d0dbCF5b3a74591d6F8B1a9AC779b2d93',
      CCMPReceiverMessageFacet: '0x2c1B8F72D9A3a1c64eB71c2013aa621efcf148DA',
      CCMPSendMessageFacet: '0x995224D302dE8bF0597D0C175a250a0E00a8236e',
      DiamondCutFacet: '0x29E81A71D7A584272BC2dEdB95a8Ee40db8eCAF6',
      DiamondLoupeFacet: '0xEAE111f62d207Df4B59c8cC7E675E1825307bD42',
      DiamondInit: '0xaA93B0345731D1E4B462f38F72e21F51435a041D',
      Diamond: '0x404172100D6A428F5Eae378650f4259CC803de7c',
    },
  },
  80001: {
    ccmp: {
      CCMPExecutor: '0x8A97B3CD2451DA24a78D9827E4f3511A573cC7B3',
      AxelarAdaptor: '0x0Cc730c0a69e464F6c50a536Edfee10B8E5c4495',
      WormholeAdaptor: '0x84fEe39095b18962b875588dF7F9Ad1bE87e8653',
      HyperlaneAdaptor: '0xDc490a8408605D4A411d1eba33b1C62148511293',
      CCMPConfigurationFacet: '0x1EDaF22d0dbCF5b3a74591d6F8B1a9AC779b2d93',
      CCMPReceiverMessageFacet: '0x2c1B8F72D9A3a1c64eB71c2013aa621efcf148DA',
      CCMPSendMessageFacet: '0x995224D302dE8bF0597D0C175a250a0E00a8236e',
      DiamondCutFacet: '0x29E81A71D7A584272BC2dEdB95a8Ee40db8eCAF6',
      DiamondLoupeFacet: '0xEAE111f62d207Df4B59c8cC7E675E1825307bD42',
      DiamondInit: '0xaA93B0345731D1E4B462f38F72e21F51435a041D',
      Diamond: '0x404172100D6A428F5Eae378650f4259CC803de7c',
    },
    wormhole: {
      bridgeAddress: '0x0CBE91CF822c73C2315FB05100C2F714765d5c20',
      emitterChain: 'polygon' as ChainName,
    },
    hyphen: {
      tokenManager: '0xEDeCaf06a91c31670617d696618a14EDc0BD718F',
      liquidityPool: '0xb831F0848A055b146a0b13D54cfFa6C1FE201b83',
      executorManager: '0xE46695ab15e7662F4e0731E2A8104a5782E55b41',
      lpToken: '0x337551aD8382b1b94ee180d4174ce1fFc794c8d4',
      liquidityProviders: '0x66AAD3DC0f9AAc8a31e07f0787D3D476489D75D3',
      liquidityFarming: '0x66D8d416405463a081Ba1c8085a1ffd31cdB038f',
      liquidityFarmingV1: '0x66D8d416405463a081Ba1c8085a1ffd31cdB038f',
      whitelistPeriodManager: '0x2e6434ec8c57532d675F52e279d23879337A3ada',
    },
    test: {
      token: '0xeaBc4b91d9375796AA4F69cC764A4aB509080A58',
      decimals: 18,
      batchHelper: '0xa759C8Db00DadBE0599E3a38B19B5C0E12e43BBe',
    },
  },
  43113: {
    ccmp: {
      CCMPExecutor: '0x8A97B3CD2451DA24a78D9827E4f3511A573cC7B3',
      AxelarAdaptor: '0x0Cc730c0a69e464F6c50a536Edfee10B8E5c4495',
      WormholeAdaptor: '0x84fEe39095b18962b875588dF7F9Ad1bE87e8653',
      HyperlaneAdaptor: '0xDc490a8408605D4A411d1eba33b1C62148511293',
      CCMPConfigurationFacet: '0x1EDaF22d0dbCF5b3a74591d6F8B1a9AC779b2d93',
      CCMPReceiverMessageFacet: '0x2c1B8F72D9A3a1c64eB71c2013aa621efcf148DA',
      CCMPSendMessageFacet: '0x995224D302dE8bF0597D0C175a250a0E00a8236e',
      DiamondCutFacet: '0x29E81A71D7A584272BC2dEdB95a8Ee40db8eCAF6',
      DiamondLoupeFacet: '0xEAE111f62d207Df4B59c8cC7E675E1825307bD42',
      DiamondInit: '0xaA93B0345731D1E4B462f38F72e21F51435a041D',
      Diamond: '0x404172100D6A428F5Eae378650f4259CC803de7c',
    },
    wormhole: {
      bridgeAddress: '0x7bbcE28e64B3F8b84d876Ab298393c38ad7aac4C',
      emitterChain: 'avalanche' as ChainName,
    },
    hyphen: {
      tokenManager: '0xd2b5Be34c55C76be26b805a2a250b1669e3C3fAB',
      liquidityPool: '0x07d2d1690D13f5fD9F9D51a96CEe211F6a845AC5',
      executorManager: '0x387655dDC91d3E3E068421A0433d58Ef82B43Db4',
      lpToken: '0x5D3b3b6377710be20a6e2586E1968508869207e0',
      liquidityProviders: '0xb22fC3a88E429a76CF5f9Ec06be646B53170513f',
      liquidityFarming: '0xeB2AacDF2207daD71F7BFCbece10d660D1fD2e6E',
      liquidityFarmingV1: '0xeB2AacDF2207daD71F7BFCbece10d660D1fD2e6E',
      whitelistPeriodManager: '0x9975118D4BD65220f8DEF04984A974aB082a2BfA',
    },
    test: {
      token: '0xC74dB45a7D3416249763c151c6324Ceb6B3217fd',
      decimals: 6,
    },
  },
  97: {
    ccmp: {
      CCMPExecutor: '0x8A97B3CD2451DA24a78D9827E4f3511A573cC7B3',
      AxelarAdaptor: '0x0Cc730c0a69e464F6c50a536Edfee10B8E5c4495',
      WormholeAdaptor: '0x84fEe39095b18962b875588dF7F9Ad1bE87e8653',
      HyperlaneAdaptor: '0xDc490a8408605D4A411d1eba33b1C62148511293',
      CCMPConfigurationFacet: '0x1EDaF22d0dbCF5b3a74591d6F8B1a9AC779b2d93',
      CCMPReceiverMessageFacet: '0x2c1B8F72D9A3a1c64eB71c2013aa621efcf148DA',
      CCMPSendMessageFacet: '0x995224D302dE8bF0597D0C175a250a0E00a8236e',
      DiamondCutFacet: '0x29E81A71D7A584272BC2dEdB95a8Ee40db8eCAF6',
      DiamondLoupeFacet: '0xEAE111f62d207Df4B59c8cC7E675E1825307bD42',
      DiamondInit: '0xaA93B0345731D1E4B462f38F72e21F51435a041D',
      Diamond: '0x404172100D6A428F5Eae378650f4259CC803de7c',
    },
  },
  420: {
    ccmp: {
      CCMPExecutor: '0x8A97B3CD2451DA24a78D9827E4f3511A573cC7B3',
      AxelarAdaptor: '0x0Cc730c0a69e464F6c50a536Edfee10B8E5c4495',
      WormholeAdaptor: '0x84fEe39095b18962b875588dF7F9Ad1bE87e8653',
      HyperlaneAdaptor: '0xDc490a8408605D4A411d1eba33b1C62148511293',
      CCMPConfigurationFacet: '0x1EDaF22d0dbCF5b3a74591d6F8B1a9AC779b2d93',
      CCMPReceiverMessageFacet: '0x2c1B8F72D9A3a1c64eB71c2013aa621efcf148DA',
      CCMPSendMessageFacet: '0x995224D302dE8bF0597D0C175a250a0E00a8236e',
      DiamondCutFacet: '0x29E81A71D7A584272BC2dEdB95a8Ee40db8eCAF6',
      DiamondLoupeFacet: '0xEAE111f62d207Df4B59c8cC7E675E1825307bD42',
      DiamondInit: '0xaA93B0345731D1E4B462f38F72e21F51435a041D',
      Diamond: '0x404172100D6A428F5Eae378650f4259CC803de7c',
    },
  },
  421613: {
    ccmp: {
      CCMPExecutor: '0x8A97B3CD2451DA24a78D9827E4f3511A573cC7B3',
      AxelarAdaptor: '0x0Cc730c0a69e464F6c50a536Edfee10B8E5c4495',
      WormholeAdaptor: '0x84fEe39095b18962b875588dF7F9Ad1bE87e8653',
      HyperlaneAdaptor: '0xDc490a8408605D4A411d1eba33b1C62148511293',
      CCMPConfigurationFacet: '0x1EDaF22d0dbCF5b3a74591d6F8B1a9AC779b2d93',
      CCMPReceiverMessageFacet: '0x2c1B8F72D9A3a1c64eB71c2013aa621efcf148DA',
      CCMPSendMessageFacet: '0x995224D302dE8bF0597D0C175a250a0E00a8236e',
      DiamondCutFacet: '0x29E81A71D7A584272BC2dEdB95a8Ee40db8eCAF6',
      DiamondLoupeFacet: '0xEAE111f62d207Df4B59c8cC7E675E1825307bD42',
      DiamondInit: '0xaA93B0345731D1E4B462f38F72e21F51435a041D',
      Diamond: '0x404172100D6A428F5Eae378650f4259CC803de7c',
    },
  },
};

export const chains = {
  4002: {
    url: process.env.FANTOM_TESTNET_URL!,
  },
  97: {
    url: process.env.BSC_TESTNET_URL!,
  },
  80001: {
    url: process.env.MUMBAI_URL!,
  },
  43113: {
    url: process.env.FUJI_URL,
  },
};

export const toChainId = 80001;
export const fromChainId = 43113;

export const fromContracts = contracts[fromChainId];
export const toContracts = contracts[toChainId];

export const fromChain = chains[fromChainId];
export const toChain = chains[toChainId];

export const sourceGateway = () => {
  const provider = new ethers.providers.JsonRpcProvider(fromChain.url);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  const gateway = ICCMPGateway__factory.connect(fromContracts.ccmp.Diamond, wallet);
  return gateway;
};

export const exitGateway = () => {
  const provider = new ethers.providers.JsonRpcProvider(toChain.url);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  const gateway = ICCMPGateway__factory.connect(toContracts.ccmp.Diamond, wallet);
  return gateway;
};

export const exitBatchHelper = () => {
  const provider = new ethers.providers.JsonRpcProvider(toChain.url);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  const exitBatchHelper = new ethers.Contract(toContracts.test.batchHelper, batchHelperAbi, wallet);
  return exitBatchHelper;
};

export const sourceHyphen = () => {
  const provider = new ethers.providers.JsonRpcProvider(fromChain.url);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  const hyphen = new ethers.Contract(fromContracts.hyphen.liquidityPool, hyphenAbi, wallet);
  return hyphen;
};

export const sourceToken = () => {
  const provider = new ethers.providers.JsonRpcProvider(fromChain.url);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  const token = ERC20Token__factory.connect(fromContracts.test.token, wallet);
  return token;
};

export const hyphenAbi = JSON.parse(
  `[{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"asset","type":"address"},{"indexed":true,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":true,"internalType":"uint256","name":"transferredAmount","type":"uint256"},{"indexed":false,"internalType":"address","name":"target","type":"address"},{"indexed":false,"internalType":"bytes","name":"depositHash","type":"bytes"},{"indexed":false,"internalType":"uint256","name":"fromChainId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"lpFee","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"transferFee","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"gasFee","type":"uint256"}],"name":"AssetSent","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"asset","type":"address"},{"indexed":true,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":true,"internalType":"uint256","name":"transferredAmount","type":"uint256"},{"indexed":false,"internalType":"address","name":"target","type":"address"},{"indexed":false,"internalType":"uint256","name":"fromChainId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"lpFee","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"transferFee","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"gasFee","type":"uint256"}],"name":"AssetSentFromCCMP","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"tokenAddress","type":"address"},{"indexed":true,"internalType":"address","name":"receiver","type":"address"},{"indexed":false,"internalType":"uint256","name":"toChainId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"reward","type":"uint256"},{"indexed":false,"internalType":"string","name":"tag","type":"string"}],"name":"Deposit","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"tokenAddress","type":"address"},{"indexed":true,"internalType":"address","name":"receiver","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"reward","type":"uint256"},{"indexed":false,"internalType":"string","name":"tag","type":"string"}],"name":"DepositAndCall","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"tokenAddress","type":"address"},{"indexed":true,"internalType":"address","name":"receiver","type":"address"},{"indexed":false,"internalType":"uint256","name":"toChainId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"reward","type":"uint256"},{"indexed":false,"internalType":"string","name":"tag","type":"string"},{"components":[{"internalType":"address","name":"tokenAddress","type":"address"},{"internalType":"uint256","name":"percentage","type":"uint256"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"enum SwapOperation","name":"operation","type":"uint8"},{"internalType":"bytes","name":"path","type":"bytes"}],"indexed":false,"internalType":"struct SwapRequest[]","name":"swapRequests","type":"tuple[]"}],"name":"DepositAndSwap","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"account","type":"address"}],"name":"Paused","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousPauser","type":"address"},{"indexed":true,"internalType":"address","name":"newPauser","type":"address"}],"name":"PauserChanged","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"_tf","type":"address"}],"name":"TrustedForwarderChanged","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"account","type":"address"}],"name":"Unpaused","type":"event"},{"inputs":[],"name":"baseGas","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"ccmpExecutor","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"ccmpGateway","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"chainIdToLiquidityPoolAddress","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"newPauser","type":"address"}],"name":"changePauser","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"tokenAddress","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"address payable","name":"receiver","type":"address"},{"internalType":"bytes","name":"depositHash","type":"bytes"}],"name":"checkHashStatus","outputs":[{"internalType":"bytes32","name":"hashSendTransaction","type":"bytes32"},{"internalType":"bool","name":"status","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"components":[{"internalType":"uint256","name":"toChainId","type":"uint256"},{"internalType":"address","name":"tokenAddress","type":"address"},{"internalType":"address","name":"receiver","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"string","name":"tag","type":"string"},{"components":[{"internalType":"address","name":"to","type":"address"},{"internalType":"bytes","name":"_calldata","type":"bytes"}],"internalType":"struct ICCMPGateway.CCMPMessagePayload[]","name":"payloads","type":"tuple[]"},{"components":[{"internalType":"address","name":"feeTokenAddress","type":"address"},{"internalType":"uint256","name":"feeAmount","type":"uint256"},{"internalType":"address","name":"relayer","type":"address"}],"internalType":"struct ICCMPGateway.GasFeePaymentArgs","name":"gasFeePaymentArgs","type":"tuple"},{"internalType":"string","name":"adaptorName","type":"string"},{"internalType":"bytes","name":"routerArgs","type":"bytes"},{"internalType":"bytes[]","name":"hyphenArgs","type":"bytes[]"}],"internalType":"struct LiquidityPool.DepositAndCallArgs","name":"args","type":"tuple"}],"name":"depositAndCall","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"tokenAddress","type":"address"},{"internalType":"address","name":"receiver","type":"address"},{"internalType":"uint256","name":"toChainId","type":"uint256"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"string","name":"tag","type":"string"},{"components":[{"internalType":"address","name":"tokenAddress","type":"address"},{"internalType":"uint256","name":"percentage","type":"uint256"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"enum SwapOperation","name":"operation","type":"uint8"},{"internalType":"bytes","name":"path","type":"bytes"}],"internalType":"struct SwapRequest[]","name":"swapRequest","type":"tuple[]"}],"name":"depositAndSwapErc20","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"toChainId","type":"uint256"},{"internalType":"address","name":"tokenAddress","type":"address"},{"internalType":"address","name":"receiver","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"string","name":"tag","type":"string"}],"name":"depositErc20","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"receiver","type":"address"},{"internalType":"uint256","name":"toChainId","type":"uint256"},{"internalType":"string","name":"tag","type":"string"}],"name":"depositNative","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"receiver","type":"address"},{"internalType":"uint256","name":"toChainId","type":"uint256"},{"internalType":"string","name":"tag","type":"string"},{"components":[{"internalType":"address","name":"tokenAddress","type":"address"},{"internalType":"uint256","name":"percentage","type":"uint256"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"enum SwapOperation","name":"operation","type":"uint8"},{"internalType":"bytes","name":"path","type":"bytes"}],"internalType":"struct SwapRequest[]","name":"swapRequest","type":"tuple[]"}],"name":"depositNativeAndSwap","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"}],"name":"gasFeeAccumulated","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"gasFeeAccumulatedByToken","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"tokenAddress","type":"address"}],"name":"getCurrentLiquidity","outputs":[{"internalType":"uint256","name":"currentLiquidity","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getExecutorManager","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"address","name":"tokenAddress","type":"address"}],"name":"getRewardAmount","outputs":[{"internalType":"uint256","name":"rewardAmount","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"tokenAddress","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"getTransferFee","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"incentivePool","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_executorManagerAddress","type":"address"},{"internalType":"address","name":"_pauser","type":"address"},{"internalType":"address","name":"_trustedForwarder","type":"address"},{"internalType":"address","name":"_tokenManager","type":"address"},{"internalType":"address","name":"_liquidityProviders","type":"address"}],"name":"initialize","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"pauser","type":"address"}],"name":"isPauser","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"forwarder","type":"address"}],"name":"isTrustedForwarder","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"liquidityProviders","outputs":[{"internalType":"contract ILiquidityProviders","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"pause","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"paused","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"name":"processedHash","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"renounceOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"renouncePauser","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"components":[{"internalType":"uint256","name":"tokenSymbol","type":"uint256"},{"internalType":"uint256","name":"sourceChainAmount","type":"uint256"},{"internalType":"uint256","name":"sourceChainDecimals","type":"uint256"},{"internalType":"address payable","name":"receiver","type":"address"},{"internalType":"bytes[]","name":"hyphenArgs","type":"bytes[]"}],"internalType":"struct LiquidityPool.SendFundsToUserFromCCMPArgs","name":"args","type":"tuple"}],"name":"sendFundsToUserFromCCMP","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"tokenAddress","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"address payable","name":"receiver","type":"address"},{"internalType":"bytes","name":"depositHash","type":"bytes"},{"internalType":"uint256","name":"nativeTokenPriceInTransferredToken","type":"uint256"},{"internalType":"uint256","name":"fromChainId","type":"uint256"},{"internalType":"uint256","name":"tokenGasBaseFee","type":"uint256"}],"name":"sendFundsToUserV2","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_newCCMPExecutor","type":"address"},{"internalType":"address","name":"_newCCMPGateway","type":"address"}],"name":"setCCMPContracts","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_executorManagerAddress","type":"address"}],"name":"setExecutorManager","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256[]","name":"chainId","type":"uint256[]"},{"internalType":"address[]","name":"liquidityPoolAddress","type":"address[]"}],"name":"setLiquidityPoolAddress","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"name","type":"string"},{"internalType":"address","name":"_swapAdaptor","type":"address"}],"name":"setSwapAdaptor","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"","type":"string"}],"name":"swapAdaptorMap","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"tokenAddress","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"address payable","name":"receiver","type":"address"},{"internalType":"bytes","name":"depositHash","type":"bytes"},{"internalType":"uint256","name":"nativeTokenPriceInTransferredToken","type":"uint256"},{"internalType":"uint256","name":"tokenGasBaseFee","type":"uint256"},{"internalType":"uint256","name":"fromChainId","type":"uint256"},{"internalType":"uint256","name":"swapGasOverhead","type":"uint256"},{"components":[{"internalType":"address","name":"tokenAddress","type":"address"},{"internalType":"uint256","name":"percentage","type":"uint256"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"enum SwapOperation","name":"operation","type":"uint8"},{"internalType":"bytes","name":"path","type":"bytes"}],"internalType":"struct SwapRequest[]","name":"swapRequests","type":"tuple[]"},{"internalType":"string","name":"swapAdaptor","type":"string"}],"name":"swapAndSendFundsToUser","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"tokenManager","outputs":[{"internalType":"contract ITokenManager","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_tokenAddress","type":"address"},{"internalType":"address","name":"receiver","type":"address"},{"internalType":"uint256","name":"_tokenAmount","type":"uint256"}],"name":"transfer","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"unpause","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"tokenAddress","type":"address"}],"name":"withdrawErc20GasFee","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"withdrawNativeGasFee","outputs":[],"stateMutability":"nonpayable","type":"function"},{"stateMutability":"payable","type":"receive"}]`
);
export const batchHelperAbi = JSON.parse(
  `[{"inputs":[{"internalType":"contract IERC20","name":"token","type":"address"},{"internalType":"contract ILPToken","name":"lpToken","type":"address"},{"internalType":"contract ILiquidityProviders","name":"liquidityProviders","type":"address"},{"internalType":"contract IHyphenLiquidityFarmingV2","name":"farming","type":"address"},{"internalType":"address","name":"receiver","type":"address"}],"name":"execute","outputs":[],"stateMutability":"nonpayable","type":"function"}]`
);
