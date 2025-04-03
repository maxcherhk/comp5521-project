"use client";
import { Box, Container } from "@mui/material";
import LimitBox from "@/components/trade/LimitBox";
import TradeBox from "@/components/trade/TradeBox";

export default function LimitPage() {
	return (
		<Container maxWidth="sm">
			<Box mt={6}>
				<TradeBox>
					<LimitBox />
				</TradeBox>
			</Box>
		</Container>
	);
}
