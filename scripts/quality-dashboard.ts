#!/usr/bin/env node

/**
 * Quality Metrics Dashboard Generator
 * Generates comprehensive quality reports and trends analysis
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

interface QualityMetrics {
  timestamp: string;
  commit?: string;
  branch?: string;
  eslint: {
    errors: number;
    warnings: number;
    fixableErrors: number;
    fixableWarnings: number;
  };
  tests: {
    total: number;
    passed: number;
    failed: number;
    successRate: number;
  };
  coverage: {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
  };
  typescript: {
    errors: number;
  };
  files: {
    totalFiles: number;
    totalLines: number;
  };
}

class QualityDashboard {
  private reportsDir = 'quality-dashboard';
  private metricsFile = path.join(this.reportsDir, 'metrics-history.json');

  constructor() {
    this.ensureReportsDir();
  }

  private ensureReportsDir(): void {
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  private runCommand(command: string): string {
    try {
      return execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    } catch (error) {
      return '';
    }
  }

  private getESLintMetrics(): QualityMetrics['eslint'] {
    console.log('📊 Analyzing ESLint metrics...');
    
    const eslintJson = this.runCommand('npx eslint src/ --ext .ts,.js --format json');
    
    let errors = 0, warnings = 0, fixableErrors = 0, fixableWarnings = 0;
    
    try {
      const results = JSON.parse(eslintJson);
      for (const file of results) {
        for (const message of file.messages) {
          if (message.severity === 2) {
            errors++;
            if (message.fix) fixableErrors++;
          } else if (message.severity === 1) {
            warnings++;
            if (message.fix) fixableWarnings++;
          }
        }
      }
    } catch (e) {
      console.warn('⚠️  Could not parse ESLint results');
    }

    return { errors, warnings, fixableErrors, fixableWarnings };
  }

  private getTestMetrics(): QualityMetrics['tests'] {
    console.log('🧪 Analyzing test metrics...');
    
    const testOutput = this.runCommand('npm run test -- --reporter=json');
    
    let total = 0, passed = 0, failed = 0;
    
    try {
      // Parse test results from different possible formats
      if (testOutput.includes('Test Files')) {
        const match = testOutput.match(/(\d+) failed.*(\d+) passed \((\d+)\)/);
        if (match) {
          failed = parseInt(match[1]) || 0;
          passed = parseInt(match[2]) || 0;
          total = parseInt(match[3]) || 0;
        }
      }
    } catch (e) {
      console.warn('⚠️  Could not parse test results');
    }

    const successRate = total > 0 ? (passed / total) * 100 : 0;

    return { total, passed, failed, successRate };
  }

  private getCoverageMetrics(): QualityMetrics['coverage'] {
    console.log('📈 Analyzing coverage metrics...');
    
    // Try to read coverage summary if it exists
    const coveragePath = path.join('coverage', 'coverage-summary.json');
    
    if (fs.existsSync(coveragePath)) {
      try {
        const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
        const total = coverage.total;
        
        return {
          lines: total.lines.pct,
          functions: total.functions.pct,
          branches: total.branches.pct,
          statements: total.statements.pct,
        };
      } catch (e) {
        console.warn('⚠️  Could not parse coverage summary');
      }
    }

    return { lines: 0, functions: 0, branches: 0, statements: 0 };
  }

  private getTypeScriptMetrics(): QualityMetrics['typescript'] {
    console.log('🔧 Analyzing TypeScript metrics...');
    
    const tscOutput = this.runCommand('npx tsc --noEmit');
    
    // Count TypeScript errors
    const errorLines = tscOutput.split('\n').filter(line => 
      line.includes('error TS') || line.includes(': error:')
    );
    
    return { errors: errorLines.length };
  }

  private getFileMetrics(): QualityMetrics['files'] {
    console.log('📁 Analyzing file metrics...');
    
    const files = this.runCommand('find src -name "*.ts" -type f').trim().split('\n').filter(f => f);
    let totalLines = 0;
    
    for (const file of files) {
      if (file && fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        totalLines += content.split('\n').length;
      }
    }

    return {
      totalFiles: files.length,
      totalLines,
    };
  }

  private getCurrentMetrics(): QualityMetrics {
    const timestamp = new Date().toISOString();
    
    // Try to get git info
    let commit = '';
    let branch = '';
    
    try {
      commit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim().substring(0, 8);
      branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    } catch (e) {
      // Git not available or not a git repo
    }

    return {
      timestamp,
      commit,
      branch,
      eslint: this.getESLintMetrics(),
      tests: this.getTestMetrics(),
      coverage: this.getCoverageMetrics(),
      typescript: this.getTypeScriptMetrics(),
      files: this.getFileMetrics(),
    };
  }

  private loadMetricsHistory(): QualityMetrics[] {
    if (fs.existsSync(this.metricsFile)) {
      try {
        return JSON.parse(fs.readFileSync(this.metricsFile, 'utf8'));
      } catch (e) {
        console.warn('⚠️  Could not load metrics history');
      }
    }
    return [];
  }

  private saveMetricsHistory(metrics: QualityMetrics[]): void {
    fs.writeFileSync(this.metricsFile, JSON.stringify(metrics, null, 2));
  }

  private generateHtmlReport(metrics: QualityMetrics, history: QualityMetrics[]): void {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SpecGofer Quality Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { font-family: system-ui, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 20px; }
        .metric-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric-value { font-size: 2em; font-weight: bold; margin-bottom: 5px; }
        .metric-label { color: #666; font-size: 0.9em; }
        .chart-container { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px; }
        .success { color: #22c55e; }
        .warning { color: #f59e0b; }
        .error { color: #ef4444; }
        .trend { font-size: 0.8em; margin-top: 5px; }
        .trend.up { color: #ef4444; }
        .trend.down { color: #22c55e; }
        .trend.same { color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 SpecGofer Quality Dashboard</h1>
            <p><strong>Generated:</strong> ${metrics.timestamp}</p>
            ${metrics.commit ? `<p><strong>Commit:</strong> ${metrics.commit} on ${metrics.branch}</p>` : ''}
        </div>

        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-value error">${metrics.eslint.errors}</div>
                <div class="metric-label">ESLint Errors</div>
                <div class="trend">${metrics.eslint.fixableErrors} auto-fixable</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-value warning">${metrics.eslint.warnings}</div>
                <div class="metric-label">ESLint Warnings</div>
                <div class="trend">${metrics.eslint.fixableWarnings} auto-fixable</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-value ${metrics.tests.successRate > 95 ? 'success' : metrics.tests.successRate > 80 ? 'warning' : 'error'}">${metrics.tests.successRate.toFixed(1)}%</div>
                <div class="metric-label">Test Success Rate</div>
                <div class="trend">${metrics.tests.passed}/${metrics.tests.total} tests passing</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-value ${metrics.coverage.lines > 80 ? 'success' : metrics.coverage.lines > 60 ? 'warning' : 'error'}">${metrics.coverage.lines.toFixed(1)}%</div>
                <div class="metric-label">Line Coverage</div>
                <div class="trend">Functions: ${metrics.coverage.functions.toFixed(1)}%</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-value ${metrics.typescript.errors === 0 ? 'success' : 'error'}">${metrics.typescript.errors}</div>
                <div class="metric-label">TypeScript Errors</div>
                <div class="trend">${metrics.typescript.errors === 0 ? 'No type errors!' : 'Needs attention'}</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-value">${metrics.files.totalFiles}</div>
                <div class="metric-label">Source Files</div>
                <div class="trend">${metrics.files.totalLines.toLocaleString()} total lines</div>
            </div>
        </div>

        ${history.length > 1 ? `
        <div class="chart-container">
            <h3>📈 Quality Trends</h3>
            <canvas id="trendsChart" width="400" height="200"></canvas>
        </div>
        ` : ''}

        <div class="chart-container">
            <h3>📊 Coverage Breakdown</h3>
            <canvas id="coverageChart" width="400" height="200"></canvas>
        </div>
    </div>

    <script>
        // Trends Chart
        ${history.length > 1 ? `
        const trendsCtx = document.getElementById('trendsChart').getContext('2d');
        new Chart(trendsCtx, {
            type: 'line',
            data: {
                labels: ${JSON.stringify(history.slice(-10).map(h => new Date(h.timestamp).toLocaleDateString()))},
                datasets: [
                    {
                        label: 'ESLint Errors',
                        data: ${JSON.stringify(history.slice(-10).map(h => h.eslint.errors))},
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    },
                    {
                        label: 'Test Success Rate',
                        data: ${JSON.stringify(history.slice(-10).map(h => h.tests.successRate))},
                        borderColor: '#22c55e',
                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                        yAxisID: 'y1',
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: { beginAtZero: true, title: { display: true, text: 'Errors' } },
                    y1: { type: 'linear', position: 'right', beginAtZero: true, max: 100, title: { display: true, text: 'Success Rate %' } }
                }
            }
        });
        ` : ''}

        // Coverage Chart
        const coverageCtx = document.getElementById('coverageChart').getContext('2d');
        new Chart(coverageCtx, {
            type: 'doughnut',
            data: {
                labels: ['Lines', 'Functions', 'Branches', 'Statements'],
                datasets: [{
                    data: [${metrics.coverage.lines}, ${metrics.coverage.functions}, ${metrics.coverage.branches}, ${metrics.coverage.statements}],
                    backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    </script>
</body>
</html>`;

    fs.writeFileSync(path.join(this.reportsDir, 'dashboard.html'), html);
  }

  public generateReport(): void {
    console.log('🎯 Generating Quality Dashboard...\n');
    
    const currentMetrics = this.getCurrentMetrics();
    const history = this.loadMetricsHistory();
    
    // Add current metrics to history
    history.push(currentMetrics);
    
    // Keep only last 30 entries
    if (history.length > 30) {
      history.splice(0, history.length - 30);
    }
    
    this.saveMetricsHistory(history);
    this.generateHtmlReport(currentMetrics, history);
    
    console.log('\n✅ Quality Dashboard generated!');
    console.log(`📊 Reports saved to: ${this.reportsDir}/`);
    console.log(`🌐 Open dashboard.html in your browser to view the report`);
    console.log('\n📈 Current Quality Summary:');
    console.log(`   ESLint: ${currentMetrics.eslint.errors} errors, ${currentMetrics.eslint.warnings} warnings`);
    console.log(`   Tests: ${currentMetrics.tests.successRate.toFixed(1)}% success rate (${currentMetrics.tests.passed}/${currentMetrics.tests.total})`);
    console.log(`   Coverage: ${currentMetrics.coverage.lines.toFixed(1)}% lines`);
    console.log(`   TypeScript: ${currentMetrics.typescript.errors} errors`);
  }
}

// Run the dashboard generator
const dashboard = new QualityDashboard();
dashboard.generateReport();