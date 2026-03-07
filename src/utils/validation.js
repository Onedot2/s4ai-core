/**
 * Input Validation Module
 * Provides schemas and validation utilities for S4Ai API and services
 * Uses Joi for robust, composable validation
 */

import Joi from 'joi';
import logger from './logger.js';

/**
 * Common field schemas used across multiple validators
 */
const commonSchemas = {
  // IDs and identifiers
  id: Joi.number().integer().positive().required(),
  userId: Joi.number().integer().positive().required(),
  uuid: Joi.string().uuid().required(),
  email: Joi.string().email().required(),
  
  // Strings
  slug: Joi.string().alphanum().required(),
  url: Joi.string().uri().required(),
  description: Joi.string().min(1).max(5000),
  title: Joi.string().min(1).max(500).required(),
  
  // Numbers and ranges
  port: Joi.number().integer().min(1).max(65535),
  percentage: Joi.number().min(0).max(100),
  duration: Joi.number().integer().min(0),
  
  // Enums
  logLevel: Joi.string().valid('error', 'warn', 'info', 'debug').required(),
  environment: Joi.string().valid('development', 'production', 'test').required(),
  
  // Timestamps
  timestamp: Joi.date().iso(),
  isoDate: Joi.date().iso().required(),
  
  // Booleans
  enabled: Joi.boolean(),
  active: Joi.boolean()
};

/**
 * Database Connection Validation
 */
export const databaseConfigSchema = Joi.object({
  host: Joi.string().hostname().required(),
  port: commonSchemas.port.default(5432),
  database: Joi.string().alphanum().min(1).required(),
  user: Joi.string().min(1).required(),
  password: Joi.string().min(1).required(),
  pool: Joi.object({
    max: Joi.number().integer().min(1).default(10),
    min: Joi.number().integer().min(0).default(2),
    idleTimeoutMillis: Joi.number().integer().min(0).default(30000),
    connectionTimeoutMillis: Joi.number().integer().min(0).default(2000)
  })
}).unknown(false);

/**
 * API Request Body Validations
 */
export const apiRequestSchemas = {
  // User creation
  createUser: Joi.object({
    email: commonSchemas.email,
    name: Joi.string().min(1).max(200).required(),
    password: Joi.string().min(8).max(128).required(),
    subscribe: commonSchemas.enabled.default(false)
  }).unknown(false),

  // User update
  updateUser: Joi.object({
    name: Joi.string().min(1).max(200),
    email: commonSchemas.email,
    preferences: Joi.object().unknown(true)
  }).min(1).unknown(false),

  // API key rotation
  rotateApiKey: Joi.object({
    userId: commonSchemas.userId,
    reason: Joi.string().max(500)
  }).unknown(false),

  // Feedback submission
  submitFeedback: Joi.object({
    type: Joi.string().valid('bug', 'feature', 'general').required(),
    message: Joi.string().min(10).max(5000).required(),
    context: Joi.object().unknown(true)
  }).unknown(false),

  // Research request
  submitResearch: Joi.object({
    query: Joi.string().min(5).max(1000).required(),
    depth: Joi.string().valid('quick', 'standard', 'deep').default('standard'),
    sources: Joi.array().items(Joi.string()).max(10)
  }).unknown(false)
};

/**
 * Configuration Validation Schemas
 */
export const configSchemas = {
  // Application config
  appConfig: Joi.object({
    NODE_ENV: commonSchemas.environment.default('development'),
    PORT: commonSchemas.port.default(3000),
    LOG_LEVEL: commonSchemas.logLevel.default('info'),
    BACKEND_URL: commonSchemas.url,
    FRONTEND_URL: commonSchemas.url
  }).unknown(true),

  // Database config
  databaseConfig: databaseConfigSchema,

  // Stripe config
  stripeConfig: Joi.object({
    STRIPE_SECRET_KEY: Joi.string().required(),
    STRIPE_PUBLISHABLE_KEY: Joi.string().required(),
    STRIPE_WEBHOOK_SECRET: Joi.string().required()
  }).unknown(false)
};

/**
 * Validation helper functions
 */

/**
 * Validate input against schema with error handling
 */
export function validate(data, schema, options = {}) {
  const { abortEarly = false, stripUnknown = true } = options;
  
  const { error, value } = schema.validate(data, {
    abortEarly,
    stripUnknown,
    convert: true
  });

  if (error) {
    logger.warn('Validation error', {
      error: error.message,
      details: error.details.map(d => ({
        path: d.path.join('.'),
        message: d.message,
        type: d.type
      }))
    });
    
    throw new ValidationError(error.message, error.details);
  }

  return value;
}

/**
 * Validate with logging but don't throw
 */
export function validateSoft(data, schema, context = 'unknown') {
  const { error, value } = schema.validate(data, {
    abortEarly: true,
    stripUnknown: true,
    convert: true
  });

  if (error) {
    logger.warn(`Soft validation failed: ${context}`, {
      error: error.message,
      data: JSON.stringify(data).substring(0, 500)
    });
  }

  return { isValid: !error, value: value || data, error };
}

/**
 * Custom validation error class
 */
export class ValidationError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
    this.statusCode = 400;
  }

  toJSON() {
    return {
      error: this.name,
      message: this.message,
      details: this.details.map(d => ({
        path: d.path.join('.'),
        message: d.message,
        type: d.type
      }))
    };
  }
}

/**
 * Request validation middleware for Express
 */
export function createValidationMiddleware(schema, property = 'body') {
  return (req, res, next) => {
    try {
      const dataToValidate = req[property];
      const validatedData = validate(dataToValidate, schema);
      req[property] = validatedData;
      next();
    } catch (error) {
      if (error instanceof ValidationError) {
        logger.warn('Request validation failed', {
          path: req.path,
          method: req.method,
          error: error.message
        });
        return res.status(400).json(error.toJSON());
      }
      next(error);
    }
  };
}

/**
 * Batch validation with results
 */
export function validateBatch(items, schema) {
  return items.map((item, index) => {
    const { error, value } = schema.validate(item, {
      abortEarly: true,
      stripUnknown: true,
      convert: true
    });

    return {
      index,
      isValid: !error,
      value: value || item,
      error: error ? error.message : null
    };
  });
}

/**
 * Conditional validation based on field value
 */
export function conditionalValidate(data, conditions) {
  const errors = [];

  Object.entries(conditions).forEach(([field, validatorFn]) => {
    try {
      if (!validatorFn(data[field], data)) {
        errors.push(`Field '${field}' validation failed`);
      }
    } catch (error) {
      errors.push(`Field '${field}': ${error.message}`);
    }
  });

  if (errors.length > 0) {
    throw new ValidationError(
      `Validation failed: ${errors.join(', ')}`,
      errors.map((msg, i) => ({
        path: ['conditional', i],
        message: msg,
        type: 'custom'
      }))
    );
  }

  return data;
}

export default {
  validate,
  validateSoft,
  validateBatch,
  conditionalValidate,
  ValidationError,
  createValidationMiddleware,
  // Schemas
  commonSchemas,
  databaseConfigSchema,
  apiRequestSchemas,
  configSchemas
};
