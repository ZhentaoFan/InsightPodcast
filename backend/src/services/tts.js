const ElevenLabs = require("elevenlabs-node");

const elevenLabs = new ElevenLabs({
  apiKey: process.env.ELEVENLABS_API_KEY, // 从.env获取
  voiceId: "21m00Tcm4TlvDq8ikWAM", // 默认声音ID (Grace)
});

async function generateSpeech(text, outputPath) {
  try {
    // 生成音频文件
    await elevenLabs.textToSpeech({
      fileName: outputPath,
      textInput: text,
      stability: 0.5,
      similarityBoost: 0.8,
    });

    return outputPath;
  } catch (error) {
    console.error("TTS generation failed:", error);
    throw new Error("Failed to generate audio");
  }
}

module.exports = { generateSpeech };
