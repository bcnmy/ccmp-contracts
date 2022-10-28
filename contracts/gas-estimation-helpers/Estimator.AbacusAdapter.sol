// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "../adaptors/AbacusAdapter.sol";

contract EstimationHyperlaneAdapter is AbacusAdapter {
    using CCMPMessageUtils for CCMPMessage;

    constructor(
        address _ccmpGateway,
        address _pauser,
        address _abacusConnectionManager,
        address _interchainGasPaymaster
    )
        AbacusAdapter(
            _ccmpGateway,
            _pauser,
            _abacusConnectionManager,
            _interchainGasPaymaster
        )
    {}

    /// @notice Dummy function to estimate gas for Abacus.routeMessage, only to be used for simulation purposes
    /// @param _ccmpMessage The message to be verified
    function verifyPayload(CCMPMessage calldata _ccmpMessage, bytes calldata)
        external
        view
        virtual
        override
        whenNotPaused
        returns (bool, string memory)
    {
        return
            messageHashVerified[_ccmpMessage.hash()]
                ? (true, "") // HeHe
                : (true, "ERR__MESSAGE_NOT_VERIFIED");
    }
}
