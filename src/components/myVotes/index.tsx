import { useMetaMask } from 'metamask-react';
import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom';
import Web3 from 'web3';
// var contract = require('truffle-contract')

import ElectionV2JSON from '../../contract/ElectionV2.json'
import { ElectionV2Contract, ElectionV2Instance } from '../../truffle-contracts';
import "./index.css"
var contract = require("@truffle/contract");

export interface Vote {
    id:number
    name:string
    organizerName:string
    organizerAddress:string
    publicKey:string
    privateKey:string
    voteOptionCount: number
    totalVoteCount: number
    voteEnd: boolean
    voteOptions:VoteOption[]
    voteTickets:VoteTicket[]
    voteResults:number []
    // uint id;
    // string name;
    // string organizerName;
    // address organizerAddress;
    // string publicKey;
    // string privateKey;

    // uint voteOptionCount;
    // mapping(uint => VoteOption) voteOptions;
    // mapping(uint => uint) voteResults;

    // uint totalVoteCount;
    // mapping(uint => VoteTicket) voteTickets;

    // bool voteEnd;
}

export interface VoteOption{
    id:number
    name:string
}

export interface VoteTicket{
    id:number;
    encryptedBallot:string
    signature:string
}
const MyContractVotes = () =>{
    const { account } = useMetaMask();
    const [electionInstance, setElectionInstance] = useState<ElectionV2Instance>()
    const [myContractVotes, setMyContractVotes] = useState<Vote[]>([])
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

    const InitMyContractVoteList = async (instance:ElectionV2Instance, account:string) =>{
        const counts =  await instance.contractVoteCounts()
        console.log("counts",counts.toNumber())

        const c = await instance.contractVotes(1)
        // console.log("c",c)
        const newMyOrganizedVoteIDs = await instance.getMyOrganizedVotes({from:account})
        // console.log("newMyOrganizedVoteIDs",newMyOrganizedVoteIDs)
        let newMyContractVotes:Vote[] = []
        for(let i = 0; i < newMyOrganizedVoteIDs.length; i++){
            const vote = await instance.contractVotes(newMyOrganizedVoteIDs[i].toNumber())
            const options = await instance.getVoteOptionsByVoteID(newMyOrganizedVoteIDs[i].toNumber())
            console.log("options",options)
            let currentVote = vote as unknown as Vote
            currentVote.voteOptions = options as unknown as VoteOption[]
            newMyContractVotes.push(currentVote)
        }
        // console.log("newMyContractVotes",newMyContractVotes)
        setMyContractVotes(newMyContractVotes)
    }

    useEffect(()=>{
        InitContract()
    },[])

    useEffect(()=>{
        if(electionInstance !== undefined && account !== null){
            InitMyContractVoteList(electionInstance, account)
            // account !== null && InitVoteComponent(electionInstance,account)
        }
    },[electionInstance,account])

    return (
        <div>
            <table>
                <tr>
                    <th>VoteID</th>
                    <th>Vote Name</th>
                    <th>Organizer Name</th>
                    <th>Total Votes</th>
                    <th>Vote Options</th>
                    <th>Go to vote page</th>
                </tr>
            {
                myContractVotes.map((c,i)=>{
                    return(
                        <tr>
                            <td>{Number(c.id)}</td>
                            <td>{c.name}</td>
                            <td>{c.organizerName}</td>
                            <td>{Number(c.totalVoteCount)}</td>
                            <td>{c.voteOptions.map((v, vi)=>{return `${v.name}${(vi + 1) < c.voteOptionCount ? "," : ""}`})}</td>
                            <td><Link to={`/voteDetail/${c.id}`}>Go to Detail Page</Link></td>
                        {/* <li >
                            #VoteID: {Number(c.id)} - {c.name}
                        </li> */}
                        </tr>
                    )
                })
            }
            </table>
        </div>
    )
}
export default MyContractVotes