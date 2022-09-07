// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "./interfaces/IAxelarGateway.sol";
import "./structures/CrossChainMessage.sol";

import "./CCMPAdaptor.sol";

error AxelarAdaptorSourceChainNotSupported(uint256 chainId);
error AxelarAdaptorDestinationChainNotSupported(uint256 chainId);

contract AxelarAdaptor is CCMPAdaptor {
    using CCMPMessageUtils for CCMPMessage;

    mapping(uint256 => string) public destinationChainIdToName;
    IAxelarGateway public axelarGateway;

    event AxelarGatewayUpdated(address indexed newAxelarGateway);
    event DestinationChainNameUpdated(
        uint256 indexed destinationChainId,
        string indexed destinationChainName
    );

    function initialize(
        address _axelarGateway,
        address _ccmpGateway,
        address _trustedForwader,
        address _pauser
    ) public initializer {
        __Adaptor_init(_trustedForwader, _ccmpGateway, _pauser);
        axelarGateway = IAxelarGateway(_axelarGateway);

        // Setup Mainnet Chain ID to Names
        destinationChainIdToName[1313161554] = "aurora";
        destinationChainIdToName[43114] = "Avalanche";
        destinationChainIdToName[56] = "binance";
        destinationChainIdToName[1] = "Ethereum";
        destinationChainIdToName[250] = "Fantom";
        destinationChainIdToName[1284] = "Moonbeam";
        destinationChainIdToName[137] = "Polygon";

        // Setup Testnet Chain ID to Names
        destinationChainIdToName[1313161555] = "aurora";
        destinationChainIdToName[43113] = "Avalanche";
        destinationChainIdToName[97] = "binance";
        destinationChainIdToName[3] = "Ethereum";
        destinationChainIdToName[4002] = "Fantom";
        destinationChainIdToName[1287] = "Moonbeam";
        destinationChainIdToName[80001] = "Polygon";
    }

    function updateAxelarGateway(IAxelarGateway _axelarGateway)
        external
        whenNotPaused
        onlyOwner
    {
        axelarGateway = _axelarGateway;
        emit AxelarGatewayUpdated(address(_axelarGateway));
    }

    function routePayload(
        CCMPMessage calldata _message,
        bytes calldata _routerArgs
    ) external nonReentrant whenNotPaused onlyCCMPGateway {
        string memory destinationChainName = destinationChainIdToName[
            _message.destinationChainId
        ];
        string memory destinationRouterAddress = abi.decode(
            _routerArgs,
            (string)
        );
        if (bytes(destinationChainName).length == 0) {
            revert AxelarAdaptorDestinationChainNotSupported(
                _message.destinationChainId
            );
        }

        axelarGateway.callContract(
            destinationChainName,
            destinationRouterAddress,
            abi.encode(_message.hash())
        );
    }

    function verifyPayload(
        CCMPMessage calldata _ccmpMessage,
        bytes calldata _verificationData
    ) external whenNotPaused nonReentrant returns (bool, string memory) {
        bytes32 payloadHash = keccak256(abi.encode(_ccmpMessage.hash()));
        (bytes32 commandId, string memory sourceAdapterAddressChecksummed) = abi
            .decode(_verificationData, (bytes32, string));
        string memory sourceChainName = destinationChainIdToName[
            _ccmpMessage.sourceChainId
        ];
        if (bytes(sourceChainName).length == 0) {
            revert AxelarAdaptorSourceChainNotSupported(
                _ccmpMessage.sourceChainId
            );
        }
        return (
            axelarGateway.validateContractCall(
                commandId,
                sourceChainName,
                sourceAdapterAddressChecksummed,
                payloadHash
            ),
            ""
        );
    }

    function setDestinationChainIdToName(
        uint256 _destinationChainId,
        string calldata _destinationChainName
    ) external whenNotPaused onlyOwner {
        destinationChainIdToName[_destinationChainId] = _destinationChainName;
        emit DestinationChainNameUpdated(
            _destinationChainId,
            _destinationChainName
        );
    }
}
