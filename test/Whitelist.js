const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('Whitelist', function () {
    let token, crowdsale, deployer, user1, user2

    const NAME = 'GhostRogue'
    const SYMBOL = 'GSTRG'
    const MAX_SUPPLY = '1000000000'
    const PRICE = ethers.utils.parseUnits('0.025', 'ether')
    const SALE_START = Math.floor(Date.now() / 1000) // Current time in seconds

    beforeEach(async function() {
        // Get contract factories and signers
        [deployer, user1, user2] = await ethers.getSigners()
        const Token = await ethers.getContractFactory('Token')
        const Crowdsale = await ethers.getContractFactory('Crowdsale')

        // Deploy token
        token = await Token.deploy(NAME, SYMBOL, MAX_SUPPLY)
        await token.deployed()

        // Deploy crowdsale with timestamp
        crowdsale = await Crowdsale.deploy(
            token.address,
            PRICE,
            ethers.utils.parseUnits(MAX_SUPPLY, 'ether'),
            SALE_START
        )
        
        await crowdsale.deployed()

        // Send tokens to crowdsale
        const transaction = await token.transfer(
            crowdsale.address,
            ethers.utils.parseUnits(MAX_SUPPLY, 'ether')
        )
        await transaction.wait()
    })

    describe('Whitelisting', function() {
        it('allows owner to whitelist address', async function() {
            await crowdsale.addToWhitelist(user1.address)
            expect(await crowdsale.isWhitelisted(user1.address)).to.equal(true)
        })

        it('prevents non-owner from whitelisting address', async function() {
            await expect(
                crowdsale.connect(user1).addToWhitelist(user2.address)
            ).to.be.revertedWith('Caller is not the owner')
        })
    })

    describe('Buying Tokens', function() {
        let amount = ethers.utils.parseUnits('10', 'ether')

        it('allows whitelisted address to buy tokens', async function() {
            // Whitelist user1
            await crowdsale.addToWhitelist(user1.address)

            // Attempt to buy tokens
            await crowdsale.connect(user1).buyTokens(amount, {
                value: ethers.utils.parseUnits('0.25', 'ether')
            })

            expect(await token.balanceOf(user1.address)).to.equal(amount)
        })

        it('prevents non-whitelisted address from buying tokens', async function() {
            await expect(
                crowdsale.connect(user2).buyTokens(amount, {
                    value: ethers.utils.parseUnits('0.25', 'ether')
                })
            ).to.be.revertedWith('Address is not whitelisted')
        })
    })

    describe('Timestamp', function() {
        let amount = ethers.utils.parseUnits('10', 'ether')

        beforeEach(async function() {
            // Whitelist user1 for testing
            await crowdsale.addToWhitelist(user1.address)
        })

        it('allows purchase after sale start', async function() {
            // Since we set immediate start in deploy.js, this should work
            await crowdsale.connect(user1).buyTokens(amount, {
                value: ethers.utils.parseUnits('0.25', 'ether')
            })
            expect(await token.balanceOf(user1.address)).to.equal(amount)
        })

        it('returns the correct sale open time', async function() {
            const saleOpenTime = await crowdsale.saleOpenTime()
            expect(saleOpenTime).to.be.lte(Math.floor(Date.now() / 1000)) // Should be less than or equal to current time
        })

        it('allows checking if sale is open', async function() {
            const currentTime = Math.floor(Date.now() / 1000)
            const saleOpenTime = await crowdsale.saleOpenTime()
            expect(currentTime).to.be.gte(saleOpenTime) // Current time should be greater than or equal to sale open time
        })
    })
})
