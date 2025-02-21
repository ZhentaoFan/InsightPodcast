const pdf = require("pdf-parse");
const fs = require("fs");

async function extractTextFromPDF(pdfPath) {
  try {
    const dataBuffer = fs.readFileSync(
      "/home/zhentao_fan/InsightPodcast/backend/" + pdfPath,
    );
    const data = await pdf(dataBuffer);

    // 清理文本（移除换行符等）
    return data.text.replace(/(\r\n|\n|\r)/gm, " ").replace(/\s+/g, " ");
  } catch (error) {
    console.error("PDF extraction failed:", error);
    throw new Error("Failed to read PDF");
  }
}

module.exports = { extractTextFromPDF };
