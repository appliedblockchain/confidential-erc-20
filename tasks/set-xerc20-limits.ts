import { task, types } from 'hardhat/config'

task('xerc20:set-limits', 'Set minting and burning limits for a bridge on an XERC20 token')
  .addParam('token', 'Token contract address')
  .addParam('bridge', 'Bridge address')
  .addParam('mint', 'Minting limit in human units (e.g. 1000.5)', undefined, types.string)
  .addParam('burn', 'Burning limit in human units (e.g. 1000.5)', undefined, types.string)
  .setAction(async (args, hre) => {
    const { token, bridge, mint, burn } = args as {
      token: string
      bridge: string
      mint: string
      burn: string
    }

    const [signer] = await hre.ethers.getSigners()
    const contract = await hre.ethers.getContractAt('XUCEF', token, signer)
    const decimals = Number(await contract.decimals())
    const mintingLimit = hre.ethers.parseUnits(mint, decimals)
    const burningLimit = hre.ethers.parseUnits(burn, decimals)

    const tx = await contract.setLimits(bridge, mintingLimit, burningLimit)
    console.log(`submitted: ${tx.hash}`)
    const receipt = await tx.wait()
    console.log(`confirmed in block ${receipt.blockNumber}`)
  })


