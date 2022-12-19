// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import {LibDiamond} from "../../libraries/LibDiamond.sol";
import {IERC173} from "../../interfaces/IERC173.sol";
import {IERC165} from "../../interfaces/IERC165.sol";
import {IDiamondCut} from "../../interfaces/IDiamondCut.sol";
import {IDiamondLoupe} from "../../interfaces/IDiamondLoupe.sol";
import {ICCMPRouterAdaptor} from "../../interfaces/ICCMPRouterAdaptor.sol";
import {ICCMPGateway, ICCMPConfiguration} from "../../interfaces/ICCMPGateway.sol";
import {ICCMPExecutor} from "../../interfaces/ICCMPExecutor.sol";

contract CCMPConfigurationFacet is IERC173, ICCMPConfiguration {
    function transferOwnership(
        address _newOwner
    ) external override(IERC173, ICCMPConfiguration) {
        LibDiamond._enforceIsContractOwner();
        LibDiamond._setContractOwner(_newOwner);
    }

    function owner()
        external
        view
        override(IERC173, ICCMPConfiguration)
        returns (address owner_)
    {
        owner_ = LibDiamond._contractOwner();
    }

    function setGatewayBatch(
        uint256[] calldata _chainId,
        ICCMPGateway[] calldata _gateway
    ) external {
        LibDiamond._enforceIsContractOwner();
        if (_chainId.length != _gateway.length) {
            revert ParameterArrayLengthMismatch();
        }
        uint256 length = _chainId.length;
        unchecked {
            for (uint256 i; i < length; ++i) {
                LibDiamond._diamondStorage().gateways[_chainId[i]] = _gateway[
                    i
                ];
                emit GatewayUpdated(_chainId[i], _gateway[i]);
            }
        }
    }

    function setGateway(uint256 _chainId, ICCMPGateway _gateway) external {
        LibDiamond._enforceIsContractOwner();
        LibDiamond._diamondStorage().gateways[_chainId] = _gateway;
        emit GatewayUpdated(_chainId, _gateway);
    }

    function gateway(
        uint256 _chainId
    ) external view returns (ICCMPGateway gateway_) {
        gateway_ = LibDiamond._diamondStorage().gateways[_chainId];
    }

    function setRouterAdaptorBatch(
        string[] calldata names,
        ICCMPRouterAdaptor[] calldata adaptors
    ) external {
        LibDiamond._enforceIsContractOwner();
        if (names.length != adaptors.length) {
            revert ParameterArrayLengthMismatch();
        }
        uint256 length = names.length;
        unchecked {
            for (uint256 i; i < length; ++i) {
                LibDiamond._diamondStorage().adaptors[names[i]] = adaptors[i];
                emit AdaptorUpdated(names[i], address(adaptors[i]));
            }
        }
    }

    function setRouterAdaptor(
        string calldata name,
        ICCMPRouterAdaptor adaptor
    ) external {
        LibDiamond._enforceIsContractOwner();
        LibDiamond._diamondStorage().adaptors[name] = adaptor;
        emit AdaptorUpdated(name, address(adaptor));
    }

    function routerAdaptor(
        string calldata name
    ) external view returns (ICCMPRouterAdaptor adaptor) {
        adaptor = LibDiamond._diamondStorage().adaptors[name];
    }

    function setCCMPExecutor(ICCMPExecutor _ccmpExecutor) external {
        LibDiamond._enforceIsContractOwner();
        LibDiamond._diamondStorage().ccmpExecutor = _ccmpExecutor;
        emit CCMPExecutorUpdated(_ccmpExecutor);
    }

    function ccmpExecutor() external view returns (ICCMPExecutor executor) {
        executor = LibDiamond._diamondStorage().ccmpExecutor;
    }

    function pauser() external view returns (address pauser_) {
        pauser_ = LibDiamond._diamondStorage().pauser;
    }

    function setPauser(address _pauser) external {
        LibDiamond._enforceIsContractOwner();
        LibDiamond._diamondStorage().pauser = _pauser;
        emit PauserUpdated(_pauser);
    }

    function pause() external {
        LibDiamond._enforceIsContractPauser();
        LibDiamond._pauseContract();
        emit ContractPaused();
    }

    function unpause() external {
        LibDiamond._enforceIsContractPauser();
        LibDiamond._unpauseContract();
        emit ContractUnpaused();
    }
}
