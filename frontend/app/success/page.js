"use client";

import React, { useEffect } from "react";
import { Box, Typography, Button } from "@mui/material";
import { useRouter } from "next/navigation";

const SuccessPage = () => {
	const router = useRouter();

	const handleGoHome = () => {
		router.push("/"); // Navigate to the home page or another relevant page
	};

	useEffect(() => {
		const mintToken = async () => {
		  try {
			const walletAddress = localStorage.getItem("walletAddress");
			const token = localStorage.getItem("token");
			const amount = localStorage.getItem("amount");
	  
			if (!walletAddress || !token || !amount) return;
	  
			const res = await fetch("/api/mint-token", {
			  method: "POST",
			  headers: { "Content-Type": "application/json" },
			  body: JSON.stringify({ walletAddress, token, amount }),
			});
	  
			const data = await res.json();
			if (data.success) {
			  console.log("Tokens minted successfully");
			} else {
			  console.error("Mint failed", data);
			}
		  } catch (e) {
			console.error("Mint request error", e);
		  }
		};
	  
		mintToken();
	  }, []);

	return (
		<Box
			sx={{
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				padding: 4,
			}}
		>
			<Typography variant="h4" gutterBottom sx={{ color: "success.main" }}>
				Payment Successful!
			</Typography>
			<Typography variant="body1" sx={{ textAlign: "center" }}>
				Thank you for your purchase. Your transaction has been successfully processed.
			</Typography>
			<Typography variant="body2" sx={{ mb: 4, textAlign: "center" }}>
				You will receive the token shortly.
			</Typography>
			<Button variant="contained" color="primary" onClick={handleGoHome} sx={{ fontSize: "1rem", padding: "10px 20px" }}>
				Go to Home
			</Button>
		</Box>
	);
};

export default SuccessPage;
