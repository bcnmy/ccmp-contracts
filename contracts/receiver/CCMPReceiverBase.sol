// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

error InvalidOrigin();

interface ILiquidityPool {
    function chainIdToLiquidityPoolAddress(uint256 chainId)
        external
        view
        returns (address);
}

abstract contract CCMPReceiverBase {
    event LiquidityPoolUpdated(address indexed);
    event CCMPExecutorUpdated(address indexed);

    address internal _ccmpExecutor;
    ILiquidityPool internal _liquidityPool;

    function _setCCMPExecutor(address _newCCMPExecutor) internal {
        _ccmpExecutor = _newCCMPExecutor;
        emit CCMPExecutorUpdated(_newCCMPExecutor);
    }

    function _setLiquidityPool(ILiquidityPool _newLiquidityPool) internal {
        _liquidityPool = _newLiquidityPool;
        emit LiquidityPoolUpdated(address(_newLiquidityPool));
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

    function _hyphenMsgOrigin()
        internal
        view
        virtual
        returns (address sourceChainSender, uint256 sourceChainId)
    {
        // Check that message is coming from the Hyphen Liquidity Pool
        (sourceChainSender, sourceChainId) = _ccmpMsgOrigin();
        if (
            _liquidityPool.chainIdToLiquidityPoolAddress(sourceChainId) !=
            sourceChainSender
        ) {
            revert InvalidOrigin();
        }

        /*
         * Calldata Map:
         * |-------?? bytes--------|------20 bytes------|--------32 bytes-------|--------------20 bytes------------|
         * |---Original Calldata---|----Actual Sender---|-----Source Chain Id---|---Source Chain Sender=Hyphen-----|
         */
        assembly {
            sourceChainSender := shr(96, calldataload(sub(calldatasize(), 72)))
        }
    }
}
