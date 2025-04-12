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
    
    // Default fee rate (0 = 0%)
    uint256 public defaultFeeRate = 0;
    
    // Authorized routers that can call special functions
    mapping(address => bool) public authorizedRouters;
    
    // Events
    event PoolCreated(address indexed token0, address indexed token1, address pool, uint length, uint256 feeRate);
    event RouterAuthorized(address indexed router, bool status);
    event DefaultFeeRateUpdated(uint256 newDefaultFeeRate);
    
    constructor() {
        feeAdmin = msg.sender;
    }
    
    // Create a new liquidity pool with default fee rate
    function createPool(address tokenA, address tokenB) public returns (address pool) {
        return createPoolWithFee(tokenA, tokenB, defaultFeeRate);
    }
    
    // Create a new liquidity pool with specified fee rate
    function createPoolWithFee(address tokenA, address tokenB, uint256 feeRate) public returns (address pool) {
        require(tokenA != tokenB, "IDENTICAL_ADDRESSES");
        
        // Sort token addresses to ensure consistent mapping
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        
        require(token0 != address(0), "ZERO_ADDRESS");
        require(getPool[token0][token1] == address(0), "POOL_EXISTS");
        require(feeRate <= 10000, "Fee rate cannot exceed 100%");
        
        // Deploy a new pool contract with the specified fee rate
        pool = address(new Pool(token0, token1, feeRate));
        
        // Store the pool address
        getPool[token0][token1] = pool;
        allPools.push(pool);
        
        emit PoolCreated(token0, token1, pool, allPools.length, feeRate);
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
    
    // Set new default fee rate for future pools
    function setDefaultFeeRate(uint256 _defaultFeeRate) external {
        require(msg.sender == feeAdmin, "Only fee admin can update default fee rate");
        require(_defaultFeeRate <= 10000, "Fee rate cannot exceed 100%");
        defaultFeeRate = _defaultFeeRate;
        emit DefaultFeeRateUpdated(_defaultFeeRate);
    }
    
    // Helper function to find a pool by token pair
    function findPool(address tokenA, address tokenB) public view returns (address) {
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        return getPool[token0][token1];
    }
    
    // Authorize or deauthorize a router
    function setRouterAuthorization(address router, bool authorized) external {
        require(msg.sender == feeAdmin, "Only fee admin can authorize routers");
        require(router != address(0), "Router cannot be zero address");
        
        authorizedRouters[router] = authorized;
        emit RouterAuthorized(router, authorized);
    }
    
    // Check if a router is authorized
    function isAuthorizedRouter(address router) external view returns (bool) {
        return authorizedRouters[router];
    }
} 