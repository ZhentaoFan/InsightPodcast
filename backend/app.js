require("dotenv").config();
require("./src/workers/audioWorker.js");

const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
const uploadRouter = require("./src/routes/upload");
const cors = require("cors");
const { getJobStatus } = require("./src/services/queue");

const path = require("path");

app.use(
  "/audio",
  express.static(path.join(__dirname, "src/storage/audio"))
);

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
