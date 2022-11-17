import { expect } from "chai";
import { ethers } from "hardhat";

describe("ArtCollectible", function () {

  async function deployContractFixture() {
    // Get the ContractFactory and Signers here.
    const ContractFactory = await ethers.getContractFactory("ArtCollectible");
    const [owner, addr1, addr2] = await ethers.getSigners();
    const instance = await ContractFactory.deploy();
    await instance.deployed();
    return { ContractFactory, instance, owner, addr1, addr2 };
  }

  const DEFAULT_METADATA_CID = "1321323"
  const DEFAULT_TOKEN_ROYALTY = 20

  it("Should set the right owner", async function () {
    const { instance, owner } = await deployContractFixture();
    expect(await instance.owner()).to.equal(owner.address);
  });


  it("mint art collectible token", async function () {
    const { instance, owner } = await deployContractFixture();
    const tokenRoyalty = 20

    const initialOwnerBalance = await instance.balanceOf(owner.address);
    let tx = await instance.connect(owner).mintToken(DEFAULT_METADATA_CID, tokenRoyalty)
    let receipt = await tx.wait()
    let events = receipt.events?.map((x) => x.event)
    const newOwnerBalance = await instance.balanceOf(owner.address);

    expect(initialOwnerBalance).to.equal(0);
    expect(newOwnerBalance).to.equal(1);
    expect(events).not.be.null
    expect(events!![0]).to.equal("Transfer")
    expect(events!![1]).to.equal("ApprovalForAll")
    expect(events!![2]).to.equal("ArtCollectibleMinted")
  
  });


  it("get tokens owned by me", async function () {
    const { instance, addr1, addr2 } = await deployContractFixture()

    await instance.connect(addr1).mintToken(DEFAULT_METADATA_CID, DEFAULT_TOKEN_ROYALTY)
    let tokensAddr1 = await instance.connect(addr1).getTokensOwnedByMe()
    let tokensAddr2 = await instance.connect(addr2).getTokensOwnedByMe()


    expect(tokensAddr1).not.be.empty
    expect(tokensAddr2).to.be.empty
    expect(tokensAddr1[0][0]).to.equal(addr1.address)
    expect(tokensAddr1[0][1]).to.equal(addr1.address)
    expect(tokensAddr1[0][2]).to.equal(DEFAULT_TOKEN_ROYALTY)
  });

  it("get tokens created by me", async function () {
    const { instance, addr1, addr2 } = await deployContractFixture();

    await instance.connect(addr1).mintToken(DEFAULT_METADATA_CID, DEFAULT_TOKEN_ROYALTY)
    let tokensAddr1 = await instance.connect(addr1).getTokensCreatedByMe()
    let tokensAddr2 = await instance.connect(addr2).getTokensCreatedByMe()

    expect(tokensAddr1).not.be.empty
    expect(tokensAddr2).to.be.empty
    expect(tokensAddr1[0][0]).to.equal(addr1.address)
    expect(tokensAddr1[0][1]).to.equal(addr1.address)
    expect(tokensAddr1[0][2]).to.equal(DEFAULT_TOKEN_ROYALTY)
  });
});
