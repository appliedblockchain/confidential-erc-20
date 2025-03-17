import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

export default buildModule('UCEFCustomModule', (m) => {
  const ucefCustom = m.contract('UCEFCustom', [], {
    id: 'UCEFCustom',
  })

  return { ucefCustom }
})
