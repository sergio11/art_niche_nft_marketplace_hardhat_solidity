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
    * @dev is token metadata CID added for sale
    */
    function isTokenMetadataCIDAddedForSale(string memory metadataCID) external view returns (bool);

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
     * @dev Fetch Market history item
     */
    function fetchMarketHistoryItem(uint256 marketItemId) external view returns (ArtCollectibleForSale memory);

    /**
     * @dev Fetch item for sale by metadata CID
     */
    function fetchItemForSaleByMetadataCID(string memory metadataCID) external view returns (ArtCollectibleForSale memory);
    

    /**
     * @dev Fetch current item price
     */
    function fetchCurrentItemPrice(uint256 tokenId) external view returns (uint256);

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
     * @dev Fetch Market statistics
     */
    function fetchMarketStatistics() external view returns (MarketStatistics memory);

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
     * @dev Count token transactions
     */
    function countTokenTransactions(uint256 tokenId) external view returns (uint256);

    /**
     * @dev Fetch Wallet statistics
     */
    function fetchWalletStatistics(address ownerAddress) external view returns (WalletStatistics memory);

    /**
     * @dev Count token sold by address
     */
    function countTokenSoldByAddress(address ownerAddress) external view returns (uint256);

    /**
     * @dev Count token bought by address
     */
    function countTokenBoughtByAddress(address ownerAddress) external view returns (uint256);
    
    /**
     * @dev Count token Withdrawn by address
     */
    function countTokenWithdrawnByAddress(address ownerAddress) external view returns (uint256);

    /**
     * @dev Fetch market items that are being listed by the msg.sender
     */
    function fetchSellingMarketItems() external view returns (ArtCollectibleForSale[] memory);

    /**
     * @dev Fetch market items that are being listed by the msg.sender
     */
    function fetchPaginatedSellingMarketItems(uint256 count) external view returns (ArtCollectibleForSale[] memory);
    
    /**
     * @dev Fetch market items that are owned by the msg.sender
     */
    function fetchOwnedMarketItems() external view returns (ArtCollectibleForSale[] memory);

    /**
     * @dev Fetch market items that are owned by the msg.sender
     */
    function fetchPaginatedOwnedMarketItems(uint256 count) external view returns (ArtCollectibleForSale[] memory);

    /**
     * @dev Fetch market items that are created by the msg.sender
     */
    function fetchCreatedMarketItems() external view returns (ArtCollectibleForSale[] memory);

    /**
     * @dev Fetch market items that are created by the msg.sender
     */
    function fetchPaginatedCreatedMarketItems(uint256 count) external view returns (ArtCollectibleForSale[] memory);

    /**
     * @dev Allow us to fetch market history of the token
     */
    function fetchTokenMarketHistory(uint256 tokenId) external view returns (ArtCollectibleForSale[] memory);

    /**
     * @dev Allow us to fetch market history of the token
     */
    function fetchPaginatedTokenMarketHistory(uint256 tokenId, uint256 count) external view returns (ArtCollectibleForSale[] memory);

    /**
     * @dev Allow us to fetch market history
     */
    function fetchMarketHistory() external view returns (ArtCollectibleForSale[] memory);

    /**
     * @dev Allow us to fetch last market history items
     */
    function fetchLastMarketHistoryItems(uint256 count) external view returns (ArtCollectibleForSale[] memory);

    // Data Structure
    struct ArtCollectibleForSale {
        uint256 marketItemId;
        uint256 tokenId;
        string metadataCID;
        address payable creator;
        address payable seller;
        address payable owner;
        uint256 price;
        uint putForSaleAt;
        bool sold;
        uint soldAt;
        bool canceled;
        uint canceledAt;
    }

    struct MarketStatistics {
        uint256 countAvailable;
        uint256 countSold;
        uint256 countCanceled;
    }

    struct WalletStatistics {
        uint256 countTokenSold;
        uint256 countTokenBought;
        uint256 countTokenWithdrawn;
    }

    // Events Definitions
    event ArtCollectibleAddedForSale(uint256 id, uint256 tokenId, uint256 price);
    event ArtCollectibleWithdrawnFromSale(uint256 tokenId);
    event ArtCollectibleSold(uint256 tokenId, address buyer, uint256 price);

}