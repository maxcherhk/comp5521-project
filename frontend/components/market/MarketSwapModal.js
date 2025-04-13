import React, { useState } from "react";
import { useEffect } from "react";
import {
	Box,
	Button,
	Modal,
	Typography,
	TextField,
	Grid,
	Alert,
	MenuItem,
	Select,
	FormControl,
	InputLabel,
} from "@mui/material";
const { getAllTokens } = require("../../utils/token-address");

const MarketSwapModal = ({ open, onClose, tokenType, exchangeRate, productPrice, userBalance, onTokenSelect }) => {
	const tokens = getAllTokens();
	const [selectedToken, setSelectedToken] = useState(tokens[0]?.name==tokenType?tokens[1]?.name:tokens[0]?.name || "");
	const [selectedBalance, setSelectedBalance] = useState("0");
	
	useEffect(() => {
		if (selectedToken && userBalance) {
			setSelectedBalance(userBalance[selectedToken] || "0");
		}
	}, [selectedToken, userBalance]);

	const calculateInputAmount = () => {
		return (parseFloat(productPrice) / exchangeRate).toFixed(4);
	};

	const handleSwap = () => {
		// Add swap logic here
		alert(`Swapped ${calculateInputAmount()} ${selectedToken} tokens to ${productPrice} ${tokenType}`);
		onClose();
	};

	const handleTokenChange = (event) => {
		const token = event.target.value;
		setSelectedToken(token);
		setSelectedBalance(userBalance[token] || "0");
	};
	

	const inputAmount = calculateInputAmount();
	const isInsufficientBalance = parseFloat(userBalance[tokenType]) < parseFloat(inputAmount);

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
						<FormControl fullWidth>
							<InputLabel id="token-select-label">Select Token</InputLabel>
							<Select labelId="token-select-label" value={selectedToken} onChange={handleTokenChange} fullWidth>
								{tokens
									.filter((token) => token.name !== tokenType)
									.map((token) => (
										<MenuItem key={token.name} value={token.name}>
											{token.name}
										</MenuItem>
									))}
							</Select>
							<Typography variant="body2" sx={{ mt: 1, mb: 1, color: "gray" }}>
								Balance: {selectedBalance}
							</Typography>
						</FormControl>
					</Grid>
					<Grid item xs={12}>
						<TextField
							label="Input Amount"
							type="text"
							fullWidth
							value={inputAmount} // Auto-calculated input amount
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
					{isInsufficientBalance && (
						<Grid item xs={12}>
							<Alert severity="warning">Insufficient balance to complete the swap.</Alert>
						</Grid>
					)}
				</Grid>
				<Button
					variant="contained"
					color="primary"
					fullWidth
					sx={{ mt: 3 }}
					onClick={handleSwap}
					disabled={isInsufficientBalance}
				>
					Swap
				</Button>
			</Box>
		</Modal>
	);
};

export default MarketSwapModal;
