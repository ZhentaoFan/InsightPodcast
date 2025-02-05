// const axios = require("axios");
// const fs = require("fs");

// // 初始化 Minimax T2A 配置
// const minimaxConfig = {
//   apiKey: process.env.MINIMAX_API_KEY, // 从环境变量获取
//   groupId: process.env.MINIMAX_GROUP_ID, // 从环境变量获取组ID
//   baseUrl: "https://api.minimaxi.chat/v1/t2a_v2",
//   // defaultVoice: "male-qn-qingse", // 默认声音ID
//   "speed": 1.1,
//   defaultVoice: "Wise_Woman",
//   model: "speech-01-hd", // 默认使用高清模型
// };

// async function generateSpeech(vid, text, outputPath) {
//   try {
//     // 构建请求参数
//     const requestBody = {
//       model: minimaxConfig.model,
//       text: text,
//       stream: false,
//       voice_setting: {
//         voice_id: vid,
//         speed: 1,
//         vol: 1,
//         pitch: 0,
//       },
//       audio_setting: {
//         sample_rate: 32000,
//         bitrate: 128000,
//         format: "mp3",
//         channel: 1,
//       },
//     };

//     // 发送 API 请求
//     const response = await axios.post(
//       `${minimaxConfig.baseUrl}?GroupId=${minimaxConfig.groupId}`,
//       requestBody,
//       {
//         headers: {
//           Authorization: `Bearer ${minimaxConfig.apiKey}`,
//           "Content-Type": "application/json",
//         },
//       },
//     );

//     // 处理响应数据
//     if (response.data.base_resp.status_code !== 0) {
//       throw new Error(`API Error: ${response.data.base_resp.status_msg}`);
//     }

//     // 将 hex 音频数据转换为 Buffer
//     const audioBuffer = Buffer.from(response.data.data.audio, "hex");

//     // 写入文件
//     await fs.promises.writeFile(outputPath, audioBuffer);

//     return outputPath;
//   } catch (error) {
//     console.error("TTS generation failed:", error);
//     throw new Error("Failed to generate audio");
//   }
// }

// module.exports = { generateSpeech };

/**
 * tts.js
 * ------------
 * 用于多角色播客文本生成音频
 * 按角色（<Expert某某>）拆分文本，每段调用 Minimax T2A 服务合成音频，
 * 再合并成一个完整的播客音频文件。
 */

const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

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
    const requestBody = {
      model: minimaxConfig.model,
      text: text,
      stream: false,
      voice_setting: {
        voice_id: vid, // 不同角色传不同的 ID
        speed: 1.2,
        vol: 1,
        pitch: 0,
      },
      audio_setting: {
        sample_rate: 32000,
        bitrate: 128000,
        format: "mp3",
        channel: 1,
      },
    };

    // 发送 API 请求
    const response = await axios.post(
      `${minimaxConfig.baseUrl}?GroupId=${minimaxConfig.groupId}`,
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${minimaxConfig.apiKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    // 检查响应状态
    if (response.data.base_resp.status_code !== 0) {
      throw new Error(`API Error: ${response.data.base_resp.status_msg}`);
    }

    // 将 hex 音频数据转换为 Buffer
    const audioBuffer = Buffer.from(response.data.data.audio, "hex");

    // 写入文件
    await fs.promises.writeFile(outputPath, audioBuffer);

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

  // 调用 ffmpeg 进行音频拼接
  // 注意：需要保证系统已安装 ffmpeg
  execSync(`ffmpeg -f concat -safe 0 -i "${listFile}" -c copy "${outputPath}"`);

  // 删除临时文件
  fs.unlinkSync(listFile);
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

  // 3. 映射不同专家到不同vid
  const speakerVidMap = {
    杨飞飞: "Wise_Woman",
    奥立昆: "Deep_Voice_Man",
    李特曼: "Young_Knight",
    // 如果还有其他人，可在这里继续扩展
  };

  // 4. 生成临时音频目录
  const tempDir = path.join(__dirname, "temp_audio");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // // 5. 逐段合成音频
  // const mp3Paths = [];
  // for (let i = 0; i < segments.length; i++) {
  //   const seg = segments[i];
  //   // 找到对应vid；若没有匹配到，则使用默认1
  //   const vid = speakerVidMap[seg.speaker] || "Wise_Woman";
  //   const text = seg.text;

  //   const segmentPath = path.join(tempDir, `segment_${i}.mp3`);
  //   await generateSpeech(vid, text, segmentPath);
  //   mp3Paths.push(segmentPath);
  // }

  const tasks = segments.map((seg, i) => {
    // 找到对应vid；若没有匹配到，则使用默认值
    const vid = speakerVidMap[seg.speaker] || "Wise_Woman";
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
