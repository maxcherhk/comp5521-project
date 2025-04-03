import { Box, Container } from "@mui/material";
import PoolList from "@/components/pool/PoolList"; // Adjust path based on your file structure

export default function PoolsPage() {
	return (
		<Container>
			<Box mt={6}>
				<PoolList />
			</Box>
		</Container>
	);
}
