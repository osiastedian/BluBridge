import {
    ActionTraceData, createDfuseClient, DfuseClient, InboundMessage, InboundMessageType, waitFor
} from '@dfuse/client';

export class DfuseService {
  client: DfuseClient;

  constructor() {
    if (typeof window !== 'undefined' && window.fetch && window.WebSocket) {
      this.client = createDfuseClient({
        apiKey: process.env.DFUSE_API_KEY,
        network: process.env.DFUSE_API_NETWORK,
      });
    }
  }

  async listenToLogsendTx(
    fromAddress: string,
    resolveCallback: (id: number) => any
  ) {
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

    this.client.graphql(
      streamTransfer,
      (message, stream) => {
        if (message.type === 'error') {
          console.error('An error occurred', message.errors, message.terminal);
          throw 'An error eccorded while listening to DFuse stream.';
        }

        if (message.type === 'data') {
          const rawData = message.data.searchTransactionsForward;
          const actions = rawData.trace.matchingActions;

          actions.forEach((action) => {
            const { id, from, quantity } = action.json;

            if (fromAddress === from) {
              resolveCallback(id);
            }
          });

          stream.mark({ cursor: rawData.cursor });
        }

        if (message.type === 'complete') {
          console.log('Stream completed');
        }
      },
      {
        variables: {
          query: `receiver:blubridgerv1 action:logsend`,
          limit: 10,
          irreversibleOnly: true,
        },
      }
    );
  }
}
