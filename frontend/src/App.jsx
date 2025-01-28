import { useState, useEffect } from "react";
import FileUpload from "./components/FileUpload";
import { uploadPaper, fetchJobStatus } from "./utils/api"; // fetchJobStatus to track progress
import "./App.css";

function App() {
  const [jobId, setJobId] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("idle");
  const [jobStatus, setJobStatus] = useState(null); // Track audio generation status
  const [audioUrl, setAudioUrl] = useState(null); // URL for generated audio
  const [progress, setProgress] = useState(null); // URL for generated audio

  // Polling for job status (useEffect hook)
  useEffect(() => {
    console.log(jobId)
    if (jobId) {
      const interval = setInterval(async () => {
        try {
          const response = await fetchJobStatus(jobId);
          setJobStatus(response.data.status);
          
          setProgress(response.data.progress)
          if (response.data.status === "completed") {
            setAudioUrl(response.data.audioUrl); // Set audio URL when generation is complete
            clearInterval(interval); // Stop polling when job is done
          }
        } catch (error) {
          console.error("Failed to fetch job status:", error);
          clearInterval(interval);
        }
      }, 100); // Poll every 5 seconds
      return () => clearInterval(interval);
    }
  }, [jobId]);

  // Handle file upload
  const handleUpload = async (file) => {
    try {
      setUploadStatus("uploading");
      const response = await uploadPaper(file);
      setJobId(response.data.jobId); // Save job ID
      setUploadStatus("success");
    } catch (error) {
      console.error("Upload failed:", error);
      setUploadStatus("error");
    }
  };

  return (
    <div className="app-container">
      <h1>Paper to Podcast Generator</h1>

      {/* Upload Section */}
      {uploadStatus === "idle" && (
        <div className="upload-section">
          <FileUpload onUpload={handleUpload} />
        </div>
      )}

      {/* Upload Progress */}
      {uploadStatus === "uploading" && (
        <div className="status-message">
          <p>⏳ Uploading your paper...</p>
        </div>
      )}

      {/* Upload Success & Processing Status */}
      {uploadStatus === "success" && (
        <div className="status-message success">
          <p>✅ Upload successful!</p>
          <div className="job-info">
            <p>Job ID: {jobId}</p>
            <p>
              {jobStatus === "completed"
                ? "Audio generation complete!"
                : `Audio generation in progress... (${progress || 0}%)`}
            </p>
          </div>
        </div>
      )}


      {/* Inspection View */}
      {jobStatus === "completed" && audioUrl && (
        <div className="inspection-view">
          <h2>🎧 Audio Inspection</h2>
          <audio controls>
            <source src={`http://localhost:3000${audioUrl}`} type="audio/mpeg" />
            Your browser does not support the audio element.
          </audio>
          <a href={`http://localhost:3000${audioUrl}`} download className="download-link">
            Download Audio
          </a>
        </div>
      )}


      {/* Upload Error */}
      {uploadStatus === "error" && (
        <div className="status-message error">
          <p>❌ Upload failed. Please try again.</p>
          <button
            onClick={() => setUploadStatus("idle")}
            className="retry-button"
          >
            Retry Upload
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
