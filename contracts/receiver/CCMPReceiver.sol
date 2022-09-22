// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "./CCMPReceiverBase.sol";

abstract contract CCMPReceiver is CCMPReceiverBase {
    constructor(address _ccmpExecutor) {
        _setCCMPExecutor(_ccmpExecutor);
    }
}
