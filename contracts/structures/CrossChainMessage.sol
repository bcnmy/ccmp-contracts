// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interfaces/ICCMPGateway.sol";
import "../interfaces/ICCMPRouterAdaptor.sol";

enum CCMPOperation {
    ContractCall,
    TokenTransfer
}

struct ContractCallData {
    address contractAddress;
    bytes params;
}

struct TokenTransferData {
    address tokenAddress;
    address receiver;
    uint256 amount;
    uint256 toChainId;
}

struct CCMPMessagePayload {
    CCMPOperation operation;
    bytes data;
}

/*
    {
        "sender": "0xUSER",
        "chainID: 80001,
        "nonce": 123,
        "routerAdaptor": "wormhole",
        "payload": [
            {
                "operation": 0,
                "data": "0xabc"
            }
        ]
    }
*/
struct CCMPMessage {
    address sender;
    ICCMPGateway sourceGateway;
    ICCMPRouterAdaptor sourceAdaptor;
    uint256 sourceChainId;
    ICCMPGateway destinationGateway;
    uint256 destinationChainId;
    uint256 nonce;
    string routerAdaptor;
    CCMPMessagePayload[] payload;
}

library CCMPMessageUtils {
    function hash(CCMPMessage memory message) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    message.sender,
                    address(message.sourceGateway),
                    address(message.sourceAdaptor),
                    message.sourceChainId,
                    address(message.destinationGateway),
                    message.destinationChainId,
                    message.nonce,
                    message.routerAdaptor,
                    message.payload
                )
            );
    }
}
