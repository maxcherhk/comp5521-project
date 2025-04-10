"use client";

import React, { useState } from "react";
import { Box, Typography, TextField, Select, MenuItem, FormControl, InputLabel, Button, Card, CardContent, Divider } from "@mui/material";

export default function SellPage() {
	// State for form fields
	const [formData, setFormData] = useState({
		productName: "",
		description: "",
		price: "",
		tokenType: "Alpha", // Default token type
		imageUrl: "",
	});

	// State for form submission status
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Handle form field changes
	const handleChange = (e) => {
		const { name, value } = e.target;
		setFormData((prev) => ({
			...prev,
			[name]: value,
		}));
	};

	// Handle form submission
	const handleSubmit = async (e) => {
		e.preventDefault();
		setIsSubmitting(true);

		// Simulate API call or smart contract interaction
		try {
			console.log("Submitting product for sale:", formData);
			// Example: await api.submitProduct(formData);
			alert("Product listed for sale successfully!");
			setFormData({
				productName: "",
				description: "",
				price: "",
				tokenType: "Alpha",
				imageUrl: "",
			});
		} catch (error) {
			console.error("Error submitting product:", error);
			alert("Failed to list product. Please try again.");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Box sx={{ p: 4 }}>
			<Typography variant="h4" gutterBottom>
				Sell Your Product
			</Typography>
			<Divider sx={{ mb: 3 }} />

			<Card sx={{ borderRadius: 3, p: 2 }}>
				<CardContent>
					<form onSubmit={handleSubmit}>
						{/* Product Name */}
						<TextField label="Product Name" name="productName" value={formData.productName} onChange={handleChange} fullWidth required sx={{ mb: 3 }} />

						{/* Description */}
						<TextField label="Description" name="description" value={formData.description} onChange={handleChange} fullWidth multiline rows={4} required sx={{ mb: 3 }} />

						{/* Price */}
						<TextField label="Price" name="price" type="number" value={formData.price} onChange={handleChange} fullWidth required sx={{ mb: 3 }} />

						{/* Token Type */}
						<FormControl fullWidth required sx={{ mb: 3 }}>
							<InputLabel id="token-type-label">Token Type</InputLabel>
							<Select labelId="token-type-label" name="tokenType" value={formData.tokenType} onChange={handleChange}>
								<MenuItem value="Alpha">Alpha</MenuItem>
								<MenuItem value="Beta">Beta</MenuItem>
								<MenuItem value="Charlie">Charlie</MenuItem>
								<MenuItem value="Delta">Delta</MenuItem>
							</Select>
						</FormControl>

						{/* Image URL */}
						<TextField label="Image URL" name="imageUrl" value={formData.imageUrl} onChange={handleChange} fullWidth required sx={{ mb: 3 }} />

						{/* Submit Button */}
						<Button type="submit" variant="contained" color="primary" fullWidth disabled={isSubmitting}>
							{isSubmitting ? "Submitting..." : "List Product for Sale"}
						</Button>
					</form>
				</CardContent>
			</Card>
		</Box>
	);
}
