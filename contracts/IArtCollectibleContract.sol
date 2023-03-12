// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

interface IArtCollectibleContract {


    /**
     * @dev allow us to mint a new token
     *
     */
    function mintToken(string memory metadataCid, uint256 royalty) external returns (uint256);

    /**
     * @dev Allows you to retrieve the list of tokens created by the `creatorAddress`
     *
     */
    function getTokensCreatedBy(address creatorAddress) external view returns (ArtCollectible[] memory);

    /**
     * @dev Allows you to retrieve the list of tokens created by the `msg.sender`
     *
     */
    function getTokensCreatedByMe() external view returns (ArtCollectible[] memory);

    /**
     * @dev Allows you to retrieve the list of tokens owned by the `ownedAddress`
     *
     */
    function getTokensOwnedBy(address ownedAddress) external view returns (ArtCollectible[] memory);

    /**
     * @dev Allows you to retrieve the list of tokens owned by the `msg.sender`
     *
     */
    function getTokensOwnedByMe() external view returns (ArtCollectible[] memory);

    /**
     * @dev Allows you to retrieve the address of the creator of the token specified as a `tokenId` parameter
     *
     */
    function getTokenCreatorById(uint256 tokenId) external view returns (address);

    /**
     * @dev Allows you to retrieve an `ArtCollective` list from the identifier array `tokenIds`
     *
     */
    function getTokens(uint256[] memory tokenIds) external view returns (ArtCollectible[] memory);

    /**
     * @dev Allows you to retrieve an `ArtCollective` from the metadata CID `metadataCid`
     *
     */
    function getTokenByMetadataCid(string memory metadataCid) external view returns (ArtCollectible memory);

     /**
     * @dev Allows you to retrieve an `ArtCollective` from the identifier `tokenId`
     *
     */
    function getTokenById(uint256 tokenId) external view returns (ArtCollectible memory);

    /**
     * @dev Allows you to transfer collectible
     */
    function transferTo(address from, address to, uint256 tokenId) external returns (ArtCollectible memory);

    /**
     * @dev Allows you to count tokens owned by address
     */
    function countTokensOwnedByAddress(address ownerAddress) external view returns (uint256);

    /**
     * @dev Allows you to count tokens creator by address
     */
    function countTokensCreatorByAddress(address creatorAddress) external view returns (uint256);

    /**
     * @dev Allows you to fetch tokens statistics by address
     */
    function fetchTokensStatisticsByAddress(address ownerAddress) external view returns (TokenStatistics memory);


    // Data Structure
    struct ArtCollectible {
        uint256 tokenId;
        address creator;
        address owner;
        uint256 royalty;
        string metadataCID;
        bool isExist;
    }

    struct TokenStatistics {
        uint256 countTokensCreator;
        uint256 countTokensOwned;
    }

    // Events Definitions

    /**
     * @dev Emitted when a `tokenId` has been bought for a `price` by a `buyer`
    */
    event ArtCollectibleMinted(uint256 tokenId, address creator, string metadata, uint256 royalty);
    
}