#!/bin/bash

rm -rf ~/eosio-wallet
cleos wallet create --file wallet.info

public_key2=$( cleos wallet create_key | awk '{print $10}' | sed 's/\"//g' )
public_key3=$( cleos wallet create_key | awk '{print $10}' | sed 's/\"//g' )

echo "importing development key..."
public_key=$(cleos wallet import --private-key 5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3 | awk '{print $5}')
cleos wallet keys

echo "creating eosio.token account..."
cleos create account eosio eosio.token ${public_key}

echo "pushing eosio.token contract to local network..."
cleos set contract eosio.token eosio_token/

echo "creating initial supply of 20M BLU tokens"
cleos push action eosio.token create '["eosio.token","20000000 BLU"]' -p eosio.token@active

echo "check if token is successfully created..."
cleos get currency stats eosio.token BLU

echo "creating master blubridge account..."
cleos create account eosio blubridge ${public_key2}

echo "set contract blubridge"
cleos set contract blubridge ../build/blubridge/ 

echo "issue 1000 BLU tokens to eosio.token"
cleos push action eosio.token issue '["eosio.token","1000 BLU", "initial balance transfer"]' -p eosio.token@active

echo "transfer initial amount of 100 to blubridge account"
cleos push action eosio.token transfer '["eosio.token","blubridge", "100 BLU", "Test transfer"]' -p eosio.token@active

