// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../structures/CrossChainMessage.sol";
import "../interfaces/ICCMPRouterAdaptor.sol";

interface ICCMPGateway {
    function sendMessage(
        uint256 _destinationChainId,
        string calldata _adaptorName,
        CCMPMessagePayload[] calldata _payloads,
        GasFeePaymentArgs calldata _gasFeePaymentArgs,
        bytes calldata _routerArgs
    ) external payable returns (bool sent);

    function receiveMessage(
        CCMPMessage calldata _message,
        bytes calldata _verificationData
    ) external returns (bool received);

    function setRouterAdaptor(string calldata name, ICCMPRouterAdaptor adaptor)
        external;
}
