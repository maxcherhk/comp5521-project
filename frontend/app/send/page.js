"use client";
import { Box, Container, Typography } from "@mui/material";
import Header from "@/components/Header";
import TradeBox from "@/components/TradeBox";
import SendBox from "@/components/SendBox";
import BackgroundAnimation from "@/components/BackgroundAnimation";

export default function SendPage() {
	return (
		<>
			<BackgroundAnimation />
			<Header />
			<Container maxWidth="sm">
				<Box mt={6}>
					<TradeBox>
						<SendBox />
					</TradeBox>
				</Box>
			</Container>
		</>
	);
}
