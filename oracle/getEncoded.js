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
    propertyOne: 3,
    propertyTwo: web3.utils
      .toBN(web3.utils.toWei(`5.0000`, 'ether'))
      .toString(),
    propertyThree: 2,
    propertyFour: '0xAd290B32ffB0886CCbF933A6307BF795A44C99e0',
    propertyFive: '0x50872f2db2a5d456e0c637bb7f5e188d55472a8c',
  }
);

const signatures = [
  '0x6a2cba98e5f66d9edd9dd1e4023cea335b86fb70dc3c71ae6ddb842a03e94122668812b42a5ac1ffa67701bce42914b7a8c871c3ea753721efff844e9750ff871b',
  '0x9571f2a07ba4a84ad6514bf934fb9990f9606505b951c593fe4551864991dcc95264dec26d46b5712ecd9a2c18a1009a0876b1d09d5f6b3c426482ee75c352141c',
  '0x4845ac1fa8339ee671f3d301229e2d23e5c61ebbba9fa53c48e40abd2666e81902c1922fdc2c700da3d82df62157a16f97efcb94b2ea536805756f4c4c1506251c',
  '0x1820a07883cf2e8caf830e58cd1a7d3b884ce1ac17830157c63bbef3d67efeda6e31f5eaa2a6cec15e7198ff29132dc1cc30486a2b8f0a1ebc042ad01d2de7bc1c',
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

console.log(web3.utils.toBN(web3.utils.toWei(`5.0000`, 'ether')).toString());
console.log(web3.utils.asciiToHex('l3vuw.wam').toString());
