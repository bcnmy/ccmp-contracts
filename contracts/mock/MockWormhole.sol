// contracts/Messages.sol
// SPDX-License-Identifier: Apache 2

pragma solidity ^0.8.0;

import "../structures/Wormhole.sol";

contract MockWormhole is Structs {
    event MessagePublished(uint32, bytes, uint8);

    function publishMessage(
        uint32 nonce,
        bytes memory payload,
        uint8 consistencyLevel
    ) external payable returns (uint64 sequence) {
        emit MessagePublished(nonce, payload, consistencyLevel);
        return 0;
    }

    function parseAndVerifyVM(bytes calldata encodedVM)
        external
        pure
        returns (
            Structs.VM memory vm,
            bool valid,
            string memory reason
        )
    {
        vm.payload = encodedVM;
        return (vm, true, "");
    }
}
