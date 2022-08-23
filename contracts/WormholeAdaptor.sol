// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./interfaces/IWormhole.sol";
import "./CCMPAdaptor.sol";

error WormholeVerificationError(string reason);

contract WormholeAdaptor is CCMPAdaptor {
    using CCMPMessageUtils for CCMPMessage;

    uint32 public wormholeMessageNonce;
    IWormhole public wormhole;

    event CCMPMessageRoutedViaWormhole(
        uint32 indexed wormholeNonce,
        uint64 indexed sequenceID,
        uint8 indexed consistencyLevel
    );
    event WormholeUpdated(address indexed newWormhole);

    function initialize(
        address _wormhole,
        address _ccmpGateway,
        address _trustedForwader,
        address _pauser
    ) public initializer {
        __Adaptor_init(_trustedForwader, _ccmpGateway, _pauser);
        wormhole = IWormhole(_wormhole);
        wormholeMessageNonce = 0;
    }

    function updateWormhole(IWormhole _wormhole)
        external
        whenNotPaused
        onlyOwner
    {
        wormhole = _wormhole;
        emit WormholeUpdated(address(wormhole));
    }

    function routePayload(
        CCMPMessage calldata _message,
        bytes calldata _routeArgs
    ) external nonReentrant onlyCCMPGateway whenNotPaused {
        uint8 consistencyLevel = abi.decode(_routeArgs, (uint8));
        uint64 sequenceId = wormhole.publishMessage(
            wormholeMessageNonce,
            abi.encode(_message.hash()),
            consistencyLevel
        );
        emit CCMPMessageRoutedViaWormhole(
            wormholeMessageNonce,
            sequenceId,
            consistencyLevel
        );

        ++wormholeMessageNonce;
    }

    function verifyPayload(
        CCMPMessage calldata _ccmpMessage,
        bytes calldata _verificationData
    ) external nonReentrant whenNotPaused returns (bool) {
        (IWormhole.VM memory vm, bool valid, string memory reason) = wormhole
            .parseAndVerifyVM(_verificationData);

        if (!valid) {
            revert WormholeVerificationError(reason);
        }

        return
            keccak256(vm.payload) == keccak256(abi.encode(_ccmpMessage.hash()));
    }
}
