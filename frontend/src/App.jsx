import { useState } from 'react';
import FileUpload from './components/FileUpload';
import { uploadPaper } from './utils/api';
import './App.css';

function App() {
  const [jobId, setJobId] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('idle');

  const handleUpload = async (file) => {
    try {
      setUploadStatus('uploading');
      const response = await uploadPaper(file);
      setJobId(response.data.jobId);
      setUploadStatus('success');
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadStatus('error');
    }
  };

  return (
    <div className="app-container">
      <h1>Paper to Podcast Generator</h1>
      
      {uploadStatus === 'idle' && (
        <div className="upload-section">
          <FileUpload onUpload={handleUpload} />
        </div>
      )}

      {uploadStatus === 'uploading' && (
        <div className="status-message">
          <p>⏳ Uploading your paper...</p>
        </div>
      )}

      {uploadStatus === 'success' && (
        <div className="status-message success">
          <p>✅ Upload successful!</p>
          <div className="job-info">
            <p>Job ID: {jobId}</p>
            <a href={`/status/${jobId}`} className="status-link">
              Track Processing Status
            </a>
          </div>
        </div>
      )}

      {uploadStatus === 'error' && (
        <div className="status-message error">
          <p>❌ Upload failed. Please try again.</p>
          <button 
            onClick={() => setUploadStatus('idle')}
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