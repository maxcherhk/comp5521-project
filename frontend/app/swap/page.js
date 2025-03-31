"use client";

import { Box, Container, Typography } from "@mui/material";
import Header from "@/components/Header";
import SwapBox from "@/components/SwapBox";
import TradeBox from "@/components/TradeBox";

export default function SwapPage() {
	return (
		<Container>
			<Header />
			<Box mt={6}>
				<TradeBox>
					<SwapBox />
				</TradeBox>
			</Box>
		</Container>
	);
}
