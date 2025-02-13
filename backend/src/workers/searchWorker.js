// searchWorker.js
const { Worker } = require("bullmq");
const { redisConfig } = require("../../config/redis");
const { googleCustomSearch } = require("../utils/search");

const searchWorker = new Worker(
  "searchRelevantPaper",
  async (job) => {
    try {
      console.log("Added serach Job\n\n");
      const { jobId, pdfPath } = job.data;

      // Optionally update progress here
      await job.updateProgress(10);
      const relevantLinks = await googleCustomSearch(jobId, pdfPath);
      await job.updateProgress(100);
      // Return the top relevant link, or the full list as needed
      const result =
        relevantLinks && relevantLinks.length > 0 ? relevantLinks : [];
      return { relevantPaperLink: result };
    } catch (error) {
      console.error(`Search job ${job.id} failed:`, error);
      throw new Error(error.message);
    }
  },
  {
    connection: redisConfig,
    concurrency: 2,
    autorun: true,
  },
);

searchWorker.on("progress", (job, progress) => {
  console.log(`Search job ${job.id} progress: ${progress}%`);
});

searchWorker.on("completed", (job) => {
  console.log(`Search job ${job.id} completed with result:`, job.returnvalue);
});

searchWorker.on("failed", (job, err) => {
  console.error(`Search job ${job.id} failed:`, err.message);
});

module.exports = searchWorker;
