"use client";
import { Box, Container, Typography } from "@mui/material";
import TradeBox from "@/components/trade/TradeBox";
import SendBox from "@/components/trade/SendBox";

export default function SendPage() {
	return (
		<Container maxWidth="sm">
			<Box mt={6}>
				<TradeBox>
					<SendBox />
				</TradeBox>
			</Box>
		</Container>
	);
}
