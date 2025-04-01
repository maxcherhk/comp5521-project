"use client";
import { Box, Container, Typography } from "@mui/material";
import Header from "@/components/Header";
import TradeBox from "@/components/TradeBox";
import BuyBox from "@/components/BuyBox";
import BackgroundAnimation from "@/components/BackgroundAnimation";

export default function BuyPage() {
	return (
		<>
			<BackgroundAnimation />
			<Header />
			<Container maxWidth="sm">
				<Box mt={6}>
					<TradeBox>
						<BuyBox />
					</TradeBox>
				</Box>
			</Container>
		</>
	);
}
