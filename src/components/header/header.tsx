import { useMetaMask } from 'metamask-react';
import { MetaMaskState } from 'metamask-react/lib/metamask-context';
import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom';
import { blockchainConfig } from '../../config/blockchain';
import logo from './logo.svg';


const MetamaskContainer = () =>{
    const { status, connect, account } = useMetaMask();
    useEffect(()=>{
        console.log("status", status)
    },[status])
    switch(status){
        case "connected":
            return <div>Connected account: {account}</div>
        case "connecting":
            return <div>Connecting...</div>
        case "initializing":
            return <div>Synchronisation with MetaMask ongoing...</div>
        case "notConnected":
            return <button onClick={connect}>Connect to MetaMask</button>
        case "unavailable":
            return <div>Metamask not available</div>
        default:
            return <div>Can not detect metamask</div>
    }
}

const Header = () =>{
    return (
        <header className="App-header">
            <p>Network: {blockchainConfig.name}: {blockchainConfig.rpcURL}</p>
            <MetamaskContainer />
            <br />
            <Link to="/myContractVotes" style={{marginRight:100}}>My Organized Voting</Link>
            <Link to="/organizeNewVote">Organize New Voting</Link>
        </header>
    )
}
export default Header