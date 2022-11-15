// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

interface IArtMarketplace { 

    function putItemForSale(uint256 tokenId, uint256 price) external payable returns (uint256);
    function buyItem(uint256 id) external payable;

    // Data Structure
    struct ArtCollectibleForSale {
        uint256 id;
        uint256 tokenId;
        address payable seller;
        uint256 price;
        bool isSold;
    }

    // Events Definitions
    event ArtCollectibleAddedForSale(uint256 id, uint256 tokenId, uint256 price);
    event ArtCollectibleSold(uint256 id, address buyer, uint256 price);

}