import { WebSocketServer, WebSocket } from 'ws';
import { Logger } from '@sentient/shared-logging';
import { WebSocketMessage } from '@sentient/shared-types';
import { v4 as uuid } from 'uuid';

export interface AuthenticatedClient {
  ws: WebSocket;
  id: string;
  userId?: string;
  rooms: Set<string>;
}

export class SentientWebSocketServer {
  private wss: WebSocketServer;
  private clients: Map<string, AuthenticatedClient> = new Map();

  constructor(
    port: number,
    private readonly logger: Logger
  ) {
    this.wss = new WebSocketServer({ port });

    this.wss.on('connection', (ws: WebSocket) => {
      this.handleConnection(ws);
    });

    this.wss.on('error', (error) => {
      this.logger.error('WebSocket server error', error);
    });

    this.logger.info('WebSocket server started', { port });
  }

  private handleConnection(ws: WebSocket): void {
    const clientId = uuid();
    const client: AuthenticatedClient = {
      ws,
      id: clientId,
      rooms: new Set(),
    };

    this.clients.set(clientId, client);
    this.logger.info('Client connected', { client_id: clientId });

    ws.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        await this.handleMessage(client, message);
      } catch (error) {
        this.logger.error('Failed to parse message', error as Error, { client_id: clientId });
      }
    });

    ws.on('close', () => {
      this.clients.delete(clientId);
      this.logger.info('Client disconnected', { client_id: clientId });
    });

    ws.on('error', (error) => {
      this.logger.error('Client error', error, { client_id: clientId });
    });
  }

  private async handleMessage(client: AuthenticatedClient, message: any): Promise<void> {
    this.logger.debug('Received message', {
      client_id: client.id,
      message_type: message.type,
    });

    // Handle subscription requests
    if (message.action === 'subscribe' && message.channels) {
      for (const channel of message.channels) {
        // Parse channel to extract room_id
        const roomId = this.extractRoomId(channel);
        if (roomId) {
          client.rooms.add(roomId);
          this.logger.debug('Client subscribed to room', {
            client_id: client.id,
            room_id: roomId,
          });
        }
      }

      this.sendAck(client, message.message_id || uuid(), true);
    }

    // Handle unsubscribe requests
    if (message.action === 'unsubscribe' && message.channels) {
      for (const channel of message.channels) {
        const roomId = this.extractRoomId(channel);
        if (roomId) {
          client.rooms.delete(roomId);
        }
      }

      this.sendAck(client, message.message_id || uuid(), true);
    }
  }

  broadcastToRoom(roomId: string, message: WebSocketMessage): void {
    let count = 0;

    for (const client of this.clients.values()) {
      if (client.rooms.has(roomId) && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(message));
        count++;
      }
    }

    this.logger.debug('Broadcast to room', { room_id: roomId, client_count: count });
  }

  broadcastToAll(message: WebSocketMessage): void {
    let count = 0;

    for (const client of this.clients.values()) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(message));
        count++;
      }
    }

    this.logger.debug('Broadcast to all', { client_count: count });
  }

  private sendAck(client: AuthenticatedClient, messageId: string, success: boolean, error?: string): void {
    const ack = {
      action: 'ack',
      message_id: messageId,
      success,
      error,
    };

    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(ack));
    }
  }

  private extractRoomId(channel: string): string | null {
    // Extract room_id from channel like "gm:room:room123"
    const match = channel.match(/room:([^:]+)/);
    return match ? match[1] : null;
  }

  getStats() {
    return {
      total_clients: this.clients.size,
      rooms: Array.from(new Set(
        Array.from(this.clients.values()).flatMap(c => Array.from(c.rooms))
      )),
    };
  }

  async close(): Promise<void> {
    this.wss.close();
    this.logger.info('WebSocket server closed');
  }
}
