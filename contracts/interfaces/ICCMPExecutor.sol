// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

interface ICCMPExecutor {
    function execute(address _to, bytes calldata _calldata)
        external
        returns (bool success, bytes memory returndata);
}
