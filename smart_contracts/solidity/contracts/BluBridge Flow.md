# Wax to Polygon
## Front End

1. Connect Wallets
- Wax (Wax Cloud & Anchor)
- Polygon (Metamask)
2. Trigger Smart Contract Transfer
```
const transferData = {
      from: wax.userAccount, // current user
      toAddress: string //  etherum address
      amount: number // 
      tokenName: string // blu
      chainId: number // 0-wax, 1 - polygon,
    };
const result = await wax.api.transact({
  actions: [{
    account: '<smart-contract-account>',
    name: 'send',
    authorization: [{
      actor: wax.userAccount, // current user
      permission: 'active', // 
    }],
    data: transferData,
  }]
}, {
  blocksBehind: 3,
  expireSeconds: 1200,
});
```
## Wax Smart Contract
1. Create `transfer` entry
2. Return transfer `id` 

### Front End
1. Show success UI
2. Tell user to wait


## Oracle Wax
1. Scan `transferTable`
2. Create ethSignature for each `transfer` on `transferTable`
3. Send ethSignature to contract `registerSignature()`
```
const result = await wax.api.transact({
  actions: [{
    account: '<smart-contract-account>',
    name: 'registerSignature',
    authorization: [{
      actor: wax.userAccount, // current user
      permission: 'active', // 
    }],
    data: {
      id: string // transferId,
      name: wax.userAccount, 
      signature: string or hex // eth signature
    },
  }]
}, {
  blocksBehind: 3,
  expireSeconds: 1200,
});
```

## Front End
1. Get eth contract `threshold`
```
const contract =  await web.eth.contract().at('<eth-contract-address')
const theshold = (await contract.threshold()).toNumber()
```
2. Query transfer by id
```
{
    id: string,
    amount: number,
    toAddress: string,
    chainId: number,
    signatures: string[],
    oracles: string[]
    tokenName: string
    fromAddress: string
}
```
3. Scans `signatures`
4. Check if length of `signatures` is bigger than `threshold`
5. Ask user to sign `claim` method.
```
const data = web.eth.utils.toHex(transferData)
contract.claim(data, transfer.signatures);
```
6. Wait for Transaction to be confirmed
7. Show Success message

## Oracle Eth
1. Listen for `Claim(id: string, toAddress: string, quantity: number)` event
2. Trigger `received` function on wax smart contract
```
const result = await wax.api.transact({
  actions: [{
    account: '<smart-contract-account>',
    name: 'received',
    authorization: [{
      actor: oracleName, // current user
      permission: 'active', // 
    }],
    data: {
      id: string // transferId,
      name: oracleName, 
      toAddress: string or hex // eth signature
      quantity
    },
  }]
}, {
  blocksBehind: 3,
  expireSeconds: 1200,
});
```

## Wax Smart Contract
1. Mark `transfer` as claimed