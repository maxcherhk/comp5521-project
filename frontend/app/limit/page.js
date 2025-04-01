"use client";
import { Box, Container, Typography } from "@mui/material";
import Header from "@/components/Header";
import LimitBox from "@/components/LimitBox";
import TradeBox from "@/components/TradeBox";
import BackgroundAnimation from "@/components/BackgroundAnimation";

export default function LimitPage() {
	return (
		<>
			<BackgroundAnimation />
			<Header />
			<Container maxWidth="sm">
				<Box mt={6}>
					<TradeBox>
						<LimitBox />
					</TradeBox>
				</Box>
			</Container>
		</>
	);
}
