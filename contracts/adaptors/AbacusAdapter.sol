// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import {AbacusConnectionClient} from "@abacus-network/app/contracts/AbacusConnectionClient.sol";
import {IMessageRecipient} from "@abacus-network/core/interfaces/IMessageRecipient.sol";
import "../interfaces/IAxelarGateway.sol";
import "../structures/CrossChainMessage.sol";

import "./CCMPAdaptorBase.sol";

error AbacusAdapterDestinationChainUnsupported(uint256 chainId);

/// @title Abacus Adaptor
/// @author ankur@biconomy.io
/// @notice Adaptor for the abacus protocol into the CCMP System
contract AbacusAdapter is
    AbacusConnectionClient,
    CCMPAdaptorBase,
    IMessageRecipient
{
    using CCMPMessageUtils for CCMPMessage;

    event DomainIdUpdated(uint256 indexed chainId, uint32 indexed newDomainId);
    event AbacusMessageRouted(uint256 indexed messageId);
    event AbacusMessageVerified(
        bytes32 indexed ccmpMessageHash,
        uint32 indexed origin,
        bytes32 sender
    );

    mapping(uint256 => uint32) public chainIdToDomainId;
    mapping(bytes32 => bool) public messageHashVerified;

    function initialize(
        address _ccmpGateway,
        address _trustedForwader,
        address _pauser,
        address _abacusConnectionManager,
        address _interchainGasPaymaster
    ) public initializer {
        __Adaptor_init(_trustedForwader, _ccmpGateway, _pauser);
        __AbacusConnectionClient_initialize(
            _abacusConnectionManager,
            _interchainGasPaymaster
        );

        // Initialize default domain IDs: https://docs.useabacus.network/abacus-docs/developers/domains
        // Testnet
        chainIdToDomainId[44787] = 1000;
        chainIdToDomainId[421611] = 0x61722d72;
        chainIdToDomainId[97] = 0x62732d74;
        chainIdToDomainId[43113] = 43113;
        chainIdToDomainId[5] = 5;
        chainIdToDomainId[42] = 3000;
        chainIdToDomainId[80001] = 80001;
        chainIdToDomainId[69] = 0x6f702d6b;
        // Mainnet
        chainIdToDomainId[42161] = 0x617262;
        chainIdToDomainId[43114] = 0x61766178;
        chainIdToDomainId[56] = 0x627363;
        chainIdToDomainId[42220] = 0x63656c6f;
        chainIdToDomainId[1] = 0x657468;
        chainIdToDomainId[10] = 0x6f70;
        chainIdToDomainId[80001] = 0x706f6c79;
    }

    function handle(
        uint32 _origin,
        bytes32 _sender,
        bytes calldata _message
    ) external onlyInbox {
        bytes32 ccmpMessageHash = abi.decode(_message, (bytes32));
        messageHashVerified[ccmpMessageHash] = true;
        emit AbacusMessageVerified(ccmpMessageHash, _origin, (_sender));
    }

    function routePayload(
        CCMPMessage calldata _message,
        bytes calldata _routerArgs
    ) external nonReentrant whenNotPaused onlyCCMPGateway {
        uint32 destinationChainDomainId = chainIdToDomainId[
            _message.destinationChainId
        ];
        bytes32 destinationRouterAddress = abi.decode(_routerArgs, (bytes32));
        if (destinationChainDomainId == 0) {
            revert AbacusAdapterDestinationChainUnsupported(
                _message.destinationChainId
            );
        }

        uint256 messageId = _outbox().dispatch(
            destinationChainDomainId,
            destinationRouterAddress,
            abi.encode(_message.hash())
        );

        emit AbacusMessageRouted(messageId);
    }

    function verifyPayload(CCMPMessage calldata _ccmpMessage, bytes calldata)
        external
        whenNotPaused
        nonReentrant
        returns (bool, string memory)
    {
        return (messageHashVerified[_ccmpMessage.hash()], "");
    }

    function updateDomainId(uint256 _chainId, uint32 _domainId)
        external
        onlyOwner
    {
        chainIdToDomainId[_chainId] = _domainId;
        emit DomainIdUpdated(_chainId, _domainId);
    }

    function _msgSender()
        internal
        view
        virtual
        override(ContextUpgradeable, CCMPAdaptorBase)
        returns (address sender)
    {
        return super._msgSender();
    }

    function _msgData()
        internal
        view
        virtual
        override(ContextUpgradeable, CCMPAdaptorBase)
        returns (bytes calldata)
    {
        return super._msgData();
    }
}
