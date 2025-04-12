"use client";

import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  List,
  ListItemText,
  ListItemIcon,
  InputAdornment,
  Input,
  ListItemButton
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CloseIcon from "@mui/icons-material/Close";
import TokenIcon from "@mui/icons-material/Token";
import { useWallet } from "@/context/WalletContext";
const { getAllTokens, getTokenAddress } = require("../../utils/token-address");

const countriesWithFlags = [
  { name: "Hong Kong", flag: "https://flagcdn.com/h40/hk.png" },
  { name: "Taiwan", flag: "https://flagcdn.com/h40/tw.png" },
  { name: "Japan", flag: "https://flagcdn.com/h40/jp.png" },
  { name: "United States", flag: "https://flagcdn.com/h40/us.png" },
  { name: "Germany", flag: "https://flagcdn.com/h40/de.png" }
];

const exchangeRates = {
  ALPHA: 0.5,
  BETA: 0.3,
  CHARLIE: 0.2,
  DELTA: 0.1
};

export default function BuyBox() {
  const tokens = getAllTokens();
  const { isWalletConnected, provider, connectWallet, account } = useWallet();
  const [country, setCountry] = useState(countriesWithFlags[0]);
  const [token, setToken] = useState("");
  const [amount, setAmount] = useState("");
  const [regionOpen, setRegionOpen] = useState(false);
  const [tokenOpen, setTokenOpen] = useState(false);

  const handleAmountSelect = (val) => setAmount(val);

  const calculateTokenAmount = () => {
    if (!token || !amount) return 0;
    const rate = exchangeRates[token] || 0;
    return (amount * rate).toFixed(2);
  };

  const handleBuy = async () => {
    try {

		localStorage.setItem("walletAddress", account);
		localStorage.setItem("token", token);
		localStorage.setItem("amount", calculateTokenAmount());

      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amount * 100,
          walletAddress: account,
          token: token,
        })
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Failed to initiate payment");
      }
    } catch (err) {
      console.error("Payment error:", err);
      alert("Payment failed: " + err.message);
    }
  };

  return (
    <>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="body2" color="text.secondary">
          You're buying
        </Typography>
        <Button
          onClick={() => setRegionOpen(true)}
          sx={{ minWidth: 0, color: "white", textTransform: "none", px: 1.5, backgroundColor: "#1c1c1c", borderRadius: 2 }}
          endIcon={<ExpandMoreIcon />}
        >
          <img src={country.flag} alt="flag" width={20} height={20} style={{ borderRadius: "50%", marginRight: 6, objectFit: "cover" }} />
        </Button>
      </Box>

      <Input
        type="number"
        value={amount}
        placeholder="0"
        onChange={(e) => setAmount(e.target.value)}
        startAdornment={
          <InputAdornment position="start">
            <Typography sx={{ color: "white", fontSize: "1.5rem" }}>$</Typography>
          </InputAdornment>
        }
        sx={{
          fontSize: "4rem",
          color: "white",
          textAlign: "center",
          fontWeight: 500,
          mt: 1,
          "& input": {
            textAlign: "center",
            MozAppearance: "textfield",
            "&::-webkit-outer-spin-button": { display: "none" },
            "&::-webkit-inner-spin-button": { display: "none" }
          }
        }}
        disableUnderline
      />

      <Button
        variant="outlined"
        onClick={() => setTokenOpen(true)}
        sx={{ backgroundColor: token ? "rgba(255, 255, 255, 0.1)" : "#00C2A8", color: "white", borderRadius: 999, textTransform: "none", width: "fit-content", mx: "auto", px: 3, py: 1, fontWeight: 500 }}
        endIcon={<ExpandMoreIcon />}
      >
        {token ? `${calculateTokenAmount()} ${token}` : "Select a token"}
      </Button>

      <Box display="flex" gap={1} justifyContent="center" mt={1}>
        {[100, 300, 1000].map((val) => (
          <Button
            key={val}
            variant="outlined"
            onClick={() => handleAmountSelect(val)}
            sx={{ color: "white", borderColor: "#333", borderRadius: 3, textTransform: "none", minWidth: 80 }}
          >
            ${val}
          </Button>
        ))}
      </Box>

      {!isWalletConnected ? (
        <Button
          fullWidth
          sx={{ mt: 2, backgroundColor: "#00C2A8", color: "white", textTransform: "none", borderRadius: 3, p: 1.5, fontWeight: "bold", "&:hover": { backgroundColor: "#1F8EF1" } }}
          onClick={connectWallet}
        >
          Connect Wallet
        </Button>
      ) : (
        <Button
          fullWidth
          disabled={!token}
          onClick={handleBuy}
          sx={{ mt: 3, backgroundColor: token ? "#6b2673" : "#2a2a2a", color: "white", borderRadius: 3, textTransform: "none", fontWeight: "bold", p: 1.5, "&:hover": { backgroundColor: token ? "#5c2162" : "#2a2a2a" } }}
        >
          {token ? `Buy ${token}` : "Select a token"}
        </Button>
      )}

      <Dialog open={regionOpen} onClose={() => setRegionOpen(false)} fullWidth>
        <DialogTitle>
          Select your region
          <IconButton onClick={() => setRegionOpen(false)} sx={{ position: "absolute", right: 8, top: 8 }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Input fullWidth placeholder="Search country" sx={{ mb: 2 }} startAdornment={<InputAdornment position="start">🌍</InputAdornment>} />
          <List>
            {countriesWithFlags.map((cty) => (
              <ListItemButton
                key={cty.name}
                selected={country.name === cty.name}
                onClick={() => { setCountry(cty); setRegionOpen(false); }}
              >
                <ListItemIcon>
                  <img src={cty.flag} alt="flag" width={20} height={20} style={{ borderRadius: "50%", marginRight: 6, objectFit: "cover" }} />
                </ListItemIcon>
                <ListItemText primary={cty.name} />
              </ListItemButton>
            ))}
          </List>
        </DialogContent>
      </Dialog>

      <Dialog open={tokenOpen} onClose={() => setTokenOpen(false)} fullWidth>
        <DialogTitle>
          Select a token
          <IconButton onClick={() => setTokenOpen(false)} sx={{ position: "absolute", right: 8, top: 8 }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Input fullWidth placeholder="Search token" sx={{ mb: 2 }} startAdornment={<InputAdornment position="start">🔍</InputAdornment>} />
          <List>
            {tokens.map((tk) => (
              <ListItemButton
                key={tk.name}
                selected={token === tk.name}
                onClick={() => { setToken(tk.name); setTokenOpen(false); }}
              >
                <ListItemIcon>
                  <TokenIcon sx={{ color: "white" }} />
                </ListItemIcon>
                <ListItemText primary={tk.name} />
              </ListItemButton>
            ))}
          </List>
        </DialogContent>
      </Dialog>
    </>
  );
}