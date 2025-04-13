"use client";

import React, { useEffect, useState } from "react";
import { Box, Typography, Card, CardContent, Chip, Grid, Divider } from "@mui/material";
import { useRouter } from "next/navigation";
import { useWallet } from "../../../context/WalletContext";
import { ethers } from "ethers";
import addresses from "@/utils/deployed-addresses.json";
import abis from "@/utils/deployed-abis.json";
import { getProductsWithContracts } from "@/utils/getProductsWithContracts";

export default function OrderListPage() {
	const router = useRouter();
	const { provider } = useWallet();
	const [orders, setOrders] = useState([]);
	const products = getProductsWithContracts();
	console.log("Products:", products);
	useEffect(() => {
		const fetchOrders = async () => {
			try {
				const signer = await provider.getSigner();
				const buyer = await signer.getAddress();
				const escrowContract = new ethers.Contract(addresses.escrow, abis.Escrow, signer);
				const filter = escrowContract.filters.DealCreated(buyer);
				const events = await escrowContract.queryFilter(filter);

				const fetchedOrders = await Promise.all(
					events.map(async (event, idx) => {
						const { seller, token, amount, dealId, productId } = event.args;
						const product = products.find(p => p.id === Number(productId));
						const txHash = event.transactionHash;
						const block = await provider.getBlock(event.blockNumber);
						const date = new Date(block.timestamp * 1000).toISOString().split("T")[0];
						return {
							id: idx + 1,
							productName: product?.name || "Purchased Item",
							productImage: product?.image || `https://picsum.photos/id/100`,
							price: ethers.formatEther(amount),
							tokenType: Object.keys(addresses).find(key => addresses[key] === token)?.replace("token", "") || token,
							status: "On Delivery",
							transactionHash: txHash,
							orderDate: date,
						};
					})
				);
				setOrders(fetchedOrders);
			} catch (err) {
				console.error("Failed to load orders:", err);
			}
		};

		if (provider) fetchOrders();
	}, [provider]);

	const handleCardClick = (orderId) => {
		router.push(`/user/order/${orderId}`);
	};

	return (
		<Box sx={{ p: 4 }}>
			<Typography variant="h4" gutterBottom>My Orders</Typography>
			<Divider sx={{ mb: 3 }} />

			<Grid container spacing={3}>
				{orders.map((order) => (
					<Grid item xs={12} md={6} lg={4} key={order.id}>
						<Card
							sx={{
								borderRadius: 3,
								cursor: "pointer",
								transition: "transform 0.2s ease-in-out",
								"&:hover": {
									transform: "scale(1.02)",
								},
							}}
							onClick={() => handleCardClick(order.id)}
						>
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
									sx={{ wordBreak: "break-all", mb: 2, cursor: "pointer", textDecoration: "underline" }}
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
