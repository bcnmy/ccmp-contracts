// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./structures/CrossChainMessage.sol";
import "./security/Pausable.sol";
import "./interfaces/ICCMPExecutor.sol";

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721ReceiverUpgradeable.sol";

error ExternalCallFailed(
    uint256 index,
    address contractAddress,
    bytes returndata
);
error UnsupportedOperation(uint256 index, CCMPOperation operation);
error UnsupportedContract(uint256 index, address contractAddress);

contract CCMPExecutor is
    Initializable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    Pausable,
    IERC721ReceiverUpgradeable,
    ICCMPExecutor
{
    mapping(address => bool) public unsupportedAddress;

    event UnsupportedContractUpdated(
        address indexed contractAddress,
        bool indexed isUnsupported
    );
    event CCMPPayloadExecuted(
        uint256 indexed index,
        address indexed contractAddress,
        bytes returndata
    );

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _pauser) public initializer {
        __Ownable_init();
        __Pausable_init(_pauser);
    }

    function executeCCMPMessage(CCMPMessage calldata _message)
        external
        whenNotPaused
    {
        uint256 length = _message.payload.length;
        for (uint256 i = 0; i < length; ) {
            if (_message.payload[i].operation != CCMPOperation.ContractCall) {
                revert UnsupportedOperation(i, _message.payload[i].operation);
            }

            (address contractAddress, bytes memory _calldata) = abi.decode(
                _message.payload[i].data,
                (address, bytes)
            );
            if (unsupportedAddress[contractAddress]) {
                revert UnsupportedContract(i, contractAddress);
            }

            (bool success, bytes memory returndata) = contractAddress.call{
                gas: gasleft()
            }(_calldata);

            if (!success) {
                revert ExternalCallFailed(i, contractAddress, returndata);
            }

            emit CCMPPayloadExecuted(i, contractAddress, returndata);

            unchecked {
                ++i;
            }
        }
    }

    function setAddressUnsupportedState(address _address, bool _state)
        external
        whenNotPaused
        onlyOwner
    {
        unsupportedAddress[_address] = _state;
        emit UnsupportedContractUpdated(_address, _state);
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure returns (bytes4) {
        return IERC721ReceiverUpgradeable.onERC721Received.selector;
    }
}
