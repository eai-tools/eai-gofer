import { WhatsAppClient } from './WhatsAppClient.js';
import { promises as fs } from 'fs';
import type { Notification } from '../types/index.js';

export class NotificationService {
  constructor(private whatsappClient: WhatsAppClient) {}

  async send(notification: Notification): Promise<void> {
    try {
      await this.whatsappClient.sendMessage('', this.formatMessage(notification));
      notification.deliveryStatus = 'delivered';
    } catch {
      await fs.appendFile('.specify/.notifications.log', JSON.stringify(notification) + '\n');
      notification.deliveryStatus = 'persisted';
    }
  }

  formatMessage(n: Notification): string {
    return `[${n.severity}] ${n.message}`;
  }
}
