import { ethers } from 'hardhat'
import pc from 'picocolors'
import OnchainID from '@onchain-id/solidity'
import {
  ClaimTopicsRegistry,
  IdFactory,
  IdentityRegistry,
  IdentityRegistryStorage,
  ModularCompliance,
  Token,
  TREXImplementationAuthority,
  TrustedIssuersRegistry,
  TREXFactory,
  DefaultCompliance,
} from '../../typechain-types'
import { deployContract, deployContractWithAbi, deployIdentityProxy, waitTx, Signers } from '../utils'

export async function deployBasicSuite(signers: Signers) {
  const {
    deployer,
    tokenIssuer,
    tokenAgent,
    tokenAdmin,
    claimIssuer,
    aliceWallet,
    bobWallet,
    charlieWallet,
    davidWallet,
    anotherWallet,
  } = signers

  // Deploy implementations
  console.log(pc.yellow('2/15 Deploying implementations...'))
  console.log(pc.gray('ClaimTopicsRegistry'))
  const claimTopicsRegistryImplementation = await deployContract<ClaimTopicsRegistry>('ClaimTopicsRegistry', deployer)
  console.log(pc.gray('TrustedIssuersRegistry'))
  const trustedIssuersRegistryImplementation = await deployContract<TrustedIssuersRegistry>(
    'TrustedIssuersRegistry',
    deployer,
  )
  console.log(pc.gray('IdentityRegistryStorage'))
  const identityRegistryStorageImplementation = await deployContract<IdentityRegistryStorage>(
    'IdentityRegistryStorage',
    deployer,
  )
  console.log(pc.gray('IdentityRegistry'))
  const identityRegistryImplementation = await deployContract<IdentityRegistry>('IdentityRegistry', deployer)
  console.log(pc.gray('ModularCompliance'))
  const modularComplianceImplementation = await deployContract<ModularCompliance>('ModularCompliance', deployer)
  console.log(pc.gray('Token'))
  const tokenImplementation = await deployContract<Token>('UCEF3643', deployer)
  console.log(pc.gray('Identity'))
  const identityImplementation = await deployContractWithAbi(OnchainID.contracts.Identity, deployer, [
    await deployer.getAddress(),
    true,
  ])

  console.log(pc.gray('IdentityImplementationAuthority'))
  const identityImplementationAuthority = await deployContractWithAbi(
    OnchainID.contracts.ImplementationAuthority,
    deployer,
    [await identityImplementation.getAddress()],
  )
  const identityImplementationAuthorityAddress = await identityImplementationAuthority.getAddress()

  console.log(pc.gray('IdentityFactory'))
  const identityFactory = await deployContractWithAbi<IdFactory>(OnchainID.contracts.Factory, deployer, [
    identityImplementationAuthorityAddress,
  ])

  console.log(pc.gray('TREXImplementationAuthority'))
  const trexImplementationAuthority = await deployContract<TREXImplementationAuthority>(
    'TREXImplementationAuthority',
    deployer,
    [true, ethers.ZeroAddress, ethers.ZeroAddress],
  )

  const versionStruct = {
    major: 4,
    minor: 0,
    patch: 0,
  }
  const contractsStruct = {
    tokenImplementation: await tokenImplementation.getAddress(),
    ctrImplementation: await claimTopicsRegistryImplementation.getAddress(),
    irImplementation: await identityRegistryImplementation.getAddress(),
    irsImplementation: await identityRegistryStorageImplementation.getAddress(),
    tirImplementation: await trustedIssuersRegistryImplementation.getAddress(),
    mcImplementation: await modularComplianceImplementation.getAddress(),
  }

  await waitTx(await trexImplementationAuthority.connect(deployer).addAndUseTREXVersion(versionStruct, contractsStruct))

  console.log(pc.yellow('3/15 Deploying factory...'))
  const trexFactory = await deployContract<TREXFactory>('TREXFactory', deployer, [
    await trexImplementationAuthority.getAddress(),
    await identityFactory.getAddress(),
  ])
  await waitTx(await identityFactory.connect(deployer).addTokenFactory(await trexFactory.getAddress()))

  const trexImplementationAuthorityAddress = await trexImplementationAuthority.getAddress()

  console.log(pc.yellow('4/15 Deploying Registry Proxies...'))
  console.log(pc.gray('ClaimTopicsRegistry'))
  const claimTopicsRegistry = await deployContract<ClaimTopicsRegistry>(
    'ClaimTopicsRegistryProxy',
    deployer,
    [trexImplementationAuthorityAddress],
    'ClaimTopicsRegistry',
  )
  console.log(pc.gray('TrustedIssuersRegistry'))
  const trustedIssuersRegistry = await deployContract<TrustedIssuersRegistry>(
    'TrustedIssuersRegistryProxy',
    deployer,
    [trexImplementationAuthorityAddress],
    'TrustedIssuersRegistry',
  )
  console.log(pc.gray('IdentityRegistryStorage'))
  const identityRegistryStorage = await deployContract<IdentityRegistryStorage>(
    'IdentityRegistryStorageProxy',
    deployer,
    [trexImplementationAuthorityAddress],
    'IdentityRegistryStorage',
  )
  console.log(pc.gray('DefaultCompliance'))
  const defaultCompliance = await deployContract<DefaultCompliance>('DefaultCompliance', deployer)
  console.log(pc.gray('IdentityRegistry'))
  const identityRegistry = await deployContract<IdentityRegistry>(
    'IdentityRegistryProxy',
    deployer,
    [
      trexImplementationAuthorityAddress,
      await trustedIssuersRegistry.getAddress(),
      await claimTopicsRegistry.getAddress(),
      await identityRegistryStorage.getAddress(),
    ],
    'IdentityRegistry',
  )

  console.log(pc.yellow('5/15 Deploying Token Proxy...'))
  const tokenOID = await deployIdentityProxy(
    identityImplementationAuthorityAddress,
    await tokenIssuer.getAddress(),
    deployer,
  )
  const tokenName = 'TREXDINO'
  const tokenSymbol = 'TREX'
  const tokenDecimals = 0n
  const token = await deployContract<Token>(
    'TokenProxy',
    deployer,
    [
      await trexImplementationAuthority.getAddress(),
      await identityRegistry.getAddress(),
      await defaultCompliance.getAddress(),
      tokenName,
      tokenSymbol,
      tokenDecimals,
      await tokenOID.getAddress(),
    ],
    'UCEF3643',
  )

  console.log(pc.yellow('6/15 Binding Identity Registry...'))
  await waitTx(
    await identityRegistryStorage.connect(deployer).bindIdentityRegistry(await identityRegistry.getAddress()),
  )

  await waitTx(await token.connect(deployer).addAgent(await tokenAgent.getAddress()))

  console.log(pc.green('Basic suite fixture deployed successfully!'))

  return {
    accounts: {
      deployer,
      tokenIssuer,
      tokenAgent,
      tokenAdmin,
      claimIssuer,
      aliceWallet,
      bobWallet,
      charlieWallet,
      davidWallet,
      anotherWallet,
    },
    suite: {
      claimTopicsRegistry,
      trustedIssuersRegistry,
      identityRegistryStorage,
      defaultCompliance,
      identityRegistry,
      tokenOID,
      token,
    },
    authorities: {
      trexImplementationAuthority,
      identityImplementationAuthority,
    },
    factories: {
      trexFactory,
      identityFactory,
    },
    implementations: {
      identityImplementation,
      claimTopicsRegistryImplementation,
      trustedIssuersRegistryImplementation,
      identityRegistryStorageImplementation,
      identityRegistryImplementation,
      modularComplianceImplementation,
      tokenImplementation,
    },
  }
}
