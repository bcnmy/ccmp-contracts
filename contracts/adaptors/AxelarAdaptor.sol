// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "../interfaces/IAxelarGateway.sol";
import "../structures/CrossChainMessage.sol";

import "./base/CCMPAdaptorBase.sol";

error AxelarAdaptorSourceChainNotSupported(uint256 chainId);
error AxelarAdaptorDestinationChainNotSupported(uint256 chainId);
error NotApprovedByGateway();
error InvalidSender();

/// @title Axelar Adaptor
/// @author ankur@biconomy.io
/// @notice Adaptor for the Axelar protocol into the CCMP System
contract AxelarAdaptor is CCMPAdaptorBase {
    using CCMPMessageUtils for CCMPMessage;

    mapping(uint256 => string) public chainIdToName;
    mapping(string => string) public chainNameToAdaptorAddressChecksummed;
    IAxelarGateway public axelarGateway;

    // Whether a message has been verified or not
    mapping(bytes32 => bool) public messageHashVerified;

    event AxelarGatewayUpdated(address indexed newAxelarGateway);
    event ChainNameUpdated(
        uint256 indexed destinationChainId,
        string indexed destinationChainName
    );
    event AxelarAdaptorAddressChecksummedUpdated(
        string indexed chainName,
        string indexed newAxelarAdaptorAddressChecksummed
    );
    event AxelarMessageRouted();
    event AxelarMessageVerified(
        bytes32 commandId,
        string indexed sourceChain,
        string indexed sourceAddress,
        bytes payload,
        bytes32 indexed messageHash
    );

    constructor(
        address _axelarGateway,
        address _ccmpGateway,
        address _pauser
    ) CCMPAdaptorBase(_ccmpGateway, _pauser) {
        axelarGateway = IAxelarGateway(_axelarGateway);

        // Setup Mainnet Chain ID to Names
        chainIdToName[1313161554] = "aurora";
        chainIdToName[43114] = "Avalanche";
        chainIdToName[56] = "binance";
        chainIdToName[1] = "Ethereum";
        chainIdToName[250] = "Fantom";
        chainIdToName[1284] = "Moonbeam";
        chainIdToName[137] = "Polygon";

        // Setup Testnet Chain ID to Names
        chainIdToName[1313161555] = "aurora";
        chainIdToName[43113] = "Avalanche";
        chainIdToName[97] = "binance";
        chainIdToName[3] = "Ethereum";
        chainIdToName[4002] = "Fantom";
        chainIdToName[1287] = "Moonbeam";
        chainIdToName[80001] = "Polygon";
    }

    function updateAxelarGateway(IAxelarGateway _axelarGateway)
        external
        whenNotPaused
        onlyOwner
    {
        axelarGateway = _axelarGateway;
        emit AxelarGatewayUpdated(address(_axelarGateway));
    }

    function routePayload(CCMPMessage calldata _message, bytes calldata)
        external
        nonReentrant
        whenNotPaused
        onlyCCMPGateway
    {
        string memory destinationChainName = chainIdToName[
            _message.destinationChainId
        ];
        string
            memory destinationRouterAddress = chainNameToAdaptorAddressChecksummed[
                destinationChainName
            ];

        if (
            bytes(destinationChainName).length == 0 ||
            bytes(destinationRouterAddress).length == 0
        ) {
            revert AxelarAdaptorDestinationChainNotSupported(
                _message.destinationChainId
            );
        }

        axelarGateway.callContract(
            destinationChainName,
            destinationRouterAddress,
            abi.encode(_message.hash())
        );

        emit AxelarMessageRouted();
    }

    function verifyPayload(CCMPMessage calldata _ccmpMessage, bytes calldata)
        external
        view
        whenNotPaused
        returns (bool, string memory)
    {
        return
            messageHashVerified[_ccmpMessage.hash()]
                ? (true, "")
                : (false, "ERR__MESSAGE_NOT_VERIFIED");
    }

    function execute(
        bytes32 commandId,
        string calldata sourceChain,
        string calldata sourceAddress,
        bytes calldata payload
    ) external {
        bytes32 payloadHash = keccak256(payload);

        if (
            !axelarGateway.validateContractCall(
                commandId,
                sourceChain,
                sourceAddress,
                payloadHash
            )
        ) {
            revert NotApprovedByGateway();
        }

        if (
            keccak256(abi.encodePacked(sourceAddress)) !=
            keccak256(
                abi.encodePacked(
                    chainNameToAdaptorAddressChecksummed[sourceChain]
                )
            )
        ) {
            revert InvalidSender();
        }

        bytes32 ccmpMessageHash = abi.decode(payload, (bytes32));
        messageHashVerified[ccmpMessageHash] = true;

        emit AxelarMessageVerified(
            commandId,
            sourceChain,
            sourceAddress,
            payload,
            ccmpMessageHash
        );
    }

    function setChainIdToName(uint256 _chainId, string calldata _chainName)
        external
        whenNotPaused
        onlyOwner
    {
        chainIdToName[_chainId] = _chainName;
        emit ChainNameUpdated(_chainId, _chainName);
    }

    function setAxelarAdaptorAddressChecksummed(
        string calldata _chainName,
        string calldata _adaptorAddressChecksummed
    ) external whenNotPaused onlyOwner {
        chainNameToAdaptorAddressChecksummed[
            _chainName
        ] = _adaptorAddressChecksummed;
        emit AxelarAdaptorAddressChecksummedUpdated(
            _chainName,
            _adaptorAddressChecksummed
        );
    }
}
