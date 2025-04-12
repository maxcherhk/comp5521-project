# comp5521-project

COMP5521 DeFi Group Project

The front end is built using Next.js.  
The Hardhat directory contains the contract scripts, token scripts, and the OpenZeppelin library. The project has completed the tutorial setup.

**Step 1**
New terminal  
> cd frontend  
> npm install  
> npm run dev  

**Step 2**
New terminal  
> cd hardhat  
> npm install  
> npx hardhat clean  
> npx hardhat compile  
> npx hardhat node  

**Step 3**
Open MetaMask  
Add a custom network >  RPC URL: http://localhost:8545 > Chain ID: 31337  
Copy and replace the wallet address to hardhat/scripts/transferDF.js and hardhat/scripts/transferTokenForTesting.js  

**Step 4**
New terminal  
> cd hardhat  
> npx hardhat run .\scripts\deploy_multiple_pools.js  
> npx hardhat run scripts/transferDF.js --network localhost  
Stop hardhat (Ctrl+C in terminal)  

**Step 5**
New terminal  
> cd hardhat  
> npx hardhat node  
> npx hardhat run scripts/deploy_multiple_pools.js --network localhost  
> npx hardhat run scripts/transferTokenForTesting.js --network localhost  

**Step 6**
Open MetaMask  
Add token into MetaMask.  
Restart Browser if no tokens in wallet.  
