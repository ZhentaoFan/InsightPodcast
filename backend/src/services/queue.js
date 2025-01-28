const Queue = require('bull'); // Assuming you're using Bull library
const { redisConfig } = require('../../config/redis');

// 任务队列定义
const audioQueue = new Queue('pdfToPodcast', {
  connection: redisConfig,
  defaultJobOptions: {
    attempts: 1, // set to 3
    backoff: {
      type: 'exponential',
      delay: 5000
    }
  }
});

// 添加任务到队列
async function addPodcastJob(jobId, pdfPath) {
  await audioQueue.add(jobId, {
    jobId,
    pdfPath
  });
}

// Export as CommonJS
module.exports = {
  audioQueue,
  addPodcastJob
};