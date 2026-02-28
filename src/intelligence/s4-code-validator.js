/**
 * S4Ai Code Validator - Pre-PR validation for autonomous code generation
 * 
 * This module runs automatically before S4Ai creates PRs to ensure:
 * - Correct file paths
 * - Valid ESM syntax
 * - No hardcoded secrets
 * - Proper project structure references
 */

import { validatePaths, verifyCriticalFiles, PROJECT_PATHS } from '../../../../src/validators/path-validator.js';
import fs from 'fs';
import path from 'path';

/**
 * Validate code changes before creating a PR
 * @param {object} changes - Object with file paths as keys and content as values
 * @returns {object} Validation result
 */
export async function validateCodeChanges(changes) {
  const results = {
    valid: true,
    errors: [],
    warnings: [],
    files: {}
  };
  
  // First, verify project structure is intact
  const structureCheck = verifyCriticalFiles();
  if (!structureCheck.valid) {
    results.valid = false;
    results.errors.push({
      type: 'structure',
      message: 'Critical project files missing',
      missing: structureCheck.missing
    });
  }
  
  // Validate each file
  for (const [filePath, content] of Object.entries(changes)) {
    const fileResults = {
      path: filePath,
      valid: true,
      errors: [],
      warnings: []
    };
    
    // 1. Path validation
    const pathValidation = validatePaths(content);
    if (!pathValidation.valid) {
      fileResults.valid = false;
      fileResults.errors.push(...pathValidation.errors);
      results.valid = false;
    }
    fileResults.warnings.push(...pathValidation.warnings);
    
    // 2. ESM validation
    const esmErrors = validateESM(content, filePath);
    if (esmErrors.length > 0) {
      fileResults.valid = false;
      fileResults.errors.push(...esmErrors);
      results.valid = false;
    }
    
    // 3. Secret leak detection
    const secretWarnings = detectSecrets(content);
    if (secretWarnings.length > 0) {
      fileResults.warnings.push(...secretWarnings);
    }
    
    // 4. Admin dashboard specific checks
    if (filePath.includes('apps/web/admin')) {
      const adminErrors = validateAdminChanges(filePath, content);
      if (adminErrors.length > 0) {
        fileResults.valid = false;
        fileResults.errors.push(...adminErrors);
        results.valid = false;
      }
    }
    
    // 5. API server specific checks
    if (filePath.includes('apps/api')) {
      const apiErrors = validateAPIChanges(filePath, content);
      if (apiErrors.length > 0) {
        fileResults.valid = false;
        fileResults.errors.push(...apiErrors);
        results.valid = false;
      }
    }
    
    results.files[filePath] = fileResults;
    results.errors.push(...fileResults.errors);
    results.warnings.push(...fileResults.warnings);
  }
  
  return results;
}

/**
 * Validate ESM syntax
 */
function validateESM(code, filePath) {
  const errors = [];
  
  // Check for CommonJS
  if (code.includes('require(')) {
    errors.push({
      type: 'esm',
      message: 'CommonJS require() detected - use ESM import',
      file: filePath
    });
  }
  
  if (code.includes('module.exports')) {
    errors.push({
      type: 'esm',
      message: 'CommonJS module.exports detected - use ESM export',
      file: filePath
    });
  }
  
  // Check for imports without .js extension (excluding node modules)
  const importRegex = /import\s+.*?\s+from\s+['"](\.[^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(code)) !== null) {
    const importPath = match[1];
    if (!importPath.endsWith('.js') && !importPath.endsWith('.json')) {
      errors.push({
        type: 'esm',
        message: `Import missing .js extension: ${importPath}`,
        file: filePath,
        suggestion: importPath + '.js'
      });
    }
  }
  
  return errors;
}

/**
 * Detect potential secret leaks
 */
function detectSecrets(code) {
  const warnings = [];
  const secretPatterns = [
    { pattern: /sk-[a-zA-Z0-9]{48}/, name: 'OpenAI API key' },
    { pattern: /sk-proj-[a-zA-Z0-9-_]{100,}/, name: 'OpenAI project key' },
    { pattern: /ghp_[a-zA-Z0-9]{36}/, name: 'GitHub PAT' },
    { pattern: /pk_live_[a-zA-Z0-9]{24,}/, name: 'Stripe live key' },
    { pattern: /sk_live_[a-zA-Z0-9]{24,}/, name: 'Stripe secret key' },
    { pattern: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/, name: 'UUID (possible token)' },
  ];
  
  for (const { pattern, name } of secretPatterns) {
    if (pattern.test(code)) {
      warnings.push({
        type: 'security',
        message: `Potential ${name} detected in code`,
        severity: 'critical'
      });
    }
  }
  
  return warnings;
}

/**
 * Validate admin dashboard changes
 */
function validateAdminChanges(filePath, content) {
  const errors = [];
  
  // Ensure Vite config points to src/index.html
  if (filePath.endsWith('vite.config.js')) {
    if (!content.includes('src/index.html')) {
      errors.push({
        type: 'config',
        message: 'Vite config must use src/index.html as entry point',
        file: filePath
      });
    }
  }
  
  // Ensure entry point is in src/
  if (filePath.includes('/index.html') && !filePath.includes('/src/')) {
    errors.push({
      type: 'structure',
      message: 'Admin entry point must be in src/ directory',
      file: filePath,
      expected: 'apps/web/admin/src/index.html'
    });
  }
  
  // Check for proper app.js import
  if (filePath.endsWith('main.js') && !content.includes('./app.js')) {
    errors.push({
      type: 'imports',
      message: 'main.js must import ./app.js',
      file: filePath
    });
  }
  
  return errors;
}

/**
 * Validate API changes
 */
function validateAPIChanges(filePath, content) {
  const errors = [];
  
  // Ensure server.js is at apps/api/server.js
  if (filePath.endsWith('server.js') && !filePath.includes('apps/api/server.js')) {
    errors.push({
      type: 'structure',
      message: 'API server must be at apps/api/server.js',
      file: filePath
    });
  }
  
  // Check database imports use correct path
  if (content.includes('pool.js') || content.includes('database')) {
    if (!content.includes('src/db/pool.js') && !content.includes('./db/pool.js')) {
      errors.push({
        type: 'imports',
        message: 'Database imports should use src/db/pool.js',
        file: filePath
      });
    }
  }
  
  return errors;
}

/**
 * Generate validation report
 */
export function generateValidationReport(results) {
  let report = '# S4Ai Code Validation Report\n\n';
  report += `**Status:** ${results.valid ? '✅ PASSED' : '❌ FAILED'}\n`;
  report += `**Errors:** ${results.errors.length}\n`;
  report += `**Warnings:** ${results.warnings.length}\n\n`;
  
  if (results.errors.length > 0) {
    report += '## Errors\n\n';
    results.errors.forEach((err, i) => {
      report += `${i + 1}. **${err.type}**: ${err.message}\n`;
      if (err.file) report += `   - File: \`${err.file}\`\n`;
      if (err.suggestion) report += `   - Suggestion: \`${err.suggestion}\`\n`;
      report += '\n';
    });
  }
  
  if (results.warnings.length > 0) {
    report += '## Warnings\n\n';
    results.warnings.forEach((warn, i) => {
      report += `${i + 1}. **${warn.type}**: ${warn.message}\n`;
      if (warn.severity) report += `   - Severity: ${warn.severity}\n`;
      report += '\n';
    });
  }
  
  return report;
}

/**
 * Hook for S4Ai autonomous system to validate before PR creation
 */
export async function prePRValidation(prData) {
  console.log('🔍 Running S4Ai code validation...');
  
  const changes = {};
  for (const file of prData.files || []) {
    if (file.content) {
      changes[file.path] = file.content;
    } else if (file.path && fs.existsSync(file.path)) {
      changes[file.path] = fs.readFileSync(file.path, 'utf-8');
    }
  }
  
  const results = await validateCodeChanges(changes);
  
  if (!results.valid) {
    console.log('❌ Validation failed:');
    console.log(generateValidationReport(results));
    return {
      approved: false,
      reason: 'Code validation failed',
      report: generateValidationReport(results)
    };
  }
  
  console.log('✅ Validation passed');
  if (results.warnings.length > 0) {
    console.log(`⚠️  ${results.warnings.length} warnings detected`);
  }
  
  return {
    approved: true,
    warnings: results.warnings,
    report: generateValidationReport(results)
  };
}
