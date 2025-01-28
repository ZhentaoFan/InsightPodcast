import React, { useState } from "react";
import FileUpload from "../components/FileUpload";
import { uploadPaper } from "../utils/api";

const HomePage = () => {
  const [jobId, setJobId] = useState(null);

  const handleUpload = async (file) => {
    try {
      const response = await uploadPaper(file);
      setJobId(response.data.jobId);
    } catch (error) {
      console.error("Upload failed:", error);
    }
  };

  return (
    <div>
      <h1>Generate Podcast from Paper</h1>
      <FileUpload onUpload={handleUpload} />
      {jobId && (
        <div>
          <p>Job ID: {jobId}</p>
          <a href={`/status/${jobId}`}>Check Status</a>
        </div>
      )}
    </div>
  );
};

export default HomePage;
