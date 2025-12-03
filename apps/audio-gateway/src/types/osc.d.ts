declare module 'osc' {
  export interface Argument {
    type: 's' | 'i' | 'f' | 'b' | 'T' | 'F' | 'N' | 'I' | 't' | 'd' | 'S' | 'c' | 'r' | 'm' | 'h';
    value: string | number | boolean | Uint8Array;
  }

  export interface OscMessage {
    address: string;
    args?: Argument[];
  }

  export interface OscBundle {
    timeTag: { raw: [number, number] } | number;
    packets: (OscMessage | OscBundle)[];
  }

  export interface UDPPortOptions {
    localAddress?: string;
    localPort?: number;
    remoteAddress?: string;
    remotePort?: number;
    broadcast?: boolean;
    multicastTTL?: number;
    multicastMembership?: string[];
    metadata?: boolean;
  }

  export class UDPPort {
    constructor(options?: UDPPortOptions);
    open(): void;
    close(): void;
    send(packet: OscMessage | OscBundle, address?: string, port?: number): void;
    on(event: 'ready', callback: () => void): void;
    on(event: 'message', callback: (message: OscMessage, timeTag: any, info: any) => void): void;
    on(event: 'bundle', callback: (bundle: OscBundle, timeTag: any, info: any) => void): void;
    on(event: 'error', callback: (error: Error) => void): void;
    on(event: 'close', callback: () => void): void;
  }
}
