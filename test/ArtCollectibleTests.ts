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
  const DEFAULT_TOKEN_ID = 1

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
    let tokenOwner = await instance.connect(addr1).ownerOf(DEFAULT_TOKEN_ID)

    expect(tokensAddr1).not.be.empty
    expect(tokensAddr2).to.be.empty
    expect(tokenOwner).to.equal(addr1.address)

    expect(tokensAddr1[0]["tokenId"]).to.equal(DEFAULT_TOKEN_ID)
    expect(tokensAddr1[0]["creator"]).to.equal(addr1.address)
    expect(tokensAddr1[0]["owner"]).to.equal(addr1.address)
    expect(tokensAddr1[0]["royalty"]).to.equal(DEFAULT_TOKEN_ROYALTY)
    expect(tokensAddr1[0]["metadataCID"]).to.equal(DEFAULT_METADATA_CID)
    expect(tokensAddr1[0]["isExist"]).to.be.true
  });

  it("get paginated tokens owned by me", async function () {
    const { instance, addr1, addr2 } = await deployContractFixture()
    let token1MetadataCID = "123456a"
    let token2MetadataCID = "123456b"
    let token3MetadataCID = "123456c"
    let token4MetadataCID = "123456d"
    let token5MetadataCID = "123456e"
    let token6MetadataCID = "123456f"
    let countTokens = 3

    await instance.connect(addr1).mintToken(token1MetadataCID, DEFAULT_TOKEN_ROYALTY)
    await instance.connect(addr1).mintToken(token2MetadataCID, DEFAULT_TOKEN_ROYALTY)
    await instance.connect(addr1).mintToken(token3MetadataCID, DEFAULT_TOKEN_ROYALTY)
    await instance.connect(addr1).mintToken(token4MetadataCID, DEFAULT_TOKEN_ROYALTY)
    await instance.connect(addr1).mintToken(token5MetadataCID, DEFAULT_TOKEN_ROYALTY)
    await instance.connect(addr1).mintToken(token6MetadataCID, DEFAULT_TOKEN_ROYALTY)

    let tokensAddr1 = await instance.connect(addr1).getPaginatedTokensOwnedByMe(countTokens)
    let tokensAddr2 = await instance.connect(addr2).getPaginatedTokensOwnedByMe(countTokens)

    expect(tokensAddr1).not.be.empty
    expect(tokensAddr1).to.be.length(countTokens)
    expect(tokensAddr2).to.be.empty
    expect(tokensAddr1[0]["tokenId"]).to.equal(1)
    expect(tokensAddr1[0]["creator"]).to.equal(addr1.address)
    expect(tokensAddr1[0]["owner"]).to.equal(addr1.address)
    expect(tokensAddr1[0]["royalty"]).to.equal(DEFAULT_TOKEN_ROYALTY)
    expect(tokensAddr1[0]["metadataCID"]).to.equal(token1MetadataCID)
    expect(tokensAddr1[1]["tokenId"]).to.equal(2)
    expect(tokensAddr1[1]["creator"]).to.equal(addr1.address)
    expect(tokensAddr1[1]["owner"]).to.equal(addr1.address)
    expect(tokensAddr1[1]["royalty"]).to.equal(DEFAULT_TOKEN_ROYALTY)
    expect(tokensAddr1[1]["metadataCID"]).to.equal(token2MetadataCID)
    expect(tokensAddr1[2]["tokenId"]).to.equal(3)
    expect(tokensAddr1[2]["creator"]).to.equal(addr1.address)
    expect(tokensAddr1[2]["owner"]).to.equal(addr1.address)
    expect(tokensAddr1[2]["royalty"]).to.equal(DEFAULT_TOKEN_ROYALTY)
    expect(tokensAddr1[2]["metadataCID"]).to.equal(token3MetadataCID)
  });

  it("get paginated tokens owned by any account", async function () {
    const { instance, addr1, addr2 } = await deployContractFixture()
    let token1MetadataCID = "123456a"
    let token2MetadataCID = "123456b"
    let token3MetadataCID = "123456c"
    let token4MetadataCID = "123456d"
    let token5MetadataCID = "123456e"
    let token6MetadataCID = "123456f"
    let countTokens = 3

    await instance.connect(addr1).mintToken(token1MetadataCID, DEFAULT_TOKEN_ROYALTY)
    await instance.connect(addr1).mintToken(token2MetadataCID, DEFAULT_TOKEN_ROYALTY)
    await instance.connect(addr1).mintToken(token3MetadataCID, DEFAULT_TOKEN_ROYALTY)
    await instance.connect(addr1).mintToken(token4MetadataCID, DEFAULT_TOKEN_ROYALTY)
    await instance.connect(addr1).mintToken(token5MetadataCID, DEFAULT_TOKEN_ROYALTY)
    await instance.connect(addr1).mintToken(token6MetadataCID, DEFAULT_TOKEN_ROYALTY)

    let tokensAddr1 = await instance.connect(addr2).getPaginatedTokensOwnedBy(addr1.address, countTokens)
    let tokensAddr2 = await instance.connect(addr1).getPaginatedTokensOwnedBy(addr2.address, countTokens)

    expect(tokensAddr1).not.be.empty
    expect(tokensAddr1).to.be.length(countTokens)
    expect(tokensAddr2).to.be.empty
    expect(tokensAddr1[0]["tokenId"]).to.equal(1)
    expect(tokensAddr1[0]["creator"]).to.equal(addr1.address)
    expect(tokensAddr1[0]["owner"]).to.equal(addr1.address)
    expect(tokensAddr1[0]["royalty"]).to.equal(DEFAULT_TOKEN_ROYALTY)
    expect(tokensAddr1[0]["metadataCID"]).to.equal(token1MetadataCID)
    expect(tokensAddr1[1]["tokenId"]).to.equal(2)
    expect(tokensAddr1[1]["creator"]).to.equal(addr1.address)
    expect(tokensAddr1[1]["owner"]).to.equal(addr1.address)
    expect(tokensAddr1[1]["royalty"]).to.equal(DEFAULT_TOKEN_ROYALTY)
    expect(tokensAddr1[1]["metadataCID"]).to.equal(token2MetadataCID)
    expect(tokensAddr1[2]["tokenId"]).to.equal(3)
    expect(tokensAddr1[2]["creator"]).to.equal(addr1.address)
    expect(tokensAddr1[2]["owner"]).to.equal(addr1.address)
    expect(tokensAddr1[2]["royalty"]).to.equal(DEFAULT_TOKEN_ROYALTY)
    expect(tokensAddr1[2]["metadataCID"]).to.equal(token3MetadataCID)
  });

  it("get tokens owned by any account", async function () {
    const { instance, addr1, addr2 } = await deployContractFixture()

    await instance.connect(addr1).mintToken(DEFAULT_METADATA_CID, DEFAULT_TOKEN_ROYALTY)
    let tokensAddr1 = await instance.connect(addr2).getTokensOwnedBy(addr1.address)
    let tokenOwner = await instance.connect(addr1).ownerOf(DEFAULT_TOKEN_ID)

    expect(tokensAddr1).not.be.empty
    expect(tokenOwner).to.equal(addr1.address)
    expect(tokensAddr1[0]["tokenId"]).to.equal(DEFAULT_TOKEN_ID)
    expect(tokensAddr1[0]["creator"]).to.equal(addr1.address)
    expect(tokensAddr1[0]["owner"]).to.equal(addr1.address)
    expect(tokensAddr1[0]["royalty"]).to.equal(DEFAULT_TOKEN_ROYALTY)
    expect(tokensAddr1[0]["metadataCID"]).to.equal(DEFAULT_METADATA_CID)
    expect(tokensAddr1[0]["isExist"]).to.be.true
  });

  it("get tokens created by me", async function () {
    const { instance, addr1, addr2 } = await deployContractFixture()

    await instance.connect(addr1).mintToken(DEFAULT_METADATA_CID, DEFAULT_TOKEN_ROYALTY)
    let tokensAddr1 = await instance.connect(addr1).getTokensCreatedByMe()
    let tokensAddr2 = await instance.connect(addr2).getTokensCreatedByMe()
    let tokenOwner = await instance.connect(addr1).ownerOf(DEFAULT_TOKEN_ID)

    expect(tokensAddr1).not.be.empty
    expect(tokensAddr2).to.be.empty
    expect(tokenOwner).to.equal(addr1.address)
    expect(tokensAddr1[0]["tokenId"]).to.equal(DEFAULT_TOKEN_ID)
    expect(tokensAddr1[0]["creator"]).to.equal(addr1.address)
    expect(tokensAddr1[0]["owner"]).to.equal(addr1.address)
    expect(tokensAddr1[0]["royalty"]).to.equal(DEFAULT_TOKEN_ROYALTY)
    expect(tokensAddr1[0]["metadataCID"]).to.equal(DEFAULT_METADATA_CID)
    expect(tokensAddr1[0]["isExist"]).to.be.true
  });

  it("get tokens created by any account", async function () {
    const { instance, addr1, addr2 } = await deployContractFixture()

    await instance.connect(addr1).mintToken(DEFAULT_METADATA_CID, DEFAULT_TOKEN_ROYALTY)
    let tokensAddr1 = await instance.connect(addr2).getTokensCreatedBy(addr1.address)
    let tokenOwner = await instance.connect(addr1).ownerOf(DEFAULT_TOKEN_ID)

    expect(tokensAddr1).not.be.empty
    expect(tokenOwner).to.equal(addr1.address)
    expect(tokensAddr1[0]["tokenId"]).to.equal(DEFAULT_TOKEN_ID)
    expect(tokensAddr1[0]["creator"]).to.equal(addr1.address)
    expect(tokensAddr1[0]["owner"]).to.equal(addr1.address)
    expect(tokensAddr1[0]["royalty"]).to.equal(DEFAULT_TOKEN_ROYALTY)
    expect(tokensAddr1[0]["metadataCID"]).to.equal(DEFAULT_METADATA_CID)
    expect(tokensAddr1[0]["isExist"]).to.be.true
  });

  it("get paginated tokens created by me", async function () {
    const { instance, addr1, addr2 } = await deployContractFixture()
    let token1MetadataCID = "123456a"
    let token2MetadataCID = "123456b"
    let token3MetadataCID = "123456c"
    let token4MetadataCID = "123456d"
    let token5MetadataCID = "123456e"
    let token6MetadataCID = "123456f"
    let countTokens = 3

    await instance.connect(addr1).mintToken(token1MetadataCID, DEFAULT_TOKEN_ROYALTY)
    await instance.connect(addr1).mintToken(token2MetadataCID, DEFAULT_TOKEN_ROYALTY)
    await instance.connect(addr1).mintToken(token3MetadataCID, DEFAULT_TOKEN_ROYALTY)
    await instance.connect(addr1).mintToken(token4MetadataCID, DEFAULT_TOKEN_ROYALTY)
    await instance.connect(addr1).mintToken(token5MetadataCID, DEFAULT_TOKEN_ROYALTY)
    await instance.connect(addr1).mintToken(token6MetadataCID, DEFAULT_TOKEN_ROYALTY)

    let tokensAddr1 = await instance.connect(addr1).getPaginatedTokensCreatedByMe(countTokens)
    let tokensAddr2 = await instance.connect(addr2).getPaginatedTokensCreatedByMe(countTokens)

    expect(tokensAddr1).not.be.empty
    expect(tokensAddr1).to.be.length(countTokens)
    expect(tokensAddr2).to.be.empty
    expect(tokensAddr1[0]["tokenId"]).to.equal(1)
    expect(tokensAddr1[0]["creator"]).to.equal(addr1.address)
    expect(tokensAddr1[0]["owner"]).to.equal(addr1.address)
    expect(tokensAddr1[0]["royalty"]).to.equal(DEFAULT_TOKEN_ROYALTY)
    expect(tokensAddr1[0]["metadataCID"]).to.equal(token1MetadataCID)
    expect(tokensAddr1[1]["tokenId"]).to.equal(2)
    expect(tokensAddr1[1]["creator"]).to.equal(addr1.address)
    expect(tokensAddr1[1]["owner"]).to.equal(addr1.address)
    expect(tokensAddr1[1]["royalty"]).to.equal(DEFAULT_TOKEN_ROYALTY)
    expect(tokensAddr1[1]["metadataCID"]).to.equal(token2MetadataCID)
    expect(tokensAddr1[2]["tokenId"]).to.equal(3)
    expect(tokensAddr1[2]["creator"]).to.equal(addr1.address)
    expect(tokensAddr1[2]["owner"]).to.equal(addr1.address)
    expect(tokensAddr1[2]["royalty"]).to.equal(DEFAULT_TOKEN_ROYALTY)
    expect(tokensAddr1[2]["metadataCID"]).to.equal(token3MetadataCID)
  });


  it("get paginated tokens created by any account", async function () {
    const { instance, addr1, addr2 } = await deployContractFixture()
    let token1MetadataCID = "123456a"
    let token2MetadataCID = "123456b"
    let token3MetadataCID = "123456c"
    let token4MetadataCID = "123456d"
    let token5MetadataCID = "123456e"
    let token6MetadataCID = "123456f"
    let countTokens = 3

    await instance.connect(addr1).mintToken(token1MetadataCID, DEFAULT_TOKEN_ROYALTY)
    await instance.connect(addr1).mintToken(token2MetadataCID, DEFAULT_TOKEN_ROYALTY)
    await instance.connect(addr1).mintToken(token3MetadataCID, DEFAULT_TOKEN_ROYALTY)
    await instance.connect(addr1).mintToken(token4MetadataCID, DEFAULT_TOKEN_ROYALTY)
    await instance.connect(addr1).mintToken(token5MetadataCID, DEFAULT_TOKEN_ROYALTY)
    await instance.connect(addr1).mintToken(token6MetadataCID, DEFAULT_TOKEN_ROYALTY)

    let tokensAddr1 = await instance.connect(addr2).getPaginatedTokensCreatedBy(addr1.address, countTokens)
    let tokensAddr2 = await instance.connect(addr1).getPaginatedTokensCreatedBy(addr2.address, countTokens)

    expect(tokensAddr1).not.be.empty
    expect(tokensAddr1).to.be.length(countTokens)
    expect(tokensAddr2).to.be.empty
    expect(tokensAddr1[0]["tokenId"]).to.equal(1)
    expect(tokensAddr1[0]["creator"]).to.equal(addr1.address)
    expect(tokensAddr1[0]["owner"]).to.equal(addr1.address)
    expect(tokensAddr1[0]["royalty"]).to.equal(DEFAULT_TOKEN_ROYALTY)
    expect(tokensAddr1[0]["metadataCID"]).to.equal(token1MetadataCID)
    expect(tokensAddr1[1]["tokenId"]).to.equal(2)
    expect(tokensAddr1[1]["creator"]).to.equal(addr1.address)
    expect(tokensAddr1[1]["owner"]).to.equal(addr1.address)
    expect(tokensAddr1[1]["royalty"]).to.equal(DEFAULT_TOKEN_ROYALTY)
    expect(tokensAddr1[1]["metadataCID"]).to.equal(token2MetadataCID)
    expect(tokensAddr1[2]["tokenId"]).to.equal(3)
    expect(tokensAddr1[2]["creator"]).to.equal(addr1.address)
    expect(tokensAddr1[2]["owner"]).to.equal(addr1.address)
    expect(tokensAddr1[2]["royalty"]).to.equal(DEFAULT_TOKEN_ROYALTY)
    expect(tokensAddr1[2]["metadataCID"]).to.equal(token3MetadataCID)
  });

  it("get token by id", async function () {
    const { instance, addr1 } = await deployContractFixture()

    await instance.connect(addr1).mintToken(DEFAULT_METADATA_CID, DEFAULT_TOKEN_ROYALTY)
    let token = await instance.connect(addr1).getTokenById(DEFAULT_TOKEN_ID)
    let tokenOwner = await instance.connect(addr1).ownerOf(DEFAULT_TOKEN_ID)

    expect(token).not.be.null
    expect(tokenOwner).to.equal(addr1.address)
    expect(token.royalty).to.equal(DEFAULT_TOKEN_ROYALTY)
    expect(token.creator).to.equal(addr1.address)
    expect(token.isExist).to.be.true
  });

  it("get token by metadata CID", async function () {
    const { instance, addr1 } = await deployContractFixture()

    await instance.connect(addr1).mintToken(DEFAULT_METADATA_CID, DEFAULT_TOKEN_ROYALTY)
    let token = await instance.connect(addr1).getTokenByMetadataCid(DEFAULT_METADATA_CID)
    let tokenOwner = await instance.connect(addr1).ownerOf(DEFAULT_TOKEN_ID)

    expect(token).not.be.null
    expect(tokenOwner).to.equal(addr1.address)
    expect(token.royalty).to.equal(DEFAULT_TOKEN_ROYALTY)
    expect(token.creator).to.equal(addr1.address)
    expect(token.isExist).to.be.true
  });

  it("get tokens", async function () {
    const { instance, addr1 } = await deployContractFixture()

    let firstTokenCid = DEFAULT_METADATA_CID
    let secondTokenCid = "4323423"
    let thirdTokenCid = "43145665"
    let firstTokenId = 1
    let secondTokenId = 2
    let thirdTokenId = 3

    await instance.connect(addr1).mintToken(firstTokenCid, DEFAULT_TOKEN_ROYALTY)
    await instance.connect(addr1).mintToken(secondTokenCid, DEFAULT_TOKEN_ROYALTY)
    await instance.connect(addr1).mintToken(thirdTokenCid, DEFAULT_TOKEN_ROYALTY)
    let tokens = await instance.connect(addr1).getTokens([firstTokenId, secondTokenId, thirdTokenId])

    expect(tokens).not.be.empty
    expect(tokens[0]["tokenId"]).to.equal(firstTokenId)
    expect(tokens[0]["creator"]).to.equal(addr1.address)
    expect(tokens[0]["owner"]).to.equal(addr1.address)
    expect(tokens[0]["royalty"]).to.equal(DEFAULT_TOKEN_ROYALTY)
    expect(tokens[0]["metadataCID"]).to.equal(firstTokenCid)
    expect(tokens[0]["isExist"]).to.be.true
    expect(tokens[1]["tokenId"]).to.equal(secondTokenId)
    expect(tokens[1]["creator"]).to.equal(addr1.address)
    expect(tokens[1]["owner"]).to.equal(addr1.address)
    expect(tokens[1]["royalty"]).to.equal(DEFAULT_TOKEN_ROYALTY)
    expect(tokens[1]["metadataCID"]).to.equal(secondTokenCid)
    expect(tokens[1]["isExist"]).to.be.true
    expect(tokens[2]["tokenId"]).to.equal(thirdTokenId)
    expect(tokens[2]["creator"]).to.equal(addr1.address)
    expect(tokens[2]["owner"]).to.equal(addr1.address)
    expect(tokens[2]["royalty"]).to.equal(DEFAULT_TOKEN_ROYALTY)
    expect(tokens[2]["metadataCID"]).to.equal(thirdTokenCid)
    expect(tokens[2]["isExist"]).to.be.true
  });

  it("transfer token", async function () {
    const { instance, addr1, addr2 } = await deployContractFixture()

    await instance.connect(addr1).mintToken(DEFAULT_METADATA_CID, DEFAULT_TOKEN_ROYALTY)
    let tokenBeforeTrans = await instance.connect(addr1).getTokenById(DEFAULT_TOKEN_ID)
    let tokenOwnerBeforeTrans = await instance.connect(addr1).ownerOf(DEFAULT_TOKEN_ID)
    await instance.connect(addr1).transferFrom(addr1.address, addr2.address, DEFAULT_TOKEN_ID);
    let tokenAfterTrans = await instance.connect(addr2).getTokenById(DEFAULT_TOKEN_ID)
    let tokenOwnerAfterTrans = await instance.connect(addr2).ownerOf(DEFAULT_TOKEN_ID)

    expect(tokenBeforeTrans).not.be.null
    expect(tokenOwnerBeforeTrans).to.equal(addr1.address)
    expect(tokenBeforeTrans.royalty).to.equal(DEFAULT_TOKEN_ROYALTY)
    expect(tokenBeforeTrans.creator).to.equal(addr1.address)
    expect(tokenAfterTrans).not.be.null
    expect(tokenOwnerAfterTrans).to.equal(addr2.address)
    expect(tokenAfterTrans.royalty).to.equal(DEFAULT_TOKEN_ROYALTY)
    expect(tokenAfterTrans.creator).to.equal(addr1.address)
  });

  it("burn token", async function () { 
    const { instance, addr1 } = await deployContractFixture()

    await instance.connect(addr1).mintToken(DEFAULT_METADATA_CID, DEFAULT_TOKEN_ROYALTY)
    let tokensOwnedByMeBeforeBurning = await instance.connect(addr1).getTokensOwnedByMe()
    await instance.connect(addr1).burn(DEFAULT_TOKEN_ID)
    let tokensOwnedByMeAfterBurning = await instance.connect(addr1).getTokensOwnedByMe()

    var getTokenByIdErrorMessage: Error | null = null
    try {
      await instance.connect(addr1).getTokenById(DEFAULT_TOKEN_ID)
    } catch(error) {
      if (error instanceof Error) {
        getTokenByIdErrorMessage = error
      }
    }

    var ownerOfErrorMessage: Error | null = null
    try {
      await instance.connect(addr1).ownerOf(DEFAULT_TOKEN_ID)
    } catch(error) {
      if (error instanceof Error) {
        ownerOfErrorMessage = error
      }
    }

    expect(tokensOwnedByMeBeforeBurning).not.to.be.empty
    expect(tokensOwnedByMeAfterBurning).to.be.empty
    expect(getTokenByIdErrorMessage).not.be.null
    expect(getTokenByIdErrorMessage!!.message).to.contain("There aren't any token with the token id specified")
    expect(ownerOfErrorMessage).not.be.null
    expect(ownerOfErrorMessage!!.message).to.contain("ERC721: invalid token ID")
  });

  it("pause contract", async function () { 
    const { instance, addr1 } = await deployContractFixture()

    await instance.pause()

    var errorMessage: Error | null = null
    try {
      await instance.connect(addr1).mintToken(DEFAULT_METADATA_CID, DEFAULT_TOKEN_ROYALTY)
    } catch(error) {
      if (error instanceof Error) {
        errorMessage = error
      }
    }

    let isPaused = await instance.paused()

    expect(isPaused).to.be.true
    expect(errorMessage).not.be.null
    expect(errorMessage!!.message).to.contain("Pausable: paused")
    
  });

  it("count tokens owned by address", async function () { 
    const { instance, addr1, addr2 } = await deployContractFixture()

    await instance.connect(addr1).mintToken(DEFAULT_METADATA_CID, DEFAULT_TOKEN_ROYALTY)
    let countTokensOwnedByAddr1 = await instance.connect(addr1).countTokensOwnedByAddress(addr1.address)
    let countTokensOwnedByAddr2 = await instance.connect(addr2).countTokensOwnedByAddress(addr2.address)

    expect(countTokensOwnedByAddr1).to.equal(1)
    expect(countTokensOwnedByAddr2).to.equal(0)
  })

  it("count tokens creator by address", async function () { 
    const { instance, addr1, addr2 } = await deployContractFixture()

    await instance.connect(addr1).mintToken(DEFAULT_METADATA_CID, DEFAULT_TOKEN_ROYALTY)
    let countTokensOwnedByAddr1 = await instance.connect(addr1).countTokensCreatorByAddress(addr1.address)
    let countTokensOwnedByAddr2 = await instance.connect(addr2).countTokensCreatorByAddress(addr2.address)

    expect(countTokensOwnedByAddr1).to.equal(1)
    expect(countTokensOwnedByAddr2).to.equal(0)
  })
  

  it("fetch tokens statistics by address", async function () { 
    const { instance, addr1, addr2 } = await deployContractFixture()

    await instance.connect(addr1).mintToken(DEFAULT_METADATA_CID, DEFAULT_TOKEN_ROYALTY)
    let tokensStatisticsByAddr1 = await instance.connect(addr1).fetchTokensStatisticsByAddress(addr1.address)
    let tokensStatisticsByAddr2 = await instance.connect(addr2).fetchTokensStatisticsByAddress(addr2.address)

    expect(tokensStatisticsByAddr1.countTokensCreator).to.equal(1)
    expect(tokensStatisticsByAddr1.countTokensOwned).to.equal(1)
    expect(tokensStatisticsByAddr2.countTokensCreator).to.equal(0)
    expect(tokensStatisticsByAddr2.countTokensOwned).to.equal(0)
  })
});
