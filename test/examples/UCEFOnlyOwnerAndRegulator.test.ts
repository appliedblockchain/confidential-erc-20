import { expect } from 'chai'
import { ethers } from 'hardhat'
import { Signer } from 'ethers'
import { UCEFOnlyOwnerAndRegulator } from '../../typechain-types'
import { deployToken, transfer } from '../fixtures/deploy-token'

describe('UCEFOnlyOwnerAndRegulator', function () {
  let token: UCEFOnlyOwnerAndRegulator
  let regulator: Signer
  let user1: Signer
  let user2: Signer
  let regulatorAddress: string
  let user1Address: string
  let user2Address: string

  const TOKEN_NAME = 'UCEFOnlyOwnerAndRegulator'
  const TOKEN_SYMBOL = 'uOOT'
  const INITIAL_SUPPLY = ethers.parseUnits('100', 18)
  const TRANSFER_AMOUNT = ethers.parseUnits('50', 18)

  beforeEach(async function () {
    // Get signers
    ;[regulator, user1, user2] = await ethers.getSigners()
    regulatorAddress = await regulator.getAddress()
    user1Address = await user1.getAddress()
    user2Address = await user2.getAddress()

    token = await deployToken<UCEFOnlyOwnerAndRegulator>('UCEFOnlyOwnerAndRegulator', [], {
      initialSupply: INITIAL_SUPPLY,
    })
  })

  describe('Deployment', function () {
    it('Should set the correct token name and symbol and initial supply', async function () {
      expect(await token.name()).to.equal(TOKEN_NAME)
      expect(await token.symbol()).to.equal(TOKEN_SYMBOL)
      expect(await token.balanceOf(regulatorAddress)).to.equal(INITIAL_SUPPLY)
    })

    it('Should set the deployer as the regulator', async function () {
      expect(await token.regulator()).to.equal(regulatorAddress)
    })
  })

  describe('Transactions', function () {
    beforeEach(async function () {
      // Transfer some tokens to user1 for testing
      await transfer(token.connect(regulator), user1Address, TRANSFER_AMOUNT)
    })

    it('Should transfer tokens between accounts and emit Transfer event with all zero addresses', async function () {
      // Transfer from user1 to user2
      const halfAmount = TRANSFER_AMOUNT / 2n
      await expect(token.connect(user1).transfer(user2Address, halfAmount))
        .to.emit(token, 'Transfer')
        .withArgs(ethers.ZeroAddress, ethers.ZeroAddress, 0n)
    })

    it("Should fail if sender doesn't have enough tokens", async function () {
      // Try to send more tokens than user1 has
      const doubleAmount = TRANSFER_AMOUNT * 2n
      await expect(token.connect(user1).transfer(user2Address, doubleAmount)).to.be.reverted
    })
  })

  describe('balanceOf', function () {
    beforeEach(async function () {
      // Transfer some tokens to user1 for testing
      await transfer(token.connect(regulator), user1Address, TRANSFER_AMOUNT)
    })

    it('Should allow regulator to access any account balance', async function () {
      const balance = await token.connect(regulator).balanceOf(user1Address)
      expect(balance).to.equal(TRANSFER_AMOUNT)
    })

    it('Should allow users to access their own balance', async function () {
      const balance = await token.connect(user1).balanceOf(user1Address)
      expect(balance).to.equal(TRANSFER_AMOUNT)

      const balance2 = await token.connect(user2).balanceOf(user2Address)
      expect(balance2).to.equal(0)
    })

    it('Should revert if non-regulator account tries to access another account balance', async function () {
      await expect(token.connect(user1).balanceOf(user2Address)).to.be.revertedWith('Unauthorized access to balance')
    })
  })

  describe('Regulator functionality', function () {
    it('Should allow regulator to update to a new regulator', async function () {
      await expect(token.connect(regulator).updateRegulator(user1Address))
        .to.emit(token, 'RegulatorUpdated')
        .withArgs(regulatorAddress, user1Address)

      expect(await token.regulator()).to.equal(user1Address)
    })

    it('Should not allow non-regulator to update regulator', async function () {
      await expect(token.connect(user1).updateRegulator(user2Address))
        .to.be.revertedWithCustomError(token, 'UCEFRegulatedUnauthorizedAccount')
        .withArgs(user1Address)
    })

    it('Should not allow updating regulator to zero address', async function () {
      await expect(token.connect(regulator).updateRegulator(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(token, 'UCEFRegulatedInvalidRegulator')
        .withArgs(ethers.ZeroAddress)
    })

    it('Should allow new regulator to perform regulator actions', async function () {
      // Update to new regulator
      await token.connect(regulator).updateRegulator(user1Address)

      // New regulator should be able to check any balance
      const balance = await token.connect(user1).balanceOf(user2Address)
      expect(balance).to.equal(0)

      // Old regulator should not be able to check balances anymore
      await expect(token.connect(regulator).balanceOf(user2Address)).to.be.revertedWith(
        'Unauthorized access to balance',
      )
    })
  })
})
