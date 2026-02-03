#!/usr/bin/env node

/**
 * Coverage Report Generator
 * 
 * Generates comprehensive test coverage reports and validates
 * against constitutional requirements
 */

const fs = require('fs').promises;
const path = require('path');

async function generateCoverageReport() {
  console.log('📊 Generating Gofer Coverage Report\n');

  const coverageDir = './coverage';
  const coverageFile = path.join(coverageDir, 'coverage-summary.json');

  try {
    // Check if coverage data exists
    const coverageData = JSON.parse(await fs.readFile(coverageFile, 'utf-8'));
    
    console.log('🎯 Coverage Summary:');
    console.log('==================');
    
    const { total } = coverageData;
    
    // Display overall coverage
    console.log(`Lines:      ${total.lines.pct}% (${total.lines.covered}/${total.lines.total})`);
    console.log(`Functions:  ${total.functions.pct}% (${total.functions.covered}/${total.functions.total})`);
    console.log(`Branches:   ${total.branches.pct}% (${total.branches.covered}/${total.branches.total})`);
    console.log(`Statements: ${total.statements.pct}% (${total.statements.covered}/${total.statements.total})`);
    
    console.log('\n');
    
    // Constitutional validation
    const minCoverage = 80;
    const issues = [];
    
    if (total.lines.pct < minCoverage) {
      issues.push(`❌ Line coverage ${total.lines.pct}% below constitutional requirement (${minCoverage}%)`);
    }
    
    if (total.functions.pct < minCoverage) {
      issues.push(`❌ Function coverage ${total.functions.pct}% below constitutional requirement (${minCoverage}%)`);
    }
    
    if (total.branches.pct < minCoverage) {
      issues.push(`❌ Branch coverage ${total.branches.pct}% below constitutional requirement (${minCoverage}%)`);
    }
    
    if (total.statements.pct < minCoverage) {
      issues.push(`❌ Statement coverage ${total.statements.pct}% below constitutional requirement (${minCoverage}%)`);
    }
    
    if (issues.length > 0) {
      console.log('🚨 Constitutional Violations:');
      console.log('============================');
      issues.forEach(issue => console.log(issue));
      console.log('\n');
      
      // Show files with low coverage
      console.log('📋 Files needing attention:');
      console.log('===========================');
      
      for (const [file, data] of Object.entries(coverageData)) {
        if (file === 'total') continue;
        
        const fileData = data;
        if (fileData.lines.pct < minCoverage) {
          console.log(`${file}: ${fileData.lines.pct}% line coverage`);
        }
      }
      
      process.exit(1);
    } else {
      console.log('✅ All coverage requirements met!');
      console.log('🏆 Constitutional compliance: PASSED');
    }
    
    // Generate badges
    await generateCoverageBadges(total);
    
    // Generate detailed report
    await generateDetailedReport(coverageData);
    
    console.log('\n📈 Coverage reports generated:');
    console.log('- HTML Report: ./coverage/index.html');
    console.log('- LCOV Report: ./coverage/lcov.info');
    console.log('- JSON Report: ./coverage/coverage-final.json');
    console.log('- Badge SVGs: ./coverage/badges/');
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Failed to generate coverage report:', errorMessage);
    
    if (errorMessage.includes('ENOENT')) {
      console.log('\n💡 Run tests with coverage first:');
      console.log('   npm run test:coverage');
    }
    
    process.exit(1);
  }
}

async function generateCoverageBadges(total) {
  const badgeDir = './coverage/badges';
  
  try {
    await fs.mkdir(badgeDir, { recursive: true });
    
    // Generate badge SVGs
    const badges = [
      { name: 'lines', value: total.lines.pct },
      { name: 'functions', value: total.functions.pct },
      { name: 'branches', value: total.branches.pct },
      { name: 'statements', value: total.statements.pct }
    ];
    
    for (const badge of badges) {
      const color = badge.value >= 80 ? 'brightgreen' : 
                   badge.value >= 60 ? 'yellow' : 'red';
      
      const badgeUrl = `https://img.shields.io/badge/coverage%20${badge.name}-${badge.value}%25-${color}`;
      const badgeSvg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="104" height="20">
  <linearGradient id="b" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="a">
    <rect width="104" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#a)">
    <path fill="#555" d="M0 0h63v20H0z"/>
    <path fill="${color === 'brightgreen' ? '#4c1' : color === 'yellow' ? '#dfb317' : '#e05d44'}" d="M63 0h41v20H63z"/>
    <path fill="url(#b)" d="M0 0h104v20H0z"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="110">
    <text x="325" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="530">coverage</text>
    <text x="325" y="140" transform="scale(.1)" textLength="530">coverage</text>
    <text x="825" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="310">${badge.value}%</text>
    <text x="825" y="140" transform="scale(.1)" textLength="310">${badge.value}%</text>
  </g>
</svg>`;
      
      await fs.writeFile(path.join(badgeDir, `${badge.name}.svg`), badgeSvg);
    }
    
    console.log('✅ Coverage badges generated');
  } catch (error) {
    console.warn('⚠️  Failed to generate badges:', error instanceof Error ? error.message : 'Unknown error');
  }
}

async function generateDetailedReport(coverageData) {
  try {
    const reportPath = './coverage/detailed-report.md';
    
    let report = `# Gofer Test Coverage Report

Generated on: ${new Date().toISOString()}

## Overall Coverage

| Metric | Coverage | Covered | Total |
|--------|----------|---------|-------|
| Lines | ${coverageData.total.lines.pct}% | ${coverageData.total.lines.covered} | ${coverageData.total.lines.total} |
| Functions | ${coverageData.total.functions.pct}% | ${coverageData.total.functions.covered} | ${coverageData.total.functions.total} |
| Branches | ${coverageData.total.branches.pct}% | ${coverageData.total.branches.covered} | ${coverageData.total.branches.total} |
| Statements | ${coverageData.total.statements.pct}% | ${coverageData.total.statements.covered} | ${coverageData.total.statements.total} |

## Constitutional Compliance

✅ **Requirement**: Minimum 80% coverage across all metrics
`;

    const minCoverage = 80;
    if (coverageData.total.lines.pct >= minCoverage && 
        coverageData.total.functions.pct >= minCoverage &&
        coverageData.total.branches.pct >= minCoverage &&
        coverageData.total.statements.pct >= minCoverage) {
      report += '\n✅ **Status**: COMPLIANT - All metrics meet constitutional requirements\n';
    } else {
      report += '\n❌ **Status**: NON-COMPLIANT - Some metrics below constitutional requirements\n';
    }

    report += `
## File-by-File Coverage

| File | Lines | Functions | Branches | Statements |
|------|-------|-----------|----------|------------|
`;

    for (const [file, data] of Object.entries(coverageData)) {
      if (file === 'total') continue;
      
      const fileData = data;
      const fileName = file.replace(process.cwd(), '').replace(/^\//, '');
      
      report += `| ${fileName} | ${fileData.lines.pct}% | ${fileData.functions.pct}% | ${fileData.branches.pct}% | ${fileData.statements.pct}% |\n`;
    }

    report += `
## Recommendations

- Focus testing efforts on files with coverage below 80%
- Add integration tests for complex component interactions
- Implement E2E tests for critical user journeys
- Consider property-based testing for complex algorithms

## Links

- [HTML Coverage Report](./index.html)
- [LCOV Report](./lcov.info)
- [Constitution Document](../.specify/memory/constitution.md)
`;

    await fs.writeFile(reportPath, report);
    console.log('✅ Detailed report generated');
  } catch (error) {
    console.warn('⚠️  Failed to generate detailed report:', error instanceof Error ? error.message : 'Unknown error');
  }
}

// Run the report generator
if (require.main === module) {
  generateCoverageReport().catch(console.error);
}

module.exports = { generateCoverageReport };