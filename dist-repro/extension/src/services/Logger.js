"use strict";
/**
 * Logger Service
 *
 * Centralized logging service for error, warning, and info messages.
 * Replaces silent error handlers throughout the codebase.
 *
 * Usage:
 * ```typescript
 * import { container } from 'tsyringe';
 * import { Logger } from './services/Logger';
 *
 * const logger = container.resolve(Logger);
 * logger.error('ExtensionActivation', new Error('Failed'), { attemptNumber: 1 });
 * ```
 */
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
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = exports.LogLevel = void 0;
const tsyringe_1 = require("tsyringe");
/**
 * Log level for filtering messages
 */
var LogLevel;
(function (LogLevel) {
    LogLevel["ERROR"] = "ERROR";
    LogLevel["WARN"] = "WARN";
    LogLevel["INFO"] = "INFO";
    LogLevel["DEBUG"] = "DEBUG";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
/**
 * Logger service for centralized error and warning handling
 */
let Logger = (() => {
    let _classDecorators = [(0, tsyringe_1.injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var Logger = _classThis = class {
        constructor() {
            this.minLogLevel = LogLevel.INFO;
        }
        /**
         * Initialize the logger with an output channel
         *
         * @param outputChannel - VSCode output channel for displaying logs
         */
        initialize(outputChannel) {
            this.outputChannel = outputChannel;
        }
        /**
         * Set minimum log level for filtering
         *
         * @param level - Minimum level to log
         */
        setMinLogLevel(level) {
            this.minLogLevel = level;
        }
        /**
         * Log an error message
         *
         * @param context - Context where the error occurred (module name, operation)
         * @param error - Error object
         * @param metadata - Optional additional metadata
         */
        error(context, error, metadata) {
            this.log(LogLevel.ERROR, context, error.message, metadata, error);
        }
        /**
         * Log a warning message
         *
         * @param context - Context for the warning
         * @param message - Warning message
         * @param metadata - Optional additional metadata
         */
        warn(context, message, metadata) {
            this.log(LogLevel.WARN, context, message, metadata);
        }
        /**
         * Log an info message
         *
         * @param context - Context for the info
         * @param message - Info message
         * @param metadata - Optional additional metadata
         */
        info(context, message, metadata) {
            this.log(LogLevel.INFO, context, message, metadata);
        }
        /**
         * Log a debug message
         *
         * @param context - Context for the debug
         * @param message - Debug message
         * @param metadata - Optional additional metadata
         */
        debug(context, message, metadata) {
            this.log(LogLevel.DEBUG, context, message, metadata);
        }
        /**
         * Internal log method
         *
         * @param level - Log level
         * @param context - Context where the log occurred
         * @param message - Log message
         * @param metadata - Optional additional metadata
         * @param error - Optional error object for stack trace
         */
        log(level, context, message, metadata, error) {
            // Filter based on minimum log level
            if (!this.shouldLog(level)) {
                return;
            }
            // Format log message
            const timestamp = new Date().toISOString();
            const metadataStr = metadata ? ` ${JSON.stringify(metadata)}` : '';
            const stackTrace = error?.stack ? `\n${error.stack}` : '';
            const logMessage = `[${timestamp}] [${level}][${context}] ${message}${metadataStr}${stackTrace}`;
            // Write to output channel if available
            if (this.outputChannel) {
                this.outputChannel.appendLine(logMessage);
                // Show output channel for errors
                if (level === LogLevel.ERROR) {
                    this.outputChannel.show(true); // true = preserve focus
                }
            }
            else {
                // Fallback to console if output channel not initialized
            }
        }
        /**
         * Check if a log level should be logged based on minimum level
         *
         * @param level - Level to check
         * @returns Whether the level should be logged
         */
        shouldLog(level) {
            const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
            const minIndex = levels.indexOf(this.minLogLevel);
            const currentIndex = levels.indexOf(level);
            return currentIndex >= minIndex;
        }
    };
    __setFunctionName(_classThis, "Logger");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        Logger = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return Logger = _classThis;
})();
exports.Logger = Logger;
