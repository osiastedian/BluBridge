#include <eosio/eosio.hpp>
#include <eosio/asset.hpp>
#include <eosio/transaction.hpp>
#include <vector>

using namespace eosio;
using namespace std;

namespace blu{

class [[eosio::contract("blubridge")]] blubridge : public eosio::contract {
	private:

	/* Represents a user deposit before transporting */
	struct [[eosio::table("deposits")]] deposit_item {
		eosio::name  account;
		eosio::asset quantity;

		uint64_t primary_key() const { return account.value; }
	};
	typedef eosio::multi_index<"deposits"_n, deposit_item> deposits_table;

	/* Represents transfer in progress */
	struct [[eosio::table("blu")]] blu_item {
		uint64_t				id;
		uint32_t				time;
		eosio::name			    account;
		eosio::asset			quantity;
		int8_t					chain_id;
		eosio::checksum256		eth_address;
		std::vector<eosio::name>	oracles;
		std::vector<std::string>	signatures;
		bool					claimed;

		uint64_t primary_key() const { return id; }
		uint64_t by_account() const { return account.value; }
	};
	typedef eosio::multi_index<"blu"_n, blu_item,
	indexed_by<"byaccount"_n, const_mem_fun<blu_item, uint64_t, &blu_item::by_account>>> blu_table;

	/* Oracles authorised to send receipts */
	struct [[eosio::table("oracles")]] oracle_item {
		eosio::name  account;

		uint64_t primary_key() const { return account.value; }
	};
	typedef eosio::multi_index<"oracles"_n, oracle_item> oracles_table;


	/* Oracles authorised to send receipts */
	struct [[eosio::table("receipts")]] receipt_item {
		uint64_t				id;
		eosio::time_point_sec	date;
		eosio::checksum256		ref;
		eosio::name				to;
		uint8_t					chain_id;
		uint8_t					confirmations;
		eosio::asset			quantity;
		std::vector<eosio::name>   approvers;
		bool		            completed;

		uint64_t    primary_key() const { return id; }
		uint64_t    by_to() const { return to.value; }
		eosio::checksum256 by_ref() const { return ref; }
	};
	typedef eosio::multi_index<"receipts"_n, receipt_item,
	indexed_by<"byref"_n, const_mem_fun<receipt_item, checksum256, &receipt_item::by_ref>>,
	indexed_by<"byto"_n, const_mem_fun<receipt_item, uint64_t, &receipt_item::by_to>>
	> receipts_table;

	deposits_table    deposits_;
	oracles_table     oracles_;
	receipts_table    receipts_;
	blu_table		  bludata_;;

	void require_oracle( eosio::name account );

	public:
	using contract::contract;

	// Constructor declaration
	blubridge(name s, name code, datastream<const char *> ds);

	[[eosio::action]] void send( eosio::name from, eosio::asset quantity, uint8_t chain_id, eosio::checksum256 eth_address);
	[[eosio::action]] void sign(eosio::name oracle_name, uint64_t id, std::string signature);

};

}
