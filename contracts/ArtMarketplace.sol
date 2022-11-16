// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./IArtMarketplace.sol";
import "./IArtCollectibleContract.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/// @custom:security-contact dreamsoftware92@gmail.com
contract ArtMarketplace is ReentrancyGuard, Ownable, IArtMarketplace {
    using Counters for Counters.Counter;
    using SafeMath for uint256;

    uint256 public constant DEFAULT_COST_OF_PUTTING_FOR_SALE = 0.010 ether;

    Counters.Counter private _marketItemIds;
    Counters.Counter private _tokensSold;
    Counters.Counter private _tokensCanceled;
    address private _artCollectibleAddress;
    uint256 public costOfPuttingForSale = DEFAULT_COST_OF_PUTTING_FOR_SALE;
    // Mapping to prevent the same item being listed twice
    mapping (uint256 => bool) private _hasBeenAddedForSale;
    mapping (uint256 => ArtCollectibleForSale) private _tokensForSale;


    function setArtCollectibleAddress(address artCollectibleAddress) public payable onlyOwner() {
       _artCollectibleAddress = artCollectibleAddress;
    }

    function setCostOfPuttingForSale(uint8 _costOfPuttingForSale) external onlyOwner() {
        costOfPuttingForSale = _costOfPuttingForSale;
    }

    /**
     * @dev list an item with a `tokenId` for a `price`
     *
     * Requirements:
     * - Only the owner of the `tokenId` can list the item
     * - The `tokenId` can only be listed once
     *
     * Emits a {Transfer} event - transfer the token to this smart contract.
     * Emits a {ArtCollectibleAddedForSale} event
     */
    function putItemForSale(uint256 tokenId, uint256 price) external payable nonReentrant HasTransferApproval(tokenId) OnlyItemOwner(tokenId) ItemNotAlreadyAddedForSale(tokenId) returns (uint256) {
        require(price > 0, "Price must be at least 1 wei");
        require(msg.value == costOfPuttingForSale, "Price must be equal to listing price");
        _marketItemIds.increment();
        uint256 marketItemId = _marketItemIds.current();
        _tokensForSale[tokenId] = ArtCollectibleForSale(
            marketItemId, 
            tokenId, 
            payable(IArtCollectibleContract(_artCollectibleAddress).getTokenCreatorById(tokenId)), 
            payable(msg.sender), 
            payable(address(0)), 
            price, 
            false, 
            false 
        );
         //send the token to the smart contract
        ERC721(_artCollectibleAddress).safeTransferFrom(msg.sender, address(this), tokenId);
        _hasBeenAddedForSale[tokenId] = true;
        emit ArtCollectibleAddedForSale(marketItemId, tokenId, price);
        return marketItemId;
    }

    /**
     * @dev Cancel a listing of an item with a `tokenId`
     *
     * Requirements:
     * - Only the account that has listed the `tokenId` can delist it
     *
     * Emits a {Transfer} event - transfer the token from this smart contract to the owner.
     * Emits a {ArtCollectibleWithdrawnFromSale} event.
     */
    function withdrawFromSale(uint256 tokenId) external OnlyItemOwner(tokenId) ItemAlreadyAddedForSale(tokenId) {
        //send the token from the smart contract back to the one who listed it
        ERC721(_artCollectibleAddress).safeTransferFrom(address(this), msg.sender, tokenId);
        _tokensCanceled.increment();
        _tokensForSale[tokenId].owner = payable(msg.sender);
        _tokensForSale[tokenId].canceled = true;
        delete _hasBeenAddedForSale[tokenId];
        emit ArtCollectibleWithdrawnFromSale(tokenId);
    }

    /**
     * @dev Buy an item with a `tokenId` and pay the owner and the creator
     *
     * Requirements:
     * - `tokenId` has to be listed
     * - `price` needs to be the same as the value sent by the caller
     *
     * Emits a {Transfer} event - transfer the item from this smart contract to the buyer.
     * Emits an {ArtCollectibleSold} event.
     */
    function buyItem(uint256 tokenId) external payable NotItemOwner(tokenId) ItemAlreadyAddedForSale(tokenId) {
        IArtCollectibleContract.ArtCollectible memory item = IArtCollectibleContract(_artCollectibleAddress).getTokenById(tokenId);
        //split up the price between owner and creator
        uint256 royaltyForCreator = item.royalty.mul(msg.value).div(100);
        uint256 remainder = msg.value.sub(royaltyForCreator);
        //send to creator
        (bool isRoyaltySent, ) = item.creator.call{value: royaltyForCreator}("");
        require(isRoyaltySent, "An error ocurred when sending royalty to token creator");
        //send to owner
        (bool isRemainderSent, ) = item.owner.call{value: remainder}("");
        require(isRemainderSent, "An error ocurred when sending remainder to token owner");
        //transfer the token from the smart contract back to the buyer
        ERC721(_artCollectibleAddress).safeTransferFrom(address(this), msg.sender, tokenId);
        _tokensSold.increment();
        _tokensForSale[tokenId].owner = payable(msg.sender);
        _tokensForSale[tokenId].sold = true;
        delete _hasBeenAddedForSale[tokenId];
        emit ArtCollectibleSold(tokenId, msg.sender, msg.value);
    }

    /**
     * @dev Fetch non sold and non canceled market items
     */
    function fetchAvailableMarketItems() external view returns (ArtCollectibleForSale[] memory) {
        uint256 itemsCount = _marketItemIds.current();
        uint256 soldItemsCount = _tokensSold.current();
        uint256 canceledItemsCount = _tokensCanceled.current();
        uint256 availableItemsCount = itemsCount - soldItemsCount - canceledItemsCount;
        ArtCollectibleForSale[] memory marketItems = new ArtCollectibleForSale[](availableItemsCount);
        uint256 currentIndex = 0;
        for (uint256 i = 0; i < itemsCount; i++) {
            ArtCollectibleForSale memory item = _tokensForSale[i + 1];
            if (item.owner != address(0)) continue;
            marketItems[currentIndex] = item;
            currentIndex += 1;
        }
        return marketItems;
    }

    // Modifiers
    modifier OnlyItemOwner(uint256 tokenId){
        require(ERC721(_artCollectibleAddress).ownerOf(tokenId) == msg.sender, "Sender does not own the item");
        _;
    }

    modifier NotItemOwner(uint256 tokenId){
        require(ERC721(_artCollectibleAddress).ownerOf(tokenId) != msg.sender, "Sender must not be the token owner");
        _;
    }

    modifier ItemNotAlreadyAddedForSale(uint256 tokenId) {
        require(!_hasBeenAddedForSale[tokenId], "Item already added for sale");
        _;
    }

    modifier ItemAlreadyAddedForSale(uint256 tokenId) {
        require(_hasBeenAddedForSale[tokenId], "Item hasn't beed added for sale");
        _;
    }

    modifier HasTransferApproval(uint256 tokenId){
        require(ERC721(_artCollectibleAddress).getApproved(tokenId) == address(this), "Market is not approved");
        _;
    }

}