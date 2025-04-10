import React, { useState } from "react";
import { Box, Button, Modal, Typography, TextField, Grid } from "@mui/material";

const MarketSwapModal = ({ open, onClose, tokenType, exchangeRate, productPrice }) => {
	const [inputAmount, setInputAmount] = useState("");

	// Calculate the input amount based on the fixed output (productPrice) and exchange rate
	const calculateInputAmount = () => {
		return (parseFloat(productPrice) / exchangeRate).toFixed(4);
	};

	const handleSwap = () => {
		// Add swap logic here
		alert(`Swapped ${calculateInputAmount()} tokens to ${productPrice} ${tokenType}`);
		onClose();
	};

	return (
		<Modal open={open} onClose={onClose}>
			<Box
				sx={{
					position: "absolute",
					top: "50%",
					left: "50%",
					transform: "translate(-50%, -50%)",
					width: 400,
					bgcolor: "background.paper",
					boxShadow: 24,
					p: 4,
					borderRadius: 2,
				}}
			>
				<Typography variant="h6" gutterBottom>
					DeFi Swap
				</Typography>
				<Typography variant="body2" gutterBottom>
					Swap any token to {tokenType}
				</Typography>
				<Grid container spacing={2} sx={{ mt: 2 }}>
					<Grid item xs={12}>
						<TextField
							label="Input Amount"
							type="text"
							fullWidth
							value={calculateInputAmount()} // Auto-calculated input amount
							disabled
						/>
					</Grid>
					<Grid item xs={12}>
						<TextField
							label={`Output Amount (${tokenType})`}
							type="text"
							fullWidth
							value={productPrice} // Fixed output amount
							disabled
						/>
					</Grid>
				</Grid>
				<Button variant="contained" color="primary" fullWidth sx={{ mt: 3 }} onClick={handleSwap}>
					Swap
				</Button>
			</Box>
		</Modal>
	);
};

export default MarketSwapModal;
