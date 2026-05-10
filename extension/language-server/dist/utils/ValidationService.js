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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationService = void 0;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
class ValidationService {
    constructor(apiKey, workspaceRoot) {
        this.anthropic = new sdk_1.default({ apiKey });
        this.workspaceRoot = workspaceRoot;
    }
    async validateWithCouncil(filePath, useCouncil = true) {
        try {
            const fileContent = await fs.readFile(filePath, 'utf-8');
            const constitution = await this.loadConstitution();
            // Core validation (Chairman)
            const chairmanResult = await this.validateAsRole('Senior Architect', constitution, fileContent, filePath);
            if (!useCouncil || !chairmanResult.isValid) {
                return chairmanResult;
            }
            // Peer Review (Security)
            const securityResult = await this.validateAsRole('Security Specialist', constitution, fileContent, filePath);
            // Peer Review (QA)
            const qaResult = await this.validateAsRole('QA Lead', constitution, fileContent, filePath);
            // Synthesize
            return this.synthesizeResults([chairmanResult, securityResult, qaResult]);
        }
        catch (error) {
            return {
                isValid: false,
                issues: [
                    {
                        severity: 'critical',
                        category: 'System',
                        description: `Failed to read file or validate: ${error.message}`,
                    },
                ],
                suggestions: [],
            };
        }
    }
    async loadConstitution() {
        try {
            const p = path.join(this.workspaceRoot, '.specify', 'memory', 'constitution.md');
            return await fs.readFile(p, 'utf-8');
        }
        catch {
            return `
# Constitution

- No mocking allowed.
- TypeScript strict mode required.
- No 'any' type.
      `;
        }
    }
    async validateAsRole(role, constitution, code, filePath) {
        const prompt = `
      You are a ${role} in the "Council" of automated code reviewers.
      Your job is to strictly validate the following code file against our Constitution.
      
      FILE: ${filePath}
      
      CONSTITUTION:
      ${constitution}
      
      CODE:
      ${code}
      
      Respond only with a JSON object in this format:
      {
        "isValid": boolean,
        "issues": [ { "severity": "critical|warning", "category": "string", "description": "string", "location": "string" } ],
        "suggestions": ["string"]
      }
    `;
        try {
            const response = await this.anthropic.messages.create({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 4000,
                messages: [{ role: 'user', content: prompt }],
            });
            const content = response.content[0].type === 'text' ? response.content[0].text : '';
            // Extract JSON
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return {
                isValid: false,
                issues: [
                    {
                        severity: 'critical',
                        category: 'Parsing',
                        description: 'Failed to parse validation response',
                    },
                ],
                suggestions: [],
            };
        }
        catch (e) {
            return {
                isValid: false,
                issues: [
                    {
                        severity: 'critical',
                        category: 'System',
                        description: 'Validation failed: ' + e.message,
                    },
                ],
                suggestions: [],
            };
        }
    }
    synthesizeResults(results) {
        const allIssues = results.flatMap((r) => r.issues);
        // Deduplicate issues by description
        const seen = new Set();
        const uniqueIssues = allIssues.filter((i) => {
            const key = `${i.category}:${i.description}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
        const criticalIssues = uniqueIssues.filter((i) => i.severity === 'critical');
        const isValid = criticalIssues.length === 0;
        return {
            isValid,
            issues: uniqueIssues,
            suggestions: [...new Set(results.flatMap((r) => r.suggestions))],
            message: isValid
                ? 'Approved by Council'
                : `Rejected by Council (${criticalIssues.length} critical issues)`,
        };
    }
}
exports.ValidationService = ValidationService;
//# sourceMappingURL=ValidationService.js.map