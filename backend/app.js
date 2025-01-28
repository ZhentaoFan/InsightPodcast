require("dotenv").config();
require("./src/workers/audioWorker.js");

const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
const uploadRouter = require("./src/routes/upload");
const cors = require("cors");

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
