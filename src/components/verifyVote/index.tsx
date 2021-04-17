import React, { Component, useState } from 'react'
import QrReader from 'react-qr-reader'
import { CustomPaddingRSAEncrypted, GetKeyNonceDataFromQRMessage } from '../voteDetail';
const NodeRSA = require('node-rsa');

const VerifyVote = () =>{
  const [startScanStep1, setStartScanStep1] = useState<boolean>(false)
  const [challenge, setChallenge]= useState<string>("")
  const [publicKey, setPublicKey]= useState<string>("")
  const [benalohChallengeNonce, setBenalohChallengeNonce] = useState<string>("")
  const [benalohChallengeResult, setBenalohChallengeResult] = useState<string>("")
  const handleError = (err:any) => {
    console.error(err)
  }
  return(
    <div>
      <h2>Step 1. Please Scan the Challenge QR</h2>
      <p>Nonce: {benalohChallengeNonce}</p>
      <p>Public Key: {publicKey}</p>
      <p>Encrypted Vote From Voting Machine: {challenge}</p>
      <p>Encrypted Ballot with Nonce: {benalohChallengeResult}</p>
      <div style={{ width: 500 }}>
        {
          startScanStep1 ? 
          <QrReader
            delay={1000}
            onError={handleError}
            onScan={async (d)=>{
              if(d){
                const { nonce, publicKey, voteOption, encryptedBallot} = GetKeyNonceDataFromQRMessage(d)
                if(publicKey !== ""){
                  const {encryptedData} = await CustomPaddingRSAEncrypted(publicKey, nonce, voteOption)
                  console.log("encryptedData",encryptedData)
                  console.log("encryptedBallot",encryptedBallot)
                  setBenalohChallengeNonce(nonce)
                  setPublicKey(publicKey)
                  setChallenge(encryptedBallot)
                  setBenalohChallengeResult(encryptedData)
                  if(encryptedData === encryptedBallot){
                    alert('OK')
                  }else{
                    alert('Cheating!!!')
                  }
                  setStartScanStep1(false)
                }
              }
            }}
          />
          :
          <button onClick={()=>{
            setChallenge("")
            setStartScanStep1(true)
          }}>Start Scan key</button>
        }

      </div>
    </div>
  )
}

export default VerifyVote
// const VerifyVote = () =>{
//   const [step, setStep] = useState<number>(1)
//   const [startScanStep1, setStartScanStep1] = useState<boolean>(false)
//   const [startScanStep2, setStartScanStep2] = useState<boolean>(false)

//   const [publicKey, setPublicKey]= useState<string>("")
//   const [encryptedBallot, setEncryptedBallot]= useState<string>("")
//   const [optionNumber, setOptionNumber]= useState<string>("")
//   const handleError = (err:any) => {
//     console.error(err)
//   }

//   const verifyTicket = () =>{
//     try {
//       const pKey = new NodeRSA();
//       pKey.importKey(publicKey, 'public');
//       let dummyEncBallot = pKey.encrypt(optionNumber,'base64')
//       console.log("dummyEncBallot", dummyEncBallot)
//       console.log("encryptedBallot", encryptedBallot)
//       if(dummyEncBallot === encryptedBallot){
//         window.confirm(`Ballot match, verified`)
//       }else{
//         alert(`Ballot not match, Voting machine is cheating`)
//       }
//     } catch (error) {
//       console.log("error", error)
//       alert(`Error: ${JSON.stringify(error)}`)
//     }
//   }

//   return(
//     <div>
//       {
//         step >= 1 &&
//         <div>
//           <h2>Step 1. Please Scan the public key</h2>
//           <p>Public Key: {publicKey}</p>
//           {
//             startScanStep1 ? 
//             <div style={{ width: 500 }}>
//               <QrReader
//                 delay={1000}
//                 onError={handleError}
//                 onScan={(data)=>{
//                   if(data){
//                     setPublicKey(data)
//                     setStartScanStep1(false)
//                     setStep(2)
//                   }
//                 }}
//               />
//             </div>
//             :
//             <button onClick={()=>{
//               setPublicKey("")
//               setStartScanStep1(true)
//             }}>Start Scan key</button>
//           }
  
//         </div>
//       }
//       {
//         step >= 2 &&
//         <div>
//           <h2>Step 2. Please Scan the Encrypted Ballot</h2>
//           <p>Encrypted Ballot: {encryptedBallot}</p>
//           {
//             startScanStep2 ? 
//             <div style={{ width: 500 }}>
//               <QrReader
//                 delay={1000}
//                 onError={handleError}
//                 onScan={(data)=>{
//                   if(data){
//                     setEncryptedBallot(data)
//                     setStartScanStep2(false)
//                     setStep(3)
//                   }
//                 }}
//               />
//             </div>
//             :
//             <button onClick={()=>{
//               setEncryptedBallot("")
//               setStartScanStep2(true)
//             }}>Start Scan Ballot</button>
//           }

//         </div>
//       }
//       {
//         step >= 3 &&
//         <div>
//           <h2>Step 3. Please Enter your option number</h2>
//           <input value={optionNumber} placeholder="option number" onChange={e=>setOptionNumber(e.currentTarget.value) }></input>
//           <button onClick={()=>verifyTicket()}>Verify Ballot</button>
//         </div>
//       }
//     </div>
//   )
// }

// export default VerifyVote
