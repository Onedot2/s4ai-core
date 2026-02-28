/**
 * S4Ai Autonomous System Integration - Path Validation Hook
 * 
 * This file integrates the path validator into the autonomous system
 * to ensure all generated code uses correct paths before creating PRs.
 */

import { validatePaths, verifyCriticalFiles, PROJECT_PATHS } from '../../../../src/validators/path-validator.js';
import { prePRValidation } from './s4-code-validator.js';

/**
 * Inject validation into S4 Autonomy System
 * Call this during system initialization
 */
export async function integrateValidation(autonomySystem) {
  console.log('[S4Ai] Integrating path validation into autonomy system...');
  
  // Verify project structure on startup
  const structureCheck = verifyCriticalFiles();
  if (!structureCheck.valid) {
    console.error('[S4Ai] Critical files missing:');
    structureCheck.missing.forEach(m => {
      console.error(`  - ${m.name}: ${m.relativePath}`);
    });
  } else {
    console.log('[S4Ai] ✅ Project structure verified');
  }
  
  // Store original PR creation method
  const originalCreatePR = autonomySystem.createPullRequest?.bind(autonomySystem);
  
  // Wrap PR creation with validation
  if (originalCreatePR) {
    autonomySystem.createPullRequest = async function(title, description, changes) {
      console.log('[S4Ai] Validating code before PR creation...');
      
      const validation = await prePRValidation({ files: changes });
      
      if (!validation.approved) {
        console.error('[S4Ai] ❌ PR validation failed:', validation.reason);
        console.error(validation.report);
        
        // Log to knowledge base
        await logValidationFailure({
          title,
          reason: validation.reason,
          report: validation.report
        });
        
        return {
          success: false,
          error: 'Code validation failed',
          details: validation.report
        };
      }
      
      if (validation.warnings && validation.warnings.length > 0) {
        console.warn(`[S4Ai] ⚠️  ${validation.warnings.length} warnings in PR`);
        description += '\n\n## Code Validation Warnings\n' + validation.report;
      }
      
      console.log('[S4Ai] ✅ Validation passed, creating PR...');
      return originalCreatePR(title, description, changes);
    };
    
    console.log('[S4Ai] ✅ PR validation hook installed');
  }
  
  // Make paths available to autonomous system
  autonomySystem.PROJECT_PATHS = PROJECT_PATHS;
  autonomySystem.validatePaths = validatePaths;
  
  return autonomySystem;
}

/**
 * Log validation failures to knowledge base
 */
async function logValidationFailure(failure) {
  const logPath = path.join(
    PROJECT_PATHS.api.knowledgeBase,
    'validation-failures.jsonl'
  );
  
  const logEntry = JSON.stringify({
    timestamp: new Date().toISOString(),
    ...failure
  }) + '\n';
  
  try {
    await fs.appendFile(logPath, logEntry);
  } catch (err) {
    console.error('[S4Ai] Failed to log validation failure:', err.message);
  }
}

/**
 * Helper: Get correct path for a component
 * Autonomous system can call this to get canonical paths
 */
export function getCorrectPath(component) {
  const parts = component.split('.');
  let current = PROJECT_PATHS;
  
  for (const part of parts) {
    if (!current[part]) {
      console.warn(`[S4Ai] Unknown path component: ${component}`);
      return null;
    }
    current = current[part];
  }
  
  return typeof current === 'string' ? current : null;
}

/**
 * Helper: Validate a single file
 */
export function validateFile(filePath, content) {
  const result = validatePaths(content);
  
  if (!result.valid) {
    console.error(`[S4Ai] Path validation failed for ${filePath}:`);
    result.errors.forEach(err => {
      console.error(`  - ${err.pattern}: ${err.reason}`);
      console.error(`    Correct: ${err.correct}`);
    });
  }
  
  if (result.warnings.length > 0) {
    console.warn(`[S4Ai] Warnings for ${filePath}:`);
    result.warnings.forEach(warn => {
      console.warn(`  - ${warn.message}`);
    });
  }
  
  return result;
}

export default {
  integrateValidation,
  getCorrectPath,
  validateFile
};
