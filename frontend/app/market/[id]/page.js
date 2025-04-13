"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Box, Typography, Card, CardMedia, Button, Chip, Divider, Grid, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import { useWallet } from "../../../context/WalletContext";
import MarketSwapModal from "@/components/market/MarketSwapModal";
import { getProductsWithContracts } from "@/utils/getProductsWithContracts";
import { ethers } from "ethers";
import addresses from "@/utils/deployed-addresses.json";
import abis from "@/utils/deployed-abis.json";
import { useRouter } from "next/navigation";

const getConditionColor = (condition) => {
  switch (condition.toLowerCase()) {
    case "brand new": return "success";
    case "lightly used": return "info";
    case "used": return "warning";
    case "heavily used": return "error";
    default: return "default";
  }
};

export default function ProductDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const products = getProductsWithContracts();
  const product = products.find((p) => p.id === parseInt(id));

  const { isWalletConnected, provider, balances } = useWallet();
  const [isSwapModalOpen, setSwapModalOpen] = useState(false);
  const [isConfirmOpen, setConfirmOpen] = useState(false);
  const [isProcessing, setProcessing] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const [blockNumber, setBlockNumber] = useState(null);

  const handleOpenSwapModal = () => setSwapModalOpen(true);
  const handleCloseSwapModal = () => setSwapModalOpen(false);

  const handleBuyClick = () => {
    setConfirmOpen(true);
  };

  const handleConfirmPurchase = async () => {
	setProcessing(true);
	try {
	  const signer = await provider.getSigner();
	  const buyer = await signer.getAddress();
  
	  const tokenKey = `token${product.tokenType[0]}`;
	  const tokenAddress = ethers.getAddress(addresses[tokenKey]);
	  const escrowAddress = ethers.getAddress(addresses.escrow);
	  const seller = ethers.getAddress(product.sellerWallet);
  
	  const tokenContract = new ethers.Contract(tokenAddress, abis.NewToken, signer);
	  const escrowContract = new ethers.Contract(escrowAddress, abis.Escrow, signer);
  
	  const amount = ethers.parseEther(product.price);
  
	  const approveTx = await tokenContract.approve(escrowAddress, amount);
	  await approveTx.wait();
  
	  const holdTx = await escrowContract.hold(seller, tokenAddress, amount, product.id);
	  console.log("Submitted TX Hash:", holdTx.hash);
	  const receipt = await holdTx.wait();
	  console.log("Transaction confirmed in block:", receipt.blockNumber);
	  setTxHash(holdTx.hash);
	  setBlockNumber(receipt.blockNumber);
	} catch (err) {
	  console.error("Escrow transfer failed:", err);
	  alert("Failed to process payment: " + err.message);
	} finally {
	  setProcessing(false);
	  setConfirmOpen(false);
	}
  };

  return (
    <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
      <Grid container spacing={4} p={2} sx={{ backgroundColor: "#141a2a" }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3 }}>
            <CardMedia component="img" height="450" image={product.image} alt={product.name} sx={{ objectFit: "cover" }} />
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography variant="h4" gutterBottom>{product.name}</Typography>
          <Chip label={product.condition} color={getConditionColor(product.condition)} variant="outlined" sx={{ mb: 2 }} />
          <Typography variant="h5" color="primary" sx={{ mt: 1, fontWeight: 600 }}>💰 {product.price} {product.token}</Typography>
          <Typography variant="body1" sx={{ mt: 3 }}>{product.description}</Typography>
          <Divider sx={{ my: 3 }} />
          <Typography variant="subtitle2">Seller Wallet:</Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>{product.sellerWallet}</Typography>
          <Typography variant="subtitle2">Token Type:</Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>{product.tokenType}</Typography>
          <Typography variant="subtitle2">Smart Contract:</Typography>
          <Typography
            variant="body1"
            color="primary"
            sx={{ mb: 3, cursor: "pointer" }}
            onClick={() => window.open(`https://etherscan.io/address/${product.tokenContract}`, "_blank")}
          >
            View on Etherscan
          </Typography>
          <Typography variant="subtitle2">Shipping:</Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>{product.shipping}</Typography>
          <Typography variant="subtitle2">Shipping Time:</Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>{product.shippingTime}</Typography>
          <Button variant="contained" color="primary" size="large" sx={{ mr: 2 }} onClick={handleBuyClick} disabled={isProcessing}>
            Buy with {product.tokenType}
          </Button>
          <Button variant="contained" color="secondary" size="large" onClick={handleOpenSwapModal}>
			Swap to buy
		  </Button>
		  {txHash && (
			<Box sx={{ mt: 3, p: 2, backgroundColor: "#1e1e1e", borderRadius: 2 }}>
				<Typography variant="subtitle1" sx={{ color: "white", fontWeight: 600, mb: 1 }}>
				Transaction Submitted
				</Typography>
				<Typography variant="body1" sx={{ wordBreak: "break-word", color: "#90caf9", mb: 1 }}>
				Hash:{" "}
				<a
					href={`https://etherscan.io/tx/${txHash}`}
					target="_blank"
					rel="noopener noreferrer"
					style={{ color: "#90caf9", fontSize: "1rem" }}
				>
					{txHash}
				</a>
				</Typography>
				<Typography variant="body1" sx={{ color: "white" }}>
				Block Number: {blockNumber}
				</Typography>
			</Box>
			)}

        </Grid>
      </Grid>

      <MarketSwapModal
        open={isSwapModalOpen}
        onClose={handleCloseSwapModal}
        tokenType={product.tokenType}
        exchangeRate={0.05}
        productPrice={product.price}
        userBalance={balances}
      />

      <Dialog open={isConfirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Confirm Purchase</DialogTitle>
        <DialogContent>
          <Typography>
            You are about to transfer {product.price} {product.tokenType} to an escrow contract. Confirm?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirmPurchase} variant="contained" color="primary" disabled={isProcessing}>
            {isProcessing ? "Processing..." : "Yes"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
