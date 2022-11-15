import { expect } from "chai";
import { ethers } from "hardhat";

describe("ArtCollectible", function () {
  it("Test contract", async function () {
    const ContractFactory = await ethers.getContractFactory("ArtCollectible");

    const instance = await ContractFactory.deploy();
    await instance.deployed();

    expect(await instance.name()).to.equal("ArtCollectible");
  });
});
