import { useMetaMask } from 'metamask-react';
import React, { MouseEventHandler, SyntheticEvent, useEffect, useState } from 'react'
import { useForm } from "react-hook-form";
import Web3 from 'web3';
import ElectionV2JSON from '../../contract/ElectionV2.json'
import { ElectionV2Contract, ElectionV2Instance } from '../../truffle-contracts';
var contract = require("@truffle/contract");

const NodeRSA = require('node-rsa');
const OrganizeNewVote = () =>{
    const { account } = useMetaMask();
    const [electionInstance, setElectionInstance] = useState<ElectionV2Instance>()
    const { register, handleSubmit, watch, formState: { errors } } = useForm();
    const [publicKey, setPublicKey] = useState<string>()
    const [privateKey, setPrivateKey] = useState<string>()
    const [voteOptions, setVoteOptions] = useState<string[]>([])


    const InitContract = async() =>{
        const provider  = new Web3.providers.HttpProvider('http://localhost:7545');
        // console.log("ElectionJSON",ElectionJSON)
        const MyContract = await contract(ElectionV2JSON) 
        await MyContract.setProvider(provider)
        const MyContractWithProvider = MyContract as ElectionV2Contract
        const instance = await MyContractWithProvider.deployed();
        setElectionInstance(instance)
    }

    const InitKey = () =>{
        const key = new NodeRSA({b: 1024});
        const publicPem = key.exportKey('public');
        setPublicKey(publicPem)
        const privatePem = key.exportKey('private');
        setPrivateKey(privatePem)
    }

    useEffect(()=>{
        InitContract()
        InitKey()
    },[])

    

    // const receipt = await electionV2Instance.addVote(voteName,organizerName,publicPem, dummyVoteOptions, {from:organizerAddress})
    const onSubmit = async (value:{name:string, organizerName:string}) =>{
        if(electionInstance === undefined){
            return alert('contract not initialized')
        }
        if(publicKey === undefined){
            return alert('publicKey not initialized')
        }
        if(account === null){
            return alert('metamask account not initialized')
        }
        const result = window.confirm('Do you really want to setup this vote ?')
        if(result){
            try {
                const receipt = await electionInstance.addVote(value.name,value.organizerName,publicKey, [],{from:account})
                console.log("receipt",receipt)  
            } catch (error) {
                alert(`Error! ${error.reason}`)
            }
        }
    }

    useEffect(()=>{
        let options = watch('options') as string
        if(options !== null && options !== ""){
            let seperatedOptions = options.split(',')
            // console.log("seperatedOptions",seperatedOptions)
            setVoteOptions(seperatedOptions)
        }
        // console.log("newName",newName)
    },[watch('options')])

    const downloadKey = (e:SyntheticEvent,key:string, filename:string) => {
        e.preventDefault()
        const element = document.createElement("a");
        const file = new Blob([key], {type: 'text/plain'});
        element.href = URL.createObjectURL(file);
        element.download = filename;
        document.body.appendChild(element); // Required for this to work in FireFox
        element.click();
      }

    // id:number
    // name:string
    // organizerName:string
    // organizerAddress:string
    // publicKey:string
    // privateKey:string
    // voteOptionCount: number
    // totalVoteCount: number
    // voteEnd: boolean
    return(
        <div>
            <form onSubmit={handleSubmit(onSubmit)}>
                
                <label htmlFor="name">Vote Name: </label>
                <input placeholder="enter vote name" id="name" {...register("name", { required: true })} />
                {errors.name && <span style={{color:"red"}}>Required *</span>}
                <br/>

                <label htmlFor="organizerName">Organizer Name: </label>
                <input placeholder="enter organizerName" id="organizerName" {...register("organizerName", { required: true })} />
                {errors.organizerName && <span style={{color:"red"}}>Required *</span>}
                <br/>

                <label htmlFor="options">Vote Options: </label>
                <input placeholder="seperate with comma ," id="options" {...register("options", { required: true })} />
                {errors.options && <span style={{color:"red"}}>Required *</span>}
                <br/>

                <h2>Preview Generated Vote in blockchain</h2>
                <p>Vote Name: {watch('name')}</p>
                <p>Organizer Name: {watch('organizerName')}</p>
                <p>Organizer Address: {account}</p>
                <p>Public Key: </p>
                <span>{publicKey}</span>
                <p>Private Key: </p>
                <span>{privateKey}</span>
                <p>Total Vote Options: {voteOptions.length}</p>
                <p> Vote Options: </p>
                <ol>
                    {
                        voteOptions.map((o,i)=>{
                            return(
                                <li key={i}>{o}</li>
                            )
                        })
                    }
                </ol>

                <span>Please download the key before you submit the ticket, else you cannot decode the vote at the end.</span>
                <br/>
                <button onClick={(e)=>downloadKey(e,privateKey as string, "privateKey.txt")}>Download the private Key</button>
                <br/>
                <button onClick={(e)=>downloadKey(e,publicKey as string, "publicKey.txt")}> Download the public Key</button>
                <br/>
                
                <br/>
                <br/>
                <input type="submit" />
            </form>

            <br />



        </div>
    )
}

export default OrganizeNewVote
