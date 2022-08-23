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
    axelarGateway: "0xBF62ef1486468a6bd26Dd669C06db43dEd5B849B",
  },
  43113: {
    ...deployParamsBase,
    trustedForwarder: "0x6271Ca63D30507f2Dcbf99B52787032506D75BBF",
    axelarGateway: "0xC249632c2D40b9001FE907806902f63038B737Ab",
  },
  4002: {
    ...deployParamsBase,
    trustedForwarder: "0x69FB8Dca8067A5D38703b9e8b39cf2D51473E4b4",
    axelarGateway: "0x97837985Ec0494E7b9C71f5D3f9250188477ae14",
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
