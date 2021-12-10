#!/bin/bash

# local_test.sh
# Author: Earl John Abaquita
# Description: 
#		Automate creation of eosio local test network setup

GREEN='\033[0;32m'
END='\033[0m'

#
# Initialize wallet
#
rm -rf ~/eosio-wallet
cleos wallet create --file wallet.info

public_key2=$( cleos wallet create_key | awk '{print $10}' | sed 's/\"//g' )
public_key3=$( cleos wallet create_key | awk '{print $10}' | sed 's/\"//g' )
public_key_keanne=$( cleos wallet create_key | awk '{print $10}' | sed 's/\"//g' )



#
# Import EOSIO development key from site
#
echo -e "${GREEN}importing development key...${END}"
public_key=$(cleos wallet import --private-key 5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3 | awk '{print $5}')

echo -e "${GREEN}Confirming generated keys${END}"
cleos wallet keys

#
#  eosio.token smart contract setup
#  Start
echo -e "${GREEN}Creating eosio.token account${END}"
cleos create account eosio eosio.token ${public_key}

echo -e "${GREEN}pushing eosio.token contract to local network...${END}"
cleos set contract eosio.token eosio_token/
#
#  End

#  blubridge smart contract setup
#  Start
echo -e "${GREEN}creating master blubridge account...${END}"
cleos create account eosio blubridge ${public_key2}

echo -e "${GREEN}set contract blubridge${END}"
cleos set contract blubridge ../build/blubridge/ 

# Create admin account
public_key_admin1=$( cleos wallet create_key | awk '{print $10}' | sed 's/\"//g' )
cleos create account eosio admin1 ${public_key_admin1}

echo -e "${GREEN}Start creating adminperm permission for admin1 account${END}"
cleos set account permission admin1 adminperm  ${public_key_admin1} owner -p admin1@owner
cleos set action permission admin1 blubridge regchainid adminperm
cleos set action permission admin1 blubridge unregchainid adminperm
cleos set action permission admin1 blubridge pause adminperm
cleos set action permission admin1 blubridge unpause adminperm
cleos set action permission admin1 blubridge regsymbol adminperm
cleos set action permission admin1 blubridge unregsymbol adminperm
cleos set action permission admin1 blubridge setburnrate adminperm


echo -e "${GREEN}set eosio.code permission to account blubridge${END}"						 #Setting of additional permission to 
#TODO: removed add code permission
cleos set account permission blubridge active --add-code -p blubridge@active #blubridge account ( eosio.code )
#
#  End
#

#  Token creation
#
echo -e "${GREEN}creating initial supply of 20M BLU tokens${END}"
cleos push action eosio.token create '["eosio.token","20000000 BLU"]' -p eosio.token@active

echo -e "${GREEN}check if token is successfully created...${END}"
cleos get currency stats eosio.token BLU

echo -e "${GREEN}issue 1M BLU tokens to eosio.token${END}"
cleos push action eosio.token issue '["eosio.token","1000000 BLU", "initial balance transfer"]' -p eosio.token@active

echo -e "${GREEN}transfer initial amount of 1000000 to blubridge account${END}"
cleos push action eosio.token transfer '["eosio.token","blubridge", "100000 BLU", "Test transfer"]' -p eosio.token@active


cleos push action blubridge regchainid '["1234", "initial", "admin1"]' -p admin1@adminperm
cleos push action blubridge  regsymbol '["1 BLU", "admin1"]' -p admin1@adminperm 


#  blubridge inline transfer test 
#  Start
echo -e "${GREEN}create dummy transfer account${END}"
cleos create account eosio keanne ${public_key_keanne}

echo -e "${GREEN}transfer initial amount of 1000 to keanne account${END}"
cleos push action eosio.token transfer '["eosio.token","keanne", "1000 BLU", "Initial amount given to Keanne account"]' -p eosio.token@active

echo -e "${GREEN}Registering chain_id 1234...${END}"
cleos push action blubridge regchainid '["1234", "initial chain id", "admin1"]' -p admin1@adminperm

echo -e "${GREEN}Registering token symbol...${END}"
cleos push action blubridge regsymbol '["1 BLU", "initial register", "admin1"]' -p admin1@adminperm

echo -e "${GREEN}Test transfer from bluebridge to eosio.token${END}"
cleos push action blubridge send '["keanne","1 BLU", "1234", "1234"]' -p keanne@active
#
#  End


# Starting creation of oracle account
#
public_key_oracle=$( cleos wallet create_key | awk '{print $10}' | sed 's/\"//g' )
cleos create account eosio oracle1 ${public_key_oracle}

echo -e "${GREEN}Start creating oralceperm permission for oracle1 account${END}"
cleos set account permission oracle1 oracleperm  ${public_key_oracle} owner -p oracle1@owner
cleos set action permission oracle1 blubridge sign oracleperm

public_key_oracle2=$( cleos wallet create_key | awk '{print $10}' | sed 's/\"//g' )
cleos create account eosio oracle2 ${public_key_oracle2}

echo -e "${GREEN}Start creating oralceperm permission for oracle2 account${END}"
cleos set account permission oracle2 oracleperm  ${public_key_oracle2} owner -p oracle2@owner
cleos set action permission oracle2 blubridge sign oracleperm

# Sign transaction using oracle
cleos push action blubridge sign '["oracle1", "1", "0xc5deb96bb278a02e8d374649e4a4ef661c77c65abeaa484510c4c3a29b8360e0232a0e869191a77766b0473eb28029d63ae7bd20fd820efa9c2c892b0d1cfb661b"]' -p oracle1@oracleperm
cleos push action blubridge sign '["oracle2", "1", "0xc5deb96bb278a02e8d374649e4a4ef661c77c65abeaa484510c4c3a29b8360e0232a0e869191a77766b0473eb28029d63ae7bd20fd820efa9c2c892b0d1cfb661b"]' -p oracle2@oracleperm


# Get Balance of account
#
cleos get currency balance eosio.token eosio.token BLU
cleos get currency balance eosio.token blubridge BLU

