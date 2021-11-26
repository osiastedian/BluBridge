import {
  createDfuseClient,
  DfuseClient,
  GraphqlStreamMessage,
  OnGraphqlStreamMessage,
  Stream,
} from '@dfuse/client';
import { createContext, useContext, useEffect, useState } from 'react';

interface DfuseContextProps {
  client: DfuseClient;
  listenToStreamTransfer: (
    fromAccount: string,
    action: string,
    onMessage: OnGraphqlStreamMessage
  ) => Promise<Stream>;
}

const DfuseContext = createContext<Partial<DfuseContextProps>>({});

export const useDfuse = () => useContext(DfuseContext);

const streamTransfer = `subscription ($query: String!, $cursor: String, $limit: Int64) {
    searchTransactionsForward(query: $query, limit: $limit, cursor: $cursor) {
      undo
      cursor
      trace {
        block {
          num
          id
          confirmed
          timestamp
          previous
        }
        id
        matchingActions {
          account
          name
          json
          seq
          receiver
        }
      }
    }
  }
  `;

const DfuseContextProvider: React.FC = ({ children }) => {
  const [client, setClient] = useState<DfuseClient>(null);

  const listenToStreamTransfer = (
    fromAccount: string,
    action: string,
    onMessage: OnGraphqlStreamMessage
  ): Promise<Stream> => {
    return client.graphql(streamTransfer, onMessage, {
      variables: {
        query: `receiver:${fromAccount} action:${action}`,
        limit: 10,
        irreversibleOnly: true,
      },
    });
  };

  useEffect(() => {
    window.addEventListener('load', () => {
      setClient(
        createDfuseClient({
          apiKey: process.env.DFUSE_API_KEY,
          network: process.env.DFUSE_API_NETWORK,
        })
      );
    });
  }, []);

  return (
    <DfuseContext.Provider
      value={{
        client,
        listenToStreamTransfer,
      }}
    >
      {children}
    </DfuseContext.Provider>
  );
};

export default DfuseContextProvider;
