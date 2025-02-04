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

    // Select the first 10,000 words
    const first10000Words = words.slice(0, 15000);

    // Join the words back into a single string
    const truncatedText = first10000Words.join(" ");

    progressCallback(15);

    // const client = new OpenAI({
    //   baseURL: 'https://api.deepseek.com',
    //   apiKey: process.env.DeepSeek_API_KEY,
    // });


    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
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
            "</Paper>, 请生成由三个专家讨论这篇论文的播客对话, 该播客旨在介绍这篇论文, 这个三个分别是<Expert杨飞飞></Expert杨飞飞>, <Expert奥立昆></Expert奥立昆>, <Expert李特曼></Expert李特曼>, 按照这个tag格式生成对话, <Expert杨飞飞>是主持人角色, 他们之间互相称呼就是杨飞飞,奥立昆,李特曼,播客内容要具体丰富且足够长, 每轮对话也要长, 但是不要说太多车轱辘话, 信息密度要足够大, 受众是专家群体,所以不用解释常见的专业内容,但是要足够足够的有深度,一些专业术语可以直接用英文,长度是最关键的, 能怎么长就怎么长, 分成连续的三等分生成, 分别是<Section1><Section2><Section3>, 播客内容本身并没有分section, 所以section之间要连贯,每段用<SectionX></SectionX>包起来,请勿说车轱辘话,先生成<Section1>"
        },
      ],
      model: "gpt-4o-mini",
      // model: "o1",
    });

    // let answer = 'sssssssss';//response.choices[0].message.content;
    let answer1 = response_stage_1.choices[0].message.content;
    console.log('1, ', answer1);


    const response_stage_2 = await client.chat.completions.create({
      messages: [
        {
          role: "user",
          content:
            "Please do an analysis for this paper, reply in Chinese, here is the paper <Paper>" +
            truncatedText +
            "</Paper>, 请生成由三个专家讨论这篇论文的播客对话, 该播客旨在介绍这篇论文, 这个三个分别是<Expert杨飞飞></Expert杨飞飞>, <Expert奥立昆></Expert奥立昆>, <Expert李特曼></Expert李特曼>, 按照这个tag格式生成对话, <Expert杨飞飞>是主持人角色, 他们之间互相称呼就是杨飞飞,奥立昆,李特曼,播客内容要具体丰富且足够长, 每轮对话也要长, 但是不要说太多车轱辘话, 信息密度要足够大, 受众是专家群体,所以不用解释常见的专业内容,但是要足够足够的有深度,一些专业术语可以直接用英文,长度是最关键的, 能怎么长就怎么长, 分成连续的三等分生成, 分别是<Section1><Section2><Section3>, 播客内容本身并没有分section, 所以section之间要连贯,每段用<SectionX></SectionX>包起来,以下是<Section1>" +
            answer1 + 
            "请生成<Section2>请勿说车轱辘话,紧紧围绕论文的创新点和具体细节进行讨论,不要发散展开"
        },
      ],
      model: "gpt-4o-mini",
      // model: "o1",
    });   

    let answer2 = response_stage_2.choices[0].message.content;
    console.log('2, ', answer2);


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
            "请生成<Section3>请勿说车轱辘话,紧紧围绕论文的创新点和具体细节进行讨论,不要发散展开"
        },
      ],
      model: "gpt-4o-mini",
      // model: "o1",
    });   

    let answer3 = response_stage_3.choices[0].message.content;
    console.log('3, ', answer3);

    console.log('Overall,'+answer1+answer2+answer3)

    // 这里合并三个section的内容到一个变量
    let combinedText = answer1 + answer2 + answer3;

    // 使用正则表达式去掉<SectionX>和</SectionX>标签
    combinedText = combinedText
        .replace(/<Section\d+>/g, '')
        .replace(/<\/Section\d+>/g, '');

    console.log('Stripped Overall:', combinedText);
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


    const outputPath = `/Users/zhentaofan/Documents/GitHub/InsightPodcast/backend/final_podcast_${jobId}.mp3`;
    await generatePodcastAudio(combinedText, outputPath);

    // // 3. 分块处理
    // const chunks = splitText(answer1+answer2+answer3, 2000);
    // progressCallback(40);

    // console.log("chunk length:", chunks.length);



    // const responses = '2'
    // responses = '1' // breakpoint

    // // 4. 生成语音片段
    // for (let i = 0; i < chunks.length; i++) {
    //   const outputPath = join(
    //     "/Users/zhentaofan/Documents/GitHub/InsightPodcast/backend/" +
    //       outputDir,
    //     `${jobId}_segment_${i}.mp3`,
    //   );
    //   await generateSpeech(chunks[i], outputPath);
    //   tempFiles.push(outputPath);
    //   progressCallback(40 + Math.floor((i / chunks.length) * 40));
    // }
    // progressCallback(95);

    // // 5. 合并音频
    // const finalPath = join(
    //   "/Users/zhentaofan/Documents/GitHub/InsightPodcast/backend/" + outputDir,
    //   `${jobId}.mp3`,
    // );
    // await mergeAudioFiles(tempFiles, finalPath);
    progressCallback(100);

    // // 6. 清理临时文件
    // tempFiles.forEach((f) => fs.existsSync(f) && fs.unlinkSync(f));

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
