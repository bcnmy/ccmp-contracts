// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./interfaces/IAxelarGateway.sol";
import "./structures/CrossChainMessage.sol";

import "./CCMPAdaptor.sol";

contract AxelarAdaptor is CCMPAdaptor {
    using CCMPMessageUtils for CCMPMessage;
    using StringsUpgradeable for address;
    using StringsUpgradeable for uint256;

    IAxelarGateway public axelarGateway;

    event AxelarGatewayUpdated(address indexed newAxelarGateway);

    function initialize(
        address _axelarGateway,
        address _ccmpGateway,
        address _trustedForwader,
        address _pauser
    ) public initializer {
        __Adaptor_init(_trustedForwader, _ccmpGateway, _pauser);
        axelarGateway = IAxelarGateway(_axelarGateway);
    }

    function updateAxelarGateway(IAxelarGateway _axelarGateway)
        external
        whenNotPaused
        onlyOwner
    {
        axelarGateway = _axelarGateway;
        emit AxelarGatewayUpdated(address(_axelarGateway));
    }

    function routePayload(CCMPMessage calldata _message, bytes calldata)
        external
        nonReentrant
        whenNotPaused
        onlyCCMPGateway
    {
        axelarGateway.callContract(
            _message.destinationChainId.toString(),
            address(_message.destinationGateway).toHexString(),
            abi.encode(_message.hash())
        );
    }

    function verifyPayload(
        CCMPMessage calldata _ccmpMessage,
        bytes calldata _verificationData
    ) external whenNotPaused nonReentrant returns (bool) {
        bytes32 payloadHash = keccak256(abi.encode(_ccmpMessage.hash()));
        bytes32 commandId = abi.decode(_verificationData, (bytes32));
        return
            axelarGateway.validateContractCall(
                commandId,
                _ccmpMessage.sourceChainId.toString(),
                address(_ccmpMessage.sourceAdaptor).toHexString(),
                payloadHash
            );
    }
}
