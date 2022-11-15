import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyToken", function () {
  it("Test contract", async function () {
    const ContractFactory = await ethers.getContractFactory("MyToken");

    const instance = await ContractFactory.deploy();
    await instance.deployed();

    expect(await instance.name()).to.equal("MyToken");
  });
});
