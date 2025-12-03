import * as osc from 'osc';
import { Logger } from '@sentient/shared-logging';

export interface OscClientConfig {
  remoteHost: string;
  remotePort: number;
  localPort?: number;
}

/**
 * OSC Client for communicating with SCS Audio Server over UDP.
 *
 * SCS Audio Server commands:
 * - Control: /ctrl/go, /ctrl/stopall, /ctrl/fadeall, /ctrl/pauseresumeall, etc.
 * - Cues: /cue/go, /cue/stop, /cue/pauseresume (with cue ID argument)
 * - Hotkeys: /hkey/go, /hkey/on, /hkey/off (with hotkey ID argument)
 * - Faders: /fader/setmaster, /fader/setdevice
 */
export class OscClient {
  private udpPort: osc.UDPPort | null = null;
  private isConnected = false;

  constructor(
    private readonly config: OscClientConfig,
    private readonly logger: Logger
  ) {}

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.udpPort = new osc.UDPPort({
          localAddress: '0.0.0.0',
          localPort: this.config.localPort || 0,
          remoteAddress: this.config.remoteHost,
          remotePort: this.config.remotePort,
          metadata: true,
        });

        this.udpPort.on('ready', () => {
          this.isConnected = true;
          this.logger.info('OSC client connected', {
            remote: `${this.config.remoteHost}:${this.config.remotePort}`,
          });
          resolve();
        });

        this.udpPort.on('error', (error: Error) => {
          this.logger.error('OSC client error', error);
          if (!this.isConnected) {
            reject(error);
          }
        });

        this.udpPort.open();
      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.udpPort) {
      this.udpPort.close();
      this.udpPort = null;
      this.isConnected = false;
      this.logger.info('OSC client disconnected');
    }
  }

  private send(address: string, args: osc.Argument[] = []): void {
    if (!this.udpPort || !this.isConnected) {
      this.logger.warn('OSC client not connected, dropping message', { address });
      return;
    }

    const message: osc.OscMessage = { address, args };

    this.logger.debug('Sending OSC message', { address, args });
    this.udpPort.send(message);
  }

  // ==================== Control Commands ====================

  /** Trigger 'Go' button - advances to next cue */
  go(): void {
    this.send('/ctrl/go');
  }

  /** Trigger 'Go' with confirmation */
  goConfirm(): void {
    this.send('/ctrl/goconfirm');
  }

  /** Stop all playing cues */
  stopAll(): void {
    this.send('/ctrl/stopall');
  }

  /** Fade out all playing cues */
  fadeAll(): void {
    this.send('/ctrl/fadeall');
  }

  /** Pause or resume all playing cues */
  pauseResumeAll(): void {
    this.send('/ctrl/pauseresumeall');
  }

  /** Go to top of cue list */
  goToTop(): void {
    this.send('/ctrl/gotop');
  }

  /** Go back one cue */
  goBack(): void {
    this.send('/ctrl/goback');
  }

  /** Go to next cue (without firing) */
  goToNext(): void {
    this.send('/ctrl/gotonext');
  }

  /** Go to end of cue list */
  goToEnd(): void {
    this.send('/ctrl/gotoend');
  }

  /** Go to specific cue (without firing) */
  goToCue(cueId: string): void {
    this.send('/ctrl/gotocue', [{ type: 's', value: cueId }]);
  }

  // ==================== Cue Commands ====================

  /** Play a specific cue */
  playCue(cueId: string): void {
    this.send('/cue/go', [{ type: 's', value: cueId }]);
    this.logger.info('Playing cue', { cue_id: cueId });
  }

  /** Stop a specific cue */
  stopCue(cueId: string): void {
    this.send('/cue/stop', [{ type: 's', value: cueId }]);
    this.logger.info('Stopping cue', { cue_id: cueId });
  }

  /** Pause or resume a specific cue */
  pauseResumeCue(cueId: string): void {
    this.send('/cue/pauseresume', [{ type: 's', value: cueId }]);
  }

  // ==================== Hotkey Commands ====================

  /** Trigger a hotkey (fire and forget) */
  playHotkey(hotkeyId: string): void {
    this.send('/hkey/go', [{ type: 's', value: hotkeyId }]);
    this.logger.info('Playing hotkey', { hotkey_id: hotkeyId });
  }

  /** Turn hotkey on (latching) */
  hotkeyOn(hotkeyId: string): void {
    this.send('/hkey/on', [{ type: 's', value: hotkeyId }]);
  }

  /** Turn hotkey off (latching) */
  hotkeyOff(hotkeyId: string): void {
    this.send('/hkey/off', [{ type: 's', value: hotkeyId }]);
  }

  // ==================== Fader Commands ====================

  /** Set master fader level (0.0 - 1.0) */
  setMasterFader(level: number): void {
    const clampedLevel = Math.max(0, Math.min(1, level));
    this.send('/fader/setmaster', [{ type: 'f', value: clampedLevel }]);
  }

  /** Set device fader level (0.0 - 1.0) */
  setDeviceFader(deviceId: string, level: number): void {
    const clampedLevel = Math.max(0, Math.min(1, level));
    this.send('/fader/setdevice', [
      { type: 's', value: deviceId },
      { type: 'f', value: clampedLevel },
    ]);
  }
}
