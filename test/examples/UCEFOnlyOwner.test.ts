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

  describe('Allowances', function () {
    const ALLOWANCE_AMOUNT = ethers.parseUnits('25', 18)

    beforeEach(async function () {
      // Transfer some tokens to user1 for testing
      await transfer(token.connect(owner), user1Address, TRANSFER_AMOUNT)
    })

    describe('Access Control', function () {
      beforeEach(async function () {
        // Set up an allowance for testing
        await token.connect(user1).approve(user2Address, ALLOWANCE_AMOUNT)
      })

      it('Should allow owner to view their own allowance', async function () {
        const allowance = await token.connect(user1).allowance(user1Address, user2Address)
        expect(allowance).to.equal(ALLOWANCE_AMOUNT)
      })

      it('Should allow spender to view their allowance', async function () {
        const allowance = await token.connect(user2).allowance(user1Address, user2Address)
        expect(allowance).to.equal(ALLOWANCE_AMOUNT)
      })

      it('Should revert when unauthorized third party tries to view allowance', async function () {
        await expect(token.connect(user2).allowance(user1Address, ownerAddress))
          .to.be.revertedWithCustomError(token, 'UCEFUnauthorizedBalanceAccess')
          .withArgs(user2Address, user1Address)
      })
    })

    describe('Setting Allowances', function () {
      it('Should set and get allowance correctly when called by owner', async function () {
        await token.connect(user1).approve(user2Address, ALLOWANCE_AMOUNT)
        const allowance = await token.connect(user1).allowance(user1Address, user2Address)
        expect(allowance).to.equal(ALLOWANCE_AMOUNT)
      })

      it('Should emit Approval event with zero addresses when setting allowance', async function () {
        await expect(token.connect(user1).approve(user2Address, ALLOWANCE_AMOUNT))
          .to.emit(token, 'Approval')
          .withArgs(ethers.ZeroAddress, ethers.ZeroAddress, 0n)
      })

      it('Should not allow setting allowance for zero address spender', async function () {
        await expect(token.connect(user1).approve(ethers.ZeroAddress, ALLOWANCE_AMOUNT))
          .to.be.revertedWithCustomError(token, 'ERC20InvalidSpender')
          .withArgs(ethers.ZeroAddress)
      })

      it('Should allow changing allowance', async function () {
        // Set initial allowance
        await token.connect(user1).approve(user2Address, ALLOWANCE_AMOUNT)

        // Change allowance
        const newAllowance = ALLOWANCE_AMOUNT * 2n
        await token.connect(user1).approve(user2Address, newAllowance)

        const allowance = await token.connect(user1).allowance(user1Address, user2Address)
        expect(allowance).to.equal(newAllowance)
      })
    })

    describe('Using Allowances', function () {
      beforeEach(async function () {
        // Set up allowance for testing
        await token.connect(user1).approve(user2Address, ALLOWANCE_AMOUNT)
      })

      it('Should allow spender to transfer allowed amount', async function () {
        // User2 transfers tokens from User1 to themselves
        await token.connect(user2).transferFrom(user1Address, user2Address, ALLOWANCE_AMOUNT)

        // Check balances
        expect(await token.connect(user1).balanceOf(user1Address)).to.equal(TRANSFER_AMOUNT - ALLOWANCE_AMOUNT)
        expect(await token.connect(user2).balanceOf(user2Address)).to.equal(ALLOWANCE_AMOUNT)

        // Check allowance is reduced (viewed by the spender)
        const finalAllowance = await token.connect(user2).allowance(user1Address, user2Address)
        expect(finalAllowance).to.equal(0)
      })

      it('Should not allow spender to transfer more than allowed amount', async function () {
        const exceedAmount = ALLOWANCE_AMOUNT + 1n
        await expect(token.connect(user2).transferFrom(user1Address, user2Address, exceedAmount))
          .to.be.revertedWithCustomError(token, 'ERC20InsufficientAllowance')
          .withArgs(ethers.ZeroAddress, 0n, 0n)
      })

      it('Should handle infinite allowance correctly', async function () {
        const infiniteAllowance = ethers.MaxUint256

        // Set infinite allowance
        await token.connect(user1).approve(user2Address, infiniteAllowance)

        // Perform a transfer
        const transferAmount = ALLOWANCE_AMOUNT
        await token.connect(user2).transferFrom(user1Address, user2Address, transferAmount)

        // Check that allowance remains infinite
        const allowance = await token.connect(user2).allowance(user1Address, user2Address)
        expect(allowance).to.equal(infiniteAllowance)
      })

      it('Should fail when trying to transfer with expired allowance', async function () {
        // Use up the allowance
        await token.connect(user2).transferFrom(user1Address, user2Address, ALLOWANCE_AMOUNT)

        // Try to transfer again
        await expect(token.connect(user2).transferFrom(user1Address, user2Address, 1n))
          .to.be.revertedWithCustomError(token, 'ERC20InsufficientAllowance')
          .withArgs(ethers.ZeroAddress, 0n, 0n)
      })
    })
  })
})
