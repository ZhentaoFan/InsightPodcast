import React, { useState, useEffect, useRef } from "react";
import { FaMicrophone } from "react-icons/fa";
import "./styles/ChatModal.css";

// 工具函数：base64 转 ArrayBuffer
function base64ToArrayBuffer(base64) {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}
/**
 * 将原始 PCM16 数据封装为 WAV 文件的 Blob
 * @param {Uint8Array} pcmData - 16位单声道PCM数据
 * @param {number} sampleRate - 采样率，默认为16000
 * @param {number} numChannels - 通道数，默认1（单声道）
 * @returns {Blob} - 封装好的 WAV 文件 Blob
 */
function createWavBlobFromPCM16(pcmData, sampleRate = 16000*2, numChannels = 1) {
    const byteRate = sampleRate * numChannels * 2;     // 16bit = 2 bytes
    const blockAlign = numChannels * 2;
    const wavHeader = new ArrayBuffer(44);
    const view = new DataView(wavHeader);
  
    /* RIFF chunk descriptor */
    writeString(view, 0, "RIFF");               // ChunkID
    view.setUint32(4, 36 + pcmData.length, true); // ChunkSize = 36 + SubChunk2Size
    writeString(view, 8, "WAVE");              // Format
  
    /* fmt sub-chunk */
    writeString(view, 12, "fmt ");             // Subchunk1ID
    view.setUint32(16, 16, true);             // Subchunk1Size = 16 for PCM
    view.setUint16(20, 1, true);              // AudioFormat = 1 for PCM
    view.setUint16(22, numChannels, true);    // NumChannels
    view.setUint32(24, sampleRate, true);     // SampleRate
    view.setUint32(28, byteRate, true);       // ByteRate = SampleRate * NumChannels * BitsPerSample/8
    view.setUint16(32, blockAlign, true);     // BlockAlign = NumChannels * BitsPerSample/8
    view.setUint16(34, 16, true);             // BitsPerSample = 16
  
    /* data sub-chunk */
    writeString(view, 36, "data");            // Subchunk2ID
    view.setUint32(40, pcmData.length, true); // Subchunk2Size = NumSamples * NumChannels * BitsPerSample/8
  
    // 将 header 和 pcmData 合并成一个 Uint8Array
    const wavBuffer = new Uint8Array(44 + pcmData.length);
    wavBuffer.set(new Uint8Array(wavHeader), 0);
    wavBuffer.set(pcmData, 44);
  
    return new Blob([wavBuffer], { type: "audio/wav" });
  }
  
  // 工具函数：写入字符串到 DataView
  function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
  

const ChatModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [inputValue, setInputValue] = useState(""); // 新增文本输入状态
  const [recording, setRecording] = useState(false);

  const ws = useRef(null);
  const mediaRecorderRef = useRef(null);

  const audioChunksRef = useRef([]); // 用于累积 delta 数据
  const messagesEndRef = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options = { mimeType: "audio/webm; codecs=opus" };
      mediaRecorderRef.current = new MediaRecorder(stream, options);
      
      // 每隔一段时间触发 ondataavailable
      mediaRecorderRef.current.ondataavailable = async (e) => {
        if (e.data.size > 0 && ws.current && ws.current.readyState === WebSocket.OPEN) {
          // 将音频 Blob 转 ArrayBuffer
          const arrayBuffer = await e.data.arrayBuffer();
          // 转成 Base64
          const base64Data = bufferToBase64(arrayBuffer);

          // 发送给后端
          const message = {
            type: "audioChunk",  // 自定义
            data: base64Data,
          };
          ws.current.send(JSON.stringify(message));
        }
      };

      // 开始录制，每 300ms 触发一次 ondataavailable
      mediaRecorderRef.current.start(300);
      setRecording(true);
    } catch (err) {
      console.error("Failed to start recording:", err);
    }
  };
    // 停止录音
  const stopRecording = () => {
        if (mediaRecorderRef.current) {
          mediaRecorderRef.current.stop();
          setRecording(false);
    
          // 告诉后端，录音结束，可以 commit
          if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            const message = {
              type: "audioCommit",
            };
            ws.current.send(JSON.stringify(message));
          }
        }
  };
    // 工具函数：ArrayBuffer -> Base64
    const bufferToBase64 = (buffer) => {
        let binary = "";
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
      };

  useEffect(() => {
    if (isOpen) {
      // 封装 WebSocket 连接逻辑
      const connectWebSocket = () => {
        ws.current = new WebSocket("ws://localhost:8080/ws");
        ws.current.binaryType = "arraybuffer"; // 设置接收二进制数据为 ArrayBuffer

        ws.current.onopen = () => {
          console.log("WebSocket voice connection established");
        };

        ws.current.onmessage = (event) => {
          // 如果收到的是文本数据
          if (typeof event.data === "string") {
            try {
              const data = JSON.parse(event.data);
              if (data.type === "response.audio.delta" && data.delta) {
                const arrayBuffer = base64ToArrayBuffer(data.delta);
                audioChunksRef.current.push(new Uint8Array(arrayBuffer));
              } else if (data.type === "response.audio.done") {
                const totalLength = audioChunksRef.current.reduce(
                    (sum, chunk) => sum + chunk.length,
                    0
                  );
                  const mergedPCM = new Uint8Array(totalLength);
                  let offset = 0;
                  audioChunksRef.current.forEach((chunk) => {
                    mergedPCM.set(chunk, offset);
                    offset += chunk.length;
                  });
                  
                  // 将PCM数据封装为WAV
                  const wavBlob = createWavBlobFromPCM16(mergedPCM, 24000, 1);
                  const url = URL.createObjectURL(wavBlob);
                  const audio = new Audio(url);
                  audio.play();
                audioChunksRef.current = [];

                
              } else {
                console.log("Received message:", data);
              }
            } catch (error) {
              console.error("Error parsing message:", error);
            }
          } else if (event.data instanceof ArrayBuffer) {
            // 备用处理逻辑：收到的是二进制数据
            const blob = new Blob([event.data], { type: "audio/mp3" });
            const url = URL.createObjectURL(blob);
            setAudioUrl(url);
            const audio = new Audio(url);
            audio.play();
          }
        };

        ws.current.onerror = (error) => {
          console.error("WebSocket voice error:", error);
        };

        ws.current.onclose = (event) => {
          console.log("WebSocket voice connection closed:", event);
          // 如果模态框依然打开，则尝试重连
          if (isOpen) {
            setTimeout(() => {
              console.log("Attempting to reconnect WebSocket...");
              connectWebSocket();
            }, 3000);
          }
        };
      };

      connectWebSocket();

      return () => {
        if (ws.current) {
          ws.current.close();
        }
      };
    }
  }, [isOpen]);

  // 文本消息发送函数
  const handleTextSend = () => {
    if (!inputValue.trim()) return;
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      // 构造一个文本消息，这里定义 type 为 "text"，你可根据后端需求调整
      const message = { type: "text", text: inputValue };
      ws.current.send(JSON.stringify(message));
      setInputValue("");
    }
  };

  return (
    <>
      {/* 右下角的实时对话按钮 */}
      <button className="chat-float-button" onClick={() => setIsOpen(true)}>
        <FaMicrophone size={24} />
      </button>

      {/* 全屏遮罩层与居中对话框 */}
      {isOpen && (
        <div className="chat-modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="chat-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="chat-header">
              <button className="chat-back-button" onClick={() => setIsOpen(false)}>
                ← 返回
              </button>
              <h2 className="chat-title">实时语音对话</h2>
            </div>
            <div className="chat-content">
              <div ref={messagesEndRef} />
            </div>
            {/* 新增文本输入区域 */}
            <div className="chat-input-container">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="请输入文本消息"
              />
              <button onClick={handleTextSend}>发送</button>
              {recording ? (
                <button onClick={stopRecording}>停止录音</button>
              ) : (
                <button onClick={startRecording}>开始录音</button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatModal;
