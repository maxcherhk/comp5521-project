"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Chip,
  Menu,
  MenuItem,
} from "@mui/material";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import SettingsIcon from "@mui/icons-material/Settings";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { useWallet } from "../../context/WalletContext";
import { ethers } from "ethers";
import addresses from "../../utils/deployed-addresses.json";
import abis from "../../utils/deployed-abis.json";

const { getAllTokens } = require("../../utils/token-address");

export default function LimitBox() {
  const tokens = getAllTokens();
  const [price, setPrice] = useState("0");
  const [marketPrice, setMarketPrice] = useState("0");
  const [sellToken, setSellToken] = useState("ALPHA");
  const [buyToken, setBuyToken] = useState("BETA");
  const [expiry, setExpiry] = useState("1 week");
  const [anchorEl, setAnchorEl] = useState(null);
  const [tokenType, setTokenType] = useState(null);
  const [limitOrders, setLimitOrders] = useState([]);
  const [sellAmount, setSellAmount] = useState("");
  const [buyAmount, setBuyAmount] = useState("");

  const { isWalletConnected, provider, connectWallet } = useWallet();

  const openTokenMenu = (e, type) => {
    setAnchorEl(e.currentTarget);
    setTokenType(type);
  };

  const selectToken = (token) => {
    if (tokenType === "sell") {
      if (token === buyToken) setBuyToken(sellToken);
      setSellToken(token);
    } else {
      if (token === sellToken) setSellToken(buyToken);
      setBuyToken(token);
    }
    setAnchorEl(null);
  };

  const handleExecuteOrder = async (order) => {
    try {
      const signer = await provider.getSigner();
      const router = new ethers.Contract(addresses.router, abis.Router, signer);
      const tokenIn = addresses[`token${order.sellToken[0]}`];
      const tokenOut = addresses[`token${order.buyToken[0]}`];
      const amountIn = ethers.parseEther(order.sellAmount);
      const minAmountOut = ethers.parseEther(order.buyAmount);

      const tokenContract = new ethers.Contract(tokenIn, abis.NewToken, signer);
      const approveTx = await tokenContract.approve(addresses.router, amountIn);
      await approveTx.wait();

      const swapTx = await router.swapWithBestRouteDefault(tokenIn, amountIn, tokenOut, minAmountOut);
      await swapTx.wait();

      return true;
    } catch (err) {
      console.error("Real trade failed:", err);
      return false;
    }
  };

  const handleSubmitLimitOrder = () => {
    const order = {
      id: Date.now(),
      sellToken,
      buyToken,
      sellAmount,
      buyAmount,
      limitPrice: parseFloat(price),
      expiry,
      timestamp: Date.now(),
      status: "pending",
    };
    setLimitOrders((prev) => [...prev, order]);
    alert("Limit order saved (pending execution)");
  };

  useEffect(() => {
    const sellNum = parseFloat(sellAmount);
    const priceNum = parseFloat(price);
    if (!isNaN(sellNum) && !isNaN(priceNum)) {
      setBuyAmount((sellNum * priceNum).toFixed(6));
    } else {
      setBuyAmount("");
    }
  }, [sellAmount, price]);

  useEffect(() => {
    const fetchMarketPrice = async () => {
      if (!provider || sellToken === buyToken) return;
      try {
        const signer = await provider.getSigner();
        const router = new ethers.Contract(addresses.router, abis.Router, signer);
        const tokenIn = addresses[`token${sellToken[0]}`];
        const tokenOut = addresses[`token${buyToken[0]}`];
        const unitAmount = ethers.parseEther("1");
        const [_, expectedOut] = await router.previewSwapWithBestRouteDefault(tokenIn, unitAmount, tokenOut);
        setMarketPrice(ethers.formatEther(expectedOut));
      } catch (err) {
        console.error("Failed to fetch market price:", err);
      }
    };
    fetchMarketPrice();
  }, [sellToken, buyToken, provider]);

  useEffect(() => {
    const interval = setInterval(async () => {
      if (!provider) return;
      try {
        const signer = await provider.getSigner();
        const router = new ethers.Contract(addresses.router, abis.Router, signer);

        const updatedOrders = await Promise.all(
          limitOrders.map(async (order) => {
            if (order.status !== "pending") return order;

            const tokenIn = addresses[`token${order.sellToken[0]}`];
            const tokenOut = addresses[`token${order.buyToken[0]}`];
            const amountIn = ethers.parseEther(order.sellAmount || "0");

            try {
              const [, expectedOut] = await router.previewSwapWithBestRouteDefault(tokenIn, amountIn, tokenOut);
              const actualRate = parseFloat(ethers.formatEther(expectedOut)) / parseFloat(order.sellAmount);

              if (actualRate >= order.limitPrice) {
                const executed = await handleExecuteOrder(order);
                if (executed) {
                  return {
                    ...order,
                    status: "executed",
                    executedAt: Date.now(),
                  };
                }
              }
            } catch (err) {
              console.warn("Error simulating order:", err);
            }

            return order;
          })
        );

        setLimitOrders(updatedOrders);
      } catch (err) {
        console.error("Execution interval error:", err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [limitOrders, provider]);

  const expiryOptions = ["1 day", "1 week", "1 month", "1 year"];

  return (
    <>
      <Box sx={{ background: "#1c1c1c", borderRadius: 3, p: 2 }}>
        <Box display="flex" justifyContent="space-between">
          <Typography variant="body2" color="text.secondary">
            When 1 <strong>{sellToken}</strong> is worth
          </Typography>
          <IconButton size="small">
            <SettingsIcon fontSize="small" />
          </IconButton>
        </Box>

        <Box display="flex" alignItems="center" justifyContent="space-between" mt={1}>
          <TextField
            variant="standard"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            InputProps={{ disableUnderline: true }}
            placeholder="0"
            sx={{ input: { fontSize: 36, color: "white" }, width: "60%" }}
          />
          <Button onClick={(e) => openTokenMenu(e, "buy")}
            sx={{ borderRadius: 2, backgroundColor: "#1f1f1f", color: "white", border: "1px solid #333", minWidth: 90 }}>
            {buyToken}
          </Button>
        </Box>

        <Typography variant="caption" color="gray" mt={1}>
          Market price: 1 {sellToken} ≈ {parseFloat(marketPrice).toFixed(6)} {buyToken}
        </Typography>
      </Box>

      {/* Sell and Buy Boxes */}
      <Box sx={{ background: "#1c1c1c", borderRadius: 3, p: 2, mt: 2 }}>
        <Typography variant="body2" color="text.secondary">Sell</Typography>
        <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
          <TextField
            variant="standard"
            placeholder="0"
            value={sellAmount}
            onChange={(e) => setSellAmount(e.target.value)}
            InputProps={{ disableUnderline: true }}
            sx={{ input: { fontSize: 28, color: "white" }, width: "70%" }}
          />
          <Button onClick={(e) => openTokenMenu(e, "sell")}
            sx={{ borderRadius: 2, backgroundColor: "#1f1f1f", color: "white", border: "1px solid #333", minWidth: 90 }}>
            {sellToken}
          </Button>
        </Box>
      </Box>

      <Box display="flex" justifyContent="center">
        <Box sx={{ background: "#1c1c1c", borderRadius: "50%", p: 1 }}>
          <ArrowDownwardIcon sx={{ color: "white" }} />
        </Box>
      </Box>

      <Box sx={{ background: "#1c1c1c", borderRadius: 3, p: 2 }}>
        <Typography variant="body2" color="text.secondary">Buy</Typography>
        <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
          <TextField
            variant="standard"
            value={buyAmount}
            InputProps={{ disableUnderline: true, readOnly: true }}
            sx={{ input: { fontSize: 28, color: "white" }, width: "70%" }}
          />
          <Button disabled sx={{ borderRadius: 2, backgroundColor: "#1f1f1f", color: "white", border: "1px solid #333", minWidth: 90 }}>
            {buyToken}
          </Button>
        </Box>
      </Box>

      {/* Expiry */}
      <Box display="flex" gap={1} flexWrap="wrap" mt={2}>
        {expiryOptions.map((opt) => (
          <Button
            key={opt}
            onClick={() => setExpiry(opt)}
            variant={expiry === opt ? "contained" : "outlined"}
            sx={{ borderRadius: 3, backgroundColor: expiry === opt ? "#00c2a8" : "transparent", color: expiry === opt ? "white" : "#ccc" }}>
            {opt}
          </Button>
        ))}
      </Box>

      <Button
        fullWidth
        onClick={!isWalletConnected ? connectWallet : handleSubmitLimitOrder}
        sx={{ mt: 2, backgroundColor: "#6b2673", color: "white", borderRadius: 3, p: 1.5, fontWeight: "bold" }}>
        {!isWalletConnected ? "Connect wallet" : "Place Limit Order"}
      </Button>

	  {/* Order List */}
	  <Box mt={3}>
        <Typography variant="h6" color="white">
          Limit Orders
        </Typography>
        {limitOrders.map((order) => (
          <Box key={order.id} sx={{ background: "#262626", borderRadius: 2, p: 2, mt: 1 }}>
            <Typography color="white">
              Sell <strong>{order.sellToken}</strong> → Buy <strong>{order.buyToken}</strong> at price <strong>{order.limitPrice}</strong>
            </Typography>
            <Typography color="gray" variant="body2">
              Status: {order.status} {order.executedAt && `(at ${new Date(order.executedAt).toLocaleTimeString()})`}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Disclaimer */}
      <Box sx={{ background: "#1b1b1b", borderRadius: 3, p: 2, mt: 3, display: "flex", alignItems: "flex-start", gap: 1 }}>
        <WarningAmberIcon sx={{ color: "#f7c948", mt: 0.3 }} />
        <Typography variant="body2" color="text.secondary">
          Limits may not execute exactly when tokens reach the specified price. {" "}
          <a href="#" style={{ color: "#1F8EF1", textDecoration: "underline" }}>Learn more</a>
        </Typography>
      </Box>

      {/* Token Dropdown */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        {tokens.map((token) => (
          <MenuItem key={token.name} onClick={() => selectToken(token.name)}>
            {token.name}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
