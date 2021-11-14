#include <blubridge.hpp>
#include "eosio.token/eosio.token.hpp"

using namespace blu;
using namespace eosio;

blubridge::blubridge( eosio::name s, eosio::name code, datastream<const char *> ds) : 
	contract(s, code, ds),
	oracles_(get_self(), get_self().value),
	receipts_(get_self(), get_self().value),
	transferdata_(get_self(), get_self().value)
{}


void blubridge::send( eosio::name from, eosio::asset quantity, uint8_t chain_id, eosio::checksum256 eth_address) {
    require_auth(from);
	print("send log");

    check(quantity.is_valid(), "Amount is not valid");
    check(quantity.amount > 0, "Amount cannot be negative");
    check(quantity.symbol.is_valid(), "Invalid symbol name");

	print("starting transfer to external contract");
	//Modification, transfer token to self
	//Test call inline function to eosio.token contract
	// token::transfer_action transfer( "eosio.token"_n, { get_self(), "active"_n});
	// TODO: modify transfer command permission
	// ---- SET A Working ----
	token::transfer_action transfer( "eosio.token"_n, { get_self(), "active"_n});
	transfer.send( get_self(), from, quantity, "Amount transferred to self" );
	// ---- SET A Working ----

	// TODO: IDEAL not yet working
	// ---- SET B Working ----
	// token::transfer_action transfer( "eosio.token"_n, { from, "active"_n});
	// transfer.send( from, get_self(), quantity, "amount transfered from --> self" );
	// ---- SET B Working ----


	//	TODO: working
	// //send() command links to external contract
	// // transfer.send( get_self(), "eosio.token"_n, quantity, "Amount transferred to self" );
	// //TODO: modified send transfer command parameters
	// transfer.send( from, get_self(), quantity, "Amount transferred to self" ); //TODO: erorr on eosio.code authority for keanne to transfer to blubridge account
	print("external contract transfer completed");


    uint64_t transaction_id = transferdata_.available_primary_key();
	print_f("transaction_id[%]", transaction_id );
    uint32_t now = current_time_point().sec_since_epoch();
    transferdata_.emplace( get_self(), [&](auto &t){
        t.id = transaction_id;
        t.time = now;
        t.account = from;
        t.quantity = quantity;
        t.chain_id = chain_id;
        t.to_address = eth_address;
        t.claimed = false;
    });

	print(" send function end ");

    action(
        permission_level{get_self(), "active"_n},
        get_self(), "logsend"_n,
        make_tuple(transaction_id, now, from, quantity, chain_id, eth_address)
    ).send();

}

void blubridge::sign( eosio::name oracle_name, uint64_t id, std::string signature ) {
	// Signs receipt of tokens, these signatures must be passed to the eth blockchain
	// in the claim function on the eth contract
	require_oracle(oracle_name);

	auto blu = transferdata_.find(id);
	check(blu != transferdata_.end(), "Send item not found");

	auto find_res = std::find(blu->oracles.begin(), blu->oracles.end(), oracle_name);

	//TODO: add checking if valid signature
	//

	check(find_res == blu->oracles.end(), "Oracle has already signed");

	transferdata_.modify(*blu, get_self(), [&](auto &t){
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

void blubridge::logsend(uint64_t id, uint32_t timestamp, name from, asset quantity, uint8_t chain_id, checksum256 eth_address) {
    // Logs the send id for the oracle to listen to
    require_auth(get_self());
}

void blubridge::received(name oracle_name, uint64_t id, checksum256 to_eth, asset quantity) {
    require_oracle(oracle_name);

    auto item = transferdata_.find(id);
    check(item != transferdata_.end(), "Data is not found");

    check(item->quantity == quantity, "Quantity mismatch");
    check(item->to_address == to_eth, "Account mismatch");
    check(!item->claimed, "Already marked as claimed");

	auto oracle_count = item->oracles.size();
	check(oracle_count >= ORACLE_CONFIRMATIONS, "Not enough oracle signatures");

	print("starting transfer to external contract");
	token::transfer_action transfer( "eosio.token"_n, { get_self(), "active"_n});
	transfer.send( get_self(), item->account, quantity, "Amount successfully transferred" );
	
	transferdata_.modify(*item, same_payer, [&](auto &t){
		t.claimed = true;
	});


}
