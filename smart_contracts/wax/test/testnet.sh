#!/bin/bash

cleos -u https://api.testnet.eos.io set account permission bvctvozrlgrg active --add-code -p bvctvozrlgrg@active

cleos -u https://api.testnet.eos.io get table bvctvozrlgrg bvctvozrlgrg transferdata
cleos -u https://api.testnet.eos.io get table bvctvozrlgrg bvctvozrlgrg receipts

echo cleos -u https://api.testnet.eos.io get table bvctvozrlgrg bvctvozrlgrg transferdata | tail -n 12 | grep signatures -C 4 | tail -n 4 | sed 's/"//g'
