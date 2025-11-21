export interface WebSocketMessage<T = any> {
  type: string;
  channel?: string;
  room_id?: string;
  session_id?: string;
  data: T;
  timestamp: Date;
}

export interface WSSubscribeMessage {
  action: 'subscribe';
  channels: string[];
}

export interface WSUnsubscribeMessage {
  action: 'unsubscribe';
  channels: string[];
}

export interface WSAuthMessage {
  action: 'auth';
  token: string;
}

export interface WSAckMessage {
  action: 'ack';
  message_id: string;
  success: boolean;
  error?: string;
}
