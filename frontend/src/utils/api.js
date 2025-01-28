import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:3000/api", // 后端 API 地址
});

export const uploadPaper = (file) => {
  const formData = new FormData();
  formData.append("paper", file);
  return api.post("/upload", formData);
};

export async function fetchJobStatus(jobId) {
  const response = await api.get(`/status/${jobId}`);
  // console.log(response)
  if (!response.status == 200) {
    throw new Error("Failed to fetch job status");
  }
  return response;
}

export const fetchHistory = async () => {
  const response = await api.get("/history");
  return response;
};
