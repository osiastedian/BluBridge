#include <blubridge.hpp>

using namespace blu;
using namespace eosio;

blubridge::blubridge( eosio::name s, eosio::name code, datastream<const char *> ds) : 
	contract(s, code, ds),
	oracles_(get_self(), get_self().value),
	chains_(get_self(), get_self().value),
	symbols_(get_self(), get_self().value),
	balances_(get_self(), get_self().value),
	receive_(get_self(), get_self().value),
	transferdata_(get_self(), get_self().value)
{}

void blubridge::send( eosio::name from, eosio::asset quantity, uint8_t chain_id, eosio::checksum256 eth_address) {

    require_auth(from);

    check(quantity.is_valid(), "Amount is not valid");
    check(quantity.amount > 0, "Amount cannot be negative");
    check(quantity.symbol.is_valid(), "Invalid symbol name");

	//check if chain_id parameter is registered in table
	chains_.get(chain_id, "Chain ID is not yet registered. Denying transaction");

	//Check if symbol is already added in apporved symbols
	symbols_.get(quantity.symbol.raw(), "Symbol is not yet registered");

	// Start of cross check logic
    balances_.get(from.value, "No record found. Transfer to this account first using bludactoken::transfer ");
    auto item = balances_.find( from.value );
	check( quantity <= item->quantity , "Not enough tokens to transfer" );
	// End of cross check logic

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

    action(
        permission_level{get_self(), "active"_n},
        get_self(), "logsend"_n,
        make_tuple(transaction_id, now, from, quantity, chain_id, eth_address)
    ).send();

}

void blubridge::sign( eosio::name oracle_name, uint64_t id, std::string signature ) {

	require_oracle(oracle_name);

	auto blu = transferdata_.find(id);
	check(blu != transferdata_.end(), "Send item not found");

	auto find_res = std::find(blu->oracles.begin(), blu->oracles.end(), oracle_name);

	check(find_res == blu->oracles.end(), "Oracle has already signed");

	transferdata_.modify(*blu, get_self(), [&](auto &t){
		t.oracles.push_back(oracle_name);
		t.signatures.push_back(signature);
	});
}


void blubridge::regoracle( eosio::name oracle_name ){
	
	require_auth( get_self() );
    check( is_account(oracle_name), "Oracle account does not exist");

    auto oracle = oracles_.find(oracle_name.value);
    check(oracle == oracles_.end(), "Oracle already added");
	

    oracles_.emplace(get_self(), [&](auto &o){
        o.account = oracle_name;
    });
}

void blubridge::unregoracle( eosio::name oracle_name ){

	require_auth( get_self() );

    auto oracle = oracles_.find(oracle_name.value);
    check(oracle != oracles_.end(), "Oracle does not exist");

    oracles_.erase(oracle);
}

void blubridge::logsend(uint64_t id, uint32_t timestamp, name from, asset quantity, uint8_t chain_id, checksum256 eth_address) {
    // Logs the send id for the oracle to listen to
    require_auth(get_self());

	auto item = balances_.find( from.value );

	//Deduct send tokens from receipt table
	balances_.modify(*item, same_payer, [&](auto &t){
		t.quantity -= quantity;
	});
}

void blubridge::claimed(name oracle_name, uint64_t id, checksum256 to_eth, asset quantity) {
    require_oracle(oracle_name);

    auto item = transferdata_.find(id);
    check(item != transferdata_.end(), "Data is not found");

    check(item->quantity == quantity, "Quantity mismatch");
    check(item->to_address == to_eth, "Account mismatch");
    check(!item->claimed, "Already marked as claimed");
	
	transferdata_.modify(*item, same_payer, [&](auto &t){
		t.claimed = true;
	});
}

void blubridge::regchainid( uint8_t chain_id, std::string memo ){
	
	require_auth( get_self() );

    auto chain = chains_.find( chain_id );
    check(chain == chains_.end(), "Chain ID is already added");

    chains_.emplace(get_self(), [&](auto &c){
        c.chain_id = chain_id;
		c.description = memo; 
    });
}

void blubridge::unregchainid( uint8_t chain_id ){
	
	require_auth( get_self() );

    auto chain = chains_.find( chain_id );
    check(chain != chains_.end(), "Chain ID is not added");

    chains_.erase(chain);

}

void blubridge::regsymbol(eosio::asset quantity){
	
	require_auth( get_self() );
	auto sym = quantity.symbol;
    check(sym.is_valid(), "Invalid symbol name");

	auto item = symbols_.find( sym.raw() );
	check( item == symbols_.end(), "Symbol is already registered" );

    symbols_.emplace(get_self(), [&](auto &c){
        c.symbol = sym;
    });
}

void blubridge::unregsymbol(eosio::asset quantity){
	
	require_auth( get_self() );
	auto sym = quantity.symbol;
    check(sym.is_valid(), "Invalid symbol name");

	auto item = symbols_.find( sym.raw() );
	check( item != symbols_.end(), "Symbol does not exist" );

    symbols_.erase( item );
}

void blubridge::received( uint64_t id, name to_account, uint8_t chain_id,  asset quantity, name oracle_name){

	require_auth( oracle_name );
    require_oracle( oracle_name );

    check(quantity.is_valid(), "Amount is not valid");
    check(quantity.amount > 0, "Amount cannot be negative");
    check(quantity.symbol.is_valid(), "Invalid symbol name");

	//check if chain_id parameter is registered in table
    check( chain_id == CONTRACT_CHAIN_ID, "Chain id is not correct");

	//Check if symbol is already added in apporved symbols
	symbols_.get(quantity.symbol.raw(), "Symbol is not yet registered");

    auto receive_item = receive_.find(id);
	if( receive_item == receive_.end() ){ // Item is not existing

		receive_.emplace( get_self(), [&](auto &t){
			t.id = id;
			t.to_account = to_account;
			t.quantity = quantity;
			t.chain_id = chain_id;
			t.oracles.push_back( oracle_name );
			t.claimed = false;
		});
	}else{
		//Additional checking if oracle already exist
		auto find_res = std::find(receive_item->oracles.begin(), receive_item->oracles.end(), oracle_name);
		check(find_res == receive_item->oracles.end(), "Oracle is already recorded");

		receive_.modify(*receive_item, same_payer, [&](auto &t){
			t.oracles.push_back( oracle_name );
		});
	}
}

void blubridge::claim( name from, uint64_t id ){

	require_auth( from );

    auto item = receive_.find(id);
    check(item != receive_.end(), "ID is not found");
	check(item->to_account == from, "User does not own transaction. Cannot claim");
	check(!item->claimed, "Already marked as claimed");

	auto oracle_count = item->oracles.size();
	print_f("oracle_count %" , oracle_count );
	check( oracle_count >= ORACLE_CONFIRMATIONS, "Not enough oracle signatures" );

	receive_.modify(*item, same_payer, [&](auto &t){
		t.claimed = true;
	});

	//Get structure individual item 
    auto receipt_item = balances_.find( from.value );

	// Account is already added, need to modify the quantity
	if( receipt_item != balances_.end() ){

		balances_.modify(*receipt_item, same_payer, [&](auto &t){
			t.quantity += item->quantity;
			t.memo = "Transferred from polygon";
		});

	} else{ // Account is not yet added treat as new item

		balances_.emplace( get_self(), [&](auto &r){
			r.from_account = item->to_account;
			r.quantity = item->quantity;
			r.memo = "Transferred from polygon";
		});

	}
}

void blubridge::withdraw( eosio::name from ) {

    require_auth(from);

	// Start of cross check logic
    balances_.get(from.value, "No record found.");
    auto item = balances_.find( from.value );
	check( item->quantity.amount > 0 , "Not enough balance to withdraw" );
	// End of cross check logic

	action(
		permission_level{ get_self(), "active"_n },
		tokencontract, "transfer"_n,
		std::make_tuple( get_self(), from, item->quantity, string("Blubridge withdraw"))
	).send();

	//Deduct send tokens from receipt table
	balances_.modify(*item, same_payer, [&](auto &t){
		t.quantity -= item->quantity;
	});
}

void blubridge::on_token_transfer( eosio::name from, eosio::name to, eosio::asset quantity, std::string memo ){


	if( to != get_self() ) return;

	//Get structure individual item 
    auto item = balances_.find( from.value );

	//Check if symbol is already added in apporved symbols
	symbols_.get(quantity.symbol.raw(), "Symbol is not yet registered");

	// Account is already added, need to modify the quantity
	if( item != balances_.end() ){

		balances_.modify(*item, same_payer, [&](auto &t){
			t.quantity += quantity;
		});

	} else{ // Account is not yet added treat as new item

		balances_.emplace( get_self(), [&](auto &r){
			r.from_account = from;
			r.quantity = quantity;
			r.memo = memo;
		});
	}
}

/* 
 * Private helper function
 */
void blubridge::require_oracle( eosio::name account) {
    require_auth(account);
    oracles_.get(account.value, "Account is not an oracle");
}
