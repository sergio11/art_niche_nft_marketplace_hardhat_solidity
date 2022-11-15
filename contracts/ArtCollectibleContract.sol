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
contract ArtCollectible is ERC721, ERC721Enumerable, ERC721URIStorage, Pausable, Ownable, ERC721Burnable, IArtCollectibleContract {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;
    ArtCollectible[] private _collectibles;

    // Mapping to check if the metadata has been minted
    mapping(string => bool) public hasBeenMinted;
    // Mapping to keep track of the Item
    mapping(uint256 => ArtCollectible) public tokenIdToItem;

    constructor() ERC721("ArtCollectible", "MTK") {}

    /**
     * @dev create an art collectible with a `metadata` for the msg.sender
     *
     * Requirements:
     * - `metadata` has not been minted before
     * - `royalty` must be between 0% and 40%
     *
     * Emits a {Transfer} event - comes from the ERC-721 smart contract.
     */
    function createArtCollectible(string memory metadataUri, uint256 royalty) external override returns (uint256) {
        require(!hasBeenMinted[metadataUri],"This metadata has already been used to mint an NFT.");
        require(royalty >= 0 && royalty <= 40, "Royalties must be between 0% and 40%.");
        ArtCollectible memory artCollectible = ArtCollectible(msg.sender, msg.sender, royalty);
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, metadataUri);
        _collectibles.push(artCollectible);
        tokenIdToItem[tokenId] = artCollectible;
        hasBeenMinted[metadataUri] = true;
        emit ArtCollectibleMinted(tokenId, msg.sender, metadataUri, royalty);
        return tokenId;
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
}
