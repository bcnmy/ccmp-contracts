// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "hardhat/console.sol";

contract MockAxelarGateway {
    mapping(bytes32 => bool) validated;

    event ContractCalled(
        string destinationChain,
        string destinationAddress,
        bytes payload
    );

    function validate(bytes32 payloadHash) external {
        validated[payloadHash] = true;
    }

    function validateContractCall(
        bytes32, //commandId,
        string calldata, // sourceChain,
        string calldata, // sourceAddress,
        bytes32 payloadHash
    ) external view returns (bool) {
        return validated[payloadHash];
    }

    function callContract(
        string calldata destinationChain,
        string calldata destinationAddress,
        bytes calldata payload
    ) external {
        emit ContractCalled(destinationChain, destinationAddress, payload);
    }
}
