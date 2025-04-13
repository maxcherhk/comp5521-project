import React, { useState, useEffect } from "react";
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
	Dialog,
	DialogTitle,
	DialogActions,
	DialogContent,
} from "@mui/material";
import { ethers } from "ethers";
import addresses from "@/utils/deployed-addresses.json";
import abis from "@/utils/deployed-abis.json";
const { getAllTokens } = require("../../utils/token-address");

const MarketSwapModal = ({ open, onClose, tokenType, productPrice, userBalance, provider, contracts, setBalances }) => {
	const tokens = getAllTokens();
	const [selectedToken, setSelectedToken] = useState(tokens[0]?.name === tokenType ? tokens[1]?.name : tokens[0]?.name || "");
	const [selectedBalance, setSelectedBalance] = useState("0");
	const [inputAmount, setInputAmount] = useState("");
	const [buyAmount, setBuyAmount] = useState("");
	const [showConfirm, setShowConfirm] = useState(false);

	useEffect(() => {
		if (selectedToken && userBalance) {
			setSelectedBalance(userBalance[selectedToken] || "0");
		}
	}, [selectedToken, userBalance]);

	useEffect(() => {
		const computeSwapValue = async () => {
			if (!provider || !inputAmount || isNaN(inputAmount)) return;

			try {
				const signer = await provider.getSigner();
				const router = new ethers.Contract(addresses.router, abis.Router, signer);

				const tokenIn = addresses[`token${selectedToken[0]}`];
				const tokenOut = addresses[`token${tokenType[0]}`];
				const amountIn = ethers.parseEther(inputAmount);

				const preview = await router.previewSwapWithBestRouteDefault(tokenIn, amountIn, tokenOut);
				const expectedOut = preview[1];

				setBuyAmount(ethers.formatEther(expectedOut));
			} catch (err) {
				console.error("Preview failed:", err);
				setBuyAmount("");
			}
		};

		computeSwapValue();
	}, [inputAmount, selectedToken, tokenType, provider]);

	const handleSwap = async () => {
		try {
			if (!inputAmount || !selectedToken || selectedToken === tokenType) {
				alert("Please enter a valid amount and select a different token.");
				return;
			}

			if (!provider) {
				alert("Wallet not connected.");
				return;
			}

			const signer = await provider.getSigner();
			const amountIn = ethers.parseEther(inputAmount);
			const tokenIn = addresses[`token${selectedToken[0]}`];
			const tokenOut = addresses[`token${tokenType[0]}`];
			const router = new ethers.Contract(addresses.router, abis.Router, signer);

			const preview = await router.previewSwapWithBestRouteDefault(tokenIn, amountIn, tokenOut);
			const minAmountOut = preview.expectedOutput * BigInt(99) / BigInt(100);

			const tokenContract = new ethers.Contract(tokenIn, abis.NewToken, signer);
			const approveTx = await tokenContract.approve(addresses.router, amountIn);
			await approveTx.wait();

			const tx = await router.swapWithBestRouteDefault(tokenIn, amountIn, tokenOut, minAmountOut);
			await tx.wait();

			if (contracts && typeof setBalances === "function") {
				const address = await signer.getAddress();
				const updated = await getTokenBalances(contracts, address);
				setBalances(updated);
			}

			setShowConfirm(true);
		} catch (err) {
			console.error("Swap failed:", err);
			alert(`Swap failed: ${err.reason || err.message}`);
		}
	};

	const handleTokenChange = (event) => {
		const token = event.target.value;
		setSelectedToken(token);
		setSelectedBalance(userBalance[token] || "0");
	};

	const isInsufficientBalance = parseFloat(selectedBalance) < parseFloat(inputAmount);
	const canSwap = !isNaN(buyAmount) && parseFloat(buyAmount) >= parseFloat(productPrice);

	const formattedBuyAmount = isNaN(buyAmount) ? "" : isNaN(parseFloat(buyAmount).toFixed(3))?"0.000":parseFloat(buyAmount).toFixed(3);
	const difference = isNaN(buyAmount) ? null : (parseFloat(buyAmount) - parseFloat(productPrice)).toFixed(3);
	const differenceColor = difference < 0 ? "error.main" : "success.main";
	const formattedDiff = difference > 0 ? `(+${difference})` : `(${difference})`;

	return (
		<>
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
									))
								}
								</Select>
								<Typography variant="body2" sx={{ mt: 1, mb: 1, color: "gray" }}>
									Balance: {selectedBalance}
								</Typography>
							</FormControl>
						</Grid>
						<Grid item xs={12}>
							<TextField
								label="Input Amount"
								type="number"
								fullWidth
								value={inputAmount}
								onChange={(e) => setInputAmount(e.target.value)}
							/>
						</Grid>
						<Grid item xs={12}>
							<TextField
								label={`Output Amount (${tokenType})`}
								type="text"
								fullWidth
								value={formattedBuyAmount}
								disabled
								helperText={difference !== null && !isNaN(difference) ? (
									<Typography component="span" sx={{ color: differenceColor }}>
										Target: {productPrice} {tokenType} {formattedDiff}
									</Typography>
								) : null}
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
						disabled={isInsufficientBalance || !canSwap}
					>
						Swap
					</Button>
				</Box>
			</Modal>
			<Dialog open={showConfirm} onClose={() => setShowConfirm(false)}>
				<DialogTitle>Swap Successful</DialogTitle>
				<DialogContent>
					<Typography>You can now proceed to buy with {tokenType}.</Typography>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setShowConfirm(false)} autoFocus>OK</Button>
				</DialogActions>
			</Dialog>
		</>
	);
};

export default MarketSwapModal;
