// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interfaces/ICCMPGateway.sol";
import "../interfaces/ICCMPRouterAdaptor.sol";

// TODO: Optimize Structs for Packing

enum CCMPOperation {
    ContractCall,
    TokenTransfer
}

enum GasFeePaymentMode {
    ViaExtraTokenDeposit,
    CutFromCrossChainTokenTransfer
}

struct CCMPMessagePayload {
    CCMPOperation operationType;
    bytes data;
}

struct GasFeePaymentArgs {
    GasFeePaymentMode mode;
    address feeTokenAddress;
    uint256 feeAmount;
    address relayer;
    uint256 feeSourcePayloadIndex;
}

/*
    {
        "sender": "0xUSER",
        "sourceGateway": "0xGATEWAY",
        "sourceAdaptor": "0xADAPTOR",
        "sourceChainId: 80001,
        "destinationChainGateway": "0xGATEWAY2",
        "destinationChainId": "1",
        "nonce": 1,
        "routerAdaptor": "wormhole",
        "gasFeePaymentArgs": GasFeePaymentArgs,
        "payload": [
            {
                "operationType": 0 / 1,
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
    GasFeePaymentArgs gasFeePaymentArgs;
    CCMPMessagePayload[] payload;
}

library CCMPMessageUtils {
    // TODO: Optimize function to cache value somehow
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
                    message.gasFeePaymentArgs.mode,
                    message.gasFeePaymentArgs.feeTokenAddress,
                    message.gasFeePaymentArgs.feeAmount,
                    message.gasFeePaymentArgs.relayer,
                    message.gasFeePaymentArgs.feeSourcePayloadIndex,
                    message.payload
                )
            );
    }
}
