import { useMetaMask } from 'metamask-react';
import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom';
import Web3 from 'web3';
// var contract = require('truffle-contract')

import ElectionV2JSON from '../../contract/ElectionV2.json'
import { ElectionV2Contract, ElectionV2Instance } from '../../truffle-contracts';
import { Vote, VoteOption, VoteTicket } from '../myVotes';

import "./index.css"
const NodeRSA = require('node-rsa');
var contract = require("@truffle/contract");

const VoteDetail = (props: { match: { params: { voteID: any; }; }; }) =>{
    const voteID = props.match.params.voteID
    const { account } = useMetaMask();
    const [electionInstance, setElectionInstance] = useState<ElectionV2Instance>()
    const [voteDetail, setVoteDetail] = useState<Vote>()
    const [selectedOption, setSelectedOption] = useState<VoteOption>()
    // const [selectedCandidate, setSelectedCandidate] = useState<Candidate>()

    const InitContract = async() =>{
        const provider  = new Web3.providers.HttpProvider('http://localhost:7545');
        // console.log("ElectionJSON",ElectionJSON)
        const MyContract = await contract(ElectionV2JSON) 
        await MyContract.setProvider(provider)
        const MyContractWithProvider = MyContract as ElectionV2Contract
        const instance = await MyContractWithProvider.deployed();
        setElectionInstance(instance)
        // console.log("instance",instance)
        // console.log("candidate1",candidate1)
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
            let currentVote = vote as unknown as Vote
            currentVote.voteOptions = options as unknown as VoteOption[]
            currentVote.voteTickets = tickets as unknown as VoteTicket[]
            setVoteDetail(currentVote)

            // console.log("currentVote",currentVote.organizerAddress)
            // console.log("account",account)
        } catch (error) {
            alert("voteID not match any vote")
        }
    }

    const HandleSelectOption = (e: React.ChangeEvent<HTMLSelectElement>) =>{
        const targetID = e.currentTarget.value as unknown as number
        let found = voteDetail?.voteOptions.find(e=>e.id === targetID)
        if(found){
            setSelectedOption(found)
        }
    }
    const CaseVote = async() =>{
        try {
            if(!electionInstance)return alert('Contract not connected.')
            if(account === null)return alert('Metamask address not connected.')
            if(voteDetail === undefined)return alert('voteDetail not loaded.')
            if(!selectedOption)return alert('Please select a vote option.')
            
            const publicKeyInContract = voteDetail.publicKey
            const pKey = new NodeRSA();
            pKey.importKey(publicKeyInContract, 'public');
            let encryptedBallot = pKey.encrypt(selectedOption.id,'base64')
            let signature = "12312asdasd"
            const receipt = await electionInstance.caseVoteByVoteID(voteID,encryptedBallot, signature,{from:account})
            await InitVoteDetail(electionInstance, account)
            alert(`You have vote #${selectedOption.id} - ${selectedOption.name}`)

            // await InitVoteComponent(electionInstance, account)
            // await InitCandidateList(electionInstance)
        } catch (error) {
            alert(`Case Vote failed, reason ${error}`)
        }
    }

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
    return (
        <div>
            <h2>VoteID #{voteID} Detail in blockchain</h2>
            <p>Vote Name: {voteDetail.name}</p>
            <p>Organizer Name:{voteDetail.organizerName}</p>
            <p>Organizer Address: {voteDetail.organizerAddress}</p>
            <p>Public Key: </p>
            <span>{voteDetail.publicKey}</span>
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
                :
                <>
                    <select
                        onChange={e=>HandleSelectOption(e)}
                        value={selectedOption?.id}
                    >
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
                    <br />
                    <br />
                    <button onClick={()=>CaseVote()}>Vote</button>
                </>
            }
        </div>
    )
}
export default VoteDetail