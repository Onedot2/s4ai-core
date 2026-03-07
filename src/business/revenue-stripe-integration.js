// agent-core/revenue.js
// Autonomous Revenue Module for S4-PWA
// Handles Stripe integration, pricing, tax compliance (IRS-ready), and self-optimization

const IRS_COMPLIANCE = true;

// Configuration constants
const MAX_TRANSACTION_HISTORY = 100;
const MAX_COMPLIANCE_LOG = 1000;

// Initialize Stripe only if key is available
let stripe = null;
let lastStripeKey = null;
async function setStripeKey(key) {
  if (!key) return;
  if (lastStripeKey === key && stripe) return;
  try {
    const Stripe = (await import('stripe')).default;
    stripe = Stripe(key);
    lastStripeKey = key;
    console.log('[Revenue] Stripe key set/hot-reloaded');
  } catch (error) {
    console.warn('[Revenue] Stripe not initialized:', error.message);
  }
}
// Initialize at startup (non-blocking)
setStripeKey(process.env.STRIPE_LIVE_KEY).catch(err => {
  console.warn('[Revenue] Failed to initialize Stripe at startup:', err.message);
});

/**
 * Revenue Analytics and Optimization
 */
class RevenueModule {
  constructor() {
    this.transactions = [];
    this.metrics = {
      totalRevenue: 0,
      transactionCount: 0,
      successRate: 0,
      averageTransactionValue: 0
    };
    
    this.pricingStrategies = [
      { name: 'Basic', price: 999, features: ['Core features', 'Email support'] },
      { name: 'Pro', price: 2999, features: ['All Basic', 'Priority support', 'Advanced features'] },
      { name: 'Enterprise', price: 9999, features: ['All Pro', 'Custom integration', 'Dedicated support'] }
    ];

    this.complianceLog = [];
  }

  /**
   * Create a Stripe checkout session
   */
  async createCheckoutSession(amount, currency = 'usd', metadata = {}) {
    if (!stripe) {
      console.warn('[Revenue] Stripe not initialized - returning mock session');
      return this.createMockSession(amount, currency);
    }

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency,
            product_data: { 
              name: metadata.productName || 'S4 Service Subscription',
              description: metadata.description || 'Self-Sustaining Software System subscription'
            },
            unit_amount: amount,
          },
          quantity: 1,
        }],
        mode: metadata.mode || 'payment',
        success_url: metadata.successUrl || 'https://yourdomain.com/success?session_id={CHECKOUT_SESSION_ID}',
        cancel_url: metadata.cancelUrl || 'https://yourdomain.com/cancel',
        metadata: {
          ...metadata,
          timestamp: Date.now(),
          s4_tracking: true
        }
      });

      // Log for IRS compliance
      this.logTransaction({
        type: 'checkout_created',
        sessionId: session.id,
        amount,
        currency,
        timestamp: Date.now()
      });

      return session;

    } catch (error) {
      console.error('[Revenue] Checkout session creation failed:', error.message);
      throw error;
    }
  }

  /**
   * Create mock session for development
   */
  createMockSession(amount, currency) {
    return {
      id: `mock_session_${Date.now()}`,
      amount_total: amount,
      currency,
      payment_status: 'unpaid',
      url: 'https://checkout.stripe.com/mock',
      status: 'open'
    };
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(event) {
    console.log(`[Revenue] Processing webhook: ${event.type}`);

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutComplete(event.session || event);
          break;

        case 'payment_intent.succeeded':
          await this.handlePaymentSuccess(event.payment_intent || event);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentFailure(event.payment_intent || event);
          break;

        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          await this.handleSubscriptionEvent(event);
          break;

        default:
          console.log(`[Revenue] Unhandled event type: ${event.type}`);
      }

      // IRS compliance logging
      if (IRS_COMPLIANCE) {
        this.logComplianceEvent(event);
      }

    } catch (error) {
      console.error('[Revenue] Webhook handling error:', error.message);
      throw error;
    }
  }

  /**
   * Handle completed checkout
   */
  async handleCheckoutComplete(session) {
    const transaction = {
      id: session.id,
      type: 'checkout_completed',
      amount: session.amount_total,
      currency: session.currency,
      status: 'success',
      timestamp: Date.now(),
      customerId: session.customer,
      metadata: session.metadata
    };

    this.transactions.push(transaction);
    this.updateMetrics(transaction);

    console.log('[Revenue] Checkout completed:', session.id);
    
    // Trigger fulfillment
    await this.fulfillOrder(transaction);
  }

  /**
   * Handle payment success
   */
  async handlePaymentSuccess(paymentIntent) {
    const transaction = {
      id: paymentIntent.id,
      type: 'payment_success',
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: 'success',
      timestamp: Date.now()
    };

    this.transactions.push(transaction);
    this.updateMetrics(transaction);

    console.log('[Revenue] Payment succeeded:', paymentIntent.id);
  }

  /**
   * Handle payment failure
   */
  async handlePaymentFailure(paymentIntent) {
    const transaction = {
      id: paymentIntent.id,
      type: 'payment_failed',
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: 'failed',
      timestamp: Date.now(),
      error: paymentIntent.last_payment_error
    };

    this.transactions.push(transaction);
    this.updateMetrics(transaction);

    console.log('[Revenue] Payment failed:', paymentIntent.id);
    
    // Trigger recovery workflow
    await this.handlePaymentRecovery(transaction);
  }

  /**
   * Handle subscription events
   */
  async handleSubscriptionEvent(event) {
    console.log(`[Revenue] Subscription event: ${event.type}`);
    
    const subscription = event.subscription || event;
    const transaction = {
      id: subscription.id,
      type: event.type,
      status: subscription.status,
      timestamp: Date.now()
    };

    this.transactions.push(transaction);
  }

  /**
   * Fulfill order after successful payment
   */
  async fulfillOrder(transaction) {
    console.log('[Revenue] Fulfilling order:', transaction.id);
    
    // Implementation: Send confirmation email, provision service, etc.
    // For now, just log
    this.logComplianceEvent({
      type: 'order_fulfilled',
      transactionId: transaction.id,
      timestamp: Date.now()
    });
  }

  /**
   * Handle payment recovery
   */
  async handlePaymentRecovery(transaction) {
    console.log('[Revenue] Initiating payment recovery:', transaction.id);
    
    // Implementation: Send recovery email, retry payment, etc.
    // For now, just log
  }

  /**
   * Update revenue metrics
   */
  updateMetrics(transaction) {
    if (transaction.status === 'success' && transaction.amount) {
      this.metrics.totalRevenue += transaction.amount;
      this.metrics.transactionCount++;
    }

    const successfulTransactions = this.transactions.filter(t => t.status === 'success');
    this.metrics.successRate = successfulTransactions.length / this.transactions.length;

    if (successfulTransactions.length > 0) {
      const totalAmount = successfulTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
      this.metrics.averageTransactionValue = totalAmount / successfulTransactions.length;
    }
  }

  /**
   * Log transaction for IRS compliance
   */
  logTransaction(transaction) {
    if (!IRS_COMPLIANCE) return;

    const complianceRecord = {
      timestamp: Date.now(),
      type: 'transaction',
      data: {
        id: transaction.sessionId || transaction.id,
        amount: transaction.amount,
        currency: transaction.currency,
        date: new Date().toISOString(),
        taxYear: new Date().getFullYear()
      }
    };

    this.complianceLog.push(complianceRecord);
    console.log('[Revenue] IRS compliance record created:', complianceRecord.data.id);

    // Trim log to configured limit
    if (this.complianceLog.length > MAX_COMPLIANCE_LOG) {
      this.complianceLog.shift();
    }
  }

  /**
   * Log compliance event
   */
  logComplianceEvent(event) {
    if (!IRS_COMPLIANCE) return;

    const complianceRecord = {
      timestamp: Date.now(),
      type: 'event',
      data: {
        eventType: event.type,
        eventId: event.id || `event_${Date.now()}`,
        date: new Date().toISOString()
      }
    };

    this.complianceLog.push(complianceRecord);

    // Trim log to configured limit
    if (this.complianceLog.length > MAX_COMPLIANCE_LOG) {
      this.complianceLog.shift();
    }
  }

  /**
   * Get revenue metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      transactionHistory: this.transactions.slice(-10),
      complianceRecords: this.complianceLog.length
    };
  }

  /**
   * Optimize pricing based on metrics
   */
  optimizePricing() {
    const metrics = this.getMetrics();
    
    console.log('[Revenue] Analyzing pricing strategy...');
    console.log(`[Revenue] Success rate: ${(metrics.successRate * 100).toFixed(1)}%`);
    console.log(`[Revenue] Average transaction: $${(metrics.averageTransactionValue / 100).toFixed(2)}`);

    // Simple optimization logic
    if (metrics.successRate < 0.5 && metrics.averageTransactionValue > 5000) {
      console.log('[Revenue] Recommendation: Consider lower pricing tiers');
    } else if (metrics.successRate > 0.8) {
      console.log('[Revenue] Recommendation: Consider premium pricing tiers');
    }

    return {
      currentStrategy: this.pricingStrategies,
      recommendation: 'Pricing optimization analysis complete',
      metrics
    };
  }

  /**
   * Generate IRS compliance report
   */
  generateComplianceReport(year = new Date().getFullYear()) {
    const records = this.complianceLog.filter(record => {
      const recordYear = new Date(record.timestamp).getFullYear();
      return recordYear === year;
    });

    const transactions = records.filter(r => r.type === 'transaction');
    const totalRevenue = transactions.reduce((sum, t) => sum + (t.data.amount || 0), 0);

    const report = {
      year,
      totalTransactions: transactions.length,
      totalRevenue,
      currency: 'usd',
      records: transactions,
      generatedAt: new Date().toISOString()
    };

    console.log(`[Revenue] IRS Compliance Report for ${year}:`);
    console.log(`  Transactions: ${report.totalTransactions}`);
    console.log(`  Total Revenue: $${(report.totalRevenue / 100).toFixed(2)}`);

    return report;
  }

  /**
   * Export state for persistence
   */
  exportState() {
    return {
      transactions: this.transactions.slice(-MAX_TRANSACTION_HISTORY),
      metrics: this.metrics,
      complianceLog: this.complianceLog.slice(-MAX_COMPLIANCE_LOG),
      timestamp: Date.now()
    };
  }

  /**
   * Import state from persistence
   */
  importState(data) {
    if (data.transactions) {
      this.transactions = data.transactions;
    }
    if (data.metrics) {
      this.metrics = data.metrics;
    }
    if (data.complianceLog) {
      this.complianceLog = data.complianceLog;
    }
    console.log('[Revenue] State imported successfully');
  }
}

// Create singleton instance
const revenueModule = new RevenueModule();

// Legacy function exports for backward compatibility
async function createCheckoutSession(amount, currency = 'usd') {
  return revenueModule.createCheckoutSession(amount, currency);
}

async function handleWebhook(event) {
  return revenueModule.handleWebhook(event);
}

export {
  RevenueModule,
  revenueModule,
  createCheckoutSession,
  handleWebhook,
  setStripeKey
};

export default revenueModule;
