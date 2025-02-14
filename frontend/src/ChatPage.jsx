import React, { useState, useRef, useEffect } from "react";
import TextareaAutosize from "react-textarea-autosize"; // 自动调整高度的 textarea
import { FaPaperPlane } from "react-icons/fa"; // 发送图标
import "./styles/ChatPage.css";

function ChatPage({ onBack }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);

  // 自动滚动到底部
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    setMessages((prev) => [...prev, { sender: "user", text: inputValue }]);
    setInputValue("");
    // 模拟机器人回复
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "这是模拟的回复内容。" },
      ]);
    }, 1000);
  };

  // 支持按回车发送（shift+Enter 换行）
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

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
          {/* {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.sender}`}>
              {msg.text}
            </div>
          ))} */}
          {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.sender}`}>
              {msg.text.split("\n").map((line, i) => (
                <React.Fragment key={i}>
                  {line}
                  <br />
                </React.Fragment>
              ))}
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>
      </main>
      <div className="chat-send-box">
        <TextareaAutosize
          className="chat-input"
          placeholder="请输入消息..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          maxRows={6}  // 限制最大行数，防止无限增长
        />
        <button className="chat-send-button" onClick={handleSend}>
          <FaPaperPlane />
        </button>
      </div>
    </div>
  );
}

export default ChatPage;
