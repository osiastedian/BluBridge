import { TransferDataRow } from '../shared/interfaces/wax-transfer-data';

export function truncateAddress(address: string) {
  return `${address.slice(0, 8)}...`;
}

export function addPrecision(num: number, precision: number): string {
  const isDecimal = num % 1 !== 0;
  let s = !isDecimal ? num + '.' : num + '';
  for (
    let decimalPlaces = s.split('.')[1].length;
    decimalPlaces < precision;
    decimalPlaces++
  ) {
    s = s + '0';
  }

  return s;
}

export function hexToPrependedZeros(hexAddress: string): string {
  return hexAddress.replace('0x', '000000000000000000000000');
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const checkSignatures = (tableRow: TransferDataRow, resolve: Function) => {
  if (tableRow !== null && tableRow.signatures.length === 4) {
    resolve(tableRow);
  } else {
    throw null;
  }
};

export const retryOperation = (
  operation: Function,
  delay: number,
  retries: number
) =>
  new Promise((resolve, reject) => {
    return operation()
      .then((tableRow: TransferDataRow) => {
        return checkSignatures(tableRow, resolve);
      })
      .catch((reason: any) => {
        if (retries > 0) {
          return wait(delay)
            .then(retryOperation.bind(null, operation, delay, retries - 1))
            .then(resolve)
            .catch(reject);
        }
        return reject(reason);
      });
  });
