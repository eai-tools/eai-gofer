// .specify/ipc/status.json
export interface IPCStatus {
  timestamp: number;
  state: 'idle' | 'awaiting_input' | 'processing' | 'error';
  last_output: string;
  pending_input?: string;
  error_message?: string;
}
