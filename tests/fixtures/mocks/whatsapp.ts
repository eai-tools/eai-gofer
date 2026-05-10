/**
 * Mock WhatsApp API for testing notification services
 */

import { vi } from 'vitest';

export interface WhatsAppMessage {
  id: string;
  body: string;
  from: string;
  to: string;
  status: 'queued' | 'sent' | 'delivered' | 'failed';
  timestamp: Date;
  type: 'text' | 'image' | 'document';
}

export interface WhatsAppSendParams {
  body: string;
  to: string;
  type?: 'text' | 'image' | 'document';
}

export class MockWhatsAppAPI {
  private sentMessages: WhatsAppMessage[] = [];
  private shouldFail = false;
  private failureReason = 'Mock failure';
  private isReady = false;

  /**
   * Public messages interface matching WhatsApp client
   */
  public client = {
    sendMessage: async (to: string, body: string): Promise<WhatsAppMessage> => {
      return this.sendMessage({ to, body });
    },
    on: vi.fn(),
    initialize: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn().mockResolvedValue(undefined)
  };

  /**
   * Configure the mock to simulate failures
   */
  public setFailure(shouldFail: boolean, reason = 'Mock failure'): void {
    this.shouldFail = shouldFail;
    this.failureReason = reason;
  }

  /**
   * Set WhatsApp client ready status
   */
  public setReady(ready: boolean): void {
    this.isReady = ready;
  }

  /**
   * Mock message sending
   */
  public async sendMessage(params: WhatsAppSendParams): Promise<WhatsAppMessage> {
    if (this.shouldFail) {
      throw new Error(this.failureReason);
    }

    if (!this.isReady) {
      throw new Error('WhatsApp client not ready');
    }

    const message: WhatsAppMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      body: params.body,
      from: 'mock@c.us',
      to: params.to,
      status: 'queued',
      timestamp: new Date(),
      type: params.type || 'text'
    };

    this.sentMessages.push(message);

    // Simulate async delivery
    setTimeout(() => {
      message.status = 'sent';
      setTimeout(() => {
        message.status = 'delivered';
      }, 100);
    }, 50);

    return message;
  }

  /**
   * Get all sent messages
   */
  public getMessages(): WhatsAppMessage[] {
    return [...this.sentMessages];
  }

  /**
   * Get messages sent to a specific number
   */
  public getMessagesTo(phoneNumber: string): WhatsAppMessage[] {
    return this.sentMessages.filter((msg: WhatsAppMessage) => msg.to === phoneNumber);
  }

  /**
   * Clear message history
   */
  public clear(): void {
    this.sentMessages = [];
  }

  /**
   * Get WhatsApp client mock
   */
  public getWhatsAppMock(): { sendMessage: ReturnType<typeof vi.fn>; on: ReturnType<typeof vi.fn>; initialize: ReturnType<typeof vi.fn> } {
    return {
      sendMessage: vi.fn().mockImplementation(async (to: string, body: string) => {
        return this.sendMessage({ to, body });
      }),
      on: vi.fn(),
      initialize: vi.fn().mockResolvedValue(undefined)
    };
  }

  /**
   * Simulate QR code scanning
   */
  public simulateQRScan(): void {
    this.setReady(true);
  }

  /**
   * Simulate authentication events
   */
  public simulateAuth(success = true): void {
    // Authentication simulation for testing
    if (!success) {
      this.setFailure(true, 'Authentication failed');
    }
  }

  /**
   * Simulate incoming message
   */
  public simulateIncomingMessage(from: string, body: string): WhatsAppMessage {
    const mockMessage: WhatsAppMessage = {
      id: `incoming_${Date.now()}`,
      from,
      body,
      to: 'mock@c.us',
      status: 'delivered',
      timestamp: new Date(),
      type: 'text'
    };
    return mockMessage;
  }
}

// Pre-configured mock scenarios
export const mockWhatsAppScenarios = {
  SUCCESS: {
    shouldFail: false,
    isReady: true,
    expectedStatus: 'delivered' as const,
  },
  
  NOT_READY: {
    shouldFail: false,
    isReady: false,
    reason: 'WhatsApp client not ready',
  },
  
  AUTH_FAILURE: {
    shouldFail: true,
    reason: 'Authentication failed',
  },
  
  NETWORK_ERROR: {
    shouldFail: true,
    reason: 'Network connection failed',
  }
} as const;

export default MockWhatsAppAPI;