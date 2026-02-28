/**
 * @s4ai/core/business - Business Intelligence Module
 * 
 * Revenue optimization, analytics, customer acquisition,
 * CLV optimization, churn prediction, and customer journey mapping.
 * 
 * @module @s4ai/core/business
 */

// Revenue Optimization (4 modules)
export { default as RevenueOptimization } from './revenue-optimization-engine.js';
export { default as Revenue } from './revenue.js';
export { default as RevenueForecaster } from './revenue-forecaster.js';
export { default as AutonomousRevenueOptimizer } from './autonomous-revenue-optimizer.js';

// Analytics & Dashboards (3 modules)
export { default as AnalyticsDashboard } from './analytics-dashboard-engine.js';
export { default as DashboardEvolution } from './dashboard-evolution-agent.js';
export { default as WebsocketDashboard } from './websocket-dashboard.js';

// Acquisition (3 modules)
export { default as AcquisitionFunnel } from './acquisition-funnel.js';
export { default as AcquisitionSignalEngine } from './acquisition-signal-engine.js';
export { default as S4UserAcquisition } from './s4-user-acquisition.js';

// Customer Intelligence (5 modules)
export { default as ChurnPredictor } from './churn-predictor.js';
export { default as CLVOptimizer } from './clv-optimizer.js';
export { default as JourneyMap } from './journey-map.js';
export { default as EnterpriseCustomizer } from './enterprise-customizer.js';
export { default as CurrencyManager } from './currency-manager.js';
