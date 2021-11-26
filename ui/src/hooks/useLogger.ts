import { useState } from 'react';

type LogType = 'success' | 'error' | 'loading';

export interface Log {
  message: string;
  type: LogType;
}

const useLogger = () => {
  const [logs, updateLogs] = useState<Log[]>([]);

  const clearLogs = () => {
    updateLogs([]);
  };

  const addLog = (message: string, type: LogType) => {
    updateLogs((currentLogs) => [...currentLogs, { message, type }]);
  };

  const addErrorLog = (message: string) => {
    console.error(message)
    addLog(message, 'error');
  };

  const addSuccessLog = (message: string) => {
    console.log(message)
    addLog(message, 'success');
  };
  const addLoadingLog = (message: string) => {
    console.warn(message)
    addLog(message, 'loading');
  };

  return {
    logs,
    addErrorLog,
    clearLogs,
    addSuccessLog,
    addLoadingLog,
  };
};

export default useLogger;
