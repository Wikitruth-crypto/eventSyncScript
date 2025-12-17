// SPDX-License-Identifier: GPL-2.0-or-later

/**
 *         ██╗    ██╗██╗██╗  ██╗██╗    ████████╗██████╗ ██╗   ██╗████████╗██╗  ██╗
 *         ██║    ██║██║██║ ██╔╝██║    ╚══██╔══╝██╔══██╗██║   ██║╚══██╔══╝██║  ██║
 *         ██║ █╗ ██║██║█████╔╝ ██║       ██║   ██████╔╝██║   ██║   ██║   ███████║
 *         ██║███╗██║██║██╔═██╗ ██║       ██║   ██╔══██╗██║   ██║   ██║   ██╔══██║
 *         ╚███╔███╔╝██║██║  ██╗██║       ██║   ██║  ██║╚██████╔╝   ██║   ██║  ██║
 *          ╚══╝╚══╝ ╚═╝╚═╝  ╚═╝╚═╝       ╚═╝   ╚═╝  ╚═╝ ╚═════╝    ╚═╝   ╚═╝  ╚═╝   
 *
 *  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
 *  ┃                        Website: https://wikitruth.eth.limo/                         ┃
 *  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
 */

pragma solidity ^0.8.24;

interface IWikiTruthEvents {
    
    // ========== Exchange ==========
    event BoxListed(uint256 indexed boxId, uint256 indexed userId, address acceptedToken); // only once
    event BoxPurchased(uint256 indexed boxId, uint256 indexed userId); // only once
    event BidPlaced(uint256 indexed boxId, uint256 indexed userId);
    event CompleterAssigned(uint256 indexed boxId, uint256 indexed userId); // only once
    event RequestDeadlineChanged(uint256 indexed boxId, uint256 deadline); 
    event ReviewDeadlineChanged(uint256 indexed boxId, uint256 deadline); // only once
    event RefundPermitChanged(uint256 indexed boxId, bool permission); // only once
    
    // ========== FundManager ==========
    event OrderAmountPaid(uint256 indexed boxId, uint256 indexed userId, address indexed token, uint256 amount);
    event OrderAmountWithdraw(uint256[] list, address indexed token, uint256 indexed userId, uint256 amount, uint8 fundsType);
    event RewardsAdded(uint256 indexed boxId, address indexed token, uint256 amount, uint8 rewardType);
    event HelperRewrdsWithdraw(uint256 indexed userId, address indexed token, uint256 amount);
    event MinterRewardsWithdraw(uint256 indexed userId, address indexed token, uint256 amount);
    
    // ========== TruthBox ==========
    event BoxCreated(uint256 indexed boxId, uint256 indexed userId, string boxInfoCID); // only once
    event BoxStatusChanged(uint256 indexed boxId, uint8 status);
    event PriceChanged(uint256 indexed boxId, uint256 price);
    event DeadlineChanged(uint256 indexed boxId, uint256 deadline);
    event PrivateKeyPublished(uint256 indexed boxId, bytes privateKey, uint256 indexed userId); // only once
    
    // ========== UserId ==========
    event Blacklist(address user, bool status); // only once
    
    // ========== TruthNFT ==========
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    // event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    // event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    
    // ====================
    enum Status {Storing, Selling, Auctioning, Paid, Refunding, InSecrecy, Published, Blacklisted}
    enum RewardType { Minter, Seller, Completer, Total }
    enum FundsType { Order, Refund }
    // enum TokenEnum { UnExsited, Active, Inactive }
}
