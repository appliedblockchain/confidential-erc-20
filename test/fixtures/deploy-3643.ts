import { ethers } from 'hardhat'
import { UCEF3643, MockIdentityRegistry, MockCompliance } from '../../typechain-types'
import { Signer } from 'ethers'

export async function deployToken3643({
  agent,
  name,
  symbol,
  decimals,
  onchainID,
}: {
  agent: Signer
  name: string
  symbol: string
  decimals: number
  onchainID: string
}) {
  const agentAddress = await agent.getAddress()
  // Deploy mock contracts
  const MockIdentityRegistry = await ethers.getContractFactory('MockIdentityRegistry')
  const mockIdentityRegistry = (await MockIdentityRegistry.deploy()) as unknown as MockIdentityRegistry
  await mockIdentityRegistry.waitForDeployment()

  const MockCompliance = await ethers.getContractFactory('MockCompliance')
  const mockCompliance = (await MockCompliance.deploy()) as unknown as MockCompliance
  await mockCompliance.waitForDeployment()

  // Deploy UCEF3643
  const tokenFactory = await ethers.getContractFactory('UCEF3643')
  const token = (await tokenFactory.deploy()) as unknown as UCEF3643
  await token.waitForDeployment()

  // Set up token addresses in mock contracts
  await mockIdentityRegistry.setToken(await token.getAddress())
  await mockCompliance.setToken(await token.getAddress())

  // Initialize the token
  await token.init(
    await mockIdentityRegistry.getAddress(),
    await mockCompliance.getAddress(),
    name,
    symbol,
    decimals,
    onchainID,
  )

  // Register and verify agent identity
  await mockIdentityRegistry.registerIdentity(agentAddress, 1, true)
  await mockIdentityRegistry.setVerified(agentAddress, true)

  // Grant agent role to our test agent
  await token.addAgent(agentAddress)

  return { token, mockIdentityRegistry, mockCompliance }
}
