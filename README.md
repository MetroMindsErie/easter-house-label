<div align="center">
<img width="200" alt="Image" src="https://github.com/user-attachments/assets/8b617791-cd37-4a5a-8695-a7c9018b7c70" />
<br>
<br>
<h1>Wallets Quickstart</h1>

<div align="center">
<a href="https://wallets.demos-crossmint.com/">Live Demo</a> | <a href="https://docs.crossmint.com/introduction/platform/wallets">Docs</a> | <a href="https://www.crossmint.com/quickstarts">See all quickstarts</a>
</div>

<br>
<br>
</div>

## Introduction
Create and interact with Crossmint wallets. This quickstart uses Crossmint Auth and uses your email as a signer for that wallet.

**Learn how to:**
- Create a wallet
- View its balance for USDXM (USDXM is a test stablecoin by Crossmint) and native tokens
- View wallet transaction activity
- Send USDXM or native tokens to another wallet

## Deploy
Easily deploy the template to Vercel with the button below. You will need to set the required environment variables in the Vercel dashboard.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FCrossmint%2Fwallets-quickstart&env=NEXT_PUBLIC_CROSSMINT_API_KEY)

## Setup
1. Clone the repository and navigate to the project folder:
```bash
git clone https://github.com/crossmint/wallets-quickstart.git && cd wallets-quickstart
```

2. Install all dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

3. Set up the environment variables:
```bash
cp .env.template .env
```

4. Get a Crossmint client API key from [here](https://docs.crossmint.com/introduction/platform/api-keys/client-side) and add it to the `.env` file. Make sure your API key has the following scopes: `users.create`, `users.read`, `wallets.read`, `wallets.create`, `wallets:transactions.create`, `wallets:transactions.sign`, `wallets:balance.read`, `wallets.fund`.
```bash
NEXT_PUBLIC_CROSSMINT_API_KEY=your_api_key

# Check all supported chains: https://docs.crossmint.com/introduction/supported-chains
NEXT_PUBLIC_CHAIN=your_chain
```

5. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

## Using in production
1. Create a [production API key](https://docs.crossmint.com/introduction/platform/api-keys/client-side).`

# Crossmint Wallets Quickstart

This project demonstrates how to integrate with Crossmint Wallets and NFT minting functionality.

## Setup Instructions

### Environment Variables

1. Copy `.env.template` to `.env.local`:
   ```bash
   cp .env.template .env.local
   ```

2. Fill in your actual API keys and configuration:
   - Get Crossmint API keys from the [Crossmint Developer Portal](https://www.crossmint.com/developers)
   - Get Supabase keys from your Supabase project settings

### Database Setup

1. Run the SQL scripts in the `/db` folder to set up your Supabase database:
   - `create_user_nfts_table.sql` - Creates tables for tracking NFT ownership
   - Other schema files as needed

2. Set up Row Level Security policies in Supabase to control access to your data.

### Running the Application

```bash
npm install
npm run dev
```

## Production Considerations

For production deployment:

1. Ensure `CROSSMINT_MOCK_MINT` is set to `false`
2. Use proper secure environment variables (not committed to source control)
3. Implement proper payment processing before minting
4. Add additional security measures for wallet verification
5. Implement proper error handling and logging

## API Endpoints

- `/api/mint-stats` - Retrieves current minting statistics
- `/api/purchase-track` - Handles NFT purchase and minting
- `/api/debug-nfts` - Retrieves NFTs for a specific wallet (development only)

For more information, see the [Crossmint documentation](https://docs.crossmint.com/).

## NFT Payments and Wallet Integration

### Development Mode vs. Production

In development mode (`CROSSMINT_MOCK_MINT=true`):
- NFTs are "mock minted" without actual blockchain transactions
- No payment is processed from the user's wallet
- NFTs appear in your database but not in the Crossmint wallet

In production mode (`CROSSMINT_MOCK_MINT=false`):
- Real NFTs are minted on the blockchain
- USDXM is deducted from the user's Crossmint wallet
- NFTs will appear in the user's Crossmint wallet

### Implementing Real Payments

To implement real payments:
1. Set `CROSSMINT_MOCK_MINT=false` in your environment
2. Use the payment helpers in `/lib/paymentHelpers.ts` 
3. Ensure your API keys have the required permissions
4. Create a payment_transactions table in your database to track payments

### Database Setup for Payments

```sql
-- Create payment transactions table
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id SERIAL PRIMARY KEY,
  buyer_wallet TEXT NOT NULL,
  seller_wallet TEXT NOT NULL,
  amount_usdxm DECIMAL(10,2) NOT NULL,
  track_id INTEGER REFERENCES public.tracks(id),
  status TEXT NOT NULL,
  transaction_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS payment_buyer_idx ON public.payment_transactions(buyer_wallet);
CREATE INDEX IF NOT EXISTS payment_seller_idx ON public.payment_transactions(seller_wallet);
CREATE INDEX IF NOT EXISTS payment_track_idx ON public.payment_transactions(track_id);
```
