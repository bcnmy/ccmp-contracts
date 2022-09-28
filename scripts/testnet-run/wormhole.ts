import { ethers } from "hardhat";
import { ERC20Token__factory, ICCMPGateway__factory, SampleContract__factory } from "../../typechain-types";
import { getCCMPMessagePayloadFromSourceTx } from "./utils";
import { NodeHttpTransport } from "@improbable-eng/grpc-web-node-http-transport";
import { getSignedVAA, getEmitterAddressEth, parseSequenceFromLogEth, ChainName } from "@certusone/wormhole-sdk";
import type { CCMPMessageStruct } from "../../typechain-types/contracts/interfaces/ICCMPRouterAdaptor";
import { BigNumber } from "ethers";

const hyphenAbi = JSON.parse(
  `[{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"asset","type":"address"},{"indexed":true,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":true,"internalType":"uint256","name":"transferredAmount","type":"uint256"},{"indexed":false,"internalType":"address","name":"target","type":"address"},{"indexed":false,"internalType":"bytes","name":"depositHash","type":"bytes"},{"indexed":false,"internalType":"uint256","name":"fromChainId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"lpFee","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"transferFee","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"gasFee","type":"uint256"}],"name":"AssetSent","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"asset","type":"address"},{"indexed":false,"internalType":"uint256","name":"tokenSymbol","type":"uint256"},{"indexed":true,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":true,"internalType":"uint256","name":"transferredAmount","type":"uint256"},{"indexed":false,"internalType":"address","name":"target","type":"address"},{"indexed":false,"internalType":"uint256","name":"fromChainId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"lpFee","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"transferFee","type":"uint256"}],"name":"AssetSentFromCCMP","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"tokenAddress","type":"address"},{"indexed":true,"internalType":"address","name":"receiver","type":"address"},{"indexed":false,"internalType":"uint256","name":"toChainId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"reward","type":"uint256"},{"indexed":false,"internalType":"string","name":"tag","type":"string"}],"name":"Deposit","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"tokenAddress","type":"address"},{"indexed":true,"internalType":"address","name":"receiver","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"reward","type":"uint256"},{"indexed":false,"internalType":"string","name":"tag","type":"string"}],"name":"DepositAndCall","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"tokenAddress","type":"address"},{"indexed":true,"internalType":"address","name":"receiver","type":"address"},{"indexed":false,"internalType":"uint256","name":"toChainId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"reward","type":"uint256"},{"indexed":false,"internalType":"string","name":"tag","type":"string"},{"components":[{"internalType":"address","name":"tokenAddress","type":"address"},{"internalType":"uint256","name":"percentage","type":"uint256"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"enum SwapOperation","name":"operation","type":"uint8"},{"internalType":"bytes","name":"path","type":"bytes"}],"indexed":false,"internalType":"struct SwapRequest[]","name":"swapRequests","type":"tuple[]"}],"name":"DepositAndSwap","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"account","type":"address"}],"name":"Paused","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousPauser","type":"address"},{"indexed":true,"internalType":"address","name":"newPauser","type":"address"}],"name":"PauserChanged","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"_tf","type":"address"}],"name":"TrustedForwarderChanged","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"account","type":"address"}],"name":"Unpaused","type":"event"},{"inputs":[],"name":"_ccmpExecutor","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"_ccmpGateway","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"baseGas","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"chainIdToLiquidityPoolAddress","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"newPauser","type":"address"}],"name":"changePauser","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"tokenAddress","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"address payable","name":"receiver","type":"address"},{"internalType":"bytes","name":"depositHash","type":"bytes"}],"name":"checkHashStatus","outputs":[{"internalType":"bytes32","name":"hashSendTransaction","type":"bytes32"},{"internalType":"bool","name":"status","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"toChainId","type":"uint256"},{"internalType":"address","name":"tokenAddress","type":"address"},{"internalType":"address","name":"receiver","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"string","name":"tag","type":"string"},{"components":[{"internalType":"address","name":"to","type":"address"},{"internalType":"bytes","name":"_calldata","type":"bytes"}],"internalType":"struct ICCMPGateway.CCMPMessagePayload[]","name":"payloads","type":"tuple[]"},{"components":[{"internalType":"address","name":"feeTokenAddress","type":"address"},{"internalType":"uint256","name":"feeAmount","type":"uint256"},{"internalType":"address","name":"relayer","type":"address"}],"internalType":"struct ICCMPGateway.GasFeePaymentArgs","name":"gasFeePaymentArgs","type":"tuple"},{"internalType":"bytes","name":"ccmpArgs","type":"bytes"}],"name":"depositAndCall","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"tokenAddress","type":"address"},{"internalType":"address","name":"receiver","type":"address"},{"internalType":"uint256","name":"toChainId","type":"uint256"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"string","name":"tag","type":"string"},{"components":[{"internalType":"address","name":"tokenAddress","type":"address"},{"internalType":"uint256","name":"percentage","type":"uint256"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"enum SwapOperation","name":"operation","type":"uint8"},{"internalType":"bytes","name":"path","type":"bytes"}],"internalType":"struct SwapRequest[]","name":"swapRequest","type":"tuple[]"}],"name":"depositAndSwapErc20","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"toChainId","type":"uint256"},{"internalType":"address","name":"tokenAddress","type":"address"},{"internalType":"address","name":"receiver","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"string","name":"tag","type":"string"}],"name":"depositErc20","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"receiver","type":"address"},{"internalType":"uint256","name":"toChainId","type":"uint256"},{"internalType":"string","name":"tag","type":"string"}],"name":"depositNative","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"receiver","type":"address"},{"internalType":"uint256","name":"toChainId","type":"uint256"},{"internalType":"string","name":"tag","type":"string"},{"components":[{"internalType":"address","name":"tokenAddress","type":"address"},{"internalType":"uint256","name":"percentage","type":"uint256"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"enum SwapOperation","name":"operation","type":"uint8"},{"internalType":"bytes","name":"path","type":"bytes"}],"internalType":"struct SwapRequest[]","name":"swapRequest","type":"tuple[]"}],"name":"depositNativeAndSwap","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"}],"name":"gasFeeAccumulated","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"gasFeeAccumulatedByToken","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"tokenAddress","type":"address"}],"name":"getCurrentLiquidity","outputs":[{"internalType":"uint256","name":"currentLiquidity","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"address","name":"tokenAddress","type":"address"}],"name":"getRewardAmount","outputs":[{"internalType":"uint256","name":"rewardAmount","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"tokenAddress","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"getTransferFee","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"incentivePool","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_executorManagerAddress","type":"address"},{"internalType":"address","name":"_pauser","type":"address"},{"internalType":"address","name":"_trustedForwarder","type":"address"},{"internalType":"address","name":"_tokenManager","type":"address"},{"internalType":"address","name":"_liquidityProviders","type":"address"}],"name":"initialize","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"pauser","type":"address"}],"name":"isPauser","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"forwarder","type":"address"}],"name":"isTrustedForwarder","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"liquidityProviders","outputs":[{"internalType":"contract ILiquidityProviders","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"pause","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"paused","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"name":"processedHash","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"renounceOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"renouncePauser","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenSymbol","type":"uint256"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"address payable","name":"receiver","type":"address"}],"name":"sendFundsToUserFromCCMP","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"tokenAddress","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"address payable","name":"receiver","type":"address"},{"internalType":"bytes","name":"depositHash","type":"bytes"},{"internalType":"uint256","name":"nativeTokenPriceInTransferredToken","type":"uint256"},{"internalType":"uint256","name":"fromChainId","type":"uint256"},{"internalType":"uint256","name":"tokenGasBaseFee","type":"uint256"}],"name":"sendFundsToUserV2","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint128","name":"gas","type":"uint128"}],"name":"setBaseGas","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_newCCMPExecutor","type":"address"}],"name":"setCCMPExecutor","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_newCCMPGateway","type":"address"}],"name":"setCCMPGateway","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_executorManagerAddress","type":"address"}],"name":"setExecutorManager","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"chainId","type":"uint256"},{"internalType":"address","name":"liquidityPoolAddress","type":"address"}],"name":"setLiquidityPoolAddress","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_liquidityProviders","type":"address"}],"name":"setLiquidityProviders","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"name","type":"string"},{"internalType":"address","name":"_swapAdaptor","type":"address"}],"name":"setSwapAdaptor","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_tokenManager","type":"address"}],"name":"setTokenManager","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"tokenAddress","type":"address"},{"internalType":"uint256","name":"symbol","type":"uint256"},{"internalType":"uint256","name":"chainId","type":"uint256"}],"name":"setTokenSymbol","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"trustedForwarder","type":"address"}],"name":"setTrustedForwarder","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"","type":"string"}],"name":"swapAdaptorMap","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"tokenAddress","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"address payable","name":"receiver","type":"address"},{"internalType":"bytes","name":"depositHash","type":"bytes"},{"internalType":"uint256","name":"nativeTokenPriceInTransferredToken","type":"uint256"},{"internalType":"uint256","name":"tokenGasBaseFee","type":"uint256"},{"internalType":"uint256","name":"fromChainId","type":"uint256"},{"internalType":"uint256","name":"swapGasOverhead","type":"uint256"},{"components":[{"internalType":"address","name":"tokenAddress","type":"address"},{"internalType":"uint256","name":"percentage","type":"uint256"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"enum SwapOperation","name":"operation","type":"uint8"},{"internalType":"bytes","name":"path","type":"bytes"}],"internalType":"struct SwapRequest[]","name":"swapRequests","type":"tuple[]"},{"internalType":"string","name":"swapAdaptor","type":"string"}],"name":"swapAndSendFundsToUser","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"uint256","name":"","type":"uint256"}],"name":"symbolToTokenAddress","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"uint256","name":"","type":"uint256"}],"name":"tokenAddressToSymbol","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"tokenManager","outputs":[{"internalType":"contract ITokenManager","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_tokenAddress","type":"address"},{"internalType":"address","name":"receiver","type":"address"},{"internalType":"uint256","name":"_tokenAmount","type":"uint256"}],"name":"transfer","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"unpause","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"tokenAddress","type":"address"}],"name":"withdrawErc20GasFee","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"withdrawNativeGasFee","outputs":[],"stateMutability":"nonpayable","type":"function"},{"stateMutability":"payable","type":"receive"}]`
);
const batchHelperAbi = JSON.parse(
  `[{"inputs":[{"internalType":"contract IERC20","name":"token","type":"address"},{"internalType":"contract ILPToken","name":"lpToken","type":"address"},{"internalType":"contract ILiquidityProviders","name":"liquidityProviders","type":"address"},{"internalType":"contract IHyphenLiquidityFarmingV2","name":"farming","type":"address"},{"internalType":"address","name":"receiver","type":"address"}],"name":"execute","outputs":[],"stateMutability":"nonpayable","type":"function"}]`
);

const contracts = {
  80001: {
    CCMPExecutor: "0xAe4D41d1105896FC976e19681A42d3057Ee6c528",
    AxelarAdaptor: "0x2BFA42C7359E789b2A78612B79510d09660B2E16",
    WormholeAdaptor: "0x69a5eB67Dd7E9949C2D229E185273c30B3ab8C33",
    CCMPConfigurationFacet: "0x690Af3506e145F14602C2f9f48b2c14C233bb1b3",
    CCMPReceiverMessageFacet: "0x09d4b57F8ca6433FF5Df5Fac9C9BDCDfdc981e99",
    CCMPSendMessageFacet: "0x1C1503a60A25FEe240EF5bF9996F8Fa39b14A195",
    DiamondCutFacet: "0x12790f446A8Ab3359560cF6e513D6B4F73c85Ea3",
    DiamondLoupeFacet: "0x61ec1d2f679e81Db68F4c809474C0D2A55496671",
    DiamondInit: "0x9ab126305CbC757bF035d6b4d549675FdBE5f1B5",
    Diamond: "0x5dB92fdAC16d027A3Fef6f438540B5818b6f66D5",
    sampleContract: "0x9B9A1bE28bB12C78f0D02400D8755591Cd517739",

    wormholeBridgeAddress: "0x0CBE91CF822c73C2315FB05100C2F714765d5c20",
    emitterChain: "polygon" as ChainName,

    hyphen: "0xDe4e4CDa407Eee8d9E76261a1F2d229A572743dE",
    token: "0xeaBc4b91d9375796AA4F69cC764A4aB509080A58",
    lpToken: "0x48E2577e5f781CBb3374912a31b1aa39c9E11d39",
    liquidityProviders: "0xFD210117F5b9d98Eb710295E30FFF77dF2d80002",
    liquidityFarming: "0xf97859fb869329933b40F36A86E7e44f334Ed16a",
    decimals: 18,

    batchHelper: "0xa759C8Db00DadBE0599E3a38B19B5C0E12e43BBe",
  },
  43113: {
    CCMPExecutor: "0x320D8cfCA5d07FB88230626b12672708511B23D9",
    AxelarAdaptor: "0x2aC78FF75EC3E1349fcC2d2ea30cf56318f93f25",
    WormholeAdaptor: "0x41614647D4316230F11F1688a23A3DD3E92bcad5",
    CCMPConfigurationFacet: "0x05e2861f30D818488D6470073F4b5342c571456a",
    CCMPReceiverMessageFacet: "0xe001CD72Fd8DaB89DCb15D9AF878976C0661f19e",
    CCMPSendMessageFacet: "0x8Fd6A634b9af487c005dB2c6bBc72fc50fdB55Da",
    DiamondCutFacet: "0x50C45a33da35b9dD85c58C26589d68b15a95e9ed",
    DiamondLoupeFacet: "0x79a76426Ba58aE18dAF6F1d17FD66FbAC4201be6",
    DiamondInit: "0x1797DD06071319527d3C0d5ED19CeB46a56986cb",
    Diamond: "0x53B309Ff259e568309A19810E3bF1647B6922afd",
    sampleContract: "0xb145AF113BFa7bfe91E11F951d88d00B9127BBC9",

    wormholeBridgeAddress: "0x7bbcE28e64B3F8b84d876Ab298393c38ad7aac4C",
    emitterChain: "avalanche" as ChainName,

    hyphen: "0xb726675394b2ddee2c897ad31a62c7545ad7c68d",
    token: "0xC74dB45a7D3416249763c151c6324Ceb6B3217fd",
    decimals: 6,
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
  43113: {
    url: process.env.FUJI_URL,
  },
};

const toChainId = 80001;
const fromChainId = 43113;

const fromContracts = contracts[fromChainId];
const toContracts = contracts[toChainId];

const fromChain = chains[fromChainId];
const toChain = chains[toChainId];

const wormholeRpcHost = "https://wormhole-v2-testnet-api.certus.one";

const abiCoder = new ethers.utils.AbiCoder();

const CONSISTENCY_LEVEL = 1;

const sourceGateway = () => {
  const provider = new ethers.providers.JsonRpcProvider(fromChain.url);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  const gateway = ICCMPGateway__factory.connect(fromContracts.Diamond, wallet);
  return gateway;
};

const exitGateway = () => {
  const provider = new ethers.providers.JsonRpcProvider(toChain.url);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  const gateway = ICCMPGateway__factory.connect(toContracts.Diamond, wallet);
  return gateway;
};

const exitBatchHelper = () => {
  const provider = new ethers.providers.JsonRpcProvider(toChain.url);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  const exitBatchHelper = new ethers.Contract(toContracts.batchHelper, batchHelperAbi, wallet);
  return exitBatchHelper;
};

const sourceHyphen = () => {
  const provider = new ethers.providers.JsonRpcProvider(fromChain.url);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  const hyphen = new ethers.Contract(fromContracts.hyphen, hyphenAbi, wallet);
  return hyphen;
};

const sourceToken = () => {
  const provider = new ethers.providers.JsonRpcProvider(fromChain.url);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  const token = ERC20Token__factory.connect(fromContracts.token, wallet);
  return token;
};

const getVaa = async (sourceTxHash: string): Promise<Uint8Array> => {
  const emitter = getEmitterAddressEth(fromContracts.WormholeAdaptor);
  console.log(`Emitter Address for Wormhole Adapter: ${emitter}`);

  const receipt = await ethers.provider.getTransactionReceipt(sourceTxHash);
  const sequence = parseSequenceFromLogEth(receipt, fromContracts.wormholeBridgeAddress);
  console.log(`Sequence for Wormhole Adapter: ${sequence}`);

  console.log(`Getting VAA for source transaction ${sourceTxHash}...`);
  return new Promise<Uint8Array>((resolve, reject) => {
    const id = setInterval(async () => {
      try {
        console.log(wormholeRpcHost, fromContracts.emitterChain, emitter, sequence);
        const { vaaBytes } = await getSignedVAA(wormholeRpcHost, fromContracts.emitterChain, emitter, sequence, {
          transport: NodeHttpTransport(),
        });
        clearInterval(id);
        resolve(vaaBytes);
      } catch (e) {
        console.log("VAA Not found", e);
      }
    }, 2000);
  });
};

const executeApprovedTransaction = async (txHash: string, message: CCMPMessageStruct, vaa: Uint8Array) => {
  console.log(`Executing source transaction ${txHash} on exit chain...`);
  const gateway = exitGateway();

  try {
    console.log(message);
    const { hash, wait } = await gateway.receiveMessage(message, vaa, false, {
      gasPrice: ethers.utils.parseUnits("50", "gwei"),
      gasLimit: 1000000,
    });
    console.log(`Submitted exit transaction ${hash} on exit chain.`);
    const { blockNumber } = await wait(5);
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
    console.log(e);
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

const simpleMessage = async () => {
  await preCheck();

  const gateway = sourceGateway();
  const token = sourceToken();

  const sampleContract = SampleContract__factory.connect(fromContracts.sampleContract, gateway.signer);
  const calldata = sampleContract.interface.encodeFunctionData("emitEvent", ["Hello World"]);

  try {
    const { hash, wait } = await gateway.sendMessage(
      80001,
      "wormhole",
      [
        {
          to: toContracts.sampleContract,
          _calldata: calldata,
        },
        {
          to: toContracts.sampleContract,
          _calldata: calldata,
        },
        {
          to: toContracts.sampleContract,
          _calldata: calldata,
        },
      ],
      {
        feeTokenAddress: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
        feeAmount: 0,
        relayer: "0x0000000000000000000000000000000000000001",
      },
      abiCoder.encode(["uint256"], [CONSISTENCY_LEVEL]),
      {
        gasPrice: 50 * 1e9,
      }
    );

    console.log(`Source chain hash: ${hash}`);
    await wait(1);

    const ccmpMessage = await getCCMPMessagePayloadFromSourceTx(hash);

    const vaa = await getVaa(hash);

    await executeApprovedTransaction(hash, ccmpMessage, vaa);
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
};

const hyphenDepositAndCall = async () => {
  await preCheck();

  const hyphen = sourceHyphen();
  const gateway = sourceGateway();
  const sourceDecimals = BigNumber.from(10).pow(fromContracts.decimals);
  const token = sourceToken();
  const signerAddress = await gateway.signer.getAddress();

  const approval = await token.allowance(signerAddress, fromContracts.hyphen);
  console.log(`Approval To Hyphen: ${approval.toString()}`);
  if (approval.lt(ethers.constants.MaxInt256.div(2))) {
    console.log(`Approving token transfer to hyphen...`);
    await token.approve(fromContracts.hyphen, ethers.constants.MaxUint256);
  }

  try {
    const { hash, wait } = await hyphen.depositAndCall(
      toChainId,
      fromContracts.token,
      await hyphen.signer.getAddress(),
      BigNumber.from(100).mul(sourceDecimals),
      "CCMPTest",
      [],
      {
        feeTokenAddress: fromContracts.token,
        feeAmount: BigNumber.from(10).mul(sourceDecimals),
        relayer: "0x0000000000000000000000000000000000000001",
      },
      abiCoder.encode(["string", "bytes"], ["wormhole", abiCoder.encode(["uint256"], [CONSISTENCY_LEVEL])]),
      {
        // gasLimit: 1000000,
      }
    );
    await wait(1);

    // const hash = "0xf84a3b3c2ba05d6f12010311f5f8cbb03bd1b86a5e30737b884e3c61e8b37804";

    console.log(`Source chain hash: ${hash}`);

    const ccmpMessage = await getCCMPMessagePayloadFromSourceTx(hash);

    const vaa = await getVaa(hash);

    await executeApprovedTransaction(hash, ccmpMessage, vaa);
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
      toChainId,
      fromContracts.token,
      batchHelper.address,
      BigNumber.from(100).mul(sourceDecimals),
      "CCMPTest",
      [
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
      {
        feeTokenAddress: fromContracts.token,
        feeAmount: BigNumber.from(10).mul(sourceDecimals),
        relayer: "0x0000000000000000000000000000000000000001",
      },
      abiCoder.encode(["string", "bytes"], ["wormhole", abiCoder.encode(["uint256"], [CONSISTENCY_LEVEL])]),
      {
        // gasLimit: 1000000,
      }
    );
    await wait(1);

    // const hash = "0xf84a3b3c2ba05d6f12010311f5f8cbb03bd1b86a5e30737b884e3c61e8b37804";

    console.log(`Source chain hash: ${hash}`);

    const ccmpMessage = await getCCMPMessagePayloadFromSourceTx(hash);

    const vaa = await getVaa(hash);

    await executeApprovedTransaction(hash, ccmpMessage, vaa);
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
