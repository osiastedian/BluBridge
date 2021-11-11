#include <eosio/eosio.hpp>
#include <eosio/asset.hpp>
#include <eosio/transaction.hpp>
#include <vector>

using namespace eosio;
using namespace std;

namespace eosiosystem {
   class system_contract;
}

namespace blu{

class [[eosio::contract("blubridge")]] blubridge : public eosio::contract {
	private:

		/* Represents transfer in progress */
		struct [[eosio::table("transferdata")]] blu_item {
			uint64_t				id;
			uint32_t				time;
			eosio::name			    account;
			eosio::asset			quantity;
			int8_t					chain_id;
			eosio::checksum256		to_address;
			std::vector<eosio::name>	oracles;
			std::vector<std::string>	signatures;
			bool					claimed;

			uint64_t primary_key() const { return id; }
		};
		typedef eosio::multi_index<"transferdata"_n, blu_item> transfer_table;

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

		oracles_table     oracles_;
		receipts_table    receipts_;
		transfer_table		  transferdata_;;

		void require_oracle( eosio::name account );

	public:
		using contract::contract;

		// Constructor declaration
		blubridge(name s, name code, datastream<const char *> ds);

		// Registering Oracle
		[[eosio::action]] void regoracle( eosio::name oracle );
		[[eosio::action]] void unregoracle( eosio::name oracle );

		[[eosio::action]] void send( eosio::name from, eosio::asset quantity, uint8_t chain_id, eosio::checksum256 eth_address);
		[[eosio::action]] void sign(eosio::name oracle_name, uint64_t id, std::string signature);
		[[eosio::action]] void logsend(uint64_t id, uint32_t timestamp, name from, asset quantity, uint8_t chain_id, checksum256 to_address);
		[[eosio::action]] void received(name oracle_name, uint64_t id, checksum256 to_eth, asset quantity);

		 using regoracle_action = eosio::action_wrapper<"regoracle"_n, &blubridge::regoracle>;
		 using unregoracle_action = eosio::action_wrapper<"unregoracle"_n, &blubridge::unregoracle>;
		 using send_action = eosio::action_wrapper<"send"_n, &blubridge::send>;
		 using sign_action = eosio::action_wrapper<"sign"_n, &blubridge::sign>;


		//Debug functions
		[[eosio::action]] void dsearchid( uint64_t id );
		[[eosio::action]] void dsearchoracle( eosio::name name );
		[[eosio::action]] void dsearchname( eosio::name name );

		 //Debug functions
		 using dsearchid_action = eosio::action_wrapper<"dsearchid"_n, &blubridge::dsearchid>;
		 using dsearchoracle_action = eosio::action_wrapper<"dsearchoracle"_n, &blubridge::dsearchoracle>;
		 using dsearchname_action = eosio::action_wrapper<"dsearchname"_n, &blubridge::dsearchname>;

};

}
