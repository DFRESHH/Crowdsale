//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./Token.sol";

contract Crowdsale {
    address owner;
    Token public token;
    uint256 public price;
    uint256 public maxTokens;
    uint256 public tokensSold;
    uint256 public saleOpenTime;
    
    // Add mapping inside contract
    mapping(address => bool) public isWhitelisted;

    event Buy(uint256 amount, address buyer);
    event Finalize(uint256 tokensSold, uint256 ethRaised);
    event AddedToWhitelist(address indexed account);    

    // Add modifier inside contract
    modifier onlyWhitelisted() {
        require(isWhitelisted[msg.sender], "Address is not whitelisted");
        _;
    }

    modifier isSaleOpen() {
        require(block.timestamp >= saleOpenTime, "Sale has not opened yet");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Caller is not the owner");
        _;
    }

    constructor(
        Token _token,
        uint256 _price,
        uint256 _maxTokens,
        uint256 _saleOpenTime
    ) {
        owner = msg.sender;
        token = _token;
        price = _price;
        maxTokens = _maxTokens;
        saleOpenTime = _saleOpenTime;
    }

    receive() external payable onlyWhitelisted isSaleOpen {
        uint256 amount = msg.value / price;
        buyTokens(amount * 1e18);
    }

    function addToWhitelist(address _address) external onlyOwner {
        require(_address != address(0), "Cannot whitelist zero address");
        isWhitelisted[_address] = true;
        emit AddedToWhitelist(_address);
    }

    function buyTokens(uint256 _amount) public payable onlyWhitelisted isSaleOpen {
        require(msg.value == (_amount / 1e18) * price);
        require(token.balanceOf(address(this)) >= _amount);
        require(token.transfer(msg.sender, _amount));

        tokensSold += _amount;

        emit Buy(_amount, msg.sender);
    }

    function setPrice(uint256 _price) public onlyOwner {
        price = _price;
    }

    function finalize() public onlyOwner {
        require(token.transfer(owner, token.balanceOf(address(this))));

        uint256 value = address(this).balance;
        (bool sent, ) = owner.call{value: value}("");
        require(sent);

        emit Finalize(tokensSold, value);
    }
}
