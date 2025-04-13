"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Box, Typography, Card, CardContent, Chip, Grid, Divider, Button } from "@mui/material";
import { useWallet } from "../../../../context/WalletContext";
import { ethers } from "ethers";
import addresses from "@/utils/deployed-addresses.json";
import abis from "@/utils/deployed-abis.json";
import { getProductsWithContracts } from "@/utils/getProductsWithContracts";

export default function OrderDetailPage() {
  const { id } = useParams();
  const { provider } = useWallet();
  const [order, setOrder] = useState(null);
  const [isReleasing, setReleasing] = useState(false);
  const products = getProductsWithContracts();

  useEffect(() => {
    const fetchOrderDetails = async () => {
		if (!provider) return;
      try {
        const signer = await provider.getSigner();
        const escrowContract = new ethers.Contract(addresses.escrow, abis.Escrow, signer);
        const deal = await escrowContract.deals(id);

        const block = await provider.getBlock("latest");
        const date = new Date(block.timestamp * 1000).toISOString().split("T")[0];

        const matchedProduct = products.find(p => ethers.getAddress(p.tokenContract) === ethers.getAddress(deal.token) && p.sellerWallet.toLowerCase() === deal.seller.toLowerCase());

        const tokenMap = {
          [ethers.getAddress(addresses.tokenA)]: "ALPHA",
          [ethers.getAddress(addresses.tokenB)]: "BETA",
          [ethers.getAddress(addresses.tokenC)]: "CHARLIE",
          [ethers.getAddress(addresses.tokenD)]: "DELTA"
        };
        const tokenType = tokenMap[ethers.getAddress(deal.token)] || "Unknown";

        setOrder({
          id,
          productName: matchedProduct?.name || "Purchased Item",
          productImage: matchedProduct?.image || `https://picsum.photos/seed/${id}/100`,
          price: ethers.formatEther(deal.amount),
          tokenType,
          status: deal.released ? "Complete" : "On Delivery",
          transactionHash: "", // Optional: fetch with queryFilter if needed
          orderDate: date
        });
      } catch (err) {
        console.error("Failed to load order detail:", err);
      }
    };
    if (provider) fetchOrderDetails();
  }, [provider, id]);

  const handleConfirmArrival = async () => {
    setReleasing(true);
    try {
      const signer = await provider.getSigner();
      const escrowContract = new ethers.Contract(addresses.escrow, abis.Escrow, signer);
      const tx = await escrowContract.releaseToSeller(id);
      await tx.wait();
      alert("Token released to seller!");
      setOrder(prev => ({ ...prev, status: "Complete" }));
    } catch (err) {
      console.error("Release failed:", err);
      alert("Failed to release token to seller.");
    } finally {
      setReleasing(false);
    }
  };

  const handleDispute = async () => {
    try {
      const signer = await provider.getSigner();
      const escrowContract = new ethers.Contract(addresses.escrow, abis.Escrow, signer);
      const tx = await escrowContract.disputeDeal(id);
      await tx.wait();
      alert("Dispute raised successfully.");
      setOrder(prev => ({ ...prev, status: "Disputed" }));
    } catch (error) {
      console.error("Error raising dispute:", error);
      alert("Failed to raise dispute. Please try again.");
    }
  };

  if (!order) return <Typography sx={{ p: 4 }}>Loading order details...</Typography>;

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>Order Detail</Typography>
      <Divider sx={{ mb: 3 }} />
  
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <img src={order.productImage} alt={order.productName} style={{ width: "100%", borderRadius: 12 }} />
        </Grid>
        <Grid item xs={12} md={8}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h5" gutterBottom>{order.productName}</Typography>
              <Typography variant="body1" sx={{ mb: 1.5 }}>Deal ID: {order.id}</Typography>
              <Typography variant="body1" sx={{ mb: 1.5 }}>Price: {order.price} {order.tokenType}</Typography>
              <Typography variant="body1" sx={{ mb: 1.5 }}>Date: {order.orderDate}</Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>Status:</Typography>
              <Chip
                label={order.status}
                color={
                  order.status === "Complete"
                    ? "success"
                    : order.status === "Disputed"
                    ? "error"
                    : "warning"
                }
                sx={{ mb: 2 }}
              />
              <Divider sx={{ mb: 2 }} />
              {!["Complete", "Disputed"].includes(order.status) && (
                <>
                <Button variant="contained" color="primary" onClick={handleConfirmArrival} sx={{ mt: 2 }} disabled={isReleasing}>
                  {isReleasing ? "Processing..." : "Confirm Arrival"}
                </Button>
                
                <Button variant="contained" color="error" sx={{ mt: 2, ml:2 }} onClick={handleDispute}>
                  Raise Dispute
                </Button>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
  
}
