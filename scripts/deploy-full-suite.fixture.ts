/**
 * @title TREX Deploy Full Suite Fixture
 * @dev Imported and adapted from TokenySolutions/T-REX GitHub repository
 * https://github.com/TokenySolutions/T-REX/blob/main/test/fixtures/deploy-full-suite.fixture.ts
 */

import { BaseContract, Signer } from 'ethers'
import { ethers } from 'hardhat'
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
  ClaimIssuer,
  Identity,
} from '../typechain-types'

async function deployContract<T extends BaseContract>(
  name: string,
  signer: Signer,
  args: any[] = [],
  contractName = name,
) {
  const factory = await ethers.getContractFactory(name, signer)
  const contract = await factory.deploy(...args)

  await contract.waitForDeployment()

  return ethers.getContractAt(contractName, await contract.getAddress(), signer) as unknown as Promise<T>
}

async function deployContractWithAbi<T extends BaseContract>(
  abi: any,
  bytecode: any,
  signer: Signer,
  args: any[] = [],
) {
  const factory = new ethers.ContractFactory(abi, bytecode, signer)
  const contract = await factory.deploy(...args)

  return contract as unknown as Promise<T>
}

async function deployIdentityProxy(implementationAuthority: string, managementKey: string, signer: Signer) {
  const identityProxy = await deployContractWithAbi<Identity>(
    OnchainID.contracts.IdentityProxy.abi,
    OnchainID.contracts.IdentityProxy.bytecode,
    signer,
    [implementationAuthority, managementKey],
  )

  return ethers.getContractAt('Identity', await identityProxy.getAddress(), signer) as unknown as Promise<Identity>
}

export async function deployFullSuiteFixture() {
  const [
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
  ] = await ethers.getSigners()
  const claimIssuerSigningKey = ethers.Wallet.createRandom()
  const aliceActionKey = ethers.Wallet.createRandom()

  // Deploy implementations
  const claimTopicsRegistryImplementation = await deployContract<ClaimTopicsRegistry>('ClaimTopicsRegistry', deployer)
  const trustedIssuersRegistryImplementation = await deployContract<TrustedIssuersRegistry>(
    'TrustedIssuersRegistry',
    deployer,
  )
  const identityRegistryStorageImplementation = await deployContract<IdentityRegistryStorage>(
    'IdentityRegistryStorage',
    deployer,
  )
  const identityRegistryImplementation = await deployContract<IdentityRegistry>('IdentityRegistry', deployer)
  const modularComplianceImplementation = await deployContract<ModularCompliance>('ModularCompliance', deployer)
  const tokenImplementation = await deployContract<Token>('Token', deployer)

  const identityImplementation = await deployContractWithAbi(
    OnchainID.contracts.Identity.abi,
    OnchainID.contracts.Identity.bytecode,
    deployer,
    [await deployer.getAddress(), true],
  )

  const identityImplementationAuthority = await deployContractWithAbi(
    OnchainID.contracts.ImplementationAuthority.abi,
    OnchainID.contracts.ImplementationAuthority.bytecode,
    deployer,
    [await identityImplementation.getAddress()],
  )
  const identityImplementationAuthorityAddress = await identityImplementationAuthority.getAddress()

  const identityFactory = await deployContractWithAbi<IdFactory>(
    OnchainID.contracts.Factory.abi,
    OnchainID.contracts.Factory.bytecode,
    deployer,
    [identityImplementationAuthorityAddress],
  )

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

  await trexImplementationAuthority.connect(deployer).addAndUseTREXVersion(versionStruct, contractsStruct)

  const trexFactory = await deployContract<TREXFactory>('TREXFactory', deployer, [
    await trexImplementationAuthority.getAddress(),
    await identityFactory.getAddress(),
  ])
  await identityFactory.connect(deployer).addTokenFactory(await trexFactory.getAddress())

  const trexImplementationAuthorityAddress = await trexImplementationAuthority.getAddress()

  const claimTopicsRegistry = await deployContract<ClaimTopicsRegistry>(
    'ClaimTopicsRegistryProxy',
    deployer,
    [trexImplementationAuthorityAddress],
    'ClaimTopicsRegistry',
  )

  const trustedIssuersRegistry = await deployContract<TrustedIssuersRegistry>(
    'TrustedIssuersRegistryProxy',
    deployer,
    [trexImplementationAuthorityAddress],
    'TrustedIssuersRegistry',
  )

  const identityRegistryStorage = await deployContract<IdentityRegistryStorage>(
    'IdentityRegistryStorageProxy',
    deployer,
    [trexImplementationAuthorityAddress],
    'IdentityRegistryStorage',
  )

  const defaultCompliance = await deployContract<DefaultCompliance>('DefaultCompliance', deployer)

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

  const tokenOID = await deployIdentityProxy(identityImplementationAuthorityAddress, tokenIssuer.address, deployer)
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
    'Token',
  )

  await identityRegistryStorage.connect(deployer).bindIdentityRegistry(await identityRegistry.getAddress())

  await token.connect(deployer).addAgent(tokenAgent.address)

  const claimTopics = [ethers.id('CLAIM_TOPIC')]
  await claimTopicsRegistry.connect(deployer).addClaimTopic(claimTopics[0])

  const claimIssuerContract = await deployContract<ClaimIssuer>('ClaimIssuer', claimIssuer, [claimIssuer.address])

  await claimIssuerContract
    .connect(claimIssuer)
    .addKey(
      ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(['address'], [claimIssuerSigningKey.address])),
      3,
      1,
    )

  await trustedIssuersRegistry.connect(deployer).addTrustedIssuer(await claimIssuerContract.getAddress(), claimTopics)

  const aliceIdentity = await deployIdentityProxy(identityImplementationAuthorityAddress, aliceWallet.address, deployer)
  await aliceIdentity
    .connect(aliceWallet)
    .addKey(ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(['address'], [aliceActionKey.address])), 2, 1)
  const aliceIdentityAddress = await aliceIdentity.getAddress()

  const bobIdentity = await deployIdentityProxy(identityImplementationAuthorityAddress, bobWallet.address, deployer)
  const bobIdentityAddress = await bobIdentity.getAddress()

  const charlieIdentity = await deployIdentityProxy(
    identityImplementationAuthorityAddress,
    charlieWallet.address,
    deployer,
  )

  await identityRegistry.connect(deployer).addAgent(tokenAgent.address)
  await identityRegistry.connect(deployer).addAgent(await token.getAddress())

  await identityRegistry
    .connect(tokenAgent)
    .batchRegisterIdentity(
      [aliceWallet.address, bobWallet.address],
      [aliceIdentityAddress, bobIdentityAddress],
      [42, 666],
    )

  const claimForAlice = {
    data: ethers.hexlify(ethers.toUtf8Bytes('Some claim public data.')),
    issuer: await claimIssuerContract.getAddress(),
    topic: claimTopics[0],
    scheme: 1,
    identity: aliceIdentityAddress,
    signature: '',
  }
  claimForAlice.signature = await claimIssuerSigningKey.signMessage(
    ethers.getBytes(
      ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ['address', 'uint256', 'bytes'],
          [claimForAlice.identity, claimForAlice.topic, claimForAlice.data],
        ),
      ),
    ),
  )

  await aliceIdentity
    .connect(aliceWallet)
    .addClaim(
      claimForAlice.topic,
      claimForAlice.scheme,
      claimForAlice.issuer,
      claimForAlice.signature,
      claimForAlice.data,
      '',
    )

  const claimForBob = {
    data: ethers.hexlify(ethers.toUtf8Bytes('Some claim public data.')),
    issuer: await claimIssuerContract.getAddress(),
    topic: claimTopics[0],
    scheme: 1,
    identity: bobIdentityAddress,
    signature: '',
  }
  claimForBob.signature = await claimIssuerSigningKey.signMessage(
    ethers.getBytes(
      ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ['address', 'uint256', 'bytes'],
          [claimForBob.identity, claimForBob.topic, claimForBob.data],
        ),
      ),
    ),
  )

  await bobIdentity
    .connect(bobWallet)
    .addClaim(claimForBob.topic, claimForBob.scheme, claimForBob.issuer, claimForBob.signature, claimForBob.data, '')

  await token.connect(tokenAgent).mint(aliceWallet.address, 1000)
  await token.connect(tokenAgent).mint(bobWallet.address, 500)

  await token.connect(tokenAgent).unpause()

  return {
    accounts: {
      deployer,
      tokenIssuer,
      tokenAgent,
      tokenAdmin,
      claimIssuer,
      claimIssuerSigningKey,
      aliceActionKey,
      aliceWallet,
      bobWallet,
      charlieWallet,
      davidWallet,
      anotherWallet,
    },
    identities: {
      aliceIdentity,
      bobIdentity,
      charlieIdentity,
    },
    suite: {
      claimIssuerContract,
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
