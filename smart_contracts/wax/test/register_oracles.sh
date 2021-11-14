#!/bin/bash

# Starting creation of oracle account
#
public_key_oracle=$( cleos wallet create_key | awk '{print $10}' | sed 's/\"//g' )
cleos create account eosio oracle1 ${public_key_oracle}

echo -e "${GREEN}Start registering oracle account into smart contract${END}"
cleos push action blubridge regoracle '["oracle1"]' -p blubridge@active

public_key_oracle2=$( cleos wallet create_key | awk '{print $10}' | sed 's/\"//g' )
cleos create account eosio oracle2 ${public_key_oracle2}

echo -e "${GREEN}Start registering oracle account into smart contract${END}"
cleos push action blubridge regoracle '["oracle2"]' -p blubridge@active

public_key_oracle3=$( cleos wallet create_key | awk '{print $10}' | sed 's/\"//g' )
cleos create account eosio oracle3 ${public_key_oracle2}

echo -e "${GREEN}Start registering oracle account into smart contract${END}"
cleos push action blubridge regoracle '["oracle3"]' -p blubridge@active

# Sign transaction using oracle
cleos push action blubridge sign '["oracle1", "1", "0xc5deb96bb278a02e8d374649e4a4ef661c77c65abeaa484510c4c3a29b8360e0232a0e869191a77766b0473eb28029d63ae7bd20fd820efa9c2c892b0d1cfb661b"]' -p oracle1@active
cleos push action blubridge sign '["oracle2", "1", "0xc5deb96bb278a02e8d374649e4a4ef661c77c65abeaa484510c4c3a29b8360e0232a0e869191a77766b0473eb28029d63ae7bd20fd820efa9c2c892b0d1cfb661b"]' -p oracle2@active
cleos push action blubridge sign '["oracle3", "1", "0xc5deb96bb278a02e8d374649e4a4ef661c77c65abeaa484510c4c3a29b8360e0232a0e869191a77766b0473eb28029d63ae7bd20fd820efa9c2c892b0d1cfb661b"]' -p oracle3@active


# Display table for oracles and signature
#
cleos get table blubridge blubridge transferdata
