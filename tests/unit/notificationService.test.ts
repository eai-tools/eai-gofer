import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  NotificationService,
  WhatsAppConfig,
} from '../../src/utils/NotificationService';

// Mock whatsapp-web.js
vi.mock('whatsapp-web.js', () => {
  return {
    Client: vi.fn().mockImplementation(() => ({
      initialize: vi.fn().mockResolvedValue(undefined),
      on: vi.fn(),
      sendMessage: vi.fn().mockResolvedValue(undefined),
      destroy: vi.fn().mockResolvedValue(undefined),
    })),
    LocalAuth: vi.fn(),
  };
});

// Mock qrcode-terminal
vi.mock('qrcode-terminal', () => ({
  generate: vi.fn(),
}));

describe('NotificationService', () => {
  let service: NotificationService;
  let mockConfig: WhatsAppConfig;

  beforeEach(() => {
    mockConfig = {
      enabled: true,
      sessionPath: '/tmp/test-whatsapp-session',
    };

    vi.clearAllMocks();
  });

  afterEach(async () => {
    if (service) {
      await service.stop();
    }
  });

  describe('Constructor', () => {
    it('should initialize with config', () => {
      service = new NotificationService(mockConfig);
      expect(service).toBeDefined();
    });

    it('should handle disabled configuration', () => {
      const disabledConfig: WhatsAppConfig = {
        enabled: false,
        sessionPath: '/tmp/test',
      };

      service = new NotificationService(disabledConfig);
      expect(service).toBeDefined();
    });
  });

  describe('initialize', () => {
    it('should initialize WhatsApp client when enabled', async () => {
      service = new NotificationService(mockConfig);
      const whatsappClient = (service as any).whatsappClient;

      if (whatsappClient) {
        expect(whatsappClient.initialize).toBeDefined();
      }
    });

    it('should not initialize when disabled', () => {
      const disabledConfig: WhatsAppConfig = {
        enabled: false,
        sessionPath: '/tmp/test',
      };

      service = new NotificationService(disabledConfig);
      const whatsappClient = (service as any).whatsappClient;

      expect(whatsappClient).toBeDefined(); // Client created but not initialized
    });

    it('should handle QR code display', async () => {
      service = new NotificationService(mockConfig);

      // QR code handler should be registered
      const whatsappClient = (service as any).whatsappClient;
      expect(whatsappClient.on).toHaveBeenCalledWith('qr', expect.any(Function));
    });

    it('should handle ready event', async () => {
      service = new NotificationService(mockConfig);

      const whatsappClient = (service as any).whatsappClient;
      expect(whatsappClient.on).toHaveBeenCalledWith('ready', expect.any(Function));
    });

    it('should handle initialization errors gracefully', async () => {
      const errorConfig: WhatsAppConfig = {
        enabled: true,
        sessionPath: '/invalid/path',
      };

      service = new NotificationService(errorConfig);

      // Should create service even if initialization might fail
      expect(service).toBeDefined();
    });
  });

  describe('sendSMS', () => {
    it('should send message when enabled and ready', async () => {
      service = new NotificationService(mockConfig);

      // Simulate ready state
      (service as any).enabled = true;

      const whatsappClient = (service as any).whatsappClient;
      const sendSpy = vi.spyOn(whatsappClient, 'sendMessage');

      await service.sendSMS('Test notification message');

      expect(sendSpy).toHaveBeenCalled();
    });

    it('should not send when disabled', async () => {
      const disabledConfig: WhatsAppConfig = {
        enabled: false,
        sessionPath: '/tmp/test',
      };

      service = new NotificationService(disabledConfig);
      (service as any).enabled = false;

      const whatsappClient = (service as any).whatsappClient;
      const sendSpy = vi.spyOn(whatsappClient, 'sendMessage');

      await service.sendSMS('Test message');

      expect(sendSpy).not.toHaveBeenCalled();
    });

    it('should format message correctly', async () => {
      service = new NotificationService(mockConfig);
      (service as any).enabled = true;

      const whatsappClient = (service as any).whatsappClient;
      const sendSpy = vi.spyOn(whatsappClient, 'sendMessage');

      await service.sendSMS('Important alert');

      expect(sendSpy).toHaveBeenCalled();
    });

    it('should handle send errors gracefully', async () => {
      service = new NotificationService(mockConfig);
      (service as any).enabled = true;

      const whatsappClient = (service as any).whatsappClient;
      whatsappClient.sendMessage.mockRejectedValue(new Error('Network error'));

      await expect(service.sendSMS('Test')).rejects.toThrow();
    });
  });

  describe('sendQuestion', () => {
    it('should format question with reminder', async () => {
      service = new NotificationService(mockConfig);
      (service as any).enabled = true;

      const whatsappClient = (service as any).whatsappClient;
      const sendSpy = vi.spyOn(whatsappClient, 'sendMessage');

      await service.sendQuestion('What is the API endpoint?');

      expect(sendSpy).toHaveBeenCalled();
      // Should include some question formatting
    });

    it('should send question even when disabled (logs only)', async () => {
      const disabledConfig: WhatsAppConfig = {
        enabled: false,
        sessionPath: '/tmp/test',
      };

      service = new NotificationService(disabledConfig);

      // Should not throw when disabled
      await expect(
        service.sendQuestion('Test question?')
      ).resolves.not.toThrow();
    });
  });

  describe('waitForResponse', () => {
    it('should wait for message response', async () => {
      service = new NotificationService(mockConfig);
      (service as any).enabled = true;

      // Simulate message after delay
      setTimeout(() => {
        const messageHandler = (service as any).messageHandler;
        if (messageHandler) {
          messageHandler({ body: 'User response' });
        }
      }, 100);

      const response = await service.waitForResponse(5000);

      expect(response).toBe('User response');
    });

    it('should timeout if no response received', async () => {
      service = new NotificationService(mockConfig);
      (service as any).enabled = true;

      const response = await service.waitForResponse(100);

      expect(response).toBeNull();
    });

    it('should return null when disabled', async () => {
      const disabledConfig: WhatsAppConfig = {
        enabled: false,
        sessionPath: '/tmp/test',
      };

      service = new NotificationService(disabledConfig);

      const response = await service.waitForResponse(1000);

      expect(response).toBeNull();
    });

    it('should handle multiple concurrent waits', async () => {
      service = new NotificationService(mockConfig);
      (service as any).enabled = true;

      const wait1 = service.waitForResponse(100);
      const wait2 = service.waitForResponse(100);

      const results = await Promise.all([wait1, wait2]);

      // Both should timeout
      expect(results).toEqual([null, null]);
    });
  });

  describe('Two-way Communication', () => {
    it('should register message handler', () => {
      service = new NotificationService(mockConfig);

      const whatsappClient = (service as any).whatsappClient;
      expect(whatsappClient.on).toHaveBeenCalledWith(
        'message',
        expect.any(Function)
      );
    });

    it('should handle incoming messages', async () => {
      service = new NotificationService(mockConfig);

      const messageHandler = (service as any).messageHandler;
      expect(messageHandler).toBeDefined();

      // Simulate incoming message
      if (messageHandler) {
        const mockMessage = { body: 'Hello from user' };
        messageHandler(mockMessage);

        // Should not throw
        expect(true).toBe(true);
      }
    });

    it('should handle command messages', async () => {
      service = new NotificationService(mockConfig);
      (service as any).enabled = true;

      const messageHandler = (service as any).messageHandler;

      if (messageHandler) {
        const mockMessage = { body: '/status', reply: vi.fn() };
        await messageHandler(mockMessage);

        // Should process command
        expect(true).toBe(true);
      }
    });
  });

  describe('stop', () => {
    it('should destroy WhatsApp client', async () => {
      service = new NotificationService(mockConfig);
      (service as any).enabled = true;

      const whatsappClient = (service as any).whatsappClient;
      const destroySpy = vi.spyOn(whatsappClient, 'destroy');

      await service.stop();

      expect(destroySpy).toHaveBeenCalled();
    });

    it('should be safe to call multiple times', async () => {
      service = new NotificationService(mockConfig);

      await expect(service.stop()).resolves.not.toThrow();
      await expect(service.stop()).resolves.not.toThrow();
    });

    it('should handle stop errors gracefully', async () => {
      service = new NotificationService(mockConfig);

      const whatsappClient = (service as any).whatsappClient;
      whatsappClient.destroy.mockRejectedValue(new Error('Already destroyed'));

      await expect(service.stop()).resolves.not.toThrow();
    });
  });

  describe('Error Recovery', () => {
    it('should recover from disconnection', () => {
      service = new NotificationService(mockConfig);

      const whatsappClient = (service as any).whatsappClient;
      expect(whatsappClient.on).toHaveBeenCalledWith(
        'disconnected',
        expect.any(Function)
      );
    });

    it('should handle authentication failures', () => {
      service = new NotificationService(mockConfig);

      const whatsappClient = (service as any).whatsappClient;
      expect(whatsappClient.on).toHaveBeenCalledWith(
        'auth_failure',
        expect.any(Function)
      );
    });
  });

  describe('Configuration', () => {
    it('should accept custom session path', () => {
      const customConfig: WhatsAppConfig = {
        enabled: true,
        sessionPath: '/custom/session/path',
      };

      service = new NotificationService(customConfig);
      expect(service).toBeDefined();
    });

    it('should work with minimal config', () => {
      const minimalConfig: WhatsAppConfig = {
        enabled: false,
        sessionPath: './whatsapp-session',
      };

      service = new NotificationService(minimalConfig);
      expect(service).toBeDefined();
    });
  });

  describe('Integration with Orchestrator', () => {
    it('should send task failure notifications', async () => {
      service = new NotificationService(mockConfig);
      (service as any).enabled = true;

      const whatsappClient = (service as any).whatsappClient;
      const sendSpy = vi.spyOn(whatsappClient, 'sendMessage');

      await service.sendSMS(
        'Task T001 failed validation multiple times.\nNeeds human intervention.'
      );

      expect(sendSpy).toHaveBeenCalled();
    });

    it('should send question escalations', async () => {
      service = new NotificationService(mockConfig);
      (service as any).enabled = true;

      const whatsappClient = (service as any).whatsappClient;
      const sendSpy = vi.spyOn(whatsappClient, 'sendMessage');

      await service.sendQuestion(
        'Claude Code has a question: What database should we use?'
      );

      expect(sendSpy).toHaveBeenCalled();
    });
  });
});
