// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./IArtMarketplace.sol";
import "./IArtCollectibleContract.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/// @custom:security-contact dreamsoftware92@gmail.com
contract ArtMarketplace is ReentrancyGuard, Ownable, IArtMarketplace {
    using Counters for Counters.Counter;

    uint256 public constant DEFAULT_COST_OF_PUTTING_FOR_SALE = 0.010 ether;

    Counters.Counter private _marketItemIds;
    address private _artCollectibleAddress;
    uint256 public costOfPuttingForSale = DEFAULT_COST_OF_PUTTING_FOR_SALE;
    ArtCollectibleForSale[] private _itemsForSale;
    // Mapping to prevent the same item being listed twice
    mapping (uint256 => bool) private _hasBeenAddedForSale;


    function setCostOfPuttingForSale(uint8 _costOfPuttingForSale) external onlyOwner() {
        costOfPuttingForSale = _costOfPuttingForSale;
    }

    function setArtCollectibleAddress(address artCollectibleAddress) public payable onlyOwner() {
       _artCollectibleAddress = artCollectibleAddress;
    }

    function putItemForSale(uint256 tokenId, uint256 price) external payable nonReentrant OnlyItemOwner(tokenId) returns (uint256) {
        require(price > 0, "Price must be at least 1 wei");
        require(msg.value == costOfPuttingForSale, "Price must be equal to listing price");
        _marketItemIds.increment();
        uint256 marketItemId = _marketItemIds.current();
        //send the token to the smart contract
        ERC721(_artCollectibleAddress).safeTransferFrom(msg.sender, address(this), tokenId);
        _hasBeenAddedForSale[tokenId] = true;
        emit ArtCollectibleAddedForSale(marketItemId, tokenId, price);
        return marketItemId;
    }

    function buyItem(uint256 id) external payable {

    }

    // Modifiers
    modifier OnlyItemOwner(uint256 tokenId){
        require(IArtCollectibleContract(_artCollectibleAddress).getTokenCreatorById(tokenId) == msg.sender, "Sender does not own the item");
        _;
    }

}