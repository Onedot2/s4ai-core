// Natural Language Intent Processing System
// Parse English commands, extract intent, bind parameters, execute actions
import EventEmitter from 'events';
import logger from '../utils/logger.js';


class IntentPattern {
  constructor(pattern, intent, parameterMap = {}) {
    this.pattern = pattern; // Regex pattern
    this.intent = intent;
    this.parameterMap = parameterMap; // Maps groups to parameter names
    this.matchCount = 0;
    this.successCount = 0;
  }

  match(text) {
    const regex = new RegExp(this.pattern, 'i');
    const match = text.match(regex);
    
    if (match) {
      this.matchCount++;
      const parameters = {};
      
      for (const [groupIndex, paramName] of Object.entries(this.parameterMap)) {
        parameters[paramName] = match[parseInt(groupIndex)];
      }
      
      return { intent: this.intent, parameters, confidence: 0.8 + (this.successCount / this.matchCount) * 0.2 };
    }
    
    return null;
  }

  recordSuccess() {
    this.successCount++;
  }
}

class NLPIntentProcessor extends EventEmitter {
  constructor(config = {}) {
    super();
    this.patterns = [];
    this.contextMemory = {};
    this.entityExtractor = config.entityExtractor || this.defaultEntityExtractor;
    this.actionHandlers = new Map();
    this.sessionHistory = [];
    this.maxContextMemory = config.maxContextMemory || 100;
    this.language = config.language || 'en';
  }

  registerPattern(pattern, intent, parameterMap) {
    const intentPattern = new IntentPattern(pattern, intent, parameterMap);
    this.patterns.push(intentPattern);
    this.emit('pattern:registered', { intent, pattern });
  }

  registerActionHandler(intent, handler) {
    this.actionHandlers.set(intent, handler);
    this.emit('handler:registered', { intent });
  }

  async parseIntent(userInput) {
    logger.info(`[NLPIntentProcessor] Parsing: "${userInput}"`);
    
    // Clean input
    const cleanInput = userInput.trim().toLowerCase();

    // Try to match against patterns (ordered by specificity)
    for (const pattern of this.patterns.sort((a, b) => b.confidence - a.confidence)) {
      const match = pattern.match(cleanInput);
      
      if (match) {
        // Extract entities from matched parameters
        const entities = await this.extractEntities(userInput, match.parameters);
        
        const intent = {
          text: userInput,
          intent: match.intent,
          parameters: match.parameters,
          entities,
          confidence: match.confidence,
          timestamp: Date.now()
        };

        this.addToContextMemory(intent);
        this.emit('intent:parsed', intent);

        return intent;
      }
    }

    // No pattern matched, try to understand from context
    const contextIntent = await this.inferFromContext(cleanInput);
    
    if (contextIntent) {
      this.addToContextMemory(contextIntent);
      return contextIntent;
    }

    this.emit('intent:unknown', { text: userInput });
    return { intent: 'unknown', text: userInput, confidence: 0 };
  }

  async extractEntities(text, parameters) {
    const entities = {};

    for (const [key, value] of Object.entries(parameters)) {
      const entityType = await this.identifyEntityType(key, value);
      entities[key] = {
        value,
        type: entityType,
        confidence: 0.85
      };
    }

    return entities;
  }

  async identifyEntityType(key, value) {
    const patterns = {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      url: /^https?:\/\/.+/,
      date: /^\d{4}-\d{2}-\d{2}$/,
      number: /^\d+$/,
      boolean: /^(yes|no|true|false)$/i
    };

    for (const [type, regex] of Object.entries(patterns)) {
      if (regex.test(value)) return type;
    }

    return 'string';
  }

  async inferFromContext(text) {
    if (this.sessionHistory.length === 0) return null;

    // Get last intent context
    const lastIntent = this.sessionHistory[this.sessionHistory.length - 1];

    // Simple continuation detection
    const continuationPatterns = [
      { pattern: /^(and|also|additionally)/, intent: 'continue' },
      { pattern: /^(what about|how about)/, intent: 'expand' },
      { pattern: /^(change|update|modify)/, intent: 'modify_last' }
    ];

    for (const { pattern, intent } of continuationPatterns) {
      if (pattern.test(text)) {
        return {
          intent,
          parentIntent: lastIntent.intent,
          text,
          confidence: 0.6,
          timestamp: Date.now()
        };
      }
    }

    return null;
  }

  addToContextMemory(intent) {
    this.sessionHistory.push({
      ...intent,
      remembered: true
    });

    // Store in context memory
    this.contextMemory[intent.intent] = {
      lastUsed: Date.now(),
      count: (this.contextMemory[intent.intent]?.count || 0) + 1,
      parameters: intent.parameters
    };

    // Trim if exceeds max size
    if (this.sessionHistory.length > this.maxContextMemory) {
      this.sessionHistory.shift();
    }
  }

  async executeIntent(intent) {
    const handler = this.actionHandlers.get(intent.intent);

    if (!handler) {
      this.emit('handler:missing', { intent: intent.intent });
      return {
        success: false,
        error: `No handler for intent: ${intent.intent}`
      };
    }

    try {
      const result = await handler(intent.parameters, intent.entities);
      
      // Update pattern success score
      const pattern = this.patterns.find(p => p.intent === intent.intent);
      if (pattern) pattern.recordSuccess();

      this.emit('intent:executed', {
        intent: intent.intent,
        result,
        duration: Date.now() - intent.timestamp
      });

      return { success: true, result };
    } catch (error) {
      this.emit('intent:error', { intent: intent.intent, error: error.message });
      return { success: false, error: error.message };
    }
  }

  async processCommand(userInput) {
    const intent = await this.parseIntent(userInput);
    
    if (intent.confidence > 0.5) {
      return await this.executeIntent(intent);
    } else {
      return {
        success: false,
        error: 'Intent confidence too low',
        confidence: intent.confidence
      };
    }
  }

  defaultEntityExtractor() {
    // Base implementation can be extended
    return {};
  }

  getContextSummary() {
    const usedIntents = Object.entries(this.contextMemory)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5);

    return {
      sessionLength: this.sessionHistory.length,
      topIntents: usedIntents.map(([intent, stats]) => ({
        intent,
        count: stats.count,
        lastUsed: stats.lastUsed
      })),
      memory: this.contextMemory
    };
  }

  clearContext() {
    this.contextMemory = {};
    this.sessionHistory = [];
    this.emit('context:cleared');
  }

  getMetrics() {
    const totalMatches = this.patterns.reduce((sum, p) => sum + p.matchCount, 0);
    const totalSuccesses = this.patterns.reduce((sum, p) => sum + p.successCount, 0);

    return {
      totalPatterns: this.patterns.length,
      totalMatches,
      totalSuccesses,
      successRate: totalMatches > 0 ? (totalSuccesses / totalMatches * 100).toFixed(1) + '%' : '0%',
      sessionLength: this.sessionHistory.length,
      contextSize: Object.keys(this.contextMemory).length
    };
  }
}

class ConversationSession extends EventEmitter {
  constructor(processor) {
    super();
    this.processor = processor;
    this.conversation = [];
    this.sessionId = `session-${Date.now()}`;
    this.startTime = Date.now();
    this.state = 'active';
  }

  async addUserMessage(text) {
    const message = { role: 'user', text, timestamp: Date.now() };
    this.conversation.push(message);

    const result = await this.processor.processCommand(text);

    const assistantMessage = {
      role: 'assistant',
      text: result.success ? 'Command executed successfully' : `Error: ${result.error}`,
      result,
      timestamp: Date.now()
    };

    this.conversation.push(assistantMessage);
    this.emit('message:added', assistantMessage);

    return assistantMessage;
  }

  getConversationHistory() {
    return {
      sessionId: this.sessionId,
      duration: Date.now() - this.startTime,
      messages: this.conversation,
      state: this.state
    };
  }

  async endSession() {
    this.state = 'ended';
    this.emit('session:ended', {
      sessionId: this.sessionId,
      duration: Date.now() - this.startTime,
      messageCount: this.conversation.length
    });
  }
}

export default NLPIntentProcessor;
export { IntentPattern, ConversationSession };

// Auto-execute if run directly
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  logger.info('=== S4Ai Natural Language Intent Processing ===\n');
  
  const processor = new NLPIntentProcessor();

  // Register intent patterns
  processor.registerPattern(
    /^(create|generate)\s+(a\s+)?(.*?)\s+(for|in)\s+(.*?)$/,
    'create',
    { 3: 'objectType', 5: 'target' }
  );

  processor.registerPattern(
    /^(analyze|check)\s+(the\s+)?(.*?)\s+(for|in)\s+(.*?)$/,
    'analyze',
    { 3: 'subject', 5: 'context' }
  );

  processor.registerPattern(
    /^(optimize|improve)\s+(.*?)\s+(to|for)\s+(.*?)$/,
    'optimize',
    { 2: 'subject', 4: 'goal' }
  );

  processor.registerPattern(
    /^(list|show)\s+(all\s+)?(.*?)\s+(in|from)\s+(.*?)$/,
    'list',
    { 3: 'type', 5: 'source' }
  );

  // Register action handlers
  processor.registerActionHandler('create', async (params) => {
    logger.info(`Creating ${params.objectType} for ${params.target}`);
    return { created: true, object: params.objectType };
  });

  processor.registerActionHandler('analyze', async (params) => {
    logger.info(`Analyzing ${params.subject} in ${params.context}`);
    return { analyzed: true, findings: [] };
  });

  processor.registerActionHandler('optimize', async (params) => {
    logger.info(`Optimizing ${params.subject} for ${params.goal}`);
    return { optimized: true, improvement: 25 };
  });

  processor.registerActionHandler('list', async (params) => {
    logger.info(`Listing ${params.type} from ${params.source}`);
    return { listed: true, count: 10 };
  });

  (async () => {
    const session = new ConversationSession(processor);

    // Test commands
    const commands = [
      'Create a deployment plan for production',
      'Analyze the system health for stability',
      'Optimize the database queries for performance',
      'List all repositories in github'
    ];

    for (const cmd of commands) {
      logger.info(`\n> ${cmd}`);
      const response = await session.addUserMessage(cmd);
      logger.info(`Assistant: ${response.text}`);
    }

    logger.info('\n--- Processing Metrics ---');
    logger.info(JSON.stringify(processor.getMetrics(), null, 2));

    logger.info('\n--- Context Summary ---');
    logger.info(JSON.stringify(processor.getContextSummary(), null, 2));

    await session.endSession();
  })();
}
