#!/bin/bash

rm -rf ~/eosio-wallet
cleos wallet create --file wallet.info
cleos wallet create_key
cleos wallet create_key

echo "importing development key..."
public_key=$(cleos wallet import --private-key 5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3 | awk '{print $5}')
cleos wallet keys

echo "creating master blubridge account"
cleos create account eosio blubridge ${public_key}
