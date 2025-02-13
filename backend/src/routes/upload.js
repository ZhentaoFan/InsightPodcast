const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
// import './workers/audioWorker'; // 启动工作进程

const { addPodcastJob } = require("../services/queue"); // Changed to require
const { addSearchJob } = require("../services/searchQueue");
// 确保上传目录存在
const fs = require("fs");
const uploadDir = process.env.UPLOAD_DIR || "./storage/uploads";

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置 Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

// 文件过滤器 (只允许 PDF)
const fileFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files are allowed"), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 限制 50MB
  },
});

// POST /api/upload
router.post("/", upload.single("paper"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // 生成任务ID (后续处理用)
    const jobId = uuidv4();

    console.log("Uploaded file path:", req.file.path);


    // 将任务加入队列
    // console.log("sent");
    await addPodcastJob(jobId, req.file.path);
    console.log(jobId + "queued");

    // const paperQuery = path.basename(req.file.originalname, path.extname(req.file.originalname));
    // console.log('Paper', paperQuery);
    await addSearchJob(jobId, req.file.path);


    res.status(200).json({
      jobId: jobId,
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size,
      message: "File uploaded and processing started",
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 错误处理中间件
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: "File too large (max 50MB)" });
    }
    return res.status(400).json({ error: err.message });
  } else if (err) {
    return res.status(500).json({ error: err.message });
  }
  next();
});

module.exports = router;
