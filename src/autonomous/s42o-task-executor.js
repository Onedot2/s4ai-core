#!/usr/bin/env node
/**
 * S42O Autonomous Task Executor
 * Project S42O - Phase 6
 * 
 * Autonomous task completion system with S4Ai integration
 * Enables S4Ai to autonomously complete tasks from the roadmap
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import EventEmitter from 'events';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');
const ROADMAP_PATH = path.join(ROOT, 'PROJECT_S42O_ROADMAP.md');
const TASK_STATE_PATH = path.join(ROOT, 'data', 's42o-task-state.json');

/**
 * S42O Task Executor
 */
class S42OTaskExecutor extends EventEmitter {
  constructor() {
    super();
    this.tasks = [];
    this.completedTasks = [];
    this.inProgressTasks = [];
    this.blockedTasks = [];
    this.state = {
      totalTasks: 0,
      completed: 0,
      inProgress: 0,
      blocked: 0,
      pending: 0
    };
  }

  /**
   * Initialize executor
   */
  async initialize() {
    console.log('[S42O] Initializing Autonomous Task Executor...');
    
    // Load roadmap
    await this.loadRoadmap();
    
    // Load previous state if exists
    await this.loadState();
    
    // Parse tasks from roadmap
    await this.parseTasks();
    
    console.log(`[S42O] Loaded ${this.tasks.length} tasks from roadmap`);
    console.log(`[S42O] Status: ${this.state.completed} completed, ${this.state.pending} pending`);
  }

  /**
   * Load roadmap file
   */
  async loadRoadmap() {
    try {
      this.roadmapContent = await fs.readFile(ROADMAP_PATH, 'utf8');
    } catch (error) {
      console.error('[S42O] Failed to load roadmap:', error.message);
      this.roadmapContent = '';
    }
  }

  /**
   * Load previous task state
   */
  async loadState() {
    try {
      const stateData = await fs.readFile(TASK_STATE_PATH, 'utf8');
      const savedState = JSON.parse(stateData);
      this.completedTasks = savedState.completedTasks || [];
      this.inProgressTasks = savedState.inProgressTasks || [];
      this.blockedTasks = savedState.blockedTasks || [];
    } catch (error) {
      // State file doesn't exist yet
      console.log('[S42O] No previous state found, starting fresh');
    }
  }

  /**
   * Save current task state
   */
  async saveState() {
    try {
      // Ensure data directory exists
      const dataDir = path.join(ROOT, 'data');
      await fs.mkdir(dataDir, { recursive: true });
      
      const stateData = {
        lastUpdated: new Date().toISOString(),
        completedTasks: this.completedTasks,
        inProgressTasks: this.inProgressTasks,
        blockedTasks: this.blockedTasks,
        state: this.state
      };
      
      await fs.writeFile(TASK_STATE_PATH, JSON.stringify(stateData, null, 2));
    } catch (error) {
      console.error('[S42O] Failed to save state:', error.message);
    }
  }

  /**
   * Parse tasks from roadmap markdown
   */
  async parseTasks() {
    this.tasks = [];
    
    // Parse checklist items from roadmap
    const lines = this.roadmapContent.split('\n');
    let currentPhase = '';
    let currentSection = '';
    
    for (const line of lines) {
      // Detect phase
      if (line.match(/^## 📋 PHASE \d+:/)) {
        currentPhase = line.replace(/^## 📋 /, '').trim();
      }
      
      // Detect section
      if (line.match(/^### \d+\.\d+/)) {
        currentSection = line.replace(/^### /, '').trim();
      }
      
      // Parse task items
      if (line.match(/^- \[[ x]\]/)) {
        const completed = line.includes('[x]');
        const taskText = line.replace(/^- \[[ x]\] /, '').trim();
        
        const task = {
          id: this.generateTaskId(taskText),
          text: taskText,
          phase: currentPhase,
          section: currentSection,
          completed: completed || this.isTaskCompleted(taskText),
          priority: this.determinePriority(currentPhase, currentSection),
          dependencies: [],
          category: this.categorizeTask(taskText)
        };
        
        this.tasks.push(task);
        
        if (task.completed) {
          this.state.completed++;
        } else {
          this.state.pending++;
        }
      }
    }
    
    this.state.totalTasks = this.tasks.length;
  }

  /**
   * Generate unique task ID
   */
  generateTaskId(taskText) {
    return taskText.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
  }

  /**
   * Check if task is completed
   */
  isTaskCompleted(taskText) {
    return this.completedTasks.some(t => 
      t.text === taskText || t.id === this.generateTaskId(taskText)
    );
  }

  /**
   * Determine task priority
   */
  determinePriority(phase, section) {
    if (phase.includes('PHASE 1') || phase.includes('IMMEDIATE')) return 'CRITICAL';
    if (phase.includes('PHASE 2') || phase.includes('HIGH PRIORITY')) return 'HIGH';
    if (phase.includes('PHASE 3')) return 'HIGH';
    if (phase.includes('PHASE 4') || phase.includes('MEDIUM')) return 'MEDIUM';
    if (phase.includes('PHASE 5')) return 'MEDIUM';
    if (phase.includes('PHASE 6') || phase.includes('ONGOING')) return 'LOW';
    if (phase.includes('PHASE 7') || phase.includes('FUTURE')) return 'LOW';
    return 'MEDIUM';
  }

  /**
   * Categorize task
   */
  categorizeTask(taskText) {
    const text = taskText.toLowerCase();
    if (text.includes('deploy') || text.includes('railway')) return 'deployment';
    if (text.includes('verify') || text.includes('check') || text.includes('test')) return 'verification';
    if (text.includes('s4ai') || text.includes('autonomous') || text.includes('ai')) return 's4ai-integration';
    if (text.includes('database') || text.includes('db') || text.includes('postgres')) return 'database';
    if (text.includes('security') || text.includes('encrypt')) return 'security';
    if (text.includes('monitor') || text.includes('observ')) return 'monitoring';
    if (text.includes('html') || text.includes('ui') || text.includes('page')) return 'ui';
    if (text.includes('research') || text.includes('tavily')) return 'research';
    if (text.includes('backup') || text.includes('recovery')) return 'backup';
    return 'general';
  }

  /**
   * Get next task to execute
   */
  getNextTask() {
    // Get pending tasks sorted by priority
    const pendingTasks = this.tasks.filter(t => 
      !t.completed && 
      !this.inProgressTasks.some(it => it.id === t.id) &&
      !this.blockedTasks.some(bt => bt.id === t.id)
    );
    
    // Sort by priority
    const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    pendingTasks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    
    return pendingTasks[0];
  }

  /**
   * Mark task as in progress
   */
  async startTask(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return false;
    
    task.startedAt = new Date().toISOString();
    this.inProgressTasks.push(task);
    this.state.inProgress = this.inProgressTasks.length;
    
    await this.saveState();
    this.emit('task:started', task);
    
    return true;
  }

  /**
   * Mark task as completed
   */
  async completeTask(taskId, result = {}) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return false;
    
    task.completed = true;
    task.completedAt = new Date().toISOString();
    task.result = result;
    
    // Remove from in progress
    this.inProgressTasks = this.inProgressTasks.filter(t => t.id !== taskId);
    
    // Add to completed
    if (!this.completedTasks.some(t => t.id === taskId)) {
      this.completedTasks.push(task);
    }
    
    this.state.completed = this.completedTasks.length;
    this.state.inProgress = this.inProgressTasks.length;
    this.state.pending = this.tasks.filter(t => !t.completed).length;
    
    await this.saveState();
    await this.updateRoadmap();
    this.emit('task:completed', task);
    
    console.log(`[S42O] ✅ Completed: ${task.text}`);
    
    return true;
  }

  /**
   * Block task
   */
  async blockTask(taskId, reason) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return false;
    
    task.blocked = true;
    task.blockedReason = reason;
    task.blockedAt = new Date().toISOString();
    
    // Remove from in progress
    this.inProgressTasks = this.inProgressTasks.filter(t => t.id !== taskId);
    
    // Add to blocked
    if (!this.blockedTasks.some(t => t.id === taskId)) {
      this.blockedTasks.push(task);
    }
    
    this.state.blocked = this.blockedTasks.length;
    this.state.inProgress = this.inProgressTasks.length;
    
    await this.saveState();
    this.emit('task:blocked', task);
    
    console.log(`[S42O] 🚫 Blocked: ${task.text} - ${reason}`);
    
    return true;
  }

  /**
   * Update roadmap with current progress
   */
  async updateRoadmap() {
    // This would update the roadmap markdown with current status
    // For now, we just log the update
    console.log(`[S42O] Progress: ${this.state.completed}/${this.state.totalTasks} tasks completed`);
  }

  /**
   * Get status report
   */
  getStatus() {
    return {
      ...this.state,
      progress: ((this.state.completed / this.state.totalTasks) * 100).toFixed(1),
      nextTask: this.getNextTask(),
      inProgressTasks: this.inProgressTasks,
      blockedTasks: this.blockedTasks,
      recentCompletions: this.completedTasks.slice(-5)
    };
  }

  /**
   * Get tasks by category
   */
  getTasksByCategory(category) {
    return this.tasks.filter(t => t.category === category);
  }

  /**
   * Get tasks by priority
   */
  getTasksByPriority(priority) {
    return this.tasks.filter(t => t.priority === priority);
  }

  /**
   * Get tasks by phase
   */
  getTasksByPhase(phase) {
    return this.tasks.filter(t => t.phase.includes(phase));
  }
}

// Singleton instance
let executorInstance = null;

/**
 * Get S42O Task Executor singleton
 */
export async function getS42OExecutor() {
  if (!executorInstance) {
    executorInstance = new S42OTaskExecutor();
    await executorInstance.initialize();
  }
  return executorInstance;
}

export default S42OTaskExecutor;

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    const executor = await getS42OExecutor();
    const status = executor.getStatus();
    
    console.log('\n🚀 S42O TASK EXECUTOR STATUS\n');
    console.log('=' .repeat(60));
    console.log(`Total Tasks: ${status.totalTasks}`);
    console.log(`Completed: ${status.completed} (${status.progress}%)`);
    console.log(`In Progress: ${status.inProgress}`);
    console.log(`Blocked: ${status.blocked}`);
    console.log(`Pending: ${status.pending}`);
    console.log('=' .repeat(60));
    
    if (status.nextTask) {
      console.log('\n📌 Next Task:');
      console.log(`  Priority: ${status.nextTask.priority}`);
      console.log(`  Phase: ${status.nextTask.phase}`);
      console.log(`  Task: ${status.nextTask.text}`);
    }
    
    if (status.recentCompletions.length > 0) {
      console.log('\n✅ Recent Completions:');
      status.recentCompletions.forEach(task => {
        console.log(`  • ${task.text}`);
      });
    }
    
    console.log('');
  })();
}
