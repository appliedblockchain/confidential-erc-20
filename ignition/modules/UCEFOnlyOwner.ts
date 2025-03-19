import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

export default buildModule('UCEFOnlyOwnerModule', (m) => {
  const ucefOnlyOwner = m.contract('UCEFOnlyOwner', [], {
    id: 'UCEFOnlyOwner',
  })

  return { ucefOnlyOwner }
})
