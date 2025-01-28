# InsightPodcast - Automated Paper to Podcast Generator

A system that converts academic papers into podcast-style audio files using text-to-speech technology.

---

## 🛠️ Setup & Run Guide

### **Prerequisites**
- Node.js v18+
- npm v9+
- FFmpeg (for audio processing)
- Redis (for task queue, optional)

---

## **Backend Setup (Express.js)**

### 1. Clone Repository
```bash
git clone https://github.com/your-username/InsightPodcast.git
cd InsightPodcast/backend
```

### 2. Install Dependencies
```
npm install
```

### 3. Ask Zhentao For .env & apikey

### 4. Create Storage Directories

```
mkdir -p storage/uploads storage/audio
```

### 5. Start Server

```
npm run dev
```

Server runs at http://localhost:3000













```markdown
# InsightPodcast - Automated Paper to Podcast Generator

A system that converts academic papers into podcast-style audio files using text-to-speech technology.

---

## 🛠️ Setup & Run Guide

### **Prerequisites**
- Node.js v18+
- npm v9+
- FFmpeg (for audio processing)
- Redis (for task queue, optional)

---

## **Backend Setup (Express.js)**

### 1. Clone Repository
```bash
git clone https://github.com/your-username/InsightPodcast.git
cd InsightPodcast/backend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create `.env` file:
```bash
cp .env.example .env
```
Edit `.env` with your values:
```env
PORT=3000
UPLOAD_DIR=./storage/uploads
ELEVENLABS_API_KEY=your_api_key
REDIS_URL=redis://localhost:6379
```

### 4. Create Storage Directories
```bash
mkdir -p storage/uploads storage/audio
```

### 5. Start Server
```bash
npm run dev
```
Server runs at `http://localhost:3000`

---

## **Frontend Setup (React + Vite)**

### 1. Navigate to Frontend
```bash
cd ../frontend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure API Endpoint
Edit `vite.config.js`:
```javascript
server: {
  proxy: {
    '/api': 'http://localhost:3000' // Match backend port
  }
}
```

### 4. Start Development Server
```bash
npm run dev
```
Access at `http://localhost:5173`

---

## 🚀 Full System Run
1. **Start Services in Order**:
   ```bash
   # Terminal 1 - Backend
   cd backend && npm run dev
   
   # Terminal 2 - Frontend 
   cd frontend && npm run dev
   ```

2. **Test Workflow**:
   - Open browser to `http://localhost:5173`
   - Upload PDF file
   - Wait for processing
   - Play generated audio
