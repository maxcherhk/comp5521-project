"use client";

import { Box, Typography, Button, IconButton, Container, Divider, CircularProgress } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import SwapBox from "@/components/trade/SwapBox";
import { getLivePoolStats, getPoolByAddress } from "../../../../utils/token-address";
import { useWallet } from "../../../../context/WalletContext";

export default function PoolDetailPage() {
  const { id } = useParams(); // Pool address from URL
  const { provider } = useWallet(); // from your WalletContext
  const [poolInfo, setPoolInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(id);
    alert("Address copied to clipboard!");
  };

  useEffect(() => {
    const fetchStats = async () => {
      if (!provider || !id) return;

      const stats = await getLivePoolStats(provider);
      const pool = stats.find(p => p.address.toLowerCase() === id.toLowerCase());

      if (pool) {
        setPoolInfo({
          name: getPoolByAddress(id) || "Unknown Pool",
          address: id,
          tvl: `$${pool.tvl}`,
          volume: `$${pool.volume}`,
          apr: `${pool.apr}%`,
          version: "v1",
          fee: "variable",
        });
      }

      setLoading(false);
    };

    fetchStats();
  }, [provider, id]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!poolInfo) {
    return (
      <Box p={4}>
        <Typography variant="h6">Pool not found</Typography>
      </Box>
    );
  }

  return (
    <Container>
      <Box mt={6} sx={{ p: 4, backgroundColor: "#0d0d0d", color: "#fff" }}>
        {/* Breadcrumb & Address */}
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 4, alignItems: "center" }}>
          <Typography variant="button" color="grey.400">
            Explore &gt; Pools &gt; {poolInfo.name}
            <Typography component="span" variant="button" sx={{ color: "grey.400", display: "inline-flex", alignItems: "center", ml: 1 }}>
              {`${id.slice(0, 6)}...${id.slice(-4)}`}
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

        {/* Pool Title and Stats */}
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          {poolInfo.name}
          <Typography component="span" variant="body1" sx={{ color: "#999", ml: 1 }}>
            {poolInfo.version} • Fee: {poolInfo.fee}
          </Typography>
        </Typography>

        <Typography variant="h5" sx={{ mt: 2, fontWeight: 700 }}>
          TVL: {poolInfo.tvl}
        </Typography>
        <Typography variant="body1" sx={{ mt: 1 }}>
          Volume (1D): {poolInfo.volume} • APR: {poolInfo.apr}
        </Typography>

        <Divider sx={{ my: 4 }} />
        <SwapBox />
      </Box>
    </Container>
  );
}
