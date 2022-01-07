import { ethers } from "ethers";

// import thirdweb

import { ThirdwebSDK } from "@3rdweb/sdk";
import dotenv from "dotenv";
import React from "react"

dotenv.config();


const sdk = new ThirdwebSDK(
  new ethers.Wallet(
    // Your wallet private key. ALWAYS KEEP THIS PRIVATE, DO NOT SHARE IT WITH ANYONE, add it to your .env file and do not commit that file to github!
    process.env.REACT_APP_PRIVATE_KEY,
    // RPC URL, we'll use our Alchemy API URL from our .env file.
    ethers.getDefaultProvider(process.env.REACT_APP_ALCHEMY_API_URL),
  ),
);


// Our voting contract.
const voteModule = sdk.getVoteModule(
  "0x8457BE5b69072833Fa340a50a5226a72F5aE8A8D",
);

// Our ERC-20 contract.
const tokenModule = sdk.getTokenModule(
  "0xa62Be9821304A427B636B33dD942BbDC04694381",
);



export default function CreateProposal() {

    const [proposalText, setProposalText] = React.useState('');
    const [amount, setAmount] = React.useState(0);
    const [address, setAddress] = React.useState('');

    const handleTextChange = (event) => {
      setProposalText(event.target.value);
    };

    const handleSubmit = (event) => {
      event.preventDefault();
      generateNewProposal();
    }

    const handleAmountChange = (event) => {
      setAmount(event.target.value);
      
      console.log(amount);
    }
    const handleAddressChange = (event) => {
      setAddress(event.target.value);
      
      console.log(address);
    }
    const submitMintRequest = (event) => {
      event.preventDefault();
      generateNewMintProposal(amount);
    }
    const submitTransferRequest = (event) => {
      event.preventDefault();
      generateTransferProposal(amount, address);
    }


    const [proposalType, setProposalType] = React.useState('new');

    const handleNewChange = () => {
      setProposalType('new');
    };

    const handleMintChange = () => {
      setProposalType('mint');
    };

    const handlePayChange = () => {
      setProposalType('pay');
    };
    
    const generateNewProposal = async () => {
      try {
        console.log("attempting to create new proposal...")
        await voteModule.propose(
          proposalText,
          [
            {
              nativeTokenValue: 0,
              transactionData: tokenModule.contract.interface.encodeFunctionData(
                // Minting 0 new tokens to allow a blank proposal through. Waiting on ThirdWeb support on how to work around this
                "mint",
                [
                  voteModule.address,
                  ethers.utils.parseUnits("0", 18),
                ]
              ),
              // Our token module that actually executes the mint.
              toAddress: tokenModule.address,
            },
          ]
        );
    
        console.log("✅ Successfully created new blank proposal");
      } catch (error) {
        console.error("failed to create first proposal", error);
        
      }
  }


    const generateNewMintProposal = async (tokenAmount) => {
        try {
          console.log("attempting to create new mint proposal...")
          const amount = tokenAmount;
          
          await voteModule.propose(
            "Should the DAO mint an additional " + amount + " tokens into the treasury?",
            [
              {
                // Our nativeToken is ETH. nativeTokenValue is the amount of ETH we want
                // to send in this proposal. In this case, we're sending 0 ETH.
                // We're just minting new tokens to the treasury. So, set to 0.
                nativeTokenValue: 0,
                transactionData: tokenModule.contract.interface.encodeFunctionData(
                  // We're doing a mint! And, we're minting to the voteModule, which is
                  // acting as our treasruy.
                  "mint",
                  [
                    voteModule.address,
                    ethers.utils.parseUnits(amount.toString(), 18),
                  ]
                ),
                // Our token module that actually executes the mint.
                toAddress: tokenModule.address,
              },
            ]
          );
      
          console.log("✅ Successfully created proposal to mint tokens");
        } catch (error) {
          console.error("failed to create proposal", error);
          
        }
    }
    const generateTransferProposal = async (tokenAmount, address ) => {
      console.log("Generating transfer proposal...")
        try {
          const amount = tokenAmount;
          // Create proposal to transfer ourselves 6,900 token for being awesome.
          await voteModule.propose(
            "Should the DAO transfer " +
            amount + " tokens from the treasury to " +
            address,
            [
              {
                // Again, we're sending ourselves 0 ETH. Just sending our own token.
                nativeTokenValue: 0,
                transactionData: tokenModule.contract.interface.encodeFunctionData(
                  // We're doing a transfer from the treasury to our wallet.
                  "transfer",
                  [
                    address,
                    ethers.utils.parseUnits(amount.toString(), 18),
                  ]
                ),
      
                toAddress: tokenModule.address,
              },
            ]
          );
      
          console.log(
            "✅ Successfully created proposal"
          );
        } catch (error) {
          console.error("failed to create first proposal", error);
        }
      }


    return (
        <div className="container">
            <div className="row">
                <div className="row-sm-12">
                <h2>Create New Proposal</h2>
                <div className="card">
                <label>
                          Proposal:
                  </label>
                <RadioButton
                    label="New"
                    value={proposalType === 'new'}
                    onChange={handleNewChange}
                  />
                  <RadioButton
                    label="Mint"
                    value={proposalType === 'mint'}
                    onChange={handleMintChange}
                  />
                  <RadioButton
                    label="Pay"
                    value={proposalType === 'pay'}
                    onChange={handlePayChange}
                  />
                  <br></br>

                
                {proposalType === 'new' &&
                  
                      <form onSubmit={handleSubmit}>

                          <textarea value={proposalText} onChange={handleTextChange}/>
                        
                        <input type="submit" value="Submit" />
                      </form>
                  
                }
                {proposalType === 'mint' &&
                  
                    <form onSubmit={submitMintRequest}>

                    <p>Should the DAO mint an additional tokens into the treasury?</p>
                    <label>Amount of Token to Mint:
                    <input type="number" name="amount" onChange={handleAmountChange} />
                    </label>
                    <input type="submit" value="Submit" />
                    </form>
                  
                }
                {proposalType === 'pay' &&
                    <form onSubmit={submitTransferRequest}>

                    <p>Propose the DAO transfers tokens to the given address below</p>
                    <label>Address to transfer to:
                    <input type="text" name="address" onChange={handleAddressChange} />
                    </label>
                    <label>Amount of Tokens to transfer:
                    <input type="number" name="amount" onChange={handleAmountChange} />
                    </label>
                    <input type="submit" value="Submit" />
                    </form>
                }
                </div>


                </div>
            </div>
        </div>
    )
}

const RadioButton = ({ label, value, onChange }) => {
  return (
    <label>
      <input type="radio" checked={value} onChange={onChange} />
      {label}
    </label>
  );
};
