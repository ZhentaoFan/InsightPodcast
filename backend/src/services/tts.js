
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const OpenAI = require("openai");

const client = new OpenAI({
  organization: process.env.OpenAI_Org,
  project: process.env.OpenAI_proj,
});

// 初始化 Minimax T2A 配置
const minimaxConfig = {
  apiKey: process.env.MINIMAX_API_KEY, // 从环境变量获取
  groupId: process.env.MINIMAX_GROUP_ID, // 从环境变量获取组ID
  baseUrl: "https://api.minimaxi.chat/v1/t2a_v2",
  model: "speech-01-hd", // 默认使用高清模型
};

/**
 * 生成单段 TTS 音频
 * @param {Number} vid 不同说话人对应不同的 voice_id
 * @param {String} text 要生成的文本
 * @param {String} outputPath 输出音频文件路径
 */
async function generateSpeech(vid, text, outputPath) {
  try {
    // 构建请求参数
    // const requestBody = {
    //   model: minimaxConfig.model,
    //   text: text,
    //   stream: false,
    //   voice_setting: {
    //     voice_id: vid, // 不同角色传不同的 ID
    //     speed: 1.2,
    //     vol: 1,
    //     pitch: 0,
    //   },
    //   audio_setting: {
    //     sample_rate: 32000,
    //     bitrate: 128000,
    //     format: "mp3",
    //     channel: 1,
    //   },
    // };

    // // 发送 API 请求
    // const response = await axios.post(
    //   `${minimaxConfig.baseUrl}?GroupId=${minimaxConfig.groupId}`,
    //   requestBody,
    //   {
    //     headers: {
    //       Authorization: `Bearer ${minimaxConfig.apiKey}`,
    //       "Content-Type": "application/json",
    //     },
    //   },
    // );

    // const response = await client.chat.completions.create({
    //   model: "gpt-4o-audio-preview",        // 示例模型名称
    //   modalities: ["text", "audio"],        // 同时返回文本和音频
    //   audio: { voice: vid, format: "mp3" },      // 指定语音和音频格式
    //   messages: [
    //     {
    //       role: "user",
    //       content: text,
    //     },
    //   ],
    //   store: true, // 是否在服务器端存储对话，视具体需求而定
    // });
    // const response = client.audio.speech.create(
    //   model="tts-1",
    //   voice=vid,
    //   input=text,
    // )
    // response.stream_to_file(outputPath)
    // 从返回中获取音频的 base64 字符串
    // const audioBase64 = response.audio;
    // const audioBuffer = Buffer.from(audioBase64, "base64");

    // 检查响应状态
    // if (response.data.base_resp.status_code !== 0) {
    //   throw new Error(`API Error: ${response.data.base_resp.status_msg}`);
    // }

    // // 将 hex 音频数据转换为 Buffer
    // const audioBuffer = Buffer.from(response.data.data.audio, "hex");

    // 写入文件
    // await fs.promises.writeFile(outputPath, audioBuffer);

    const response = await axios.post(
      "https://api.openai.com/v1/audio/speech",
      {
        model: "tts-1",     // 示例模型
        voice: vid,             // 语音名称，如 "alloy", "echo" 等
        input: text,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, // 你的 API Key
        },
        responseType: "arraybuffer", // 告诉 axios 以二进制流返回数据
      }
    );

    // 把返回的二进制数据写入 outputPath
    fs.writeFileSync(outputPath, response.data);

    return outputPath;
  } catch (error) {
    console.error("TTS generation failed:", error);
    throw new Error("Failed to generate audio");
  }
}

/**
 * 合并多段音频文件
 * 使用 ffmpeg 的 concat 模式
 * @param {String[]} inputPaths 分段 MP3 文件路径数组
 * @param {String} outputPath 目标输出文件
 */
function mergeAudioFiles(inputPaths, outputPath) {
  // 写入临时文件 filelist.txt，用于 ffmpeg concat
  const tempDir = path.join(__dirname, "temp_merge");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  const listFile = path.join(tempDir, "filelist.txt");
  fs.writeFileSync(listFile, inputPaths.map((p) => `file '${p}'`).join("\n"));
  const mergedFile = path.join(tempDir, "merged.mp3");

  // 调用 ffmpeg 进行音频拼接
  // 注意：需要保证系统已安装 ffmpeg
  execSync(`ffmpeg -f concat -safe 0 -i "${listFile}" -c copy "${mergedFile}"`);

  // 删除临时文件
  fs.unlinkSync(listFile);

  execSync(`ffmpeg -i "${mergedFile}" -filter:a "atempo=1.2" "${outputPath}"`);

  fs.unlinkSync(mergedFile);
  fs.rmdirSync(tempDir, { recursive: true });
}

/**
 * 根据含 <Expert某某> 标签的长文本，分别为不同说话人合成音频，然后合并为播客文件
 * @param {String} fullText 包含 <Expert某某> 标签的完整对话文本
 * @param {String} finalAudioPath 输出的完整播客 MP3 路径
 */
async function generatePodcastAudio(fullText, finalAudioPath) {
  // 1. 预处理文本，去除多余换行或其他标签
  let sanitizedText = fullText.replace(/\r\n/g, "\n");
  // 可选：去除 <SectionX> 标签
  sanitizedText = sanitizedText
    .replace(/<Section\d+>/g, "")
    .replace(/<\/Section\d+>/g, "");

  // 2. 使用正则提取出每段的说话人和发言内容
  //    例如： <Expert杨飞飞> ...发言... （直到下一个 <Expert 或文末）
  const pattern = /<Expert([^>]+)>([\s\S]*?)(?=<Expert|$)/g;
  let matches;
  const segments = [];

  while ((matches = pattern.exec(sanitizedText)) !== null) {
    // matches[1] => 专家姓名(如 "杨飞飞")
    // matches[2] => 发言内容
    const speakerName = matches[1].trim();
    const content = matches[2].trim();
    segments.push({
      speaker: speakerName,
      text: content,
    });
  }

  // // 3. 映射不同专家到不同vid
  // const speakerVidMap = {
  //   杨飞飞: "Wise_Woman",
  //   奥立昆: "Deep_Voice_Man",
  //   李特曼: "Young_Knight",
  //   // 如果还有其他人，可在这里继续扩展
  // };
  const speakerVidMap = {
    杨飞飞: "onyx",
    奥立昆: "echo",
    李特曼: "coral",
    // 可自行拓展更多说话人
  };

  // 4. 生成临时音频目录
  const tempDir = path.join(__dirname, "temp_audio");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const tasks = segments.map((seg, i) => {
    // 找到对应vid；若没有匹配到，则使用默认值
    const vid = speakerVidMap[seg.speaker] || "alloy";
    const text = seg.text;
    const segmentPath = path.join(tempDir, `segment_${i}.mp3`);
    // 返回一个 Promise
    return generateSpeech(vid, text, segmentPath).then(() => segmentPath);
  });

  // 使用 Promise.all 并行执行
  const mp3Paths = await Promise.all(tasks);

  // 6. 合并所有分段音频到最终播客文件
  mergeAudioFiles(mp3Paths, finalAudioPath);

  // 7. 删除临时分段文件
  mp3Paths.forEach((file) => fs.unlinkSync(file));
  fs.rmdirSync(tempDir, { recursive: true });

  console.log("播客音频已生成:", finalAudioPath);
}

// 导出所需函数
module.exports = {
  generateSpeech, // 生成单段 TTS
  generatePodcastAudio, // 生成完整播客
};
