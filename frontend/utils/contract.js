import { ethers, MaxUint256 } from "ethers";
import addresses from "./deployed-addresses.json"; // Import addresses from deployed contract addresses
import abis from "./contract-abis.json"; // Import ABIs from deployed contract ABIs

export const getContracts = async (signer) => {
	try {
		if (!signer) {
			throw new Error("No signer provided");
		}

		const signerAddress = await signer.getAddress();
		console.log("Signer address:", signerAddress);
		const token0 = new ethers.Contract(addresses.token0, abis.NewToken, signer);
		const token1 = new ethers.Contract(addresses.token1, abis.NewToken, signer);
		console.log(token1);
		const pool = new ethers.Contract(addresses.pool, abis.Pool, signer);

		const contracts = {
			token0: {
				contract: token0,
				address: addresses.token0,
			},
			token1: {
				contract: token1,
				address: addresses.token1,
			},
			pool: {
				contract: pool,
				address: addresses.pool,
			},
		};

		console.log("Contracts initialized with addresses:", {
			token0: contracts.token0.address,
			token1: contracts.token1.address,
			pool: contracts.pool.address,
		});

		return contracts;
	} catch (error) {
		console.error("Error in getContracts:", error);
		throw error;
	}
};

export const getTokenBalances = async (contracts, address) => {
	try {
		console.log("Getting token balances for address:", contracts);
		const token0Balance = await contracts.token0.contract.balanceOf(address);
		const token1Balance = await contracts.token1.contract.balanceOf(address);
		return {
			token0: ethers.formatEther(token0Balance),
			token1: ethers.formatEther(token1Balance),
		};
	} catch (error) {
		console.error("Error in getTokenBalances:", error);
		throw error;
	}
};

export const getPoolInfo = async (contracts) => {
	try {
		const token0Balance = await contracts.token0.contract.balanceOf(contracts.pool.address);
		const token1Balance = await contracts.token1.contract.balanceOf(contracts.pool.address);
		console.log("Token0 balance in pool:", token0Balance);
		console.log("Token1 balance in pool:", token1Balance);
		return {
			token0Balance: ethers.formatEther(token0Balance),
			token1Balance: ethers.formatEther(token1Balance),
		};
	} catch (error) {
		console.error("Error in getPoolInfo:", error);
		throw error;
	}
};
