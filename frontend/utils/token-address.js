const raw = require("./deployed-addresses.json");
const abis = require("./deployed-abis.json");
const { ethers } = require("ethers");

const addresses = {
  tokens: {
    ALPHA: raw.tokenA,
    BETA: raw.tokenB,
    CHARLIE: raw.tokenC,
    DELTA: raw.tokenD,
  },
  pools: {
    "ALPHA/BETA": raw.poolAB,
    "BETA/CHARLIE": raw.poolBC,
    "CHARLIE/DELTA": raw.poolCD,
    "ALPHA/DELTA": raw.poolAD,
  },
  factory: raw.factory,
  router: raw.router,
};

function getTokenName(address) {
  for (const [name, addr] of Object.entries(addresses.tokens)) {
    if (addr.toLowerCase() === address.toLowerCase()) {
      return name;
    }
  }
  return null;
}

function getTokenAddress(name) {
  return addresses.tokens[name] || null;
}

function getAllTokens() {
  return Object.entries(addresses.tokens).map(([name, address]) => ({ name, address }));
}

function getAllPools() {
  return Object.entries(addresses.pools).map(([name, address]) => ({ name, address }));
}

function getPoolByAddress(address) {
  for (const [name, addr] of Object.entries(addresses.pools)) {
    if (addr.toLowerCase() === address.toLowerCase()) {
      return name;
    }
  }
  return null;
}

async function getLivePoolStats(provider) {
	const signer = provider;
	const pools = getAllPools();
	const blockNow = await provider.getBlockNumber();
	const blockDayAgo = Math.max(blockNow - 6500, 0);
  
	const routerLogs = await provider.getLogs({
		address: addresses.router,
		topics: [ethers.id("Swapped(address,uint256,address,uint256)")],
		fromBlock: Math.max(blockNow - 10000, 0),
		toBlock: blockNow,
	  });
	console.log("Router swap logs:", routerLogs.length);

	const results = await Promise.all(
	  pools.map(async (pool) => {
		try {
		  const contract = new ethers.Contract(pool.address, abis.Pool, signer);
		  const [reserve0, reserve1] = await contract.getReserves();
  
		  const feeRate = await contract.feeRate();
		  const feeDecimal = parseFloat(feeRate.toString()) / 10000;
		  const tvl = parseFloat(ethers.formatEther(reserve0)) + parseFloat(ethers.formatEther(reserve1));
  
		  let volume = 0;
		  const logs = await provider.getLogs({
			address: pool.address, // Pool contract, not router
			topics: [ethers.id("Swapped(address,uint256,address,uint256)")],
			fromBlock: blockDayAgo,
			toBlock: blockNow,
		  });
		  const iface = new ethers.Interface(abis.Pool);
		  
		  for (const log of logs) {
			try {
			  const decoded = iface.decodeEventLog("Swapped", log.data, log.topics);
			  console.log(`📊 ${pool.name} SwapLog:`, decoded.amountIn.toString(), decoded.amountOut.toString());
		  
			  const amountIn = parseFloat(ethers.formatEther(decoded.amountIn));
			  const amountOut = parseFloat(ethers.formatEther(decoded.amountOut));
			  volume += amountIn + amountOut;
			} catch (err) {
			  console.warn("⚠️ Failed to parse log:", err);
			}
		  }
  
		  const apr = tvl > 0 ? ((volume * feeDecimal) / tvl) * 365 * 100 : 0;
  
		  return {
			name: pool.name,
			address: pool.address,
			tvl: tvl.toFixed(2),
			volume: volume.toFixed(2),
			apr: apr.toFixed(2),
		  };
		} catch (err) {
		  console.warn("Failed to fetch data for pool", pool.name, err);
		  return { name: pool.name, address: pool.address, tvl: "0", volume: "0", apr: "0" };
		}
	  })
	);
  
	return results;
  }
  

if (typeof window !== "undefined") {
  window.__poolutils = {
    addresses,
    getTokenName,
    getTokenAddress,
    getAllTokens,
    getAllPools,
    getPoolByAddress,
    getLivePoolStats,
  };
}

module.exports = {
  addresses,
  getTokenName,
  getTokenAddress,
  getAllTokens,
  getAllPools,
  getPoolByAddress,
  getLivePoolStats,
};
