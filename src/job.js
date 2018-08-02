// @flow
import { gUuidV4 } from './utils';

export class Job {
  /**
   * Queued jobs
   *
   * @static
   * @type {Array<string>}
   * @memberof Job
   */
  static queued: Array<string> = [];
  /**
   * Jobs are doing
   *
   * @static
   * @type {Array<string>}
   * @memberof Job
   */
  static doing: Array<string> = [];
  /**
   * All registered jobs
   *
   * @static
   * @type {Array<string>}
   * @memberof Job
   */
  static available: Array<string> = [];
  /**
   * Jobs's object pool
   *
   * @static
   * @type {{
   *     [key: string]: Job,
   *   }}
   * @memberof Job
   */
  static pool: {
    [key: string]: Job,
  } = {};
  /**
   * Get a job instance by ID
   *
   * @static
   * @param {*} id
   * @returns
   * @memberof Job
   */
  static get(id: string): Job {
    if (!Job.pool[id]) {
      throw new Error("[[[Can't get a job which is nonexistent in pool!]]]");
    }
    return Job.pool[id];
  }
  /**
   * Maximum concurrence executions can happen at the same time
   *
   * @memberof Job
   */
  maxConcurrenceExecution = 5;
  /**
   * Task of current job
   *
   * @memberof Job
   */
  task: ?(...args: Array<any>) => Promise<any>;
  /**
   * ID of current job
   *
   * @memberof Job
   */
  id = gUuidV4();
  /**
   * Dependencies of current job
   *
   * @type {Array<string>}
   * @memberof Job
   */
  dependencies: Array<string> = [];
  /**
   * Results of dependencies executions
   *
   * @type {{
   *     [key: string]: any,
   *   }}
   * @memberof Job
   */
  dependenciesResult: {
    [key: string]: any,
  } = {};
  /**
   * Callbacks after job done
   *
   * @memberof Job
   */
  callbacks: Array<{
    from: string,
    execute: (...args: Array<any>) => Promise<any>,
  }> = [];
  /**
   * Promise object of waiting this job to be done
   *
   * @memberof Job
   */
  waiting: ?Promise<any>;
  /**
   * Waiting Promise object resolver
   *
   * @memberof Job
   */
  stopWaiting: ?Function;
  /**
   * Will this job be deleted when done?
   *
   * @memberof Job
   */
  willDeleteWhenDone: ?boolean;
  /**
   * Is this job queued?
   *
   * @memberof Job
   */
  executed: Promise<any>;
  get isQueued(): boolean {
    return Job.queued.indexOf(this.id) !== -1;
  }
  // eslint-disable-next-line class-methods-use-this
  set isQueued(value: boolean) {
    throw new Error('[[[This is readonly property!]]]');
  }
  /**
   * Is this job in progress?
   *
   * @memberof Job
   */
  get isDoing(): boolean {
    return Job.doing.indexOf(this.id) !== -1;
  }
  // eslint-disable-next-line class-methods-use-this
  set isDoing(value: boolean) {
    throw new Error('[[[This is readonly property!]]]');
  }
  /**
   * Is this job registered?
   *
   * @memberof Job
   */
  get isAvailable(): boolean {
    return Job.available.indexOf(this.id) !== -1;
  }
  // eslint-disable-next-line class-methods-use-this
  set isAvailable(value: boolean) {
    throw new Error('[[[This is readonly property!]]]');
  }
  /**
   * Is this job exist in pool?
   *
   * @memberof Job
   */
  get isInPool(): boolean {
    return Boolean(Job.pool[this.id]);
  }
  // eslint-disable-next-line class-methods-use-this
  set isInPool(value: boolean) {
    throw new Error('[[[This is readonly property!]]]');
  }
  /**
   * Is all dependencies of this job resolved?
   *
   * @memberof Job
   */
  get isAllDependenciesResolved(): boolean {
    return this.dependencies.every((id) => this.isDependencyResolved(id));
  }
  // eslint-disable-next-line class-methods-use-this
  set isAllDependenciesResolved(value: boolean) {
    throw new Error('[[[This is readonly property!]]]');
  }
  /**
   * Determine if in progress jobs amount doesn't reach maximum concurrence job executions amount allowed
   *
   * @memberof Job
   */
  get hasSlot(): boolean {
    return Job.doing.length < this.maxConcurrenceExecution;
  }
  // eslint-disable-next-line class-methods-use-this
  set hasSlot(value: boolean) {
    throw new Error('[[[This is readonly property!]]]');
  }
  /**
   * Remaining job executions amount allowed
   *
   * @memberof Job
   */
  get remainingSlot(): number {
    return this.maxConcurrenceExecution - Job.doing.length;
  }
  // eslint-disable-next-line class-methods-use-this
  set remainingSlot(value: number) {
    throw new Error('[[[This is readonly property!]]]');
  }
  /**
   * Is jobs queue empty?
   *
   * @memberof Job
   */
  // eslint-disable-next-line class-methods-use-this
  get isQueueEmpty(): boolean {
    return !Job.queued.length;
  }
  // eslint-disable-next-line class-methods-use-this
  set isQueueEmpty(value: boolean) {
    throw new Error('[[[This is readonly property!]]]');
  }
  constructor(
    task: ?(...args: Array<any>) => any,
    willStart: ?boolean = false,
    willDeleteWhenDone: ?boolean = false,
    dependencies: ?Array<string> = [],
    maxConcurrenceExecution: ?number = undefined,
  ) {
    if (task) {
      this.registerTask(task, dependencies);
    }
    this.maxConcurrenceExecution = maxConcurrenceExecution || this.maxConcurrenceExecution;
    this.willDeleteWhenDone = willDeleteWhenDone;
    if (willStart) {
      this.start();
    }
  }
  /**
   * Register a task for current job
   *
   * @param {(...args: Array<any>) => Promise<any>} task
   * @param {Array<string>} [dependencies=[]]
   * @memberof Job
   */
  registerTask(task: (...args: Array<any>) => Promise<any>, dependencies: ?Array<string> = []) {
    if (!this.task || !this.isQueued || !this.isDoing) {
      this.task = (...args) =>
        new Promise((resolve, reject) => {
          const result = task(this, ...args);
          if (typeof result.then === 'function') {
            result.then(resolve, reject);
            return;
          }
          resolve(result);
        });
      if (dependencies && dependencies.length) {
        this.dependOn(dependencies);
      }
      this.willBeAvailable();
      this.addToPool();
      return;
    }
    throw new Error('[[[Cannot reassign task for a running job!]]]');
  }
  /**
   * Unregister current job's task
   *
   * @memberof Job
   */
  unregisterTask() {
    this.wontBeAvailable();
    this.task = undefined;
  }
  /**
   * Add current job to jobs pool
   *
   * @memberof Job
   */
  addToPool() {
    if (!this.isAvailable) {
      throw new Error("[[[This job wasn't registered!]]]");
    }
    if (Job.pool[this.id]) {
      throw new Error('[[[Cannot add a job which is currently in pool!]]]');
    }
    Job.pool[this.id] = this;
  }
  /**
   * Remove current job from jobs pool
   *
   * @memberof Job
   */
  removeFromPool() {
    if (!this.isInPool) {
      throw new Error('[[[Cannot remove a job which is nonexistent in pool!]]]');
    }
    delete Job.pool[this.id];
  }
  /**
   * Start current job's task
   *
   * @returns
   * @memberof Job
   */
  start(): Promise<any> {
    if (!this.isAvailable) {
      throw new Error("[[[This job wasn't registered!]]]");
    }
    if (this.isQueued || this.isDoing) {
      throw new Error('[[[This job was started!]]]');
    }
    if (!this.hasSlot) {
      return this.queue();
    }
    if (!this.dependencies.length) {
      return this.do();
    }
    return this.wait();
  }
  /**
   * Stop current job's task
   *
   * @memberof Job
   */
  stop() {
    if (!this.isAvailable) {
      throw new Error("[[[This job wasn't registered!]]]");
    }
    if (this.isQueued) {
      this.unQueue();
    } else if (this.isDoing) {
      throw new Error("[[[Can't stop a started job!]]]");
    } else {
      this.dontWait();
    }
  }
  /**
   * Register dependencies of current job
   *
   * @param {Array<string>} [dependencies=[]]
   * @memberof Job
   */
  dependOn(dependencies: Array<string> = []) {
    this.dependencies = [...new Set([...this.dependencies, ...dependencies])];
    this.dependencies.forEach((dependencyId) => {
      const dependency = Job.pool[dependencyId];
      dependency.callbacks.push({
        from: this.id,
        execute: this.do.bind(this),
      });
    });
  }
  /**
   * Unregister dependencies of current job
   *
   * @param {Array<string>} [dependencies=[]]
   * @memberof Job
   */
  dontDependOn(dependencies: Array<string> = []) {
    if (!this.dependencies.length || this.dependencies.indexOf(this.id) === -1 || !this.callbacks.length) {
      return;
    }
    this.dependencies = this.dependencies.filter((id) => dependencies.indexOf(id) === -1);
    this.dependencies.forEach((dependencyId) => {
      const dependency = Job.pool[dependencyId];
      dependency.callbacks = dependency.callbacks.filter(({ from }) => dependencies.indexOf(from) === -1);
    });
  }
  /**
   * Resolve a dependency of current job
   *
   * @param {string} id
   * @param {*} result
   * @memberof Job
   */
  resolveDependency(id: string, result: any) {
    this.dependenciesResult[id] = result;
  }
  /**
   * Remove all relationships between current job and other jobs
   *
   * @memberof Job
   */
  removeRelationships() {
    Object.keys(Job.pool).forEach((id) => {
      if (id === this.id) {
        return;
      }
      const job = Job.get(id);
      job.dontDependOn([this.id]);
    });
  }
  /**
   * Execute the task of current job
   *
   * @param {...Array<any>} args
   * @returns
   * @memberof Job
   */
  do(...args: Array<any>): Promise<any> {
    if (!this.isAvailable) {
      throw new Error("[[[This job wasn't registered!]]]");
    }
    Job.doing.push(this.id);
    if (this.isQueued) {
      this.unQueue();
    }
    if (!this.task) {
      throw new Error("[[[This job wasn't registered!]]]");
    }
    this.executed = this.task(...args)
      .then((result) =>
        (this.callbacks.length &&
            Promise.all(this.callbacks.map(({ from, execute }) => {
              const fromJob = Job.get(from);
              if (!fromJob.waiting) {
                return undefined;
              }
              fromJob.resolveDependency(this.id, result);
              if (fromJob.isAllDependenciesResolved) {
                const res = fromJob.dependencies.map((id) => fromJob.dependenciesResult[id]);
                return execute(...res);
              }
              return undefined;
            }))) ||
          result)
      .then(this.done.bind(this))
      .catch(this.catch.bind(this));
    return this.executed;
  }
  /**
   * Callback when the task of current job is done
   *
   * @param {*} result
   * @returns
   * @memberof Job
   */
  done(result: any): any {
    if (!this.isAvailable) {
      throw new Error("[[[This job wasn't registered!]]]");
    }
    Job.doing = Job.doing.filter((id) => id !== this.id);
    this.resolveQueue();
    if (this.waiting && this.stopWaiting) {
      this.stopWaiting(result);
    }
    if (this.willDeleteWhenDone) {
      this.delete();
    }
    return result;
  }
  /**
   * Remove current job from queue
   *
   * @memberof Job
   */
  unQueue() {
    if (!this.isAvailable) {
      throw new Error("[[[This job wasn't registered!]]]");
    }
    Job.queued = Job.queued.filter((id) => id !== this.id);
  }
  /**
   * Add current job to queue
   *
   * @returns
   * @memberof Job
   */
  queue(): Promise<any> {
    if (!this.isAvailable) {
      throw new Error("[[[This job wasn't registered!]]]");
    }
    Job.queued.push(this.id);
    return this.wait();
  }
  /**
   * Resolve remaining jobs in queue
   *
   * @returns
   * @memberof Job
   */
  resolveQueue() {
    if (!this.hasSlot || this.isQueueEmpty) {
      return;
    }
    Job.queued
      .map((id) => Job.get(id))
      .filter((job) => !job.dependencies.length)
      .slice(0, this.remainingSlot)
      .forEach((job) => {
        job.unQueue();
        job.start();
      });
  }
  /**
   * Wait current job to be done
   *
   * @returns {Promise<any>}
   * @memberof Job
   */
  wait(): Promise<any> {
    this.waiting = new Promise((resolve) => {
      this.stopWaiting = (...args) => {
        resolve(...args);
        this.dontWait();
      };
    });
    return this.waiting;
  }
  /**
   * Stop waiting current job. This will remove wait for result ability of current job.
   *
   * @memberof Job
   */
  dontWait() {
    this.waiting = undefined;
    this.stopWaiting = undefined;
  }
  /**
   * Register current job
   *
   * @memberof Job
   */
  willBeAvailable() {
    if (!this.isAvailable) {
      Job.available.push(this.id);
    }
  }
  /**
   * Unregister current job
   *
   * @memberof Job
   */
  wontBeAvailable() {
    if (!this.isAvailable) {
      throw new Error("[[[This job wasn't registered!]]]");
    }
    Job.available = Job.available.filter((id) => id !== this.id);
  }
  /**
   * Delete current job
   *
   * @memberof Job
   */
  delete() {
    this.stop();
    this.unregisterTask();
    this.removeRelationships();
    this.removeFromPool();
  }
  /**
   * Is provided dependency resolved?
   *
   * @param {*} id
   * @returns
   * @memberof Job
   */
  isDependencyResolved(id: string): boolean {
    return typeof this.dependenciesResult[id] !== 'undefined';
  }
  /**
   * Callback when the task of current job cause exception
   *
   * @param {Error} error
   * @memberof Job
   */
  catch = (error: Error) => {
    throw error;
  };
}
export default Job;
