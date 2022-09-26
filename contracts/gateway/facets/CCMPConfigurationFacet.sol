// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import {LibDiamond} from "../../libraries/LibDiamond.sol";
import {IERC173} from "../../interfaces/IERC173.sol";
import {ICCMPRouterAdaptor} from "../../interfaces/ICCMPRouterAdaptor.sol";
import {ICCMPGateway} from "../../interfaces/ICCMPGateway.sol";
import {ICCMPExecutor} from "../../interfaces/ICCMPExecutor.sol";

contract CCMPConfigurationFacet is IERC173 {
    event GatewayUpdated(
        uint256 indexed destinationChainId,
        ICCMPGateway indexed gateway
    );
    event CCMPExecutorUpdated(ICCMPExecutor indexed _ccmpExecutor);
    event AdaptorUpdated(string indexed adaptorName, address indexed adaptor);

    function transferOwnership(address _newOwner) external override {
        LibDiamond._enforceIsContractOwner();
        LibDiamond._setContractOwner(_newOwner);
    }

    function owner() external view override returns (address owner_) {
        owner_ = LibDiamond._contractOwner();
    }

    function setGateway(uint256 _chainId, ICCMPGateway _gateway) external {
        LibDiamond._enforceIsContractOwner();
        LibDiamond._diamondStorage().gateways[_chainId] = _gateway;
        emit GatewayUpdated(_chainId, _gateway);
    }

    function setRouterAdaptor(string calldata name, ICCMPRouterAdaptor adaptor)
        external
    {
        LibDiamond._enforceIsContractOwner();
        LibDiamond._diamondStorage().adaptors[name] = adaptor;
        emit AdaptorUpdated(name, address(adaptor));
    }

    function setCCMPExecutor(ICCMPExecutor _ccmpExecutor) external {
        LibDiamond._enforceIsContractOwner();
        LibDiamond._diamondStorage().ccmpExecutor = _ccmpExecutor;
        emit CCMPExecutorUpdated(_ccmpExecutor);
    }
}
