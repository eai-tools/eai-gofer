import twilio from 'twilio';

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
  toNumber: string;
}

export class NotificationService {
  private client: twilio.Twilio | null = null;
  private config: TwilioConfig;

  constructor(config: TwilioConfig) {
    this.config = config;

    if (config.accountSid && config.authToken) {
      this.client = twilio(config.accountSid, config.authToken);
    } else {
      console.warn('⚠️  Twilio not configured - SMS notifications disabled');
    }
  }

  async sendSMS(message: string): Promise<boolean> {
    if (!this.client) {
      console.log(`📱 [SMS Simulation] ${message}`);
      return false;
    }

    try {
      await this.client.messages.create({
        body: message,
        from: this.config.fromNumber,
        to: this.config.toNumber
      });

      console.log(`📱 SMS sent to ${this.config.toNumber}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send SMS:', error);
      return false;
    }
  }

  async sendQuestion(question: string, options?: string[]): Promise<void> {
    let message = `❓ Question from Spec-Driven Dev System:\n\n${question}`;

    if (options && options.length > 0) {
      message += '\n\nOptions:';
      options.forEach((opt, i) => {
        message += `\n${i + 1}. ${opt}`;
      });
    }

    message += '\n\nPlease respond ASAP.';

    await this.sendSMS(message);
  }

  async sendAlert(title: string, details: string): Promise<void> {
    const message = `🚨 ${title}\n\n${details}`;
    await this.sendSMS(message);
  }

  async sendSuccess(message: string): Promise<void> {
    await this.sendSMS(`✅ ${message}`);
  }
}
