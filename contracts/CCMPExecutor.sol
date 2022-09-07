// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "./structures/CrossChainMessage.sol";
import "./security/Pausable.sol";
import "./interfaces/ICCMPExecutor.sol";
import "./interfaces/IHyphenLiquidityPool.sol";
import "./structures/Constants.sol";

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721ReceiverUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

error AmountIsZero();
error NativeAmountMismatch();
error ExternalCallFailed(
    uint256 index,
    address contractAddress,
    bytes returndata
);
error UnsupportedOperation(uint256 index, CCMPOperation operation);
error UnsupportedContract(uint256 index, address contractAddress);
error OnlyCCMPGatewayAllowed();
error AmountExceedsBalance(uint256 _amount, uint256 balance);
error FeePaymentTokenMismatch(address expectedToken, address actualToken);
error TransferAmountLessThanFee(
    uint256 transferAmount,
    uint256 feeAmount,
    address tokenAddress
);
error InvalidFeeSourcePayloadIndex(uint256 index);

contract CCMPExecutor is
    Initializable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    Pausable,
    IERC721ReceiverUpgradeable,
    ICCMPExecutor,
    Constants
{
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using CCMPMessageUtils for CCMPMessage;

    mapping(address => bool) public unsupportedAddress;

    // Relayer => Token Address => Fee
    mapping(address => mapping(address => uint256)) public relayerFeeBalance;

    ICCMPGateway public ccmpGateway;
    IHyphenLiquidityPool public hyphenLiquidityPool;

    event UnsupportedContractUpdated(
        address indexed contractAddress,
        bool indexed isUnsupported
    );
    event CCMPPayloadExecuted(
        uint256 indexed index,
        address indexed contractAddress,
        bytes returndata
    );
    event FeePaidViaExtraTokenDeposit(
        address indexed _tokenAddress,
        uint256 indexed _amount,
        address indexed _relayer
    );
    event FeeCutFromCrossChainTokenTransfer(
        address indexed _tokenAddress,
        uint256 indexed _amount,
        address indexed _relayer
    );
    event FeeWithdrawn(
        address indexed _tokenAddress,
        uint256 indexed _amount,
        address indexed _relayer,
        address _to
    );
    event CCMPGatewayUpdated(address indexed ccmpGateway);
    event HyphenLiquidityPoolUpdated(address indexed hyphenLiquidityPool);

    modifier onlyCCMPGateway() {
        if (msg.sender != address(ccmpGateway)) {
            revert OnlyCCMPGatewayAllowed();
        }
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        ICCMPGateway _ccmpGateway,
        IHyphenLiquidityPool _hyphenLiquidityPool,
        address _pauser
    ) public initializer {
        __Ownable_init();
        __Pausable_init(_pauser);
        ccmpGateway = _ccmpGateway;
        hyphenLiquidityPool = _hyphenLiquidityPool;
    }

    function executeCCMPMessage(CCMPMessage calldata _message)
        external
        whenNotPaused
        onlyCCMPGateway
    {
        // Execute CCMP Message Content
        uint256 length = _message.payload.length;

        // TODO: Add support for CCMPOperation.TokenTransfer in next release
        for (uint256 i = 0; i < length; ) {
            if (
                _message.payload[i].operationType != CCMPOperation.ContractCall
            ) {
                revert UnsupportedOperation(
                    i,
                    _message.payload[i].operationType
                );
            }

            (address contractAddress, bytes memory _calldata) = abi.decode(
                _message.payload[i].data,
                (address, bytes)
            );
            if (unsupportedAddress[contractAddress]) {
                revert UnsupportedContract(i, contractAddress);
            }

            (bool success, bytes memory returndata) = contractAddress.call{
                gas: gasleft()
            }(_calldata);

            if (!success) {
                revert ExternalCallFailed(i, contractAddress, returndata);
            }

            emit CCMPPayloadExecuted(i, contractAddress, returndata);

            unchecked {
                ++i;
            }
        }
    }

    function processCCMPMessageOnSourceChain(CCMPMessage memory _message)
        external
        payable
        onlyCCMPGateway
        whenNotPaused
        returns (CCMPMessage memory)
    {
        // Fee Deposit
        if (
            _message.gasFeePaymentArgs.mode ==
            GasFeePaymentMode.ViaExtraTokenDeposit
        ) {
            _depositFeeViaExtraTokenDeposit(_message);
        }

        // Process Hyphen Deposits if any
        _performHyphenDeposits(_message);

        return _message;
    }

    function _performHyphenDeposits(CCMPMessage memory _message)
        private
        nonReentrant
    {
        uint256 length = _message.payload.length;

        if (
            _message.gasFeePaymentArgs.mode ==
            GasFeePaymentMode.CutFromCrossChainTokenTransfer &&
            _message.gasFeePaymentArgs.feeSourcePayloadIndex >= length
        ) {
            revert InvalidFeeSourcePayloadIndex(
                _message.gasFeePaymentArgs.feeSourcePayloadIndex
            );
        }

        for (uint256 i = 0; i < length; ) {
            if (
                _message.payload[i].operationType == CCMPOperation.TokenTransfer
            ) {
                // Decode Transfer Arguments
                (address tokenAddress, address receiver, uint256 amount) = abi
                    .decode(
                        _message.payload[i].data,
                        (address, address, uint256)
                    );

                // Check and cut fee if required
                if (
                    _message.gasFeePaymentArgs.feeSourcePayloadIndex == i &&
                    _message.gasFeePaymentArgs.mode ==
                    GasFeePaymentMode.CutFromCrossChainTokenTransfer
                ) {
                    amount = _cutFeeFromCrossChainTokenTransfer(
                        _message.gasFeePaymentArgs,
                        _message.sender,
                        tokenAddress,
                        amount
                    );
                }

                uint256 rewardAmount;
                if (tokenAddress != NATIVE_ADDRESS) {
                    IERC20Upgradeable(tokenAddress).safeTransferFrom(
                        _message.sender,
                        address(hyphenLiquidityPool),
                        amount
                    );
                    rewardAmount = hyphenLiquidityPool.depositErc20FromCCMP(
                        _message.destinationChainId,
                        tokenAddress,
                        receiver,
                        amount
                    );
                } else {
                    rewardAmount = hyphenLiquidityPool.depositNativeFromCCMP{
                        value: amount
                    }(receiver, _message.destinationChainId);
                }

                // Update the original message to reflect fee cut (if any) and reward amount
                _message.payload[i].data = abi.encode(
                    tokenAddress,
                    receiver,
                    amount + rewardAmount
                );
            }

            unchecked {
                ++i;
            }
        }
    }

    function _cutFeeFromCrossChainTokenTransfer(
        GasFeePaymentArgs memory _feePaymentArgs,
        address _sender,
        address _tokenAddress,
        uint256 _transferredAmount
    ) private returns (uint256) {
        // Checks
        if (_feePaymentArgs.feeTokenAddress != _tokenAddress) {
            revert FeePaymentTokenMismatch(
                _feePaymentArgs.feeTokenAddress,
                _tokenAddress
            );
        }
        if (_feePaymentArgs.feeAmount >= _transferredAmount) {
            revert TransferAmountLessThanFee(
                _transferredAmount,
                _feePaymentArgs.feeAmount,
                _tokenAddress
            );
        }

        // Cut and Transfer Fee
        unchecked {
            _transferredAmount -= _feePaymentArgs.feeAmount;
        }

        if (_tokenAddress != NATIVE_ADDRESS) {
            IERC20Upgradeable(_tokenAddress).safeTransferFrom(
                _sender,
                address(this),
                _feePaymentArgs.feeAmount
            );
        }

        relayerFeeBalance[_feePaymentArgs.relayer][
            _tokenAddress
        ] += _feePaymentArgs.feeAmount;

        emit FeeCutFromCrossChainTokenTransfer(
            _tokenAddress,
            _feePaymentArgs.feeAmount,
            _feePaymentArgs.relayer
        );

        return _transferredAmount;
    }

    function _depositFeeViaExtraTokenDeposit(CCMPMessage memory _message)
        private
        nonReentrant
    {
        uint256 feeAmount = _message.gasFeePaymentArgs.feeAmount;
        address relayer = _message.gasFeePaymentArgs.relayer;
        address tokenAddress = _message.gasFeePaymentArgs.feeTokenAddress;

        if (feeAmount >= 0) {
            if (_message.gasFeePaymentArgs.feeTokenAddress == NATIVE_ADDRESS) {
                if (msg.value != feeAmount) {
                    revert NativeAmountMismatch();
                }
            } else {
                IERC20Upgradeable(_message.gasFeePaymentArgs.feeTokenAddress)
                    .safeTransferFrom(
                        _message.sender,
                        address(this),
                        _message.gasFeePaymentArgs.feeAmount
                    );
            }
            relayerFeeBalance[relayer][tokenAddress] += feeAmount;
        }

        emit FeePaidViaExtraTokenDeposit(tokenAddress, feeAmount, relayer);
    }

    function withdrawFee(
        address _tokenAddress,
        uint256 _amount,
        address _to
    ) external nonReentrant whenNotPaused {
        uint256 balance = relayerFeeBalance[msg.sender][_tokenAddress];
        if (_amount > balance) {
            revert AmountExceedsBalance(_amount, balance);
        }

        if (_tokenAddress == NATIVE_ADDRESS) {
            (bool success, bytes memory returndata) = _to.call{value: _amount}(
                ""
            );
            if (!success) {
                revert ExternalCallFailed(0, _to, returndata);
            }
        } else {
            IERC20Upgradeable(_tokenAddress).safeTransfer(_to, _amount);
        }

        relayerFeeBalance[msg.sender][_tokenAddress] -= _amount;

        emit FeeWithdrawn(_tokenAddress, _amount, msg.sender, _to);
    }

    function setAddressUnsupportedState(address _address, bool _state)
        external
        whenNotPaused
        onlyOwner
    {
        unsupportedAddress[_address] = _state;
        emit UnsupportedContractUpdated(_address, _state);
    }

    function setCCMPGateway(ICCMPGateway _ccmpGateway)
        external
        whenNotPaused
        onlyOwner
    {
        ccmpGateway = _ccmpGateway;
        emit CCMPGatewayUpdated(address(_ccmpGateway));
    }

    function setHyphenLiquidityPool(IHyphenLiquidityPool _hyphenLiquidityPool)
        external
        whenNotPaused
        onlyOwner
    {
        hyphenLiquidityPool = _hyphenLiquidityPool;
        emit HyphenLiquidityPoolUpdated(address(_hyphenLiquidityPool));
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure returns (bytes4) {
        return IERC721ReceiverUpgradeable.onERC721Received.selector;
    }
}
