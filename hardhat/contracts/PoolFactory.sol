// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Pool.sol";

contract PoolFactory {
    // Array to keep track of all created pools
    address[] public allPools;
    
    // Mapping from token pair to pool address
    // We'll use the token addresses (sorted) as keys
    mapping(address => mapping(address => address)) public getPool;
    
    // Fee admin for all pools
    address public feeAdmin;
    
    // Events
    event PoolCreated(address indexed token0, address indexed token1, address pool, uint length);
    
    constructor() {
        feeAdmin = msg.sender;
    }
    
    // Create a new liquidity pool
    function createPool(address tokenA, address tokenB) public returns (address pool) {
        require(tokenA != tokenB, "IDENTICAL_ADDRESSES");
        
        // Sort token addresses to ensure consistent mapping
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        
        require(token0 != address(0), "ZERO_ADDRESS");
        require(getPool[token0][token1] == address(0), "POOL_EXISTS");
        
        // Deploy a new pool contract
        pool = address(new Pool(token0, token1));
        
        // Store the pool address
        getPool[token0][token1] = pool;
        allPools.push(pool);
        
        emit PoolCreated(token0, token1, pool, allPools.length);
        return pool;
    }
    
    // Get all pools
    function getAllPools() external view returns (address[] memory) {
        return allPools;
    }
    
    // Set new fee admin for all future pools
    function setFeeAdmin(address _newAdmin) external {
        require(msg.sender == feeAdmin, "Only fee admin can transfer role");
        require(_newAdmin != address(0), "New admin cannot be zero address");
        feeAdmin = _newAdmin;
    }
    
    // Helper function to find a pool by token pair
    function findPool(address tokenA, address tokenB) public view returns (address) {
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        return getPool[token0][token1];
    }
} 