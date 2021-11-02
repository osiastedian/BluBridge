#include <blubridge.hpp>
#include "eosio.token/eosio.token.hpp"

using namespace blu;
using namespace eosio;

blubridge::blubridge( eosio::name s, 
		eosio::name code, datastream<const char *> ds) : contract(s, code, ds),
		oracles_(get_self(), get_self().value),
		receipts_(get_self(), get_self().value),
		bludata_(get_self(), get_self().value)
{}


void blubridge::send( eosio::name from, eosio::asset quantity, uint8_t chain_id, eosio::checksum256 eth_address) {
    require_auth(from);

    check(quantity.is_valid(), "Amount is not valid");
    check(quantity.amount > 0, "Amount cannot be negative");
    check(quantity.symbol.is_valid(), "Invalid symbol name");


	print("starting transfer to external contract");
	//Modification, transfer token to self
	//Test call inline function to eosio.token contract
	token::transfer_action instance( "eosio.token"_n, { "eosio.token"_n, "active"_n});

	//send() command links to external contract
	instance.send( get_self(), "eosio.token"_n, quantity, "Amount transferred to self" );
	print("external contract transfer completed");

    uint64_t next_send_id = bludata_.available_primary_key();
    uint32_t now = current_time_point().sec_since_epoch();
	print(" send emplace");
    bludata_.emplace(from, [&](auto &t){
        t.id = next_send_id;
        t.time = now;
        t.account = from;
        t.quantity = quantity;
        t.chain_id = chain_id;
        t.to_address = eth_address;
        t.claimed = false;
    });

	print(" send function end");

#if 0
    action(
        permission_level{get_self(), "active"_n},
        get_self(), "logteleport"_n,
        make_tuple(next_send_id, now, from, quantity, chain_id, eth_address)
    ).send();
#endif

}

void blubridge::sign( eosio::name oracle_name, uint64_t id, std::string signature ) {
	// Signs receipt of tokens, these signatures must be passed to the eth blockchain
	// in the claim function on the eth contract
	require_oracle(oracle_name);

	auto blu = bludata_.find(id);
	check(blu != bludata_.end(), "Send item not found");

	auto find_res = std::find(blu->oracles.begin(), blu->oracles.end(), oracle_name);
	check(find_res == blu->oracles.end(), "Oracle has already signed");

	bludata_.modify(*blu, get_self(), [&](auto &t){
		t.oracles.push_back(oracle_name);
		t.signatures.push_back(signature);
	});
}

/* Private */
void blubridge::require_oracle( eosio::name account) {
    require_auth(account);
    oracles_.get(account.value, "Account is not an oracle");
}

void blubridge::regoracle( eosio::name oracle_name ){

    require_auth(get_self());

    check( is_account(oracle_name), "Oracle account does not exist");

    oracles_.emplace(get_self(), [&](auto &o){
        o.account = oracle_name;
    });
}

void blubridge::unregoracle( eosio::name oracle_name ){

    require_auth(get_self());

    auto oracle = oracles_.find(oracle_name.value);
    check(oracle != oracles_.end(), "Oracle does not exist");

    oracles_.erase(oracle);
}

void blubridge::add_contract_balance( const name& owner, const asset& value ) {
   accounts contract_acnt( get_self(), owner.value );

   const auto& from = contract_acnt.get( value.symbol.code().raw(), "no balance object found" );
   check( from.balance.amount >= value.amount, "overdrawn balance" );

   contract_acnt.modify( from, owner,  [&]( auto& a ) {
         a.balance += value;
      });
}

void blubridge::transfer( const asset& quantity, const string& memo )
{
    auto sym = quantity.symbol;
    check( sym.is_valid(), "invalid symbol name" );
    check( memo.size() <= 256, "memo has more than 256 bytes" );

    stats statstable( get_self(), sym.code().raw() );
    auto existing = statstable.find( sym.code().raw() );
    check( existing != statstable.end(), "token with symbol does not exist" );
    const auto& st = *existing;

    require_auth( st.issuer );
    check( quantity.is_valid(), "invalid quantity" );
    check( quantity.amount > 0, "must retire positive quantity" );

	print(quantity.symbol, " ", st.supply.symbol);

    check( quantity.symbol == st.supply.symbol, "symbol precision mismatch" );

    statstable.modify( st, same_payer, [&]( auto& s ) {
       s.supply -= quantity;
    });

	print("Transfer completed");
}
