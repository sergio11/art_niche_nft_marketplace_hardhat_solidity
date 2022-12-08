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
  const DEFAULT_TOKEN_PRICE = 12
  const DEFAULT_TOKEN_ID = 1

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
  
    await artCollectibleContractInstance.connect(addr1).mintToken(DEFAULT_METADATA_CID, DEFAULT_TOKEN_ROYALTY)
    const addr1BalanceBeforePutForSale = await artCollectibleContractInstance.balanceOf(addr1.address)
    let tx = await artMarketplace.connect(addr1).putItemForSale(DEFAULT_TOKEN_ID, DEFAULT_TOKEN_PRICE, {
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

    await artCollectibleContractInstance.connect(addr1).mintToken(DEFAULT_METADATA_CID, DEFAULT_TOKEN_ROYALTY)
    await artMarketplace.connect(addr1).putItemForSale(DEFAULT_TOKEN_ID, DEFAULT_TOKEN_PRICE, {
      value: ethers.utils.formatUnits(await artMarketplace.costOfPuttingForSale(), "wei")
    })
    let tx = await artMarketplace.connect(addr1).withdrawFromSale(DEFAULT_TOKEN_ID)
    let receipt = await tx.wait()
    let events = receipt.events?.map((x) => x.event)
    const addr1Balance = await artCollectibleContractInstance.balanceOf(addr1.address)
    const markerBalance = await artCollectibleContractInstance.balanceOf(artMarketplace.address)

    expect(markerBalance).to.equal(0)
    expect(addr1Balance).to.equal(1)
    expect(events).to.be.an('array').that.is.not.empty
    expect(events!![1]).to.equal("ArtCollectibleWithdrawnFromSale")
  });

  it("put item for sale - Sender does not own the item", async function () { 
    const { artMarketplace, artCollectibleContractInstance, addr1, addr2 } = await deployContractFixture()

    await artCollectibleContractInstance.connect(addr1).mintToken(DEFAULT_METADATA_CID, DEFAULT_TOKEN_ROYALTY)
    await artMarketplace.connect(addr1).putItemForSale(DEFAULT_TOKEN_ID, DEFAULT_TOKEN_PRICE, {
      value: ethers.utils.formatUnits(await artMarketplace.costOfPuttingForSale(), "wei")
    })
    var errorMessage: Error | null = null
    try {
      await artMarketplace.connect(addr1).putItemForSale(DEFAULT_TOKEN_ID, DEFAULT_TOKEN_PRICE, {
        value: ethers.utils.formatUnits(await artMarketplace.costOfPuttingForSale(), "wei")
      })
    } catch(error) {
      if (error instanceof Error) {
        errorMessage = error
      }
    }
    const addr1Balance = await artCollectibleContractInstance.balanceOf(addr1.address)
    const markerBalance = await artCollectibleContractInstance.balanceOf(artMarketplace.address)

    expect(addr1Balance).to.equal(0)
    expect(markerBalance).to.equal(1)
    expect(errorMessage).not.be.null
    expect(errorMessage!!.message).to.contain("Sender does not own the item")
  });

  it("buy item", async function () { 
    const { artMarketplace, artCollectibleContractInstance, addr1, addr2 } = await deployContractFixture()

    await artCollectibleContractInstance.connect(addr1).mintToken(DEFAULT_METADATA_CID, DEFAULT_TOKEN_ROYALTY)
    await artMarketplace.connect(addr1).putItemForSale(DEFAULT_TOKEN_ID, DEFAULT_TOKEN_PRICE, {
      value: ethers.utils.formatUnits(await artMarketplace.costOfPuttingForSale(), "wei")
    })
    let tx = await artMarketplace.connect(addr2).buyItem(DEFAULT_TOKEN_ID, {
      value: ethers.utils.formatUnits(DEFAULT_TOKEN_PRICE, "wei")
    })
    let receipt = await tx.wait()
    let events = receipt.events?.map((x) => x.event)
    const addr1Balance = await artCollectibleContractInstance.balanceOf(addr1.address)
    const addr2Balance = await artCollectibleContractInstance.balanceOf(addr2.address)
    const markerBalance = await artCollectibleContractInstance.balanceOf(artMarketplace.address)

    expect(events).to.be.an('array').that.is.not.empty
    expect(events!![1]).to.equal("ArtCollectibleSold")
    expect(markerBalance).to.equal(0)
    expect(addr1Balance).to.equal(0)
    expect(addr2Balance).to.equal(1)
  });


  it("buy item - wrong price", async function () { 
    const { artMarketplace, artCollectibleContractInstance, addr1, addr2 } = await deployContractFixture()

    await artCollectibleContractInstance.connect(addr1).mintToken(DEFAULT_METADATA_CID, DEFAULT_TOKEN_ROYALTY)
    await artMarketplace.connect(addr1).putItemForSale(DEFAULT_TOKEN_ID, DEFAULT_TOKEN_PRICE, {
      value: ethers.utils.formatUnits(await artMarketplace.costOfPuttingForSale(), "wei")
    })

    var errorMessage: Error | null = null
    try {
      await artMarketplace.connect(addr2).buyItem(DEFAULT_TOKEN_ID, {
        value: ethers.utils.formatUnits(1, "wei")
      })
    } catch(error) {
      if (error instanceof Error) {
        errorMessage = error
      }
    }

    expect(errorMessage).not.be.null
    expect(errorMessage!!.message).to.contain("Price must be equal to item price")
  });
  

  it("resell item", async function () { 
    const { artMarketplace, artCollectibleContractInstance, addr1, addr2 } = await deployContractFixture()
  
    await artCollectibleContractInstance.connect(addr1).mintToken(DEFAULT_METADATA_CID, DEFAULT_TOKEN_ROYALTY)
    await artMarketplace.connect(addr1).putItemForSale(DEFAULT_TOKEN_ID, DEFAULT_TOKEN_PRICE, {
      value: ethers.utils.formatUnits(await artMarketplace.costOfPuttingForSale(), "wei")
    })
    await artMarketplace.connect(addr2).buyItem(DEFAULT_TOKEN_ID, {
      value: ethers.utils.formatUnits(DEFAULT_TOKEN_PRICE, "wei")
    })
    await artCollectibleContractInstance.connect(addr2).approve(artMarketplace.address, DEFAULT_TOKEN_ID);
    await artMarketplace.connect(addr2).putItemForSale(DEFAULT_TOKEN_ID, DEFAULT_TOKEN_PRICE, {
      value: ethers.utils.formatUnits(await artMarketplace.costOfPuttingForSale(), "wei")
    })

    const addr1Balance = await artCollectibleContractInstance.balanceOf(addr1.address)
    const addr2Balance = await artCollectibleContractInstance.balanceOf(addr2.address)
    const markerBalance = await artCollectibleContractInstance.balanceOf(artMarketplace.address)
    const ownerOfToken = await artCollectibleContractInstance.ownerOf(DEFAULT_TOKEN_ID)

    expect(markerBalance).to.equal(1)
    expect(addr1Balance).to.equal(0)
    expect(addr2Balance).to.equal(0)
    expect(ownerOfToken).to.equal(artMarketplace.address)
    
  });

  it("fetch available market items", async function () { 
    const { artMarketplace, artCollectibleContractInstance, addr1, addr2 } = await deployContractFixture()

    await artCollectibleContractInstance.connect(addr1).mintToken(DEFAULT_METADATA_CID, DEFAULT_TOKEN_ROYALTY)
    await artMarketplace.connect(addr1).putItemForSale(DEFAULT_TOKEN_ID, DEFAULT_TOKEN_PRICE, {
      value: ethers.utils.formatUnits(await artMarketplace.costOfPuttingForSale(), "wei")
    })
    let availableItemsForAddr1 = await artMarketplace.connect(addr1).fetchAvailableMarketItems()
    let availableItemsForAddr2 = await artMarketplace.connect(addr2).fetchAvailableMarketItems()

    expect(availableItemsForAddr1).to.be.an('array').that.is.not.empty
    expect(availableItemsForAddr1).to.have.length(1)
    expect(availableItemsForAddr2).to.be.an('array').that.is.not.empty
    expect(availableItemsForAddr2).to.have.length(1)
  });

  it("fetch selling market items", async function () {  
    const { artMarketplace, artCollectibleContractInstance, addr1, addr2 } = await deployContractFixture()
    
    await artCollectibleContractInstance.connect(addr1).mintToken(DEFAULT_METADATA_CID, DEFAULT_TOKEN_ROYALTY)
    await artMarketplace.connect(addr1).putItemForSale(DEFAULT_TOKEN_ID, DEFAULT_TOKEN_PRICE, {
      value: ethers.utils.formatUnits(await artMarketplace.costOfPuttingForSale(), "wei")
    })
    let sellingItemsForAddr1 = await artMarketplace.connect(addr1).fetchSellingMarketItems()
    let sellingItemsForAddr2 = await artMarketplace.connect(addr2).fetchSellingMarketItems()

    expect(sellingItemsForAddr1).to.be.an('array').that.is.not.empty
    expect(sellingItemsForAddr1).to.have.length(1)
    expect(sellingItemsForAddr2).to.be.an('array').that.is.empty
  });

  it("fetch owned market items", async function () {  
    const { artMarketplace, artCollectibleContractInstance, addr1, addr2 } = await deployContractFixture()
    
    await artCollectibleContractInstance.connect(addr1).mintToken(DEFAULT_METADATA_CID, DEFAULT_TOKEN_ROYALTY)
    await artMarketplace.connect(addr1).putItemForSale(DEFAULT_TOKEN_ID, DEFAULT_TOKEN_PRICE, {
      value: ethers.utils.formatUnits(await artMarketplace.costOfPuttingForSale(), "wei")
    })
    let sellingItemsForAddr1 = await artMarketplace.connect(addr1).fetchOwnedMarketItems()
    let sellingItemsForAddr2 = await artMarketplace.connect(addr2).fetchOwnedMarketItems()
    let sellingItemsForMarketplaceAddr = await artMarketplace.connect(artMarketplace.address).fetchOwnedMarketItems()

    expect(sellingItemsForAddr1).to.be.an('array').that.is.empty
    expect(sellingItemsForAddr2).to.be.an('array').that.is.empty
    expect(sellingItemsForMarketplaceAddr).to.be.an('array').that.is.not.empty
    expect(sellingItemsForMarketplaceAddr).to.have.length(1)
  });

  it("fetch market history", async function () {  
    const { artMarketplace, artCollectibleContractInstance, addr1, addr2 } = await deployContractFixture()
  
    await artCollectibleContractInstance.connect(addr1).mintToken(DEFAULT_METADATA_CID, DEFAULT_TOKEN_ROYALTY)
    await artMarketplace.connect(addr1).putItemForSale(DEFAULT_TOKEN_ID, DEFAULT_TOKEN_PRICE, {
      value: ethers.utils.formatUnits(await artMarketplace.costOfPuttingForSale(), "wei")
    })
    await artMarketplace.connect(addr2).buyItem(DEFAULT_TOKEN_ID, {
      value: ethers.utils.formatUnits(DEFAULT_TOKEN_PRICE, "wei")
    })
    await artCollectibleContractInstance.connect(addr2).approve(artMarketplace.address, DEFAULT_TOKEN_ID);
    await artMarketplace.connect(addr2).putItemForSale(DEFAULT_TOKEN_ID, DEFAULT_TOKEN_PRICE, {
      value: ethers.utils.formatUnits(await artMarketplace.costOfPuttingForSale(), "wei")
    })
    await artMarketplace.connect(addr1).buyItem(DEFAULT_TOKEN_ID, {
      value: ethers.utils.formatUnits(DEFAULT_TOKEN_PRICE, "wei")
    })

    let marketHistory = await artMarketplace.fetchMarketHistory();

    const addr1Balance = await artCollectibleContractInstance.balanceOf(addr1.address)
    const addr2Balance = await artCollectibleContractInstance.balanceOf(addr2.address)
    const markerBalance = await artCollectibleContractInstance.balanceOf(artMarketplace.address)
    const ownerOfToken = await artCollectibleContractInstance.ownerOf(DEFAULT_TOKEN_ID)

    expect(marketHistory).to.be.an('array').that.is.not.empty
    expect(marketHistory).to.have.length(2)
    expect(markerBalance).to.equal(0)
    expect(addr1Balance).to.equal(1)
    expect(addr2Balance).to.equal(0)
    expect(ownerOfToken).to.equal(addr1.address)
  });

});
