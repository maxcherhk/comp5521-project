"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Paper,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { useWallet } from "@/context/WalletContext";
import AddLiquidityModal from "@/components/pool/AddLiquidityModal";
import { getLivePoolStats } from "@/utils/token-address";

const PoolTable = () => {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pools, setPools] = useState([]);
  const { provider } = useWallet();

  useEffect(() => {
	const loadStats = async () => {
	  if (!provider) return;
	  const stats = await getLivePoolStats(provider);
	  setPools(stats);
	};
	loadStats();
  }, [provider]);
  const handleAddLiquidity = (poolId, amount) => {
    alert(`Adding ${amount} liquidity to pool with ID: ${poolId}`);
  };

  return (
    <Box sx={{ p: 4, backgroundColor: "#121212" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h6" color="white">
          Top Pools
        </Typography>
        <Button variant="contained" color="primary" onClick={() => setIsModalOpen(true)}>
          + Add Liquidity
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{ backgroundColor: "#1e1e1e" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: "white" }}>#</TableCell>
              <TableCell sx={{ color: "white" }}>Pool</TableCell>
              <TableCell sx={{ color: "white" }} align="right">
                TVL
              </TableCell>
              <TableCell sx={{ color: "white" }} align="right">
                APR
              </TableCell>
              <TableCell sx={{ color: "white" }} align="right">
                1D Vol
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
		  {pools.map((pool, idx) => (
			<TableRow key={pool.name} hover onClick={() => router.push(`pools/${pool.address}`)}>
				<TableCell sx={{ color: "white" }}>{idx + 1}</TableCell>
				<TableCell sx={{ color: "white" }}>{pool.name}</TableCell>
				<TableCell align="right" sx={{ color: "white" }}>${pool.tvl}</TableCell>
				<TableCell align="right" sx={{ color: "white" }}>{pool.apr}%</TableCell>
				<TableCell align="right" sx={{ color: "white" }}>${pool.volume}</TableCell>
			</TableRow>
			))}
          </TableBody>
        </Table>
      </TableContainer>

      <AddLiquidityModal open={isModalOpen} onClose={() => setIsModalOpen(false)} onAddLiquidity={handleAddLiquidity} />
    </Box>
  );
};

export default PoolTable;
