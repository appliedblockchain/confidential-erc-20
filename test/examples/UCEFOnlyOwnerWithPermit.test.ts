import { expect } from 'chai'
import { ethers } from 'hardhat'
import { Signer } from 'ethers'
import { UCEFOnlyOwnerWithPermit } from '../../typechain-types'
import { deployToken } from '../fixtures/deploy-token'

describe('UCEFOnlyOwnerWithPermit', function () {
  let token: UCEFOnlyOwnerWithPermit
  let owner: Signer
  let user1: Signer
  let ownerAddress: string
  let user1Address: string

  const MINT_AMOUNT = ethers.parseUnits('100', 18)

  beforeEach(async function () {
    ;[owner, user1] = await ethers.getSigners()
    ownerAddress = await owner.getAddress()
    user1Address = await user1.getAddress()

    token = await deployToken<UCEFOnlyOwnerWithPermit>('UCEFOnlyOwnerWithPermit', [])
  })

  describe('Deployment', function () {
    it('Should set the correct token name and symbol', async function () {
      expect(await token.name()).to.equal('UCEFOnlyOwner')
      expect(await token.symbol()).to.equal('uOOT')
    })

    it('Should grant deployer the MINTER_ROLE', async function () {
      const MINTER_ROLE = await token.MINTER_ROLE()
      expect(await token.hasRole(MINTER_ROLE, ownerAddress)).to.be.true
    })
  })

  describe('Minting', function () {
    it('Should allow the minter to mint tokens', async function () {
      await token.connect(owner).mint(user1Address, MINT_AMOUNT)
      const balance = await token.connect(user1).balanceOf(user1Address)
      expect(balance).to.equal(MINT_AMOUNT)
    })

    it('Should revert when non-minter tries to mint tokens', async function () {
      await expect(token.connect(user1).mint(user1Address, MINT_AMOUNT))
        .to.be.revertedWithCustomError(token, 'UCEFUnauthorizedMint')
        .withArgs(user1Address, user1Address, MINT_AMOUNT)
    })
  })
})
