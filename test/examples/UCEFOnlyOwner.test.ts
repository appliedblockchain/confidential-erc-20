import { expect } from 'chai'
import { ethers } from 'hardhat'
import { Signer } from 'ethers'
import { UCEFOnlyOwner } from '../../typechain-types'
import { deployToken, transfer } from '../fixtures/deploy-token'
describe('UCEFOnlyOwner', function () {
  let token: UCEFOnlyOwner
  let owner: Signer
  let user1: Signer
  let user2: Signer
  let ownerAddress: string
  let user1Address: string
  let user2Address: string

  const TOKEN_NAME = 'UCEFOnlyOwner'
  const TOKEN_SYMBOL = 'uOOT'
  const INITIAL_SUPPLY = ethers.parseUnits('100', 18)
  const TRANSFER_AMOUNT = ethers.parseUnits('50', 18)

  beforeEach(async function () {
    // Get signers
    ;[owner, user1, user2] = await ethers.getSigners()
    ownerAddress = await owner.getAddress()
    user1Address = await user1.getAddress()
    user2Address = await user2.getAddress()

    token = await deployToken<UCEFOnlyOwner>('UCEFOnlyOwner', [], { initialSupply: INITIAL_SUPPLY })
  })

  describe('Deployment', function () {
    it('Should set the correct token name and symbol and initial supply', async function () {
      expect(await token.name()).to.equal(TOKEN_NAME)
      expect(await token.symbol()).to.equal(TOKEN_SYMBOL)
      expect(await token.balanceOf(ownerAddress)).to.equal(INITIAL_SUPPLY)
    })
  })

  describe('Transactions', function () {
    beforeEach(async function () {
      // Transfer some tokens to user1 for testing
      await transfer(token.connect(owner), user1Address, TRANSFER_AMOUNT)
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
      await transfer(token.connect(owner), user1Address, TRANSFER_AMOUNT)
    })

    it('Should return owner balance if the account is the owner', async function () {
      const balance = await token.balanceOf(ownerAddress)
      expect(balance).to.equal(INITIAL_SUPPLY - TRANSFER_AMOUNT)
    })

    it('Should revert if owner tries to access the balance of another account', async function () {
      await expect(token.balanceOf(user1Address)).to.be.revertedWithCustomError(token, 'UCEFUnauthorizedBalanceAccess')
    })

    it('Should return the correct balance for other accounts', async function () {
      const balance = await token.connect(user1).balanceOf(user1Address)
      expect(balance).to.equal(TRANSFER_AMOUNT)

      const balance2 = await token.connect(user2).balanceOf(user2Address)
      expect(balance2).to.equal(0)
    })

    it('Should revert if account tries to access the balance of another account', async function () {
      await expect(token.connect(user1).balanceOf(user2Address)).to.be.revertedWithCustomError(
        token,
        'UCEFUnauthorizedBalanceAccess',
      )
    })
  })
})
