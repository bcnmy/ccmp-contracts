// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

error InvalidOrigin();

abstract contract CCMPReceiverBase {
    event CCMPExecutor(address indexed);

    address private _ccmpExecutor;

    function _setCCMPExecutor(address _newCCMPExecutor) internal {
        _ccmpExecutor = _newCCMPExecutor;
        emit CCMPExecutor(_newCCMPExecutor);
    }

    function _ccmpMsgOrigin()
        internal
        view
        virtual
        returns (address sourceChainSender, uint256 sourceChainId)
    {
        if (msg.sender != _ccmpExecutor) {
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
