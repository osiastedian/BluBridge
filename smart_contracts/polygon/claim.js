const encoded = web3.eth.abi.encodeParameter(
  {
    ParentStruct: {
      propertyOne: "uint64",
      propertyTwo: "uint256",
      propertyThree: "uint8",
      propertyFour: "address",
      propertyFive: "address",
    },
  },
  {
    propertyOne: 21,
    propertyTwo: 500,
    propertyThree: 1,
    propertyFour: "0x6D0aeBE3D6df7FFBd06F6676eecf1Ab7a08895C5",
    propertyFive: "0x6fed937bf288898daf76aca61a074e6613c6e48f",
  }
);

console.log(encoded);
