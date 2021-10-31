project(blubridge)

set(EOSIO_WASM_OLD_BEHAVIOR "Off")
find_package(eosio.cdt)

add_contract( blubridge blubridge blubridge.cpp )
target_include_directories( blubridge PUBLIC ${CMAKE_SOURCE_DIR}/../include )
target_ricardian_directory( blubridge ${CMAKE_SOURCE_DIR}/../ricardian )
