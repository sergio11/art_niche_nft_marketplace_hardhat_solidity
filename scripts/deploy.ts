import { ethers } from "hardhat";

async function main() {

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

  console.log(`ArtMarketplace contract deployed to ${artMarketplace.address}`);
  console.log(`ArtCollectible contract deployed to ${artCollectibleContractInstance.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
