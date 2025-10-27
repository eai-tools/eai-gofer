import { WhatsAppClient } from './WhatsAppClient.js';
import { promises as fs } from 'fs';
import type { Notification } from '../types/index.js';

export interface WhatsAppConfig {
  sessionPath: string;
  phoneNumber?: string;
}

export class NotificationService {
  private phoneNumber: string;

  constructor(
    private whatsappClient: WhatsAppClient,
    phoneNumber?: string
  ) {
    this.phoneNumber = phoneNumber || process.env.WHATSAPP_PHONE_NUMBER || '';
  }

  async send(notification: Notification): Promise<void> {
    try {
      await this.whatsappClient.sendMessage(this.phoneNumber, this.formatMessage(notification));
      notification.deliveryStatus = 'delivered';
    } catch {
      await fs.appendFile('.specify/.notifications.log', JSON.stringify(notification) + '\n');
      notification.deliveryStatus = 'persisted';
    }
  }

  async sendSMS(phoneNumber: string, message: string): Promise<void> {
    try {
      await this.whatsappClient.sendMessage(phoneNumber, message);
    } catch (error) {
      const notification: Partial<Notification> = {
        timestamp: new Date().toISOString(),
        severity: 'critical',
        message,
        deliveryStatus: 'failed',
        deliveryMethod: 'whatsapp',
        deliveryError: String(error),
      };
      await fs.appendFile('.specify/.notifications.log', JSON.stringify(notification) + '\n');
      throw error;
    }
  }

  formatMessage(n: Notification): string {
    return `[${n.severity}] ${n.message}`;
  }
}
