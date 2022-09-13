// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IHyphenLiquidityPool {
    function depositNativeFromCCMP(address receiver, uint256 toChainId)
        external
        payable
        returns (uint256);

    function depositErc20FromCCMP(
        uint256 toChainId,
        address tokenAddress,
        address receiver,
        uint256 amount
    ) external returns (uint256);

    function sendFundsToUserFromCCMP(
        address tokenAddress,
        uint256 amount,
        address payable receiver,
        bytes calldata depositHash,
        uint256 fromChainId
    ) external;
}
