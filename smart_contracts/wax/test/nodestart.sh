#!/bin/bash

nodeos -e -p eosio \
	--plugin eosio::producer_plugin \
	--plugin eosio::producer_api_plugin \
	--plugin eosio::chain_api_plugin \
	--plugin eosio::http_plugin \
	--plugin eosio::history_plugin \
	--plugin eosio::history_api_plugin \
	--filter-on="*" \
	--delete-all-blocks \
	--delete-state-history \
	--hard-replay \
	--access-control-allow-origin='*' \
	--contracts-console \
	--http-validate-host=false \
	--verbose-http-errors >> nodeos.log 2>&1 &
