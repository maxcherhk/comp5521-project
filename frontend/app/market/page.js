"use client";

import { useState } from "react";
import {
	Box,
	TextField,
	Grid,
	Card,
	CardMedia,
	CardContent,
	Typography,
	InputAdornment,
	Chip,
	CardActionArea,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { useRouter } from "next/navigation";

const dummyProducts = [
	{
		id: 1,
		name: "Vintage Camera",
		image: "https://picsum.photos/id/26/250",
		price: "0.12 ETH",
		condition: "Lightly Used",
	},
	{
		id: 2,
		name: "Gaming Headset",
		image: "https://picsum.photos/id/91/250",
		price: "15 USDT",
		condition: "Brand New",
	},
	{
		id: 3,
		name: "Mechanical Keyboard",
		image: "https://picsum.photos/id/119/250",
		price: "0.08 ETH",
		condition: "Used",
	},
	{
		id: 4,
		name: "Used Smartphone",
		image: "https://picsum.photos/250",
		price: "0.2 ETH",
		condition: "Heavily Used",
	},
];

// Get MUI color based on condition
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

export default function MarketplacePage() {
	const [search, setSearch] = useState("");
	const router = useRouter();

	const filteredProducts = dummyProducts.filter((product) => product.name.toLowerCase().includes(search.toLowerCase()));

	return (
		<Box sx={{ p: 4 }}>
			<Typography variant="h4" gutterBottom>
				🛒 DeFi Marketplace
			</Typography>

			<TextField
				placeholder="Search for items..."
				variant="outlined"
				fullWidth
				value={search}
				onChange={(e) => setSearch(e.target.value)}
				sx={{ mb: 4 }}
				InputProps={{
					startAdornment: (
						<InputAdornment position="start">
							<SearchIcon />
						</InputAdornment>
					),
				}}
			/>

			<Grid container spacing={3}>
				{filteredProducts.map((product) => (
					<Grid item xs={12} sm={6} md={4} lg={3} key={product.id}>
						<Card
							sx={{
								height: "100%",
								width: 250,
								display: "flex",
								flexDirection: "column",
								borderRadius: 3,
								boxShadow: 3,
								transition: "0.3s",
								"&:hover": { boxShadow: 6 },
							}}
						>
							<CardActionArea onClick={() => router.push(`/market/${product.id}`)} sx={{ height: "100%" }}>
								<CardMedia component="img" height="180" image={product.image} alt={product.name} />
								<CardContent sx={{ flexGrow: 1 }}>
									<Typography variant="h6" gutterBottom>
										{product.name}
									</Typography>
									<Typography variant="subtitle1" color="text.secondary">
										💰 {product.price}
									</Typography>
									<Chip
										label={product.condition}
										color={getConditionColor(product.condition)}
										variant="outlined"
										size="small"
										sx={{ mt: 1 }}
									/>
								</CardContent>
							</CardActionArea>
						</Card>
					</Grid>
				))}
			</Grid>
		</Box>
	);
}
