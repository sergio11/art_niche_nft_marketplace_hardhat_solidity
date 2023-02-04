// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

interface IArtMarketplaceContract { 


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
    function putItemForSale(uint256 tokenId, uint256 price) external payable returns (uint256);

    /**
    * @dev is token added for sale
    */
    function isTokenAddedForSale(uint256 tokenId) external view returns (bool);

    /**
     * @dev Cancel a listing of an item with a `tokenId`
     *
     * Requirements:
     * - Only the account that has listed the `tokenId` can delist it
     *
     * Emits a {Transfer} event - transfer the token from this smart contract to the owner.
     * Emits a {ArtCollectibleWithdrawnFromSale} event.
     */
    function withdrawFromSale(uint256 tokenId) external;

    /**
     * @dev Fetch item for sale
     */
    function fetchItemForSale(uint256 tokenId) external view returns (ArtCollectibleForSale memory);
    
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
    function buyItem(uint256 tokenId) external payable;

    /**
     * @dev Fetch non sold and non canceled market items
     */
    function fetchAvailableMarketItems() external view returns (ArtCollectibleForSale[] memory);

    /**
     * @dev Count non sold and non canceled market items
     */
    function countAvailableMarketItems() external view returns (uint256);

    /**
     * @dev Count sold market items
     */
    function countSoldMarketItems() external view returns (uint256);

    /**
     * @dev Count canceled market items
     */
    function countCanceledMarketItems() external view returns (uint256);

    /**
     * @dev Fetch market items that are being listed by the msg.sender
     */
    function fetchSellingMarketItems() external view returns (ArtCollectibleForSale[] memory);
    
    /**
     * @dev Fetch market items that are owned by the msg.sender
     */
    function fetchOwnedMarketItems() external view returns (ArtCollectibleForSale[] memory);

    /**
     * @dev Allow us to fetch market history
     */
    function fetchMarketHistory() external view returns (ArtCollectibleForSale[] memory);

    // Data Structure
    struct ArtCollectibleForSale {
        uint256 marketItemId;
        uint256 tokenId;
        address payable creator;
        address payable seller;
        address payable owner;
        uint256 price;
        bool sold;
        bool canceled;
    }

    // Events Definitions
    event ArtCollectibleAddedForSale(uint256 id, uint256 tokenId, uint256 price);
    event ArtCollectibleWithdrawnFromSale(uint256 tokenId);
    event ArtCollectibleSold(uint256 tokenId, address buyer, uint256 price);

}