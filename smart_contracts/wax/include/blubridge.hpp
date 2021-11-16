#include <eosio/eosio.hpp>
#include <eosio/asset.hpp>
#include <eosio/system.hpp>
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

		static constexpr uint64_t admin_role  = 1;
		static constexpr uint8_t ORACLE_CONFIRMATIONS = 2;
		static constexpr uint8_t CONTRACT_CHAIN_ID = 1;

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


		/* External Smart contract notification receipt */
		struct [[eosio::table("receipts")]] receipt_item {
			eosio::name			    from_account;
			eosio::asset			quantity;
			std::string				memo;

			uint64_t primary_key() const { return from_account.value; }
		};
		typedef eosio::multi_index<"receipts"_n, receipt_item> receipts_table;

		oracles_table     oracles_;
		receipts_table    receipts_;
		transfer_table	  transferdata_;;

		void require_oracle( eosio::name account );

		eosio::name admin_account_;

		/* Chain ID Registration */
		struct [[eosio::table("idchain")]] chain_item {
			uint64_t  chain_id;
			std::string  description;

			uint64_t primary_key() const { return chain_id; }
		};
		typedef eosio::multi_index<"idchain"_n, chain_item> chain_table;
		chain_table     chains_;

		/* Symbols Registration */
		struct [[eosio::table("symbols")]]sym_item {
			eosio::symbol  symbol;
			eosio::name  contract;

			uint64_t primary_key() const { return symbol.raw(); }
		};
		typedef eosio::multi_index<"symbols"_n, sym_item> symbol_table;
		symbol_table symbolss_;

		/* Account Role Registration */
		struct [[eosio::table("accountroles")]]role_item {
			eosio::name  account;
			uint64_t  role;

			uint64_t primary_key() const { return account.value; }
		};
		typedef eosio::multi_index<"accountroles"_n, role_item> role_table;
		role_table roles_;


		/* Received table */
		struct [[eosio::table("receivedata")]] receive_item {
			uint64_t				id;
			eosio::name				to_account;
			eosio::asset			quantity;
			int8_t					chain_id;
			std::vector<eosio::name>	oracles;
			bool					claimed;

			uint64_t primary_key() const { return id; }
		};
		typedef eosio::multi_index<"receivedata"_n, receive_item> receive_table;
		receive_table receive_;

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
		[[eosio::action]] void claimed(name oracle_name, uint64_t id, checksum256 to_eth, asset quantity);

		[[eosio::action]] void grantrole(name account, uint8_t roles);

		[[eosio::action]] void regchainid(uint8_t id, std::string memo);
		[[eosio::action]] void unregchainid(uint8_t id);

		[[eosio::action]] void regsymbol(eosio::asset quantity, eosio::name contract);
		[[eosio::action]] void unregsymbol(eosio::asset quantity);

		[[eosio::action]] void received( uint64_t id, name to_account, uint8_t chain_id,  asset quantity, name oracle_name);
		[[eosio::action]] void claim( name from, uint64_t id );

		[[eosio::action]] void withdraw( eosio::name from );
		

		// Notification function
		[[eosio::on_notify("eosio.token::transfer")]]
		void on_token_transfer( eosio::name from, eosio::name to, eosio::asset quantity, std::string memo );

		 using regoracle_action = eosio::action_wrapper<"regoracle"_n, &blubridge::regoracle>;
		 using unregoracle_action = eosio::action_wrapper<"unregoracle"_n, &blubridge::unregoracle>;
		 using send_action = eosio::action_wrapper<"send"_n, &blubridge::send>;
		 using sign_action = eosio::action_wrapper<"sign"_n, &blubridge::sign>;
		 using claimed_action = eosio::action_wrapper<"claimed"_n, &blubridge::claimed>;
		 using regchainid_action = eosio::action_wrapper<"regchainid"_n, &blubridge::regchainid>;
		 using unregchainid_action = eosio::action_wrapper<"unregchainid"_n, &blubridge::unregchainid>;
		 using regsymbol_action = eosio::action_wrapper<"regsymbol"_n, &blubridge::regsymbol>;
		 using unregsymbol_action = eosio::action_wrapper<"unregsymbol"_n, &blubridge::unregsymbol>;
		 using received_action = eosio::action_wrapper<"received"_n, &blubridge::received>;
		 using claim_action = eosio::action_wrapper<"claim"_n, &blubridge::claim>;

};

}
