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
    propertyOne: 7,
    propertyTwo: web3.utils
      .toBN(web3.utils.toWei(`0.0001`, 'ether'))
      .toString(),
    propertyThree: 1,
    propertyFour: '0xC421EBFb54EBFAdeF705B4b79a818A61aC3fEbb0',
    propertyFive: '0xa46F48A39d8E62B9705c24bD9ba08b06Ab00676B',
  }
);

const signatures = [
  '0x7a7edf0604a200ddaee95bf9faff01857cf35f6b6c290d5954e65fc43d43bae0131cc9624bbf58ec80956a2f55fb23c18e5283c1058747f1e9064003790550c91c',
  '0x30f119c4910b1e87bcd972144581ae033a1e8d6e26346805742c25f58e9f04223dfa52b70d03e9c6e3b3a9137ff0a35b4e8cb198153d91af037be6cb8c841b121b',
  '0xcd895f6eadf2ab5811cb9a4494ef92cc4e6d09a54f88d1eba708c23f933ca20956b22e61d0b4feef747a8f5af71a8d852928a8883c6147e8d2dc567f8d57ee671c',
  '0xb8878a21fb7eef0ccbdefa8f9be72a82d96f4216a4e38c88518187e1e8ca698e5efdfaee7e355c44bf56155b665e53bc5e76c6533d4c9d4b72045dcf19f92a4a1c',
];

// console.log({ encoded, signatures: JSON.stringify(signatures) });
const hexResult = web3.utils.hexToAscii(
  '0x61747971786d737a766e736b0000000000000000000000000000000000000000'
);
console.log({ hexResult });
console.log({
  hexResult,
  result: hexResult
    .split('')
    .filter((a) => a !== '\x00')
    .join(''),
});
