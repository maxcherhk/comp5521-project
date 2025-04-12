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
import { buildPoolMap, findSwapPath, getPoolKey } from "../../utils/contract";
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

  const { isWalletConnected, provider, balances, connectWallet } = useWallet();

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

  const handleSellMenuOpen = (event) => setSellAnchorEl(event.currentTarget);
  const handleBuyMenuOpen = (event) => setBuyAnchorEl(event.currentTarget);

  const handleSelectSellToken = (token) => {
    setSellToken(token);
    setSellAnchorEl(null);
  };

  const handleSelectBuyToken = (token) => {
    setBuyToken(token);
    setBuyAnchorEl(null);
  };

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

      const poolMap = buildPoolMap();
      const path = findSwapPath(sellToken, buyToken, poolMap);

      if (!path) {
        alert("No available route to swap between selected tokens.");
        return;
      }

      console.log("Swap path:", path);

      let currentAmountIn = amountIn;

      for (let i = 0; i < path.length; i++) {
        const [tokenInSymbol, tokenOutSymbol] = path[i];
        const poolKey = getPoolKey(tokenInSymbol, tokenOutSymbol);
        const poolAddress = poolMap[poolKey];
        const pool = new ethers.Contract(poolAddress, abis.Pool, signer);

        const tokenInAddress = addresses[`token${tokenInSymbol[0]}`];
        const tokenOutAddress = addresses[`token${tokenOutSymbol[0]}`];
        const tokenIn = new ethers.Contract(tokenInAddress, abis.NewToken, signer);

        console.log(`\nStep ${i + 1}: ${tokenInSymbol} → ${tokenOutSymbol}`);
        console.log(`Approving ${ethers.formatEther(currentAmountIn)} ${tokenInSymbol}...`);

        const approveTx = await tokenIn.approve(poolAddress, currentAmountIn);
        await approveTx.wait();
        console.log("✅ Approved");

        const swapTx = await pool.swap(tokenInAddress, currentAmountIn, tokenOutAddress);
        await swapTx.wait();
        console.log(`✅ Swapped ${tokenInSymbol} → ${tokenOutSymbol}`);
      }

      alert("Swap completed ✅");
    } catch (err) {
      console.error("Swap failed:", err);
      alert(`Swap failed: ${err.message}`);
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
            onChange={(e) => setSellAmount(e.target.value)}
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
            disabled
            sx={{
              input: { fontSize: 28, color: "white" },
              width: "70%",
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
                  {balance}
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
