import React, { Component } from 'react'
// import QrReader from 'react-qr-reader'

const VerifyVote = () =>{
    const handleScan = (data: any) => {
        console.log("data", data)
      }
        const handleError = (err:any) => {
            console.error(err)
        }
    return(
        <div>
            {/* <QrReader
                delay={1}
                style={{ width: '100%' }}
                onError={handleScan}
                onScan={handleError}
            /> */}
        </div>
    )
}

export default VerifyVote