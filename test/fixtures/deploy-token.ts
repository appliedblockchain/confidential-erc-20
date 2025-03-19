import { BaseContract, ContractTransactionResponse, Signer } from 'ethers'
import { ethers } from 'hardhat'

type DeployTokenOptions = {
  initialSupply?: bigint
}

type TokenContract = BaseContract & {
  connect: (signer: Signer) => TokenContract
  mint?: (to: string, amount: bigint) => Promise<ContractTransactionResponse>
  transfer: (to: string, amount: bigint) => Promise<ContractTransactionResponse>
}

export async function deployToken<T extends TokenContract>(
  contactName: string,
  args: unknown[] = [],
  options: DeployTokenOptions = {},
) {
  const [owner] = await ethers.getSigners()

  const TokenFactory = await ethers.getContractFactory(contactName)
  const token = (await TokenFactory.deploy(...args)) as unknown as T
  await token.waitForDeployment()

  if (options.initialSupply) {
    await mintTo(token, owner, options.initialSupply)
  }

  return token
}

export async function mintTo(token: TokenContract, to: Signer | string, amount: bigint) {
  if (!token.mint) {
    throw new Error('Token does not support minting')
  }

  const toAddress = typeof to === 'string' ? to : await to.getAddress()
  return token.mint(toAddress, amount)
}

export async function transfer(token: TokenContract, to: Signer | string, amount: bigint) {
  const toAddress = typeof to === 'string' ? to : await to.getAddress()
  return token.transfer(toAddress, amount)
}
