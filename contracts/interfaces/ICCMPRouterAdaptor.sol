// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../structures/CrossChainMessage.sol";

interface ICCMPRouterAdaptor {
    function verifyPayload(
        CCMPMessage calldata _ccmpMessage,
        bytes calldata _verificationData
    ) external returns (bool);

    function routePayload(
        CCMPMessage calldata _ccmpMessage,
        bytes calldata _routeArgs
    ) external;
}
