// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract VestToken is ERC20 {
    constructor() ERC20("VestToken", "VST") {}

    function mint(address to, uint256 amount) external {
        require(amount > 0, "Amount > 0");
        require(to != address(0), "Addresss != address(0).");
        _mint(to, amount);
    }
    
}