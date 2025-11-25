import { expect } from 'chai'
import { ethers } from 'hardhat'
import { Signer } from 'ethers'
import { XUCEF } from '../../typechain-types'
import { deployToken } from '../fixtures/deploy-token'

describe('XUCEF', function () {
  let factory: Signer
  let bridge1: Signer
  let bridge2: Signer
  let user: Signer
  let other: Signer

  let factoryAddress: string
  let bridge1Address: string
  let bridge2Address: string
  let userAddress: string
  let otherAddress: string

  let token: XUCEF

  const TOKEN_NAME = 'XUCEF'
  const TOKEN_SYMBOL = 'xUCEF'
  const ONE_DAY = 24 * 60 * 60

  async function advanceTime(seconds: number) {
    await ethers.provider.send('evm_increaseTime', [seconds])
    await ethers.provider.send('evm_mine', [])
  }

  beforeEach(async function () {
    ;[factory, bridge1, bridge2, user, other] = await ethers.getSigners()
    factoryAddress = await factory.getAddress()
    bridge1Address = await bridge1.getAddress()
    bridge2Address = await bridge2.getAddress()
    userAddress = await user.getAddress()
    otherAddress = await other.getAddress()

    token = await deployToken<XUCEF>('XUCEF', [TOKEN_NAME, TOKEN_SYMBOL, 18, factoryAddress])
  })

  describe('Deployment', function () {
    it('sets name, symbol, FACTORY and owner', async function () {
      expect(await token.name()).to.equal(TOKEN_NAME)
      expect(await token.symbol()).to.equal(TOKEN_SYMBOL)
      expect(await token.FACTORY()).to.equal(factoryAddress)
      expect(await token.owner()).to.equal(factoryAddress)
    })

    it('starts with zero limits for unknown bridge', async function () {
      expect(await token.mintingMaxLimitOf(bridge1Address)).to.equal(0n)
      expect(await token.burningMaxLimitOf(bridge1Address)).to.equal(0n)
      expect(await token.mintingCurrentLimitOf(bridge1Address)).to.equal(0n)
      expect(await token.burningCurrentLimitOf(bridge1Address)).to.equal(0n)
    })
  })

  describe('Lockbox', function () {
    it('only FACTORY can set lockbox and emits event', async function () {
      await expect(token.connect(factory).setLockbox(otherAddress))
        .to.emit(token, 'LockboxSet')
        .withArgs(otherAddress)

      expect(await token.lockbox()).to.equal(otherAddress)

      await expect(token.connect(other).setLockbox(userAddress)).to.be.reverted
    })
  })

  describe('Owner-managed limits', function () {
    it('only owner can set limits; emits BridgeLimitsSet; sets params and rates', async function () {
      const mintLimit = ethers.parseEther('1000')
      const burnLimit = ethers.parseEther('500')

      await expect(token.connect(factory).setLimits(bridge1Address, mintLimit, burnLimit))
        .to.emit(token, 'BridgeLimitsSet')
        .withArgs(mintLimit, burnLimit, bridge1Address)

      expect(await token.mintingMaxLimitOf(bridge1Address)).to.equal(mintLimit)
      expect(await token.burningMaxLimitOf(bridge1Address)).to.equal(burnLimit)
      expect(await token.mintingCurrentLimitOf(bridge1Address)).to.equal(mintLimit)
      expect(await token.burningCurrentLimitOf(bridge1Address)).to.equal(burnLimit)

      const bridgeParams = await token.bridges(bridge1Address)
      expect(bridgeParams.minterParams.ratePerSecond).to.equal(mintLimit / BigInt(ONE_DAY))
      expect(bridgeParams.burnerParams.ratePerSecond).to.equal(burnLimit / BigInt(ONE_DAY))

      await expect(token.connect(other).setLimits(bridge1Address, 1n, 1n)).to.be.reverted
    })

    it('reverts when limits exceed half of uint256', async function () {
      const tooHigh = (ethers.MaxUint256 / 2n) + 1n
      await expect(token.connect(factory).setLimits(bridge1Address, tooHigh, 1n)).to.be.reverted
      await expect(token.connect(factory).setLimits(bridge1Address, 1n, tooHigh)).to.be.reverted
    })
  })

  describe('Minting with limits', function () {
    const limit = ethers.parseEther('100')

    beforeEach(async function () {
      await token.connect(factory).setLimits(bridge1Address, limit, limit)
    })

    it('reverts when a non-lockbox caller without limits mints', async function () {
      await expect(token.connect(other).mint(userAddress, 1n)).to.be.reverted
    })

    it('allows bridge to mint within limit and decreases current limit', async function () {
      const amount = ethers.parseEther('40')

      const EVENT_TYPE_TRANSFER = ethers.id('Transfer(address,address,uint256)')
      const payload = ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'address', 'uint256'],
        [ethers.ZeroAddress, userAddress, amount]
      )
      await expect(token.connect(bridge1).mint(userAddress, amount))
        .to.emit(token, 'PrivateEvent')
        .withArgs([userAddress], EVENT_TYPE_TRANSFER, payload)

      const current = await token.mintingCurrentLimitOf(bridge1Address)
      expect(current).to.equal(limit - amount)

      expect(await token.totalSupply()).to.equal(amount)
    })

    it('refills current limit linearly over time up to max', async function () {
      const amount = ethers.parseEther('60')
      await token.connect(bridge1).mint(userAddress, amount)

      expect(await token.mintingCurrentLimitOf(bridge1Address)).to.equal(limit - amount)

      await advanceTime(ONE_DAY)

      expect(await token.mintingCurrentLimitOf(bridge1Address)).to.equal(limit)
    })

    it('reverts when attempting to mint above current limit', async function () {
      await token.connect(bridge1).mint(userAddress, limit)
      await expect(token.connect(bridge1).mint(userAddress, limit)).to.be.reverted
    })

    it('bypasses limits when called by lockbox', async function () {
      await token.connect(factory).setLockbox(otherAddress)

      const amount = ethers.parseEther('200')
      const EVENT_TYPE_TRANSFER = ethers.id('Transfer(address,address,uint256)')
      const payload = ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'address', 'uint256'],
        [ethers.ZeroAddress, userAddress, amount]
      )
      await expect(token.connect(other).mint(userAddress, amount))
        .to.emit(token, 'PrivateEvent')
        .withArgs([userAddress], EVENT_TYPE_TRANSFER, payload)

      const current = await token.mintingCurrentLimitOf(bridge1Address)
      expect(current).to.equal(limit)
    })
  })

  describe('Burning with limits', function () {
    const limit = ethers.parseEther('100')

    beforeEach(async function () {
      await token.connect(factory).setLimits(bridge1Address, limit, limit)
      await token.connect(factory).setLockbox(otherAddress)
      await token.connect(other).mint(userAddress, ethers.parseEther('90'))
    })

    it('requires allowance when caller is not the user', async function () {
      await expect(token.connect(bridge1).burn(userAddress, ethers.parseEther('1'))).to.be.reverted
    })

    it('allows bridge to burn within limit with allowance and reduces current limit', async function () {
      const burnAmount = ethers.parseEther('50')

      await token.connect(user).approve(bridge1Address, burnAmount)

      const EVENT_TYPE_TRANSFER = ethers.id('Transfer(address,address,uint256)')
      const payload = ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'address', 'uint256'],
        [userAddress, ethers.ZeroAddress, burnAmount]
      )
      await expect(token.connect(bridge1).burn(userAddress, burnAmount))
        .to.emit(token, 'PrivateEvent')
        .withArgs([userAddress], EVENT_TYPE_TRANSFER, payload)

      const current = await token.burningCurrentLimitOf(bridge1Address)
      expect(current).to.equal(limit - burnAmount)

      expect(await token.totalSupply()).to.equal(ethers.parseEther('40'))
    })

    it('reverts when attempting to burn above current limit', async function () {
      await token.connect(user).approve(bridge1Address, limit + 1n)
      await expect(token.connect(bridge1).burn(userAddress, limit + 1n)).to.be.reverted
    })

    it('reverts if user burns without personal burner limit', async function () {
      await expect(token.connect(user).burn(userAddress, 1n)).to.be.reverted
    })

    it('bypasses limits when lockbox burns with allowance', async function () {
      const burnAmount = ethers.parseEther('10')
      await token.connect(user).approve(otherAddress, burnAmount)

      const EVENT_TYPE_TRANSFER = ethers.id('Transfer(address,address,uint256)')
      const payload = ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'address', 'uint256'],
        [userAddress, ethers.ZeroAddress, burnAmount]
      )
      await expect(token.connect(other).burn(userAddress, burnAmount))
        .to.emit(token, 'PrivateEvent')
        .withArgs([userAddress], EVENT_TYPE_TRANSFER, payload)

      const current = await token.burningCurrentLimitOf(bridge1Address)
      expect(current).to.equal(limit)
    })
  })

  describe('ERC20Permit', function () {
    it('sets allowance via permit', async function () {
      const value = ethers.parseEther('123')
      const latest = await ethers.provider.getBlock('latest')
      const deadline = BigInt((latest?.timestamp ?? 0) + 3600)

      const nonce = await token.nonces(await user.getAddress())
      const chainId = (await ethers.provider.getNetwork()).chainId

      const domain = {
        name: await token.name(),
        version: '1',
        chainId,
        verifyingContract: await token.getAddress(),
      }

      const types = {
        Permit: [
          { name: 'owner', type: 'address' },
          { name: 'spender', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
        ],
      }

      const message = {
        owner: userAddress,
        spender: otherAddress,
        value,
        nonce,
        deadline,
      }

      const signature = await user.signTypedData(domain, types as any, message)
      const { r, s, v } = ethers.Signature.from(signature)

      await token.permit(userAddress, otherAddress, value, deadline, v, r, s)

      const allowanceAsSpender = await token.connect(other).allowance(userAddress, otherAddress)
      expect(allowanceAsSpender).to.equal(value)
    })
  })

  describe('Ownership', function () {
    it('only owner can set limits and new owner after transfer can manage', async function () {
      await expect(token.connect(other).setLimits(bridge2Address, 1n, 1n)).to.be.reverted

      await token.connect(factory).transferOwnership(otherAddress)
      expect(await token.owner()).to.equal(otherAddress)

      await expect(token.connect(factory).setLimits(bridge2Address, 1n, 1n)).to.be.reverted

      await expect(token.connect(other).setLimits(bridge2Address, 1n, 1n))
        .to.emit(token, 'BridgeLimitsSet')
        .withArgs(1n, 1n, bridge2Address)
    })
  })

  describe('UCEF behavior (privacy and allowances)', function () {
    const minted = ethers.parseEther('100')

    beforeEach(async function () {
      await token.connect(factory).setLockbox(otherAddress)
      await token.connect(other).mint(userAddress, minted)
    })

    it('owner can see own balance; others revert', async function () {
      expect(await token.connect(user).balanceOf(userAddress)).to.equal(minted)
      await expect(token.connect(factory).balanceOf(userAddress))
        .to.be.revertedWithCustomError(token, 'UCEFUnauthorizedBalanceAccess')
        .withArgs(factoryAddress, userAddress)
      await expect(token.connect(bridge1).balanceOf(userAddress))
        .to.be.revertedWithCustomError(token, 'UCEFUnauthorizedBalanceAccess')
        .withArgs(bridge1Address, userAddress)
      expect(await token.totalSupply()).to.equal(minted)
    })

    it('allowance can be viewed by owner or spender; third party reverts', async function () {
      const allowanceAmount = 123n
      await token.connect(user).approve(bridge1Address, allowanceAmount)

      const asOwner = await token.connect(user).allowance(userAddress, bridge1Address)
      expect(asOwner).to.equal(allowanceAmount)

      const asSpender = await token.connect(bridge1).allowance(userAddress, bridge1Address)
      expect(asSpender).to.equal(allowanceAmount)

      await expect(token.connect(other).allowance(userAddress, bridge1Address))
        .to.be.revertedWithCustomError(token, 'UCEFUnauthorizedBalanceAccess')
        .withArgs(otherAddress, userAddress)
    })

    it('approve emits PrivateEvent and transferFrom reduces allowance', async function () {
      const allowanceAmount = ethers.parseEther('10')
      {
        const EVENT_TYPE_APPROVAL = ethers.id('Approval(address,address,uint256)')
        const payload = ethers.AbiCoder.defaultAbiCoder().encode(
          ['address', 'address', 'uint256'],
          [userAddress, bridge1Address, allowanceAmount]
        )
        await expect(token.connect(user).approve(bridge1Address, allowanceAmount))
          .to.emit(token, 'PrivateEvent')
          .withArgs([userAddress, bridge1Address], EVENT_TYPE_APPROVAL, payload)
      }

      const spend1 = ethers.parseEther('6')
      {
        const EVENT_TYPE_TRANSFER = ethers.id('Transfer(address,address,uint256)')
        const payload = ethers.AbiCoder.defaultAbiCoder().encode(
          ['address', 'address', 'uint256'],
          [userAddress, otherAddress, spend1]
        )
        await expect(token.connect(bridge1).transferFrom(userAddress, otherAddress, spend1))
          .to.emit(token, 'PrivateEvent')
          .withArgs([userAddress, otherAddress], EVENT_TYPE_TRANSFER, payload)
      }

      const remaining = await token.connect(bridge1).allowance(userAddress, bridge1Address)
      expect(remaining).to.equal(allowanceAmount - spend1)

      await expect(token.connect(bridge1).transferFrom(userAddress, otherAddress, allowanceAmount))
        .to.be.reverted

      expect(await token.totalSupply()).to.equal(minted)
    })
  })
})


