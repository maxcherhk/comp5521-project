"use client";

import React, { useState, useEffect } from "react";
import {
  Box, Typography, Button, Menu, MenuItem, Input
} from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import { useWallet } from "../../context/WalletContext";
import { getContracts } from "../../utils/contract";
import { ethers } from "ethers";
import { buildPoolMap, findSwapPath, getPoolKey, getTokenBalances } from "../../utils/contract";
import addresses from "../../utils/deployed-addresses.json";
import abis from "../../utils/deployed-abis.json";

const tokens = ["ALPHA", "BETA", "CHARLIE", "DELTA"];

export default function SwapBox() {
  const [sellAnchorEl, setSellAnchorEl] = useState(null);
  const [buyAnchorEl, setBuyAnchorEl] = useState(null);
  const [sellToken, setSellToken] = useState("ALPHA");
  const [buyToken, setBuyToken] = useState("BETA");
  const [sellAmount, setSellAmount] = useState("");
  const [contracts, setContracts] = useState(null);
  const [buyAmount, setBuyAmount] = useState("");
  const [activeField, setActiveField] = useState("sell");
  const [errorMessage, setErrorMessage] = useState("");
  const [previewError, setPreviewError] = useState("");

  const { isWalletConnected, provider, balances, connectWallet, setBalances } = useWallet();

  useEffect(() => {
    const loadContracts = async () => {
      if (isWalletConnected && provider) {
        const signer = await provider.getSigner();
        const result = await getContracts(signer);
        setContracts(result);
      }
    };
    loadContracts();
  }, [isWalletConnected, provider]);

  useEffect(() => {
    //Client-side
    /*const computeSwapValue = async () => {
      if (!provider || sellToken === buyToken) return;
  
      const signer = await provider.getSigner();
      const poolMap = buildPoolMap();
      const path = findSwapPath(sellToken, buyToken, poolMap);
      if (!path) return;
  
      try {
        if (activeField === "sell" && sellAmount) {
          let currentAmountIn = ethers.parseEther(sellAmount);
  
          for (let i = 0; i < path.length; i++) {
            const [tokenInSymbol, tokenOutSymbol] = path[i];
            const poolKey = getPoolKey(tokenInSymbol, tokenOutSymbol);
            const poolAddress = poolMap[poolKey];
            const pool = new ethers.Contract(poolAddress, abis.Pool, signer);
            const tokenInAddress = addresses[`token${tokenInSymbol[0]}`];
            const tokenOutAddress = addresses[`token${tokenOutSymbol[0]}`];
  
            const result = await pool.getAmountOut(tokenInAddress, currentAmountIn, tokenOutAddress);
            currentAmountIn = result[0];
          }
  
          setBuyAmount(ethers.formatEther(currentAmountIn));
        }
  
        if (activeField === "buy" && buyAmount) {
          let desiredAmountOut = ethers.parseEther(buyAmount);
          let estimatedInput = desiredAmountOut;
        
          for (let i = path.length - 1; i >= 0; i--) {
            const [tokenInSymbol, tokenOutSymbol] = path[i];
            const poolKey = getPoolKey(tokenInSymbol, tokenOutSymbol);
            const poolAddress = poolMap[poolKey];
            const pool = new ethers.Contract(poolAddress, abis.Pool, signer);
            const tokenInAddress = addresses[`token${tokenInSymbol[0]}`];
            const tokenOutAddress = addresses[`token${tokenOutSymbol[0]}`];
        
            const result = await pool.getAmountIn(tokenInAddress, desiredAmountOut, tokenOutAddress);
            estimatedInput = result[0]; // result = [amountIn, feeAmount]
            desiredAmountOut = estimatedInput; // for previous leg in path
          }
        
          setSellAmount(ethers.formatEther(estimatedInput));
        }

        setPreviewError("");
        
      } catch (err) {
        console.error("Swap preview error:", err);
        setPreviewError(err.reason || err.message || "Error calculating swap amount");
      }
    };*/

    const computeSwapValue = async () => {
      if (!provider || sellToken === buyToken || !sellAmount) return;
    
      try {
        const signer = await provider.getSigner();
        const router = new ethers.Contract(addresses.router, abis.Router, signer);
    
        const tokenIn = addresses[`token${sellToken[0]}`];
        const tokenOut = addresses[`token${buyToken[0]}`];
        const amountIn = ethers.parseEther(sellAmount);
    
        const preview = await router.previewSwapWithBestRouteDefault(tokenIn, amountIn, tokenOut);
        const expectedOut = preview[1];
    
        setBuyAmount(ethers.formatEther(expectedOut));
      } catch (err) {
        console.error("Preview failed:", err);
        setBuyAmount("");
      }
    };
  
    computeSwapValue();
  }, [sellAmount, buyAmount, sellToken, buyToken, activeField, provider]);
  
  
  

  const handleSellMenuOpen = (event) => setSellAnchorEl(event.currentTarget);
  const handleBuyMenuOpen = (event) => setBuyAnchorEl(event.currentTarget);

  const handleSelectSellToken = (token) => {
    if (token === buyToken) {
      setBuyToken(sellToken); // swap them if selecting same
    }
    setSellToken(token);
    setSellAnchorEl(null);
  };
  
  const handleSelectBuyToken = (token) => {
    if (token === sellToken) {
      setSellToken(buyToken); // swap them if selecting same
    }
    setBuyToken(token);
    setBuyAnchorEl(null);
  };

  /* Swap Best Route in client-side
  const handleSwap = async () => {
    try {
      setErrorMessage(""); // clear previous
      if (!sellAmount || !sellToken || !buyToken || sellToken === buyToken) {
        setErrorMessage("Please enter a valid amount and select two different tokens.");
        return;
      }
  
      if (!provider) {
        setErrorMessage("Wallet not connected.");
        return;
      }
  
      const signer = await provider.getSigner();
      const amountIn = ethers.parseEther(sellAmount);
      const poolMap = buildPoolMap();
      const path = findSwapPath(sellToken, buyToken, poolMap);
  
      if (!path) {
        setErrorMessage("No available route to swap between selected tokens.");
        return;
      }
  
      let currentAmountIn = amountIn;
      for (let i = 0; i < path.length; i++) {
        const [tokenInSymbol, tokenOutSymbol] = path[i];
        const poolKey = getPoolKey(tokenInSymbol, tokenOutSymbol);
        const poolAddress = poolMap[poolKey];
        const pool = new ethers.Contract(poolAddress, abis.Pool, signer);
  
        const tokenInAddress = addresses[`token${tokenInSymbol[0]}`];
        const tokenOutAddress = addresses[`token${tokenOutSymbol[0]}`];
        const tokenIn = new ethers.Contract(tokenInAddress, abis.NewToken, signer);
  
        const approveTx = await tokenIn.approve(poolAddress, currentAmountIn);
        await approveTx.wait();
  
        const swapTx = await pool.swap(tokenInAddress, currentAmountIn, tokenOutAddress);
        await swapTx.wait();
      }
  
      if (contracts && provider && typeof setBalances === "function") {
        const address = await signer.getAddress();
        const updated = await getTokenBalances(contracts, address);
        setBalances(updated);
      }
  
    } catch (err) {
      console.error("Swap failed:", err);
      setErrorMessage(err.reason || err.message || "Swap failed unexpectedly.");
    }
  };*/

  const handleSwap = async () => {
    try {
      if (!sellAmount || !sellToken || !buyToken || sellToken === buyToken) {
        alert("Please enter a valid amount and select two different tokens.");
        return;
      }
  
      if (!provider) {
        alert("Wallet not connected.");
        return;
      }
  
      const signer = await provider.getSigner();
      const amountIn = ethers.parseEther(sellAmount);
      const tokenIn = addresses[`token${sellToken[0]}`];
      const tokenOut = addresses[`token${buyToken[0]}`];
      const router = new ethers.Contract(addresses.router, abis.Router, signer);
  
      // Set slippage tolerance (e.g., 1%)
      const preview = await router.previewSwapWithBestRouteDefault(tokenIn, amountIn, tokenOut);
      const minAmountOut = preview.expectedOutput * BigInt(99) / BigInt(100); // 1% slippage
  
      // Approve the router to spend input token
      const tokenContract = new ethers.Contract(tokenIn, abis.NewToken, signer);
      const approveTx = await tokenContract.approve(addresses.router, amountIn);
      await approveTx.wait();
  
      // Perform swap
      const tx = await router.swapWithBestRouteDefault(tokenIn, amountIn, tokenOut, minAmountOut);
      const receipt = await tx.wait();
      console.log("✅ Swap complete:", receipt);
  
      // Refresh balances
      if (contracts && typeof setBalances === "function") {
        const address = await signer.getAddress();
        const updated = await getTokenBalances(contracts, address);
        setBalances(updated);
      }
  
      alert("Swap completed!");
  
    } catch (err) {
      console.error("Swap failed:", err);
      alert(`Swap failed: ${err.reason || err.message}`);
    }
  };

  return (
    <>
      {/* Sell Box */}
      <Box sx={{ background: "#1e1e1e", borderRadius: 3, p: 2 }}>
        <Typography variant="body2" color="gray">Sell</Typography>
        <Box display="flex" alignItems="center" justifyContent="space-between" mt={1}>
          <Input
            type="number"
            variant="standard"
            placeholder="0"
            disableUnderline
            value={sellAmount}
            onFocus={() => setActiveField("sell")}
            onChange={(e) => {
              setSellAmount(e.target.value);
            }}
            sx={{
              input: { fontSize: 28, color: "white" },
              width: "70%",
              "& input": {
                MozAppearance: "textfield",
                "&::-webkit-outer-spin-button": { display: "none" },
                "&::-webkit-inner-spin-button": { display: "none" },
              },
            }}
          />
          <Button
            onClick={handleSellMenuOpen}
            sx={{
              backgroundColor: "#2a2a2a", color: "white", borderRadius: 3, minWidth: 90, textTransform: "none"
            }}
          >
            {sellToken}
            <KeyboardArrowDownIcon />
          </Button>
        </Box>
      </Box>

      {/* Swap Arrow */}
      <Box display="flex" margin={1} justifyContent="center">
        <Button
          sx={{
            background: "#1e1e1e",
            borderRadius: "50%",
            width: 48,
            height: 48,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: 0,
            padding: 0,
          }}
          onClick={() => {
            setSellToken(buyToken);
            setBuyToken(sellToken);
          }}
        >
          <UnfoldMoreIcon />
        </Button>
      </Box>

      {/* Buy Box */}
      <Box sx={{ background: "#1e1e1e", borderRadius: 3, p: 2 }}>
        <Typography variant="body2" color="gray">Buy</Typography>
        <Box display="flex" alignItems="center" justifyContent="space-between" mt={1}>
            <Input
              type="number"
              variant="standard"
              placeholder="0"
              disableUnderline
              value={buyAmount}
              onFocus={() => setActiveField("buy")}
              onChange={(e) => {
                setBuyAmount(e.target.value);
              }}
              sx={{
                input: { fontSize: 28, color: "white" },
                width: "70%",
                "& input": {
                  MozAppearance: "textfield",
                  "&::-webkit-outer-spin-button": { display: "none" },
                  "&::-webkit-inner-spin-button": { display: "none" },
                },
              }}
          />
          <Button
            onClick={handleBuyMenuOpen}
            sx={{
              backgroundColor: "#2a2a2a", color: "white", borderRadius: 3, minWidth: 90, textTransform: "none"
            }}
          >
            {buyToken}
            <KeyboardArrowDownIcon />
          </Button>
        </Box>
      </Box>

      {/* Swap Button */}
      <Button
        fullWidth
        sx={{
          mt: 2,
          backgroundColor: "#00C2A8",
          color: "white",
          textTransform: "none",
          borderRadius: 3,
          p: 1.5,
          fontWeight: "bold",
          "&:hover": { backgroundColor: "#1F8EF1" },
        }}
        onClick={!isWalletConnected ? connectWallet : handleSwap}
      >
        {!isWalletConnected ? "Connect wallet" : "Swap"}
      </Button>

      {errorMessage && (
        <Typography sx={{ color: "red", mt: 1, mb: 1, fontSize: "14px" }}>
          ⚠️ {errorMessage}
        </Typography>
      )}

      {previewError && (
        <Typography sx={{ color: "orange", mt: 2, fontSize: "14px" }}>
          ⚠️ {previewError}
        </Typography>
      )}

      {/* Dropdown Menus */}
      <Menu anchorEl={sellAnchorEl} open={Boolean(sellAnchorEl)} onClose={() => setSellAnchorEl(null)}>
        {tokens.map((token) => (
          <MenuItem key={token} onClick={() => handleSelectSellToken(token)}>{token}</MenuItem>
        ))}
      </Menu>
      <Menu anchorEl={buyAnchorEl} open={Boolean(buyAnchorEl)} onClose={() => setBuyAnchorEl(null)}>
        {tokens.map((token) => (
          <MenuItem key={token} onClick={() => handleSelectBuyToken(token)}>{token}</MenuItem>
        ))}
      </Menu>

      {/* Wallet Balances */}
      {isWalletConnected && (
        <Box sx={{ backgroundColor: "#1e1e1e", borderRadius: 3, p: 2, mt: 3 }}>
          <Typography variant="h6" color="white" gutterBottom>
            Your Wallet Balances
          </Typography>
          <Box display="grid" gridTemplateColumns="repeat(2, 1fr)" gap={2} mt={1}>
            {Object.entries(balances).map(([token, balance]) => (
              <Box key={token} sx={{ backgroundColor: "#2a2a2a", borderRadius: 2, p: 1.5, textAlign: "center" }}>
                <Typography variant="body1" color="white" fontWeight="bold">
                {Number(balance).toFixed(4)}
                </Typography>
                <Typography variant="caption" color="gray">
                  {token}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </>
  );
}
