const addresses = {
	tokens: {
		ALPHA: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
		BETA: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
		GAMMA: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
		DELTA: "0x0165878A594ca255338adfa4d48449f69242Eb8F",
	},
	pools: {
		POOL_AB: "0x9bd03768a7DCc129555dE410FF8E85528A4F88b5",
		POOL_BC: "0x440C0fCDC317D69606eabc35C0F676D1a8251Ee1",
		POOL_AC: "0x80E2E2367C5E9D070Ae2d6d50bF0cdF6360a7151",
		POOL_AD: "0x0433d874a28147DB0b330C000fcC50C0f0BaF425",
	},
	factory: "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853",
	router: "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6",
};

/**
 * Get the token name by its address.
 * @param {string} address - The token address.
 * @returns {string|null} - The token name or null if not found.
 */
function getTokenName(address) {
	for (const [name, addr] of Object.entries(addresses.tokens)) {
		if (addr.toLowerCase() === address.toLowerCase()) {
			return name;
		}
	}
	return null;
}

/**
 * Get the token address by its name.
 * @param {string} name - The token name (e.g., ALPHA, BETA).
 * @returns {string|null} - The token address or null if not found.
 */
function getTokenAddress(name) {
	return addresses.tokens[name] || null;
}

/**
 * Get all token addresses and their names.
 * @returns {Array<{ name: string, address: string }>} - Array of token name-address pairs.
 */
function getAllTokens() {
	return Object.entries(addresses.tokens).map(([name, address]) => ({
		name,
		address,
	}));
}

module.exports = {
	addresses,
	getTokenName,
	getTokenAddress,
	getAllTokens,
};
