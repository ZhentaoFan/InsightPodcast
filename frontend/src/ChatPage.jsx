import React, { useState, useRef, useEffect } from "react";
import TextareaAutosize from "react-textarea-autosize"; // 自动调整高度的 textarea
import { FaPaperPlane } from "react-icons/fa"; // 发送图标
import axios from "axios";  // 引入 axios
import "./styles/ChatPage.css";
import ReactMarkdown from "react-markdown";

function ChatPage({ onBack }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);
  const [waitingForResponse, setWaitingForResponse] = useState(false);

  // 自动滚动到底部
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);


  const handleSend = async () => {
    if (!inputValue.trim()) return;
  
    const userMessage = { role: "user", content: inputValue };
    // 添加一个 loading 消息，用于显示“模型正在搜索思考”
    const loadingMessage = { role: "assistant", content: "模型正在搜索思考", isLoading: true };
    const updatedMessages = [...messages, userMessage, loadingMessage];
    
    // 立即更新消息状态并清空输入框
    setMessages(updatedMessages);
    setInputValue("");
    setWaitingForResponse(true); // 进入等待状态

    try {
      const response = await axios.post("http://34.136.107.51:3000/api/chat", { messages: updatedMessages.filter(msg => !msg.isLoading) });
      const botReply = response.data.reply || "后端没有返回回复内容";
      // 移除 loading 消息，并添加真实的回复
      setMessages(prev => {
        const newMessages = prev.filter(msg => !msg.isLoading);
        return [...newMessages, { role: "assistant", content: botReply }];
      });
    } catch (error) {
      console.error("Error sending chat to backend:", error);
      setMessages(prev => {
        const newMessages = prev.filter(msg => !msg.isLoading);
        return [...newMessages, { role: "assistant", content: "后端错误，请稍后重试。" }];
      });
    } finally {
      setWaitingForResponse(false); // 无论成功还是失败，都结束等待
    }
  };
  

  // 支持按回车发送（shift+Enter 换行）
  const handleKeyPress = (e) => {
    // 如果处于等待状态，则不执行发送
    if (waitingForResponse) return;

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };


  function renderMessageContent(text) {
    const regex = /<Link>(.*?)<\/Link>/g;
    let lastIndex = 0;
    const result = [];
    let count = 0;
    let match;
    while ((match = regex.exec(text)) !== null) {
      count++;
      // 添加匹配前的普通文本
      if (match.index > lastIndex) {
        result.push(text.substring(lastIndex, match.index));
      }
      // 添加美化后的可点击链接
      result.push(
        <a
          key={match.index}
          href={match[1]}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "#007BFF",
            textDecoration: "none",
            borderBottom: "1px solid #007BFF",
            transition: "color 0.3s, border-bottom 0.3s",
          }}
          onMouseEnter={(e) => {
            e.target.style.color = "#0056b3";
            e.target.style.borderBottom = "1px solid #0056b3";
          }}
          onMouseLeave={(e) => {
            e.target.style.color = "#007BFF";
            e.target.style.borderBottom = "1px solid #007BFF";
          }}
        >
          {`[${count}]`}
        </a>
      );
      lastIndex = regex.lastIndex;
    }
    // 添加剩余的文本
    if (lastIndex < text.length) {
      result.push(text.substring(lastIndex));
    }
    return result;
  }
  
  

  return (
    <div className="chat-page">
      <header className="chat-header">
        <button className="chat-back-button" onClick={onBack}>
          ← 返回 Panel Discussion
        </button>
        <h2 className="chat-title">Chat Mode</h2>
      </header>
      <main className="chat-content">
        <div className="messages">
          {messages.map((msg, index) => (
              <div
              key={index}
              className={`message ${msg.role} ${msg.isLoading ? "loading" : ""}`}
            >
                {renderMessageContent(msg.content).map((item, i) => (
                  <React.Fragment key={i}>
                    {item}
                  </React.Fragment>
                ))}
                <br />
              </div>
            ))}

          <div ref={messagesEndRef} />
        </div>
      </main>
      <div className="chat-send-box">
        <TextareaAutosize
          className="chat-input"
          placeholder="请输入消息"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          minRows={3}
          maxRows={8}  // 限制最大行数，防止无限增长
        />
        <button className="chat-send-button" onClick={handleSend} disabled={waitingForResponse}>
          <FaPaperPlane />
        </button>
      </div>
    </div>
  );
}

export default ChatPage;
