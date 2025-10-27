/**
 * WhatsApp Client Wrapper with Session Persistence
 * Task: T014
 *
 * Features:
 * - LocalAuth for session persistence
 * - Automatic reconnection handling
 * - QR code authentication flow
 * - Message sending with phone number formatting
 *
 * @see .specify/specs/003-orchestrator-agents/contracts/notification-api.md
 * @see .specify/specs/003-orchestrator-agents/research.md (R7)
 */

import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { logger } from './Logger.js';

/**
 * WhatsApp client wrapper with session persistence and reconnection
 */
export class WhatsAppClient {
  private client: Client;
  private isReady = false;

  constructor() {
    this.client = new Client({
      authStrategy: new LocalAuth({
        dataPath: '.specify/.whatsapp-session',
      }),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      },
    });

    this.setupEventHandlers();
  }

  /**
   * Initialize the WhatsApp client
   */
  async initialize(): Promise<void> {
    await this.client.initialize();
  }

  /**
   * Send a message to a phone number
   *
   * @param phoneNumber - Phone number in international format (e.g., +1234567890)
   * @param message - Message content
   */
  async sendMessage(phoneNumber: string, message: string): Promise<void> {
    if (!this.isReady) {
      throw new Error('WhatsApp client not initialized');
    }

    // Format phone number: strip non-digits and add @c.us
    const formattedNumber = phoneNumber.replace(/\D/g, '') + '@c.us';

    await this.client.sendMessage(formattedNumber, message);

    logger.info({
      event: 'notification_sent',
      context: {
        method: 'whatsapp',
        recipient: phoneNumber,
      },
    });
  }

  /**
   * Close the WhatsApp client
   */
  async close(): Promise<void> {
    if (this.client) {
      await this.client.destroy();
      this.isReady = false;
    }
  }

  /**
   * Setup event handlers for QR code, ready, and disconnected events
   */
  private setupEventHandlers(): void {
    // QR code for authentication
    this.client.on('qr', (qr) => {
      qrcode.generate(qr, { small: true });
      logger.info({
        event: 'whatsapp_auth_required',
        context: {
          message: 'Scan QR code to authenticate WhatsApp',
        },
      });
    });

    // Client is ready
    this.client.on('ready', () => {
      this.isReady = true;
      logger.info({
        event: 'whatsapp_connected',
        context: {
          message: 'WhatsApp client connected and ready',
        },
      });
    });

    // Handle disconnection with automatic reconnection
    this.client.on('disconnected', (reason) => {
      this.isReady = false;
      logger.warn({
        event: 'whatsapp_disconnected',
        context: {
          reason,
          message: 'WhatsApp disconnected, will attempt reconnection',
        },
      });

      // Attempt reconnection after 5 seconds
      setTimeout(() => {
        logger.info({
          event: 'whatsapp_reconnecting',
          context: {
            message: 'Attempting to reconnect WhatsApp client',
          },
        });
        this.client.initialize();
      }, 5000);
    });
  }
}
