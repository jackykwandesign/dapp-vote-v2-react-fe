import { useMetaMask } from 'metamask-react';
import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom';
import Web3 from 'web3';
import { blockchainConfig } from '../../config/blockchain';
// var contract = require('truffle-contract')

import ElectionV2JSON from '../../contract/ElectionV2.json'
import { ElectionV2Contract, ElectionV2Instance } from '../../truffle-contracts';
import { Vote, VoteOption, VoteTicket } from '../myVotes';

import "./index.css"
const NodeRSA = require('node-rsa');
var contract = require("@truffle/contract");
var QRCode = require('qrcode.react');

const VoteDetail = (props: { match: { params: { voteID: any; }; }; }) =>{
    const voteID = props.match.params.voteID
    const { account } = useMetaMask();
    const [electionInstance, setElectionInstance] = useState<ElectionV2Instance>()
    const [voteDetail, setVoteDetail] = useState<Vote>()
    const [selectedOption, setSelectedOption] = useState<VoteOption>()
    const [signature, setSignature] = useState<string>("")
    const [privateKey, setPrivateKey] = useState<string>("")
    const [encryptedBallot, setEncryptedBallot] = useState<string>("")
    const [voted, setVoted] = useState<boolean>(false)
    const [receipt, setReceipt] = useState<Truffle.TransactionResponse<never>>()
    // const [selectedCandidate, setSelectedCandidate] = useState<Candidate>()

    const InitContract = async() =>{
        const provider  = new Web3.providers.HttpProvider(blockchainConfig.rpcURL);
        // console.log("ElectionJSON",ElectionJSON)
        const MyContract = await contract(ElectionV2JSON) 
        await MyContract.setProvider(provider)
        const MyContractWithProvider = MyContract as ElectionV2Contract
        try {
            const instance = await MyContractWithProvider.deployed();
            setElectionInstance(instance)
        } catch (error) {
            alert('Contract not deployed.')
        }
    }

    const InitVoteDetail = async (instance:ElectionV2Instance, account:string) =>{
        
        try {
            const totalVotes =  await instance.contractVoteCounts
            if(voteID < 0 || voteID > totalVotes){
                return alert("voteID not match any vote")
            }
            const vote = await instance.contractVotes(voteID)
            const options = await instance.getVoteOptionsByVoteID(voteID)
            const tickets = await instance.getVoteTicketsByVoteID(voteID)
            const results = await instance.getVoteResultsByVoteID(voteID)
            let currentVote = vote as unknown as Vote
            currentVote.voteOptions = options as unknown as VoteOption[]
            currentVote.voteTickets = tickets as unknown as VoteTicket[]
            currentVote.voteResults = results as unknown as number[]
            setVoteDetail(currentVote)

            // console.log("currentVote",currentVote.organizerAddress)
            // console.log("account",account)
        } catch (error) {
            alert("voteID not match any vote")
        }
    }

    const HandleSelectOption = (e: React.ChangeEvent<HTMLSelectElement>) =>{
        if(voteDetail === undefined)return alert('voteDetail not loaded.')

        const targetID = e.currentTarget.value as unknown as number
        let found = voteDetail?.voteOptions.find(e=>e.id === targetID)
        if(found){
            setSelectedOption(found)
            const publicKeyInContract = voteDetail.publicKey
            const pKey = new NodeRSA();
            pKey.importKey(publicKeyInContract, 'public');
            let encryptBallot = pKey.encrypt(found.id,'base64')
            setEncryptedBallot(encryptBallot)
        }
    }

    const CaseVote = async() =>{
        try {
            if(!electionInstance)return alert('Contract not connected.')
            if(account === null)return alert('Metamask address not connected.')
            if(voteDetail === undefined)return alert('voteDetail not loaded.')
            if(!selectedOption)return alert('Please select a vote option.')

            const result = window.confirm("Do you really want to case vote ? Note that same DAA credential can only case once.")
            if(result){
                const receipt = await electionInstance.caseVoteByVoteID(voteID,encryptedBallot, signature,{from:account})
                console.log("receipt",receipt)
                await InitVoteDetail(electionInstance, account)
                // alert(`You have vote #${selectedOption.id} - ${selectedOption.name}`)
                setReceipt(receipt)
                setVoted(true)
            }
        } catch (error) {
            alert(`Case Vote failed, reason ${error}`)
        }
    }

    const VerifyPrivateKey = () =>{
        try {
            if(voteDetail === undefined)return alert('voteDetail not defined')
            let ballot = 1
            const publicKeyInContract = voteDetail.publicKey
            const pKey = new NodeRSA();
            pKey.importKey(publicKeyInContract, 'public');
            let encryptBallot = pKey.encrypt(ballot,'base64')
    
            const privateKeyProvideByOrganizer = new NodeRSA();
            privateKeyProvideByOrganizer.importKey(privateKey,'private')
            let decryptOption = privateKeyProvideByOrganizer.decrypt(encryptBallot,'json')
            if(decryptOption === ballot)return window.confirm('Private key verify OK')
            return alert(`VerifyPrivateKey decryptOption ${decryptOption} not equal ballot input ${ballot}`)
        } catch (error) {
            alert(`VerifyPrivateKey error ${error}`)
            return false
        }
    }

    const EndVoteByPrivateKey = async () =>{
        try {
            if(electionInstance === undefined)return alert('electionInstance not defined')
            if(voteDetail === undefined)return alert('voteDetail not defined')
            if(voteDetail.voteTickets.length === 0 || voteDetail.voteTickets === undefined)return alert('Vote tickets not found')
            if(account === null)return alert('Account not ready.')

            const privateKeyProvideByOrganizer = new NodeRSA();
            privateKeyProvideByOrganizer.importKey(privateKey,'private')

            let ticketCount = new Array(Number(voteDetail.voteOptionCount)).fill(0);
            voteDetail.voteTickets.map(t=>{
                try {
                    let ballot = privateKeyProvideByOrganizer.decrypt(t.encryptedBallot,'json')
                    console.log("ballot",ballot)
                    if(ballot > 0 && ballot <= Number(voteDetail.voteOptionCount)){
                        ticketCount[ballot - 1] ++;
                        // console.log("ballot",ballot)
                    }
                } catch (error) {
                    
                }
            })
            window.confirm(`This is the result ${ticketCount}`)

            let maxID = 0
            let maxVotes = 0;
            // find max
            ticketCount.map((t, ti)=>{
                if(t > maxVotes){
                    maxVotes = t
                    maxID = ti
                }
            })

            let draw = false
            // scan draw
            ticketCount.map((t, ti)=>{
                if(t === maxVotes){
                    // console.log("draw")
                    draw = true
                }
            })

            if(draw){
                window.confirm('Draw')
            }else{
                window.confirm(`${Number(voteDetail.voteOptions[maxID].id)} --- ${voteDetail.voteOptions[maxID].name} is the winner`)
                
            }

            try {
                const receipt = await electionInstance.endVoteByVoteID(voteID,privateKey,ticketCount,{from:account})
                window.confirm('Data saved to blockchain')
            } catch (error) {
                window.confirm('Data saved to blockchain failed')
            }
            
    
        } catch (error) {
            alert(`VerifyPrivateKey error ${error}`)
            return false
        }
    }
// const voteTickets = await electionV2Instance.getVoteTicketsByVoteID(existVoteID)
    useEffect(()=>{
        InitContract()
    },[])

    useEffect(()=>{
        if(electionInstance !== undefined && account !== null){
            InitVoteDetail(electionInstance, account)
            // account !== null && InitVoteComponent(electionInstance,account)
        }
    },[electionInstance,account])

    if(voteDetail === undefined){
        return <div>Loading voteDetail</div>
    }
    if(account === null){
        return <div>Loading account</div>
    }
    if(voted){
        return <div>
            <p>Thanks for your vote, you can close the website now</p>
            <p>TxID: {receipt?.tx}</p>
            <p>Contract Address: {receipt?.receipt.to}</p>
            <p>Gas used: {receipt?.receipt.gasUsed}</p>
            <p>Eth used: {receipt?.receipt.gasUsed * blockchainConfig.gasPrice * 0.000000001} ETH</p>
            <Link to="/myContractVotes"><button>Go to my votes</button></Link>
        </div>
    }
    return (
        <div>
            <h2>VoteID #{voteID} Detail in blockchain</h2>
            <p>Vote Name: {voteDetail.name}</p>
            <p>Organizer Name:{voteDetail.organizerName}</p>
            <p>Organizer Address: {voteDetail.organizerAddress}</p>
            <p>Allow Vote: {voteDetail.voteEnd ? "Expired" : "Allow"}</p>
            <p>Public Key: </p><QRCode value={voteDetail.publicKey} />
            <p>{voteDetail.publicKey}</p>
            <p>Total Vote Options: {Number(voteDetail.voteOptionCount)}</p>
            <p> Vote Options: </p>
            <ol>
                {
                    voteDetail.voteOptions.map((o,i)=>{
                        return(
                            <li key={i}>{o.name}</li>
                        )
                    })
                }
            </ol>
            <p>Total Voted Ticket: {Number(voteDetail.totalVoteCount)}</p>

            {
                voteDetail.organizerAddress.toUpperCase() === account.toUpperCase() ?
                <>
                {/* // check all ticket */}
                    <table>
                        <thead>
                            <tr>
                                <th>Ticket ID</th>
                                <th>Encrypted Ballot</th>
                                <th>Signature</th>
                            </tr>
                        </thead>
                        <tbody>
                            {
                                voteDetail.voteTickets.map((t,ti)=>{
                                    return(
                                        <tr>
                                            <td>{Number(t.id)}</td>
                                            <td>{t.encryptedBallot}</td>
                                            <td>{t.signature}</td>
                                        </tr>
                                    )
                                })
                            }
                        </tbody>
                    </table>
                    <br />
                    <button>Download CSV</button>

                    {
                        voteDetail.voteEnd ? 

                        <>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Option ID</th>
                                        <th>Option Name</th>
                                        <th>Option Count</th>
                                    </tr>
                                </thead>
                                <tbody>
                                {
                                    voteDetail.voteOptions.map((r, i)=>{
                                        return(
                                            <tr key={i}>
                                                <td>{Number(r.id)}</td>
                                                <td>{r.name}</td>
                                                <td>{Number(voteDetail.voteResults[i])}</td>
                                            </tr>
                                        )
                                    })
                                }  
                                </tbody>

                            </table>
                        </>
                        :
                            <>
                            <h2>To end the vote, paste your private key in here or upload your result if you need to verify the signature</h2>
                            <textarea rows={20} cols={100} placeholder={"please paste your private key here"} onChange={e=>setPrivateKey(e.currentTarget.value)}/>
                            <br />
                            <button onClick={()=>VerifyPrivateKey()}>Verify Private Key</button>
                            <button onClick={()=>EndVoteByPrivateKey()}>End Vote with Private Key</button>
                        </>
                    }

                </>
                :
                <>
                    <h2 className="happy">Step 1. Please choose your vote options</h2>
                    <select
                        onChange={e=>HandleSelectOption(e)}
                        value={selectedOption?.id}
                        defaultValue={-1}
                    >
                        <option disabled value={-1}> -- select an option -- </option>
                        {
                            voteDetail.voteOptions.map((v, vi) =>{
                                return(
                                    <option 
                                        value={Number(v.id)}
                                        key={Number(v.id)}
                                    
                                    >
                                        {v.name}
                                    </option>
                                )
                            })
                        }
                    </select>

                    {
                        selectedOption !== undefined &&
                        <>
                            <br />
                            <h2>Step 2. (optioinal) Verify the Encrypted Ballot</h2>
                            <p>Encrypted Ballot</p><QRCode value={encryptedBallot} />
                            <p>{encryptedBallot}</p>
                            <p>To verify the ballot is case as intented</p>
                            <p>1. Go to verify tap in your mobile</p>
                            <p>2. Scan the public key</p>
                            <p>3. Input your optionID, e.g. Number next to options</p>
                            <p>4. Scan the Encrypted Ballot</p>
                            <p>5. If OK pop up, you case as intented, else the voting website is cheating!</p>
                        </>
                    }

                    {
                        selectedOption !== undefined &&
                        <>
                            <br />
                            <h2>Step 3. Sign Vote with DAA credential</h2>
                            <textarea rows={4} cols={100} placeholder={"please paste your signature here, make sure signature is correct, else this vote will be ignored"} onChange={e=>setSignature(e.currentTarget.value)}/>
                            {/* <h2>Step 3. Case the Vote to blockchain</h2> */}
                            {/* <button disabled={selectedOption === undefined} onClick={()=>CaseVote()}>Vote</button> */}
                        </>
                    }

                    {
                        selectedOption && signature &&
                        <>
                            <br />
                            <h2>Step 4. Please verify the Encrypted Ballot and signature if need</h2>
                            <p>Encrypted Ballot: {encryptedBallot}</p>
                            <p>Signature: {signature}</p>
                            {/* <h2>Step 3. Case the Vote to blockchain</h2> */}
                            <button disabled={selectedOption === undefined} onClick={()=>CaseVote()}>Case the Vote</button>
                        </>
                    }
                    
                </>
            }
        </div>
    )
}
export default VoteDetail