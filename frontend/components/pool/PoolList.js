"use client";

import React, { useState } from "react";
import { Box, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, Paper } from "@mui/material";
import { useRouter } from "next/navigation";
import { useWallet } from "@/context/WalletContext"; // Adjust the import based on your context file location
import AddLiquidityModal from "@/components/pool/AddLiquidityModal";

const poolData = [
	{ id: 1, name: "ALPHA/BETA", fee: "0.05%", version: "v3", tvl: "$148.1M", apr: "25.211%", volume: "$204.6M" },
	{ id: 2, name: "BETA/CHARLIE", fee: "0.3%", version: "v3", tvl: "$141.0M", apr: "18.825%", volume: "$24.2M" },
	{ id: 3, name: "ALPHA/CHARLIE", fee: "0.3%", version: "v2", tvl: "$111.0M", apr: "0.006%", volume: "$6.5K" },
	{ id: 4, name: "ALPHA/DELTA", fee: "0.3%", version: "v3", tvl: "$71.5M", apr: "9.776%", volume: "$6.4M" },
];

const PoolTable = () => {
	const router = useRouter();
	const [isModalOpen, setIsModalOpen] = useState(false);

	const handleAddLiquidity = (poolId, amount) => {
		alert(`Adding ${amount} liquidity to pool with ID: ${poolId}`);
		// Add your logic here to update the pool data or make an API call
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
						{poolData.map((pool) => (
							<TableRow
								key={pool.id}
								hover
								sx={{
									cursor: "pointer",
								}}
								onClick={() => router.push(`pools/${pool.id}`)}
							>
								<TableCell sx={{ color: "white" }}>{pool.id}</TableCell>
								<TableCell sx={{ color: "white" }}>
									<Box display="flex" alignItems="center" gap={1}>
										{pool.name}
										<Box
											component="span"
											sx={{
												backgroundColor: "#333",
												color: "white",
												borderRadius: 1,
												fontSize: "0.75rem",
												px: 1,
											}}
										>
											{pool.version}
										</Box>
										<Box
											component="span"
											sx={{
												backgroundColor: "#333",
												color: "white",
												borderRadius: 1,
												fontSize: "0.75rem",
												px: 1,
											}}
										>
											{pool.fee}
										</Box>
									</Box>
								</TableCell>
								<TableCell align="right" sx={{ color: "white" }}>
									{pool.tvl}
								</TableCell>
								<TableCell align="right" sx={{ color: "white" }}>
									{pool.apr}
								</TableCell>
								<TableCell align="right" sx={{ color: "white" }}>
									{pool.volume}
								</TableCell>
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
