const { Worker } = require("bullmq");
const { redisConfig } = require("../../config/redis");
const { processPodcastJob } = require("./processJob");

const fs = require("fs");

const worker = new Worker(
  "pdfToPodcast",
  async (job) => {
    try {
      const { jobId, pdfPath } = job.data;
      await job.updateProgress(5);

      // const finalAudioPath = await processPodcastJob(jobId, pdfPath);
      const finalAudioPath = await processPodcastJob(
        jobId,
        pdfPath,
        (progress) => {
          job.updateProgress(progress);
        },
      );

      // fs.unlinkSync(pdfPath);

      return {
        status: "completed",
        audioUrl: `/audio/${jobId}.mp3`,
        fileSize: fs.statSync(finalAudioPath).size,
      };
    } catch (error) {
      console.error(`Job ${job.id} failed:`, error);
      // if (fs.existsSync(job.data.pdfPath)) {
      //   fs.unlinkSync(job.data.pdfPath);
      // }
      throw new Error(error.message);
    }
  },
  {
    connection: redisConfig,
    concurrency: 2,
    autorun: true,
  },
);

worker.on("progress", (job, progress) => {
  console.log(`Job ${job.id} progress: ${progress}%`);
});

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`Job ${job.id} failed:`, err.message);
});

module.exports = worker;
