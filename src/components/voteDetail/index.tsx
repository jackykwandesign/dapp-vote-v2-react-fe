import { useMetaMask } from 'metamask-react';
import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom';
import Web3 from 'web3';
import { blockchainConfig } from '../../config/blockchain';

// var contract = require('truffle-contract')

import ElectionV2JSON from '../../contract/ElectionV2.json'
import { ElectionV2Contract, ElectionV2Instance } from '../../truffle-contracts';
import { Vote, VoteOption, VoteTicket } from '../myVotes';
import { CSVLink, CSVDownload } from "react-csv"
import "./index.css"
import NodeRSA, { AdvancedEncryptionSchemePKCS1 } from 'node-rsa';
import { RSA_NO_PADDING } from "constants"
var contract = require("@truffle/contract");
var QRCode = require('qrcode.react');
const saltedMd5 = require('salted-md5');
var crypto = require("crypto");
// var CsvDownload = require('react-json-to-csv')
// import * as CsvDownload from 'react-json-to-csv'

export const ConvertKeyNonceDataToQRMessage = (publicKey:string, nonce:string, voteOption:string, encryptedBallot:string) =>{
    return `${publicKey}|${nonce}|${voteOption}|${encryptedBallot}`
}
export const GetKeyNonceDataFromQRMessage = (msg:string) =>{
    let defaultData = {
        publicKey:"",
        nonce:"",
        voteOption:"",
        encryptedBallot:""
    }
    console.log("msg",msg)
    const datas = msg.split("|")
    if(datas.length !== 4){
        alert("QR msg data error, length != 4")
        return defaultData
    }else{
        defaultData.publicKey = datas[0]
        defaultData.nonce = datas[1]
        defaultData.voteOption = datas[2]
        defaultData.encryptedBallot = datas[3]
        return defaultData
    }
}
export const CustomPaddingRSAEncrypted = async(publicKey:string, nonce:string, data:string) =>{
    const pKey = new NodeRSA();
    pKey.importKey(publicKey, 'public');
    let scheme:AdvancedEncryptionSchemePKCS1 = {
        scheme:"pkcs1",
        padding:RSA_NO_PADDING,
    }
    pKey.setOptions({environment:"browser", encryptionScheme:scheme});
    let dataWithCustomPadding = `${nonce}-${data}`
    let encryptedData = pKey.encrypt(dataWithCustomPadding, 'base64') as unknown as string
    console.log("dataWithCustomPadding",dataWithCustomPadding)
    console.log("encryptedData", encryptedData)
    console.log("nonce", nonce)
    return {
        nonce,
        encryptedData
    }
}
export const CustomPaddingRSADecrypted = async(privateKey:string, dataToDecrypted:string) =>{
    let defaultData = {
        dataToDecrypted:"",
        decryptedData:"",
    }
    const pKey = new NodeRSA();
    let scheme:AdvancedEncryptionSchemePKCS1 = {
        scheme:"pkcs1",
        padding:RSA_NO_PADDING,
    }
    pKey.setOptions({environment:"browser", encryptionScheme:scheme});

    pKey.importKey(privateKey, 'private');


    let decryptedData = pKey.decrypt(dataToDecrypted,'ascii') as unknown as string
    console.log("dataToDecrypted", dataToDecrypted)
    console.log("decryptedData", decryptedData)
    defaultData.dataToDecrypted = dataToDecrypted
    defaultData.decryptedData = decryptedData
    return defaultData
}
const VoteDetail = (props: { match: { params: { voteID: any; }; }; }) =>{
    const voteID = props.match.params.voteID
    const { account } = useMetaMask();
    const [electionInstance, setElectionInstance] = useState<ElectionV2Instance>()
    const [voteDetail, setVoteDetail] = useState<Vote>()
    const [selectedOption, setSelectedOption] = useState<VoteOption>()
    const [signature, setSignature] = useState<string>("")
    const [privateKey, setPrivateKey] = useState<string>("")
    const [encryptedBallot, setEncryptedBallot] = useState<string>("")
    const [benalohChallengeNonce, setBenalohChallengeNonce] = useState<string>("")
    const [isChallengeCheating, setIsChallengeCheating] = useState<boolean>(false)
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

    const HandleSelectOption = async (e: React.ChangeEvent<HTMLSelectElement>) =>{
        if(voteDetail === undefined)return alert('voteDetail not loaded.')

        const targetID = e.currentTarget.value as unknown as number
        let found = voteDetail?.voteOptions.find(e=>e.id === targetID)
        if(found){
            setSelectedOption(found)
            const publicKeyInContract = voteDetail.publicKey
            benalohChallenge(publicKeyInContract, String(found.id))
        }
    }
    const encryptedWithCustomNonce = async (publicKey:string, data:string) => {
        const customNonce = randomString(128)
        const { nonce, encryptedData} = await CustomPaddingRSAEncrypted(publicKey, customNonce, data)
        return {
            nonce,
            encryptedData
        }
    }
    const benalohChallenge = async (publicKey:string, data:string) =>{
        const { nonce, encryptedData} = await encryptedWithCustomNonce(publicKey, data)
        setBenalohChallengeNonce(nonce)
        setEncryptedBallot(encryptedData)
        setIsChallengeCheating(false)
    }
    const cheatingBenalohChallenge = async (publicKey:string, data:string) =>{
        let cheatingOption = '9999'
        const { nonce, encryptedData} = await encryptedWithCustomNonce(publicKey, cheatingOption)
        setBenalohChallengeNonce(nonce)
        setEncryptedBallot(encryptedData)
        setIsChallengeCheating(true)
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
    var randomString = function(length:number) {
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for(var i = 0; i < length; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

    const VerifyPrivateKey = async () =>{
        try {
            if(voteDetail === undefined)return alert('voteDetail not defined')
            let ballot = 1
            let ballotInStr = String(ballot)
            const publicKeyInContract = voteDetail.publicKey
            // const customNonce = randomString()
            console.log("privateKey",privateKey)
            const { encryptedData, nonce} = await encryptedWithCustomNonce(publicKeyInContract, ballotInStr)
            const ballotRaw = await GetDecryptedBallot(privateKey, encryptedData)
            if(ballotRaw === ballot){
                return window.confirm('Private key verify OK')
            }else{
                return alert(`ballotFromEncryptedData ${ballotRaw} not equal ballot input ${ballot}`)
            }
        } catch (error) {
            alert(`VerifyPrivateKey error ${error}`)
            return false
        }
    }

    const GetDecryptedBallot = async(privateKey:string, encryptedData:string) =>{
        const { dataToDecrypted, decryptedData} = await CustomPaddingRSADecrypted(privateKey, encryptedData)
        let dataWithNonce = decryptedData.split("-")
        if(dataWithNonce.length !== 2){
            // alert("decryptedData format error, trash ballot found")
            console.error("decryptedData format error, trash ballot found")
            return -1
        }
        let ballotFromEncryptedData = dataWithNonce[1]
        let ballotRaw = Number(ballotFromEncryptedData)
        if(ballotRaw === 0){
            console.error("decryptedData format error, trash ballot found")
            return -1
        }
        return ballotRaw
    }
    const EndVoteByPrivateKey = async () =>{
        try {
            if(electionInstance === undefined)return alert('electionInstance not defined')
            if(voteDetail === undefined)return alert('voteDetail not defined')
            if(voteDetail.voteTickets.length === 0 || voteDetail.voteTickets === undefined)return alert('Vote tickets not found')
            if(account === null)return alert('Account not ready.')

            let ticketCount = new Array(Number(voteDetail.voteOptionCount)).fill(0);

            for(let i = 0; i < Number(voteDetail.totalVoteCount); i++) {
                let t = voteDetail.voteTickets[i]
                try {
                    const numberBallot = await GetDecryptedBallot(privateKey, t.encryptedBallot)
                    console.log("numberBallot",numberBallot)
                    if(numberBallot > 0 && numberBallot <= Number(voteDetail.voteOptionCount)){
                        ticketCount[numberBallot - 1] ++;
                    }
                } catch (error) {
                    
                }
            }
            // voteDetail.voteTickets.map(async t=>{

            // })
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
                if(t === maxVotes && ti !== maxID){
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

    const VotingDetail = () =>{
        return(
            <div style={{borderStyle:"solid"}}>
                <div style={{margin:20}}>
                <h2>VoteID #{voteID} Detail in blockchain</h2>
                <p>Vote Name: {voteDetail.name}</p>
                <p>Organizer Name:{voteDetail.organizerName}</p>
                <p>Organizer Address: {voteDetail.organizerAddress}</p>
                <p>Allow Vote: {voteDetail.voteEnd ? "Expired" : "Allow"}</p>
                <p>Public Key: </p><QRCode value={voteDetail.publicKey} />
                <p>{voteDetail.publicKey}</p>
                {
                    voteDetail.voteEnd  &&
                    <>
                    <p>Private Key: </p><QRCode value={voteDetail.privateKey} />
                    <p>{voteDetail.privateKey}</p>
                    </>
                }
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
                </div>
            </div>
        )
    }

    const VoteTicketList = () =>{
        return(
            <div>
                <h2>Vote Tickets
                </h2>
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
                                    <tr key={ti}>
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
                
            </div>
        )
    }

    const VoteResultList = () =>{
        let maxID = 0;
        let maxCount = 0
        voteDetail.voteResults.map((vr, vi)=>{
            if(vr > maxCount){
                maxCount = vr
                maxID = vi
            }
        })
        return(
            <div>
                <h2>Vote Result</h2>
                (
                        <CSVLink 
                            data={ voteDetail.voteTickets}
                            filename={`vote_${voteID}_tickets.csv`}
                            // headers = {
                            //     [
                            //         { label: 'id', key: 'id' },
                            //         { label: 'encryptedBallot', key: 'encryptedBallot' },
                            //         { label: 'signature', key: 'signature' },
                            //     ]
                            // }
                        >
                            Download Raw Ticket CSV
                        </CSVLink>
                    )
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
                                <tr key={i} style={{backgroundColor: i === maxID ? "yellow" : "transparent"}}>
                                    <td>{Number(r.id)}</td>
                                    <td>{r.name}</td>
                                    <td>{Number(voteDetail.voteResults[i])}</td>
                                </tr>
                            )
                        })
                    }  
                    </tbody>
                </table>
            </div>
        )
    }

    
    if(voteDetail.organizerAddress.toUpperCase() === account.toUpperCase()){
        // is Organizer
        return(
            <div>
                <VotingDetail />
                <br/>
                <VoteTicketList />
                <br/>
                {
                    voteDetail.voteEnd && <VoteResultList /> 
                }
                <>
                    <h2>To end the vote, paste your private key in here or upload your result if you need to verify the signature</h2>
                    <textarea rows={20} cols={100} placeholder={"please paste your private key here"} onChange={e=>setPrivateKey(e.currentTarget.value)}/>
                    <br />
                    <button onClick={()=>VerifyPrivateKey()}>Verify Private Key</button>
                    <button onClick={()=>EndVoteByPrivateKey()}>End Vote with Private Key</button>
                </>
            </div>
        )
    }else{
        return (
            <div>
                <VotingDetail />
                <br/>
                {
                    voteDetail.voteEnd ?
                    <VoteResultList />
                    :
                    <div>
                        <div style={{borderStyle:"solid"}}>
                            <div style={{margin:20}}>
                            <h2 >Step 1. Please choose your vote options</h2>
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
                                            #{vi + 1} {v.name}
                                            </option>
                                        )
                                    })
                                }
                            </select>
                            </div>
                        </div>

                        <br />


                        {
                            selectedOption !== undefined &&
                            <div style={{borderStyle:"solid"}}>
                                <div style={{margin:20}}>
                                    <h2>Step 2. (optional) Verify the Case as intented by benaloh Challenge</h2>
                                    <button 
                                        onClick={()=>benalohChallenge(voteDetail.publicKey, String(selectedOption.id))}
                                        style={{marginRight:20}}
                                    >Generate Honest Challenge</button>
                                    <button 
                                        onClick={()=>cheatingBenalohChallenge(voteDetail.publicKey, String(selectedOption.id))}
                                    >Generate Cheating Challenge</button>
                                    <p>ballot:{encryptedBallot}</p>
                                    <p>Nonce: {benalohChallengeNonce}</p>
                                    <p>{isChallengeCheating ? "Cheating Challenge QR" : "Normal Challenge QR"}</p>
                                    <QRCode 
                                        value={ConvertKeyNonceDataToQRMessage(voteDetail.publicKey, benalohChallengeNonce, String(selectedOption.id),encryptedBallot)} 
                                        size={512}
                                        renderAs={"svg"}
                                    />
                                    {/* <p>{encryptedBallot}</p> */}
                                    <p>To verify the ballot is case as intented</p>
                                    <p>1. Go to verify tap in your mobile</p>
                                    <p>2. Scan the Challenge QR</p>
                                    <p>3. If OK pop up, you case as intented, else the voting website is cheating!</p>
                                </div>
                            </div>
                        }
                        <br />
                        {
                            selectedOption !== undefined &&
                            <div style={{borderStyle:"solid"}}>
                                <div style={{margin:20}}>
                                    <h2>Step 3. Sign Vote with DAA credential</h2>
                                    <textarea rows={4} cols={100} placeholder={"please paste your signature here, make sure signature is correct, else this vote will be ignored"} onChange={e=>setSignature(e.currentTarget.value)}/>
                                </div>
                            </div>
                        }
                        <br />
                        {
                            selectedOption && signature &&
                            <div style={{borderStyle:"solid"}}>
                                <div style={{margin:20}}>
                                    <h2>Step 4. Please verify the Encrypted Ballot and signature if need</h2>
                                    <p>Encrypted Ballot: {encryptedBallot}</p>
                                    <p>Signature: {signature}</p>
                                    {/* <h2>Step 3. Case the Vote to blockchain</h2> */}
                                    <button disabled={selectedOption === undefined} onClick={()=>CaseVote()}>Case the Vote</button>
                                </div>
                            </div>
                        }
                    </div>
                }
            </div>
        )
    }

}
export default VoteDetail