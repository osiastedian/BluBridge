# Blubridge Wax Smart Contract

## EOS Development Key
[5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3](https://developers.eos.io/welcome/latest/getting-started-guide/local-development-environment/development-wallet)

## EOS Testnet send action contract sample
``` json
{
    "from" : "hbjsvradtjao",
    "quantity" : "0002.0000 TNT",
    "chain_id" : 1,
    "eth_address" : "038f4b0fc8ff18a4f0842a8f0564611f6e96e8535901dd45e43ac8691a1c4dca"
}
```
### Review1
send parameter change checksum256 to string


cleos -u https://api.testnet.eos.io set account permission bvctvozrlgrg active --add-code -p bvctvozrlgrg@active

