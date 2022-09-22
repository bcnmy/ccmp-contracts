// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./CCMPReceiverBase.sol";

abstract contract CCMPReceiverUpgradeable is CCMPReceiverBase, Initializable {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function __CCMPReceiver_init(address __ccmpExecutor)
        internal
        onlyInitializing
    {
        _setCCMPExecutor(__ccmpExecutor);
    }
}
