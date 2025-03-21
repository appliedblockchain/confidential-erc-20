import { deployFullSuiteFixture } from './deploy-full-suite.fixture'
;(async () => {
  const result = await deployFullSuiteFixture()

  console.log(
    JSON.stringify(
      {
        suite: {
          claimIssuerContract: await result.suite.claimIssuerContract.getAddress(),
          claimTopicsRegistry: await result.suite.claimTopicsRegistry.getAddress(),
          trustedIssuersRegistry: await result.suite.trustedIssuersRegistry.getAddress(),
          identityRegistryStorage: await result.suite.identityRegistryStorage.getAddress(),
          identityRegistry: await result.suite.identityRegistry.getAddress(),
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
      },
      null,
      2,
    ),
  )
})()
