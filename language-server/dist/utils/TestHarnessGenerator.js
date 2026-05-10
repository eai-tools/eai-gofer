"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestHarnessGenerator = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
class TestHarnessGenerator {
    constructor(workspaceRoot) {
        this.workspaceRoot = workspaceRoot;
    }
    async ensureTestHarness(specId, taskId, description) {
        // Sanitized name
        const sanitizedTask = taskId.toLowerCase().replace(/[^a-z0-9]/g, '-');
        const testFileName = `${sanitizedTask}.test.ts`;
        const testDir = path.join(this.workspaceRoot, 'tests', 'generated', specId);
        const testPath = path.join(testDir, testFileName);
        try {
            await fs.access(testPath);
            return testPath; // Exists
        }
        catch {
            // Does not exist, create it
        }
        const harnessCode = `
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

/**
 * Task: ${taskId}
 * Description: ${description}
 * Feature: ${specId}
 * 
 * REAL-WORLD TEST HARNESS (NO MOCKING ALLOWED)
 */
describe('${specId} - ${taskId}', () => {
    let tempDir: string;

    beforeEach(async () => {
        // 1. Create a real temporary workspace
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gofer-test-${sanitizedTask}-'));
        
        // 2. Setup standard environment (e.g. .specify folder)
        await fs.mkdir(path.join(tempDir, '.specify'), { recursive: true });
    });

    afterEach(async () => {
        // Cleanup real files
        await fs.rm(tempDir, { recursive: true, force: true });
    });

    it('should fulfill acceptance criteria for ${taskId}', async () => {
        // TODO: Implement Logic Here
        // const result = await runLogic(tempDir);
        // expect(result).toBe(true);
        expect(true).toBe(true); // Placeholder
    });
});
`;
        await fs.mkdir(testDir, { recursive: true });
        await fs.writeFile(testPath, harnessCode);
        return testPath;
    }
}
exports.TestHarnessGenerator = TestHarnessGenerator;
//# sourceMappingURL=TestHarnessGenerator.js.map