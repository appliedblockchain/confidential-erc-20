import { expect } from 'chai'
import { ethers } from 'hardhat'
import { Signer } from 'ethers'
import { UCEFCustom } from '../../typechain-types'
import { deployToken, mintTo } from '../fixtures/deploy-token'

describe('UCEFCustom', function () {
  let token: UCEFCustom
  let regulator: Signer
  let user1: Signer
  let user2: Signer
  let regulatorAddress: string
  let user1Address: string
  let user2Address: string

  const TOKEN_NAME = 'UCEFCustom'
  const TOKEN_SYMBOL = 'uOCT'
  const BALANCE_THRESHOLD = ethers.parseEther('10000')
  const ABOVE_THRESHOLD_AMOUNT = BALANCE_THRESHOLD + ethers.parseEther('1')
  const BELOW_THRESHOLD_AMOUNT = ethers.parseEther('1000')

  beforeEach(async function () {
    // Get signers
    ;[regulator, user1, user2] = await ethers.getSigners()
    regulatorAddress = await regulator.getAddress()
    user1Address = await user1.getAddress()
    user2Address = await user2.getAddress()

    token = await deployToken<UCEFCustom>('UCEFCustom', [])
  })

  describe('Deployment', function () {
    it('Should set the correct token name and symbol', async function () {
      expect(await token.name()).to.equal(TOKEN_NAME)
      expect(await token.symbol()).to.equal(TOKEN_SYMBOL)
    })

    it('Should set the deployer as the regulator', async function () {
      expect(await token.regulator()).to.equal(regulatorAddress)
    })
  })

  describe('Minting', function () {
    it('Should allow anyone to mint tokens', async function () {
      await expect(token.connect(user1).mint(user1Address, ABOVE_THRESHOLD_AMOUNT))
        .to.emit(token, 'Transfer')
        .withArgs(ethers.ZeroAddress, ethers.ZeroAddress, 0n)

      const balance = await token.connect(user1).balanceOf(user1Address)
      expect(balance).to.equal(ABOVE_THRESHOLD_AMOUNT)
    })
  })

  describe('Balance visibility', function () {
    beforeEach(async function () {
      // Setup balances for testing
      await mintTo(token, user1Address, ABOVE_THRESHOLD_AMOUNT)
      await mintTo(token, user2Address, BELOW_THRESHOLD_AMOUNT)
    })

    it('Should allow users to view their own balance regardless of threshold', async function () {
      const user1Balance = await token.connect(user1).balanceOf(user1Address)
      expect(user1Balance).to.equal(ABOVE_THRESHOLD_AMOUNT)

      const user2Balance = await token.connect(user2).balanceOf(user2Address)
      expect(user2Balance).to.equal(BELOW_THRESHOLD_AMOUNT)
    })

    it('Should allow regulator to view balances above threshold', async function () {
      const balance = await token.connect(regulator).balanceOf(user1Address)
      expect(balance).to.equal(ABOVE_THRESHOLD_AMOUNT)
    })

    it('Should revert when regulator tries to view balances below threshold', async function () {
      await expect(token.connect(regulator).balanceOf(user2Address)).to.be.revertedWith(
        'Unauthorized access to balance',
      )
    })

    it('Should revert when non-owner tries to view another account balance', async function () {
      await expect(token.connect(user1).balanceOf(user2Address)).to.be.revertedWith('Unauthorized access to balance')
    })
  })

  describe('Transactions', function () {
    beforeEach(async function () {
      await mintTo(token, user1Address, ABOVE_THRESHOLD_AMOUNT)
    })

    it('Should transfer tokens between accounts and emit Transfer event with all zero addresses', async function () {
      const transferAmount = ethers.parseEther('1000')
      await expect(token.connect(user1).transfer(user2Address, transferAmount))
        .to.emit(token, 'Transfer')
        .withArgs(ethers.ZeroAddress, ethers.ZeroAddress, 0n)

      const user2Balance = await token.connect(user2).balanceOf(user2Address)
      expect(user2Balance).to.equal(transferAmount)
    })

    it("Should fail if sender doesn't have enough tokens", async function () {
      const tooMuchAmount = ABOVE_THRESHOLD_AMOUNT + ethers.parseEther('1')
      await expect(token.connect(user1).transfer(user2Address, tooMuchAmount)).to.be.reverted
    })
  })
})
