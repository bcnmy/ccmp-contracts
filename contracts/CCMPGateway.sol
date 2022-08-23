// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./interfaces/ICCMPGateway.sol";
import "./interfaces/ICCMPRouterAdaptor.sol";
import "./interfaces/ICCMPExecutor.sol";
import "./structures/CrossChainMessage.sol";
import "./security/Pausable.sol";
import "./metatx/ERC2771ContextUpgradeable.sol";

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

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
error AlreadyExecuted(uint256 nonce);
error VerificationFailed();

contract CCMPGateway is
    Initializable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    ERC2771ContextUpgradeable,
    Pausable,
    ICCMPGateway
{
    using CCMPMessageUtils for CCMPMessage;

    mapping(string => ICCMPRouterAdaptor) public adaptors;
    uint128 public nextNonce;
    mapping(uint256 => ICCMPGateway) public gateways;
    mapping(uint256 => bool) public nonceUsed;
    ICCMPExecutor public ccmpExecutor;

    event GatewayUpdated(
        uint256 indexed destinationChainId,
        ICCMPGateway indexed gateway
    );
    event CCMPExecutorUpdated(address indexed newCCMPExecutor);
    event AdaptorUpdated(string indexed adaptorName, address indexed adaptor);
    event CCMPMessageExecuted(
        bytes32 indexed hash,
        address indexed sender,
        ICCMPGateway sourceGateway,
        ICCMPRouterAdaptor sourceAdaptor,
        uint256 sourceChainId,
        ICCMPGateway destinationChainGateway,
        uint256 indexed destinationChainId,
        uint256 nonce,
        string routerAdaptor,
        CCMPMessagePayload[] payload
    );
    event CCMPMessageRouted(
        bytes32 indexed hash,
        address indexed sender,
        ICCMPGateway sourceGateway,
        ICCMPRouterAdaptor sourceAdaptor,
        uint256 sourceChainId,
        ICCMPGateway destinationChainGateway,
        uint256 indexed destinationChainId,
        uint256 nonce,
        string routerAdaptor,
        CCMPMessagePayload[] payload
    );

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _trustedForwader,
        address _pauser,
        ICCMPExecutor _executor
    ) public initializer {
        __Ownable_init();
        __ERC2771Context_init(_trustedForwader);
        __Pausable_init(_pauser);
        nextNonce = 0;
        ccmpExecutor = _executor;
    }

    function sendMessage(
        uint256 _destinationChainId,
        string calldata adaptorName,
        CCMPMessagePayload[] calldata _payloads,
        bytes calldata _routerArgs
    ) external nonReentrant whenNotPaused returns (bool sent) {
        // Check Adaptor
        ICCMPRouterAdaptor adaptor = adaptors[adaptorName];
        if (adaptor == ICCMPRouterAdaptor(address(0))) {
            revert UnsupportedAdapter(adaptorName);
        }

        // Check Chain ID
        if (_destinationChainId == block.chainid) {
            revert UnsupportedDestinationChain(_destinationChainId);
        }
        ICCMPGateway destinationGateway = gateways[_destinationChainId];
        if (destinationGateway == ICCMPGateway(address(0))) {
            revert UnsupportedDestinationChain(_destinationChainId);
        }
        uint256 nonce = (block.chainid << 128) + nextNonce++;

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
            nonce: nonce,
            routerAdaptor: adaptorName,
            payload: _payloads,
            _hash: 0
        });

        adaptor.routePayload(message, _routerArgs);

        emit CCMPMessageExecuted(
            message.hash(),
            message.sender,
            message.sourceGateway,
            message.sourceAdaptor,
            message.sourceChainId,
            message.destinationGateway,
            message.destinationChainId,
            message.nonce,
            message.routerAdaptor,
            message.payload
        );

        return true;
    }

    function receiveMessage(
        CCMPMessage calldata _message,
        bytes calldata _verificationData
    ) external whenNotPaused returns (bool received) {
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
        if (!adaptor.verifyPayload(_message, _verificationData)) {
            revert VerificationFailed();
        }

        ccmpExecutor.executeCCMPMessage(_message);

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
            _message.payload
        );

        return true;
    }

    function setGateway(uint256 _chainId, ICCMPGateway _gateway)
        external
        whenNotPaused
        onlyOwner
    {
        gateways[_chainId] = _gateway;
        emit GatewayUpdated(_chainId, _gateway);
    }

    function setCCMPExecutor(ICCMPExecutor _executor)
        external
        whenNotPaused
        onlyOwner
    {
        ccmpExecutor = _executor;
        emit CCMPExecutorUpdated(address(_executor));
    }

    function setRouterAdaptor(string calldata name, ICCMPRouterAdaptor adaptor)
        external
        whenNotPaused
        onlyOwner
    {
        adaptors[name] = adaptor;
        emit AdaptorUpdated(name, address(adaptor));
    }

    function getRouterAdaptor(string calldata name)
        external
        view
        returns (address adaptor)
    {
        return address(adaptors[name]);
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
