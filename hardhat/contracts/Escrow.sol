// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Escrow is Ownable {
    event DealCreated(address indexed buyer, address indexed seller, address token, uint256 amount, bytes32 dealId, uint256 productId);
    event DealReleased(address indexed seller, address token, uint256 amount, bytes32 dealId);

    struct Deal {
        address buyer;
        address seller;
        address token;
        uint256 amount;
        bool released;
        uint256 productId;
    }

    mapping(bytes32 => Deal) public deals;

    constructor(address initialOwner) Ownable(initialOwner) {}

    function hold(address seller, address token, uint256 amount, uint256 productId) external returns (bytes32) {
        require(seller != address(0), "Invalid seller");
        require(amount > 0, "Amount must be positive");

        IERC20(token).transferFrom(msg.sender, address(this), amount);

        bytes32 dealId = keccak256(abi.encodePacked(msg.sender, seller, token, amount, block.timestamp, block.number));
        deals[dealId] = Deal(msg.sender, seller, token, amount, false, productId);

        emit DealCreated(msg.sender, seller, token, amount, dealId, productId);
        return dealId;
    }

    function releaseToSeller(bytes32 dealId) external onlyOwner {
        Deal storage deal = deals[dealId];
        require(!deal.released, "Already released");

        deal.released = true;
        IERC20(deal.token).transfer(deal.seller, deal.amount);

        emit DealReleased(deal.seller, deal.token, deal.amount, dealId);
    }
}
