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
    propertyFour: '0x6D0aeBE3D6df7FFBd06F6676eecf1Ab7a08895C5',
    propertyFive: '0xa46f48a39d8e62b9705c24bd9ba08b06ab00676b',
  }
);

console.log(encoded);


