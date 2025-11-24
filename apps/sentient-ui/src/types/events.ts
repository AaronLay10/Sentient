export type DomainEvent = {
  event_id: string;
  type: string;
  room_id?: string;
  controller_id?: string;
  device_id?: string;
  payload: any;
  timestamp: string;
  metadata?: Record<string, any>;
}

export type WebSocketMessage = {
  type: 'event_notification' | 'connection_ack' | 'error';
  room_id?: string;
  data?: DomainEvent;
  timestamp: Date;
  message?: string;
}
