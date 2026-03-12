import { task } from 'hardhat/config'

task('call', 'Execute a read-only call with cast-style params')
  .addPositionalParam('to', 'The destination of the call')
  .addPositionalParam('sig', 'The function signature to call')
  .addVariadicPositionalParam('args', 'The arguments of the function to call', [])
  .setAction(async (args, hre) => {
    const { to, sig, args: fnArgs } = args as {
      to: string
      sig: string
      args: string[]
    }

    const normalizedSig = sig.trim().startsWith('function ')
      ? sig.trim()
      : `function ${sig.trim()}`
    const iface = new hre.ethers.Interface([normalizedSig])
    let fragment: any = null
    iface.forEachFunction((f) => {
      if (!fragment) fragment = f
    })
    if (!fragment) {
      throw new Error('Invalid function signature')
    }
    const data = iface.encodeFunctionData(fragment, fnArgs)

    const result = await hre.ethers.provider.call({ to, data })

    if (fragment.outputs && fragment.outputs.length > 0) {
      const decoded = iface.decodeFunctionResult(fragment, result)
      const normalize = (v: unknown): unknown => {
        if (typeof v === 'bigint') return v.toString()
        if (Array.isArray(v)) return v.map(normalize)
        return v
      }
      const normalized = Array.from(decoded).map(normalize)
      if (normalized.length === 1) {
        console.log(normalized[0])
      } else {
        console.log(normalized)
      }
    } else {
      console.log(result)
    }
  })


