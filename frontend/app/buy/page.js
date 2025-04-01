"use client";
import { Box, Container, Typography } from "@mui/material";
import Header from "@/components/Header";
import TradeBox from "@/components/TradeBox";
import BuyBox from "@/components/BuyBox";

export default function BuyPage() {
	return (
		<>
			<Header />
			<Container>
				<Box mt={6}>
					<TradeBox>
						<BuyBox />
					</TradeBox>
				</Box>
			</Container>
		</>
	);
}
