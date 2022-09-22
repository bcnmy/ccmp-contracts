// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

error InvalidSender();

/// @title CCMPExecutor
/// @author ankur@biconomy.io
/// @notice Handles message execution
contract CCMPExecutor is Initializable, OwnableUpgradeable {
    address public _ccmpGateway;

    event GatewayUpgraded(address indexed newGateway);

    modifier onlyGateway() {
        if (msg.sender != _ccmpGateway) {
            revert InvalidSender();
        }
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address __ccmpGateway) external initializer {
        _ccmpGateway = __ccmpGateway;
    }

    /// @notice Handles Execution of the received message from CCMP Gateway on destination chain.
    function execute(address _to, bytes calldata _calldata)
        external
        onlyGateway
        returns (bool success, bytes memory returndata)
    {
        (success, returndata) = _to.call{gas: gasleft()}(_calldata);
    }

    function updateCCMPGateway(address _newCCMPGateway) external onlyOwner {
        _ccmpGateway = _newCCMPGateway;
        emit GatewayUpgraded(_newCCMPGateway);
    }
}
