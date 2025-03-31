"use client";
import { Box, Container, Typography } from "@mui/material";
import Header from "@/components/Header";
import LimitBox from "@/components/LimitBox";
import TradeBox from "@/components/TradeBox";

export default function LimitPage() {
	return (
		<Container>
			<Header />
			<Box mt={6}>
				<TradeBox>
					<LimitBox />
				</TradeBox>
			</Box>
		</Container>
	);
}
