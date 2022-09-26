// TODO: Diamondify

// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "./interfaces/ICCMPGateway.sol";
import "./interfaces/ICCMPRouterAdaptor.sol";
import "./interfaces/ICCMPExecutor.sol";
import "./structures/CrossChainMessage.sol";
import "./security/Pausable.sol";
import "./metatx/ERC2771ContextUpgradeable.sol";
import "./structures/Constants.sol";

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

// SendMessage
error UnsupportedAdapter(string adaptorName);
error UnsupportedDestinationChain(uint256 destinationChainId);
error InvalidPayload(string reason);

// ReceiveMessage
error InvalidSource(uint256 sourceChainId, ICCMPGateway sourceGateway);
error WrongDestination(
    uint256 destinationChainId,
    ICCMPGateway destinationGateway
);

// Execution
error AlreadyExecuted(uint256 nonce);
error VerificationFailed(string reason);
error ExternalCallFailed(
    uint256 index,
    address contractAddress,
    bytes returndata
);

// Fee
error AmountIsZero();
error NativeAmountMismatch();
error NativeTransferFailed(address relayer, bytes data);
error AmountExceedsBalance(uint256 _amount, uint256 balance);
error InsufficientNativeAmount(uint256 requiredAmount, uint256 actualAmount);

/// @title CCMPGateway
/// @author ankur@biconomy.io
/// @notice The CCMP Gateway acts as the entrypoint to the CCMP system for the users as well as relayers.
///         Manages sending, receiving and execution of messages, and fee.
contract CCMPGateway is
    Initializable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    ERC2771ContextUpgradeable,
    Pausable,
    ICCMPGateway,
    Constants
{
    using CCMPMessageUtils for CCMPMessage;
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using CCMPMessageUtils for CCMPMessage;

    // Global Nonce (when used, it's prefixe with block.chainid)
    uint128 public nextNonce;

    // Adaptor Name => Adaptor Address
    mapping(string => ICCMPRouterAdaptor) public adaptors;

    // Destination Chain ID => Gateway Address.
    // This is set in the outbound message and is verified on the destination chain
    mapping(uint256 => ICCMPGateway) public gateways;

    // Whether a message with nonce N has been executed or not
    mapping(uint256 => bool) public nonceUsed;

    ICCMPExecutor public ccmpExecutor;

    event GatewayUpdated(
        uint256 indexed destinationChainId,
        ICCMPGateway indexed gateway
    );
    event CCMPExecutorUpdated(ICCMPExecutor indexed _ccmpExecutor);
    event AdaptorUpdated(string indexed adaptorName, address indexed adaptor);
    event CCMPMessageExecuted(
        bytes32 indexed hash,
        address indexed sender,
        ICCMPGateway sourceGateway,
        ICCMPRouterAdaptor sourceAdaptor,
        uint256 sourceChainId,
        ICCMPGateway destinationGateway,
        uint256 indexed destinationChainId,
        uint256 nonce,
        string routerAdaptor,
        GasFeePaymentArgs gasFeePaymentArgs,
        CCMPMessagePayload[] payload
    );
    event CCMPMessageRouted(
        bytes32 indexed hash,
        address indexed sender,
        ICCMPGateway sourceGateway,
        ICCMPRouterAdaptor sourceAdaptor,
        uint256 sourceChainId,
        ICCMPGateway destinationGateway,
        uint256 indexed destinationChainId,
        uint256 nonce,
        string routerAdaptor,
        GasFeePaymentArgs args,
        CCMPMessagePayload[] payload
    );
    event CCMPPayloadExecuted(
        uint256 indexed index,
        address indexed contractAddress,
        bool success,
        bytes returndata
    );
    event FeePaid(
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

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _trustedForwader, address _pauser)
        public
        initializer
    {
        __Ownable_init();
        __ERC2771Context_init(_trustedForwader);
        __Pausable_init(_pauser);
        nextNonce = 0;
    }

    /// @param _destinationChainId The chain id of the destination chain.
    /// @param _adaptorName The name of the router adaptor to use. Currently "axelar", "wormhole" and "abacus" are supported.
    /// @param _gasFeePaymentArgs Contains details for the fee quoted by the relayer.
    /// @param _routerArgs Contains abi encoded router specific arguments. For ex, CONSISTENCY_LEVEL when sending message via wormhole.
    /// @return sent The hash of the message sent.
    function sendMessage(
        uint256 _destinationChainId,
        string calldata _adaptorName,
        CCMPMessagePayload[] calldata _payloads,
        GasFeePaymentArgs calldata _gasFeePaymentArgs,
        bytes calldata _routerArgs
    ) external payable nonReentrant whenNotPaused returns (bool) {
        // Check Adaptor
        ICCMPRouterAdaptor adaptor = adaptors[_adaptorName];
        if (adaptor == ICCMPRouterAdaptor(address(0))) {
            revert UnsupportedAdapter(_adaptorName);
        }

        // Check Chain ID
        if (_destinationChainId == block.chainid) {
            revert UnsupportedDestinationChain(_destinationChainId);
        }
        ICCMPGateway destinationGateway = gateways[_destinationChainId];
        if (destinationGateway == ICCMPGateway(address(0))) {
            revert UnsupportedDestinationChain(_destinationChainId);
        }

        // Check Payload
        if (_payloads.length == 0) {
            revert InvalidPayload("No payload");
        }

        CCMPMessage memory message = CCMPMessage({
            sender: _msgSender(),
            sourceGateway: this,
            sourceAdaptor: adaptor,
            sourceChainId: block.chainid,
            destinationGateway: destinationGateway,
            destinationChainId: _destinationChainId,
            // Global nonce, chainid is included to prevent coliision with messages from different chain but same index
            nonce: (block.chainid << 128) + nextNonce++,
            routerAdaptor: _adaptorName,
            gasFeePaymentArgs: _gasFeePaymentArgs,
            payload: _payloads
        });

        _handleFee(message);

        adaptor.routePayload(message, _routerArgs);

        emit CCMPMessageRouted(
            message.hash(),
            message.sender,
            message.sourceGateway,
            message.sourceAdaptor,
            message.sourceChainId,
            message.destinationGateway,
            message.destinationChainId,
            message.nonce,
            message.routerAdaptor,
            message.gasFeePaymentArgs,
            message.payload
        );

        return true;
    }

    /// @notice Function called by the relayer on the destination chain to execute the sent message on the exit chain.
    /// @param _message The message to be executed.
    /// @param _verificationData Adaptor specific abi-encoded data required to verify the message's validity on the exit chain. For example, commandId for Axelar.
    // @param _allowPartialExecution Whether to allow partial execution of the message.
    /// @return status The status of the execution.
    function receiveMessage(
        CCMPMessage calldata _message,
        bytes calldata _verificationData,
        bool _allowPartialExecution
    ) external whenNotPaused nonReentrant returns (bool) {
        // Check Source
        if (_message.sourceGateway != gateways[_message.sourceChainId]) {
            revert InvalidSource(
                _message.sourceChainId,
                _message.sourceGateway
            );
        }

        // Check Destination
        if (
            _message.destinationGateway != this ||
            _message.destinationChainId != block.chainid
        ) {
            revert WrongDestination(
                _message.destinationChainId,
                _message.destinationGateway
            );
        }

        // Check Replay
        if (nonceUsed[_message.nonce]) {
            revert AlreadyExecuted(_message.nonce);
        }
        nonceUsed[_message.nonce] = true;

        // Verify from underlying protocol
        ICCMPRouterAdaptor adaptor = adaptors[_message.routerAdaptor];
        if (adaptor == ICCMPRouterAdaptor(address(0))) {
            revert UnsupportedAdapter(_message.routerAdaptor);
        }

        {
            (bool verified, string memory reason) = adaptor.verifyPayload(
                _message,
                _verificationData
            );
            if (!verified) {
                revert VerificationFailed(reason);
            }
        }

        _executeCCMPMessage(_message, _allowPartialExecution);

        emit CCMPMessageExecuted(
            _message.hash(),
            _message.sender,
            _message.sourceGateway,
            _message.sourceAdaptor,
            _message.sourceChainId,
            _message.destinationGateway,
            _message.destinationChainId,
            _message.nonce,
            _message.routerAdaptor,
            _message.gasFeePaymentArgs,
            _message.payload
        );

        return true;
    }

    /// @notice Handles Execution of the received message from CCMP Gateway on destination chain.
    /// @param _message The message received from CCMP Gateway.
    /// @param _allowPartialExecution Whether to allow partial execution of the message.
    function _executeCCMPMessage(
        CCMPMessage calldata _message,
        bool _allowPartialExecution
    ) internal whenNotPaused {
        // Execute CCMP Message Content
        uint256 length = _message.payload.length;

        for (uint256 i = 0; i < length; ) {
            CCMPMessagePayload memory _payload = _message.payload[i];

            (bool success, bytes memory returndata) = ccmpExecutor.execute(
                _payload.to,
                // Append sender and source chain id to the calldata
                // This can be used in the target contract for verification
                abi.encodePacked(
                    _payload._calldata,
                    _message.sourceChainId,
                    _message.sender
                )
            );

            if (_allowPartialExecution && !success) {
                revert ExternalCallFailed(i, _payload.to, returndata);
            }

            emit CCMPPayloadExecuted(i, _payload.to, success, returndata);

            unchecked {
                ++i;
            }
        }
    }

    /// @notice Handles fee payment
    function _handleFee(CCMPMessage memory _message) internal {
        uint256 feeAmount = _message.gasFeePaymentArgs.feeAmount;
        address relayer = _message.gasFeePaymentArgs.relayer;
        address tokenAddress = _message.gasFeePaymentArgs.feeTokenAddress;

        if (feeAmount >= 0) {
            if (_message.gasFeePaymentArgs.feeTokenAddress == NATIVE_ADDRESS) {
                if (msg.value != feeAmount) {
                    revert NativeAmountMismatch();
                }
                (bool success, bytes memory returndata) = relayer.call{
                    value: msg.value
                }("");
                if (!success) {
                    revert NativeTransferFailed(relayer, returndata);
                }
            } else {
                IERC20Upgradeable(_message.gasFeePaymentArgs.feeTokenAddress)
                    .safeTransferFrom(
                        _message.sender,
                        relayer,
                        _message.gasFeePaymentArgs.feeAmount
                    );
            }
        }

        emit FeePaid(tokenAddress, feeAmount, relayer);
    }

    function setGateway(uint256 _chainId, ICCMPGateway _gateway)
        external
        onlyOwner
    {
        gateways[_chainId] = _gateway;
        emit GatewayUpdated(_chainId, _gateway);
    }

    function setRouterAdaptor(string calldata name, ICCMPRouterAdaptor adaptor)
        external
        onlyOwner
    {
        adaptors[name] = adaptor;
        emit AdaptorUpdated(name, address(adaptor));
    }

    function setCCMPExecutor(ICCMPExecutor _ccmpExecutor) external onlyOwner {
        ccmpExecutor = _ccmpExecutor;
        emit CCMPExecutorUpdated(_ccmpExecutor);
    }

    function _msgSender()
        internal
        view
        virtual
        override(ContextUpgradeable, ERC2771ContextUpgradeable)
        returns (address sender)
    {
        return ERC2771ContextUpgradeable._msgSender();
    }

    function _msgData()
        internal
        view
        virtual
        override(ContextUpgradeable, ERC2771ContextUpgradeable)
        returns (bytes calldata)
    {
        return ERC2771ContextUpgradeable._msgData();
    }
}
