import { expect } from "chai";
import { ethers } from "hardhat";

describe("ArtMarketplaceContract", function () {

  async function deployContractFixture() {
    const [owner, addr1, addr2] = await ethers.getSigners()
    const utilsContractFactory = await ethers.getContractFactory("Utils")
    const utilsContractInstance = await utilsContractFactory.deploy()
    const artMarketplaceContractFactory = await ethers.getContractFactory("ArtMarketplaceContract", {
      libraries: {
        Utils: utilsContractInstance.address,
      },
    })
    const instance = await artMarketplaceContractFactory.deploy()
    await instance.deployed()
    return { instance, owner, addr1, addr2 }
  }


  it("Should set the right owner", async function () {
    const { instance, owner } = await deployContractFixture()
    expect(await instance.owner()).to.equal(owner.address)
  });

  it("default cost of putting for sale", async function () {
    const { instance } = await deployContractFixture()

    const costOfPuttingForSale = await instance.costOfPuttingForSale()
    const defaultCostOfPuttingForSale = await instance.DEFAULT_COST_OF_PUTTING_FOR_SALE()
 
    expect(costOfPuttingForSale).to.equal(defaultCostOfPuttingForSale)
  });

  it("set cost of putting for sale", async function () {
    const { instance } = await deployContractFixture()
    const newCostOfPuttingForSale = 5

    await instance.setCostOfPuttingForSale(newCostOfPuttingForSale)
    const costOfPuttingForSale = await instance.costOfPuttingForSale()

    expect(costOfPuttingForSale).to.equal(newCostOfPuttingForSale)
  });

});
