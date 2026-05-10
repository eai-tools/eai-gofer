export interface ValidationIssue {
    severity: 'critical' | 'warning' | 'info';
    category: string;
    description: string;
    location?: string;
}
export interface ValidationResult {
    isValid: boolean;
    issues: ValidationIssue[];
    suggestions: string[];
    message?: string;
}
export declare class ValidationService {
    private anthropic;
    private workspaceRoot;
    constructor(apiKey: string, workspaceRoot: string);
    validateWithCouncil(filePath: string, useCouncil?: boolean): Promise<ValidationResult>;
    private loadConstitution;
    private validateAsRole;
    private synthesizeResults;
}
//# sourceMappingURL=ValidationService.d.ts.map