# comp5521-project

COMP5521 DeFi Group Project

The front end is built using Next.js.  
The Hardhat directory contains the contract scripts, token scripts, and the OpenZeppelin library. The project has completed the tutorial setup.

## Running with Docker

To run the application using Docker:

1. Make sure you have [Docker](https://www.docker.com/products/docker-desktop/) and [Docker Compose](https://docs.docker.com/compose/install/) installed.

2. Connect MetaMask to the Hardhat network (this will be needed to get your wallet address):
   - Open MetaMask
   - Add a custom network:
     - RPC URL: http://localhost:8545
     - Chain ID: 31337
   - Copy your MetaMask wallet address

3. Run the application with your environment variables:
   ```bash
   WALLET_ADDRESS=YOUR_METAMASK_WALLET_ADDRESS \
   STRIPE_SECRET_KEY=YOUR_STRIPE_SECRET_KEY \
   PRIVATE_KEY=YOUR_PRIVATE_KEY \
   docker-compose up
   ```
   
   Replace:
   - `YOUR_METAMASK_WALLET_ADDRESS` with your actual wallet address from MetaMask
   - `YOUR_STRIPE_SECRET_KEY` with your Stripe secret key (optional - default is provided)
   - `YOUR_PRIVATE_KEY` with private key of hardhat provide account(optional - default is provided)

   You can omit any variable to use the default value provided in the docker-compose.yml file.

4. The services will start automatically:
   - Frontend will be available at http://localhost:3000
   - Hardhat node will be running at http://localhost:8545
   - Tokens will be automatically transferred to your MetaMask wallet address

5. To stop the application:
   ```bash
   docker-compose down
   ```

## Running Manually (Original Method)

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
