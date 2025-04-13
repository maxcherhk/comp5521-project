import { ethers } from "ethers";
import addresses from "@/utils/deployed-addresses.json";
import abis from "@/utils/deployed-abis.json";

let isMinting = false; 

export async function POST(req) {
	try {
		if (isMinting) {
			return new Response(JSON.stringify({ success: true }), { status: 200 });
		}

		isMinting = true;

		const { walletAddress, token, amount } = await req.json();

		if (!walletAddress || !token || !amount) {
			return new Response(JSON.stringify({ error: "Missing params" }), { status: 400 });
		}

		const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
		const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

		const tokenKey = `token${token[0]}`; // e.g., ALPHA => tokenA
		const tokenAddress = addresses[tokenKey];
		const tokenContract = new ethers.Contract(tokenAddress, abis.NewToken, signer);
		const owner = await tokenContract.owner();
		console.log("Signer address:", signer.address);
		console.log("Token contract owner:", owner);
		
		const mintAmount = ethers.parseEther(amount.toString());
		const tx = await tokenContract.mint(walletAddress, mintAmount);
		await tx.wait();

		console.log(`Minted ${amount} ${token} to ${walletAddress}`);
		return new Response(JSON.stringify({ success: true }), { status: 200 });
	} catch (err) {
		console.error("Mint failed:", err);
		return new Response(JSON.stringify({ error: err.message }), { status: 500 });
	} finally {
		isMinting = false;
	}
}
