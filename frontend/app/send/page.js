"use client";
import { Box, Container, Typography } from "@mui/material";
import Header from "@/components/Header";
import TradeBox from "@/components/TradeBox";
import SendBox from "@/components/SendBox";

export default function SendPage() {
	return (
		<>
			<Header />
			<Container>
				<Box mt={6}>
					<TradeBox>
						<SendBox />
					</TradeBox>
				</Box>
			</Container>
		</>
	);
}
