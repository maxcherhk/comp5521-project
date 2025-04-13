import addresses from "@/utils/deployed-addresses.json";
import { rawProducts } from "./products";
import { getAddress } from "ethers";

export const getProductsWithContracts = () => {
  return rawProducts.map((product) => {
    const tokenKey = `token${product.token[0]}`; // ALPHA → tokenA
    return {
      ...product,
      tokenType: product.token,
      sellerWallet: getAddress(product.sellerWallet),
      tokenContract: addresses[tokenKey] || "0x0000000000000000000000000000000000000000",
    };
  });
};