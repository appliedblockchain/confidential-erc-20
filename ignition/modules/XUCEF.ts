import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

export default buildModule('XUCEFModule', (m) => {
  const name = m.getParameter('name', 'XUCEF')
  const symbol = m.getParameter('symbol', 'XUCEF')
  const decimals = m.getParameter('decimals', 18)
  const deployer = m.getAccount(0)

  const xucef = m.contract('XUCEF', [name, symbol, decimals, deployer], {
    id: 'XUCEF',
  })

  return { xucef }
})
