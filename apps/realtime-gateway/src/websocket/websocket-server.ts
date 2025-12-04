import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { Logger } from '@sentient/shared-logging';
import { WebSocketMessage } from '@sentient/shared-types';
import { v4 as uuid } from 'uuid';
import * as jwt from 'jsonwebtoken';

export interface JwtPayload {
  sub: string;
  email?: string;
  role?: string;
  clientId?: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedClient {
  ws: WebSocket;
  id: string;
  userId?: string;
  email?: string;
  role?: string;
  clientId?: string;
  authenticated: boolean;
  rooms: Set<string>;
}

export class SentientWebSocketServer {
  private wss: WebSocketServer;
  private clients: Map<string, AuthenticatedClient> = new Map();
  private jwtSecret: string;
  private requireAuth: boolean;

  constructor(
    port: number,
    private readonly logger: Logger,
    options?: { jwtSecret?: string; requireAuth?: boolean }
  ) {
    this.jwtSecret = options?.jwtSecret || process.env.JWT_SECRET || '';
    this.requireAuth = options?.requireAuth ?? (process.env.NODE_ENV === 'production');

    if (this.requireAuth && !this.jwtSecret) {
      this.logger.error('JWT_SECRET is required in production mode');
      throw new Error('JWT_SECRET must be configured for WebSocket authentication');
    }

    if (!this.requireAuth) {
      this.logger.warn('WebSocket authentication is disabled (development mode)');
    }

    this.wss = new WebSocketServer({ port });

    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      this.handleConnection(ws, req);
    });

    this.wss.on('error', (error) => {
      this.logger.error('WebSocket server error', error);
    });

    this.logger.info('WebSocket server started', { port, auth_required: this.requireAuth });
  }

  private extractToken(req: IncomingMessage): string | null {
    // Try URL query parameter first: ws://host:port?token=xxx
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const queryToken = url.searchParams.get('token');
    if (queryToken) return queryToken;

    // Try Authorization header: Bearer xxx
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    // Try Sec-WebSocket-Protocol header (fallback for browsers)
    const protocol = req.headers['sec-websocket-protocol'];
    if (protocol && typeof protocol === 'string') {
      const parts = protocol.split(', ');
      const tokenPart = parts.find(p => p.startsWith('token-'));
      if (tokenPart) {
        return tokenPart.slice(6); // Remove 'token-' prefix
      }
    }

    return null;
  }

  private verifyToken(token: string): JwtPayload | null {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as JwtPayload;
      return decoded;
    } catch (error) {
      this.logger.debug('JWT verification failed', { error: (error as Error).message });
      return null;
    }
  }

  private handleConnection(ws: WebSocket, req: IncomingMessage): void {
    const clientId = uuid();

    // Extract and verify token
    const token = this.extractToken(req);
    let payload: JwtPayload | null = null;
    let authenticated = false;

    if (token && this.jwtSecret) {
      payload = this.verifyToken(token);
      authenticated = payload !== null;
    }

    // In production, log unauthenticated connections but still allow them
    // Kiosk pages need real-time updates but don't have user auth
    // They can receive broadcasts but cannot subscribe to rooms or perform actions
    if (this.requireAuth && !authenticated) {
      this.logger.info('Anonymous WebSocket connection allowed (kiosk mode)', {
        client_id: clientId,
        ip: req.socket.remoteAddress
      });
    }

    const client: AuthenticatedClient = {
      ws,
      id: clientId,
      userId: payload?.sub,
      email: payload?.email,
      role: payload?.role,
      clientId: payload?.clientId,
      authenticated,
      rooms: new Set(),
    };

    this.clients.set(clientId, client);
    this.logger.info('Client connected', {
      client_id: clientId,
      authenticated,
      user_id: payload?.sub,
      role: payload?.role
    });

    // Send connection acknowledgement
    this.sendMessage(client, {
      type: 'connection',
      status: 'connected',
      client_id: clientId,
      authenticated,
    });

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

  private sendMessage(client: AuthenticatedClient, message: Record<string, unknown>): void {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
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
