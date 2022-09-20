// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

error InvalidOrigin();

abstract contract CCMPReceiverBase {
    event CCMPGatewayUpdated(address indexed newCCMPGateway);

    address private _ccmpGateway;

    function _setCCMPGateway(address _newCCMPGateway) internal {
        _ccmpGateway = _newCCMPGateway;
        emit CCMPGatewayUpdated(_newCCMPGateway);
    }

    function _ccmpMsgOrigin()
        internal
        view
        virtual
        returns (address sourceChainSender, uint256 sourceChainId)
    {
        if (msg.sender != _ccmpGateway) {
            revert InvalidOrigin();
        }

        /*
         * Calldata Map:
         * |-------?? bytes--------|------32 bytes-------|---------20 bytes -------|
         * |---Original Calldata---|---Source Chain Id---|---Source Chain Sender---|
         */
        assembly {
            sourceChainSender := shr(96, calldataload(sub(calldatasize(), 20)))
            sourceChainId := calldataload(sub(calldatasize(), 52))
        }
    }
}
