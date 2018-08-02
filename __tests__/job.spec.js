// @flow
import { Job } from '../src/job';
import { /* log, */ sleeper } from '../src/utils';

let job: Job;
const registerTask = (duration = 200, checkDone, dependencies, jobInstance) =>
  (jobInstance || job).registerTask(
    async (/* job */) => {
      // log(`<green [Job ${job.id}]/> <grey I'm a job and I'm running />`);
      await sleeper(duration)();
      // log(`<green [Job ${job.id}] I'm done/>`);
      // log().write();
      return checkDone;
    },
    dependencies,
  );
beforeEach(() => {
  job = new Job();
});
afterEach(() => {
  if (job.isInPool) {
    job.delete();
  }
});
describe('Job', () => {
  describe('registerTask', () => {
    it('should has registered task executable', async () => {
      const checkDoneValue = 200;
      registerTask(undefined, checkDoneValue);
      const result = await job.start();
      expect(result).toEqual(checkDoneValue);
    });
    it('should assign one task as a function which return a Promise object', () => {
      registerTask();
      expect(typeof job.task).toEqual('function');
      if (job.task) {
        expect(typeof job.task().then).toEqual('function');
      }
    });
    it('should wait until dependencies finished execution', async () => {
      const longerWaitingTimeDependencyDuration = 400;
      const longerWaitingTimeDependencyJob = new Job();
      const longerWaitingTimeDependencyCheckDoneValue = 1;
      registerTask(
        longerWaitingTimeDependencyDuration,
        longerWaitingTimeDependencyCheckDoneValue,
        undefined,
        longerWaitingTimeDependencyJob,
      );
      const dependencyDuration = 200;
      const dependencyJob = new Job();
      const dependencyCheckDoneValue = 2;
      registerTask(dependencyDuration, dependencyCheckDoneValue, undefined, dependencyJob);
      const mainDuration = 100;
      const mainJob = new Job();
      const mainCheckDoneValue = 0;
      registerTask(mainDuration, mainCheckDoneValue, [longerWaitingTimeDependencyJob.id, dependencyJob.id], mainJob);
      let mainValue;
      mainJob.start().then((value) => {
        mainValue = value;
      });
      // mainValue shouldn't have value now
      expect(typeof mainValue).toEqual('undefined');
      const startTime = new Date().getTime();
      await Promise.all([longerWaitingTimeDependencyJob.start(), dependencyJob.start()]);
      const endTime = new Date().getTime();
      // the main job should be done automatically after dependencies were done
      // due to parallel executions, only longest waiting time of dependencies will be count
      expect(endTime - startTime >= mainDuration + longerWaitingTimeDependencyDuration).toEqual(true);
      // since longest duration job was done, mainValue now should have value
      expect(mainValue).toEqual(mainCheckDoneValue);
    });
  });
  describe('delete', () => {
    it('should be nonexistent in pool after deleting', () => {
      registerTask();
      job.delete();
      expect(job.isInPool).toEqual(false);
    });
    it('should not be available after deleting', () => {
      registerTask();
      job.delete();
      expect(job.isAvailable).toEqual(false);
    });
    it('should not be executable after deleting', () => {
      registerTask();
      job.delete();
      expect(() => job.start()).toThrow();
    });
  });
});
