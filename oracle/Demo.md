# BluBridge Flow

## Wax to Polygon

### Pre-requisite:
1. Front End Wallets are Connected
2. Smart Contract Permissions are already set.
3. Oracles Up and Running with correct private keys


### Demo
1. User initiates `send` action on Wax
2. Wax Contract emits `logsend` action notifying oracles successful send.
3. Oracle (Wax) construct structured and typed data regarding the following:
    - `id`
    - `quantity`
    - `toAddress`
    - `chainId`
4. Oracle creates a `signature` for this data and registers it to Wax contract using the `sign` action.
5. User will copy the signatures and the structured data and `claim` it on Polygon Smart Contract together with the following:
    - `tokenAddress` - BluDacToken Polygon contract address
    - `data` - encoded version of the structured data from #3
    - `signatures` - registered signatures on Wax
> (This will be done on the Front End automatically)
6. Polygon Smart Contract will emit an event `Claimed`
7. Once Oracle (Polygon) receives `Claimed` event, it dispatches a `claimed` action to Wax Contract verifying the transfer has completed