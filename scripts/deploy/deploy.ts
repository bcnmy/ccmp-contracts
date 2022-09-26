// TODO: Use CREATE2
import { ethers } from "hardhat";
import {
  AxelarAdaptor,
  WormholeAdaptor,
  SampleContract,
  CCMPExecutor,
  CCMPExecutor__factory,
  AxelarAdaptor__factory,
  WormholeAdaptor__factory,
  DiamondInit__factory,
  CCMPConfigurationFacet__factory,
  CCMPSendMessageFacet__factory,
  DiamondCutFacet__factory,
  DiamondLoupeFacet__factory,
  CCMPReceiverMessageFacet__factory,
  Diamond__factory,
  CCMPConfigurationFacet,
  CCMPSendMessageFacet,
  DiamondCutFacet,
  DiamondLoupeFacet,
  DiamondInit,
  CCMPReceiverMessageFacet,
  Diamond,
  ICCMPGateway,
  ICCMPGateway__factory,
} from "../../typechain-types";
import { Contract } from "ethers";
import { FacetCutAction, getSelectors } from "./utils";

const AxelarAdaptorKey = "axelar";
const WormholeAdaptorKey = "wormhole";

const waitSec = async (n: number) => await new Promise((resolve) => setTimeout(resolve, n * 1000));

export type DeployParams = {
  owner: string;
  pauser: string;
  axelarGateway?: string;
  wormholeGateway?: string;
};

export type GatewayContracts = {
  CCMPConfigurationFacet: CCMPConfigurationFacet;
  CCMPReceiverMessageFacet: CCMPReceiverMessageFacet;
  CCMPSendMessageFacet: CCMPSendMessageFacet;
  DiamondCutFacet: DiamondCutFacet;
  DiamondLoupeFacet: DiamondLoupeFacet;
  DiamondInit: DiamondInit;
  Diamond: Diamond;
};
export type CCMPContracts = {
  CCMPExecutor: CCMPExecutor;
  AxelarAdaptor?: AxelarAdaptor;
  WormholeAdaptor?: WormholeAdaptor;
} & GatewayContracts;

export const deployGateway = async (owner: string): Promise<GatewayContracts> => {
  console.log("Deploying CCMPGateway...");
  const [signer] = await ethers.getSigners();

  // Deploy DiamondInit
  // DiamondInit provides a function that is called when the diamond is upgraded or deployed to initialize state variables
  // Read about how the diamondCut function works in the EIP2535 Diamonds standard
  const DiamondInit = await new DiamondInit__factory(signer).deploy();
  await DiamondInit.deployed();
  console.log("DiamondInit deployed:", DiamondInit.address);

  // Deploy facets and set the `facetCuts` variable
  console.log("Deploying facets...");

  console.log("Deploying CCMPConfigurationFacet...");
  const CCMPConfigurationFacet = await new CCMPConfigurationFacet__factory(signer).deploy();
  await CCMPConfigurationFacet.deployed();
  console.log("CCMPConfigurationFacet deployed:", CCMPConfigurationFacet.address);

  console.log("Deploying CCMPReceiverMessageFacet...");
  const CCMPReceiverMessageFacet = await new CCMPReceiverMessageFacet__factory(signer).deploy();
  await CCMPReceiverMessageFacet.deployed();
  console.log("CCMPReceiverMessageFacet deployed:", CCMPReceiverMessageFacet.address);

  console.log("Deploying CCMPSendMessageFacet...");
  const CCMPSendMessageFacet = await new CCMPSendMessageFacet__factory(signer).deploy();
  await CCMPSendMessageFacet.deployed();
  console.log("CCMPSendMessageFacet deployed:", CCMPSendMessageFacet.address);

  console.log("Deploying DiamondCutFacet...");
  const DiamondCutFacet = await new DiamondCutFacet__factory(signer).deploy();
  await DiamondCutFacet.deployed();
  console.log("DiamondCutFacet deployed:", DiamondCutFacet.address);

  console.log("Deploying DiamondLoupeFacet...");
  const DiamondLoupeFacet = await new DiamondLoupeFacet__factory(signer).deploy();
  await DiamondLoupeFacet.deployed();
  console.log("DiamondLoupeFacet deployed:", DiamondLoupeFacet.address);

  const facetCuts = [
    CCMPConfigurationFacet,
    CCMPSendMessageFacet,
    CCMPReceiverMessageFacet,
    DiamondCutFacet,
    DiamondLoupeFacet,
  ].map((facet) => ({
    facetAddress: facet.address,
    action: FacetCutAction.Add,
    functionSelectors: getSelectors(facet),
  }));

  // Creating a function call
  // This call gets executed during deployment and can also be executed in upgrades
  // It is executed with delegatecall on the DiamondInit address.
  let functionCall = DiamondInit.interface.encodeFunctionData("init");

  // Setting arguments that will be used in the diamond constructor
  const diamondArgs = {
    owner: signer.address,
    init: DiamondInit.address,
    initCalldata: functionCall,
  };

  // deploy Diamond
  const Diamond = await new Diamond__factory(signer).deploy(facetCuts, diamondArgs);
  await Diamond.deployed();
  console.log();
  console.log("CCMP Gateway Diamond deployed:", Diamond.address);

  return {
    CCMPConfigurationFacet,
    CCMPReceiverMessageFacet,
    CCMPSendMessageFacet,
    DiamondCutFacet,
    DiamondLoupeFacet,
    DiamondInit,
    Diamond,
  };
};

export const deploy = async ({
  owner,
  pauser,
  axelarGateway,
  wormholeGateway,
}: DeployParams): Promise<CCMPContracts> => {
  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);

  const diamonds = await deployGateway(owner);

  await waitSec(5);

  const CCMPExecutor = await new CCMPExecutor__factory(deployer).deploy(diamonds.Diamond.address);
  console.log(`CCMPExecutor: ${CCMPExecutor.address}`);

  let AxelarAdaptor;
  if (axelarGateway) {
    console.log(`Deploying AxelarAdaptor...`);
    AxelarAdaptor = await new AxelarAdaptor__factory(deployer).deploy(axelarGateway, diamonds.Diamond.address, pauser);
    console.log(`AxelarAdaptor: ${AxelarAdaptor.address}`);
    await waitSec(5);
  }

  let WormholeAdaptor;
  if (wormholeGateway) {
    console.log(`Deploying WormholeAdaptor...`);
    WormholeAdaptor = await new WormholeAdaptor__factory(deployer).deploy(
      wormholeGateway,
      diamonds.Diamond.address,
      pauser
    );
    console.log(`WormholeAdaptor: ${WormholeAdaptor.address}`);
    await waitSec(5);
  }

  const contracts: CCMPContracts = {
    CCMPExecutor,
    AxelarAdaptor,
    WormholeAdaptor,
    ...diamonds,
  };

  await configure(contracts);

  await transferOwnership(contracts.CCMPExecutor, owner);
  await transferOwnership(ICCMPGateway__factory.connect(contracts.Diamond.address, deployer), owner);

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

const transferOwnership = async (contract: Contract, newOwner: string) => {
  console.log(`Transferring ownership of ${contract.address} to ${newOwner}...`);
  await contract.transferOwnership(newOwner);
  console.log(`Ownership transferred.`);
};

const configure = async (contracts: CCMPContracts) => {
  console.log(`Configuring CCMPGateway...`);
  const [deployer] = await ethers.getSigners();

  const CCMPGateway = ICCMPGateway__factory.connect(contracts.Diamond.address, deployer);

  if (contracts.AxelarAdaptor) {
    await (await CCMPGateway.setRouterAdaptor(AxelarAdaptorKey, contracts.AxelarAdaptor.address)).wait();
    await waitSec(5);
  }
  if (contracts.WormholeAdaptor) {
    await (await CCMPGateway.setRouterAdaptor(WormholeAdaptorKey, contracts.WormholeAdaptor.address)).wait();
    await waitSec(5);
  }
  await CCMPGateway.setCCMPExecutor(contracts.CCMPExecutor.address);
  await waitSec(5);
  console.log(`CCMPGateway configured.`);
};
