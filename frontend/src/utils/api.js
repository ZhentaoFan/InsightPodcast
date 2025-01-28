import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:3000/api", // 后端 API 地址
});

export const uploadPaper = (file) => {
  const formData = new FormData();
  formData.append("paper", file);
  return api.post("/upload", formData);
};

export const getStatus = (jobId) => {
  return api.get(`/status/${jobId}`);
};
