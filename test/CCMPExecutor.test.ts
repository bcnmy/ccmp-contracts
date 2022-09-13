import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect, use } from "chai";
import { BigNumber } from "ethers";
import { ethers, upgrades } from "hardhat";
import { smock, FakeContract } from "@defi-wonderland/smock";

import {
  CCMPGateway,
  CCMPExecutor,
  AxelarAdaptor,
  WormholeAdaptor,
  SampleContract,
  CCMPHelper,
  IAxelarGateway,
  IAxelarGateway__factory,
  MockWormhole,
  IHyphenLiquidityPool,
  IHyphenLiquidityPool__factory,
  ERC20Token__factory,
  ERC20Token,
  SampleContract__factory,
} from "../typechain-types";
import { CCMPMessagePayloadStruct, CCMPMessageStruct } from "../typechain-types/contracts/CCMPAdaptor";
import { Structs } from "../typechain-types/contracts/interfaces/IWormhole";
import { GasFeePaymentArgsStruct } from "../typechain-types/contracts/AxelarAdaptor";
import { parseUnits } from "ethers/lib/utils";

const NATIVE = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

use(smock.matchers);

describe("CCMPExecutor", async function () {
  let owner: SignerWithAddress,
    alice: SignerWithAddress,
    bob: SignerWithAddress,
    charlie: SignerWithAddress,
    trustedForwarder: SignerWithAddress,
    pauser: SignerWithAddress;
  let CCMPGateway: CCMPGateway,
    CCMPExecutor: CCMPExecutor,
    AxelarAdaptor: AxelarAdaptor,
    WormholeAdaptor: WormholeAdaptor,
    MockAxelarGateway: FakeContract<IAxelarGateway>,
    MockWormholeGateway: MockWormhole,
    MockHyphen: FakeContract<IHyphenLiquidityPool>,
    CCMPHelper: CCMPHelper,
    SampleContract: FakeContract<SampleContract>,
    Token: ERC20Token;
  const abiCoder = new ethers.utils.AbiCoder();

  const getSampleCalldata = (message: string) => SampleContract.interface.encodeFunctionData("emitEvent", [message]);

  const getHyphenEncodedData = (tokenAddress: string, to: string, amount: BigNumber) =>
    abiCoder.encode(["address", "address", "uint256"], [tokenAddress, to, amount]);

  beforeEach(async function () {
    [owner, alice, bob, charlie, trustedForwarder, pauser] = await ethers.getSigners();
    MockAxelarGateway = await smock.fake(IAxelarGateway__factory.abi);
    MockHyphen = await smock.fake(IHyphenLiquidityPool__factory.abi);
    SampleContract = await smock.fake(SampleContract__factory.abi);
    MockWormholeGateway = (await (await ethers.getContractFactory("MockWormhole", owner)).deploy()) as MockWormhole;
    CCMPGateway = (await upgrades.deployProxy(await ethers.getContractFactory("CCMPGateway"), [
      trustedForwarder.address,
      pauser.address,
    ])) as CCMPGateway;
    CCMPExecutor = (await upgrades.deployProxy(await ethers.getContractFactory("CCMPExecutor"), [
      CCMPGateway.address,
      MockHyphen.address,
      pauser.address,
    ])) as CCMPExecutor;
    await CCMPGateway.setCCMPExecutor(CCMPExecutor.address);
    AxelarAdaptor = (await upgrades.deployProxy(await ethers.getContractFactory("AxelarAdaptor"), [
      MockAxelarGateway.address,
      CCMPGateway.address,
      trustedForwarder.address,
      pauser.address,
    ])) as AxelarAdaptor;
    WormholeAdaptor = (await upgrades.deployProxy(await ethers.getContractFactory("WormholeAdaptor"), [
      MockWormholeGateway.address,
      CCMPGateway.address,
      trustedForwarder.address,
      pauser.address,
    ])) as WormholeAdaptor;
    CCMPHelper = (await (await ethers.getContractFactory("CCMPHelper")).deploy()) as CCMPHelper;
    await CCMPGateway.setRouterAdaptor("wormhole", WormholeAdaptor.address);
    await CCMPGateway.setRouterAdaptor("axelar", AxelarAdaptor.address);
    await CCMPGateway.setGateway(1, CCMPGateway.address);
    Token = (await upgrades.deployProxy(await ethers.getContractFactory("ERC20Token"), [
      "Token",
      "TKN",
      18,
    ])) as ERC20Token;
    for (const signer of [owner, alice, bob, charlie, trustedForwarder, pauser]) {
      await Token.mint(signer.address, parseUnits("1000000", 18));
    }

    const chainId = (await ethers.provider.getNetwork()).chainId;
    await AxelarAdaptor.setDestinationChainIdToName(chainId + 1, "test");
  });

  describe("Fee Management - Extra Tokens", async function () {
    let chainId: number;
    let payloads: CCMPMessagePayloadStruct[];
    let gasFeePaymentArgs: GasFeePaymentArgsStruct;
    const emptyBytes = abiCoder.encode(["bytes"], [ethers.constants.HashZero]);
    let routeArgs = emptyBytes;

    beforeEach(async function () {
      chainId = (await ethers.provider.getNetwork()).chainId;
      payloads = [
        {
          operationType: 0,
          data: abiCoder.encode(["address", "bytes"], [SampleContract.address, getSampleCalldata("Hello World")]),
        },
        {
          operationType: 0,
          data: abiCoder.encode(["address", "bytes"], [SampleContract.address, getSampleCalldata("Hello World 2.0")]),
        },
      ];

      gasFeePaymentArgs = {
        mode: 0,
        feeTokenAddress: NATIVE,
        feeAmount: 0,
        relayer: alice.address,
        feeSourcePayloadIndex: 0,
      };
    });

    it("Shoud allow fee to be paid separately in native tokens", async function () {
      gasFeePaymentArgs.feeAmount = parseUnits("1", 18);
      gasFeePaymentArgs.relayer = charlie.address;

      await expect(
        CCMPGateway.sendMessage(1, "wormhole", payloads, gasFeePaymentArgs, routeArgs, {
          value: gasFeePaymentArgs.feeAmount,
        })
      )
        .to.emit(CCMPExecutor, "FeePaidViaExtraTokenDeposit")
        .withArgs(NATIVE, gasFeePaymentArgs.feeAmount, charlie.address);

      expect(await CCMPExecutor.relayerFeeBalance(charlie.address, NATIVE)).to.equal(gasFeePaymentArgs.feeAmount);
    });

    it("Shoud revert if there is a mismatch in native token fee amount", async function () {
      gasFeePaymentArgs.feeAmount = parseUnits("1", 18);
      gasFeePaymentArgs.relayer = charlie.address;

      await expect(
        CCMPGateway.sendMessage(1, "wormhole", payloads, gasFeePaymentArgs, routeArgs, {
          value: gasFeePaymentArgs.feeAmount.sub(1),
        })
      ).to.be.revertedWithCustomError(CCMPExecutor, "NativeAmountMismatch");
    });

    it("Should Allow Native Fee to be claimed by relayer", async function () {
      gasFeePaymentArgs.feeAmount = parseUnits("1", 18);
      gasFeePaymentArgs.relayer = charlie.address;

      await CCMPGateway.sendMessage(1, "wormhole", payloads, gasFeePaymentArgs, routeArgs, {
        value: gasFeePaymentArgs.feeAmount,
      });

      await expect(() =>
        CCMPExecutor.connect(charlie).withdrawFee(NATIVE, gasFeePaymentArgs.feeAmount, charlie.address)
      ).to.changeEtherBalances(
        [charlie, CCMPExecutor],
        [gasFeePaymentArgs.feeAmount, gasFeePaymentArgs.feeAmount.mul(-1)]
      );
    });

    it("Should prevent relayers from withdrawing more fee than their balance", async function () {
      gasFeePaymentArgs.feeAmount = parseUnits("1", 18);
      gasFeePaymentArgs.relayer = charlie.address;
      const withdrawnAmount = parseUnits("2", 18);

      await CCMPGateway.sendMessage(1, "wormhole", payloads, gasFeePaymentArgs, routeArgs, {
        value: gasFeePaymentArgs.feeAmount,
      });

      await expect(CCMPExecutor.connect(charlie).withdrawFee(NATIVE, withdrawnAmount, charlie.address))
        .to.be.revertedWithCustomError(CCMPExecutor, "AmountExceedsBalance")
        .withArgs(withdrawnAmount, gasFeePaymentArgs.feeAmount);
    });

    it("Shoud allow fee to be paid separately in ERC20 tokens", async function () {
      gasFeePaymentArgs.feeAmount = parseUnits("1", 18);
      gasFeePaymentArgs.relayer = charlie.address;
      gasFeePaymentArgs.feeTokenAddress = Token.address;

      await Token.approve(CCMPExecutor.address, gasFeePaymentArgs.feeAmount);

      await expect(CCMPGateway.sendMessage(1, "wormhole", payloads, gasFeePaymentArgs, routeArgs))
        .to.emit(CCMPExecutor, "FeePaidViaExtraTokenDeposit")
        .withArgs(Token.address, gasFeePaymentArgs.feeAmount, charlie.address);

      expect(await CCMPExecutor.relayerFeeBalance(charlie.address, Token.address)).to.equal(
        gasFeePaymentArgs.feeAmount
      );
    });

    it("Shoud revert if user has insufficient tokens", async function () {
      await Token.transfer(alice.address, await Token.balanceOf(owner.address));

      gasFeePaymentArgs.feeAmount = parseUnits("1", 18);
      gasFeePaymentArgs.relayer = charlie.address;
      gasFeePaymentArgs.feeTokenAddress = Token.address;

      await Token.approve(CCMPExecutor.address, gasFeePaymentArgs.feeAmount);

      await expect(CCMPGateway.sendMessage(1, "wormhole", payloads, gasFeePaymentArgs, routeArgs)).to.be.reverted;
    });

    it("Should Allow ERC20 Fee to be claimed by relayer", async function () {
      gasFeePaymentArgs.feeAmount = parseUnits("1", 18);
      gasFeePaymentArgs.relayer = charlie.address;
      gasFeePaymentArgs.feeTokenAddress = Token.address;

      await Token.approve(CCMPExecutor.address, gasFeePaymentArgs.feeAmount);
      await CCMPGateway.sendMessage(1, "wormhole", payloads, gasFeePaymentArgs, routeArgs);

      await expect(() =>
        CCMPExecutor.connect(charlie).withdrawFee(Token.address, gasFeePaymentArgs.feeAmount, charlie.address)
      ).to.changeTokenBalances(
        Token,
        [charlie, CCMPExecutor],
        [gasFeePaymentArgs.feeAmount, gasFeePaymentArgs.feeAmount.mul(-1)]
      );
    });

    it("Should prevent relayers from withdrawing more fee than their balance", async function () {
      const withdrawnAmount = parseUnits("2", 18);

      gasFeePaymentArgs.feeAmount = parseUnits("1", 18);
      gasFeePaymentArgs.relayer = charlie.address;
      gasFeePaymentArgs.feeTokenAddress = Token.address;

      await Token.approve(CCMPExecutor.address, gasFeePaymentArgs.feeAmount);

      await CCMPGateway.sendMessage(1, "wormhole", payloads, gasFeePaymentArgs, routeArgs);

      await expect(CCMPExecutor.connect(charlie).withdrawFee(Token.address, withdrawnAmount, charlie.address))
        .to.be.revertedWithCustomError(CCMPExecutor, "AmountExceedsBalance")
        .withArgs(withdrawnAmount, gasFeePaymentArgs.feeAmount);
    });
  });

  describe("Fee Management + Hyphen", async function () {
    const emptyBytes = abiCoder.encode(["bytes"], [ethers.constants.HashZero]);
    let routeArgs = emptyBytes;

    beforeEach(async () => {
      await Token.approve(CCMPExecutor.address, parseUnits("100", 18));
    });

    it("Should cut fee from Native Hyphen Deposit", async function () {
      const transferredAmount = parseUnits("1", 18);
      const feeAmount = parseUnits("0.1", 18);

      const payload: CCMPMessagePayloadStruct = {
        operationType: 1,
        data: getHyphenEncodedData(NATIVE, alice.address, transferredAmount),
      };
      const gasFeePaymentArgs: GasFeePaymentArgsStruct = {
        mode: 1,
        feeTokenAddress: NATIVE,
        feeAmount,
        relayer: charlie.address,
        feeSourcePayloadIndex: 0,
      };

      await CCMPGateway.sendMessage(1, "wormhole", [payload], gasFeePaymentArgs, routeArgs, {
        value: transferredAmount,
      });

      expect(MockHyphen.depositNativeFromCCMP).to.have.been.calledWith(alice.address, 1);
      expect(await ethers.provider.getBalance(MockHyphen.address)).to.equal(transferredAmount.sub(feeAmount));
      expect(await CCMPExecutor.relayerFeeBalance(charlie.address, NATIVE)).to.equal(feeAmount);
    });

    it("Should revert if msg.value is less than NATIVE transfer amount", async function () {
      const transferredAmount = parseUnits("1", 18);
      const feeAmount = parseUnits("0.1", 18);

      const payload: CCMPMessagePayloadStruct = {
        operationType: 1,
        data: getHyphenEncodedData(NATIVE, alice.address, transferredAmount),
      };
      const gasFeePaymentArgs: GasFeePaymentArgsStruct = {
        mode: 1,
        feeTokenAddress: NATIVE,
        feeAmount,
        relayer: charlie.address,
        feeSourcePayloadIndex: 0,
      };

      await expect(
        CCMPGateway.sendMessage(1, "wormhole", [payload], gasFeePaymentArgs, routeArgs, {
          value: transferredAmount.sub(1),
        })
      )
        .to.be.revertedWithCustomError(CCMPExecutor, "InsufficientNativeAmount")
        .withArgs(transferredAmount, transferredAmount.sub(1));
    });

    it("Should revert if NATIVE transfer amount is less than fee", async function () {
      const transferredAmount = parseUnits("0.01", 18);
      const feeAmount = parseUnits("0.1", 18);

      const payload: CCMPMessagePayloadStruct = {
        operationType: 1,
        data: getHyphenEncodedData(NATIVE, alice.address, transferredAmount),
      };
      const gasFeePaymentArgs: GasFeePaymentArgsStruct = {
        mode: 1,
        feeTokenAddress: NATIVE,
        feeAmount,
        relayer: charlie.address,
        feeSourcePayloadIndex: 0,
      };

      await expect(
        CCMPGateway.sendMessage(1, "wormhole", [payload], gasFeePaymentArgs, routeArgs, {
          value: transferredAmount,
        })
      )
        .to.be.revertedWithCustomError(CCMPExecutor, "TransferAmountLessThanFee")
        .withArgs(transferredAmount, feeAmount, NATIVE);
    });

    it("Should cut fee from ERC20 Hyphen Deposit", async function () {
      const transferredAmount = parseUnits("1", 18);
      const feeAmount = parseUnits("0.1", 18);

      const payload: CCMPMessagePayloadStruct = {
        operationType: 1,
        data: getHyphenEncodedData(Token.address, alice.address, transferredAmount),
      };
      const gasFeePaymentArgs: GasFeePaymentArgsStruct = {
        mode: 1,
        feeTokenAddress: Token.address,
        feeAmount,
        relayer: charlie.address,
        feeSourcePayloadIndex: 0,
      };

      await CCMPGateway.sendMessage(1, "wormhole", [payload], gasFeePaymentArgs, routeArgs);

      expect(MockHyphen.depositErc20FromCCMP).to.have.been.calledWith(
        1,
        Token.address,
        alice.address,
        transferredAmount.sub(feeAmount)
      );
      expect(await CCMPExecutor.relayerFeeBalance(charlie.address, Token.address)).to.equal(feeAmount);
    });

    it("Should revert if ERC20 balance is less than token transfer amount", async function () {
      const transferredAmount = parseUnits("1", 18);
      const feeAmount = parseUnits("0.1", 18);

      await Token.transfer(alice.address, await Token.balanceOf(owner.address));

      const payload: CCMPMessagePayloadStruct = {
        operationType: 1,
        data: getHyphenEncodedData(Token.address, alice.address, transferredAmount),
      };
      const gasFeePaymentArgs: GasFeePaymentArgsStruct = {
        mode: 1,
        feeTokenAddress: Token.address,
        feeAmount,
        relayer: charlie.address,
        feeSourcePayloadIndex: 0,
      };

      await expect(CCMPGateway.sendMessage(1, "wormhole", [payload], gasFeePaymentArgs, routeArgs)).to.be.reverted;
    });

    it("Should revert if ERC20 transfer amount is less than fee amount", async function () {
      const transferredAmount = parseUnits("0.01", 18);
      const feeAmount = parseUnits("0.1", 18);

      const payload: CCMPMessagePayloadStruct = {
        operationType: 1,
        data: getHyphenEncodedData(Token.address, alice.address, transferredAmount),
      };
      const gasFeePaymentArgs: GasFeePaymentArgsStruct = {
        mode: 1,
        feeTokenAddress: Token.address,
        feeAmount,
        relayer: charlie.address,
        feeSourcePayloadIndex: 0,
      };

      await expect(CCMPGateway.sendMessage(1, "wormhole", [payload], gasFeePaymentArgs, routeArgs))
        .to.be.revertedWithCustomError(CCMPExecutor, "TransferAmountLessThanFee")
        .withArgs(transferredAmount, feeAmount, Token.address);
    });
  });

  describe("Message Execution", async function () {
    let chainId: number;
    let gasFeePaymentArgs: GasFeePaymentArgsStruct;
    let message: CCMPMessageStruct;
    const emptyBytes = abiCoder.encode(["bytes"], [ethers.constants.HashZero]);
    let routeArgs = emptyBytes;

    beforeEach(async function () {
      chainId = (await ethers.provider.getNetwork()).chainId;

      gasFeePaymentArgs = {
        mode: 0,
        feeTokenAddress: NATIVE,
        feeAmount: 0,
        relayer: alice.address,
        feeSourcePayloadIndex: 0,
      };

      message = {
        sender: owner.address,
        sourceGateway: CCMPGateway.address,
        sourceAdaptor: WormholeAdaptor.address,
        sourceChainId: chainId + 1,
        destinationGateway: CCMPGateway.address,
        destinationChainId: chainId,
        routerAdaptor: "wormhole",
        nonce: BigNumber.from(chainId + 1).mul(BigNumber.from(2).mul(128)),
        gasFeePaymentArgs: gasFeePaymentArgs,
        payload: [],
      };

      await CCMPExecutor.setCCMPGateway(owner.address);
    });

    it("Should be able to execute contract calls", async function () {
      const payload: CCMPMessagePayloadStruct = {
        operationType: 0,
        data: abiCoder.encode(["address", "bytes"], [SampleContract.address, getSampleCalldata("Hello World")]),
      };

      message.payload = [payload];

      await CCMPExecutor.executeCCMPMessage(message);

      expect(SampleContract.emitEvent).to.have.been.calledWith("Hello World");
    });

    it("Should revert if contract call fails", async function () {
      const payload: CCMPMessagePayloadStruct = {
        operationType: 0,
        data: abiCoder.encode(["address", "bytes"], [SampleContract.address, getSampleCalldata("Hello World")]),
      };

      const revertMessage = "REVERT_TEST";

      message.payload = [payload];

      SampleContract.emitEvent.reverts(revertMessage);

      await expect(CCMPExecutor.executeCCMPMessage(message))
        .to.be.revertedWithCustomError(CCMPExecutor, "ExternalCallFailed")
        .withArgs(0, SampleContract.address, "0x");
    });

    it("Should be able to execute Hyphen Exits", async function () {
      const payload: CCMPMessagePayloadStruct = {
        operationType: 1,
        data: getHyphenEncodedData(NATIVE, alice.address, parseUnits("1", 18)),
      };

      message.payload = [payload];

      await CCMPExecutor.executeCCMPMessage(message);

      expect(MockHyphen.sendFundsToUserFromCCMP).to.have.been.calledWith(NATIVE, parseUnits("1", 18), alice.address);
    });

    it("Should revert if the Hyphen Exit reverts", async function () {
      const payload: CCMPMessagePayloadStruct = {
        operationType: 1,
        data: getHyphenEncodedData(NATIVE, alice.address, parseUnits("1", 18)),
      };

      message.payload = [payload];

      MockHyphen.sendFundsToUserFromCCMP.reverts("REVERT_TEST");

      await expect(CCMPExecutor.executeCCMPMessage(message))
        .to.be.revertedWithCustomError(CCMPExecutor, "TokenTransferExitFailed")
        .withArgs(0);
    });
  });
});
