"use client";

import React, { useState } from "react";
import { Box, Typography, Card, CardContent, Chip, Button, Divider, Grid } from "@mui/material";

// Dummy order data (replace with actual API or smart contract data)
const order = {
	id: "1",
	productName: "Vintage Camera",
	productImage: "https://picsum.photos/id/26/250",
	price: "0.12 ETH",
	tokenType: "ALPHA",
	status: "On Delivery", // Status can be "On Delivery", "Arrived", "Complete", "Disputed"
	transactionHash: "0x1234abcd5678efgh9012ijkl3456mnop7890qrst",
	orderDate: "2025-04-10",
	sellerWallet: "0xAbC123...4567",
	buyerWallet: "0xDeF456...7890",
	description: "Classic 35mm film camera, great for collectors. Fully functional and comes with strap and case.",
};

export default function OrderDetailPage() {
	const [orderStatus, setOrderStatus] = useState(order.status);

	// Simulate smart contract interaction for confirming the product's arrival
	const handleConfirmArrival = async () => {
		try {
			// Simulate smart contract call
			console.log("Processing transaction to confirm arrival...");
			// Example: await smartContract.confirmArrival(order.id);
			setOrderStatus("Complete");
			alert("Product confirmed as arrived. Tokens have been sent to the seller.");
		} catch (error) {
			console.error("Error confirming arrival:", error);
			alert("Failed to confirm arrival. Please try again.");
		}
	};

	// Simulate smart contract interaction for disputing the order
	const handleDispute = async () => {
		try {
			// Simulate smart contract call
			console.log("Processing transaction to dispute the order...");
			// Example: await smartContract.raiseDispute(order.id);
			setOrderStatus("Disputed");
			alert("Dispute raised. The issue will be reviewed.");
		} catch (error) {
			console.error("Error raising dispute:", error);
			alert("Failed to raise dispute. Please try again.");
		}
	};

	return (
		<Box sx={{ p: 4 }}>
			<Typography variant="h4" gutterBottom>
				Order Details
			</Typography>
			<Divider sx={{ mb: 3 }} />

			<Grid container spacing={4}>
				<Grid item xs={12} md={6}>
					<Card sx={{ borderRadius: 3 }}>
						<img src={order.productImage} alt={order.productName} style={{ width: "100%", height: "auto", borderRadius: "12px" }} />
					</Card>
				</Grid>

				<Grid item xs={12} md={6}>
					<CardContent>
						<Typography variant="h5" gutterBottom>
							{order.productName}
						</Typography>
						<Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
							{order.description}
						</Typography>

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

						<Typography variant="subtitle2">Order Date:</Typography>
						<Typography variant="body1" sx={{ mb: 2 }}>
							{order.orderDate}
						</Typography>

						<Typography variant="subtitle2">Seller Wallet:</Typography>
						<Typography variant="body1" sx={{ mb: 2 }}>
							{order.sellerWallet}
						</Typography>

						<Typography variant="subtitle2">Buyer Wallet:</Typography>
						<Typography variant="body1" sx={{ mb: 2 }}>
							{order.buyerWallet}
						</Typography>

						<Typography variant="subtitle2">Status:</Typography>
						<Chip
							label={orderStatus}
							color={
								orderStatus === "Complete"
									? "success"
									: orderStatus === "Arrived"
									? "info"
									: orderStatus === "On Delivery"
									? "warning"
									: orderStatus === "Disputed"
									? "error"
									: "default"
							}
							sx={{ mb: 3 }}
						/>

						{/* Buttons for actions based on status */}
						{orderStatus === "On Delivery" && (
							<Box>
								<Button variant="contained" color="success" sx={{ mr: 2 }} onClick={handleConfirmArrival}>
									Confirm Arrival
								</Button>
								<Button variant="contained" color="error" onClick={handleDispute}>
									Raise Dispute
								</Button>
							</Box>
						)}
					</CardContent>
				</Grid>
			</Grid>
		</Box>
	);
}
