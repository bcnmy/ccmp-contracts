import { ethers } from "hardhat";
import { ICCMPGateway__factory, SampleContract__factory } from "../../typechain-types";
import { getCCMPMessagePayloadFromSourceTx } from "./utils";
import { NodeHttpTransport } from "@improbable-eng/grpc-web-node-http-transport";
import { getSignedVAA, getEmitterAddressEth, parseSequenceFromLogEth, ChainName } from "@certusone/wormhole-sdk";
import type { CCMPMessageStruct } from "../../typechain-types/contracts/interfaces/ICCMPRouterAdaptor";

const contracts = {
  80001: {
    CCMPExecutor: "0xAe4D41d1105896FC976e19681A42d3057Ee6c528",
    AxelarAdaptor: "0xB6A1c1BdfA09520C6fc9c0657Efc9df756e02132",
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
  },
  43113: {
    CCMPExecutor: "0x320D8cfCA5d07FB88230626b12672708511B23D9",
    AxelarAdaptor: "0xAdE6090f102BD0A71D2521d962e8E49e57fD1fba",
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
      // gasLimit: 1000000,
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

(async () => {
  await preCheck();

  const gateway = sourceGateway();

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
})();
