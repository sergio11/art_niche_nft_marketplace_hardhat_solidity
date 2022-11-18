// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./IArtCollectibleContract.sol";

/// @custom:security-contact dreamsoftware92@gmail.com
contract ArtCollectibleContract is ERC721, ERC721Enumerable, ERC721URIStorage, Pausable, Ownable, ERC721Burnable, IArtCollectibleContract {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;
    address private _marketplaceAddress;
    // Mapping to check if the metadata has been minted
    mapping(string => bool) private _hasBeenMinted;
    // Mapping to keep track of the Item
    mapping(uint256 => ArtCollectible) private _tokenIdToItem;
    mapping(uint256 => address) private _tokenCreators;

    constructor() ERC721("ArtCollectibleContract", "ACT") {}


    /**
     * @dev Configure address for ArtMarketplace contract
     */
    function setMarketplaceAddress(address marketplaceAddress) public payable onlyOwner() {
       _marketplaceAddress = marketplaceAddress;
    }

    /**
     * @dev create an art collectible with a `metadata` for the msg.sender
     *
     * Requirements:
     * - `metadataCid` has not been minted before
     * - `royalty` must be between 0% and 40%
     *
     * Emits a {Transfer} event - comes from the ERC-721 smart contract.
     */
    function mintToken(string memory metadataCid, uint256 royalty) external override ItemNotMintedYet(metadataCid) ValidRoyaltyInterval(royalty) returns (uint256) {
        ArtCollectible memory artCollectible = ArtCollectible(msg.sender, msg.sender, royalty);
        _tokenIdCounter.increment();
        uint256 tokenId = _tokenIdCounter.current();
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, metadataCid);
        // Give the marketplace approval to transact NFTs between users
        setApprovalForAll(_marketplaceAddress, true);
        _tokenIdToItem[tokenId] = artCollectible;
        _hasBeenMinted[metadataCid] = true;
        _tokenCreators[tokenId] = msg.sender;
        emit ArtCollectibleMinted(tokenId, msg.sender, metadataCid, royalty);
        return tokenId;
    }

    function getTokensCreatedByMe() external view returns (ArtCollectible[] memory) {
        uint256 numberOfExistingTokens = _tokenIdCounter.current();
        uint256 numberOfTokensCreated = 0;

        for (uint256 i = 0; i < numberOfExistingTokens; i++) {
            uint256 tokenId = i + 1;
            if (_tokenCreators[tokenId] != msg.sender) continue;
            numberOfTokensCreated += 1;
        }

        ArtCollectible[] memory createdTokens = new ArtCollectible[](numberOfTokensCreated);
        uint256 currentIndex = 0;
        for (uint256 i = 0; i < numberOfExistingTokens; i++) {
            uint256 tokenId = i + 1;
            if (_tokenCreators[tokenId] != msg.sender) continue;
            createdTokens[currentIndex] = _tokenIdToItem[tokenId];
            currentIndex += 1;
        }

        return createdTokens;
    }

    function getTokensOwnedByMe() external view returns (ArtCollectible[] memory) { 
        uint256 numberOfExistingTokens = _tokenIdCounter.current();
        uint256 numberOfTokensOwned = balanceOf(msg.sender);
        ArtCollectible[] memory ownedTokens = new ArtCollectible[](numberOfTokensOwned);

        uint256 currentIndex = 0;
        for (uint256 i = 0; i < numberOfExistingTokens; i++) {
            uint256 tokenId = i + 1;
            if (ownerOf(tokenId) != msg.sender) continue;
            ownedTokens[currentIndex] = _tokenIdToItem[tokenId];
            currentIndex += 1;
        }

        return ownedTokens;
    }

    function getTokenCreatorById(uint256 tokenId) public view returns (address) {
        return _tokenCreators[tokenId];
    }

    function getTokenById(uint256 tokenId) external view returns (ArtCollectible memory) {
        return _tokenIdToItem[tokenId];
    }

    function transferTokenTo(uint256 tokenId, address newOwner) external payable {
        ArtCollectible storage token = _tokenIdToItem[tokenId];
        safeTransferFrom(token.owner, newOwner, tokenId);
        token.owner = newOwner;
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function _beforeTokenTransfer(address from, address to, uint256 tokenId, uint256 batchSize)
        internal
        whenNotPaused
        override(ERC721, ERC721Enumerable)
    {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    // The following functions are overrides required by Solidity.

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    // Modifiers

    modifier ItemNotMintedYet(string memory metadataCid) {
        require(!_hasBeenMinted[metadataCid],"This metadata has already been used to mint an NFT.");
        _;
    }

    modifier ValidRoyaltyInterval(uint256 royalty) {
        require(royalty >= 0 && royalty <= 40, "Royalties must be between 0% and 40%.");
        _;
    }
}
