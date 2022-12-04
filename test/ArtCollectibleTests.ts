import { expect } from "chai";
import { ethers } from "hardhat";

describe("ArtCollectibleContract", function () {

  async function deployContractFixture() {
    // Get the ContractFactory and Signers here.
    const ContractFactory = await ethers.getContractFactory("ArtCollectibleContract")
    const [owner, addr1, addr2] = await ethers.getSigners()
    const instance = await ContractFactory.deploy()
    await instance.deployed()
    return { ContractFactory, instance, owner, addr1, addr2 }
  }

  const DEFAULT_METADATA_CID = "1321323"
  const DEFAULT_TOKEN_ROYALTY = 20

  it("Should set the right owner", async function () {
    const { instance, owner } = await deployContractFixture()
    expect(await instance.owner()).to.equal(owner.address)
  });


  it("mint art collectible token", async function () {
    const { instance, owner } = await deployContractFixture()

    const initialOwnerBalance = await instance.balanceOf(owner.address)
    let tx = await instance.connect(owner).mintToken(DEFAULT_METADATA_CID, DEFAULT_TOKEN_ROYALTY)
    let receipt = await tx.wait()
    let events = receipt.events?.map((x) => x.event)
    const newOwnerBalance = await instance.balanceOf(owner.address)

    expect(initialOwnerBalance).to.equal(0)
    expect(newOwnerBalance).to.equal(1)
    expect(events).not.be.null
    expect(events!![0]).to.equal("Transfer")
    expect(events!![1]).to.equal("ApprovalForAll")
    expect(events!![2]).to.equal("ArtCollectibleMinted")
  
  });


  it("Royalties must be between 0% and 40%.", async function () {
    const { instance, owner } = await deployContractFixture()

    const initialOwnerBalance = await instance.balanceOf(owner.address)
    var mintTokenErrorMessage: Error | null = null
    try {
      await instance.connect(owner).mintToken(DEFAULT_METADATA_CID, 45)
    } catch(error) {
      if (error instanceof Error) {
        mintTokenErrorMessage = error
      }
    }
    const newOwnerBalance = await instance.balanceOf(owner.address)


    expect(initialOwnerBalance).to.equal(0)
    expect(newOwnerBalance).to.equal(initialOwnerBalance)
    expect(mintTokenErrorMessage).not.be.null
    expect(mintTokenErrorMessage!!.message).to.contain("Royalties must be between 0% and 40%.")
    
  });

  it("metadata has already been used to mint an NFT.", async function () {
    const { instance, addr1, addr2 } = await deployContractFixture();

    const addr1InitialOwnerBalance = await instance.balanceOf(addr1.address)
    const addr2InitialOwnerBalance = await instance.balanceOf(addr2.address)
    var mintTokenErrorMessage: Error | null = null
    try {
      await instance.connect(addr1).mintToken(DEFAULT_METADATA_CID, DEFAULT_TOKEN_ROYALTY)
      await instance.connect(addr2).mintToken(DEFAULT_METADATA_CID, DEFAULT_TOKEN_ROYALTY)
    } catch(error) {
      if (error instanceof Error) {
        mintTokenErrorMessage = error
      }
    }
    const addr1NewOwnerBalance = await instance.balanceOf(addr1.address)
    const addr2NewOwnerBalance = await instance.balanceOf(addr2.address)

    expect(addr1InitialOwnerBalance).to.equal(0)
    expect(addr1NewOwnerBalance).to.equal(1)
    expect(addr2InitialOwnerBalance).to.equal(0)
    expect(addr2NewOwnerBalance).to.equal(addr2InitialOwnerBalance)
    expect(mintTokenErrorMessage).not.be.null
    expect(mintTokenErrorMessage!!.message).to.contain("This metadata has already been used to mint an NFT.")
    
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
    const { instance, addr1, addr2 } = await deployContractFixture()

    await instance.connect(addr1).mintToken(DEFAULT_METADATA_CID, DEFAULT_TOKEN_ROYALTY)
    let tokensAddr1 = await instance.connect(addr1).getTokensCreatedByMe()
    let tokensAddr2 = await instance.connect(addr2).getTokensCreatedByMe()

    expect(tokensAddr1).not.be.empty
    expect(tokensAddr2).to.be.empty
    expect(tokensAddr1[0][0]).to.equal(addr1.address)
    expect(tokensAddr1[0][1]).to.equal(addr1.address)
    expect(tokensAddr1[0][2]).to.equal(DEFAULT_TOKEN_ROYALTY)
  });

  it("get token by id", async function () {
    const { instance, addr1 } = await deployContractFixture()

    await instance.connect(addr1).mintToken(DEFAULT_METADATA_CID, DEFAULT_TOKEN_ROYALTY)
    let token = await instance.connect(addr1).getTokenById(1)

    expect(token).not.be.null
    expect(token.owner).to.equal(addr1.address)
    expect(token.royalty).to.equal(DEFAULT_TOKEN_ROYALTY)
    expect(token.creator).to.equal(addr1.address)
    expect(token.isExist).to.be.true
  });

  it("transfer token", async function () {
    const { instance, addr1, addr2 } = await deployContractFixture()

    await instance.connect(addr1).mintToken(DEFAULT_METADATA_CID, DEFAULT_TOKEN_ROYALTY)
    let tokenBeforeTrans = await instance.connect(addr1).getTokenById(1)
    await instance.connect(addr1).transferTokenTo(1, addr2.address);
    let tokenAfterTrans = await instance.connect(addr2).getTokenById(1)

    expect(tokenBeforeTrans).not.be.null
    expect(tokenBeforeTrans.owner).to.equal(addr1.address)
    expect(tokenBeforeTrans.royalty).to.equal(DEFAULT_TOKEN_ROYALTY)
    expect(tokenBeforeTrans.creator).to.equal(addr1.address)
    expect(tokenAfterTrans).not.be.null
    expect(tokenAfterTrans.owner).to.equal(addr2.address)
    expect(tokenAfterTrans.royalty).to.equal(DEFAULT_TOKEN_ROYALTY)
    expect(tokenAfterTrans.creator).to.equal(addr1.address)
  });
});
