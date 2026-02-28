# @s4ai/core

**Shared Core Modules for S4Ai Ecosystem**

Central repository for intelligence, autonomy, and infrastructure modules used across all S4Ai services.

## 🎯 Purpose

**Principle**: "All for one & One for All"

This package provides:
- ✅ **Single source of truth** for core capabilities
- ✅ **Version consistency** across all services  
- ✅ **Reduced duplication** (DRY architecture)
- ✅ **Easier testing** and maintenance
- ✅ **Unified behavior** across deployments

## 📦 Module Categories

### Autonomous Systems (`/autonomous`)
Brain systems, Q-DD (Quantum Decision Directory), autonomous loops, goal formulation, self-evolution.

### Intelligence (`/intelligence`)
MLM (Massive Learning Model), quantum reasoning, meta-reasoning, learning optimization, knowledge persistence.

### Monitoring (`/monitoring`)
Truth Seeker, system health, error awareness, predictive health, deep verification.

### Business (`/business`)
Revenue optimization, analytics, acquisition, churn prediction, CLV optimization, forecasting.

### Infrastructure (`/infrastructure`)
Railway deployment, Cloudflare management, email service, database utilities.

## 🚀 Installation

```bash
npm install @s4ai/core
```

## 📖 Usage

### Import All Modules
```javascript
import { MLM, TruthSeeker, QuantumReasoning } from '@s4ai/core';
```

### Import by Category
```javascript
import { MLM } from '@s4ai/core/intelligence';
import { TruthSeeker } from '@s4ai/core/monitoring';
import { RevenueOptimizer } from '@s4ai/core/business';
```

### Import Specific Module
```javascript
import MLM from '@s4ai/core/intelligence/s4ai-mlm-massive-learning-model.js';
```

## 🏗️ Architecture

```
@s4ai/core/
├── package.json
├── README.md
├── CHANGELOG.md
├── .gitignore
└── src/
    ├── index.js              # Main exports
    ├── autonomous/
    │   ├── index.js
    │   ├── brain-middleware.js
    │   ├── q-dd-execution-engine.js
    │   ├── autonomous-loop.js
    │   └── ...
    ├── intelligence/
    │   ├── index.js
    │   ├── s4ai-mlm-massive-learning-model.js
    │   ├── quantum-reasoning-v3.js
    │   └── ...
    ├── monitoring/
    │   ├── index.js
    │   ├── truth-seeker-module.js
    │   ├── error-awareness-system.js
    │   └── ...
    ├── business/
    │   ├── index.js
    │   ├── revenue-optimization-engine.js
    │   ├── clv-optimizer.js
    │   └── ...
    └── infrastructure/
        ├── index.js
        ├── railway-deployer.js
        ├── cloudflare-manager.js
        └── ...
```

## 🔗 Used By

- **@s4ai/api-service** - Express API service
- **@s4ai/ai-worker** - 150-agent HYPER-SWARM background service
- **@s4ai/controller** - Orchestration service (future)
- **@s4ai/frontend** - Frontend server (future)

## 📝 Development

```bash
# Run tests
npm test

# Lint code
npm run lint
```

## 🎯 S4Ai Architecture Note

**CRITICAL**: S4Ai is the **CEO** (autonomous orchestrator), NOT the product.

- **S4Ai**: Autonomous AI CEO that orchestrates everything
- **Product**: getbrains4ai / PWAI Platform
- **This Package**: Core capabilities that S4Ai uses to run the platform

## 📊 Version History

See [CHANGELOG.md](./CHANGELOG.md) for release notes.

## 👥 Author

Bradley Levitan <bradleylevitan@gmail.com>

## 📄 License

MIT

---

**Generated**: February 28, 2026  
**Part of**: S4Ai Ecosystem  
**Principle**: All for one & One for All
