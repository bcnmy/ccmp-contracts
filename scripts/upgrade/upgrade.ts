import { ethers, upgrades } from "hardhat";
import { verifyImplementation } from "../verify/verify";

const upgradeBuilder = (contractName: string) => async (proxyAddress: string) => {
  const contract = await upgrades.upgradeProxy(proxyAddress, await ethers.getContractFactory(contractName));
  await contract.deployed();
  console.log(`${contractName} Upgraded`);
};

export const upgradeCCMPGateway = upgradeBuilder("CCMPGateway");
export const upgradeAxelarAdaptor = upgradeBuilder("AxelarAdaptor");
export const upgradeWormholeAdaptor = upgradeBuilder("WormholeAdaptor");

(async () => {
  if (require.main !== module) {
    return;
  }

  const PROXY = process.env.PROXY as string;
  if (!ethers.utils.isAddress(PROXY)) {
    throw new Error(`Invalid proxy address: ${PROXY}`);
  }

  const CONTRACT_NAME = process.env.CONTRACT_NAME as string;
  if (!["CCMPGateway", "CCMPExecutor", "AxelarAdaptor", "WormholeAdaptor"].includes(CONTRACT_NAME)) {
    throw new Error(`Invalid contract name: ${CONTRACT_NAME}`);
  }

  const chainId = await ethers.provider.getNetwork().then((network) => network.chainId);
  console.log(`Upgrading ${CONTRACT_NAME} at ${PROXY} on chain ${chainId}`);

  await upgradeBuilder(CONTRACT_NAME)(PROXY);

  await verifyImplementation(PROXY);
})();
