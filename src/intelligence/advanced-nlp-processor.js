/**
 * Advanced NLP Intent Processor
 * Provides entity extraction, sentiment analysis, intent confidence scoring
 * Supports multi-language processing and semantic understanding
 */

import logger from '../utils/logger.js';

export class AdvancedNLPProcessor {
  constructor(config = {}) {
    this.config = {
      apiKey: config.apiKey || process.env.NLP_API_KEY,
      model: config.model || 'advanced-nlp-v2',
      languages: config.languages || ['en', 'es', 'fr', 'de']
    };

    this.intentPatterns = new Map();
    this.entityExtractors = new Map();
    this.sentimentCache = new Map();

    logger.info('[AdvancedNLP] Processor initialized');
  }

  /**
   * Extract intents from user input with confidence scores
   */
  async extractIntents(text) {
    try {
      // Tokenize input
      const tokens = text.toLowerCase().split(/\s+/);

      // Pattern matching for intents
      const intents = [];

      // Create request pattern
      const patterns = {
        'goal-setting': ['set', 'goal', 'want', 'achieve', 'target'],
        'research-request': ['research', 'find', 'investigate', 'explore', 'learn'],
        'optimization': ['optimize', 'improve', 'enhance', 'tune', 'accelerate'],
        'health-check': ['health', 'status', 'check', 'monitor', 'diagnose'],
        'query-knowledge': ['tell', 'what', 'how', 'why', 'explain']
      };

      for (const [intent, keywords] of Object.entries(patterns)) {
        const matches = tokens.filter(t => keywords.includes(t)).length;
        const confidence = matches / keywords.length;

        if (confidence > 0.3) {
          intents.push({
            type: intent,
            confidence: Math.min(confidence, 1.0),
            tokens: tokens
          });
        }
      }

      // Sort by confidence
      intents.sort((a, b) => b.confidence - a.confidence);

      logger.info(`[AdvancedNLP] Extracted intents: ${intents.map(i => i.type).join(', ')}`);
      return intents;
    } catch (error) {
      logger.error('[AdvancedNLP] Intent extraction error:', error.message);
      return [];
    }
  }

  /**
   * Extract named entities (people, places, concepts, actions)
   */
  async extractEntities(text) {
    try {
      const entities = {
        actions: [],
        concepts: [],
        targets: [],
        modifiers: []
      };

      // Simple entity patterns
      const patterns = {
        actions: /\b(create|build|implement|develop|generate|optimize|improve|analyze)\b/gi,
        concepts: /\b(system|module|feature|capability|function|process)\b/gi,
        targets: /\b(S4Ai|database|API|frontend|backend|cloud)\b/gi,
        modifiers: /\b(fast|slow|secure|robust|efficient|scalable)\b/gi
      };

      for (const [type, pattern] of Object.entries(patterns)) {
        const matches = text.match(pattern);
        if (matches) {
          entities[type] = [...new Set(matches.map(m => m.toLowerCase()))];
        }
      }

      logger.info(`[AdvancedNLP] Extracted entities:`, entities);
      return entities;
    } catch (error) {
      logger.error('[AdvancedNLP] Entity extraction error:', error.message);
      return {};
    }
  }

  /**
   * Analyze sentiment of text
   */
  analyzeSentiment(text) {
    try {
      // Sentiment scoring vocabulary
      const positive = ['great', 'excellent', 'good', 'awesome', 'amazing', 'perfect', 'wonderful'];
      const negative = ['bad', 'terrible', 'awful', 'poor', 'horrible', 'failed', 'broken'];

      const tokens = text.toLowerCase().split(/\s+/);

      let score = 0.5; // Neutral baseline
      let matches = 0;

      for (const token of tokens) {
        if (positive.includes(token)) {
          score += 0.2;
          matches++;
        } else if (negative.includes(token)) {
          score -= 0.2;
          matches++;
        }
      }

      // Normalize to [0, 1]
      const sentiment = Math.min(Math.max(score, 0), 1);

      const result = {
        score: sentiment,
        label: sentiment > 0.6 ? 'positive' : sentiment < 0.4 ? 'negative' : 'neutral',
        confidence: matches > 0 ? Math.min(matches / tokens.length, 1) : 0.5
      };

      logger.info(`[AdvancedNLP] Sentiment: ${result.label} (${result.score.toFixed(2)})`);
      return result;
    } catch (error) {
      logger.error('[AdvancedNLP] Sentiment analysis error:', error.message);
      return { score: 0.5, label: 'neutral', confidence: 0 };
    }
  }

  /**
   * Detect language
   */
  detectLanguage(text) {
    try {
      // Simplified language detection
      const languages = {
        en: /\b(the|is|are|be|have|has|to|for|of|and|or|in|on|at|by|with)\b/gi,
        es: /\b(el|la|es|son|a|para|de|y|o|en|con|por)\b/gi,
        fr: /\b(le|la|est|sont|un|une|de|et|ou|en|avec|par)\b/gi,
        de: /\b(der|die|das|ist|sind|ein|eine|und|oder|in|mit|von)\b/gi
      };

      const detected = {};
      for (const [lang, pattern] of Object.entries(languages)) {
        const matches = text.match(pattern) || [];
        detected[lang] = matches.length;
      }

      const language = Object.entries(detected).sort((a, b) => b[1] - a[1])[0];
      const result = {
        language: language ? language[0] : 'en',
        confidence: language ? language[1] / (text.length / 10) : 0.5
      };

      logger.info(`[AdvancedNLP] Detected language: ${result.language}`);
      return result;
    } catch (error) {
      logger.error('[AdvancedNLP] Language detection error:', error.message);
      return { language: 'en', confidence: 0 };
    }
  }

  /**
   * Process natural language command end-to-end
   */
  async processCommand(text) {
    try {
      const result = {
        input: text,
        intents: await this.extractIntents(text),
        entities: await this.extractEntities(text),
        sentiment: this.analyzeSentiment(text),
        language: this.detectLanguage(text),
        timestamp: new Date().toISOString()
      };

      // Determine primary intent
      if (result.intents.length > 0) {
        result.primaryIntent = result.intents[0];
      }

      logger.info(`[AdvancedNLP] Command processed successfully`);
      return result;
    } catch (error) {
      logger.error('[AdvancedNLP] Command processing error:', error.message);
      throw error;
    }
  }

  /**
   * Get semantic similarity between two texts
   */
  getSimilarity(text1, text2) {
    try {
      const tokens1 = new Set(text1.toLowerCase().split(/\s+/));
      const tokens2 = new Set(text2.toLowerCase().split(/\s+/));

      const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
      const union = new Set([...tokens1, ...tokens2]);

      const similarity = intersection.size / union.size;

      logger.info(`[AdvancedNLP] Similarity: ${similarity.toFixed(2)}`);
      return similarity;
    } catch (error) {
      logger.error('[AdvancedNLP] Similarity analysis error:', error.message);
      return 0;
    }
  }
}

export default AdvancedNLPProcessor;
