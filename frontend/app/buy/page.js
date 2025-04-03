"use client";
import { Box, Container, Typography } from "@mui/material";
import TradeBox from "@/components/trade/TradeBox";
import BuyBox from "@/components/trade/BuyBox";

export default function BuyPage() {
	return (
		<Container maxWidth="sm">
			<Box mt={6}>
				<TradeBox>
					<BuyBox />
				</TradeBox>
			</Box>
		</Container>
	);
}
