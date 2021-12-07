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
    propertyFour: "0xC421EBFb54EBFAdeF705B4b79a818A61aC3fEbb0",
    propertyFive: "0x6fed937bf288898daf76aca61a074e6613c6e48f",
  }
);

console.log(encoded);
