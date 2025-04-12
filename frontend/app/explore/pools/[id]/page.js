"use client";

import { Box, Typography, Button, Menu, MenuItem, Input, Divider, Container, IconButton } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import SwapBox from "@/components/trade/SwapBox";
import addresses from "../../../../utils/deployed-addresses.json";
import abis from "../../../../utils/deployed-abis.json";
import { getPoolByAddress, getLivePoolStats } from "../../../../utils/token-address";

export default function PoolDetailPage() {
  const params = useParams();
  const poolAddress = params.id?.toLowerCase();

  const [poolName, setPoolName] = useState("Unknown");
  const [feeRate, setFeeRate] = useState("0.00%");
  const [tvl, setTvl] = useState("$0.00");
  const [volume, setVolume] = useState("$0.00");
  const [apr, setApr] = useState("0.00%");

  useEffect(() => {
    const loadPoolInfo = async () => {
      if (!poolAddress) return;
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const poolContract = new ethers.Contract(poolAddress, abis.Pool, provider);

        const fee = await poolContract.getFeeRate();
        const feeFormatted = (parseFloat(fee.toString()) / 100).toFixed(2) + "%";
        setFeeRate(feeFormatted);

        const stats = await getLivePoolStats(provider);
        const match = stats.find(p => p.address.toLowerCase() === poolAddress);
        if (match) {
          setPoolName(match.name);
          setTvl(`$${match.tvl}`);
          setVolume(`$${match.volume}`);
          setApr(`${match.apr}%`);
        }
      } catch (err) {
        console.error("Failed to fetch pool data", err);
      }
    };

    loadPoolInfo();
  }, [poolAddress]);

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(poolAddress);
    alert("Address copied to clipboard!");
  };

  return (
    <Container>
      <Box mt={6} sx={{ p: 4, backgroundColor: "#0d0d0d", color: "#fff" }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 4, alignItems: "center" }}>
          <Typography variant="button" color="grey.400">
            Explore &gt; Pools &gt; {poolName}
            <Typography component="span" variant="button" sx={{ color: "grey.400", display: "inline-flex", alignItems: "center", ml: 1 }}>
              {`${poolAddress?.slice(0, 6)}...${poolAddress?.slice(-4)}`}
              <IconButton onClick={handleCopyAddress} size="small" sx={{ color: "grey.400", ml: 0.5 }}>
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Typography>
          </Typography>
          <Box display="flex" gap={2}>
            <Button variant="contained" color="primary">Swap</Button>
            <Button variant="contained" color="primary">+ Add Liquidity</Button>
          </Box>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            {poolName}
            <Typography component="span" variant="body1" sx={{ color: "#999", ml: 1 }}>
              v1 • Fee: {feeRate}
            </Typography>
          </Typography>
          <Typography variant="h3" sx={{ mt: 2, fontWeight: 700 }}>{tvl}</Typography>
        </Box>

        <Typography variant="body1" sx={{ mb: 2 }}>
          Volume (1D): {volume} • APR: {apr}
        </Typography>

        <Divider sx={{ mb: 4 }} />

        <SwapBox />
      </Box>
    </Container>
  );
}
