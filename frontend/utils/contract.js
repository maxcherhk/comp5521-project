import { ethers, MaxUint256 } from "ethers";
import addresses from "./deployed-addresses.json";
import abis from "./deployed-abis.json";

const tokenMap = {
	AB: ["tokenA", "tokenB"],
	BC: ["tokenB", "tokenC"],
	AC: ["tokenA", "tokenC"],
	AD: ["tokenA", "tokenD"]
  };
  
  export const getContracts = async (signer) => {
	if (!signer) throw new Error("No signer provided");
  
	const tokenContracts = {
	  ALPHA: {
		contract: new ethers.Contract(addresses.tokenA, abis.NewToken, signer),
		address: addresses.tokenA,
	  },
	  BETA: {
		contract: new ethers.Contract(addresses.tokenB, abis.NewToken, signer),
		address: addresses.tokenB,
	  },
	  CHARLIE: {
		contract: new ethers.Contract(addresses.tokenC, abis.NewToken, signer),
		address: addresses.tokenC,
	  },
	  DELTA: {
		contract: new ethers.Contract(addresses.tokenD, abis.NewToken, signer),
		address: addresses.tokenD,
	  },
	};
  
	// Optional: load pools into a map too
	const poolContracts = {};
	for (const key in addresses) {
	  if (key.startsWith("pool")) {
		const tokenPair = key.replace("pool", ""); // e.g. AB
		poolContracts[tokenPair] = {
		  address: addresses[key],
		  contract: new ethers.Contract(addresses[key], abis.Pool, signer),
		};
	  }
	}
  
	return {
	  tokens: tokenContracts,
	  pools: poolContracts,
	};
  };

export const getTokenBalances = async (contracts, address) => {
	try {
		console.log("Getting token balances for address:", contracts);
		const token0Balance = await contracts.tokens.ALPHA.contract.balanceOf(address) || 0;
		const token1Balance = await contracts.tokens.BETA.contract.balanceOf(address) || 0;
		const token2Balance = await contracts.tokens.CHARLIE.contract.balanceOf(address) || 0;
		const token3Balance = await contracts.tokens.DELTA.contract.balanceOf(address) || 0;
	  
		return {
		  ALPHA: ethers.formatEther(token0Balance),
		  BETA: ethers.formatEther(token1Balance),
		  CHARLIE: ethers.formatEther(token2Balance),
		  DELTA: ethers.formatEther(token3Balance)
		};
	} catch (error) {
		console.error("Error in getTokenBalances:", error);
		throw error;
	}
};

export const getPoolInfo = async (contracts, tokenASymbol, tokenBSymbol) => {
	try {
		const tokenA = contracts.tokens[tokenASymbol];
		const tokenB = contracts.tokens[tokenBSymbol];

		if (!tokenA || !tokenB) throw new Error("Invalid token symbols");

		const poolKey = getPoolKey(tokenASymbol, tokenBSymbol);
		const pool = contracts.pools[poolKey];

		if (!pool) throw new Error("Pool does not exist for selected pair");

		const token0Balance = await tokenA.contract.balanceOf(pool.address);
		const token1Balance = await tokenB.contract.balanceOf(pool.address);

		console.log("Token balances in pool:", token0Balance, token1Balance);

		return {
			token0Balance: ethers.formatEther(token0Balance),
			token1Balance: ethers.formatEther(token1Balance),
		};
	} catch (error) {
		console.error("Error in getPoolInfo:", error);
		throw error;
	}
};


const symbolToTokenLetter = {
	ALPHA: "A",
	BETA: "B",
	CHARLIE: "C",
	DELTA: "D",
  };
  
  export const getPoolKey = (token1Symbol, token2Symbol) => {
	const a = symbolToTokenLetter[token1Symbol];
	const b = symbolToTokenLetter[token2Symbol];
	if (!a || !b) throw new Error("Invalid token symbol");
  
	return a < b ? `${a}${b}` : `${b}${a}`; // e.g., "AB"
  };


  export const buildPoolMap = () => {
	const poolMap = {};
	for (const key in addresses) {
	  if (key.startsWith("pool")) {
		const pair = key.replace("pool", ""); // e.g., "AB"
		poolMap[pair] = addresses[key];
	  }
	}
	return poolMap;
  };
  
  // Finds the best route: either direct or 2-step path via intermediate token
  export const findSwapPath = (sellToken, buyToken, poolMap) => {
	const direct = getPoolKey(sellToken, buyToken);
	if (poolMap[direct]) return [[sellToken, buyToken]];
  
	const tokens = ["ALPHA", "BETA", "CHARLIE", "DELTA"];
	for (const mid of tokens) {
	  if (mid === sellToken || mid === buyToken) continue;
  
	  const leg1 = getPoolKey(sellToken, mid);
	  const leg2 = getPoolKey(mid, buyToken);
  
	  if (poolMap[leg1] && poolMap[leg2]) {
		return [[sellToken, mid], [mid, buyToken]]; // 2-hop path
	  }
	}
  
	return null; // no valid route
  };