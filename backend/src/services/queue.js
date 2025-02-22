const Queue = require("bull"); // Assuming you're using Bull library
const { redisConfig } = require("../../config/redis");

// 任务队列定义
const audioQueue = new Queue("pdfToPodcast", {
  connection: redisConfig,
  defaultJobOptions: {
    attempts: 1, // set to 3
    backoff: {
      type: "exponential",
      delay: 5000,
    },
  },
});

// 添加任务到队列
async function addPodcastJob(jobId, pdfPath, filename) {
  await audioQueue.add(jobId, {
    jobId,
    pdfPath,
    filename,
  });
}

// 获取任务状态的方法
async function getJobStatus(jobId) {
  // const job = await audioQueue.getJobByName(jobId);
  const job = await getJobByName(audioQueue, jobId);
  console.log("jobs found", jobId);
  if (!job) return null;

  const state = await job.getState(); // 获取任务状态
  // console.log('state' + state)
  const progress = await job.progress(); // 获取任务进度
  // console.log('progress' + progress)
  const result = job.returnvalue; // 获取任务结果（完成时的音频地址等）
  // console.log('result', result)

  return {
    status: state,
    progress: progress,
    audioUrl: result ? result.audioUrl : null, // 如果任务完成，返回音频地址
    filename: result ? result.filename : null,
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

async function getCompletedJobs() {
  return await audioQueue.getJobs(["completed"]);
}

// Export as CommonJS
module.exports = {
  audioQueue,
  addPodcastJob,
  getJobStatus,
  getCompletedJobs,
};
