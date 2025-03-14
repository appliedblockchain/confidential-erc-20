# Deployment Guide

This guide explains how to build and deploy smart contracts for both local Hardhat development chain and SilentData environment.

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Hardhat
- Access to SilentData credentials (for SilentData deployment)

## Local Development with Hardhat

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Compile Contracts

```bash
pnpm compile
```

### 3. Run Local Hardhat Node

```bash
pnpm chain
```

This will start a local blockchain network and provide you with a set of test accounts with ETH.

### 4. Configure Environment

Create a `.env` file in the root directory with your SilentData credentials:

```env
PRIVATE_KEY=<deployer_private_key>
```

### 5. Deploy to Local Network

```bash
pnpm deploy:module <module_name>
```

Example:

```bash
pnpm deploy:module UCEFOnlyOwner
```

## SilentData Deployment

### 1. Configure Environment

Create a `.env` file in the root directory with your SilentData credentials:

```env
PRIVATE_KEY=<deployer_private_key>
SILENTDATA_RPC_URL=<silentdata_rpc_url>
SILENTDATA_CHAIN_ID=<silentdata_chain_id>
```

### 2. Compile Contracts

```bash
pnpm compile
```

### 3. Deploy to SilentData

```bash
pnpm deploy:module <module_name> silentdata
```

Example:

```bash
pnpm deploy:module UCEFOnlyOwner silentdata
```

## Important Notes

- Always ensure your contracts are thoroughly tested before deployment
- Keep your private keys and API credentials secure
- Back up your deployment addresses and transaction hashes
- Monitor gas prices for optimal deployment timing on SilentData

## Troubleshooting

If you encounter issues:

1. Ensure all dependencies are installed correctly
2. Verify network configurations in `hardhat.config.js`
3. Check that you have sufficient funds in your wallet for deployment
4. Confirm your `.env` file is properly configured
5. Clear the `artifacts` and `cache` folders and recompile if needed:
   ```bash
   pnpm clean
   pnpmcompile
   ```

## Testing

All tests can be run with:

```bash
pnpm test
```

Or individual tests can be run with:

```bash
pnpm test -- <relative_path_to_test>
```

Example:

```bash
pnpm test -- test/examples/UCEFOnlyOwner.test.ts
```

or run all tests in a directory:

```bash
pnpm test -- test/examples/*.test.ts
```



