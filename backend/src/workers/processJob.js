// import { execSync } from 'child_process';
const { execSync } = require("child_process");
const { join } = require("path");
const fs = require("fs");
const { extractTextFromPDF } = require("../services/pdfParser");
const { generateSpeech } = require("../services/tts");
const OpenAI = require("openai");

// import { join } from 'path';
// import fs from 'fs';

// 添加进度回调支持
async function processPodcastJob(jobId, pdfPath, progressCallback) {
  const outputDir = process.env.AUDIO_OUTPUT_DIR;
  const tempFiles = [];
  try {
    // 1. 确保输出目录存在
    console.log("start process");
    // if (!fs.existsSync(outputDir)) {
    //   fs.mkdirSync(outputDir, { recursive: true });
    // }
    // console.log('get the local pdf')
    // 2. 提取PDF文本
    const text = await extractTextFromPDF(pdfPath);
    // console.log('text', truncatedText)

    // Split the text into words (split by spaces or other word delimiters)
    const words = text.split(/\s+/); // \s+ matches any whitespace (spaces, tabs, newlines)

    // Select the first 10,000 words
    const first10000Words = words.slice(0, 10000);

    // Join the words back into a single string
    const truncatedText = first10000Words.join(" ");
    console.log("text", truncatedText);

    // const text = await extractTextFromPDF(pdfPath, (progress) => {
    //   job.updateProgress(progress); // Use BullMQ's progress update
    // });
    // progressCallback(20);
    // const dskey = process.env.DeepSeek_API_KEY; // 从.env获取
    // const client = new OpenAI({
    //   baseURL: 'https://api.deepseek.com',
    //   apiKey: process.env.DeepSeek_API_KEY,
    // });
    const client = new OpenAI({
      organization: process.env.OpenAI_Org,
      project: process.env.OpenAI_proj,
    });

    const response = await client.chat.completions.create({
      messages: [
        {
          role: "user",
          content:
            "Please do an analysis for this paper, reply in Chinese, here is the paper:" +
            truncatedText,
        },
      ],
      // messages: [{ role: "system", content: "Please do an analysis for this paper, here is the paper:" + truncatedText }],
      model: "gpt-4o",
    });
    let answer = response.choices[0].message.content;

    console.log(answer);
    // let text1 = '你好你好'
    // 3. 分块处理
    const chunks = splitText(answer, 4000);
    // progressCallback(30);

    console.log("chunk:", chunks.length);

    // 4. 生成语音片段
    for (let i = 0; i < chunks.length; i++) {
      // for (let i = 0; i < chunks.length; i++) {
      const outputPath = join(
        "/Users/zhentaofan/Documents/GitHub/InsightPodcast/backend/" +
          outputDir,
        `${jobId}_segment_${i}.mp3`,
      );
      await generateSpeech(chunks[i], outputPath);
      tempFiles.push(outputPath);
      // progressCallback(30 + Math.floor((i / chunks.length) * 50));
    }

    // 5. 合并音频
    const finalPath = join(
      "/Users/zhentaofan/Documents/GitHub/InsightPodcast/backend/" + outputDir,
      `${jobId}.mp3`,
    );
    await mergeAudioFiles(tempFiles, finalPath);
    // progressCallback(90);

    // 6. 清理临时文件
    tempFiles.forEach((f) => fs.existsSync(f) && fs.unlinkSync(f));

    return finalPath;
  } catch (error) {
    // 清理所有可能残留的文件
    [pdfPath, ...tempFiles].forEach((f) => {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    });
    throw error;
  }
}

// 辅助函数：文本分块
function splitText(text, maxLength) {
  const chunks = [];
  while (text.length > 0) {
    // Check if the remaining text has any spaces
    let chunk = text.substring(0, maxLength);
    const lastSpace = chunk.lastIndexOf(" ");

    // If a space is found, split at the space
    if (lastSpace !== -1) {
      chunk = chunk.substring(0, lastSpace);
    }

    // Add the chunk to the list
    chunks.push(chunk);

    // Remove the chunk from the text
    text = text.substring(chunk.length).trim();

    // If no spaces were found and we're left with long text,
    // split it forcibly to avoid an infinite loop
    if (lastSpace === -1 && chunk.length < maxLength) {
      break;
    }
  }
  return chunks;
}

// 辅助函数：合并音频（需安装ffmpeg）
// import { execSync } from 'child_process';
async function mergeAudioFiles(inputPaths, outputPath) {
  const listFile = join(process.env.AUDIO_OUTPUT_DIR, "filelist.txt");
  fs.writeFileSync(listFile, inputPaths.map((p) => `file '${p}'`).join("\n"));

  execSync(`ffmpeg -f concat -safe 0 -i ${listFile} -c copy ${outputPath}`);
  fs.unlinkSync(listFile);
}

// Export the function
module.exports = {
  processPodcastJob,
};
