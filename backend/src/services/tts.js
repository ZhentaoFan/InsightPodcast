const axios = require("axios");
const fs = require("fs");

// 初始化 Minimax T2A 配置
const minimaxConfig = {
  apiKey: process.env.MINIMAX_API_KEY, // 从环境变量获取
  groupId: process.env.MINIMAX_GROUP_ID, // 从环境变量获取组ID
  baseUrl: "https://api.minimaxi.chat/v1/t2a_v2",
  // defaultVoice: "male-qn-qingse", // 默认声音ID
  "speed": 1.1,
  defaultVoice: "Wise_Woman",
  model: "speech-01-hd", // 默认使用高清模型
};

async function generateSpeech(text, outputPath) {
  try {
    // 构建请求参数
    const requestBody = {
      model: minimaxConfig.model,
      text: text,
      stream: false,
      voice_setting: {
        voice_id: minimaxConfig.defaultVoice,
        speed: 1,
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

    // 处理响应数据
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

module.exports = { generateSpeech };
