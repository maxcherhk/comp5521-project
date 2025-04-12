"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Menu,
  MenuItem,
  Input,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { ethers } from "ethers";
import { useWallet } from "../../context/WalletContext";
import addresses from "../../utils/deployed-addresses.json";
import abis from "../../utils/deployed-abis.json";

const { getAllTokens } = require("../../utils/token-address");

const tokenUSDPrices = {
  ALPHA: 1.5,
  BETA: 0.8,
  CHARLIE: 2.3,
  DELTA: 0.5,
};

export default function SendBox() {
  const tokens = getAllTokens();
  const [amount, setAmount] = useState("");
  const [selectedToken, setSelectedToken] = useState("ALPHA");
  const [anchorEl, setAnchorEl] = useState(null);
  const [recipient, setRecipient] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [balance, setBalance] = useState("0");
  const [usdValue, setUsdValue] = useState("0.00");

  const { isWalletConnected, provider, connectWallet } = useWallet();

  useEffect(() => {
    const fetchBalance = async () => {
      if (!provider || !selectedToken) return;
      try {
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        const tokenAddress = addresses[`token${selectedToken[0]}`];
        const tokenContract = new ethers.Contract(tokenAddress, abis.NewToken, signer);
        const rawBalance = await tokenContract.balanceOf(address);
        const formattedBalance = ethers.formatEther(rawBalance);
        setBalance(formattedBalance);
      } catch (err) {
        console.error("Failed to fetch token balance:", err);
        setBalance("0");
      }
    };
    fetchBalance();
  }, [selectedToken, provider]);

  useEffect(() => {
    const price = tokenUSDPrices[selectedToken] || 0;
    const value = parseFloat(balance || "0") * price;
    setUsdValue(value.toFixed(2));
  }, [balance, selectedToken]);

  const handleTokenClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleTokenSelect = (token) => {
    setSelectedToken(token);
    setAnchorEl(null);
  };

  const handleSend = async () => {
    if (!amount || !recipient || !provider || !isWalletConnected) return;
    try {
      setIsSending(true);
      const signer = await provider.getSigner();
      const tokenAddress = addresses[`token${selectedToken[0]}`];
      const tokenContract = new ethers.Contract(tokenAddress, abis.NewToken, signer);
      const parsedAmount = ethers.parseEther(amount);

      const tx = await tokenContract.transfer(recipient, parsedAmount);
      await tx.wait();

      alert("Token sent successfully!");
      setAmount("");
      setRecipient("");
    } catch (err) {
      console.error("Transfer failed:", err);
      alert("Transfer failed: " + (err.reason || err.message));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      {/* Top Info Box */}
      <Box
        sx={{
          background: "#1c1c1c",
          borderRadius: 3,
          p: 3,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Typography variant="body2" color="text.secondary" mb={2}>
          You're sending
        </Typography>
        <Input
          variant="standard"
          fullWidth
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          disableUnderline={true}
          inputProps={{
            inputMode: "decimal",
            style: {
              fontSize: 48,
              textAlign: "center",
              color: "white",
            },
          }}
          sx={{
            input: { paddingBottom: 1 },
            "& .MuiInputBase-root:before": { borderBottom: "none" },
            "& .MuiInputBase-root:after": { borderBottom: "none" },
          }}
        />
        <Typography variant="body2" color="text.secondary">
          {amount || 0} {selectedToken}
        </Typography>
      </Box>

      {/* Token Selector */}
      <Box
        sx={{
          background: "#1c1c1c",
          borderRadius: 3,
          p: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
        }}
        onClick={handleTokenClick}
      >
        <Box>
          <Typography color="white" fontWeight={500}>
            {selectedToken}
          </Typography>
          <Typography variant="caption" color="gray">
            Balance: {parseFloat(balance).toFixed(4)} (${usdValue})
          </Typography>
        </Box>
        <ExpandMoreIcon sx={{ color: "white" }} />
      </Box>

      {/* Address Input */}
      <TextField
        variant="filled"
        placeholder="Wallet address or ENS name"
        fullWidth
        value={recipient}
        onChange={(e) => setRecipient(e.target.value)}
        sx={{
          input: {
            color: "white",
          },
          backgroundColor: "#1c1c1c",
          borderRadius: 3,
          "& .MuiFilledInput-root": {
            borderRadius: 3,
          },
        }}
        InputProps={{ disableUnderline: true }}
      />

      {/* Submit Button */}
      <Button
        fullWidth
        onClick={!isWalletConnected ? connectWallet : handleSend}
        disabled={!amount || !recipient || isSending}
        sx={{
          mt: 2,
          backgroundColor: isSending ? "gray" : "#6b2673",
          color: "white",
          borderRadius: 3,
          p: 1.5,
          fontWeight: "bold",
          textTransform: "none",
        }}
      >
        {!isWalletConnected
          ? "Connect Wallet"
          : isSending
          ? "Sending..."
          : "Send"}
      </Button>

      {/* Token Dropdown */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        {tokens.map((token) => (
          <MenuItem key={token.name} onClick={() => handleTokenSelect(token.name)}>
            {token.name}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}