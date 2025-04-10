"use client";

import React from "react";
import { Box, Typography, Card, CardContent, Chip, Grid, Divider } from "@mui/material";

// Dummy order data
const orders = [
	{
		id: "1",
		productName: "Vintage Camera",
		productImage: "https://picsum.photos/id/26/100",
		price: "0.12 ETH",
		tokenType: "ALPHA",
		status: "On Delivery",
		transactionHash: "0x1234abcd5678efgh9012ijkl3456mnop7890qrst",
		orderDate: "2025-04-10",
	},
	{
		id: "2",
		productName: "Retro Watch",
		productImage: "https://picsum.photos/id/27/100",
		price: "0.08 ETH",
		tokenType: "BETA",
		status: "Arrived",
		transactionHash: "0x5678abcd1234efgh9012ijkl3456mnop7890qrst",
		orderDate: "2025-04-08",
	},
	{
		id: "3",
		productName: "Gaming Console",
		productImage: "https://picsum.photos/id/28/100",
		price: "0.5 ETH",
		tokenType: "GAMMA",
		status: "Complete",
		transactionHash: "0x9012abcd5678efgh1234ijkl3456mnop7890qrst",
		orderDate: "2025-04-05",
	},
];

export default function OrderListPage() {
	return (
		<Box sx={{ p: 4 }}>
			<Typography variant="h4" gutterBottom>
				My Orders
			</Typography>
			<Divider sx={{ mb: 3 }} />

			<Grid container spacing={3}>
				{orders.map((order) => (
					<Grid item xs={12} md={6} lg={4} key={order.id}>
						<Card sx={{ borderRadius: 3 }}>
							<CardContent>
								<Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
									<img src={order.productImage} alt={order.productName} style={{ width: 80, height: 80, borderRadius: 8, marginRight: 16 }} />
									<Box>
										<Typography variant="h6">{order.productName}</Typography>
										<Typography variant="body2" color="text.secondary">
											Ordered on: {order.orderDate}
										</Typography>
									</Box>
								</Box>

								<Typography variant="subtitle2">Price:</Typography>
								<Typography variant="body1" sx={{ mb: 2 }}>
									{order.price} ({order.tokenType})
								</Typography>

								<Typography variant="subtitle2">Transaction Hash:</Typography>
								<Typography
									variant="body2"
									color="primary"
									sx={{
										wordBreak: "break-all",
										mb: 2,
										cursor: "pointer",
										textDecoration: "underline",
									}}
									onClick={() => window.open(`https://etherscan.io/tx/${order.transactionHash}`, "_blank")}
								>
									{order.transactionHash}
								</Typography>

								<Typography variant="subtitle2">Status:</Typography>
								<Chip
									label={order.status}
									color={order.status === "Complete" ? "success" : order.status === "Arrived" ? "info" : order.status === "On Delivery" ? "warning" : "default"}
									sx={{ mb: 2 }}
								/>
							</CardContent>
						</Card>
					</Grid>
				))}
			</Grid>
		</Box>
	);
}
