importWeb3from'web3';

const web3 = new Web3();

const encoded = web3.eth.abi.encodeParameter(
  {
    ParentStruct: {
      propertyOne: 'uint64',
      propertyTwo: 'uint256',
      propertyThree: 'uint8',
      propertyFour: 'address',
      propertyFive: 'address',
    },
  },
  {
    propertyOne: 41,
    propertyTwo: 400000000000000,
    propertyThree: 1,
    propertyFour: '0xC421EBFb54EBFAdeF705B4b79a818A61aC3fEbb0',
    propertyFive: '0xa46f48a39d8e62b9705c24bd9ba08b06ab00676b',
  }
);

console.log(encoded);


