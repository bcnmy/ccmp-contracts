import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers, upgrades } from "hardhat";
import {
  CCMPGateway,
  CCMPExecutor,
  AxelarAdaptor,
  WormholeAdaptor,
  MockAxelarGateway,
  MockWormhole,
  SampleContract,
  CCMPHelper,
} from "../typechain-types";
import { CCMPMessagePayloadStruct, CCMPMessageStruct } from "../typechain-types/contracts/CCMPAdaptor";

describe("AxelarAdaptor", async function () {
  let owner: SignerWithAddress,
    alice: SignerWithAddress,
    bob: SignerWithAddress,
    charlie: SignerWithAddress,
    tf: SignerWithAddress,
    pauser: SignerWithAddress;
  let CCMPGateway: CCMPGateway,
    CCMPExecutor: CCMPExecutor,
    AxelarAdaptor: AxelarAdaptor,
    WormholeAdaptor: WormholeAdaptor,
    MockAxelarGateway: MockAxelarGateway,
    MockWormholeGateway: MockWormhole,
    CCMPHelper: CCMPHelper,
    SampleContract: SampleContract;
  const abiCoder = new ethers.utils.AbiCoder();

  const getSampleCalldata = (message: string) => SampleContract.interface.encodeFunctionData("emitEvent", [message]);

  beforeEach(async function () {
    [owner, alice, bob, charlie, tf, pauser] = await ethers.getSigners();
    MockAxelarGateway = (await (await ethers.getContractFactory("MockAxelarGateway")).deploy()) as MockAxelarGateway;
    MockWormholeGateway = (await (await ethers.getContractFactory("MockWormhole")).deploy()) as MockWormhole;
    CCMPExecutor = (await upgrades.deployProxy(await ethers.getContractFactory("CCMPExecutor"), [
      pauser.address,
    ])) as CCMPExecutor;
    CCMPGateway = (await upgrades.deployProxy(await ethers.getContractFactory("CCMPGateway"), [
      tf.address,
      pauser.address,
      CCMPExecutor.address,
    ])) as CCMPGateway;
    AxelarAdaptor = (await upgrades.deployProxy(await ethers.getContractFactory("AxelarAdaptor"), [
      MockAxelarGateway.address,
      CCMPGateway.address,
      tf.address,
      pauser.address,
    ])) as AxelarAdaptor;
    WormholeAdaptor = (await upgrades.deployProxy(await ethers.getContractFactory("WormholeAdaptor"), [
      MockWormholeGateway.address,
      CCMPGateway.address,
      tf.address,
      pauser.address,
    ])) as WormholeAdaptor;
    SampleContract = (await (await ethers.getContractFactory("SampleContract")).deploy()) as SampleContract;
    CCMPHelper = (await (await ethers.getContractFactory("CCMPHelper")).deploy()) as CCMPHelper;
  });
});
