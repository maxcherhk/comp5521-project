"use client";

import { Box, Typography, Card, CardContent, Grid, Button, Divider, Container } from "@mui/material";
import { useParams } from "next/navigation";
import SwapBox from "@/components/trade/SwapBox";
import { IconButton } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { ArrowRightSharp } from "@mui/icons-material";
const { getPoolByAddress } = require("../../../../utils/token-address"); // Adjust the import based on your file structure

export default function PoolDetailPage() {
	const params = useParams();

	const pool = {
		name: "ALPHA / BETA",
		version: "v3",
		fee: "0.05%",
		tvl: "$148.3M",
		volume: "$204.6M",
		fees: "$102.3K",
		address: "0x1234567890abcdef1234567890abcdef12345678",
	};

	const handleCopyAddress = () => {
		navigator.clipboard.writeText(pool.address);
		alert("Address copied to clipboard!");
	};

	return (
		<Container>
			<Box mt={6} sx={{ p: 4, backgroundColor: "#0d0d0d", color: "#fff" }}>
				{/* Top navigation */}
				<Box sx={{ display: "flex", justifyContent: "space-between", mb: 4, alignItems: "center" }}>
					<Typography variant="button" color="grey.400">
						Explore &gt; Pools &gt; {pool.name}
						<Typography component="span" variant="button" sx={{ color: "grey.400", display: "inline-flex", alignItems: "center", ml: 1 }}>
							{`${pool.address.slice(0, 6)}...${pool.address.slice(-4)}`}
							<IconButton onClick={handleCopyAddress} size="small" sx={{ color: "grey.400", ml: 0.5 }}>
								<ContentCopyIcon fontSize="small" />
							</IconButton>
						</Typography>
					</Typography>
					<Box display="flex" gap={2}>
						<Button variant="contained" color="primary">
							Swap
						</Button>
						<Button variant="contained" color="primary">
							+ Add Liquidity
						</Button>
					</Box>
				</Box>

				{/* Title and stats */}
				<Box sx={{ mb: 4 }}>
					<Typography variant="h4" sx={{ fontWeight: 600 }}>
						{pool.name}{" "}
						<Typography component="span" variant="body1" sx={{ color: "#999", ml: 1 }}>
							{pool.version} {pool.fee}
						</Typography>
					</Typography>
					<Typography variant="h3" sx={{ mt: 2, fontWeight: 700 }}>
						{pool.tvl}
					</Typography>
				</Box>
				<Divider sx={{ mb: 4 }} />
				<SwapBox />
			</Box>
		</Container>
	);
}
