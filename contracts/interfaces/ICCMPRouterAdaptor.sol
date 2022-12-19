// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../structures/CrossChainMessage.sol";
import "./ICCMPGateway.sol";

interface ICCMPRouterAdaptor {
    error CallerIsNotCCMPGateway();
    error InvalidAddress(string parameterName, address value);
    error ParameterArrayLengthMismatch();

    event CCMPGatewayUpdated(ICCMPGateway indexed newCCMPGateway);

    function verifyPayload(
        CCMPMessage calldata _ccmpMessage,
        bytes calldata _verificationData
    ) external returns (bool, string memory);

    function routePayload(
        CCMPMessage calldata _ccmpMessage,
        bytes calldata _routeArgs
    ) external;
}
