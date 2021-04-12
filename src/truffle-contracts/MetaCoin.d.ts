/* Generated by ts-generator ver. 0.0.8 */
/* tslint:disable */

import BN from "bn.js";
import { EventData, PastEventOptions } from "web3-eth-contract";

export interface MetaCoinContract extends Truffle.Contract<MetaCoinInstance> {
  "new"(meta?: Truffle.TransactionDetails): Promise<MetaCoinInstance>;
}

export interface Transfer {
  name: "Transfer";
  args: {
    _from: string;
    _to: string;
    _value: BN;
    0: string;
    1: string;
    2: BN;
  };
}

type AllEvents = Transfer;

export interface MetaCoinInstance extends Truffle.ContractInstance {
  sendCoin: {
    (
      receiver: string,
      amount: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<Truffle.TransactionResponse<AllEvents>>;
    call(
      receiver: string,
      amount: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<boolean>;
    sendTransaction(
      receiver: string,
      amount: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<string>;
    estimateGas(
      receiver: string,
      amount: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<number>;
  };

  getBalanceInEth(
    addr: string,
    txDetails?: Truffle.TransactionDetails
  ): Promise<BN>;

  getBalance(addr: string, txDetails?: Truffle.TransactionDetails): Promise<BN>;

  methods: {
    sendCoin: {
      (
        receiver: string,
        amount: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<Truffle.TransactionResponse<AllEvents>>;
      call(
        receiver: string,
        amount: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<boolean>;
      sendTransaction(
        receiver: string,
        amount: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<string>;
      estimateGas(
        receiver: string,
        amount: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<number>;
    };

    getBalanceInEth(
      addr: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<BN>;

    getBalance(
      addr: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<BN>;
  };

  getPastEvents(event: string): Promise<EventData[]>;
  getPastEvents(
    event: string,
    options: PastEventOptions,
    callback: (error: Error, event: EventData) => void
  ): Promise<EventData[]>;
  getPastEvents(event: string, options: PastEventOptions): Promise<EventData[]>;
  getPastEvents(
    event: string,
    callback: (error: Error, event: EventData) => void
  ): Promise<EventData[]>;
}
