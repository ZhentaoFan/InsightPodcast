import { useState, useEffect, useRef } from "react";
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
  const sidebarRef = useRef(null);

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
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [jobId]);

  // 点击 history bar 之外隐藏 history bar
  useEffect(() => {
    function handleClickOutside(event) {
      // 获取顶部导航栏元素
      const navTop = document.querySelector(".top-nav");
      // 如果点击目标在 navTop 内，则不隐藏
      if (navTop && navTop.contains(event.target)) {
        return;
      }
      // 如果点击目标不在 sidebar 内，则隐藏 sidebar
      if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        setViewHistory(false);
      }
    }

    if (viewHistory) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [viewHistory]);


  // 处理点击生成水波纹效果
  const createRipple = (event) => {
    const container = event.currentTarget;
    const circle = document.createElement("span");
    const diameter = 20;//Math.max(container.clientWidth, container.clientHeight);
    const radius = diameter / 2;
    
    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${event.clientX - container.getBoundingClientRect().left - radius}px`;
    circle.style.top = `${event.clientY - container.getBoundingClientRect().top - radius}px`;
    circle.classList.add("ripple");

    // 清除之前的水波纹（如果存在）
    const ripple = container.getElementsByClassName("ripple")[0];
    if (ripple) {
      ripple.remove();
    }

    container.appendChild(circle);

    // 动画结束后移除元素（600ms 与 CSS 动画时长保持一致）
    setTimeout(() => {
      circle.remove();
    }, 600);
  };

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
  // 刷新history数据
  const handleRefreshHistory = async () => {
    try {
      const response = await fetchHistory();
      setHistory(response.data);
    } catch (error) {
      console.error("Failed to refresh history:", error);
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
    <div className="background-container" onClick={createRipple}>
      <div className="app-container">
        {/* Top Navigation */}
        <nav className="top-nav">
          <div className="nav-logo">🎧 Panel Discussion</div>
          <div className="nav-item" onClick={handleViewHistory}>
            {viewHistory ? "HISTORY" : "HISTORY"}
          </div>
        </nav>

        {/* Main Content (Does not move) */}
        <main className="main-content">
          <div className="content-wrapper">
            <h1 className="app-title">Paper to Panel Podcast</h1>
            <p className="app-subtitle">
              Convert your papers into analysis audio.
            </p>

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

                  {/* 进度条显示 (如果任务尚未完成) */}
                  {jobStatus !== "completed" && (
                    <div className="progress-bar-container">
                      <div
                        className="progress-bar-fill"
                        style={{ width: `${progress || 0}%` }}
                      ></div>
                    </div>
                  )}
                </div>

                {/* 在此处新增一个“返回”按钮 */}
                <button
                  onClick={() => {
                    // 将状态改为 "idle"，就能重新显示文件上传界面
                    setUploadStatus("idle");
                    setJobId(null);
                    setJobStatus(null);
                    setAudioUrl(null);
                    setProgress(null);
                  }}
                  className="back-button"
                >
                  Back to Upload
                </button>
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
          <aside className="sidebar open" ref={sidebarRef}>
            <div className="sidebar-content"
                onClick={createRipple} // 添加点击事件监听器
            >
              {/* <h2 className="sidebar-title">Audio History</h2>
              <button onClick={handleRefreshHistory} className="refresh-button">
                Refresh
              </button> */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <h2 className="sidebar-title">History</h2>
                <button onClick={handleRefreshHistory} className="refresh-button">
                  {/* 使用 inline SVG 图标 */}
                  <svg
                    className="refresh-icon"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M23 4v6h-6"></path>
                    <path
                      d="M20.49 9c-.74-5-5.07-9-10.49-9a11
                          11 0 0 0 0 22 11 11 0 0 0 9.43-5.5"
                    />
                  </svg>
                  {/* <span style={{ marginLeft: "6px" }}></span> */}
                </button>
              </div>
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
    </div>
  );
}

export default App;
