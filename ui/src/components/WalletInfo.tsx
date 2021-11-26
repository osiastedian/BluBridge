import { SupportedBlockchain } from '../types/supported-blockchain';
import PolygonConnector from './polygon.connector';
import WaxConnector from './wax.connector';

interface WalletProps {
  label: string;
  chain: SupportedBlockchain;
}

const WalletInfo: React.FC<WalletProps> = ({ label, chain }) => {
  let connector = null;

  if (chain === 'wax') {
    connector = <WaxConnector />;
  } else if (chain === 'polygon') {
    connector = <PolygonConnector />;
  }

  return (
    <div className="w-100">
      <span className="font-size-12px font-weight-bold text-primary">
        {label}
      </span>
      <div className="border rounded-8 w-100 p-4 mt-2">{connector}</div>
    </div>
  );
};

export default WalletInfo;
