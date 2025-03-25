import fs from 'fs'
import { main } from './deploy-full-suite.fixture'
const exportPrivateKeys = process.env.EXPORT_PRIVATE_KEYS === 'true'

function exportAccounts(accounts: Record<string, { address: string; privateKey?: string }>, exportPrivateKey = false) {
  return Object.entries(accounts)
    .filter(([_, account]) => account.address)
    .map(([name, account]) => {
      return {
        [name]: {
          address: account.address,
          ...(exportPrivateKey && { privateKey: account.privateKey }),
        },
      }
    })
}

;(async () => {
  const result = await main({
    // suiteFilePath: 'SDSuiteDeployment.json',
    skipClaimIssuer: false,
    skipIdentities: false,
  })

  if (result) {
    const content = JSON.stringify(
      {
        suite: {
          claimIssuerContract: await result.suite.claimIssuerContract?.getAddress(),
          claimTopicsRegistry: await result.suite.claimTopicsRegistry.getAddress(),
          trustedIssuersRegistry: await result.suite.trustedIssuersRegistry.getAddress(),
          identityRegistryStorage: await result.suite.identityRegistryStorage.getAddress(),
          defaultCompliance: await result.suite.defaultCompliance.getAddress(),
          identityRegistry: await result.suite.identityRegistry.getAddress(),
          tokenOID: await result.suite.tokenOID.getAddress(),
          token: await result.suite.token.getAddress(),
        },
        authorities: {
          identityImplementationAuthority: await result.authorities.identityImplementationAuthority.getAddress(),
          trexImplementationAuthority: await result.authorities.trexImplementationAuthority.getAddress(),
        },
        factories: {
          identityFactory: await result.factories.identityFactory.getAddress(),
          trexFactory: await result.factories.trexFactory.getAddress(),
        },
        implementations: {
          identityImplementation: await result.implementations.identityImplementation.getAddress(),
          claimTopicsRegistryImplementation:
            await result.implementations.claimTopicsRegistryImplementation.getAddress(),
          trustedIssuersRegistryImplementation:
            await result.implementations.trustedIssuersRegistryImplementation.getAddress(),
          identityRegistryStorageImplementation:
            await result.implementations.identityRegistryStorageImplementation.getAddress(),
          identityRegistryImplementation: await result.implementations.identityRegistryImplementation.getAddress(),
          modularComplianceImplementation: await result.implementations.modularComplianceImplementation.getAddress(),
          tokenImplementation: await result.implementations.tokenImplementation.getAddress(),
        },
        identities: result.identities
          ? {
              aliceIdentity: await result.identities.aliceIdentity.getAddress(),
              bobIdentity: await result.identities.bobIdentity.getAddress(),
              charlieIdentity: await result.identities.charlieIdentity.getAddress(),
            }
          : undefined,
        accounts: exportAccounts(result.accounts as any, exportPrivateKeys),
      },
      null,
      2,
    )

    fs.writeFileSync('DeploymentOutput.json', content)
  }
})()
