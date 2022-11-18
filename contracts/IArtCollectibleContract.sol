// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

interface IArtCollectibleContract {


    /**
     * @dev allow us to mint a new token
     *
     */
    function mintToken(string memory metadataCid, uint256 royalty) external returns (uint256);

    /**
     * @dev Allows you to retrieve the list of tokens created by the `msg.sender`
     *
     */
    function getTokensCreatedByMe() external view returns (ArtCollectible[] memory);

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
     * @dev Allows you to retrieve an `ArtCollective` from the identifier `tokenId`
     *
     */
    function getTokenById(uint256 tokenId) external view returns (ArtCollectible memory);


    function transferTokenTo(uint256 tokenId, address newOwner) external payable;

    // Data Structure
    struct ArtCollectible {
        address owner;
        address creator;
        uint256 royalty;
        bool isExist;
    }

    // Events Definitions

    /**
     * @dev Emitted when a `tokenId` has been bought for a `price` by a `buyer`
    */
    event ArtCollectibleMinted(uint256 tokenId, address creator, string metadata, uint256 royalty);
    
}