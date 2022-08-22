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
import { CCMPMessagePayloadStruct, CCMPMessageStruct } from "../typechain-types/contracts/Adaptor";

describe("CCMPGateway", async function () {
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

  it("Should set Executor correctly", async function () {
    await expect(CCMPGateway.setCCMPExecutor(CCMPExecutor.address))
      .to.emit(CCMPGateway, "CCMPExecutorUpdated")
      .withArgs(CCMPExecutor.address);

    expect(await CCMPGateway.ccmpExecutor()).to.equal(CCMPExecutor.address);
  });

  it("Should prevent non owners from setting Executor", async function () {
    await expect(CCMPGateway.connect(alice).setCCMPExecutor(CCMPExecutor.address)).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );
  });

  it("Should manage adaptors correctly", async function () {
    await expect(CCMPGateway.setRouterAdaptor("axelar", AxelarAdaptor.address))
      .to.emit(CCMPGateway, "AdaptorUpdated")
      .withArgs("axelar", AxelarAdaptor.address);

    await expect(CCMPGateway.setRouterAdaptor("wormhole", WormholeAdaptor.address))
      .to.emit(CCMPGateway, "AdaptorUpdated")
      .withArgs("wormhole", WormholeAdaptor.address);

    expect(await CCMPGateway.adaptors("axelar")).to.equal(AxelarAdaptor.address);
    expect(await CCMPGateway.adaptors("wormhole")).to.equal(WormholeAdaptor.address);
  });

  it("Should prevent non owners from setting adaptors", async function () {
    await expect(CCMPGateway.connect(alice).setRouterAdaptor("wormhole", WormholeAdaptor.address)).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );
  });

  it("Should set gateways correctly", async function () {
    await expect(CCMPGateway.setGateway(10, CCMPGateway.address))
      .to.emit(CCMPGateway, "GatewayUpdated")
      .withArgs(10, CCMPGateway.address);

    expect(await CCMPGateway.gateways(10)).to.equal(CCMPGateway.address);
  });

  it("Should prevent non owners from setting gateway", async function () {
    await expect(CCMPGateway.connect(alice).setGateway(10, CCMPGateway.address)).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );
  });

  describe("Sending Messages", async function () {
    let payloads: CCMPMessagePayloadStruct[];
    const emptyBytes = abiCoder.encode(["bytes"], [ethers.constants.HashZero]);

    beforeEach(async function () {
      payloads = [
        {
          operation: 0,
          data: abiCoder.encode(["address", "bytes"], [SampleContract.address, getSampleCalldata("Hello World")]),
        },
        {
          operation: 0,
          data: abiCoder.encode(["address", "bytes"], [SampleContract.address, getSampleCalldata("Hello World 2.0")]),
        },
      ];
    });

    it("Should revert if adaptor is not supported", async function () {
      await expect(CCMPGateway.sendMessage(10, "axelar", payloads, emptyBytes))
        .to.be.revertedWithCustomError(CCMPGateway, "UnsupportedAdapter")
        .withArgs("axelar");
    });

    it("Should revert if source chain id is same as destnation", async function () {
      await CCMPGateway.setRouterAdaptor("axelar", AxelarAdaptor.address);
      const chainId = (await ethers.provider.getNetwork()).chainId;
      await expect(CCMPGateway.sendMessage(chainId, "axelar", payloads, emptyBytes))
        .to.be.revertedWithCustomError(CCMPGateway, "UnsupportedDestinationChain")
        .withArgs(chainId);
    });

    it("Should revert if destination chain gateway is not registered", async function () {
      await CCMPGateway.setRouterAdaptor("axelar", AxelarAdaptor.address);
      const chainId = (await ethers.provider.getNetwork()).chainId;
      await expect(CCMPGateway.sendMessage(chainId + 1, "axelar", payloads, emptyBytes))
        .to.be.revertedWithCustomError(CCMPGateway, "UnsupportedDestinationChain")
        .withArgs(chainId + 1);
    });

    it("Should revert if payload is empty", async function () {
      const chainId = (await ethers.provider.getNetwork()).chainId;
      await CCMPGateway.setRouterAdaptor("axelar", AxelarAdaptor.address);
      await CCMPGateway.setGateway(chainId + 1, CCMPGateway.address);

      await expect(CCMPGateway.sendMessage(chainId + 1, "axelar", [], emptyBytes))
        .to.be.revertedWithCustomError(CCMPGateway, "InvalidPayload")
        .withArgs("No payload");
    });

    it("Should route payload if all checks are satisfied", async function () {
      const chainId = (await ethers.provider.getNetwork()).chainId;
      await CCMPGateway.setRouterAdaptor("axelar", AxelarAdaptor.address);
      await CCMPGateway.setGateway(chainId + 1, CCMPGateway.address);

      await expect(CCMPGateway.sendMessage(chainId + 1, "axelar", payloads, emptyBytes)).to.emit(
        MockAxelarGateway,
        "ContractCalled"
      );
    });
  });

  describe("Receiving Messages", async function () {
    let payloads: CCMPMessagePayloadStruct[];
    let message: CCMPMessageStruct;
    const emptyBytes = abiCoder.encode(["bytes"], [ethers.constants.HashZero]);
    let chainId: number;

    beforeEach(async function () {
      chainId = (await ethers.provider.getNetwork()).chainId;
      payloads = [
        {
          operation: 0,
          data: abiCoder.encode(["address", "bytes"], [SampleContract.address, getSampleCalldata("Hello World")]),
        },
        {
          operation: 0,
          data: abiCoder.encode(["address", "bytes"], [SampleContract.address, getSampleCalldata("Hello World 2.0")]),
        },
      ];
      message = {
        sender: owner.address,
        sourceGateway: CCMPGateway.address,
        sourceAdaptor: AxelarAdaptor.address,
        sourceChainId: chainId + 1,
        destinationGateway: CCMPGateway.address,
        destinationChainId: chainId,
        routerAdaptor: "axelar",
        nonce: BigNumber.from(chainId + 1).mul(BigNumber.from(2).mul(128)),
        payload: payloads,
      };
    });

    it("Should revert if source is not registered", async function () {
      await expect(CCMPGateway.receiveMessage(message, emptyBytes))
        .to.be.revertedWithCustomError(CCMPGateway, "InvalidSource")
        .withArgs(chainId + 1, CCMPGateway.address);
    });

    it("Should revert if destination chain is incorrect", async function () {
      await CCMPGateway.setGateway(chainId + 1, CCMPGateway.address);

      message.destinationChainId = 12321;
      await expect(CCMPGateway.receiveMessage(message, emptyBytes))
        .to.be.revertedWithCustomError(CCMPGateway, "WrongDestination")
        .withArgs(12321, CCMPGateway.address);
    });

    it("Should revert if destination gateway is incorrect", async function () {
      await CCMPGateway.setGateway(chainId + 1, CCMPGateway.address);

      message.destinationGateway = bob.address;
      await expect(CCMPGateway.receiveMessage(message, emptyBytes))
        .to.be.revertedWithCustomError(CCMPGateway, "WrongDestination")
        .withArgs(chainId, bob.address);
    });

    it("Should revert if nonce is already used", async function () {
      await CCMPGateway.setGateway(chainId + 1, CCMPGateway.address);
      await CCMPGateway.setRouterAdaptor("axelar", AxelarAdaptor.address);
      const hash = await CCMPHelper.hash(message);
      const validationKey = ethers.utils.keccak256(abiCoder.encode(["bytes32"], [hash]));
      await MockAxelarGateway.validate(validationKey);
      await CCMPGateway.receiveMessage(message, emptyBytes);

      await expect(CCMPGateway.receiveMessage(message, emptyBytes))
        .to.be.revertedWithCustomError(CCMPGateway, "AlreadyExecuted")
        .withArgs(message.nonce);
    });

    it("Should execute message if all checks are satisfied", async function () {
      await CCMPGateway.setGateway(chainId + 1, CCMPGateway.address);
      await CCMPGateway.setRouterAdaptor("axelar", AxelarAdaptor.address);
      const hash = await CCMPHelper.hash(message);
      const validationKey = ethers.utils.keccak256(abiCoder.encode(["bytes32"], [hash]));
      await MockAxelarGateway.validate(validationKey);

      await expect(CCMPGateway.receiveMessage(message, emptyBytes))
        .to.emit(SampleContract, "SampleEvent")
        .withArgs("Hello World 2.0");
    });
  });
});
