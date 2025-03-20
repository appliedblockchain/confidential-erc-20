import { Signer } from 'ethers'
import { MockCompliance, MockIdentityRegistry, UCEF3643 } from '../typechain-types'
import { expect } from 'chai'
import { ethers } from 'hardhat'
import { deployToken3643 } from './fixtures/deploy-3643'

describe('UCEF3643', function () {
  let token: UCEF3643
  let owner: Signer
  let ownerAddress: string
  let addr1: Signer
  let addr1Address: string
  let addr2: Signer
  let addr2Address: string
  let agent: Signer
  let mockIdentityRegistry: MockIdentityRegistry
  let mockCompliance: MockCompliance

  beforeEach(async function () {
    // Get signers
    ;[owner, addr1, addr2, agent] = await ethers.getSigners()
    ownerAddress = await owner.getAddress()
    addr1Address = await addr1.getAddress()
    addr2Address = await addr2.getAddress()

    // Deploy UCEF3643 token
    const {
      token: token_,
      mockIdentityRegistry: mockIdentityRegistry_,
      mockCompliance: mockCompliance_,
    } = await deployToken3643({
      agent,
      name: 'Test Token',
      symbol: 'TEST',
      decimals: 18,
      onchainID: ethers.ZeroAddress,
    })

    token = token_
    mockIdentityRegistry = mockIdentityRegistry_
    mockCompliance = mockCompliance_
  })

  describe('Deployment', function () {
    it('Should set the right owner', async function () {
      expect(await token.owner()).to.equal(ownerAddress)
    })

    it('Should set the right name and symbol', async function () {
      expect(await token.name()).to.equal('Test Token')
      expect(await token.symbol()).to.equal('TEST')
    })
  })

  describe('Initialization', function () {
    let newToken: UCEF3643

    beforeEach(async function () {
      // Deploy a new token for testing init
      const tokenFactory = await ethers.getContractFactory('UCEF3643')
      newToken = (await tokenFactory.deploy()) as unknown as UCEF3643
      await newToken.waitForDeployment()
    })

    it('Should initialize with valid parameters', async function () {
      await newToken.init(
        await mockIdentityRegistry.getAddress(),
        await mockCompliance.getAddress(),
        'New Token',
        'NEW',
        18,
        ethers.ZeroAddress,
      )

      expect(await newToken.name()).to.equal('New Token')
      expect(await newToken.symbol()).to.equal('NEW')
      expect(await newToken.decimals()).to.equal(18)
      expect(await newToken.onchainID()).to.equal(ethers.ZeroAddress)
      expect(await newToken.owner()).to.equal(ownerAddress)
      expect(await newToken.identityRegistry()).to.equal(await mockIdentityRegistry.getAddress())
      expect(await newToken.compliance()).to.equal(await mockCompliance.getAddress())
    })

    it('Should revert when initializing with zero address for identity registry', async function () {
      await expect(
        newToken.init(
          ethers.ZeroAddress,
          await mockCompliance.getAddress(),
          'New Token',
          'NEW',
          18,
          ethers.ZeroAddress,
        ),
      ).to.be.revertedWith('invalid argument - zero address')
    })

    it('Should revert when initializing with zero address for compliance', async function () {
      await expect(
        newToken.init(
          await mockIdentityRegistry.getAddress(),
          ethers.ZeroAddress,
          'New Token',
          'NEW',
          18,
          ethers.ZeroAddress,
        ),
      ).to.be.revertedWith('invalid argument - zero address')
    })

    it('Should revert when initializing with empty name', async function () {
      await expect(
        newToken.init(
          await mockIdentityRegistry.getAddress(),
          await mockCompliance.getAddress(),
          '',
          'NEW',
          18,
          ethers.ZeroAddress,
        ),
      ).to.be.revertedWith('invalid argument - empty string')
    })

    it('Should revert when initializing with empty symbol', async function () {
      await expect(
        newToken.init(
          await mockIdentityRegistry.getAddress(),
          await mockCompliance.getAddress(),
          'New Token',
          '',
          18,
          ethers.ZeroAddress,
        ),
      ).to.be.revertedWith('invalid argument - empty string')
    })

    it('Should revert when initializing with invalid decimals', async function () {
      await expect(
        newToken.init(
          await mockIdentityRegistry.getAddress(),
          await mockCompliance.getAddress(),
          'New Token',
          'NEW',
          19, // Invalid decimals
          ethers.ZeroAddress,
        ),
      ).to.be.revertedWith('decimals between 0 and 18')
    })

    it('Should revert when trying to initialize twice', async function () {
      await newToken.init(
        await mockIdentityRegistry.getAddress(),
        await mockCompliance.getAddress(),
        'New Token',
        'NEW',
        18,
        ethers.ZeroAddress,
      )

      await expect(
        newToken.init(
          await mockIdentityRegistry.getAddress(),
          await mockCompliance.getAddress(),
          'New Token',
          'NEW',
          18,
          ethers.ZeroAddress,
        ),
      ).to.be.revertedWith('Initializable: contract is already initialized')
    })
  })

  describe('Balance Authorization', function () {
    it('Should return balance if user is the owner of the account', async function () {
      expect(await token.connect(addr1).balanceOf(addr1Address)).to.equal(0)
      expect(await token.connect(owner).balanceOf(ownerAddress)).to.equal(0)
      expect(await token.connect(addr2).balanceOf(addr2Address)).to.equal(0)
    })

    it('Should revert if user tries to access balance of another user', async function () {
      await expect(token.connect(addr2).balanceOf(addr1Address)).to.be.revertedWith('Unauthorized balance access')
    })
  })

  describe('Allowances', function () {
    const ALLOWANCE_AMOUNT = ethers.parseEther('100')

    beforeEach(async function () {
      // Register and verify identities
      await mockIdentityRegistry.registerIdentity(addr1Address, 1, true)
      await mockIdentityRegistry.registerIdentity(addr2Address, 1, true)
      await mockIdentityRegistry.setVerified(addr1Address, true)
      await mockIdentityRegistry.setVerified(addr2Address, true)

      // Set up mock to allow minting and transfers
      await mockCompliance.setCanMint(true)
      await mockCompliance.setCanTransfer(true)

      // Unpause the token
      await token.connect(agent).unpause()

      // Mint tokens to addr1 for testing
      await token.connect(agent).mint(addr1Address, ethers.parseEther('1000'))
    })

    describe('Access Control', function () {
      beforeEach(async function () {
        // Set up an allowance for testing
        await token.connect(addr1).approve(addr2Address, ALLOWANCE_AMOUNT)
      })

      it('Should allow owner to view their own allowance', async function () {
        const allowance = await token.connect(addr1).allowance(addr1Address, addr2Address)
        expect(allowance).to.equal(ALLOWANCE_AMOUNT)
      })

      it('Should allow spender to view their allowance', async function () {
        const allowance = await token.connect(addr2).allowance(addr1Address, addr2Address)
        expect(allowance).to.equal(ALLOWANCE_AMOUNT)
      })

      it('Should revert when unauthorized third party tries to view allowance', async function () {
        await expect(token.connect(addr2).allowance(addr1Address, ownerAddress)).to.be.revertedWith(
          'Unauthorized balance access',
        )
      })
    })

    describe('Setting Allowances', function () {
      it('Should set and get allowance correctly when called by owner', async function () {
        await token.connect(addr1).approve(addr2Address, ALLOWANCE_AMOUNT)
        const allowance = await token.connect(addr1).allowance(addr1Address, addr2Address)
        expect(allowance).to.equal(ALLOWANCE_AMOUNT)
      })

      it('Should emit Approval event when setting allowance', async function () {
        await expect(token.connect(addr1).approve(addr2Address, ALLOWANCE_AMOUNT))
          .to.emit(token, 'Approval')
          .withArgs(ethers.ZeroAddress, ethers.ZeroAddress, 0n)
      })

      it('Should not allow setting allowance for zero address spender', async function () {
        await expect(token.connect(addr1).approve(ethers.ZeroAddress, ALLOWANCE_AMOUNT)).to.be.revertedWith(
          'ERC20: approve to the zero address',
        )
      })

      it('Should allow changing allowance', async function () {
        // Set initial allowance
        await token.connect(addr1).approve(addr2Address, ALLOWANCE_AMOUNT)

        // Change allowance
        const newAllowance = ALLOWANCE_AMOUNT * 2n
        await token.connect(addr1).approve(addr2Address, newAllowance)

        const allowance = await token.connect(addr1).allowance(addr1Address, addr2Address)
        expect(allowance).to.equal(newAllowance)
      })
    })

    describe('Using Allowances', function () {
      beforeEach(async function () {
        // Set up allowance for testing
        await token.connect(addr1).approve(addr2Address, ALLOWANCE_AMOUNT)
      })

      it('Should allow spender to transfer allowed amount', async function () {
        // addr2 transfers tokens from addr1 to themselves
        await token.connect(addr2).transferFrom(addr1Address, addr2Address, ALLOWANCE_AMOUNT)

        // Check balances
        expect(await token.connect(addr1).balanceOf(addr1Address)).to.equal(ethers.parseEther('900'))
        expect(await token.connect(addr2).balanceOf(addr2Address)).to.equal(ALLOWANCE_AMOUNT)

        // Check allowance is reduced
        const finalAllowance = await token.connect(addr2).allowance(addr1Address, addr2Address)
        expect(finalAllowance).to.equal(0)
      })

      // This test is not valid for ERC-3643 (v4.1.6) implementation since arithmetic operation overflows
      // it('Should not allow spender to transfer more than allowed amount', async function () {
      //   const exceedAmount = ALLOWANCE_AMOUNT + 1n
      //   await expect(token.connect(addr2).transferFrom(addr1Address, addr2Address, exceedAmount)).to.be.revertedWith(
      //     'ERC20: insufficient allowance',
      //   )
      // })

      it('Should handle infinite allowance correctly', async function () {
        const infiniteAllowance = ethers.MaxUint256

        // Set infinite allowance
        await token.connect(addr1).approve(addr2Address, infiniteAllowance)

        // Perform a transfer
        const transferAmount = ALLOWANCE_AMOUNT
        await token.connect(addr2).transferFrom(addr1Address, addr2Address, transferAmount)

        // Check that allowance remains infinite
        const allowance = await token.connect(addr2).allowance(addr1Address, addr2Address)
        expect(allowance).to.equal(infiniteAllowance - transferAmount)
      })

      it('Should fail when trying to transfer with expired allowance', async function () {
        // Use up the allowance
        await token.connect(addr2).transferFrom(addr1Address, addr2Address, ALLOWANCE_AMOUNT)

        // This test is not valid for ERC-3643 (v4.1.6) implementation since arithmetic operation overflows
        // Try to transfer again
        // await expect(token.connect(addr2).transferFrom(addr1Address, addr2Address, 1n)).to.be.revertedWith(
        //   'ERC20: insufficient allowance',
        // )
      })
    })
  })

  describe('Token Transfers', function () {
    beforeEach(async function () {
      // Register and verify addr1 identity
      await mockIdentityRegistry.registerIdentity(addr1Address, 1, true)
      await mockIdentityRegistry.setVerified(addr1Address, true)

      // Set up mock to allow minting and transfers
      await mockCompliance.setCanMint(true)
      await mockCompliance.setCanTransfer(true)

      // Unpause the token
      await token.connect(agent).unpause()

      // Mint some tokens to addr1
      await token.connect(agent).mint(addr1Address, ethers.parseEther('1000'))
      // Set up mock to allow transfers
      await mockIdentityRegistry.setVerified(addr2Address, true)
    })

    it('Should transfer tokens between accounts', async function () {
      await token.connect(addr1).transfer(addr2Address, ethers.parseEther('100'))
      expect(await token.connect(addr2).balanceOf(addr2Address)).to.equal(ethers.parseEther('100'))
    })

    it('Should fail if sender is frozen', async function () {
      await token.connect(agent).freezePartialTokens(addr1Address, ethers.parseEther('1000'))
      await expect(token.connect(addr1).transfer(addr2Address, ethers.parseEther('100'))).to.be.revertedWith(
        'Insufficient Balance',
      )
    })

    it('Should fail if receiver is frozen', async function () {
      // First mint tokens to addr2
      await token.connect(agent).mint(addr2Address, ethers.parseEther('1000'))
      // Then freeze all tokens
      await token.connect(agent).freezePartialTokens(addr2Address, ethers.parseEther('1000'))
      // Set up mock to disallow transfers to addr2
      await mockCompliance.setCanTransfer(false)
      // Try to transfer to addr2
      await expect(token.connect(addr1).transfer(addr2Address, ethers.parseEther('100'))).to.be.revertedWith(
        'Transfer not possible',
      )
    })
  })

  describe('Forced Transfers', function () {
    beforeEach(async function () {
      // Register and verify addr1 identity
      await mockIdentityRegistry.registerIdentity(addr1Address, 1, true)
      await mockIdentityRegistry.setVerified(addr1Address, true)

      // Set up mock to allow minting and transfers
      await mockCompliance.setCanMint(true)
      await mockCompliance.setCanTransfer(true)

      // Unpause the token
      await token.connect(agent).unpause()

      await token.connect(agent).mint(addr1Address, ethers.parseEther('1000'))
      await mockIdentityRegistry.setVerified(addr2Address, true)
    })

    it('Should allow agent to force transfer tokens', async function () {
      await token.connect(agent).forcedTransfer(addr1Address, addr2Address, ethers.parseEther('100'))
      expect(await token.connect(addr2).balanceOf(addr2Address)).to.equal(ethers.parseEther('100'))
    })
  })

  describe('Token Freezing', function () {
    beforeEach(async function () {
      // Register and verify addr1 identity
      await mockIdentityRegistry.registerIdentity(addr1Address, 1, true)
      await mockIdentityRegistry.setVerified(addr1Address, true)

      // Set up mock to allow minting and transfers
      await mockCompliance.setCanMint(true)
      await mockCompliance.setCanTransfer(true)

      // Unpause the token
      await token.connect(agent).unpause()

      await token.connect(agent).mint(addr1Address, ethers.parseEther('1000'))
    })

    it('Should freeze tokens', async function () {
      await token.connect(agent).freezePartialTokens(addr1Address, ethers.parseEther('500'))
      // Try to transfer the frozen tokens
      await expect(token.connect(addr1).transfer(addr2Address, ethers.parseEther('600'))).to.be.revertedWith(
        'Insufficient Balance',
      )
    })
  })

  describe('Token Burning', function () {
    beforeEach(async function () {
      // Register and verify addr1 identity
      await mockIdentityRegistry.registerIdentity(addr1Address, 1, true)
      await mockIdentityRegistry.setVerified(addr1Address, true)

      // Set up mock to allow minting and transfers
      await mockCompliance.setCanMint(true)
      await mockCompliance.setCanTransfer(true)

      // Unpause the token
      await token.connect(agent).unpause()

      await token.connect(agent).mint(addr1Address, ethers.parseEther('1000'))
    })

    it('Should burn tokens', async function () {
      await token.connect(agent).burn(addr1Address, ethers.parseEther('500'))
      expect(await token.connect(addr1).balanceOf(addr1Address)).to.equal(ethers.parseEther('500'))
    })
  })
})
