import Web3 from 'web3';

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
    propertyOne: 23,
    propertyTwo: 500,
    propertyThree: 1,
    propertyFour: '0x6283A71E0067695FD8Fc3adF4256d65b4854F73F',
    propertyFive: '0x6fed937bf288898daf76aca61a074e6613c6e48f',
  }
);

console.log(encoded);
