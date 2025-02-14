const { execSync } = require("child_process");
const { join } = require("path");
const fs = require("fs");
const { extractTextFromPDF } = require("../services/pdfParser");
const { generateSpeech, generatePodcastAudio } = require("../services/tts");
const OpenAI = require("openai");

// 添加进度回调支持
async function processPodcastJob(jobId, pdfPath, progressCallback) {
  const outputDir = process.env.AUDIO_OUTPUT_DIR;
  const tempFiles = [];
  try {
    // 1. 确保输出目录存在
    console.log("start process");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    progressCallback(10);

    // 2. 提取PDF文本
    const text = await extractTextFromPDF(pdfPath);

    const words = text.split(/\s+/); // \s+ matches any whitespace (spaces, tabs, newlines)

    const test = 1;
    test = 2;

    // Select the first 10,000 words
    const first15000Words = words.slice(0, 15000);

    // Join the words back into a single string
    const truncatedText = first15000Words.join(" ");

    progressCallback(15);

    // const client = new OpenAI({
    //   baseURL: 'https://api.deepseek.com',
    //   apiKey: process.env.DeepSeek_API_KEY,
    // });

    const client = new OpenAI({
      organization: process.env.OpenAI_Org,
      project: process.env.OpenAI_proj,
    });

    const response_stage_1 = await client.chat.completions.create({
      messages: [
        {
          role: "user",
          content:
            "Please do an analysis for this paper, reply in Chinese, here is the paper <Paper>" +
            truncatedText +
            "</Paper>, 请生成由三个专家讨论这篇论文的播客对话, 该播客旨在介绍这篇论文, 这个三个分别是<Expert杨飞飞></Expert杨飞飞>, <Expert奥立昆></Expert奥立昆>, <Expert李特曼></Expert李特曼>, 按照这个tag格式生成对话, <Expert杨飞飞>是主持人角色, 他们之间互相称呼就是杨飞飞,奥立昆,李特曼,播客内容要具体丰富且足够长, 每轮对话也要长, 但是不要说太多车轱辘话, 信息密度要足够大, 受众是专家群体,所以不用解释常见的专业内容,但是要足够足够的有深度,一些专业术语可以直接用英文,长度是最关键的, 能怎么长就怎么长, 分成连续的三等分生成, 分别是<Section1><Section2><Section3>, 播客内容本身并没有分section, 所以section之间要连贯,每段用<SectionX></SectionX>包起来,请勿说车轱辘话,先生成<Section1>",
        },
      ],
      model: "gpt-4o-mini",
      // model: "o1",
    });

    let answer1 = response_stage_1.choices[0].message.content;
    console.log("1, ", answer1);

    progressCallback(40);

    const response_stage_2 = await client.chat.completions.create({
      messages: [
        {
          role: "user",
          content:
            "Please do an analysis for this paper, reply in Chinese, here is the paper <Paper>" +
            truncatedText +
            "</Paper>, 请生成由三个专家讨论这篇论文的播客对话, 该播客旨在介绍这篇论文, 这个三个分别是<Expert杨飞飞></Expert杨飞飞>, <Expert奥立昆></Expert奥立昆>, <Expert李特曼></Expert李特曼>, 按照这个tag格式生成对话, <Expert杨飞飞>是主持人角色, 他们之间互相称呼就是杨飞飞,奥立昆,李特曼,播客内容要具体丰富且足够长, 每轮对话也要长, 但是不要说太多车轱辘话, 信息密度要足够大, 受众是专家群体,所以不用解释常见的专业内容,但是要足够足够的有深度,一些专业术语可以直接用英文,长度是最关键的, 能怎么长就怎么长, 分成连续的三等分生成, 分别是<Section1><Section2><Section3>, 播客内容本身并没有分section, 所以section之间要连贯,每段用<SectionX></SectionX>包起来,以下是<Section1>" +
            answer1 +
            "请生成<Section2>请勿说车轱辘话,紧紧围绕论文的创新点和具体细节进行讨论,不要发散展开",
        },
      ],
      model: "gpt-4o-mini",
      // model: "o1",
    });

    let answer2 = response_stage_2.choices[0].message.content;
    console.log("2, ", answer2);

    progressCallback(65);

    const response_stage_3 = await client.chat.completions.create({
      messages: [
        {
          role: "user",
          content:
            "Please do an analysis for this paper, reply in Chinese, here is the paper <Paper>" +
            truncatedText +
            "</Paper>, 请生成由三个专家讨论这篇论文的播客对话, 该播客旨在介绍这篇论文, 这个三个分别是<Expert杨飞飞></Expert杨飞飞>, <Expert奥立昆></Expert奥立昆>, <Expert李特曼></Expert李特曼>, 按照这个tag格式生成对话, <Expert杨飞飞>是主持人角色, 他们之间互相称呼就是杨飞飞,奥立昆,李特曼,播客内容要具体丰富且足够长, 每轮对话也要长, 但是不要说太多车轱辘话, 信息密度要足够大, 受众是专家群体,所以不用解释基本的专业内容,但是要足够足够的有深度,一些专业术语可以直接用英文,紧紧围绕论文的创新点和具体细节进行讨论,不要发散展开,长度是最关键的, 能怎么长就怎么长, 分成连续的三等分生成, 分别是<Section1><Section2><Section3>, 播客内容本身并没有分section, 所以section之间要连贯,每段用<SectionX></SectionX>包起来,以下是<Section1>" +
            answer1 +
            "以下是<Section2>" +
            answer2 +
            "请生成<Section3>请勿说车轱辘话,紧紧围绕论文的创新点和具体细节进行讨论,不要发散展开",
        },
      ],
      model: "gpt-4o-mini",
      // model: "o1",
    });

    let answer3 = response_stage_3.choices[0].message.content;
    console.log("3, ", answer3);

    console.log("Overall," + answer1 + answer2 + answer3);

    // 这里合并三个section的内容到一个变量
    let combinedText = answer1 + answer2 + answer3;

    // 使用正则表达式去掉<SectionX>和</SectionX>标签
    combinedText = combinedText
      .replace(/<Section\d+>/g, "")
      .replace(/<\/Section\d+>/g, "");

    console.log("\n\n\nStripped Overall:", combinedText);
    progressCallback(90);

    const outputPath =
      `/Users/zhentaofan/Documents/GitHub/InsightPodcast/backend/` +
      outputDir +
      `/${jobId}.mp3`;
    await generatePodcastAudio(combinedText, outputPath);

    progressCallback(100);

    return outputPath;
  } catch (error) {
    // 清理所有可能残留的文件
    [pdfPath, ...tempFiles].forEach((f) => {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    });
    throw error;
  }
}

// Export the function
module.exports = {
  processPodcastJob,
};
