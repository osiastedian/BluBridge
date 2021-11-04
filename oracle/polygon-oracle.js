import Dagger from "@maticnetwork/dagger";

// connect to correct dagger server, for receiving network specific events
//
// you can also use socket based connection
const dagger = new Dagger("mqtts://mainnet.dagger.matic.network");

// get new block as soon as it gets created
dagger.on("latest:block.number", (result) => {
  console.log(`New block created: ${result}`);
});
