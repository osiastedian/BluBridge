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
    propertyOne: 1,
    propertyTwo: web3.utils
      .toBN(web3.utils.toWei(`3.0000`, 'ether'))
      .toString(),
    propertyThree: 2,
    propertyFour: '0xAd290B32ffB0886CCbF933A6307BF795A44C99e0',
    propertyFive: '0x50872f2db2a5d456e0c637bb7f5e188d55472a8c',
  }
);

const signatures = [
  '0x6cd73b7427072774d62e1c21217a91b72e13dca1c6e65ea793b3c12d95ec853b735f62224dc64f7066cd56a23597988c33ea792e59c16be466cc750aa7dbd8401c',
  '0x7894768b05fd866615eabe36e60100cbbfe19b22b56b537a4c9d571fc71bc5fd1f4d34dcd9156866be13ca83ab1263812a95ad6c1bcbdbab79bfa9c32fdd10a21c',
  '0xe30d1b2517610ec860d84ad12bb99fc8b95e05130bcbccf64f89fb3d56ea045817d43eb90a5a0ab9f09e6281f67567dd81a05a33caf838db319ec0cc05798a271b',
  '0xcb54d52cd2316549704b5b47a444aa2486461e15838e4e201fca7c37a9e7dd7b57615d1f3ee7e77947425ee35fa68d1c9041515eb1404375b65a62e20b19e9a81c',
];

console.log({ encoded, signatures: JSON.stringify(signatures) });
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
