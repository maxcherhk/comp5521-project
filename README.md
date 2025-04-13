# comp5521-project

COMP5521 DeFi Group Project

The front end is built using Next.js.  
The Hardhat directory contains the contract scripts, token scripts, and the OpenZeppelin library. The project has completed the tutorial setup.

## Running with Docker 

**Prerequisites**
- Docker and Docker Compose installed on your machine

**Steps**
1. Create a `.env` file in the project root with the following variables:
   ```
   TEST_WALLET_ADDRESS=your_wallet_address
   STRIPE_SECRET_KEY=your_stripe_key
   ```

2. Build and start the containers:
   ```
   docker-compose up --build
   ```

3. Access the application:
   - Frontend: http://localhost:3000
   - Hardhat node: http://localhost:8545

4. Connect MetaMask:
   - Add a custom network > RPC URL: http://localhost:8545 > Chain ID: 31337
   - Import tokens as described in Step 6 below

## Running in local 

**Step 1**
New terminal  
> cd frontend  
> npm install  
> Create .env if missing  
>     
> STRIPE_SECRET_KEY=sk_test_51RD870IBisDm0c0SWt45p3mjynjmaccpQjXQi0xvqhQnJpDKMCUzdGV1QLszyp9aOZnjc6yuA83SD5pYYx2impiE00RBv5iPzl  
> PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80  
>     
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
Stop hardhat (Ctrl+C in terminal)  

**Step 5**
New terminal  
> cd hardhat  
> npx hardhat node  
> npx hardhat run scripts/deploy_multiple_pools.js --network localhost  
> npx hardhat run scripts/transferTokenForTesting.js --network localhost   
> npx hardhat run scripts/transferDF.js --network localhost  
> npx hardhat run scripts/add-liquidity.js --network localhost  

**Step 6**
Open MetaMask  
Add token into MetaMask.  
Restart Browser if no tokens in wallet.  
