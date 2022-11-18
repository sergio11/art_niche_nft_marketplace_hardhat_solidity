import { expect } from "chai";
import { ethers } from "hardhat";

describe("ArtMarketplaceContract", function () {

  async function deployContractFixture() {
    const [owner, addr1, addr2] = await ethers.getSigners()
    const utilsContractFactory = await ethers.getContractFactory("Utils")
    const utilsContractInstance = await utilsContractFactory.deploy()
    const artCollectibleContractFactory = await ethers.getContractFactory("ArtCollectibleContract")
    const artCollectibleContractInstance = await artCollectibleContractFactory.deploy()
    const artMarketplaceContractFactory = await ethers.getContractFactory("ArtMarketplaceContract", {
      libraries: {
        Utils: utilsContractInstance.address,
      },
    })
    const artMarketplace = await artMarketplaceContractFactory.deploy()
    await artMarketplace.setArtCollectibleAddress(artCollectibleContractInstance.address)
    await artCollectibleContractInstance.setMarketPlaceAddress(artMarketplace.address)
    await artMarketplace.deployed()
    return { artMarketplace, artCollectibleContractInstance, owner, addr1, addr2 }
  }

  const DEFAULT_METADATA_CID = "1321323"
  const DEFAULT_TOKEN_ROYALTY = 20

  it("Should set the right owner", async function () {
    const { artMarketplace, owner } = await deployContractFixture()
    expect(await artMarketplace.owner()).to.equal(owner.address)
  });

  it("Should set art collectible address", async function () {
    const { artMarketplace, artCollectibleContractInstance, owner } = await deployContractFixture()

    const artCollectibleAddr = await artMarketplace.connect(owner.address).getArtCollectibleAddress()

    expect(artCollectibleAddr).to.equal(artCollectibleContractInstance.address)
  });

  it("default cost of putting for sale", async function () {
    const { artMarketplace } = await deployContractFixture()

    const costOfPuttingForSale = await artMarketplace.costOfPuttingForSale()
    const defaultCostOfPuttingForSale = await artMarketplace.DEFAULT_COST_OF_PUTTING_FOR_SALE()
 
    expect(costOfPuttingForSale).to.equal(defaultCostOfPuttingForSale)
  });

  it("set cost of putting for sale", async function () {
    const { artMarketplace } = await deployContractFixture()
    const newCostOfPuttingForSale = 5

    await artMarketplace.setCostOfPuttingForSale(newCostOfPuttingForSale)
    const costOfPuttingForSale = await artMarketplace.costOfPuttingForSale()

    expect(costOfPuttingForSale).to.equal(newCostOfPuttingForSale)
  });

  it("put item for sale", async function () {
    const { artMarketplace, artCollectibleContractInstance, addr1 } = await deployContractFixture()
    const tokenPrice = 12
    const tokenId = 1

    
    await artCollectibleContractInstance.connect(addr1).mintToken(DEFAULT_METADATA_CID, DEFAULT_TOKEN_ROYALTY)
    const addr1BalanceBeforePutForSale = await artCollectibleContractInstance.balanceOf(addr1.address)
    let tx = await artMarketplace.connect(addr1).putItemForSale(tokenId, tokenPrice, {
      value: ethers.utils.formatUnits(await artMarketplace.costOfPuttingForSale(), "wei")
    })
    let receipt = await tx.wait()
    let events = receipt.events?.map((x) => x.event)
    const addr1BalanceAfterPutForSale = await artCollectibleContractInstance.balanceOf(addr1.address)
    const markerBalance = await artCollectibleContractInstance.balanceOf(artMarketplace.address)

    expect(addr1BalanceBeforePutForSale).to.be.equal(1)
    expect(addr1BalanceAfterPutForSale).to.be.equal(0)
    expect(markerBalance).to.be.equal(1)
    expect(events).to.be.an('array').that.is.not.empty
    expect(events!![1]).to.equal("ArtCollectibleAddedForSale")
  });

  it("withdraw from sale", async function () {
    const { artMarketplace, artCollectibleContractInstance, addr1} = await deployContractFixture()
    const tokenPrice = 12
    const tokenId = 1

    await artCollectibleContractInstance.connect(addr1).mintToken(DEFAULT_METADATA_CID, DEFAULT_TOKEN_ROYALTY)
    await artMarketplace.connect(addr1).putItemForSale(tokenId, tokenPrice, {
      value: ethers.utils.formatUnits(await artMarketplace.costOfPuttingForSale(), "wei")
    })
    let tx = await artMarketplace.connect(addr1).withdrawFromSale(tokenId)
    let receipt = await tx.wait()
    let events = receipt.events?.map((x) => x.event)
    const addr1Balance = await artCollectibleContractInstance.balanceOf(addr1.address)
    const markerBalance = await artCollectibleContractInstance.balanceOf(artMarketplace.address)

    expect(markerBalance).to.equal(0)
    expect(addr1Balance).to.equal(1)
    expect(events).to.be.an('array').that.is.not.empty
    expect(events!![1]).to.equal("ArtCollectibleWithdrawnFromSale")
  });

});
