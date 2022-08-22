// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../structures/CrossChainMessage.sol";

interface ICCMPExecutor {
    function executeCCMPMessage(CCMPMessage calldata _message) external;
}
