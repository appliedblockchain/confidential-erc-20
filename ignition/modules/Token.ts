import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

export default buildModule('TokenModule', (m) => {
  const TOKEN_NAME = 'Confidential Token'
  const TOKEN_SYMBOL = 'CTK'

  const token = m.contract('Token', [TOKEN_NAME, TOKEN_SYMBOL], { id: 'Token' })

  return { token }
})
