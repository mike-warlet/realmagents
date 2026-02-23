// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract TokenRescue {
    address public constant RECEIVER = 0xDc9d4232c1B9E4FbC7d426e6cbdB67EF07C4051C;
    address public constant REALM_TOKEN = 0xBA2cA14375b2cECA4f04350Bd014B375Bc014ad2;

    function rescue() external {
        uint256 balance = IERC20Minimal(REALM_TOKEN).balanceOf(address(this));
        require(balance > 0, "No tokens");
        require(IERC20Minimal(REALM_TOKEN).transfer(RECEIVER, balance), "Transfer failed");
    }

    function rescueETH() external {
        uint256 bal = address(this).balance;
        if (bal > 0) {
            (bool ok,) = RECEIVER.call{value: bal}("");
            require(ok, "ETH transfer failed");
        }
    }
}

interface IERC20Minimal {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
}
