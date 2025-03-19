import { expect } from 'chai'
import { ethers } from 'hardhat'
import { Signer } from 'ethers'
import { UCEFOnlyOwnerSharable } from '../../typechain-types'
import { deployToken } from '../fixtures/deploy-token'

describe('UCEFOnlyOwnerSharable', function () {
  let token: UCEFOnlyOwnerSharable
  let owner: Signer
  let user1: Signer
  let user2: Signer
  let viewer: Signer
  let supervisor: Signer
  let ownerAddress: string
  let user1Address: string
  let user2Address: string
  let viewerAddress: string
  let supervisorAddress: string

  const TOKEN_NAME = 'UCEFOnlyOwnerSharable'
  const TOKEN_SYMBOL = 'uOOT'
  const INITIAL_SUPPLY = ethers.parseUnits('100', 18)
  const TRANSFER_AMOUNT = ethers.parseUnits('50', 18)

  beforeEach(async function () {
    // Get signers
    ;[owner, user1, user2, viewer, supervisor] = await ethers.getSigners()
    ownerAddress = await owner.getAddress()
    user1Address = await user1.getAddress()
    user2Address = await user2.getAddress()
    viewerAddress = await viewer.getAddress()
    supervisorAddress = await supervisor.getAddress()

    token = await deployToken<UCEFOnlyOwnerSharable>('UCEFOnlyOwnerSharable', [], {})
  })

  describe('Deployment', function () {
    it('Should set the correct token name and symbol', async function () {
      expect(await token.name()).to.equal(TOKEN_NAME)
      expect(await token.symbol()).to.equal(TOKEN_SYMBOL)
    })

    it('Should set the deployer as the supervisor', async function () {
      expect(await token.supervisor()).to.equal(ownerAddress)
    })
  })

  describe('Minting', function () {
    it('Should allow minting tokens', async function () {
      await token.mint(user1Address, INITIAL_SUPPLY)
      const balance = await token.connect(user1).balanceOf(user1Address)
      expect(balance).to.equal(INITIAL_SUPPLY)
    })
  })

  describe('Transactions', function () {
    beforeEach(async function () {
      // Mint some tokens to user1 for testing
      await token.mint(user1Address, INITIAL_SUPPLY)
    })

    it('Should transfer tokens between accounts and emit Transfer event with all zero addresses', async function () {
      await expect(token.connect(user1).transfer(user2Address, TRANSFER_AMOUNT))
        .to.emit(token, 'Transfer')
        .withArgs(ethers.ZeroAddress, ethers.ZeroAddress, 0n)

      const user2Balance = await token.connect(user2).balanceOf(user2Address)
      expect(user2Balance).to.equal(TRANSFER_AMOUNT)
    })

    it("Should fail if sender doesn't have enough tokens", async function () {
      const tooMuchAmount = INITIAL_SUPPLY + ethers.parseUnits('1', 18)
      await expect(token.connect(user1).transfer(user2Address, tooMuchAmount)).to.be.reverted
    })
  })

  describe('Balance visibility', function () {
    beforeEach(async function () {
      await token.mint(user1Address, INITIAL_SUPPLY)
    })

    it('Should allow users to view their own balance', async function () {
      const balance = await token.connect(user1).balanceOf(user1Address)
      expect(balance).to.equal(INITIAL_SUPPLY)
    })

    it('Should not allow unauthorized users to view balances', async function () {
      await expect(token.connect(user2).balanceOf(user1Address)).to.be.revertedWithCustomError(
        token,
        'UCEFSharableUnauthorizedViewer',
      )
    })

    it('Should allow authorized viewers to see balance', async function () {
      await token.connect(user1).grantViewer(viewerAddress)
      const balance = await token.connect(viewer).balanceOf(user1Address)
      expect(balance).to.equal(INITIAL_SUPPLY)
    })

    it('Should allow supervisor to view any balance', async function () {
      const balance = await token.connect(owner).balanceOf(user1Address)
      expect(balance).to.equal(INITIAL_SUPPLY)
    })
  })

  describe('Viewer management', function () {
    it('Should allow users to grant viewing permission', async function () {
      await expect(token.connect(user1).grantViewer(viewerAddress))
        .to.emit(token, 'ViewerPermissionUpdated')
        .withArgs(user1Address, viewerAddress, true)

      expect(await token.hasViewPermission(user1Address, viewerAddress)).to.be.true
    })

    it('Should allow users to revoke viewing permission', async function () {
      await token.connect(user1).grantViewer(viewerAddress)
      await expect(token.connect(user1).revokeViewer(viewerAddress))
        .to.emit(token, 'ViewerPermissionUpdated')
        .withArgs(user1Address, viewerAddress, false)

      expect(await token.hasViewPermission(user1Address, viewerAddress)).to.be.false
    })

    it('Should not allow viewing after permission is revoked', async function () {
      await token.connect(user1).grantViewer(viewerAddress)
      await token.connect(user1).revokeViewer(viewerAddress)

      await expect(token.connect(viewer).balanceOf(user1Address)).to.be.revertedWithCustomError(
        token,
        'UCEFSharableUnauthorizedViewer',
      )
    })
  })

  describe('Supervisor management', function () {
    it('Should allow supervisor to update supervisor', async function () {
      await expect(token.connect(owner).updateSupervisor(supervisorAddress))
        .to.emit(token, 'SupervisorUpdated')
        .withArgs(ownerAddress, supervisorAddress)

      expect(await token.supervisor()).to.equal(supervisorAddress)
    })

    it('Should not allow non-supervisor to update supervisor', async function () {
      await expect(token.connect(user1).updateSupervisor(user2Address)).to.be.revertedWithCustomError(
        token,
        'UCEFSharableUnauthorizedAccount',
      )
    })

    it('Should allow disabling supervision by setting zero address', async function () {
      await token.connect(owner).updateSupervisor(ethers.ZeroAddress)
      expect(await token.supervisor()).to.equal(ethers.ZeroAddress)

      // Previous supervisor should no longer have access
      await expect(token.connect(owner).balanceOf(user1Address)).to.be.revertedWithCustomError(
        token,
        'UCEFSharableUnauthorizedViewer',
      )
    })

    it('Should not allow re-enabling supervision after it has been disabled', async function () {
      // First disable supervision
      await token.connect(owner).updateSupervisor(ethers.ZeroAddress)

      // Try to set a new supervisor
      await expect(token.connect(owner).updateSupervisor(supervisorAddress)).to.be.revertedWithCustomError(
        token,
        'UCEFSharableUnauthorizedAccount',
      )
    })

    it('Should maintain viewer permissions after supervisor change', async function () {
      await token.mint(user1Address, INITIAL_SUPPLY)
      await token.connect(user1).grantViewer(viewerAddress)
      await token.connect(owner).updateSupervisor(supervisorAddress)

      const balance = await token.connect(viewer).balanceOf(user1Address)
      expect(balance).to.equal(INITIAL_SUPPLY)
    })
  })
})
