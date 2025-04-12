"use client";

import React, { useState, useEffect } from "react";
import { 
  Container, 
  Box, 
  Typography, 
  TextField, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  Select,
  Button, 
  CircularProgress, 
  Paper,
  Snackbar, 
  Alert,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from "@mui/material";
import { ethers } from "ethers";
import { getAllPools, addresses } from "@/utils/token-address";
import abis from "@/utils/deployed-abis.json";
import { useRouter } from "next/navigation";

export default function AddLiquidityPage() {
  const router = useRouter();
  const [pools, setPools] = useState([]);
  const [selectedPool, setSelectedPool] = useState("");
  const [token1Amount, setToken1Amount] = useState("");
  const [token2Amount, setToken2Amount] = useState("");
  const [loading, setLoading] = useState(false);
  const [txStatus, setTxStatus] = useState({ success: false, message: "", open: false });
  const [isApproving, setIsApproving] = useState(false);
  const [poolReserves, setPoolReserves] = useState({ token0: "", token1: "", token0Reserve: "0", token1Reserve: "0" });
  const [lpTokenEstimate, setLpTokenEstimate] = useState({
    amount: "0",
    poolShare: "0",
    isCalculating: false
  });
  const [userLpInfo, setUserLpInfo] = useState({
    balance: "0",
    poolPercentage: "0",
    isLoading: false
  });
  const [isFirstTokenBase, setIsFirstTokenBase] = useState(true);
  const [allUserPositions, setAllUserPositions] = useState([]);
  const [isLoadingPositions, setIsLoadingPositions] = useState(false);

  // Load pools on component mount
  useEffect(() => {
    const allPools = getAllPools();
    setPools(allPools);
    
    // Fetch all user positions
    fetchAllUserPositions(allPools);
  }, []);

  // Effect to update the second token amount when the first token amount changes
  useEffect(() => {
    if (selectedPool && token1Amount && Number(token1Amount) > 0 && isFirstTokenBase) {
      calculateSecondTokenAmount(token1Amount);
    }
  }, [token1Amount, selectedPool, isFirstTokenBase]);

  // Effect to update the first token amount when the second token amount changes
  useEffect(() => {
    if (selectedPool && token2Amount && Number(token2Amount) > 0 && !isFirstTokenBase) {
      calculateFirstTokenAmount(token2Amount);
    }
  }, [token2Amount, selectedPool, isFirstTokenBase]);

  // Fetch all user's LP positions across all pools
  const fetchAllUserPositions = async (poolsList) => {
    try {
      setIsLoadingPositions(true);
      
      // Connect to provider and get user's address
      if (!window.ethereum) throw new Error("MetaMask is not installed");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const userAddress = accounts[0];
      
      const positions = [];
      
      // Loop through all pools and check user's LP balance in each
      for (const pool of poolsList) {
        try {
          const poolContract = new ethers.Contract(pool.address, abis.Pool, provider);
          
          // Get user's LP token balance
          const lpBalance = await poolContract.balanceOf(userAddress);
          
          // Skip if user has no LP tokens in this pool
          if (lpBalance <= 0) continue;
          
          // Get total supply of LP tokens
          const totalSupply = await poolContract.totalSupply();
          
          // Calculate user's percentage of the pool
          let poolPercentage = "0";
          if (totalSupply > 0 && lpBalance > 0) {
            poolPercentage = ((Number(lpBalance) / Number(totalSupply)) * 100).toFixed(2);
          }
          
          // Get pool token addresses and symbols
          const token0Address = await poolContract.token0();
          const token1Address = await poolContract.token1();
          
          // Get token symbols from addresses
          const token0Symbol = getTokenSymbolByAddress(token0Address);
          const token1Symbol = getTokenSymbolByAddress(token1Address);
          
          // Get reserves
          const [reserve0, reserve1] = await poolContract.getReserves();
          
          // Format reserves to human readable format
          const formattedReserve0 = ethers.formatEther(reserve0);
          const formattedReserve1 = ethers.formatEther(reserve1);
          
          // Calculate token amounts based on LP share
          const token0Amount = (parseFloat(formattedReserve0) * parseFloat(poolPercentage) / 100).toFixed(4);
          const token1Amount = (parseFloat(formattedReserve1) * parseFloat(poolPercentage) / 100).toFixed(4);
          
          // Calculate fees earned (estimated based on pool fee rate and volume)
          // This is just an approximation; in a real app, you would track this with events
          const feeRate = await poolContract.getFeeRate();
          const formattedFeeRate = parseFloat(feeRate) / 100; // Convert from basis points
          
          // Get pool trading volume (this would typically come from an indexer or API)
          // For this example, we'll use a placeholder based on pool address to simulate different volumes
          const dailyVolume = parseInt(pool.address.slice(-4), 16) % 1000; // Just a mock calculation
          
          // Estimate fee earned based on pool share and volume
          const dailyFees = (dailyVolume * formattedFeeRate * parseFloat(poolPercentage) / 100).toFixed(2);
          
          // Format LP balance to human readable format
          const formattedLpBalance = ethers.formatEther(lpBalance);
          
          positions.push({
            poolName: pool.name,
            poolAddress: pool.address,
            lpBalance: formattedLpBalance,
            poolPercentage,
            token0Symbol,
            token1Symbol,
            token0Amount,
            token1Amount,
            dailyFees,
            totalFees: (dailyFees * 30).toFixed(2), // Approx monthly fees
          });
        } catch (error) {
          console.error(`Error fetching position for pool ${pool.name}:`, error);
        }
      }
      
      setAllUserPositions(positions);
      setIsLoadingPositions(false);
    } catch (error) {
      console.error("Error fetching all user positions:", error);
      setIsLoadingPositions(false);
    }
  };
  
  // Helper function to get token symbol from address
  const getTokenSymbolByAddress = (address) => {
    for (const [symbol, tokenAddress] of Object.entries(addresses.tokens)) {
      if (tokenAddress.toLowerCase() === address.toLowerCase()) {
        return symbol;
      }
    }
    return "UNKNOWN";
  };

  const fetchPoolReserves = async (poolName) => {
    try {
      const pool = pools.find((p) => p.name === poolName);
      if (!pool) return;
      
      // Get token addresses from the pool name
      const [tokenA, tokenB] = poolName.split("/");
      const tokenAAddress = addresses.tokens[tokenA];
      const tokenBAddress = addresses.tokens[tokenB];
      
      // Connect to provider
      if (!window.ethereum) throw new Error("MetaMask is not installed");
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // Get pool contract
      const poolContract = new ethers.Contract(pool.address, abis.Pool, provider);
      
      // Get token order in the pool
      const token0Address = await poolContract.token0();
      const token1Address = await poolContract.token1();
      
      // Get token symbols based on addresses
      const token0 = tokenAAddress.toLowerCase() === token0Address.toLowerCase() ? tokenA : tokenB;
      const token1 = tokenBAddress.toLowerCase() === token1Address.toLowerCase() ? tokenB : tokenA;
      
      // Get reserves
      const [reserve0, reserve1] = await poolContract.getReserves();
      
      // Format reserves to human readable format (with 18 decimals)
      const formattedReserve0 = ethers.formatEther(reserve0);
      const formattedReserve1 = ethers.formatEther(reserve1);
      
      setPoolReserves({
        token0,
        token1,
        token0Reserve: formattedReserve0,
        token1Reserve: formattedReserve1
      });
      
      // Fetch user's LP balance
      await fetchUserLpBalance(pool.address, poolContract);
      
    } catch (error) {
      console.error("Error fetching pool reserves:", error);
      setPoolReserves({ token0: "", token1: "", token0Reserve: "0", token1Reserve: "0" });
    }
  };

  const fetchUserLpBalance = async (poolAddress, poolContract) => {
    try {
      setUserLpInfo(prev => ({ ...prev, isLoading: true }));
      
      // Connect to provider and get user's address
      if (!window.ethereum) throw new Error("MetaMask is not installed");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const userAddress = accounts[0];
      
      // If no poolContract was passed, create one
      if (!poolContract) {
        poolContract = new ethers.Contract(poolAddress, abis.Pool, provider);
      }
      
      // Get user's LP token balance
      const lpBalance = await poolContract.balanceOf(userAddress);
      
      // Get total supply of LP tokens
      const totalSupply = await poolContract.totalSupply();
      
      // Calculate user's percentage of the pool
      let poolPercentage = "0";
      if (totalSupply > 0 && lpBalance > 0) {
        poolPercentage = ((Number(lpBalance) / Number(totalSupply)) * 100).toFixed(2);
      }
      
      // Format LP balance to human readable format
      const formattedLpBalance = ethers.formatEther(lpBalance);
      
      setUserLpInfo({
        balance: formattedLpBalance,
        poolPercentage,
        isLoading: false
      });
    } catch (error) {
      console.error("Error fetching user LP balance:", error);
      setUserLpInfo({
        balance: "0",
        poolPercentage: "0",
        isLoading: false
      });
    }
  };

  const handleChange = (event) => {
    const poolName = event.target.value;
    setSelectedPool(poolName);
    
    // Reset token amounts when pool changes
    setToken1Amount("");
    setToken2Amount("");
    setLpTokenEstimate({
      amount: "0",
      poolShare: "0",
      isCalculating: false
    });
    
    // Reset user LP info
    setUserLpInfo({
      balance: "0",
      poolPercentage: "0", 
      isLoading: true
    });
    
    // If a valid pool is selected, fetch its reserves
    if (poolName) {
      fetchPoolReserves(poolName);
    }
  };

  const calculateSecondTokenAmount = async (amount1Input) => {
    if (!selectedPool || !amount1Input || Number(amount1Input) <= 0) {
      setToken2Amount("");
      setLpTokenEstimate({
        amount: "0",
        poolShare: "0",
        isCalculating: false
      });
      return;
    }

    try {
      setLpTokenEstimate(prev => ({ ...prev, isCalculating: true }));
      
      // Get token addresses
      const [tokenA, tokenB] = selectedPool.split("/");
      const tokenAAddress = addresses.tokens[tokenA];
      const tokenBAddress = addresses.tokens[tokenB];
      
      // Connect to provider
      if (!window.ethereum) throw new Error("MetaMask is not installed");
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // Get router contract
      const routerContract = new ethers.Contract(addresses.router, abis.Router, provider);
      
      // Parse amount
      const parsedAmount = ethers.parseEther(amount1Input);
      
      // Call previewAddLiquidity to get required second token amount and LP token estimate
      const preview = await routerContract.previewAddLiquidity(
        tokenAAddress,
        tokenBAddress,
        parsedAmount,
        true // first token as base
      );
      
      // Extract values from preview 
      const [lpTokenAmount, poolShareBasisPoints, previewAmount0, previewAmount1] = preview;
      
      // Format values to user-friendly format
      const formattedLpAmount = ethers.formatEther(lpTokenAmount);
      const poolSharePercent = (Number(poolShareBasisPoints) / 100).toFixed(2); // Convert basis points to percentage
      
      // If tokenA is token0, amount0 matches the amount1 input, otherwise use amount1
      const requiredAmount2 = ethers.formatEther(previewAmount1);
      
      // Update second token amount and LP token estimate
      setToken2Amount(requiredAmount2);
      setLpTokenEstimate({
        amount: formattedLpAmount,
        poolShare: poolSharePercent,
        isCalculating: false
      });
      
      // Mark first token as the base
      setIsFirstTokenBase(true);
      
    } catch (error) {
      console.error("Error calculating token amounts:", error);
      setToken2Amount("");
      setLpTokenEstimate({
        amount: "0",
        poolShare: "0",
        isCalculating: false
      });
    }
  };

  const calculateFirstTokenAmount = async (amount2Input) => {
    if (!selectedPool || !amount2Input || Number(amount2Input) <= 0) {
      setToken1Amount("");
      setLpTokenEstimate({
        amount: "0",
        poolShare: "0",
        isCalculating: false
      });
      return;
    }

    try {
      setLpTokenEstimate(prev => ({ ...prev, isCalculating: true }));
      
      // Get token addresses
      const [tokenA, tokenB] = selectedPool.split("/");
      const tokenAAddress = addresses.tokens[tokenA];
      const tokenBAddress = addresses.tokens[tokenB];
      
      // Connect to provider
      if (!window.ethereum) throw new Error("MetaMask is not installed");
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // Get router contract
      const routerContract = new ethers.Contract(addresses.router, abis.Router, provider);
      
      // Parse amount
      const parsedAmount = ethers.parseEther(amount2Input);
      
      // Call previewAddLiquidity to get required first token amount and LP token estimate
      const preview = await routerContract.previewAddLiquidity(
        tokenBAddress, // Order is swapped because we're using the second token as base
        tokenAAddress,
        parsedAmount,
        true // second token as base
      );
      
      // Extract values from preview
      const [lpTokenAmount, poolShareBasisPoints, previewAmount0, previewAmount1] = preview;
      
      // Format values to user-friendly format
      const formattedLpAmount = ethers.formatEther(lpTokenAmount);
      const poolSharePercent = (Number(poolShareBasisPoints) / 100).toFixed(2); // Convert basis points to percentage
      
      // If tokenB is token0, amount0 matches the amount2 input, otherwise use amount1
      const requiredAmount1 = ethers.formatEther(previewAmount1);
      
      // Update first token amount and LP token estimate
      setToken1Amount(requiredAmount1);
      setLpTokenEstimate({
        amount: formattedLpAmount,
        poolShare: poolSharePercent,
        isCalculating: false
      });
      
      // Mark second token as the base
      setIsFirstTokenBase(false);
      
    } catch (error) {
      console.error("Error calculating token amounts:", error);
      setToken1Amount("");
      setLpTokenEstimate({
        amount: "0",
        poolShare: "0",
        isCalculating: false
      });
    }
  };

  const handleToken1Change = (e) => {
    const value = e.target.value;
    setToken1Amount(value);
    
    // Reset token2 and mark this as the base token
    if (value === "") {
      setToken2Amount("");
      setLpTokenEstimate({
        amount: "0",
        poolShare: "0",
        isCalculating: false
      });
    }
  };

  const handleToken2Change = (e) => {
    const value = e.target.value;
    setToken2Amount(value);
    
    // Reset token1 and mark this as the base token
    if (value === "") {
      setToken1Amount("");
      setLpTokenEstimate({
        amount: "0",
        poolShare: "0",
        isCalculating: false
      });
    }
  };

  const handleAddLiquidity = async () => {
    if (!selectedPool || !token1Amount || !token2Amount || Number(token1Amount) <= 0 || Number(token2Amount) <= 0) {
      setTxStatus({ success: false, message: "Select a pool and enter valid amounts", open: true });
      return;
    }

    try {
      setLoading(true);
      // Find the selected pool
      const pool = pools.find((p) => p.name === selectedPool);
      
      // Get token addresses from the pool name
      const [tokenA, tokenB] = selectedPool.split("/");
      const tokenAAddress = addresses.tokens[tokenA];
      const tokenBAddress = addresses.tokens[tokenB];
      
      // Connect to MetaMask
      if (!window.ethereum) throw new Error("MetaMask is not installed");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Get token contracts for approvals
      const tokenAContract = new ethers.Contract(tokenAAddress, abis.NewToken, signer);
      const tokenBContract = new ethers.Contract(tokenBAddress, abis.NewToken, signer);
      
      // Get router contract
      const routerContract = new ethers.Contract(addresses.router, abis.Router, signer);
      
      // Parse amounts
      const parsedAmount1 = ethers.parseEther(token1Amount);
      const parsedAmount2 = ethers.parseEther(token2Amount);
      
      console.log("Adding liquidity for pool:", selectedPool);
      console.log("Token A:", tokenA, tokenAAddress);
      console.log("Token B:", tokenB, tokenBAddress);

      // IMPORTANT: The contract expects tokens in ascending order (address order) to avoid issues
      // We need to determine which token should be token0 and token1 in the pool
      // First, check if we need to swap the tokens to match the pool's order
      const poolContract = new ethers.Contract(pool.address, abis.Pool, signer);
      const token0Address = await poolContract.token0();
      const token1Address = await poolContract.token1();
      
      console.log("Pool token0:", token0Address);
      console.log("Pool token1:", token1Address);
      
      // Determine if we need to swap the order of tokens
      const isToken0First = tokenAAddress.toLowerCase() === token0Address.toLowerCase();
      
      // Now we can set up the correct order based on the pool
      const firstTokenAddress = isToken0First ? tokenAAddress : tokenBAddress;
      const secondTokenAddress = isToken0First ? tokenBAddress : tokenAAddress;
      const firstAmount = isToken0First ? parsedAmount1 : parsedAmount2;
      const secondAmount = isToken0First ? parsedAmount2 : parsedAmount1;
      
      // Approve tokens - use max uint256 for better UX in future additions
      setIsApproving(true);
      const MAX_UINT256 = ethers.MaxUint256;
      
      console.log("Approving tokens for router:", addresses.router);
      
      try {
        // Check current allowances first
        const allowance1 = await tokenAContract.allowance(await signer.getAddress(), addresses.router);
        if (allowance1 < parsedAmount1) {
          console.log("Approving token A");
          const tx1 = await tokenAContract.approve(addresses.router, MAX_UINT256);
          await tx1.wait();
          console.log("Token A approved");
        }
        
        const allowance2 = await tokenBContract.allowance(await signer.getAddress(), addresses.router);
        if (allowance2 < parsedAmount2) {
          console.log("Approving token B");
          const tx2 = await tokenBContract.approve(addresses.router, MAX_UINT256);
          await tx2.wait();
          console.log("Token B approved");
        }
      } catch (error) {
        console.error("Approval error:", error);
        setTxStatus({ success: false, message: "Failed to approve tokens: " + error.message, open: true });
        setLoading(false);
        setIsApproving(false);
        return;
      }
      
      setIsApproving(false);
      
      try {
        // Preview to calculate min LP amount with slippage protection
        console.log("Getting preview for liquidity addition");
        
        const preview = await routerContract.previewAddLiquidity(
          firstTokenAddress,
          secondTokenAddress,
          firstAmount,
          true // Using first token as base
        );
        
        console.log("Preview result:", {
          lpAmount: preview[0].toString(),
          poolShare: preview[1].toString(),
          amount0: preview[2].toString(),
          amount1: preview[3].toString()
        });
        
        // Use 2% slippage as a buffer
        const minLpAmount = (preview[0] * BigInt(98)) / BigInt(100);
        console.log("Min LP amount with slippage:", minLpAmount.toString());
        
        // Add liquidity
        console.log("Adding liquidity with parameters:", {
          token0: firstTokenAddress,
          token1: secondTokenAddress,
          amount: firstAmount.toString(),
          minLpAmount: minLpAmount.toString()
        });
        
        const addLiquidityTx = await routerContract.addLiquidityFromToken0(
          firstTokenAddress,
          secondTokenAddress,
          firstAmount,
          minLpAmount
        );
        
        console.log("Liquidity transaction submitted:", addLiquidityTx.hash);
        await addLiquidityTx.wait();
        console.log("Liquidity transaction confirmed");
        
        setTxStatus({ success: true, message: "Liquidity added successfully!", open: true });
        // Reset forms
        setToken1Amount("");
        setToken2Amount("");
        // Refetch pool data
        fetchPoolReserves(selectedPool);
        // Update all positions
        updatePositionsAfterTransaction();
      } catch (error) {
        console.error("Transaction failed:", error);
        
        // Try to extract more meaningful error
        let errorMessage = "Transaction failed";
        if (error.data) {
          errorMessage += ": " + error.data;
        } else if (error.reason) {
          errorMessage += ": " + error.reason;
        } else if (error.message) {
          errorMessage += ": " + error.message;
        }
        
        setTxStatus({ success: false, message: errorMessage, open: true });
      }
    } catch (err) {
      console.error("Liquidity Error:", err);
      setTxStatus({ success: false, message: err.message || "Transaction failed", open: true });
    } finally {
      setLoading(false);
      setIsApproving(false);
    }
  };

  const handleCloseSnackbar = () => {
    setTxStatus({ ...txStatus, open: false });
  };

  // Update all positions after adding liquidity
  const updatePositionsAfterTransaction = () => {
    fetchAllUserPositions(pools);
  };

  // Extract token names from the selected pool
  const [tokenA, tokenB] = selectedPool ? selectedPool.split("/") : ["", ""];

  return (
    <Container maxWidth="md" sx={{ mt: 8, mb: 8 }}>
      {/* User's LP Positions Summary */}
      <Paper elevation={3} sx={{ p: 4, borderRadius: 3, bgcolor: "#1a1a1a", color: "white", mb: 4 }}>
        <Typography variant="h5" fontWeight="bold" mb={3}>
          Your Liquidity Positions
        </Typography>
        
        {isLoadingPositions ? (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress color="primary" />
          </Box>
        ) : allUserPositions.length > 0 ? (
          <TableContainer>
            <Table sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: 'grey.400' }}>Pool</TableCell>
                  <TableCell align="right" sx={{ color: 'grey.400' }}>LP Tokens</TableCell>
                  <TableCell align="right" sx={{ color: 'grey.400' }}>Pool Share</TableCell>
                  <TableCell align="right" sx={{ color: 'grey.400' }}>Value</TableCell>
                  <TableCell align="right" sx={{ color: 'grey.400' }}>Daily Fees</TableCell>
                  <TableCell align="right" sx={{ color: 'grey.400' }}>Est. Monthly Fees</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {allUserPositions.map((position) => (
                  <TableRow
                    key={position.poolAddress}
                    sx={{ '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.05)' }, cursor: 'pointer' }}
                    onClick={() => {
                      setSelectedPool(position.poolName);
                      fetchPoolReserves(position.poolName);
                    }}
                  >
                    <TableCell component="th" scope="row" sx={{ color: 'white' }}>
                      {position.poolName}
                    </TableCell>
                    <TableCell align="right" sx={{ color: 'white' }}>
                      {parseFloat(position.lpBalance).toFixed(4)}
                    </TableCell>
                    <TableCell align="right" sx={{ color: 'white' }}>
                      {position.poolPercentage}%
                    </TableCell>
                    <TableCell align="right" sx={{ color: 'white' }}>
                      {position.token0Amount} {position.token0Symbol}<br />
                      {position.token1Amount} {position.token1Symbol}
                    </TableCell>
                    <TableCell align="right" sx={{ color: '#4caf50' }}>
                      ${position.dailyFees}
                    </TableCell>
                    <TableCell align="right" sx={{ color: '#4caf50' }}>
                      ${position.totalFees}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={3} sx={{ border: 0 }} />
                  <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold', borderTop: '1px solid rgba(255, 255, 255, 0.2)' }}>
                    Total:
                  </TableCell>
                  <TableCell align="right" sx={{ color: '#4caf50', fontWeight: 'bold', borderTop: '1px solid rgba(255, 255, 255, 0.2)' }}>
                    ${allUserPositions.reduce((sum, pos) => sum + parseFloat(pos.dailyFees), 0).toFixed(2)}
                  </TableCell>
                  <TableCell align="right" sx={{ color: '#4caf50', fontWeight: 'bold', borderTop: '1px solid rgba(255, 255, 255, 0.2)' }}>
                    ${allUserPositions.reduce((sum, pos) => sum + parseFloat(pos.totalFees), 0).toFixed(2)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box sx={{ p: 3, textAlign: 'center', bgcolor: 'rgba(255, 255, 255, 0.05)', borderRadius: 2 }}>
            <Typography color="grey.400">
              You don't have any active liquidity positions.
            </Typography>
            <Typography color="primary.light" sx={{ mt: 1 }}>
              Add liquidity below to start earning fees!
            </Typography>
          </Box>
        )}
      </Paper>
      
      {/* Add Liquidity Form */}
      <Paper elevation={3} sx={{ p: 4, borderRadius: 3, bgcolor: "#1a1a1a", color: "white" }}>
        <Typography variant="h4" fontWeight="bold" mb={4}>
          Add Liquidity
        </Typography>
        
        <Box mb={4}>
          <Typography variant="body1" mb={2} color="grey.300">
            Add liquidity to receive LP tokens and earn trading fees
          </Typography>
        </Box>
        
        <FormControl fullWidth sx={{ mb: 4 }}>
          <InputLabel id="select-pool-label" sx={{ color: "grey.300" }}>Select Pool</InputLabel>
          <Select
            labelId="select-pool-label"
            value={selectedPool || ""} // Ensure value is never undefined
            onChange={handleChange}
            label="Select Pool"
            sx={{ 
              color: "white",
              '.MuiOutlinedInput-notchedOutline': {
                borderColor: 'grey.700',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: 'grey.500',
              },
            }}
          >
            {pools.map((pool) => (
              <MenuItem key={pool.name} value={pool.name}>
                {pool.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        {selectedPool && (
          <>
            {/* Display pool reserves */}
            <Box sx={{ 
              mb: 3, 
              p: 3, 
              bgcolor: 'rgba(255, 255, 255, 0.05)', 
              borderRadius: 2,
              display: 'flex',
              flexDirection: 'column',
              gap: 1
            }}>
              <Typography variant="subtitle1" color="grey.300">
                Current Pool Reserves:
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body1">
                  {poolReserves.token0}: {parseFloat(poolReserves.token0Reserve).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                </Typography>
                <Typography variant="body1">
                  {poolReserves.token1}: {parseFloat(poolReserves.token1Reserve).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                </Typography>
              </Box>
            </Box>
            
            {/* Display user's current LP position */}
            <Box sx={{ 
              mb: 4, 
              p: 3, 
              bgcolor: 'rgba(76, 175, 80, 0.1)', 
              borderRadius: 2,
              display: 'flex',
              flexDirection: 'column',
              gap: 1
            }}>
              <Typography variant="subtitle1" color="#66bb6a">
                Your Current Position:
              </Typography>
              {userLpInfo.isLoading ? (
                <Box display="flex" alignItems="center" gap={1}>
                  <CircularProgress size={16} />
                  <Typography variant="body2">Loading your position...</Typography>
                </Box>
              ) : Number(userLpInfo.balance) > 0 ? (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body1">
                    {parseFloat(userLpInfo.balance).toLocaleString(undefined, { maximumFractionDigits: 6 })} LP Tokens
                  </Typography>
                  <Typography variant="body1">
                    {userLpInfo.poolPercentage}% of pool
                  </Typography>
                </Box>
              ) : (
                <Typography variant="body2" color="grey.400">
                  You don't have any LP tokens in this pool yet.
                </Typography>
              )}
            </Box>
            
            <Divider sx={{ my: 3, borderColor: 'grey.800' }} />
            
            <Typography variant="h6" mb={3}>
              Deposit Tokens
            </Typography>

            <TextField
              label={`${tokenA} Amount`}
              type="number"
              value={token1Amount || ""} // Ensure value is never undefined
              onChange={handleToken1Change}
              onBlur={() => token1Amount && calculateSecondTokenAmount(token1Amount)}
              fullWidth
              sx={{ 
                mb: 3, 
                '& .MuiInputBase-root': { 
                  fontSize: "1.2rem",
                  color: "white",
                },
                '& .MuiInputLabel-root': {
                  color: "grey.400"
                },
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'grey.700',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'grey.500',
                }
              }}
              inputProps={{ min: 0 }}
            />

            <TextField
              label={`${tokenB} Amount`}
              type="number"
              value={token2Amount || ""} // Ensure value is never undefined
              onChange={handleToken2Change}
              onBlur={() => token2Amount && calculateFirstTokenAmount(token2Amount)}
              fullWidth
              sx={{ 
                mb: 4, 
                '& .MuiInputBase-root': { 
                  fontSize: "1.2rem",
                  color: "white"
                },
                '& .MuiInputLabel-root': {
                  color: "grey.400"
                },
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'grey.700',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'grey.500',
                }
              }}
              inputProps={{ min: 0 }}
            />
            
            {/* LP Token Estimate Section */}
            <Box sx={{ 
              mb: 4, 
              p: 3, 
              bgcolor: 'rgba(25, 118, 210, 0.1)', 
              borderRadius: 2,
              display: 'flex',
              flexDirection: 'column',
              gap: 1
            }}>
              <Typography variant="subtitle1" color="#42a5f5">
                You Will Receive:
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {lpTokenEstimate.isCalculating ? (
                  <CircularProgress size={16} />
                ) : (
                  <>
                    <Typography variant="body1" fontWeight="bold">
                      {parseFloat(lpTokenEstimate.amount).toLocaleString(undefined, { maximumFractionDigits: 6 })} LP Tokens
                    </Typography>
                    <Typography variant="body2">
                      {lpTokenEstimate.poolShare}% of pool
                    </Typography>
                  </>
                )}
              </Box>
              {Number(userLpInfo.balance) > 0 && Number(lpTokenEstimate.amount) > 0 && (
                <Box sx={{ mt: 1, pt: 1, borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
                  <Typography variant="subtitle2" color="#90caf9">
                    After this transaction:
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">
                      {(parseFloat(userLpInfo.balance) + parseFloat(lpTokenEstimate.amount)).toLocaleString(undefined, { maximumFractionDigits: 6 })} LP Tokens
                    </Typography>
                    <Typography variant="body2">
                      {(() => {
                        // Convert percentages to numbers
                        const currentPercentage = parseFloat(userLpInfo.poolPercentage);
                        const newSharePercentage = parseFloat(lpTokenEstimate.poolShare);
                        
                        // Calculate remaining percentage after new addition
                        const remainingPercentage = 100 - newSharePercentage;
                        
                        // Calculate updated percentage
                        // Current stake will be diluted proportionally to the new tokens
                        const updatedPercentage = (currentPercentage * remainingPercentage / 100) + newSharePercentage;
                        
                        return updatedPercentage.toFixed(2);
                      })()}% of pool
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>
            
            <Button 
              variant="contained" 
              color="primary" 
              fullWidth 
              size="large"
              onClick={handleAddLiquidity} 
              disabled={loading || lpTokenEstimate.amount === "0"}
              sx={{ 
                py: 1.5,
                fontSize: "1.1rem"
              }}
            >
              {loading ? 
                <CircularProgress size={24} color="inherit" /> : 
                isApproving ? "Approving..." : "Add Liquidity"}
            </Button>
          </>
        )}
      </Paper>
      
      <Snackbar
        open={txStatus.open}
        autoHideDuration={5000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "center" }} // Top center position
      >
        <Alert onClose={handleCloseSnackbar} severity={txStatus.success ? "success" : "error"}>
          {txStatus.message}
        </Alert>
      </Snackbar>
    </Container>
  );
} 