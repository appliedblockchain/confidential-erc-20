/**
 * @title TREX Deploy Full Suite Fixture
 * @dev Imported and adapted from TokenySolutions/T-REX GitHub repository
 * https://github.com/TokenySolutions/T-REX/blob/main/test/fixtures/deploy-full-suite.fixture.ts
 */

import { BaseContract, ContractTransactionResponse, Signer } from 'ethers'
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
  ClaimIssuer,
  Identity,
} from '../typechain-types'
import { ImportedSuite, importSuite } from './utils/import-suite'

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
  artifacts: { abi: any; bytecode: any; contractName: string },
  signer: Signer,
  args: any[] = [],
) {
  const { abi, bytecode, contractName } = artifacts
  const factory = new ethers.ContractFactory(abi, bytecode, signer)
  const contract = await factory.deploy(...args)

  await contract.waitForDeployment()

  return ethers.getContractAt(contractName, await contract.getAddress(), signer) as unknown as Promise<T>
}

async function deployIdentityProxy(implementationAuthority: string, managementKey: string, signer: Signer) {
  const identityProxy = await deployContractWithAbi<Identity>(OnchainID.contracts.IdentityProxy, signer, [
    implementationAuthority,
    managementKey,
  ])

  return ethers.getContractAt('Identity', await identityProxy.getAddress(), signer) as unknown as Promise<Identity>
}

async function waitTx(tx: ContractTransactionResponse) {
  return tx.wait()
}

async function getSigners() {
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

  return {
    deployer: deployer || ethers.Wallet.createRandom(ethers.provider),
    tokenIssuer: tokenIssuer || ethers.Wallet.createRandom(ethers.provider),
    tokenAgent: tokenAgent || ethers.Wallet.createRandom(ethers.provider),
    tokenAdmin: tokenAdmin || ethers.Wallet.createRandom(ethers.provider),
    claimIssuer: claimIssuer || ethers.Wallet.createRandom(ethers.provider),
    aliceWallet: aliceWallet || ethers.Wallet.createRandom(ethers.provider),
    bobWallet: bobWallet || ethers.Wallet.createRandom(ethers.provider),
    charlieWallet: charlieWallet || ethers.Wallet.createRandom(ethers.provider),
    davidWallet: davidWallet || ethers.Wallet.createRandom(ethers.provider),
    anotherWallet: anotherWallet || ethers.Wallet.createRandom(ethers.provider),
  } as any
}

export async function deployBasicSuite(signers: any) {
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
    'UCEF3643',
  )

  console.log(pc.yellow('6/15 Binding Identity Registry...'))
  await waitTx(
    await identityRegistryStorage.connect(deployer).bindIdentityRegistry(await identityRegistry.getAddress()),
  )

  await waitTx(await token.connect(deployer).addAgent(tokenAgent.address))

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

export async function deployClaimIssuer(data: ImportedSuite) {
  console.log(pc.green('Deploying claim issuer, identities and claims...'))

  const { claimTopicsRegistry, trustedIssuersRegistry } = data.suite
  const { deployer } = data.accounts as any

  const claimIssuerSigningKey = ethers.Wallet.createRandom()
  data.accounts.claimIssuerSigningKey = claimIssuerSigningKey

  console.log(pc.yellow('7/15 Adding Claim Topic...'))
  const claimTopics = [ethers.id('CLAIM_TOPIC')]
  if ((await claimTopicsRegistry.getClaimTopics()).length === 0) {
    await waitTx(await claimTopicsRegistry.connect(deployer).addClaimTopic(claimTopics[0]))
  }

  const claimIssuerContract = await deployContract<ClaimIssuer>('ClaimIssuer', deployer, [await deployer.getAddress()])
  data.suite.claimIssuerContract = claimIssuerContract

  console.log(pc.yellow('8/15 Adding Claim Issuer Key...'))
  await claimIssuerContract
    .connect(deployer)
    .addKey(
      ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(['address'], [claimIssuerSigningKey.address])),
      3,
      1,
    )

  console.log(pc.yellow('9/15 Adding Trusted Issuer...'))
  await waitTx(
    await trustedIssuersRegistry
      .connect(deployer)
      .addTrustedIssuer(await claimIssuerContract.getAddress(), claimTopics),
  )

  console.log(pc.green('Claim issuer deployed successfully!'))

  return data
}

export async function deployIdentities(data: ImportedSuite) {
  console.log(pc.green('Deploying identities and claims...'))
  const { token, identityRegistry, claimIssuerContract } = data.suite
  const { identityImplementationAuthority } = data.authorities
  const { deployer, aliceWallet, bobWallet, charlieWallet, tokenAgent } = data.accounts as any
  const claimTopics = [ethers.id('CLAIM_TOPIC')]

  const aliceActionKey = ethers.Wallet.createRandom()
  data.accounts.aliceActionKey = aliceActionKey
  const claimIssuerSigningKey = data.accounts.claimIssuerSigningKey || ethers.Wallet.createRandom()

  const identityImplementationAuthorityAddress = await identityImplementationAuthority.getAddress()

  console.log(pc.yellow('10/15 Deploying Identities...'))
  const aliceIdentity = await deployIdentityProxy(identityImplementationAuthorityAddress, aliceWallet.address, deployer)

  await waitTx(
    await aliceIdentity
      .connect(aliceWallet)
      .addKey(ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(['address'], [aliceActionKey.address])), 2, 1),
  )
  const aliceIdentityAddress = await aliceIdentity.getAddress()

  const bobIdentity = await deployIdentityProxy(identityImplementationAuthorityAddress, bobWallet.address, deployer)
  const bobIdentityAddress = await bobIdentity.getAddress()

  const charlieIdentity = await deployIdentityProxy(
    identityImplementationAuthorityAddress,
    charlieWallet.address,
    deployer,
  )

  await waitTx(await identityRegistry.connect(deployer).addAgent(tokenAgent.address))
  await waitTx(await identityRegistry.connect(deployer).addAgent(await token.getAddress()))

  console.log(pc.yellow('11/15 Batch Registering Identities...'))
  await waitTx(
    await identityRegistry
      .connect(tokenAgent)
      .batchRegisterIdentity(
        [aliceWallet.address, bobWallet.address],
        [aliceIdentityAddress, bobIdentityAddress],
        [42, 666],
      ),
  )

  console.log(pc.yellow('12/15 Adding Claim for Alice...'))
  const claimForAlice = {
    data: ethers.hexlify(ethers.toUtf8Bytes('Some claim public data.')),
    issuer: await claimIssuerContract!.getAddress(),
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

  await waitTx(
    await aliceIdentity
      .connect(aliceWallet)
      .addClaim(
        claimForAlice.topic,
        claimForAlice.scheme,
        claimForAlice.issuer,
        claimForAlice.signature,
        claimForAlice.data,
        '',
      ),
  )

  console.log(pc.yellow('13/15 Adding Claim for Bob...'))
  const claimForBob = {
    data: ethers.hexlify(ethers.toUtf8Bytes('Some claim public data.')),
    issuer: await claimIssuerContract!.getAddress(),
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

  await waitTx(
    await bobIdentity
      .connect(bobWallet)
      .addClaim(claimForBob.topic, claimForBob.scheme, claimForBob.issuer, claimForBob.signature, claimForBob.data, ''),
  )

  console.log(pc.yellow('14/15 Minting tokens...'))
  await waitTx(await token.connect(tokenAgent).mint(aliceWallet.address, 1000))
  await waitTx(await token.connect(tokenAgent).mint(bobWallet.address, 500))

  console.log(pc.yellow('15/15 Unpausing token...'))
  await waitTx(await token.connect(tokenAgent).unpause())

  data.identities = {
    aliceIdentity,
    bobIdentity,
    charlieIdentity,
  }

  console.log(pc.green('Claim issuer, identities and claims deployed successfully!'))

  return data
}

export async function main({
  suiteFilePath,
  skipClaimIssuer,
  skipIdentities,
}: {
  suiteFilePath?: string
  skipClaimIssuer?: boolean
  skipIdentities?: boolean
} = {}) {
  let suite: ImportedSuite

  if (suiteFilePath) {
    console.log(pc.green('Importing suite from file...'))
    suite = await importSuite(suiteFilePath)
  } else {
    console.log(pc.green('Deploying full suite fixture...'))
    console.log(pc.yellow('1/15 Getting signers...'))
    const signers = await getSigners()
    suite = (await deployBasicSuite(signers)) as unknown as ImportedSuite
  }

  !skipClaimIssuer && (await deployClaimIssuer(suite))
  !skipIdentities && (await deployIdentities(suite))

  return suite
}
