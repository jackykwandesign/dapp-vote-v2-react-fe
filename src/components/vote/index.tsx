import { useMetaMask } from 'metamask-react';
import React, { useEffect, useState } from 'react'
import Web3 from 'web3';
import { blockchainConfig } from '../../config/blockchain';
// var contract = require('truffle-contract')

import ElectionJSON from '../../contract/Election.json'
import { ElectionContract, ElectionInstance } from '../../truffle-contracts';
var contract = require("@truffle/contract");

interface Candidate {
    id:number
    name:string
    voteCount:number
}

const Vote = () =>{
    const { account } = useMetaMask();
    const [electionInstance, setElectionInstance] = useState<ElectionInstance>()
    const [candidateList, setCandidateList] = useState<Candidate[]>([])
    const [selectedCandidate, setSelectedCandidate] = useState<Candidate>()
    const [isVoted, setIsVoted] = useState(false)
    const InitContract = async() =>{
        const provider  = new Web3.providers.HttpProvider(blockchainConfig.rpcURL);
        // console.log("ElectionJSON",ElectionJSON)
        const MyContract = await contract(ElectionJSON) 
        await MyContract.setProvider(provider)
        const MyContractWithProvider = MyContract as ElectionContract
        try {
            const instance = await MyContractWithProvider.deployed();
            setElectionInstance(instance)
        } catch (error) {
            alert('Contract not deployed.')
        }
    }
    const InitCandidateList = async (instance:ElectionInstance) =>{
        // get candidate List to show
        const candidateCount = await (await instance.candidatesCount()).toNumber()
        let newCandidateList:Candidate[] = []
        for(let i = 1; i <= candidateCount; i++){
            const candidate = await instance.candidates(i)
            let newCandidate:Candidate = {
                id:candidate[0].toNumber(),
                name:candidate[1],
                voteCount:candidate[2].toNumber()
            }
            newCandidateList.push(newCandidate)
        }
        setCandidateList(newCandidateList)
        newCandidateList.length > 0 && setSelectedCandidate(newCandidateList[0])
    }

    const InitVoteComponent = async(instance:ElectionInstance, account:string) =>{
        //get if voted
        try {
            const isVoted = await instance.voters(account)
            console.log("isVoted", isVoted)
            if(isVoted)setIsVoted(true)
        } catch (error) {
            console.log("isVoted account error", error)
        }
    }
    const HandleSelectCandidate = (e: React.ChangeEvent<HTMLSelectElement>) =>{
        const candidateID = e.currentTarget.value as unknown as number
        let foundCandidate = candidateList.find(e=>e.id === candidateID)
        if(foundCandidate){
            setSelectedCandidate(foundCandidate)
        }
    }
    const CaseVote = async() =>{
        try {
            if(!electionInstance)return alert('Contract not connected.')
            if(account === null)return alert('Metamask address not connected.')
            if(!selectedCandidate)return alert('Please select a candidate.')
            const receipt = await electionInstance.vote(selectedCandidate.id,{from:account})
            alert(`You have vote #${selectedCandidate.id} - ${selectedCandidate.name}`)
            await InitVoteComponent(electionInstance, account)
            await InitCandidateList(electionInstance)
        } catch (error) {
            alert(`Case Vote failed, reason ${error}`)
        }
    }

    useEffect(()=>{
        InitContract()
    },[])

    useEffect(()=>{
        if(electionInstance !== undefined){
            InitCandidateList(electionInstance)
            account !== null && InitVoteComponent(electionInstance,account)
        }
    },[electionInstance,account])

    return (
        <div>
            <div>
                <h2>Candidate List</h2>
                {
                    candidateList.map(candidate =>{
                        return(
                            <div key={candidate.id}>
                                <span>{candidate.id} - {candidate.name} - {candidate.voteCount}</span>
                            </div>
                        )
                    })
                }
            </div>
            <div>
                {
                    account ? 
                    <>
                        <h3>Vote Area</h3>
                        {
                            isVoted ? 
                            <div>You have already voted</div>
                            :
                            <div>
                                <span>Please choose your candidate to vote</span>
                                <br />
                                <br />
                                <select
                                    onChange={e=>HandleSelectCandidate(e)}
                                    value={selectedCandidate?.id}
                                >
                                    {
                                        candidateList.map(candidate =>{
                                            return(
                                                <option 
                                                    value={candidate.id}
                                                    key={candidate.id}
                                                
                                                >
                                                    {candidate.name}
                                                </option>
                                            )
                                        })
                                    }
                                </select>
                                <br />
                                <br />
                                <button onClick={()=>CaseVote()}>Vote</button>
                            </div> 
                        }
                    </>
                    :
                    <h3 style={{color:"red"}}>Please connect metamask account to start voting</h3>
                }
            </div>
        </div>
    )
}
export default Vote