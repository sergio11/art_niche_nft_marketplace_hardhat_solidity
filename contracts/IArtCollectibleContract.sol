// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

interface IArtCollectibleContract {

    function mintToken(string memory metadataUri, uint256 royalty) external returns (uint256);
    function getTokensCreatedByMe() external view returns (uint256[] memory);
    function getTokensOwnedByMe() external view returns (uint256[] memory);
    function getTokenCreatorById(uint256 tokenId) external view returns (address);
    function getTokenById(uint256 tokenId) external view returns (ArtCollectible memory);
    function updateOwner(uint256 tokenId, address newOwner) external;

    // Data Structure
    struct ArtCollectible {
        address owner;
        address creator;
        uint256 royalty;
    }

    // Events Definitions

    /**
     * @dev Emitted when a `tokenId` has been bought for a `price` by a `buyer`
    */
    event ArtCollectibleMinted(uint256 tokenId, address creator, string metadata, uint256 royalty);
    
}