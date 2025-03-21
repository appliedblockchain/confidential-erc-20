import { HardhatUserConfig } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox'
import { config as Config } from 'dotenv'
import '@nomicfoundation/hardhat-ignition'
import '@appliedblockchain/silentdatarollup-hardhat-plugin'
import { SignatureType } from '@appliedblockchain/silentdatarollup-core'

// Load .env file
Config()

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: '0.8.28',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      // Version 0.8.17 is required for the ERC3643 contract
      {
        version: '0.8.17',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  networks: {
    localhost: {
      url: 'http://127.0.0.1:8545',
      chainId: 31337,
    },
    silentdata: {
      url: process.env.SILENTDATA_RPC_URL!,
      accounts: [process.env.PRIVATE_KEY!],
      chainId: Number(process.env.SILENTDATA_CHAIN_ID!),
      silentdata: {
        authSignatureType: SignatureType.Raw,
      },
    },
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
}

export default config
