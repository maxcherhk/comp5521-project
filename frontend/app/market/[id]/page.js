"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Box, Typography, Card, CardMedia, Button, Chip, Divider, Grid } from "@mui/material";
import { useWallet } from "../../../context/WalletContext"; // Import WalletContext
import MarketSwapModal from "@/components/market/MarketSwapModal"; // Import the swap modal

// Dummy single product getter
const getProductById = (id) => ({
	id,
	name: "Vintage Camera",
	image: "https://picsum.photos/id/26/250",
	price: "0.12 ETH",
	condition: "Lightly Used",
	description: "Classic 35mm film camera, great for collectors. Fully functional and comes with strap and case.",
	sellerWallet: "0xAbC123...4567",
	tokenType: "ALPHA",
	tokenContract: "0xTokenContractAddress",
	shipping: "Free shipping worldwide",
	shippingTime: "3-5 business days",
});

const getConditionColor = (condition) => {
	switch (condition.toLowerCase()) {
		case "brand new":
			return "success";
		case "lightly used":
			return "info";
		case "used":
			return "warning";
		case "heavily used":
			return "error";
		default:
			return "default";
	}
};

export default function ProductDetailPage() {
	const { id } = useParams();
	const product = getProductById(id);

	const { balance0, balance1 } = useWallet();
	console.log("Balance0:", balance0);

	const [isSwapModalOpen, setSwapModalOpen] = useState(false);

	const handleOpenSwapModal = () => setSwapModalOpen(true);
	const handleCloseSwapModal = () => setSwapModalOpen(false);

	return (
		<Box
			sx={{
				display: "flex",
				justifyContent: "center",
				p: 4,
			}}
		>
			<Grid container spacing={4} p={2} sx={{ backgroundColor: "#141a2a" }}>
				<Grid item xs={12} md={6}>
					<Card sx={{ borderRadius: 3 }}>
						<CardMedia component="img" height="450" image={product.image} alt={product.name} sx={{ objectFit: "cover" }} />
					</Card>
				</Grid>

				<Grid item xs={12} md={6}>
					<Typography variant="h4" gutterBottom>
						{product.name}
					</Typography>

					<Chip label={product.condition} color={getConditionColor(product.condition)} variant="outlined" sx={{ mb: 2 }} />

					<Typography variant="h5" color="primary" sx={{ mt: 1, fontWeight: 600 }}>
						💰 {product.price}
					</Typography>

					<Typography variant="body1" sx={{ mt: 3 }}>
						{product.description}
					</Typography>

					<Divider sx={{ my: 3 }} />

					<Typography variant="subtitle2">Seller Wallet:</Typography>
					<Typography variant="body1" sx={{ mb: 3 }}>
						{product.sellerWallet}
					</Typography>

					<Typography variant="subtitle2">Token Type:</Typography>
					<Typography variant="body1" sx={{ mb: 3 }}>
						{product.tokenType}
					</Typography>

					<Typography variant="subtitle2">Smart Contract:</Typography>
					<Typography variant="body1" sx={{ mb: 3 }}>
						{product.tokenContract}
					</Typography>

					<Typography variant="subtitle2">Shipping:</Typography>
					<Typography variant="body1" sx={{ mb: 3 }}>
						{product.shipping}
					</Typography>

					<Typography variant="subtitle2">Shipping Time:</Typography>
					<Typography variant="body1" sx={{ mb: 3 }}>
						{product.shippingTime}
					</Typography>

					<Button variant="contained" color="primary" size="large" sx={{ mr: 2 }}>
						Buy with {product.tokenType}
					</Button>
					<Button variant="contained" onClick={handleOpenSwapModal} color="secondary" size="large">
						Swap to Buy
					</Button>
				</Grid>
			</Grid>

			{/* DeFi Swap Modal */}
			<MarketSwapModal
				open={isSwapModalOpen}
				onClose={handleCloseSwapModal}
				tokenType={product.tokenType}
				exchangeRate={0.05} // Example exchange rate
				productPrice={product.price.replace(" ETH", "")} // Example product price
			/>
		</Box>
	);
}
