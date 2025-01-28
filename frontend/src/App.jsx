import { useState, useEffect } from "react";
import FileUpload from "./components/FileUpload";
import { uploadPaper, fetchJobStatus, fetchHistory } from "./utils/api";
import "./App.css";

function App() {
  const [jobId, setJobId] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("idle");
  const [jobStatus, setJobStatus] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [progress, setProgress] = useState(null);
  const [viewHistory, setViewHistory] = useState(false);
  const [history, setHistory] = useState([]);

  // Polling for job status
  useEffect(() => {
    if (jobId) {
      const interval = setInterval(async () => {
        try {
          const response = await fetchJobStatus(jobId);
          setJobStatus(response.data.status);
          setProgress(response.data.progress);
          if (response.data.status === "completed") {
            setAudioUrl(response.data.audioUrl);
            clearInterval(interval);
          }
        } catch (error) {
          console.error("Failed to fetch job status:", error);
          clearInterval(interval);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [jobId]);

  // Fetch history
  const handleViewHistory = async () => {
    try {
      if (!viewHistory) {
        const response = await fetchHistory();
        setHistory(response.data);
      }
      setViewHistory(!viewHistory);
    } catch (error) {
      console.error("Failed to fetch history:", error);
    }
  };

  // Handle file upload
  const handleUpload = async (file) => {
    try {
      setUploadStatus("uploading");
      const response = await uploadPaper(file);
      setJobId(response.data.jobId);
      setUploadStatus("success");
    } catch (error) {
      console.error("Upload failed:", error);
      setUploadStatus("error");
    }
  };

  // Click on overlay to close the sidebar
  const closeSidebar = () => {
    setViewHistory(false);
  };

  return (
    <div className="app-container">
      {/* Top Navigation */}
      <nav className="top-nav">
        <div className="nav-logo">📄 to 🎧</div>
        <div className="nav-item" onClick={handleViewHistory}>
          {viewHistory ? "Hide History" : "View History"}
        </div>
      </nav>

      {/* Main Content (Does not move) */}
      <main className="main-content">
        <div className="content-wrapper">
          <h1 className="app-title">Paper to Podcast Generator</h1>
          <p className="app-subtitle">Convert your papers into audio.</p>

          {/* Upload Section */}
          {uploadStatus === "idle" && (
            <div className="card upload-section">
              <FileUpload onUpload={handleUpload} />
            </div>
          )}

          {/* Upload Progress */}
          {uploadStatus === "uploading" && (
            <div className="card status-message">
              <p>⏳ Uploading your paper...</p>
            </div>
          )}

          {/* Upload Success & Processing Status */}
          {uploadStatus === "success" && (
            <div className="card status-message success">
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
            <div className="card inspection-view">
              <h2>🎧 Audio Preview</h2>
              <audio controls>
                <source
                  src={`http://localhost:3000${audioUrl}`}
                  type="audio/mpeg"
                />
              </audio>
            </div>
          )}

          {/* Upload Error */}
          {uploadStatus === "error" && (
            <div className="card status-message error">
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
      </main>

      {/* Overlay + Sidebar */}
      {viewHistory && (
        <aside className="sidebar open">
          <div className="sidebar-content">
            <h2 className="sidebar-title">Audio History</h2>
            {history.length > 0 ? (
              <ul className="history-list">
                {history.map((job) => (
                  <li key={job.jobId} className="history-item">
                    <p>
                      <strong>Job ID:</strong> {job.jobId}
                    </p>
                    <audio
                      controls
                      key={job.audioUrl}
                      onLoadedMetadata={(e) =>
                        (e.target.style.display = "block")
                      }
                    >
                      <source
                        src={`http://localhost:3000${job.audioUrl}`}
                        type="audio/mpeg"
                      />
                    </audio>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="no-history">No history available.</p>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}

export default App;
