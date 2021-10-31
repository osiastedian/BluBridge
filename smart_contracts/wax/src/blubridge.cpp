#include <blubridge.hpp>

using namespace blu;

blubridge::blubridge( eosio::name s, eosio::name code, datastream<const char *> ds) : contract(s, code, ds),
                                                                           deposits_(get_self(), get_self().value),
                                                                           oracles_(get_self(), get_self().value),
                                                                           receipts_(get_self(), get_self().value),
                                                                           bludata_(get_self(), get_self().value){}

void blubridge::send( eosio::name from, eosio::asset quantity, uint8_t chain_id, eosio::checksum256 eth_address) {
    require_auth(from);

    check(quantity.is_valid(), "Amount is not valid");
    check(quantity.amount > 0, "Amount cannot be negative");
    check(quantity.symbol.is_valid(), "Invalid symbol name");
    check(quantity.amount >= 100'0000, "Transfer is below minimum of 100 TLM");

    auto deposit = deposits_.find(from.value);
    check(deposit != deposits_.end(), "Deposit not found, please transfer the tokens first");
    check(deposit->quantity >= quantity, "Not enough deposited");

    // tokens owned by this contract are inaccessible so just remove the deposit record
    if (deposit->quantity == quantity){
        deposits_.erase(deposit);
    }
    else {
        deposits_.modify(*deposit, same_payer, [&](auto &d){
            d.quantity -= quantity;
        });
    }

    uint64_t next_send_id = bludata_.available_primary_key();
    uint32_t now = current_time_point().sec_since_epoch();
    bludata_.emplace(from, [&](auto &t){
        t.id = next_send_id;
        t.time = now;
        t.account = from;
        t.quantity = quantity;
        t.chain_id = chain_id;
        t.eth_address = eth_address;
        t.claimed = false;
    });

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
