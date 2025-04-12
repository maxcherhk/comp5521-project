const { ethers } = require("hardhat");
const addresses = require("../../frontend/utils/deployed-addresses.json");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("📦 Loaded addresses:", addresses);

  const amount0 = ethers.parseEther("1000");
  const amount1 = ethers.parseEther("2000"); // 1:2 ratio

  async function addLiquidity(poolAddr, tokenAAddr, tokenBAddr, tokenASym, tokenBSym) {
    let token0Addr, token1Addr, token0Sym, token1Sym;
  
    if (tokenAAddr.toLowerCase() < tokenBAddr.toLowerCase()) {
      token0Addr = tokenAAddr;
      token1Addr = tokenBAddr;
      token0Sym = tokenASym;
      token1Sym = tokenBSym;
    } else {
      token0Addr = tokenBAddr;
      token1Addr = tokenAAddr;
      token0Sym = tokenBSym;
      token1Sym = tokenASym;
    }
  
    const pool = await ethers.getContractAt("Pool", poolAddr, deployer);
    const token0 = await ethers.getContractAt("NewToken", token0Addr, deployer);
    const token1 = await ethers.getContractAt("NewToken", token1Addr, deployer);
  
    console.log(`\n🔁 Adding liquidity to ${token0Sym} ↔ ${token1Sym}...`);
  
    const poolToken0 = await pool.token0();
    const poolToken1 = await pool.token1();
  
    if (poolToken0 !== token0.target || poolToken1 !== token1.target) {
      console.error("❌ Token mismatch — this pool was created with different token addresses.");
      return;
    }
  
    await token0.mint(deployer.address, amount0);
    await token1.mint(deployer.address, amount1);
  
    await token0.approve(poolAddr, amount0);
    await token1.approve(poolAddr, amount1);
  
    const tx = await pool.addLiquidityFromToken0(amount0);
    await tx.wait();
  
    console.log(`✅ Liquidity added: ${token0Sym} + ${token1Sym}`);
  }

  // ✅ Correctly reference addresses using object properties
  await addLiquidity(addresses.poolAB, addresses.tokenA, addresses.tokenB, "ALPHA", "BETA");
  await addLiquidity(addresses.poolAD, addresses.tokenA, addresses.tokenD, "ALPHA", "DELTA");
  await addLiquidity(addresses.poolBC, addresses.tokenB, addresses.tokenC, "BETA", "CHARLIE");
  await addLiquidity(addresses.poolCD, addresses.tokenD, addresses.tokenC, "DELTA", "CHARLIE");
}

main().catch((error) => {
  console.error("❌ Error adding liquidity:", error);
  process.exit(1);
});
