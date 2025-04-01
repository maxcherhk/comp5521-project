"use client";

import { Box, Container } from "@mui/material";
import Header from "@/components/Header";
import SwapBox from "@/components/SwapBox";
import TradeBox from "@/components/TradeBox";
import BackgroundAnimation from "@/components/BackgroundAnimation";

export default function SwapPage() {
	return (
		<>
			<BackgroundAnimation />
			<Header />
			<Container maxWidth="sm">
				<Box mt={6}>
					<TradeBox>
						<SwapBox />
					</TradeBox>
				</Box>
			</Container>
		</>
	);
}
