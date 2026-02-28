// Self-Documenting Code Generator
// Automatically generate docstrings, README sections, API docs during synthesis
import EventEmitter from 'events';
import { execSync } from 'child_process';
import logger from '../utils/logger.js';


class CodeDocumenter extends EventEmitter {
  constructor(config = {}) {
    super();
    this.documentationStyle = config.style || 'jsdoc';
    this.includeExamples = config.includeExamples !== false;
    this.includeTypes = config.includeTypes !== false;
    this.generatedDocs = [];
    this.codeMetrics = {};
  }

  // Generate JSDoc comments for a function
  generateFunctionDoc(functionDef) {
    const {
      name = 'unknownFunction',
      description = 'Function description',
      params = [],
      returns = 'void',
      examples = [],
      isAsync = false,
      complexity = 'O(n)'
    } = functionDef;

    let doc = `/**\n * ${description}\n`;

    if (params && params.length > 0) {
      doc += ` * \n`;
      for (const param of params) {
        doc += ` * @param {${param.type || 'any'}} ${param.name} - ${param.description || 'Parameter description'}\n`;
      }
    }

    doc += ` * @returns {${returns}} Result description\n`;

    if (isAsync) {
      doc += ` * @async\n`;
    }

    doc += ` * @complexity ${complexity}\n`;

    if (this.includeExamples && examples.length > 0) {
      doc += ` * @example\n`;
      for (const example of examples) {
        doc += ` * // ${example.description || 'Example usage'}\n`;
        doc += ` * ${example.code}\n`;
      }
    }

    doc += ` */`;

    return doc;
  }

  // Generate class documentation
  generateClassDoc(classDef) {
    const {
      name = 'UnknownClass',
      description = 'Class description',
      extends: parentClass = null,
      methods = [],
      properties = [],
      purpose = ''
    } = classDef;

    let doc = `/**\n * ${description}\n`;
    doc += ` * \n`;
    doc += ` * @class ${name}\n`;

    if (parentClass) {
      doc += ` * @extends ${parentClass}\n`;
    }

    if (purpose) {
      doc += ` * @purpose ${purpose}\n`;
    }

    if (properties && properties.length > 0) {
      doc += ` * \n`;
      doc += ` * @property {${properties[0].type || 'any'}} ${properties[0].name} - ${properties[0].description || 'Property description'}\n`;
    }

    if (methods && methods.length > 0) {
      doc += ` * \n`;
      doc += ` * @method ${methods.map(m => m.name + '()').join(', ')}\n`;
    }

    doc += ` * \n * @example\n * const instance = new ${name}();\n`;
    doc += ` */`;

    return doc;
  }

  // Generate README section for module
  generateREADMESection(moduleDef) {
    const {
      name = 'Module',
      description = '',
      features = [],
      installation = '',
      usage = '',
      api = [],
      examples = []
    } = moduleDef;

    let readme = `\n## ${name}\n\n`;
    readme += `${description}\n\n`;

    if (features && features.length > 0) {
      readme += `### Features\n\n`;
      for (const feature of features) {
        readme += `- ${feature}\n`;
      }
      readme += `\n`;
    }

    if (installation) {
      readme += `### Installation\n\n\`\`\`bash\n${installation}\n\`\`\`\n\n`;
    }

    if (usage) {
      readme += `### Quick Start\n\n\`\`\`javascript\n${usage}\n\`\`\`\n\n`;
    }

    if (api && api.length > 0) {
      readme += `### API Reference\n\n`;
      for (const endpoint of api) {
        readme += `#### ${endpoint.method || 'method'} \`${endpoint.path || 'endpoint'}\`\n\n`;
        readme += `${endpoint.description || 'Description'}\n\n`;

        if (endpoint.params) {
          readme += `**Parameters:**\n`;
          for (const param of endpoint.params) {
            readme += `- \`${param.name}\` (${param.type}): ${param.description}\n`;
          }
          readme += `\n`;
        }

        if (endpoint.returns) {
          readme += `**Returns:** ${endpoint.returns}\n\n`;
        }
      }
    }

    if (examples && examples.length > 0) {
      readme += `### Examples\n\n`;
      for (const example of examples) {
        readme += `#### ${example.title}\n\n\`\`\`javascript\n${example.code}\n\`\`\`\n\n`;
      }
    }

    return readme;
  }

  // Generate TypeScript definitions
  generateTypeDefinitions(moduleDef) {
    const {
      name = 'Module',
      interfaces = [],
      types = [],
      exports = []
    } = moduleDef;

    let defs = `// Type definitions for ${name}\n\n`;

    if (interfaces && interfaces.length > 0) {
      for (const iface of interfaces) {
        defs += `export interface ${iface.name} {\n`;
        for (const prop of iface.properties || []) {
          defs += `  ${prop.name}${prop.optional ? '?' : ''}: ${prop.type};\n`;
        }
        defs += `}\n\n`;
      }
    }

    if (types && types.length > 0) {
      for (const type of types) {
        defs += `export type ${type.name} = ${type.definition};\n\n`;
      }
    }

    if (exports && exports.length > 0) {
      defs += `export default class ${name} {\n`;
      for (const method of exports) {
        defs += `  ${method.name}(`;
        defs += (method.params || []).map(p => `${p.name}: ${p.type}`).join(', ');
        defs += `): ${method.returns};\n`;
      }
      defs += `}\n`;
    }

    return defs;
  }

  // Generate API documentation (OpenAPI-like)
  generateAPIDocumentation(apiDef) {
    const {
      title = 'API',
      version = '1.0.0',
      description = '',
      endpoints = []
    } = apiDef;

    let doc = `# ${title} v${version}\n\n`;
    doc += `${description}\n\n`;

    for (const endpoint of endpoints) {
      doc += `## ${endpoint.method || 'GET'} ${endpoint.path}\n\n`;
      doc += `${endpoint.description || ''}\n\n`;

      if (endpoint.request) {
        doc += `### Request\n\n`;
        doc += `\`\`\`json\n${JSON.stringify(endpoint.request, null, 2)}\n\`\`\`\n\n`;
      }

      if (endpoint.response) {
        doc += `### Response\n\n`;
        doc += `\`\`\`json\n${JSON.stringify(endpoint.response, null, 2)}\n\`\`\`\n\n`;
      }

      if (endpoint.errors) {
        doc += `### Error Codes\n\n`;
        for (const error of endpoint.errors) {
          doc += `- **${error.code}**: ${error.message}\n`;
        }
        doc += `\n`;
      }
    }

    return doc;
  }

  // Generate test documentation
  generateTestDocumentation(testDef) {
    const {
      moduleName = 'Module',
      testCases = [],
      coverage = {}
    } = testDef;

    let doc = `# ${moduleName} - Test Documentation\n\n`;

    doc += `## Coverage Summary\n\n`;
    doc += `- Lines: ${coverage.lines || 'N/A'}\n`;
    doc += `- Functions: ${coverage.functions || 'N/A'}\n`;
    doc += `- Branches: ${coverage.branches || 'N/A'}\n\n`;

    doc += `## Test Cases\n\n`;
    for (const test of testCases) {
      doc += `### ${test.name}\n\n`;
      doc += `${test.description || ''}\n\n`;

      if (test.setup) {
        doc += `**Setup:**\n\`\`\`\n${test.setup}\n\`\`\`\n\n`;
      }

      if (test.steps) {
        doc += `**Steps:**\n`;
        for (let i = 0; i < test.steps.length; i++) {
          doc += `${i + 1}. ${test.steps[i]}\n`;
        }
        doc += `\n`;
      }

      if (test.expected) {
        doc += `**Expected Result:** ${test.expected}\n\n`;
      }
    }

    return doc;
  }

  // Analyze code and extract metrics
  analyzeCode(code) {
    const lines = code.split('\n').length;
    const functions = (code.match(/function|=>|async/gi) || []).length;
    const classes = (code.match(/class\s+/gi) || []).length;
    const comments = (code.match(/\/\/|\/\*/gi) || []).length;
    const commentRatio = (comments / lines * 100).toFixed(1);

    return {
      lines,
      functions,
      classes,
      comments,
      commentRatio: parseFloat(commentRatio),
      complexity: this.estimateComplexity(code)
    };
  }

  estimateComplexity(code) {
    const loops = (code.match(/for|while|forEach/gi) || []).length;
    const conditionals = (code.match(/if|else|switch|case/gi) || []).length;
    const complexity = 1 + loops + conditionals; // McCabe complexity (simplified)

    return {
      cyclomatic: complexity,
      rating: complexity <= 5 ? 'low' : complexity <= 10 ? 'medium' : 'high'
    };
  }

  // Generate comprehensive module documentation
  async generateComprehensiveDocs(module) {
    logger.info(`[CodeDocumenter] Generating comprehensive documentation for ${module.name}...`);

    const docs = {
      timestamp: Date.now(),
      moduleName: module.name,
      jsdoc: this.generateClassDoc(module),
      readme: this.generateREADMESection(module),
      typedefs: this.generateTypeDefinitions(module),
      api: this.generateAPIDocumentation(module.api || {}),
      tests: this.generateTestDocumentation(module.tests || {}),
      metrics: this.analyzeCode(module.code || '')
    };

    this.generatedDocs.push(docs);
    this.emit('docs:generated', { moduleName: module.name });

    return docs;
  }

  // Export documentation bundle
  exportDocumentation(format = 'markdown') {
    if (format === 'markdown') {
      return this.generatedDocs.map(doc => doc.readme).join('\n');
    } else if (format === 'html') {
      return `<html><body>${this.generatedDocs.map(doc => doc.readme).join('<hr>')}</body></html>`;
    } else if (format === 'json') {
      return JSON.stringify(this.generatedDocs, null, 2);
    }

    return '';
  }

  getDocumentationMetrics() {
    const totalDocs = this.generatedDocs.length;
    const totalLines = this.generatedDocs.reduce((sum, doc) => sum + (doc.metrics?.lines || 0), 0);
    const avgCommentRatio = totalDocs > 0 
      ? (this.generatedDocs.reduce((sum, doc) => sum + (doc.metrics?.commentRatio || 0), 0) / totalDocs).toFixed(1)
      : 0;

    return {
      totalModumented: totalDocs,
      totalCodeLines: totalLines,
      avgCommentRatio: parseFloat(avgCommentRatio),
      coverage: totalDocs > 0 ? '100%' : '0%'
    };
  }
}

export default CodeDocumenter;
export { CodeDocumenter };

// Auto-execute if run directly
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  logger.info('=== S4Ai Self-Documenting Code Generator ===\n');
  
  const documenter = new CodeDocumenter({ style: 'jsdoc' });

  (async () => {
    // Document a module
    const module1 = {
      name: 'SwarmOrchestrator',
      description: 'Manages multi-agent swarm coordination and consensus',
      purpose: 'Enable autonomous swarm-based task distribution and decision making',
      features: [
        'Dynamic agent spawning',
        'Task consensus mechanism',
        'Health monitoring',
        'Adaptive scaling'
      ],
      installation: 'npm install swarm-orchestrator',
      usage: 'const swarm = new SwarmOrchestrator(); swarm.spawnAgent(...);',
      api: [
        {
          method: 'spawnAgent',
          path: 'spawnAgent(type, config)',
          description: 'Create a new agent of specified type',
          params: [
            { name: 'type', type: 'string', description: 'Agent type (research, code-review, etc)' },
            { name: 'config', type: 'object', description: 'Agent configuration' }
          ],
          returns: 'Agent'
        },
        {
          method: 'submitTask',
          path: 'submitTask(task)',
          description: 'Submit a task for distributed execution',
          params: [
            { name: 'task', type: 'object', description: 'Task specification' }
          ],
          returns: 'Promise<Result>'
        }
      ],
      examples: [
        {
          title: 'Creating a Research Agent',
          code: 'const agent = swarm.spawnAgent("research", { focus: "optimization" });'
        }
      ],
      properties: [
        { name: 'agents', type: 'Map', description: 'Active agents' }
      ],
      interfaces: [
        {
          name: 'Agent',
          properties: [
            { name: 'id', type: 'string' },
            { name: 'type', type: 'string' },
            { name: 'health', type: 'number' }
          ]
        }
      ],
      types: [
        {
          name: 'TaskResult',
          definition: '{ success: boolean; data: any; duration: number; }'
        }
      ],
      code: `
class SwarmOrchestrator {
  spawnAgent(type, config) {
    const agent = new SwarmAgent(type, config);
    this.agents.set(agent.id, agent);
    return agent;
  }
  
  async submitTask(task) {
    for (const agent of this.agents.values()) {
      if (agent.canHandle(task)) {
        return await agent.execute(task);
      }
    }
  }
}
      `,
      tests: {
        moduleName: 'SwarmOrchestrator',
        coverage: { lines: '95%', functions: '98%', branches: '90%' },
        testCases: [
          {
            name: 'Agent Spawning',
            description: 'Verify agents are correctly spawned',
            setup: 'const swarm = new SwarmOrchestrator();',
            steps: ['Spawn research agent', 'Verify agent exists', 'Check agent health'],
            expected: 'Agent created with health = 100'
          }
        ]
      }
    };

    // Generate comprehensive documentation
    const docs = await documenter.generateComprehensiveDocs(module1);

    logger.info('=== Generated JSDoc ===');
    logger.info(docs.jsdoc);

    logger.info('\n=== Generated README ===');
    logger.info(docs.readme);

    logger.info('\n=== Generated TypeScript Definitions ===');
    logger.info(docs.typedefs);

    logger.info('\n=== Code Metrics ===');
    logger.info(JSON.stringify(docs.metrics, null, 2));

    logger.info('\n=== Documentation Metrics ===');
    logger.info(JSON.stringify(documenter.getDocumentationMetrics(), null, 2));
  })();
}
