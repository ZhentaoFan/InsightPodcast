require("dotenv").config();
require("./src/workers/audioWorker.js");
require("./src/workers/searchWorker.js");
require("./src/utils/search.js");
const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
const uploadRouter = require("./src/routes/upload");
const cors = require("cors");
const { getJobStatus, getCompletedJobs } = require("./src/services/queue");
const {
  googleCustomSearch,
  getSearchJobStatus,
} = require("./src/services/searchQueue.js");
const { getLLMResponse } = require("./src/services/chatbot.js")
const OpenAI = require("openai");
const WebSocket = require("ws");

const fs = require("fs");

const path = require("path");

app.use("/audio", express.static(path.join(__dirname, "src/storage/audio")));

app.use(
  cors({
    origin: "http://localhost:5173", // 前端开发服务器地址
  }),
);

// 示例：检查配置是否生效
console.log("Running in mode:", process.env.NODE_ENV);
console.log("Upload directory:", process.env.UPLOAD_DIR);

// 中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// PDF Uploading
app.use("/api/upload", uploadRouter);

// 新建聊天接口：POST /api/chat
app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages) {
      return res.status(400).json({ error: "消息不能为空" });
    }
    console.log(messages);
    const reply = await getLLMResponse(messages);

    res.status(200).json({ reply });
  } catch (error) {
    console.error("Error in /api/chat:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// New endpoint: GET /api/searchStatus/:jobId
app.get("/api/searchStatus/:jobId", async (req, res) => {
  try {
    const { jobId } = req.params;
    const searchStatus = await getSearchJobStatus(jobId);
    if (!searchStatus)
      return res.status(404).json({ error: "Search job not found" });
    res.status(200).json({
      jobId: jobId,
      status: searchStatus.status,
      relevantPaperLink: searchStatus.relevantPaperLink,
    });
  } catch (error) {
    console.error("Failed to fetch search job status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/status/:jobId
app.get("/api/status/:jobId", async (req, res) => {
  try {
    const { jobId } = req.params;
    const jobStatus = await getJobStatus(jobId); // 从队列中查询任务状态

    if (!jobStatus) {
      return res.status(404).json({ error: "Job not found" });
    }

    res.status(200).json({
      jobId: jobId,
      status: jobStatus.status,
      progress: jobStatus.progress,
      audioUrl: jobStatus.audioUrl, // 任务完成时的音频地址
    });
  } catch (error) {
    console.error("Failed to fetch job status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/history", async (req, res) => {
  try {
    const completedJobs = await getCompletedJobs(); // Use the encapsulated method
    console.log(completedJobs);

    const history = completedJobs
      .filter((job) => {
        // Ensure `audioUrl` exists and the file is still present
        if (job.returnvalue && job.returnvalue.audioUrl) {
          const audioFilePath = path.join(
            __dirname,
            "src/storage/audio", // Adjust the path to match your `audioUrl` directory
            path.basename(job.returnvalue.audioUrl),
          );
          return fs.existsSync(audioFilePath); // Check if the file exists
        }
        return false;
      })
      .map((job) => ({
        jobId: job.id,
        audioUrl: job.returnvalue.audioUrl, // Map only valid jobs with `audioUrl`
      }));

    res.status(200).json(history);
  } catch (error) {
    console.error("Failed to fetch history:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 健康检查路由
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});



// 连接到 OpenAI Realtime API
const openaiUrl = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17";
const openaiWs = new WebSocket(openaiUrl, {
  headers: {
    "Authorization": "Bearer " + process.env.OPENAI_API_KEY,
    "OpenAI-Beta": "realtime=v1",
    "model": "gpt-4o-realtime-preview-2024-12-17",

  },
});

openaiWs.on("open", () => {
  console.log("Connected to OpenAI Realtime API");
  // 也可先发送 session.update 或 response.create 等，获取 session.id
});

openaiWs.on("message", (rawMsg) => {
  const data = JSON.parse(rawMsg.toString());
  // console.log("Received from OpenAI:", data);

  // 将OpenAI返回的事件广播给前端
  frontendWss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
});

openaiWs.on("error", (err) => {
  console.error("OpenAI WebSocket error:", err);
});

openaiWs.on("close", () => {
  console.log("OpenAI WebSocket closed");
});

// 创建前端 WebSocket 服务
const frontendWss = new WebSocket.Server({ port: 8080, path: "/ws" });

frontendWss.on("connection", (ws) => {
  console.log("Frontend client connected");

  ws.on("message", async (messageBuffer) => {
    const parsed = JSON.parse(messageBuffer.toString());
    if (parsed.type === "audioChunk") {
      // 1. 这里接收到前端的音频分块 Base64
      // 如果 OpenAI 需要 pcm16 base64，你可能要在这里用 ffmpeg 转码
      // 假设此时已经是 pcm16 base64，直接发给 OpenAI
      // 拿到 webm/opus Base64，转成 PCM16
      console.log(parsed);
      convertWebmOpusToPCM16(parsed.data, (err, pcmBase64) => {
        if (err) {
          console.error("FFmpeg 转码失败:", err);
          return;
        }
        // 成功后，把 pcmBase64 发送给 OpenAI
        const event = {
          type: "input_audio_buffer.append",
          audio: pcmBase64, // 24kHz 单声道 PCM16 的 Base64
        };
        openaiWs.send(JSON.stringify(event));
      });
      
    } else if (parsed.type === "audioCommit") {
      // 2. 前端告诉后端“录音结束”，后端提交
      const event = {
        type: "input_audio_buffer.commit",
      };
      openaiWs.send(JSON.stringify(event));
    } else if (parsed.type === "text") {
      console.log("\n\n\n\n\n"+parsed.text+"\n\n\n\n\n");

      // 如果用户也想发文字
      const event = {
        type: "response.create",
        response: {
          modalities: ["audio", "text"],
          instructions: parsed.text,
          output_audio_format: "pcm16", // 确保返回的也是 pcm16
        },
      };
      openaiWs.send(JSON.stringify(event));
    }
  });

  ws.on("close", () => {
    console.log("Frontend client disconnected");
  });
});

const ffmpeg = require("fluent-ffmpeg");
const { Readable } = require("stream");
function convertWebmOpusToPCM16(base64Webm, callback) {
  // 1. Base64 -> Buffer
  const webmBuffer = Buffer.from(base64Webm, "base64");

  // 2. 创建可读流
  const inputStream = new Readable();
  inputStream.push(webmBuffer);
  inputStream.push(null);

  // 3. 用 fluent-ffmpeg 转码
  let chunks = [];
  ffmpeg(inputStream)
    .inputFormat("webm")        // 指定输入格式
    .audioCodec("pcm_s16le")    // 16bit PCM
    .audioChannels(1)           // 单声道
    .audioFrequency(24000)      // 24kHz
    .format("s16le")            // 原始 PCM（无容器）
    .on("error", (err) => {
      callback(err);
    })
    .on("data", (chunk) => {
      chunks.push(chunk);
    })
    .on("end", () => {
      // 转换完成，合并数据
      const outputBuffer = Buffer.concat(chunks);
      // 转成 Base64
      const base64PCM = outputBuffer.toString("base64");
      callback(null, base64PCM);
    })
    .pipe(); // 不写输出文件，而是以流形式输出
}





// const frontendWss = new WebSocket.Server({ port: 8080, path: "/ws" });
// frontendWss.on("connection", (ws) => {
//   console.log("\n\n\nFrontend client connected");
  
//   ws.on("message", (message) => {
//     console.log("Received message from frontend:", message);
//     // 将 Buffer 转为字符串，并解析为对象
//     const msgStr = message.toString();
//     const parsedMsg = JSON.parse(msgStr);
//     // 假设 parsedMsg 格式为 { type: "text", text: "你好" }
//     const event = {
//       type: "response.create",
//       response: {
//         modalities: ["audio", "text"],
//         // 这里使用 parsedMsg.text 作为指令
//         instructions: parsedMsg.text,
//       }
//     };
//     if (openaiWs.readyState === openaiWs.OPEN) {
//       openaiWs.send(JSON.stringify(event));
//     } else {
//       console.error("OpenAI WebSocket is not open.");
//     }
//   });

//   ws.on("close", () => {
//     console.log("Frontend client disconnected");
//   });
// });





// // --- 连接到 OpenAI Realtime API ---
// const openaiUrl = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17";
// const openaiWs = new WebSocket(openaiUrl, {
//   headers: {
//     "Authorization": "Bearer " + process.env.OPENAI_API_KEY,
//     "OpenAI-Beta": "realtime=v1",
//   },
// });

// openaiWs.on("open", () => {
//   console.log("Connected to OpenAI Realtime API");
//   const event = {
//     type: "response.create",
//     response: {
//       modalities: ["audio", "text"],
//       instructions: "Hello",
//     },
//   };
//   openaiWs.send(JSON.stringify(event));
// });

// openaiWs.on("message", (message) => {
//   console.log("Received from OpenAI:", message.toString());
//   // 解析 OpenAI 返回的数据
//   const data = JSON.parse(message.toString());
//   // 将数据转发给所有前端客户端
//   frontendWss.clients.forEach((client) => {
//     if (client.readyState === WebSocket.OPEN) {
//       client.send(JSON.stringify(data));
//     }
//   });
// });










 
 
// const wss = new WebSocket.Server({ server, path: "/ws" });

// wss.on("connection", (ws, req) => {
//   console.log("WebSocket client connected");

//   // 可选：发送欢迎信息
//   ws.send(JSON.stringify({ role: "assistant", content: "欢迎进入实时语音对话！" }));

//   // 模拟定时推送实时消息（例如实时语音转文字、模型推理结果等）
//   const interval = setInterval(() => {
//     const message = { role: "assistant", content: "【实时消息】模型正在搜索思考..." };
//     ws.send(JSON.stringify(message));
//   }, 5000);

//   // 处理客户端消息（如果需要）
//   ws.on("message", async (message) => {
//     console.log("Received message from client:", message);
//     // 这里可以解析客户端消息，并根据需要进行处理后回复
//     // 例如，如果客户端发送了特定控制指令，则触发对应的业务逻辑
//   });

//   ws.on("close", () => {
//     console.log("WebSocket client disconnected");
//     clearInterval(interval);
//   });

//   ws.on("error", (error) => {
//     console.error("WebSocket error:", error);
//   });
// });