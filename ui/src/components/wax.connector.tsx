import { useState } from 'react';
import { Image } from 'react-bootstrap';
import { useWax } from '../context/wax.context';

export default function WaxConnector() {
  const { accountName, login, isConnected } = useWax();
  const [error, setError] = useState<string>(undefined);

  const onLogin = async () => {
    try {
      setError(null);
      await login();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <>
      <div className="text-center w-100">
        <Image src="/wax-logo.svg" alt="" height="50" />
        <div className="mt-2 font-size-12px">Wax Cloud Wallet</div>
      </div>
      <div className="w-100">
        <button
          onClick={onLogin}
          className="w-100 bg-primary btn text-white rounded shadow mt-3 bg-primary"
        >
          {isConnected ? `Connected as ${accountName}` : 'Connect'}
        </button>
        {error && <span className="text-danger">{error}</span>}
      </div>
    </>
  );
}
