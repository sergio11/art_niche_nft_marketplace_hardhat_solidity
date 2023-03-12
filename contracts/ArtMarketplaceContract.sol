// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./IArtMarketplaceContract.sol";
import "./IArtCollectibleContract.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./Utils.sol";

/// @custom:security-contact dreamsoftware92@gmail.com
contract ArtMarketplaceContract is
    ReentrancyGuard,
    Ownable,
    IArtMarketplaceContract
{
    using Counters for Counters.Counter;
    using SafeMath for uint256;
    using Utils for string;

    uint256 public constant DEFAULT_COST_OF_PUTTING_FOR_SALE = 0.010 ether;

    Counters.Counter private _marketItemIds;
    Counters.Counter private _tokensSold;
    Counters.Counter private _tokensCanceled;
    address private _artCollectibleAddress;
    uint256 public costOfPuttingForSale = DEFAULT_COST_OF_PUTTING_FOR_SALE;
    // Mapping to prevent the same item being listed twice
    mapping(uint256 => bool) private _hasBeenAddedForSale;
    mapping(string => bool) private _tokenMetadataCidHasBeenAddedForSale;
    mapping(uint256 => ArtCollectibleForSale) private _tokensForSale;
    ArtCollectibleForSale[] private _marketHistory;
    mapping(uint256 => uint256) private _tokenForSaleMarketItemId;
    mapping(string => uint256) private _tokenMetadataCidToMarketItemId;
    mapping(address => uint256) private _addressTokensSold;
    mapping(address => uint256) private _addressTokensBought;
    mapping(address => uint256) private _addressTokensWithdrawn;


    function getArtCollectibleAddress()
        public
        view
        onlyOwner
        returns (address)
    {
        return _artCollectibleAddress;
    }

    function setArtCollectibleAddress(address artCollectibleAddress)
        public
        payable
        onlyOwner
    {
        _artCollectibleAddress = artCollectibleAddress;
    }

    function setCostOfPuttingForSale(uint8 _costOfPuttingForSale)
        external
        onlyOwner
    {
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
    function putItemForSale(uint256 tokenId, uint256 price)
        external
        payable
        nonReentrant
        OnlyItemOwner(tokenId)
        ItemNotAlreadyAddedForSale(tokenId)
        PriceMustBeAtLeastOneWei(price)
        PriceMustBeEqualToListingPrice(msg.value)
        returns (uint256)
    {
        //send the token to the smart contract
        IArtCollectibleContract.ArtCollectible memory artCollectible = IArtCollectibleContract(_artCollectibleAddress).transferTo(msg.sender, address(this), tokenId);
        _marketItemIds.increment();
        uint256 marketItemId = _marketItemIds.current();
        _tokensForSale[marketItemId] = ArtCollectibleForSale(
            marketItemId,
            tokenId,
            artCollectible.metadataCID,
            payable(artCollectible.creator),
            payable(msg.sender),
            payable(address(this)),
            price,
            false,
            false
        );
        _tokenForSaleMarketItemId[tokenId] = marketItemId;
        _tokenMetadataCidToMarketItemId[artCollectible.metadataCID] = marketItemId;
        _hasBeenAddedForSale[tokenId] = true;
        _tokenMetadataCidHasBeenAddedForSale[artCollectible.metadataCID] = true;
        emit ArtCollectibleAddedForSale(marketItemId, tokenId, price);
        return marketItemId;
    }

    /**
    * @dev is token added for sale
    */
    function isTokenAddedForSale(uint256 tokenId) external view returns (bool) {
        return _hasBeenAddedForSale[tokenId];
    }

    /**
    * @dev is token metadata CID added for sale
    */
    function isTokenMetadataCIDAddedForSale(string memory metadataCID) external view returns (bool) {
        return _tokenMetadataCidHasBeenAddedForSale[metadataCID];
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
    function withdrawFromSale(uint256 tokenId)
        external
        ItemAlreadyAddedForSale(tokenId)
    {
        //send the token from the smart contract back to the one who listed it
        IArtCollectibleContract(_artCollectibleAddress).transferTo(address(this), msg.sender, tokenId);
        _tokensCanceled.increment();
        uint256 marketId = _tokenForSaleMarketItemId[tokenId];
        _tokensForSale[marketId].owner = payable(msg.sender);
        _tokensForSale[marketId].canceled = true;
        _marketHistory.push(_tokensForSale[marketId]);
        _addressTokensWithdrawn[msg.sender] += 1;
        string memory metadataCID = _tokensForSale[marketId].metadataCID;
        delete _tokenMetadataCidToMarketItemId[metadataCID];
        delete _hasBeenAddedForSale[tokenId];
        delete _tokenMetadataCidHasBeenAddedForSale[metadataCID];
        delete _tokensForSale[tokenId];
        delete _tokenForSaleMarketItemId[tokenId];
        emit ArtCollectibleWithdrawnFromSale(tokenId);
    }

    /**
     * @dev Fetch item for sale
     */
    function fetchItemForSale(uint256 tokenId) external ItemAlreadyAddedForSale(tokenId) view returns (ArtCollectibleForSale memory) {
        uint256 marketId = _tokenForSaleMarketItemId[tokenId];
        return _tokensForSale[marketId];
    }

    /**
     * @dev Fetch item for sale by metadata CID
     */
    function fetchItemForSaleByMetadataCID(string memory metadataCID) external view returns (ArtCollectibleForSale memory) {
        uint256 marketId = _tokenMetadataCidToMarketItemId[metadataCID];
        return _tokensForSale[marketId];
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
    function buyItem(uint256 tokenId)
        external
        payable
        NotItemOwner(tokenId)
        ItemAlreadyAddedForSale(tokenId)
        PriceMustBeEqualToItemPrice(tokenId, msg.value)
    {
        IArtCollectibleContract.ArtCollectible
            memory token = IArtCollectibleContract(_artCollectibleAddress)
                .getTokenById(tokenId);

        //split up the price between owner and creator
        uint256 royaltyForCreator = token.royalty.mul(msg.value).div(100);
        uint256 remainder = msg.value.sub(royaltyForCreator);
        //send to creator
        (bool isRoyaltySent, ) = _tokensForSale[tokenId].creator.call{value: royaltyForCreator}("");
        require(
            isRoyaltySent,
            "An error ocurred when sending royalty to token creator"
        );
        //send to owner
        (bool isRemainderSent, ) = _tokensForSale[tokenId].seller.call{value: remainder}("");
        require(
            isRemainderSent,
            "An error ocurred when sending remainder to token seller"
        );
        //transfer the token from the smart contract back to the buyer
        IArtCollectibleContract(_artCollectibleAddress).transferTo(address(this), msg.sender, tokenId);
        _tokensSold.increment();
        uint256 marketId = _tokenForSaleMarketItemId[tokenId];
        _tokensForSale[marketId].owner = payable(msg.sender);
        _tokensForSale[marketId].sold = true;
        _marketHistory.push(_tokensForSale[marketId]);
        _addressTokensSold[_tokensForSale[marketId].seller] += 1;
        _addressTokensBought[msg.sender] += 1;
        string memory metadataCID = _tokensForSale[marketId].metadataCID;
        delete _tokenMetadataCidToMarketItemId[metadataCID];
        delete _hasBeenAddedForSale[tokenId];
        delete _tokenMetadataCidHasBeenAddedForSale[metadataCID];
        delete _tokensForSale[tokenId];
        delete _tokenForSaleMarketItemId[tokenId];
        emit ArtCollectibleSold(tokenId, msg.sender, msg.value);
    }

    /**
     * @dev Fetch Market statistics
     */
    function fetchMarketStatistics() external view returns (MarketStatistics memory) {
        uint256 countAvailable = this.countAvailableMarketItems();
        uint256 countSold = this.countSoldMarketItems();
        uint256 countCanceled = this.countCanceledMarketItems();
        MarketStatistics memory marketStatistics = MarketStatistics(countAvailable, countSold, countCanceled);
        return marketStatistics;
    }

    /**
     * @dev Count non sold and non canceled market items
     */
    function countAvailableMarketItems() external view returns (uint256) {
        uint256 itemsCount = _marketItemIds.current();
        uint256 soldItemsCount = _tokensSold.current();
        uint256 canceledItemsCount = _tokensCanceled.current();
        uint256 availableItemsCount = itemsCount - soldItemsCount - canceledItemsCount;
        return availableItemsCount;
    }

    /**
     * @dev Count sold market items
     */
    function countSoldMarketItems() external view returns (uint256) {
        return _tokensSold.current();
    }

    /**
     * @dev Count canceled market items
     */
    function countCanceledMarketItems() external view returns (uint256) {
        return _tokensCanceled.current();
    }

    /**
     * @dev Count token sold by address
     */
    function countTokenSoldByAddress(address ownerAddress) external view returns (uint256) {
        return _addressTokensSold[ownerAddress];
    }

    /**
     * @dev Count token bought by address
     */
    function countTokenBoughtByAddress(address ownerAddress) external view returns (uint256) {
        return _addressTokensBought[ownerAddress];
    }

    /**
     * @dev Count token Withdrawn by address
     */
    function countTokenWithdrawnByAddress(address ownerAddress) external view returns (uint256) {
        return _addressTokensWithdrawn[ownerAddress];
    }

    /**
     * @dev Fetch Wallet statistics
     */
    function fetchWalletStatistics(address ownerAddress) external view returns (WalletStatistics memory) {
        uint256 countTokenSold = this.countTokenSoldByAddress(ownerAddress);
        uint256 countTokenBought = this.countTokenBoughtByAddress(ownerAddress);
        uint256 countTokenWithdrawn = this.countTokenWithdrawnByAddress(ownerAddress);
        return WalletStatistics(countTokenSold, countTokenBought, countTokenWithdrawn);
    }

    /**
     * @dev Fetch non sold and non canceled market items
     */
    function fetchAvailableMarketItems()
        external
        view
        returns (ArtCollectibleForSale[] memory)
    {
        uint256 itemsCount = _marketItemIds.current();
        uint256 soldItemsCount = _tokensSold.current();
        uint256 canceledItemsCount = _tokensCanceled.current();
        uint256 availableItemsCount = itemsCount -
            soldItemsCount -
            canceledItemsCount;
        ArtCollectibleForSale[]
            memory marketItems = new ArtCollectibleForSale[](
                availableItemsCount
            );
        uint256 currentIndex = 0;
        for (uint256 i = 0; i < itemsCount; i++) {
            uint256 tokenId = i + 1;
            if(_hasBeenAddedForSale[tokenId]) {
                uint256 marketId = _tokenForSaleMarketItemId[tokenId];
                ArtCollectibleForSale memory item = _tokensForSale[marketId];
                marketItems[currentIndex] = item;
                currentIndex += 1;
            }
            
        }
        return marketItems;
    }

    /**
     * @dev Fetch market items that are being listed by the msg.sender
     */
    function fetchSellingMarketItems()
        external
        view
        returns (ArtCollectibleForSale[] memory)
    {
        return _fetchMarketItemsByAddressProperty("seller");
    }

    /**
     * @dev Fetch market items that are owned by the msg.sender
     */
    function fetchOwnedMarketItems()
        public
        view
        returns (ArtCollectibleForSale[] memory)
    {
        return _fetchMarketItemsByAddressProperty("owner");
    }

    /**
     * @dev Fetch market items that are created by the msg.sender
     */
    function fetchCreatedMarketItems()
        external 
        view 
        returns (ArtCollectibleForSale[] memory) 
    {
        return _fetchMarketItemsByAddressProperty("creator");
    }

    /**
     * @dev Allow us to fetch market history
     */
    function fetchMarketHistory()
        public
        view
        returns (ArtCollectibleForSale[] memory)
    {
        return _marketHistory;
    }

    /**
     * @dev Allow us to fetch last market history items
     */
    function fetchLastMarketHistoryItems(uint256 count) external view returns (ArtCollectibleForSale[] memory) {
        ArtCollectibleForSale[] memory _lastMarketItems = new ArtCollectibleForSale[](count);
        uint256 currentIndex = 0;
        for (uint i = _marketHistory.length; i > 0 && currentIndex < count; i--) {
            _lastMarketItems[currentIndex] = _marketHistory[i-1];
            currentIndex += 1;
        }
        return _lastMarketItems;
    }


    /**
     * @dev Fetches market items according to the its requested address property that
     * can be "owner" or "seller".
     * See original: https://github.com/dabit3/polygon-ethereum-nextjs-marketplace/blob/main/contracts/Market.sol#L121
     */
    function _fetchMarketItemsByAddressProperty(string memory _addressProperty)
        private
        view
        returns (ArtCollectibleForSale[] memory)
    {
        require(
            _addressProperty.compareStrings("seller") ||
                _addressProperty.compareStrings("owner") || 
                _addressProperty.compareStrings("creator"),
            "Parameter must be 'seller', 'owner' or 'creator'"
        );
        uint256 totalItemsCount = _marketItemIds.current();
        uint256 itemCount = 0;
        uint256 currentIndex = 0;
        for (uint256 i = 0; i < totalItemsCount; i++) {
            address addressPropertyValue;
            if(_addressProperty.compareStrings("seller")) {
                addressPropertyValue = _tokensForSale[i + 1].seller;
            } else if(_addressProperty.compareStrings("owner")) {
                addressPropertyValue = _tokensForSale[i + 1].owner;
            } else {
                addressPropertyValue = _tokensForSale[i + 1].creator;
            }
            if (addressPropertyValue != msg.sender) continue;
            itemCount += 1;
        }
        ArtCollectibleForSale[] memory items = new ArtCollectibleForSale[](
            itemCount
        );
        for (uint256 i = 0; i < totalItemsCount; i++) {
            ArtCollectibleForSale storage item = _tokensForSale[i + 1];
            address addressPropertyValue;
            if(_addressProperty.compareStrings("seller")) {
                addressPropertyValue = item.seller;
            } else if(_addressProperty.compareStrings("owner")) {
                addressPropertyValue = item.owner;
            } else {
                addressPropertyValue = item.creator;
            }    
            if (addressPropertyValue != msg.sender) continue;
            items[currentIndex] = item;
            currentIndex += 1;
        }
        return items;
    }

    // Modifiers
    modifier OnlyItemOwner(uint256 tokenId) {
        require(
            ERC721(_artCollectibleAddress).ownerOf(tokenId) == msg.sender,
            "Sender does not own the item"
        );
        _;
    }

    modifier NotItemOwner(uint256 tokenId) {
        require(
            ERC721(_artCollectibleAddress).ownerOf(tokenId) != msg.sender,
            "Sender must not be the token owner"
        );
        _;
    }

    modifier ItemNotAlreadyAddedForSale(uint256 tokenId) {
        require(!_hasBeenAddedForSale[tokenId], "Item already added for sale");
        _;
    }

    modifier ItemAlreadyAddedForSale(uint256 tokenId) {
        require(
            _hasBeenAddedForSale[tokenId],
            "Item hasn't beed added for sale"
        );
        _;
    }

    modifier PriceMustBeEqualToListingPrice(uint256 value) {
        require(
            value == costOfPuttingForSale,
            "Price must be equal to listing price"
        );
        _;
    }

    modifier PriceMustBeEqualToItemPrice(uint256 tokenId, uint256 value) {
        require(
            _tokensForSale[_tokenForSaleMarketItemId[tokenId]].price == value,
            "Price must be equal to item price"
        );
        _;
    }

    modifier PriceMustBeAtLeastOneWei(uint256 price) {
        require(price > 0, "Price must be at least 1 wei");
        _;
    }

}