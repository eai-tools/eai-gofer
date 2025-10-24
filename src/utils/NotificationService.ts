import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';

export interface WhatsAppConfig {
  enabled: boolean;
  phoneNumber: string; // Your phone number in format: 1234567890@c.us
}

export type MessageHandler = (message: string, fromNumber: string) => Promise<void>;

export class NotificationService {
  private whatsappClient: any = null;
  private whatsappConfig: WhatsAppConfig;
  private enabled: boolean = false;
  private messageHandlers: MessageHandler[] = [];
  private awaitingResponse: boolean = false;
  private lastQuestionTime: number = 0;

  constructor(whatsappConfig: WhatsAppConfig) {
    this.whatsappConfig = whatsappConfig;

    // Initialize WhatsApp for messaging
    if (whatsappConfig.enabled && whatsappConfig.phoneNumber) {
      this.initializeWhatsApp();
    } else {
      console.log('📱 Notifications disabled (WhatsApp not configured)');
    }
  }

  private async initializeWhatsApp(): Promise<void> {
    console.log('📱 Initializing WhatsApp...');
    
    this.whatsappClient = new Client({
      authStrategy: new LocalAuth(),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      }
    });

    this.whatsappClient.on('qr', (qr: string) => {
      console.log('\n🔐 WhatsApp QR Code - Scan with your phone:\n');
      qrcode.generate(qr, { small: true });
      console.log('\nOpen WhatsApp on your phone → Linked Devices → Link a Device');
      console.log('Scan the QR code above to authenticate.\n');
    });

    this.whatsappClient.on('ready', () => {
      console.log('✅ WhatsApp client is ready!');
      this.enabled = true;
    });

    this.whatsappClient.on('authenticated', () => {
      console.log('✅ WhatsApp authenticated');
    });

    this.whatsappClient.on('auth_failure', (msg: unknown) => {
      console.error('❌ WhatsApp authentication failed:', msg);
      console.log('📱 Falling back to disabled mode');
    });

    this.whatsappClient.on('disconnected', (reason: string) => {
      console.log('📱 WhatsApp disconnected:', reason);
      this.enabled = false;
    });

    // Listen for incoming messages (two-way communication!)
    this.whatsappClient.on('message', async (msg: any) => {
      const fromNumber = msg.from;
      const messageText = msg.body;

      // Only respond to messages from the configured phone number
      if (fromNumber === this.whatsappConfig.phoneNumber) {
        console.log(`\n📱 Received WhatsApp message: "${messageText}"\n`);

        // Call all registered handlers
        for (const handler of this.messageHandlers) {
          try {
            await handler(messageText, fromNumber);
          } catch (error) {
            console.error('❌ Error handling WhatsApp message:', error);
          }
        }
      }
    });

    try {
      await this.whatsappClient.initialize();
    } catch (error) {
      console.error('❌ Failed to initialize WhatsApp:', error);
      console.log('📱 Notifications disabled');
    }
  }

  /**
   * Register a handler for incoming messages (two-way communication)
   * Use this to respond to user commands via WhatsApp
   */
  onMessage(handler: MessageHandler): void {
    this.messageHandlers.push(handler);
  }

  /**
   * Check if we're waiting for a response
   */
  isAwaitingResponse(): boolean {
    return this.awaitingResponse;
  }

  /**
   * Mark that we're waiting for a response
   */
  setAwaitingResponse(waiting: boolean): void {
    this.awaitingResponse = waiting;
    if (waiting) {
      this.lastQuestionTime = Date.now();
    }
  }

  async sendSMS(message: string): Promise<boolean> {
    if (!this.enabled) {
      console.log(`\n📱 [Notifications Disabled] Would have sent:\n${message}\n`);
      return false;
    }

    try {
      if (this.whatsappClient) {
        // Send via WhatsApp
        const chatId = this.whatsappConfig.phoneNumber;
        await this.whatsappClient.sendMessage(chatId, message);
        console.log(`✅ WhatsApp message sent to ${chatId}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Failed to send notification:', error);
      return false;
    }
  }

  async sendQuestion(question: string, options?: string[]): Promise<void> {
    let message = `❓ Question from SpecGofer:\n\n${question}`;

    if (options && options.length > 0) {
      message += '\n\nOptions:';
      options.forEach((opt, i) => {
        message += `\n${i + 1}. ${opt}`;
      });
    }

    message += '\n\n💬 Reply to this message with your answer.';

    this.setAwaitingResponse(true);
    await this.sendSMS(message);
  }

  /**
   * Wait for a response from the user (with timeout)
   * Returns the user's response or null if timeout
   */
  async waitForResponse(timeoutMs: number = 300000): Promise<string | null> {
    return new Promise((resolve) => {
      let responseReceived = false;

      const handler: MessageHandler = async (message: string) => {
        if (!responseReceived && this.awaitingResponse) {
          responseReceived = true;
          this.setAwaitingResponse(false);
          resolve(message);
        }
      };

      // Add temporary handler
      this.onMessage(handler);

      // Timeout after specified time
      setTimeout(() => {
        if (!responseReceived) {
          this.setAwaitingResponse(false);
          resolve(null);
        }
      }, timeoutMs);
    });
  }

  async sendAlert(title: string, details: string): Promise<void> {
    const message = `🚨 ${title}\n\n${details}`;
    await this.sendSMS(message);
  }

  async sendSuccess(message: string): Promise<void> {
    await this.sendSMS(`✅ ${message}`);
  }
}
