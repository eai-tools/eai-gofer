"use strict";
/**
 * Version Detector Service
 *
 * Detects .specify folder format and version information.
 * Extracted from goferMigrator.ts (2499 LOC → focused service).
 *
 * Engineering Remediation Phase 4 - T026
 */
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
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
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
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VersionDetector = void 0;
const tsyringe_1 = require("tsyringe");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
/**
 * Version Detector Service
 *
 * Responsible for detecting the current .specify folder format
 * and determining if an upgrade is needed.
 */
let VersionDetector = (() => {
    let _classDecorators = [(0, tsyringe_1.injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var VersionDetector = _classThis = class {
        constructor(logger) {
            this.logger = logger;
        }
        /**
         * Check if .specify folder exists
         *
         * @param workspacePath - Root path of the workspace
         * @returns True if .specify folder exists
         */
        async exists(workspacePath) {
            try {
                const specifyPath = path.join(workspacePath, '.specify');
                await fs.access(specifyPath);
                return true;
            }
            catch {
                return false;
            }
        }
        /**
         * Detect the format of .specify folder
         *
         * Detects one of four format types:
         * - 'none': No .specify folder exists
         * - 'legacy-json': Old JSON format (needs upgrade)
         * - 'gofer': Current Gofer Markdown format (up to date)
         * - 'mixed': Contains both formats (needs migration)
         *
         * @param workspacePath - Root path of the workspace
         * @returns Format type detected
         */
        async detectFormat(workspacePath) {
            const exists = await this.exists(workspacePath);
            if (!exists) {
                this.logger.debug('VersionDetector', 'No .specify folder found', { workspacePath });
                return 'none';
            }
            const specifyPath = path.join(workspacePath, '.specify');
            const hasSpecs = await this.hasDirectory(specifyPath, 'specs');
            const hasMemory = await this.hasDirectory(specifyPath, 'memory');
            const hasTemplates = await this.hasDirectory(specifyPath, 'templates');
            const hasJsonSpecs = await this.hasJsonSpecs(specifyPath);
            // Gofer format has specs/, memory/, templates/
            const isGofer = hasSpecs && hasMemory && hasTemplates;
            // Legacy format has JSON files in root
            const isLegacy = hasJsonSpecs && !hasSpecs;
            if (isGofer && hasJsonSpecs) {
                this.logger.info('VersionDetector', 'Mixed format detected', { workspacePath });
                return 'mixed'; // Has both formats
            }
            else if (isGofer) {
                this.logger.debug('VersionDetector', 'Gofer format detected', { workspacePath });
                return 'gofer';
            }
            else if (isLegacy) {
                this.logger.info('VersionDetector', 'Legacy JSON format detected', { workspacePath });
                return 'legacy-json';
            }
            else {
                this.logger.warn('VersionDetector', 'Mixed/partial format detected', { workspacePath });
                return 'mixed'; // Partial or unknown
            }
        }
        /**
         * Get version info from .specify folder
         *
         * Returns detailed version information including:
         * - Current format type
         * - Whether an upgrade is needed
         * - Details about the detected format
         *
         * @param workspacePath - Root path of the workspace
         * @returns Version information object
         */
        async getVersionInfo(workspacePath) {
            const format = await this.detectFormat(workspacePath);
            switch (format) {
                case 'none':
                    return {
                        format: 'none',
                        needsUpgrade: false,
                        details: 'No .specify folder found',
                    };
                case 'legacy-json':
                    return {
                        format: 'legacy-json',
                        needsUpgrade: true,
                        details: 'Old JSON format detected. Upgrade to Gofer Markdown format?',
                    };
                case 'gofer':
                    return {
                        format: 'gofer',
                        needsUpgrade: false,
                        details: 'Gofer format (up to date)',
                    };
                case 'mixed':
                    return {
                        format: 'mixed',
                        needsUpgrade: true,
                        details: 'Mixed formats detected. Migrate remaining JSON specs to Markdown?',
                    };
                default:
                    return {
                        format: 'none',
                        needsUpgrade: false,
                        details: 'Unknown format',
                    };
            }
        }
        /**
         * Compare two semantic versions
         *
         * Returns:
         * - Negative number if version a < version b
         * - 0 if versions are equal
         * - Positive number if version a > version b
         *
         * Supports semantic versioning (e.g., "1.2.3", "2.0.0-beta")
         *
         * @param a - First version string
         * @param b - Second version string
         * @returns Comparison result (-1, 0, or 1)
         */
        compareVersions(a, b) {
            // Remove 'v' prefix if present
            const cleanA = a.replace(/^v/, '');
            const cleanB = b.replace(/^v/, '');
            // Split into parts (major.minor.patch)
            const partsA = cleanA.split(/[.-]/).map((part) => {
                const num = parseInt(part, 10);
                return isNaN(num) ? 0 : num;
            });
            const partsB = cleanB.split(/[.-]/).map((part) => {
                const num = parseInt(part, 10);
                return isNaN(num) ? 0 : num;
            });
            // Compare each part
            const maxLength = Math.max(partsA.length, partsB.length);
            for (let i = 0; i < maxLength; i++) {
                const partA = partsA[i] || 0;
                const partB = partsB[i] || 0;
                if (partA < partB) {
                    return -1;
                }
                else if (partA > partB) {
                    return 1;
                }
            }
            // Versions are equal
            return 0;
        }
        /**
         * Check if a directory exists in .specify
         *
         * @param specifyPath - Path to .specify folder
         * @param name - Directory name to check
         * @returns True if directory exists
         */
        async hasDirectory(specifyPath, name) {
            try {
                const dirPath = path.join(specifyPath, name);
                const stat = await fs.stat(dirPath);
                return stat.isDirectory();
            }
            catch {
                return false;
            }
        }
        /**
         * Check if there are JSON spec files
         *
         * @param specifyPath - Path to .specify folder
         * @returns True if JSON spec files exist
         */
        async hasJsonSpecs(specifyPath) {
            try {
                const files = await fs.readdir(specifyPath);
                const hasJson = files.some((f) => f.endsWith('.json') && f !== 'spec-schema.json');
                return hasJson;
            }
            catch {
                return false;
            }
        }
        /**
         * Get the current version as a string
         *
         * Returns the detected format type as a version string.
         * This is used for logging and display purposes.
         *
         * @param workspacePath - Root path of the workspace
         * @returns Version string
         */
        async detectCurrentVersion(workspacePath) {
            const format = await this.detectFormat(workspacePath);
            return format;
        }
    };
    __setFunctionName(_classThis, "VersionDetector");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        VersionDetector = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return VersionDetector = _classThis;
})();
exports.VersionDetector = VersionDetector;
