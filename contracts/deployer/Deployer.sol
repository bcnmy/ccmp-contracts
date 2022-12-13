//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./Create3.sol";

contract Deployer {
    event ContractDeployed(address contractAddress);

    function deploy(bytes32 salt, bytes calldata creationCode) external {
        address deployedContract = Create3.create3(salt, creationCode);
        emit ContractDeployed(deployedContract);
    }
}
