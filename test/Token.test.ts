import { expect } from 'chai'
import { ethers } from 'hardhat'
import { Signer } from 'ethers'
import { Token, Token__factory } from '../typechain-types'

describe('Token', function () {
  let token: Token
  let owner: Signer
  let user1: Signer
  let user2: Signer
  let ownerAddress: string
  let user1Address: string
  let user2Address: string

  const TOKEN_NAME = 'My Token'
  const TOKEN_SYMBOL = 'MTO'
  const INITIAL_SUPPLY = ethers.parseUnits('100', 18)
  const TRANSFER_AMOUNT = ethers.parseUnits('50', 18)

  beforeEach(async function () {
    // Get signers
    ;[owner, user1, user2] = await ethers.getSigners()
    ownerAddress = await owner.getAddress()
    user1Address = await user1.getAddress()
    user2Address = await user2.getAddress()

    // Deploy Token contract
    token = await new Token__factory(owner).deploy(TOKEN_NAME, TOKEN_SYMBOL)
    await token.waitForDeployment()

    await token.connect(owner).mint(ownerAddress, INITIAL_SUPPLY)
    const totalSupply = await token.totalSupply()
    expect(totalSupply).to.equal(INITIAL_SUPPLY)
  })

  describe('Deployment', function () {
    it('Should set the correct token name and symbol', async function () {
      expect(await token.name()).to.equal(TOKEN_NAME)
      expect(await token.symbol()).to.equal(TOKEN_SYMBOL)
    })
  })

  describe('Transactions', function () {
    beforeEach(async function () {
      // Transfer some tokens to user1 for testing
      await token.connect(owner).transfer(user1Address, TRANSFER_AMOUNT)
    })

    it('Should transfer tokens between accounts', async function () {
      // Transfer from user1 to user2
      const halfAmount = TRANSFER_AMOUNT / 2n
      await expect(token.connect(user1).transfer(user2Address, halfAmount))
        .to.emit(token, 'Transfer')
        .withArgs(ethers.ZeroAddress, ethers.ZeroAddress, halfAmount)
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
      await token.connect(owner).transfer(user1Address, TRANSFER_AMOUNT)
    })

    it('Should return owner balance if the account is the owner', async function () {
      const balance = await token.balanceOf(ownerAddress)
      expect(balance).to.equal(INITIAL_SUPPLY - TRANSFER_AMOUNT)
    })

    it('Should revert if owner tries to access the balance of another account', async function () {
      await expect(token.balanceOf(user1Address)).to.be.revertedWithCustomError(
        token,
        'ERC20PrivateUnauthorizedBalanceAccess',
      )
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
        'ERC20PrivateUnauthorizedBalanceAccess',
      )
    })
  })
})
