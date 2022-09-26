// TODO: Use CREATE2
import { ethers, upgrades } from "hardhat";
import {
  CCMPGateway,
  AxelarAdaptor,
  WormholeAdaptor,
  SampleContract,
  CCMPExecutor,
  CCMPExecutor__factory,
  AxelarAdaptor__factory,
  WormholeAdaptor__factory,
} from "../../typechain-types";

const AxelarAdaptorKey = "axelar";
const WormholeAdaptorKey = "wormhole";

const waitSec = async (n: number) => await new Promise((resolve) => setTimeout(resolve, n * 1000));

export type DeployParams = {
  owner: string;
  pauser: string;
  trustedForwarder: string;
  axelarGateway?: string;
  wormholeGateway?: string;
};

export type CCMPContracts = {
  CCMPGateway: CCMPGateway;
  CCMPExecutor: CCMPExecutor;
  AxelarAdaptor?: AxelarAdaptor;
  WormholeAdaptor?: WormholeAdaptor;
};

export const deployGateway = async () => {};

export const deploy = async ({
  owner,
  pauser,
  trustedForwarder,
  axelarGateway,
  wormholeGateway,
}: DeployParams): Promise<CCMPContracts> => {
  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);

  console.log(`Deploying CCMPGateway...`);
  const CCMPGateway = (await (
    await ethers.getContractFactory("CCMPGateway")
  ).deploy(trustedForwarder, pauser)) as CCMPGateway;
  console.log(`CCMPGateway: ${CCMPGateway.address}`);
  await waitSec(5);

  const CCMPExecutor = await new CCMPExecutor__factory(deployer).deploy(CCMPGateway.address);
  console.log(`CCMPExecutor: ${CCMPExecutor.address}`);

  let AxelarAdaptor;
  if (axelarGateway) {
    console.log(`Deploying AxelarAdaptor...`);
    AxelarAdaptor = await new AxelarAdaptor__factory(deployer).deploy(axelarGateway, CCMPGateway.address, pauser);
    console.log(`AxelarAdaptor: ${AxelarAdaptor.address}`);
    await waitSec(5);
  }

  let WormholeAdaptor;
  if (wormholeGateway) {
    console.log(`Deploying WormholeAdaptor...`);
    WormholeAdaptor = await new WormholeAdaptor__factory(deployer).deploy(wormholeGateway, CCMPGateway.address, pauser);
    console.log(`WormholeAdaptor: ${WormholeAdaptor.address}`);
    await waitSec(5);
  }

  const contracts: CCMPContracts = {
    CCMPGateway,
    CCMPExecutor,
    AxelarAdaptor,
    WormholeAdaptor,
  };

  await configure(contracts);

  await transferOwnership(contracts, owner);

  return contracts;
};

export const deploySampleContract = async (ccmpExecutor: string): Promise<SampleContract> => {
  console.log(`Deploying SampleContract...`);
  const SampleContract = (await (
    await ethers.getContractFactory("SampleContract")
  ).deploy(ccmpExecutor)) as SampleContract;
  console.log(`SampleContract: ${SampleContract.address}`);
  return SampleContract;
};

const transferOwnership = async (contracts: CCMPContracts, newOwner: string) => {
  for (const [key, contract] of Object.entries(contracts)) {
    if (contract) {
      console.log(`Transferring ownership of ${key} at ${contract.address} to ${newOwner}...`);
      await contract.transferOwnership(newOwner);
      console.log(`Ownership transferred.`);
    }
  }
};

const configure = async (contracts: CCMPContracts) => {
  console.log(`Configuring CCMPGateway...`);
  if (contracts.AxelarAdaptor) {
    await (await contracts.CCMPGateway.setRouterAdaptor(AxelarAdaptorKey, contracts.AxelarAdaptor.address)).wait();
    await waitSec(5);
  }
  if (contracts.WormholeAdaptor) {
    await (await contracts.CCMPGateway.setRouterAdaptor(WormholeAdaptorKey, contracts.WormholeAdaptor.address)).wait();
    await waitSec(5);
  }
  await contracts.CCMPGateway.setCCMPExecutor(contracts.CCMPExecutor.address);
  await waitSec(5);
  console.log(`CCMPGateway configured.`);
};
