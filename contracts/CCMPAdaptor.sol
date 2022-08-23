// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./interfaces/ICCMPRouterAdaptor.sol";
import "./interfaces/IAxelarGateway.sol";
import "./interfaces/ICCMPGateway.sol";
import "./metatx/ERC2771ContextUpgradeable.sol";
import "./structures/CrossChainMessage.sol";
import "./security/Pausable.sol";

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/StringsUpgradeable.sol";

error CallerIsNotCCMPGateway();

abstract contract CCMPAdaptor is
    Initializable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    ERC2771ContextUpgradeable,
    Pausable,
    ICCMPRouterAdaptor
{
    ICCMPGateway public ccmpGateway;

    modifier onlyCCMPGateway() {
        if (_msgSender() != address(ccmpGateway)) {
            revert CallerIsNotCCMPGateway();
        }
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function __Adaptor_init(
        address _trustedForwarder,
        address _ccmpGateway,
        address _pauser
    ) internal onlyInitializing {
        __Ownable_init();
        __ERC2771Context_init(_trustedForwarder);
        __Pausable_init(_pauser);
        ccmpGateway = ICCMPGateway(_ccmpGateway);
    }

    function setCCMPGateway(ICCMPGateway _ccmpGateway)
        external
        whenNotPaused
        onlyOwner
    {
        ccmpGateway = _ccmpGateway;
    }

    function _msgSender()
        internal
        view
        virtual
        override(ContextUpgradeable, ERC2771ContextUpgradeable)
        returns (address sender)
    {
        return ERC2771ContextUpgradeable._msgSender();
    }

    function _msgData()
        internal
        view
        virtual
        override(ContextUpgradeable, ERC2771ContextUpgradeable)
        returns (bytes calldata)
    {
        return ERC2771ContextUpgradeable._msgData();
    }
}
