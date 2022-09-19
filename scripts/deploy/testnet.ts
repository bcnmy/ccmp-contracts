import { ethers } from "hardhat";
import { deploy, deploySampleContract } from "./deploy";
import type { DeployParams } from "./deploy";
import { verifyCCMPContracts, verifyContract } from "../verify/verify";

const deployParamsBase = {
  owner: "0xDA861C9DccFf6d1fEf7Cae71B5b538AF25063404",
  pauser: "0xDA861C9DccFf6d1fEf7Cae71B5b538AF25063404",
};

const deployParams: Record<number, DeployParams> = {
  80001: {
    ...deployParamsBase,
    trustedForwarder: "0x9399BB24DBB5C4b782C70c2969F58716Ebbd6a3b",
    liquidityPool: "0xb831F0848A055b146a0b13D54cfFa6C1FE201b83",
    // axelarGateway: "0xBF62ef1486468a6bd26Dd669C06db43dEd5B849B",
    wormholeGateway: "0x0CBE91CF822c73C2315FB05100C2F714765d5c20",
  },
  43113: {
    ...deployParamsBase,
    trustedForwarder: "0x6271Ca63D30507f2Dcbf99B52787032506D75BBF",
    liquidityPool: "0x07d2d1690D13f5fD9F9D51a96CEe211F6a845AC5",
    // axelarGateway: "0xC249632c2D40b9001FE907806902f63038B737Ab",
    wormholeGateway: "0x7bbcE28e64B3F8b84d876Ab298393c38ad7aac4C",
  },
  4002: {
    ...deployParamsBase,
    trustedForwarder: "0x69FB8Dca8067A5D38703b9e8b39cf2D51473E4b4",
    liquidityPool: "0x30D88692b750D8dB5eFc77A852E034fc3Bd5A0D2",
    axelarGateway: "0x97837985Ec0494E7b9C71f5D3f9250188477ae14",
    wormholeGateway: "0x1BB3B4119b7BA9dfad76B0545fb3F531383c3bB7",
  },
  31337: {
    ...deployParamsBase,
    trustedForwarder: "0x69FB8Dca8067A5D38703b9e8b39cf2D51473E4b4",
    liquidityPool: "0x30D88692b750D8dB5eFc77A852E034fc3Bd5A0D2",
    axelarGateway: "0x97837985Ec0494E7b9C71f5D3f9250188477ae14",
    wormholeGateway: "0x1BB3B4119b7BA9dfad76B0545fb3F531383c3bB7",
  },
};

(async () => {
  const networkId = (await ethers.provider.getNetwork()).chainId;
  console.log(`Network: ${networkId}`);

  const params = deployParams[networkId];
  if (!params) {
    throw new Error(`No deploy params for network ${networkId}`);
  }

  const contracts = await deploy(params);
  const sampleContract = await deploySampleContract();

  console.log("Contracts: ");
  for (const [key, contract] of Object.entries({ ...contracts, sampleContract })) {
    if (contract) {
      console.log(`   ${key}: ${contract.address}`);
    }
  }

  await verifyCCMPContracts(contracts);
  await verifyContract(sampleContract.address, []);
})();
