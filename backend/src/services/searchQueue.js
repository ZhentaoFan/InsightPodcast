// searchQueue.js
const { Queue } = require("bullmq");
const { redisConfig } = require("../../config/redis");

const searchQueue = new Queue("searchRelevantPaper", {
  connection: redisConfig,
  defaultJobOptions: {
    attempts: 1,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
  },
});

async function addSearchJob(jobId, pdfPath) {
  // Use a unique job name if needed
  await searchQueue.add(jobId, { jobId, pdfPath });
}

async function getSearchJobStatus(jobId) {
  const job = await getJobByName(searchQueue, jobId);
  if (!job) return null;
  const state = await job.getState();
  const result = job.returnvalue;
  console.log('states: ', state);
  return {
    status: state,
    relevantPaperLink: result ? result.relevantPaperLink : null,
  };
}

async function getJobByName(queue, name) {
    const jobs = await queue.getJobs([
      "waiting",
      "active",
      "completed",
      "failed",
    ]);
    return jobs.find((job) => job.name === name);
  }
  

module.exports = {
  searchQueue,
  addSearchJob,
  getSearchJobStatus,
};
