import { useEffect, useMemo, useState } from "react";

// import thirdweb
import { useWeb3 } from "@3rdweb/hooks";
import { ThirdwebSDK } from "@3rdweb/sdk";

import { ethers } from "ethers";
import CreateProposal from "./CreateProposal";

// We instatiate the sdk on Rinkeby.
const sdk = new ThirdwebSDK("rinkeby");

// We can grab a reference to our ERC-1155 contract.
const bundleDropModule = sdk.getBundleDropModule(
  "0xe2fd2B91BE3A91f9DEAfdd7303DF14833E498025"
);
const tokenModule = sdk.getTokenModule(
  "0xa62Be9821304A427B636B33dD942BbDC04694381"
);

const voteModule = sdk.getVoteModule(
  "0x9556421EAD1E8E9809dc1D636958C63618f27b8E"
);
var voteArray = [];
var totalTokensHeld = 0;



const App = () => {

  const { connectWallet, address, error, provider } = useWeb3();
  console.log("👋 Address:", address);

  // The signer is required to sign transactions on the blockchain.
  // Without it we can only read data, not write.
  const signer = provider ? provider.getSigner() : undefined;

  const [hasClaimedNFT, setHasClaimedNFT] = useState(false);
  // isClaiming lets us easily keep a loading state while the NFT is minting.
  const [isClaiming, setIsClaiming] = useState(false);

  // Holds the amount of token each member has in state.
  const [memberTokenAmounts, setMemberTokenAmounts] = useState({});
  // The array holding all of our members addresses.
  const [memberAddresses, setMemberAddresses] = useState([]);

  const [proposals, setProposals] = useState([]);
  const [isVoting, setIsVoting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [hasVotedArray, setHasVotedArray] = useState([]);
  const [totalTokens, setTotalTokens] = useState(Number(0));

  // Retreive all our existing proposals from the contract.
  useEffect(() => {
    if (!hasClaimedNFT) {
      return;
    }
    // A simple call to voteModule.getAll() to grab the proposals.
    voteModule
      .getAll()
      .then((proposals) => {
        // Set state!
        setProposals(proposals);
        console.log("🌈 Proposals:", proposals);
      })
      .catch((err) => {
        console.error("failed to get proposals", err);
      });
  }, [hasClaimedNFT]);


  // We also need to check if the user already voted.
  useEffect(() => {
    if (!hasClaimedNFT) {
      return;
    }

    // If we haven't finished retreieving the proposals from the useEffect above
    // then we can't check if the user voted yet!
    if (!proposals.length) {
      return;
    }

    // Check if the user has already voted on the first proposal.

    for (let i = 0; i < proposals.length; i++) {
      voteModule
        .hasVoted(proposals[i].proposalId, address)
        .then((hasVoted) => {
          
          voteArray[i] = hasVoted;
          
          setHasVoted(hasVoted);
        })
        .catch((err) => {
          console.error("failed to check if wallet has voted", err);
        });
    }
  }, [hasClaimedNFT, proposals, address]);

  useEffect(() => {
    
    setHasVotedArray(voteArray);
  }, [ hasVoted, proposals]);

  // A fancy function to shorten someones wallet address, no need to show the whole thing.
  const shortenAddress = (str) => {
    return str.substring(0, 6) + "..." + str.substring(str.length - 4);
  };

  // This useEffect grabs all our the addresses of our members holding our NFT.
  useEffect(() => {
    if (!hasClaimedNFT) {
      return;
    }

    // Just like we did in the 7-airdrop-token.js file! Grab the users who hold our NFT
    // with tokenId 0.
    bundleDropModule
      .getAllClaimerAddresses("0")
      .then((addresess) => {
        console.log("🚀 Members addresses", addresess);
        setMemberAddresses(addresess);
      })
      .catch((err) => {
        console.error("failed to get member list", err);
      });
  }, [hasClaimedNFT]);

  // This useEffect grabs the # of token each member holds.
  useEffect(() => {
    if (!hasClaimedNFT) {
      return;
    }

    // Grab all the balances.
    tokenModule
      .getAllHolderBalances()
      .then((amounts) => {
        console.log("👜 Amounts", amounts);

        setMemberTokenAmounts(amounts);
      })
      .catch((err) => {
        console.error("failed to get token amounts", err);
      });
  }, [hasClaimedNFT]);
  // Now, we combine the memberAddresses and memberTokenAmounts into a single array
  const memberList = useMemo(() => {
    return memberAddresses.map((address) => {
      return {
        address,
        tokenAmount: ethers.utils.formatUnits(
          // If the address isn't in memberTokenAmounts, it means they don't
          // hold any of our token.
          memberTokenAmounts[address] || 0,
          18
        ),
      };
    });
  }, [memberAddresses, memberTokenAmounts]);

  useEffect(() => {
    memberList.map((member) => {
      totalTokensHeld = totalTokensHeld + Number(member.tokenAmount);
      console.log("total tokens held " + totalTokensHeld);
      return setTotalTokens(totalTokensHeld);
    });
  }, [memberList]);

  // Another useEffect!
  useEffect(() => {
    // We pass the signer to the sdk, which enables us to interact with
    // our deployed contract!
    sdk.setProviderOrSigner(signer);
  }, [signer]);

  useEffect(() => {
    if (!address) {
      return;
    }
    return bundleDropModule
      .balanceOf(address, "0")
      .then((balance) => {
        if (balance.gt(0)) {
          setHasClaimedNFT(true);
          console.log("🌟 this user has a membership NFT!");
        } else {
          setHasClaimedNFT(false);
          console.log("😭 this user doesn't have a membership NFT.");
        }
      })
      .catch((error) => {
        setHasClaimedNFT(false);
        console.error("failed to nft balance", error);
      });
  }, [address]);

  if (error && error.name === "UnsupportedChainIdError") {
    return (
      <div className="unsupported-network">
        <h2>Please connect to Rinkeby</h2>
        <p>
          This dapp only works on the Rinkeby network, please switch networks in
          your connected wallet.
        </p>
      </div>
    );
  }

  if (!address) {
    return (
      <div className="landing">
        <h1>Welcome to gardenDAO </h1>
        <h3>A community DAO for our community garden</h3>
        <button onClick={() => connectWallet("injected")} className="btn-hero">
          Connect your wallet
        </button>
      </div>
    );
  }

  // If the user has already claimed their NFT we want to display the interal DAO page to them
  // only DAO members will see this. Render all the members + token amounts.
  if (hasClaimedNFT) {
    return (
      <div className="member-page">
        <h1>gardenDAO🌱 Member Page</h1>
        <p>Lets grow together</p>
        <div>
          <div className="row">
            <div className="member-list column2">
              <h2>Member List</h2>
              <div className="card">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Address</th>
                      <th>Token Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {memberList.map((member) => {
                      return (
                        <tr key={member.address}>
                          <td>{shortenAddress(member.address)}</td>
                          <td>{member.tokenAmount}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="column2">
              <CreateProposal />
            </div>
          </div>
        </div>
        <div className="container">
          <h2>Active Proposals</h2>
          <div className="row">
          {proposals.map((proposal, index) => (
              
                proposal.state === 1 && (
                <div className="column2">
                  <div className="proposal-cards">
                     {proposalCards(proposal, totalTokens, index)}
                  </div>
                </div>
            )
            
          ))}
 
          </div>
        </div>

        <div className="container">
          <h2>Inactive Proposals</h2>
          <div className="row">
            {proposals.map((proposal, index) => (
              <div className="column2">
                {proposal.state !== 1 && (
                  <div className="proposal-cards">
                    {proposalCards(proposal, totalTokens, index)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Render mint nft screen.
  return (
    <div className="mint-nft">
      <h1>Mint your free gardenDAO🌱 Membership NFT to join</h1>
      
      <button
        disabled={isClaiming}
        onClick={() => {
          setIsClaiming(true);
          // Call bundleDropModule.claim("0", 1) to mint nft to user's wallet.
          bundleDropModule
            .claim("0", 1)
            .then(() => {
              // Set claim state.
              setHasClaimedNFT(true);
              // Show user their fancy new NFT!
              console.log(
                `Successfully Minted! Check it our on OpenSea: https://testnets.opensea.io/assets/${bundleDropModule.address}/0`
              );
            })
            .catch((err) => {
              console.error("failed to claim", err);
              setIsClaiming(false);
            })
            .finally(() => {
              // Stop loading state.
              setIsClaiming(false);
              // Set claim state.
              //setHasClaimedNFT(true);
              window.location.reload();
              // Show user their fancy new NFT!
              console.log(
                `Successfully Minted! Check it our on OpenSea: https://testnets.opensea.io/assets/${bundleDropModule.address}/0`
              );
            });
        }}
      >
        {isClaiming ? "Minting..." : "Mint your nft (FREE)"}
      </button>
    </div>
  );
  async function submitVote(proposal) {
    //before we do async things, we want to disable the button to prevent double clicks
    setIsVoting(true);
    console.log("isVoting is " + isVoting);

    // lets get the votes from the form for the values
    
    let voteResult = {
      proposalId: proposal.proposalId,
      //abstain by default
      vote: 2,
    };

    proposal.votes.forEach((vote) => {
      const elem = document.getElementById(
        proposal.proposalId + "-" + vote.type
      );
      if (elem.checked) {
        voteResult.vote = vote.type;
        return;
      }
    });
    // first we need to make sure the user delegates their token to vote
    try {
      //we'll check if the wallet still needs to delegate their tokens before they can vote
      const delegation = await tokenModule.getDelegationOf(address);
      // if the delegation is the 0x0 address that means they have not delegated their governance tokens yet
      if (delegation === ethers.constants.AddressZero) {
        //if they haven't delegated their tokens yet, we'll have them delegate them before voting
        await tokenModule.delegateTo(address);
      }
      // then we need to vote on the proposals
      try {
        // then we check if the proposal is open for voting (state === 1 means it is open)
        if (proposal.state === 1) {
          // if it is open for voting, we'll vote on it
          voteModule.vote(proposal.proposalId, voteResult.vote);
          
        }
        executeProposal();
      } catch (err) {
        console.error("failed to vote", err);
        setIsVoting(false);
      }
    } catch (err) {
      console.error("failed to delegate tokens");
      setIsVoting(false);
    } finally {
      // in *either* case we need to set the isVoting state to false to enable the button again
      setIsVoting(false);
      
      
    }
  }
  async function executeProposal(proposal) {
    try {
      // if any of the propsals are ready to be executed we'll need to execute them
      // a proposal is ready to be executed if it is in state 4
      await Promise.all(
        proposal.map(async (vote) => {
          // we'll first get the latest state of the proposal again, since we may have just voted before
          const proposal = await voteModule.get(vote.proposalId);

          //if the state is in state 4 (meaning that it is ready to be executed), we'll execute the proposal
          if (proposal.state === 4) {
            voteModule.execute(vote.proposalId);
          }
        })
      );
    } catch (err) {
      console.error("failed to execute proposal : " + err);
      
    }
  }

  function proposalCards(proposal, totalTokens, index) {
    return (
      <div
        key={proposal.proposalId}
        className={proposal.state === 3 ? "redCard" : "card2"}
      >
        <h4>{proposal.description} </h4>
        <div className="vote-group">
        <p>
          For:{" "}
          {(
            (ethers.utils.formatUnits(proposal.votes[1].count._hex, 18) /
              totalTokens) *
            100
          ).toFixed(2)}
          % [{ethers.utils.formatUnits(proposal.votes[1].count._hex, 18)}]
        </p>
        <p>
          Against:{" "}
          {(
            (ethers.utils.formatUnits(proposal.votes[0].count._hex, 18) /
              totalTokens) *
            100
          ).toFixed(2)}
          % [{ethers.utils.formatUnits(proposal.votes[0].count._hex, 18)}]
        </p>
        <p>
          Abstain:{" "}
          {(
            (ethers.utils.formatUnits(proposal.votes[2].count._hex, 18) /
              totalTokens) *
            100
          ).toFixed(2)}
          % [{ethers.utils.formatUnits(proposal.votes[2].count._hex, 18)}]
        </p>
        </div>
        <div>
          {proposal.votes.map((vote) => (
            <div key={vote.type} className="radio-group">
              <input
                type="radio"
                id={proposal.proposalId + "-" + vote.type}
                name={proposal.proposalId}
                value={vote.type}
                //default the "abstain" vote to checked
                defaultChecked={vote.type === 2}
              />
              <label htmlFor={proposal.proposalId + "-" + vote.type}>
                {vote.label}
              </label>
            </div>
          ))}
        </div>
        {proposal.state === 1 && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsVoting(true);
              submitVote(proposal);
            }}
          >
            <div className="button-and-text">
            <button disabled={isVoting || hasVotedArray[index]} type="submit">
              {isVoting
                ? "Voting..."
                : hasVotedArray[index]
                ? "You Already Voted"
                : "Submit Votes"}
            </button>
            <small>
              This will trigger multiple transactions that you will need to
              sign.
            </small>
            </div>
          </form>
        )}
        {proposal.state === 3 && (
          <div className="circledLabel">
            <p>Proposal Failed</p>
          </div>
        )}
        {proposal.state === 2 && (
          <div className="circledLabel">
            <p>Proposal Passed</p>
          </div>
        )}
        {proposal.state === 4 && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              executeProposal(proposal);
            }}
          >
            <button type="submit">
              Execute Proposal
            </button>
          </form>
        )}
      </div>
    );
  }
};

export default App;
