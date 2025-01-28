// import { Worker } from 'bullmq';
// import { redisConfig } from '../../config/redis.js';
// import { processPodcastJob } from './processJob.js';
// import fs from 'fs';

// // 初始化工作进程
// const worker = new Worker('pdfToPodcast', async (job) => {
//   try {
//     const { jobId, pdfPath } = job.data;
    
//     // 更新任务进度
//     await job.updateProgress(10);
    
//     // 执行核心处理逻辑
//     const finalAudioPath = await processPodcastJob(jobId, pdfPath);
    
//     // 清理原始PDF文件（根据需求保留）
//     fs.unlinkSync(pdfPath);
    
//     return {
//       status: 'completed',
//       audioUrl: `/audio/${jobId}.mp3`,
//       fileSize: fs.statSync(finalAudioPath).size
//     };
    
//   } catch (error) {
//     // 记录详细错误日志
//     console.error(`Job ${job.id} failed:`, error);
    
//     // 清理残留文件
//     if (fs.existsSync(job.data.pdfPath)) {
//       fs.unlinkSync(job.data.pdfPath);
//     }
    
//     throw new Error(error.message);
//   }
// }, {
//   connection: redisConfig,
//   concurrency: 2,  // 并行任务数
//   autorun: true
// });

// // 事件监听器
// worker.on('progress', (job, progress) => {
//   console.log(`Job ${job.id} progress: ${progress}%`);
// });

// worker.on('completed', (job) => {
//   console.log(`Job ${job.id} completed`);
//   // 这里可以触发通知邮件/Webhook
// });

// worker.on('failed', (job, err) => {
//   console.error(`Job ${job.id} failed:`, err.message);
// });





const { Worker } = require('bullmq');
const { redisConfig } = require('../../config/redis');
const { processPodcastJob } = require('./processJob');

const fs = require('fs');

const worker = new Worker(
  'pdfToPodcast',
  async job => {
    try {
      const { jobId, pdfPath } = job.data;
      await job.updateProgress(10);

      const finalAudioPath = await processPodcastJob(jobId, pdfPath);
      fs.unlinkSync(pdfPath);

      return {
        status: 'completed',
        audioUrl: `/audio/${jobId}.mp3`,
        fileSize: fs.statSync(finalAudioPath).size
      };
    } catch (error) {
      console.error(`Job ${job.id} failed:`, error);
      if (fs.existsSync(job.data.pdfPath)) {
        fs.unlinkSync(job.data.pdfPath);
      }
      throw new Error(error.message);
    }
  },
  {
    connection: redisConfig,
    concurrency: 2,
    autorun: true
  }
);

worker.on('progress', (job, progress) => {
  console.log(`Job ${job.id} progress: ${progress}%`);
});

worker.on('completed', job => {
  console.log(`Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err.message);
});

module.exports = worker;
