"use client";

import { Box, Container } from "@mui/material";
import SwapBox from "@/components/trade/SwapBox";
import TradeBox from "@/components/trade/TradeBox";

export default function SwapPage() {
	return (
		<Container maxWidth="sm">
			<Box mt={6}>
				<TradeBox>
					<SwapBox />
				</TradeBox>
			</Box>
		</Container>
	);
}
