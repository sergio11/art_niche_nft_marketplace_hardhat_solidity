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
    let isItemAddedForSale = await artMarketplace.isTokenAddedForSale(DEFAULT_TOKEN_ID)
    let isTokenMetadataCIDAddedForSale = await artMarketplace.isTokenMetadataCIDAddedForSale(DEFAULT_METADATA_CID)

    expect(addr1BalanceBeforePutForSale).to.be.equal(1)
    expect(addr1BalanceAfterPutForSale).to.be.equal(0)
    expect(markerBalance).to.be.equal(1)
    expect(isItemAddedForSale).to.be.true
    expect(isTokenMetadataCIDAddedForSale).to.be.true
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
    let isItemAddedForSale = await artMarketplace.isTokenAddedForSale(DEFAULT_TOKEN_ID)
    let isTokenMetadataCIDAddedForSale = await artMarketplace.isTokenMetadataCIDAddedForSale(DEFAULT_METADATA_CID)
    let countCanceledMarketItems = await artMarketplace.connect(addr1).countCanceledMarketItems();
    

    expect(markerBalance).to.equal(0)
    expect(addr1Balance).to.equal(1)
    expect(countCanceledMarketItems).to.equal(1)
    expect(events).to.be.an('array').that.is.not.empty
    expect(isItemAddedForSale).to.be.false
    expect(isTokenMetadataCIDAddedForSale).to.be.false
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

  it("put item for sale - VoidSigner cannot sign transactions", async function () {
    const { artMarketplace, artCollectibleContractInstance, addr1 } = await deployContractFixture()
  
    await artCollectibleContractInstance.connect(addr1).mintToken(DEFAULT_METADATA_CID, DEFAULT_TOKEN_ROYALTY)
    await artMarketplace.connect(addr1).putItemForSale(DEFAULT_TOKEN_ID, DEFAULT_TOKEN_PRICE, {
      value: ethers.utils.formatUnits(await artMarketplace.costOfPuttingForSale(), "wei")
    })
    var errorMessage: Error | null = null
    try {
      await artMarketplace.connect(artMarketplace.address).putItemForSale(DEFAULT_TOKEN_ID, DEFAULT_TOKEN_PRICE, {
        value: ethers.utils.formatUnits(await artMarketplace.costOfPuttingForSale(), "wei")
      })
    } catch(error) {
      if (error instanceof Error) {
        errorMessage = error
      }
    }

    expect(errorMessage).not.be.null
    expect(errorMessage!!.message).to.contain("VoidSigner cannot sign transactions")

  });


  it("put item for sale - Price must be equal to listing price", async function () {
    const { artMarketplace, artCollectibleContractInstance, addr1 } = await deployContractFixture()
  
    await artCollectibleContractInstance.connect(addr1).mintToken(DEFAULT_METADATA_CID, DEFAULT_TOKEN_ROYALTY)
    
    var errorMessage: Error | null = null
    try {
      await artMarketplace.connect(addr1).putItemForSale(DEFAULT_TOKEN_ID, DEFAULT_TOKEN_PRICE)
    } catch(error) {
      if (error instanceof Error) {
        errorMessage = error
      }
    } 

    expect(errorMessage).not.be.null
    expect(errorMessage!!.message).to.contain("Price must be equal to listing price")

  });

  it("put item for sale - Price must be at least 1 wei", async function () {
    const { artMarketplace, artCollectibleContractInstance, addr1 } = await deployContractFixture()
  
    await artCollectibleContractInstance.connect(addr1).mintToken(DEFAULT_METADATA_CID, DEFAULT_TOKEN_ROYALTY)
    
    var errorMessage: Error | null = null
    try {
      await artMarketplace.connect(addr1).putItemForSale(DEFAULT_TOKEN_ID, 0, {
        value: ethers.utils.formatUnits(await artMarketplace.costOfPuttingForSale(), "wei")
      })
    } catch(error) {
      if (error instanceof Error) {
        errorMessage = error
      }
    } 

    expect(errorMessage).not.be.null
    expect(errorMessage!!.message).to.contain("Price must be at least 1 wei")

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
    let countSoldMarketItems = await artMarketplace.connect(addr1).countSoldMarketItems();
    let token = await artCollectibleContractInstance.connect(addr1).getTokenById(DEFAULT_TOKEN_ID)

    expect(events).to.be.an('array').that.is.not.empty
    expect(events!![1]).to.equal("ArtCollectibleSold")
    expect(markerBalance).to.equal(0)
    expect(countSoldMarketItems).to.equal(1)
    expect(addr1Balance).to.equal(0)
    expect(addr2Balance).to.equal(1)
    expect(token["tokenId"]).to.equal(DEFAULT_TOKEN_ID)
    expect(token["creator"]).to.equal(addr1.address)
    expect(token["owner"]).to.equal(addr2.address)
    expect(token["royalty"]).to.equal(DEFAULT_TOKEN_ROYALTY)
    expect(token["metadataCID"]).to.equal(DEFAULT_METADATA_CID)
    expect(token["isExist"]).to.be.true
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

  it("buy item - not provide price", async function () { 
    const { artMarketplace, artCollectibleContractInstance, addr1, addr2 } = await deployContractFixture()

    await artCollectibleContractInstance.connect(addr1).mintToken(DEFAULT_METADATA_CID, DEFAULT_TOKEN_ROYALTY)
    await artMarketplace.connect(addr1).putItemForSale(DEFAULT_TOKEN_ID, DEFAULT_TOKEN_PRICE, {
      value: ethers.utils.formatUnits(await artMarketplace.costOfPuttingForSale(), "wei")
    })

    var errorMessage: Error | null = null
    try {
      await artMarketplace.connect(addr2).buyItem(DEFAULT_TOKEN_ID)
    } catch(error) {
      if (error instanceof Error) {
        errorMessage = error
      }
    }

    expect(errorMessage).not.be.null
    expect(errorMessage!!.message).to.contain("Price must be equal to item price")
  });


  it("buy item - Item hasn't beed added for sale", async function () { 
    const { artMarketplace, artCollectibleContractInstance, addr1, addr2 } = await deployContractFixture()

    await artCollectibleContractInstance.connect(addr1).mintToken(DEFAULT_METADATA_CID, DEFAULT_TOKEN_ROYALTY)
  
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
    expect(errorMessage!!.message).to.contain("Item hasn't beed added for sale")
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
    let countAvailableItems = await artMarketplace.connect(addr1).countAvailableMarketItems()
   
    expect(countAvailableItems).to.be.equal(1)
    expect(availableItemsForAddr1).to.be.an('array').that.is.not.empty
    expect(availableItemsForAddr1).to.have.length(1)
    expect(availableItemsForAddr2).to.be.an('array').that.is.not.empty
    expect(availableItemsForAddr2).to.have.length(1)
    expect(availableItemsForAddr1[0]["marketItemId"]).to.be.equal(1)
    expect(availableItemsForAddr1[0]["tokenId"]).to.be.equal(DEFAULT_TOKEN_ID)
    expect(availableItemsForAddr1[0]["metadataCID"]).to.be.equal(DEFAULT_METADATA_CID)
    expect(availableItemsForAddr1[0]["creator"]).to.be.equal(addr1.address)
    expect(availableItemsForAddr1[0]["seller"]).to.be.equal(addr1.address)
    expect(availableItemsForAddr1[0]["owner"]).to.be.equal(artMarketplace.address)
    expect(availableItemsForAddr1[0]["price"]).to.be.equal(DEFAULT_TOKEN_PRICE)
    expect(availableItemsForAddr1[0]["sold"]).to.be.false
    expect(availableItemsForAddr1[0]["canceled"]).to.be.false
  });

  it("fetch available market items", async function () {  
    const { artMarketplace, artCollectibleContractInstance, addr1, addr2 } = await deployContractFixture()

    await artCollectibleContractInstance.connect(addr1).mintToken(DEFAULT_METADATA_CID, DEFAULT_TOKEN_ROYALTY)
    await artMarketplace.connect(addr1).putItemForSale(DEFAULT_TOKEN_ID, DEFAULT_TOKEN_PRICE, {
      value: ethers.utils.formatUnits(await artMarketplace.costOfPuttingForSale(), "wei")
    })
    let marketStatistics = await artMarketplace.connect(addr1).fetchMarketStatistics()


    expect(marketStatistics["countAvailable"]).to.be.equal(1)
    expect(marketStatistics["countSold"]).to.be.equal(0)
    expect(marketStatistics["countCanceled"]).to.be.equal(0)
  })

  it("fetch available market items after withdraw market item", async function () { 
    const { artMarketplace, artCollectibleContractInstance, addr1, addr2 } = await deployContractFixture()

    await artCollectibleContractInstance.connect(addr1).mintToken(DEFAULT_METADATA_CID, DEFAULT_TOKEN_ROYALTY)
    await artMarketplace.connect(addr1).putItemForSale(DEFAULT_TOKEN_ID, DEFAULT_TOKEN_PRICE, {
      value: ethers.utils.formatUnits(await artMarketplace.costOfPuttingForSale(), "wei")
    })
    await artMarketplace.connect(addr1).withdrawFromSale(DEFAULT_TOKEN_ID)
    await artMarketplace.connect(addr1).putItemForSale(DEFAULT_TOKEN_ID, DEFAULT_TOKEN_PRICE, {
      value: ethers.utils.formatUnits(await artMarketplace.costOfPuttingForSale(), "wei")
    })
    let availableItemsForAddr1 = await artMarketplace.connect(addr1).fetchAvailableMarketItems()
    let availableItemsForAddr2 = await artMarketplace.connect(addr2).fetchAvailableMarketItems()
    let countAvailableItems = await artMarketplace.connect(addr1).countAvailableMarketItems()
   
    expect(countAvailableItems).to.be.equal(1)
    expect(availableItemsForAddr1).to.be.an('array').that.is.not.empty
    expect(availableItemsForAddr1).to.have.length(1)
    expect(availableItemsForAddr2).to.be.an('array').that.is.not.empty
    expect(availableItemsForAddr2).to.have.length(1)
    expect(availableItemsForAddr1[0]["marketItemId"]).to.be.equal(2)
    expect(availableItemsForAddr1[0]["tokenId"]).to.be.equal(DEFAULT_TOKEN_ID)
    expect(availableItemsForAddr1[0]["metadataCID"]).to.be.equal(DEFAULT_METADATA_CID)
    expect(availableItemsForAddr1[0]["creator"]).to.be.equal(addr1.address)
    expect(availableItemsForAddr1[0]["seller"]).to.be.equal(addr1.address)
    expect(availableItemsForAddr1[0]["owner"]).to.be.equal(artMarketplace.address)
    expect(availableItemsForAddr1[0]["price"]).to.be.equal(DEFAULT_TOKEN_PRICE)
    expect(availableItemsForAddr1[0]["sold"]).to.be.false
    expect(availableItemsForAddr1[0]["canceled"]).to.be.false
  });

  it("fetch item for sale detail", async function () { 
    const { artMarketplace, artCollectibleContractInstance, addr1, addr2 } = await deployContractFixture()

    await artCollectibleContractInstance.connect(addr1).mintToken(DEFAULT_METADATA_CID, DEFAULT_TOKEN_ROYALTY)
    await artMarketplace.connect(addr1).putItemForSale(DEFAULT_TOKEN_ID, DEFAULT_TOKEN_PRICE, {
      value: ethers.utils.formatUnits(await artMarketplace.costOfPuttingForSale(), "wei")
    })
    let itemForSaleDetail = await artMarketplace.connect(addr1).fetchItemForSale(DEFAULT_TOKEN_ID)

    expect(itemForSaleDetail["marketItemId"]).to.be.equal(1)
    expect(itemForSaleDetail["tokenId"]).to.be.equal(DEFAULT_TOKEN_ID)
    expect(itemForSaleDetail["metadataCID"]).to.be.equal(DEFAULT_METADATA_CID)
    expect(itemForSaleDetail["creator"]).to.be.equal(addr1.address)
    expect(itemForSaleDetail["seller"]).to.be.equal(addr1.address)
    expect(itemForSaleDetail["owner"]).to.be.equal(artMarketplace.address)
    expect(itemForSaleDetail["price"]).to.be.equal(DEFAULT_TOKEN_PRICE)
    expect(itemForSaleDetail["sold"]).to.be.false
    expect(itemForSaleDetail["canceled"]).to.be.false
  });

  it("fetch item for sale detail by metadata CID", async function () { 
    const { artMarketplace, artCollectibleContractInstance, addr1, addr2 } = await deployContractFixture()

    await artCollectibleContractInstance.connect(addr1).mintToken(DEFAULT_METADATA_CID, DEFAULT_TOKEN_ROYALTY)
    await artMarketplace.connect(addr1).putItemForSale(DEFAULT_TOKEN_ID, DEFAULT_TOKEN_PRICE, {
      value: ethers.utils.formatUnits(await artMarketplace.costOfPuttingForSale(), "wei")
    })
    let itemForSaleDetail = await artMarketplace.connect(addr1).fetchItemForSaleByMetadataCID(DEFAULT_METADATA_CID)

    expect(itemForSaleDetail["marketItemId"]).to.be.equal(1)
    expect(itemForSaleDetail["tokenId"]).to.be.equal(DEFAULT_TOKEN_ID)
    expect(itemForSaleDetail["metadataCID"]).to.be.equal(DEFAULT_METADATA_CID)
    expect(itemForSaleDetail["creator"]).to.be.equal(addr1.address)
    expect(itemForSaleDetail["seller"]).to.be.equal(addr1.address)
    expect(itemForSaleDetail["owner"]).to.be.equal(artMarketplace.address)
    expect(itemForSaleDetail["price"]).to.be.equal(DEFAULT_TOKEN_PRICE)
    expect(itemForSaleDetail["sold"]).to.be.false
    expect(itemForSaleDetail["canceled"]).to.be.false
  });

  it("fetch item for sale detail after withdraw market item", async function () { 
    const { artMarketplace, artCollectibleContractInstance, addr1, addr2 } = await deployContractFixture()

    await artCollectibleContractInstance.connect(addr1).mintToken(DEFAULT_METADATA_CID, DEFAULT_TOKEN_ROYALTY)
    await artMarketplace.connect(addr1).putItemForSale(DEFAULT_TOKEN_ID, DEFAULT_TOKEN_PRICE, {
      value: ethers.utils.formatUnits(await artMarketplace.costOfPuttingForSale(), "wei")
    })
    await artMarketplace.connect(addr1).withdrawFromSale(DEFAULT_TOKEN_ID)
    await artMarketplace.connect(addr1).putItemForSale(DEFAULT_TOKEN_ID, DEFAULT_TOKEN_PRICE, {
      value: ethers.utils.formatUnits(await artMarketplace.costOfPuttingForSale(), "wei")
    })
    let itemForSaleDetail = await artMarketplace.connect(addr1).fetchItemForSale(DEFAULT_TOKEN_ID)

    expect(itemForSaleDetail["marketItemId"]).to.be.equal(2)
    expect(itemForSaleDetail["tokenId"]).to.be.equal(DEFAULT_TOKEN_ID)
    expect(itemForSaleDetail["metadataCID"]).to.be.equal(DEFAULT_METADATA_CID)
    expect(itemForSaleDetail["creator"]).to.be.equal(addr1.address)
    expect(itemForSaleDetail["seller"]).to.be.equal(addr1.address)
    expect(itemForSaleDetail["owner"]).to.be.equal(artMarketplace.address)
    expect(itemForSaleDetail["price"]).to.be.equal(DEFAULT_TOKEN_PRICE)
    expect(itemForSaleDetail["sold"]).to.be.false
    expect(itemForSaleDetail["canceled"]).to.be.false
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
    expect(sellingItemsForAddr1[0]["marketItemId"]).to.be.equal(1)
    expect(sellingItemsForAddr1[0]["tokenId"]).to.be.equal(DEFAULT_TOKEN_ID)
    expect(sellingItemsForAddr1[0]["metadataCID"]).to.be.equal(DEFAULT_METADATA_CID)
    expect(sellingItemsForAddr1[0]["creator"]).to.be.equal(addr1.address)
    expect(sellingItemsForAddr1[0]["seller"]).to.be.equal(addr1.address)
    expect(sellingItemsForAddr1[0]["owner"]).to.be.equal(artMarketplace.address)
    expect(sellingItemsForAddr1[0]["price"]).to.be.equal(DEFAULT_TOKEN_PRICE)
    expect(sellingItemsForAddr1[0]["sold"]).to.be.false
    expect(sellingItemsForAddr1[0]["canceled"]).to.be.false
  });

  it("fetch selling market items after withdraw market item", async function () {  
    const { artMarketplace, artCollectibleContractInstance, addr1, addr2 } = await deployContractFixture()
    
    await artCollectibleContractInstance.connect(addr1).mintToken(DEFAULT_METADATA_CID, DEFAULT_TOKEN_ROYALTY)
    await artMarketplace.connect(addr1).putItemForSale(DEFAULT_TOKEN_ID, DEFAULT_TOKEN_PRICE, {
      value: ethers.utils.formatUnits(await artMarketplace.costOfPuttingForSale(), "wei")
    })
    await artMarketplace.connect(addr1).withdrawFromSale(DEFAULT_TOKEN_ID)
    await artMarketplace.connect(addr1).putItemForSale(DEFAULT_TOKEN_ID, DEFAULT_TOKEN_PRICE, {
      value: ethers.utils.formatUnits(await artMarketplace.costOfPuttingForSale(), "wei")
    })
    let sellingItemsForAddr1 = await artMarketplace.connect(addr1).fetchSellingMarketItems()
    let sellingItemsForAddr2 = await artMarketplace.connect(addr2).fetchSellingMarketItems()

    expect(sellingItemsForAddr1).to.be.an('array').that.is.not.empty
    expect(sellingItemsForAddr1).to.have.length(1)
    expect(sellingItemsForAddr2).to.be.an('array').that.is.empty
    expect(sellingItemsForAddr1[0]["marketItemId"]).to.be.equal(2)
    expect(sellingItemsForAddr1[0]["tokenId"]).to.be.equal(DEFAULT_TOKEN_ID)
    expect(sellingItemsForAddr1[0]["metadataCID"]).to.be.equal(DEFAULT_METADATA_CID)
    expect(sellingItemsForAddr1[0]["creator"]).to.be.equal(addr1.address)
    expect(sellingItemsForAddr1[0]["seller"]).to.be.equal(addr1.address)
    expect(sellingItemsForAddr1[0]["owner"]).to.be.equal(artMarketplace.address)
    expect(sellingItemsForAddr1[0]["price"]).to.be.equal(DEFAULT_TOKEN_PRICE)
    expect(sellingItemsForAddr1[0]["sold"]).to.be.false
    expect(sellingItemsForAddr1[0]["canceled"]).to.be.false
  });

  it("fetch selling market items after putting several items for sale", async function () {  
    const { artMarketplace, artCollectibleContractInstance, addr1, addr2 } = await deployContractFixture()
    let newMetadataCid = "32143234324"

    await artCollectibleContractInstance.connect(addr1).mintToken(DEFAULT_METADATA_CID, DEFAULT_TOKEN_ROYALTY)
    await artCollectibleContractInstance.connect(addr1).mintToken(newMetadataCid, DEFAULT_TOKEN_ROYALTY)
    await artMarketplace.connect(addr1).putItemForSale(DEFAULT_TOKEN_ID, DEFAULT_TOKEN_PRICE, {
      value: ethers.utils.formatUnits(await artMarketplace.costOfPuttingForSale(), "wei")
    })
    await artMarketplace.connect(addr1).putItemForSale(2, DEFAULT_TOKEN_PRICE, {
      value: ethers.utils.formatUnits(await artMarketplace.costOfPuttingForSale(), "wei")
    })
    let sellingItemsForAddr1 = await artMarketplace.connect(addr1).fetchSellingMarketItems()
    let sellingItemsForAddr2 = await artMarketplace.connect(addr2).fetchSellingMarketItems()

    expect(sellingItemsForAddr1).to.be.an('array').that.is.not.empty
    expect(sellingItemsForAddr1).to.have.length(2)
    expect(sellingItemsForAddr2).to.be.an('array').that.is.empty
    expect(sellingItemsForAddr1[0]["marketItemId"]).to.be.equal(1)
    expect(sellingItemsForAddr1[0]["tokenId"]).to.be.equal(DEFAULT_TOKEN_ID)
    expect(sellingItemsForAddr1[0]["metadataCID"]).to.be.equal(DEFAULT_METADATA_CID)
    expect(sellingItemsForAddr1[0]["creator"]).to.be.equal(addr1.address)
    expect(sellingItemsForAddr1[0]["seller"]).to.be.equal(addr1.address)
    expect(sellingItemsForAddr1[0]["owner"]).to.be.equal(artMarketplace.address)
    expect(sellingItemsForAddr1[0]["price"]).to.be.equal(DEFAULT_TOKEN_PRICE)
    expect(sellingItemsForAddr1[0]["sold"]).to.be.false
    expect(sellingItemsForAddr1[0]["canceled"]).to.be.false
    expect(sellingItemsForAddr1[1]["marketItemId"]).to.be.equal(2)
    expect(sellingItemsForAddr1[1]["metadataCID"]).to.be.equal(newMetadataCid)
    expect(sellingItemsForAddr1[1]["tokenId"]).to.be.equal(2)
    expect(sellingItemsForAddr1[1]["creator"]).to.be.equal(addr1.address)
    expect(sellingItemsForAddr1[1]["seller"]).to.be.equal(addr1.address)
    expect(sellingItemsForAddr1[1]["owner"]).to.be.equal(artMarketplace.address)
    expect(sellingItemsForAddr1[1]["price"]).to.be.equal(DEFAULT_TOKEN_PRICE)
    expect(sellingItemsForAddr1[1]["sold"]).to.be.false
    expect(sellingItemsForAddr1[1]["canceled"]).to.be.false
  });

  it("fetch owned market items", async function () {  
    const { artMarketplace, artCollectibleContractInstance, addr1, addr2 } = await deployContractFixture()
    
    await artCollectibleContractInstance.connect(addr1).mintToken(DEFAULT_METADATA_CID, DEFAULT_TOKEN_ROYALTY)
    await artMarketplace.connect(addr1).putItemForSale(DEFAULT_TOKEN_ID, DEFAULT_TOKEN_PRICE, {
      value: ethers.utils.formatUnits(await artMarketplace.costOfPuttingForSale(), "wei")
    })
    let ownedMarketItemsForAddr1 = await artMarketplace.connect(addr1).fetchOwnedMarketItems()
    let ownedMarketItemsForAddr2 = await artMarketplace.connect(addr2).fetchOwnedMarketItems()
    let ownedMarketItemsForMarketplaceAddr = await artMarketplace.connect(artMarketplace.address).fetchOwnedMarketItems()


    expect(ownedMarketItemsForAddr1).to.be.an('array').that.is.empty
    expect(ownedMarketItemsForAddr2).to.be.an('array').that.is.empty
    expect(ownedMarketItemsForMarketplaceAddr).to.be.an('array').that.is.not.empty
    expect(ownedMarketItemsForMarketplaceAddr).to.have.length(1)
    expect(ownedMarketItemsForMarketplaceAddr[0]["marketItemId"]).to.be.equal(1)
    expect(ownedMarketItemsForMarketplaceAddr[0]["tokenId"]).to.be.equal(DEFAULT_TOKEN_ID)
    expect(ownedMarketItemsForMarketplaceAddr[0]["metadataCID"]).to.be.equal(DEFAULT_METADATA_CID)
    expect(ownedMarketItemsForMarketplaceAddr[0]["creator"]).to.be.equal(addr1.address)
    expect(ownedMarketItemsForMarketplaceAddr[0]["seller"]).to.be.equal(addr1.address)
    expect(ownedMarketItemsForMarketplaceAddr[0]["owner"]).to.be.equal(artMarketplace.address)
    expect(ownedMarketItemsForMarketplaceAddr[0]["price"]).to.be.equal(DEFAULT_TOKEN_PRICE)
    expect(ownedMarketItemsForMarketplaceAddr[0]["sold"]).to.be.false
    expect(ownedMarketItemsForMarketplaceAddr[0]["canceled"]).to.be.false
  });

  it("fetch owned market items after withdraw market item", async function () {  
    const { artMarketplace, artCollectibleContractInstance, addr1, addr2 } = await deployContractFixture()
    
    await artCollectibleContractInstance.connect(addr1).mintToken(DEFAULT_METADATA_CID, DEFAULT_TOKEN_ROYALTY)
    await artMarketplace.connect(addr1).putItemForSale(DEFAULT_TOKEN_ID, DEFAULT_TOKEN_PRICE, {
      value: ethers.utils.formatUnits(await artMarketplace.costOfPuttingForSale(), "wei")
    })
    await artMarketplace.connect(addr1).withdrawFromSale(DEFAULT_TOKEN_ID)
    await artMarketplace.connect(addr1).putItemForSale(DEFAULT_TOKEN_ID, DEFAULT_TOKEN_PRICE, {
      value: ethers.utils.formatUnits(await artMarketplace.costOfPuttingForSale(), "wei")
    })
    let ownedMarketItemsForAddr1 = await artMarketplace.connect(addr1).fetchOwnedMarketItems()
    let ownedMarketItemsForAddr2 = await artMarketplace.connect(addr2).fetchOwnedMarketItems()
    let ownedMarketItemsForMarketplaceAddr = await artMarketplace.connect(artMarketplace.address).fetchOwnedMarketItems()


    expect(ownedMarketItemsForAddr1).to.be.an('array').that.is.empty
    expect(ownedMarketItemsForAddr2).to.be.an('array').that.is.empty
    expect(ownedMarketItemsForMarketplaceAddr).to.be.an('array').that.is.not.empty
    expect(ownedMarketItemsForMarketplaceAddr).to.have.length(1)
    expect(ownedMarketItemsForMarketplaceAddr[0]["marketItemId"]).to.be.equal(2)
    expect(ownedMarketItemsForMarketplaceAddr[0]["tokenId"]).to.be.equal(DEFAULT_TOKEN_ID)
    expect(ownedMarketItemsForMarketplaceAddr[0]["metadataCID"]).to.be.equal(DEFAULT_METADATA_CID)
    expect(ownedMarketItemsForMarketplaceAddr[0]["creator"]).to.be.equal(addr1.address)
    expect(ownedMarketItemsForMarketplaceAddr[0]["seller"]).to.be.equal(addr1.address)
    expect(ownedMarketItemsForMarketplaceAddr[0]["owner"]).to.be.equal(artMarketplace.address)
    expect(ownedMarketItemsForMarketplaceAddr[0]["price"]).to.be.equal(DEFAULT_TOKEN_PRICE)
    expect(ownedMarketItemsForMarketplaceAddr[0]["sold"]).to.be.false
    expect(ownedMarketItemsForMarketplaceAddr[0]["canceled"]).to.be.false
  });

  it("fetch created market items", async function () {  
    const { artMarketplace, artCollectibleContractInstance, addr1, addr2 } = await deployContractFixture()
    
    await artCollectibleContractInstance.connect(addr1).mintToken(DEFAULT_METADATA_CID, DEFAULT_TOKEN_ROYALTY)
    await artMarketplace.connect(addr1).putItemForSale(DEFAULT_TOKEN_ID, DEFAULT_TOKEN_PRICE, {
      value: ethers.utils.formatUnits(await artMarketplace.costOfPuttingForSale(), "wei")
    })
    let createdMarketItemsForAddr1 = await artMarketplace.connect(addr1).fetchCreatedMarketItems()
    let createdMarketItemsForAddr2 = await artMarketplace.connect(addr2).fetchCreatedMarketItems()

    expect(createdMarketItemsForAddr1).to.be.an('array').that.is.not.empty
    expect(createdMarketItemsForAddr1).to.have.length(1)
    expect(createdMarketItemsForAddr2).to.be.an('array').that.is.empty
    expect(createdMarketItemsForAddr1[0]["marketItemId"]).to.be.equal(1)
    expect(createdMarketItemsForAddr1[0]["tokenId"]).to.be.equal(DEFAULT_TOKEN_ID)
    expect(createdMarketItemsForAddr1[0]["metadataCID"]).to.be.equal(DEFAULT_METADATA_CID)
    expect(createdMarketItemsForAddr1[0]["creator"]).to.be.equal(addr1.address)
    expect(createdMarketItemsForAddr1[0]["seller"]).to.be.equal(addr1.address)
    expect(createdMarketItemsForAddr1[0]["owner"]).to.be.equal(artMarketplace.address)
    expect(createdMarketItemsForAddr1[0]["price"]).to.be.equal(DEFAULT_TOKEN_PRICE)
    expect(createdMarketItemsForAddr1[0]["sold"]).to.be.false
    expect(createdMarketItemsForAddr1[0]["canceled"]).to.be.false
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


  it("fetch market history of the token", async function () {  
    const { artMarketplace, artCollectibleContractInstance, addr1, addr2 } = await deployContractFixture()
  
    let token1MetadataCID = "123456a"
    let token1ID = 1
    let token2MetadataCID = "123456b"
    let token2ID = 2

    await artCollectibleContractInstance.connect(addr1).mintToken(token1MetadataCID, DEFAULT_TOKEN_ROYALTY)
    await artMarketplace.connect(addr1).putItemForSale(token1ID, DEFAULT_TOKEN_PRICE, {
      value: ethers.utils.formatUnits(await artMarketplace.costOfPuttingForSale(), "wei")
    })
    await artMarketplace.connect(addr2).buyItem(token1ID, {
      value: ethers.utils.formatUnits(DEFAULT_TOKEN_PRICE, "wei")
    })
    await artCollectibleContractInstance.connect(addr2).approve(artMarketplace.address, token1ID);
    await artMarketplace.connect(addr2).putItemForSale(token1ID, DEFAULT_TOKEN_PRICE, {
      value: ethers.utils.formatUnits(await artMarketplace.costOfPuttingForSale(), "wei")
    })
    await artMarketplace.connect(addr1).buyItem(token1ID, {
      value: ethers.utils.formatUnits(DEFAULT_TOKEN_PRICE, "wei")
    })

    await artCollectibleContractInstance.connect(addr1).mintToken(token2MetadataCID, DEFAULT_TOKEN_ROYALTY)
    await artMarketplace.connect(addr1).putItemForSale(token2ID, DEFAULT_TOKEN_PRICE, {
      value: ethers.utils.formatUnits(await artMarketplace.costOfPuttingForSale(), "wei")
    })
    await artMarketplace.connect(addr2).buyItem(token2ID, {
      value: ethers.utils.formatUnits(DEFAULT_TOKEN_PRICE, "wei")
    })
    await artCollectibleContractInstance.connect(addr2).approve(artMarketplace.address, token2ID);
    await artMarketplace.connect(addr2).putItemForSale(token2ID, DEFAULT_TOKEN_PRICE, {
      value: ethers.utils.formatUnits(await artMarketplace.costOfPuttingForSale(), "wei")
    })
    await artMarketplace.connect(addr1).buyItem(token2ID, {
      value: ethers.utils.formatUnits(DEFAULT_TOKEN_PRICE, "wei")
    })

    let token1MarketHistory = await artMarketplace.fetchTokenMarketHistory(token1ID)
    let token2MarketHistory = await artMarketplace.fetchTokenMarketHistory(token2ID)

    const addr1Balance = await artCollectibleContractInstance.balanceOf(addr1.address)
    const addr2Balance = await artCollectibleContractInstance.balanceOf(addr2.address)
    const markerBalance = await artCollectibleContractInstance.balanceOf(artMarketplace.address)
    const ownerOfToken1 = await artCollectibleContractInstance.ownerOf(token1ID)
    const ownerOfToken2 = await artCollectibleContractInstance.ownerOf(token2ID)

    expect(token1MarketHistory).to.be.an('array').that.is.not.empty
    expect(token1MarketHistory).to.have.length(2)
    expect(token2MarketHistory).to.be.an('array').that.is.not.empty
    expect(token2MarketHistory).to.have.length(2)
    expect(markerBalance).to.equal(0)
    expect(addr1Balance).to.equal(2)
    expect(addr2Balance).to.equal(0)
    expect(ownerOfToken1).to.equal(addr1.address)
    expect(ownerOfToken2).to.equal(addr1.address)
  });

  it("fetch paginated market history of the token", async function () {  
    const { artMarketplace, artCollectibleContractInstance, addr1, addr2 } = await deployContractFixture()
  
    let token1MetadataCID = "123456a"
    let token1ID = 1

    await artCollectibleContractInstance.connect(addr1).mintToken(token1MetadataCID, DEFAULT_TOKEN_ROYALTY)
    await artMarketplace.connect(addr1).putItemForSale(token1ID, DEFAULT_TOKEN_PRICE, {
      value: ethers.utils.formatUnits(await artMarketplace.costOfPuttingForSale(), "wei")
    })
    await artMarketplace.connect(addr2).buyItem(token1ID, {
      value: ethers.utils.formatUnits(DEFAULT_TOKEN_PRICE, "wei")
    })
    await artCollectibleContractInstance.connect(addr2).approve(artMarketplace.address, token1ID);
    await artMarketplace.connect(addr2).putItemForSale(token1ID, DEFAULT_TOKEN_PRICE, {
      value: ethers.utils.formatUnits(await artMarketplace.costOfPuttingForSale(), "wei")
    })
    await artMarketplace.connect(addr1).buyItem(token1ID, {
      value: ethers.utils.formatUnits(DEFAULT_TOKEN_PRICE, "wei")
    })

    await artMarketplace.connect(addr1).putItemForSale(token1ID, DEFAULT_TOKEN_PRICE, {
      value: ethers.utils.formatUnits(await artMarketplace.costOfPuttingForSale(), "wei")
    })
    await artMarketplace.connect(addr2).buyItem(token1ID, {
      value: ethers.utils.formatUnits(DEFAULT_TOKEN_PRICE, "wei")
    })
    await artCollectibleContractInstance.connect(addr2).approve(artMarketplace.address, token1ID);
    await artMarketplace.connect(addr2).putItemForSale(token1ID, DEFAULT_TOKEN_PRICE, {
      value: ethers.utils.formatUnits(await artMarketplace.costOfPuttingForSale(), "wei")
    })
    await artMarketplace.connect(addr1).buyItem(token1ID, {
      value: ethers.utils.formatUnits(DEFAULT_TOKEN_PRICE, "wei")
    })

    let token1MarketHistory = await artMarketplace.fetchPaginatedTokenMarketHistory(token1ID, 2)

    const addr1Balance = await artCollectibleContractInstance.balanceOf(addr1.address)
    const addr2Balance = await artCollectibleContractInstance.balanceOf(addr2.address)
    const markerBalance = await artCollectibleContractInstance.balanceOf(artMarketplace.address)
    const ownerOfToken1 = await artCollectibleContractInstance.ownerOf(token1ID)

    expect(token1MarketHistory).to.be.an('array').that.is.not.empty
    expect(token1MarketHistory).to.have.length(2)
    expect(markerBalance).to.equal(0)
    expect(addr1Balance).to.equal(1)
    expect(addr2Balance).to.equal(0)
    expect(ownerOfToken1).to.equal(addr1.address)
  });


  it("count token sold by address", async function () { 
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

    let countTokenSoldAddr1 = await artMarketplace.connect(addr1).countTokenSoldByAddress(addr1.address)
    let countTokenSoldAddr2 = await artMarketplace.connect(addr2).countTokenSoldByAddress(addr2.address)

    expect(countTokenSoldAddr1).to.equal(1)
    expect(countTokenSoldAddr2).to.equal(1)

  })

  it("count token bought by address", async function () { 
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

    let countTokenBoughtAddr1 = await artMarketplace.connect(addr1).countTokenBoughtByAddress(addr1.address)
    let countTokenBoughtAddr2 = await artMarketplace.connect(addr2).countTokenBoughtByAddress(addr2.address)

    expect(countTokenBoughtAddr1).to.equal(1)
    expect(countTokenBoughtAddr2).to.equal(1)

  })

  it("count token withdrawn by address", async function () { 
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
    await artMarketplace.connect(addr2).withdrawFromSale(DEFAULT_TOKEN_ID)

    let countTokenWithdrawnAddr1 = await artMarketplace.connect(addr1).countTokenWithdrawnByAddress(addr1.address)
    let countTokenWithdrawnAddr2 = await artMarketplace.connect(addr2).countTokenWithdrawnByAddress(addr2.address)

    expect(countTokenWithdrawnAddr1).to.equal(0)
    expect(countTokenWithdrawnAddr2).to.equal(1)
  })

  
  it("count token transactions", async function () { 
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
    await artMarketplace.connect(addr2).withdrawFromSale(DEFAULT_TOKEN_ID)

    let countTokenTransactions = await artMarketplace.connect(addr1).countTokenTransactions(DEFAULT_TOKEN_ID);

    expect(countTokenTransactions).to.equal(4)

  })


  it("fetch wallet statistics", async function () { 
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

    let wallet1Statistic = await artMarketplace.connect(addr1).fetchWalletStatistics(addr1.address)
    let wallet2Statistic = await artMarketplace.connect(addr2).fetchWalletStatistics(addr2.address)

    expect(wallet1Statistic.countTokenBought).to.equal(1)
    expect(wallet2Statistic.countTokenBought).to.equal(1)
    expect(wallet1Statistic.countTokenSold).to.equal(1)
    expect(wallet2Statistic.countTokenSold).to.equal(1)
    expect(wallet1Statistic.countTokenWithdrawn).to.equal(0)
    expect(wallet2Statistic.countTokenWithdrawn).to.equal(0)
  })


  it("fetch last market history items", async function () {  
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

    let lastMarketHistoryItems = await artMarketplace.fetchLastMarketHistoryItems(2)

    expect(lastMarketHistoryItems).to.be.an('array').that.is.not.empty
    expect(lastMarketHistoryItems).to.have.length(2)
    expect(lastMarketHistoryItems[0]["marketItemId"]).to.equal(2)
    expect(lastMarketHistoryItems[0]["tokenId"]).to.equal(1)
    expect(lastMarketHistoryItems[0]["metadataCID"]).to.be.equal(DEFAULT_METADATA_CID)
    expect(lastMarketHistoryItems[0]["creator"]).to.equal(addr1.address)
    expect(lastMarketHistoryItems[0]["seller"]).to.equal(addr2.address)
    expect(lastMarketHistoryItems[0]["owner"]).to.equal(addr1.address)
    expect(lastMarketHistoryItems[0]["price"]).to.equal(12)
    expect(lastMarketHistoryItems[0]["sold"]).to.be.true
    expect(lastMarketHistoryItems[0]["canceled"]).to.be.false
    expect(lastMarketHistoryItems[1]["marketItemId"]).to.equal(1)
    expect(lastMarketHistoryItems[1]["metadataCID"]).to.be.equal(DEFAULT_METADATA_CID)
    expect(lastMarketHistoryItems[1]["tokenId"]).to.equal(1)
    expect(lastMarketHistoryItems[1]["creator"]).to.equal(addr1.address)
    expect(lastMarketHistoryItems[1]["seller"]).to.equal(addr1.address)
    expect(lastMarketHistoryItems[1]["owner"]).to.equal(addr2.address)
    expect(lastMarketHistoryItems[1]["price"]).to.equal(12)
    expect(lastMarketHistoryItems[1]["sold"]).to.be.true
    expect(lastMarketHistoryItems[1]["canceled"]).to.be.false
  })

});
