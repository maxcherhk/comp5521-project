"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Avatar,
  Chip
} from "@mui/material";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import SendIcon from "@mui/icons-material/Send";
import CallReceivedIcon from "@mui/icons-material/CallReceived";
import TokenIcon from "@mui/icons-material/Token";
import { useWallet } from "@/context/WalletContext";
import addresses from "@/utils/deployed-addresses.json";
import abis from "@/utils/deployed-abis.json";
import { ethers, Interface } from "ethers";

export default function WalletDetailPage() {
  const { isWalletConnected, provider, account } = useWallet();
  const [tokenBalances, setTokenBalances] = useState({});
  const [transactionHistory, setTransactionHistory] = useState([]);

  const walletAddress = account || "0x...";

  useEffect(() => {
    const fetchBalances = async () => {
      if (!provider || !isWalletConnected) return;

      try {
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        const tokens = ["ALPHA", "BETA", "CHARLIE", "DELTA"];
        const balances = {};

        for (const token of tokens) {
          const symbolKey = `token${token[0]}`;
          const tokenAddress = addresses[symbolKey];
          const contract = new ethers.Contract(tokenAddress, abis.NewToken, provider);
          const bal = await contract.balanceOf(address);
          balances[token] = ethers.formatEther(bal);
        }

        setTokenBalances(balances);
      } catch (err) {
        console.error("Failed to fetch balances:", err);
      }
    };

    fetchBalances();
  }, [provider, isWalletConnected]);

  useEffect(() => {
    const fetchEvents = async () => {
      if (!provider || !isWalletConnected || !account) return;

      try {
        const logs = [];
        const tokens = ["ALPHA", "BETA", "CHARLIE", "DELTA"];
        const latestBlock = await provider.getBlockNumber();
        const fromBlock = Math.max(latestBlock - 1000, 0);

        for (const token of tokens) {
          const symbolKey = `token${token[0]}`;
          const tokenAddress = addresses[symbolKey];
          const tokenContract = new ethers.Contract(tokenAddress, abis.NewToken, provider);
          const events = await tokenContract.queryFilter(tokenContract.filters.Minted(), fromBlock, latestBlock);

          for (const log of events) {
            if (log.args.to.toLowerCase() === account.toLowerCase()) {
              const block = await provider.getBlock(log.blockNumber);
              logs.push({
                date: new Date(block.timestamp * 1000).toLocaleDateString(),
                type: "Mint",
                amount: ethers.formatEther(log.args.amount),
                token,
                hash: log.transactionHash
              });
            }
          }
        }

        const poolAddresses = Object.entries(addresses)
          .filter(([key]) => key.startsWith("pool"))
          .map(([, value]) => value);

        for (const poolAddress of poolAddresses) {
          const pool = new ethers.Contract(poolAddress, abis.Pool, provider);
          const events = await pool.queryFilter(pool.filters.Swapped(null, null, null, null), fromBlock, latestBlock);

          for (const log of events) {
            if (!log.args) continue;
            const block = await provider.getBlock(log.blockNumber);
            if (log.args.tokenIn && log.args.tokenOut && log.args.amountIn) {
              logs.push({
                date: new Date(block.timestamp * 1000).toLocaleDateString(),
                type: "Swap",
                amount: ethers.formatEther(log.args.amountIn),
                token: `${log.args.tokenIn} → ${log.args.tokenOut}`,
                hash: log.transactionHash
              });
            }
          }
        }

        logs.sort((a, b) => (a.date > b.date ? -1 : 1));
        setTransactionHistory(logs);
      } catch (err) {
        console.error("Failed to fetch transaction history:", err);
      }
    };

    fetchEvents();
  }, [provider, isWalletConnected, account]);

  return (
    <Box sx={{ p: 4 }}>
      {/* Page Title */}
      <Typography variant="h4" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <AccountBalanceWalletIcon fontSize="large" color="primary" />
        My Wallet
      </Typography>
      <Divider sx={{ mb: 3 }} />

      {/* Wallet Address */}
      <Card sx={{ mb: 3, borderRadius: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <AccountBalanceWalletIcon color="primary" />
            Wallet Address:
          </Typography>
          <Typography
            variant="body1"
            color="primary"
            sx={{ wordBreak: "break-all", cursor: "pointer", textDecoration: "underline", mt: 1 }}
            onClick={() => window.open(`https://etherscan.io/address/${walletAddress}`, "_blank")}
          >
            {walletAddress}
          </Typography>
        </CardContent>
      </Card>

      {/* Token Balances */}
      <Typography variant="h5" gutterBottom>
        Token Balances
      </Typography>
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {Object.entries(tokenBalances).map(([token, balance]) => (
          <Grid item xs={12} md={6} lg={3} key={token}>
            <Card sx={{ borderRadius: 3, textAlign: "center", boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)" }}>
              <CardContent>
                <Avatar sx={{ bgcolor: "#1976d2", width: 56, height: 56, mb: 2, mx: "auto" }}>
                  <TokenIcon />
                </Avatar>
                <Typography variant="subtitle2">{token}</Typography>
                <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                  {parseFloat(balance).toFixed(4)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Transaction History */}
      <Typography variant="h5" gutterBottom>
        Transaction History
      </Typography>
      <Card sx={{ borderRadius: 3, boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)" }}>
        <CardContent>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Token</TableCell>
                <TableCell>Transaction Hash</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transactionHistory.length > 0 ? (
                transactionHistory.map((tx, index) => (
                  <TableRow key={index}>
                    <TableCell>{tx.date}</TableCell>
                    <TableCell>
                      <Chip
                        icon={tx.type === "Sent" ? <SendIcon /> : <CallReceivedIcon />}
                        label={tx.type}
                        color={tx.type === "Sent" ? "error" : "success"}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{tx.amount}</TableCell>
                    <TableCell>{tx.token}</TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        color="primary"
                        sx={{ wordBreak: "break-all", cursor: "pointer", textDecoration: "underline" }}
                        onClick={() => window.open(`https://etherscan.io/tx/${tx.hash}`, "_blank")}
                      >
                        {tx.hash}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    No transactions found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Box>
  );
}
