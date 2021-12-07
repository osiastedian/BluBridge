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
    propertyOne: 4,
    propertyTwo: web3.utils
      .toBN(web3.utils.toWei(`5.0000`, 'ether'))
      .toString(),
    propertyThree: 3,
    propertyFour: '0xF6287d13de5c52cd320902C939C188217477F05b',
    propertyFive: '0x9F786f29c5a4D192D442fc9237E142cbD99B573e',
  }
);

const privateKeys = [
  '4ac2da080b6e6f793e83bf0f6a75bd7a21f7dc605b09f685b647ec51cdbbf285',
  '65ec1468b57345a16f3fa5e5c75ca64325acb65c332b7577ebd8e416c024435f',
  '4ce9d8a319b28d47c88afc740aa0ac08135b47f557d16dc3feb35828c107c57d',
  '58a7b95147d30d309ad62776c85dd89fa14fc416730bb2630bbfe18b35a47003',
];

const signatures = privateKeys.map(
  (privateKey) =>
    web3.eth.accounts.sign(web3.utils.sha3(encoded), privateKey).signature
);

console.log({ encoded, signatures: JSON.stringify(signatures).replaceAll('"', '') });
// const hexResult = web3.utils.hexToAscii(
//   '0x61747971786d737a766e736b0000000000000000000000000000000000000000'
// );
// console.log({ hexResult });
// console.log({
//   hexResult,
//   result: hexResult
//     .split('')
//     .filter((a) => a !== '\x00')
//     .join(''),
// });

console.log(web3.utils.toBN(web3.utils.toWei(`5.0000`, 'ether')).toString());
console.log(web3.utils.asciiToHex('l3vuw.wam').toString());
