import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'
import { UCEF3643Contracts } from '@appliedblockchain/ucef-3643'

export default buildModule('UCEF3643Module', (m) => {
  // Deploy UCEF3643 token Implementation
  const token = m.contract('UCEF3643', UCEF3643Contracts.UCEF3643, [], {
    id: 'UCEF3643',
  })

  return { token }
})
