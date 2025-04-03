"use client";

import React from "react";
import { Box, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, Paper } from "@mui/material";
import { useRouter } from "next/navigation";

const poolData = [
	{ id: 1, name: "USDC/ETH", fee: "0.05%", version: "v3", tvl: "$148.1M", apr: "25.211%", volume: "$204.6M" },
	{ id: 2, name: "WBTC/USDC", fee: "0.3%", version: "v3", tvl: "$141.0M", apr: "18.825%", volume: "$24.2M" },
	{ id: 3, name: "WISE/ETH", fee: "0.3%", version: "v2", tvl: "$111.0M", apr: "0.006%", volume: "$6.5K" },
	{ id: 4, name: "ETH/USDT", fee: "0.3%", version: "v3", tvl: "$71.5M", apr: "9.776%", volume: "$6.4M" },
	{ id: 5, name: "WBTC/ETH", fee: "0.3%", version: "v3", tvl: "$66.7M", apr: "4.347%", volume: "$2.6M" },
	{ id: 6, name: "beraSTONE/ETH", fee: "0.05%", version: "v3", tvl: "$62.3M", apr: "0.173%", volume: "$590.2K" },
	{ id: 7, name: "DAI/USDC", fee: "0.01%", version: "v3", tvl: "$62.0M", apr: "0.199%", volume: "$3.4M" },
	{ id: 8, name: "WBTC/USDT", fee: "0.05%", version: "v3", tvl: "$48.3M", apr: "14.229%", volume: "$37.7M" },
	{ id: 9, name: "WBTC/cbBTC", fee: "0.01%", version: "v3", tvl: "$47.4M", apr: "1.383%", volume: "$18.0M" },
	{ id: 10, name: "ETH/USDC", fee: "0.05%", version: "v3", tvl: "$45.7M", apr: "36.151%", volume: "$90.5M" },
];

const PoolTable = () => {
	const router = useRouter();

	return (
		<Box sx={{ p: 4, backgroundColor: "#121212" }}>
			<Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
				<Typography variant="h6" color="white">
					Top Pools
				</Typography>
				<Button variant="contained" color="primary">
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
		</Box>
	);
};

export default PoolTable;
