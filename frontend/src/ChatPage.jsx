// import React, { useState, useRef, useEffect } from "react";
// import TextareaAutosize from "react-textarea-autosize"; // 自动调整高度的 textarea
// import { FaPaperPlane } from "react-icons/fa"; // 发送图标
// import "./styles/ChatPage.css";

// function ChatPage({ onBack }) {
//   const [messages, setMessages] = useState([]);
//   const [inputValue, setInputValue] = useState("");
//   const messagesEndRef = useRef(null);

//   // 自动滚动到底部
//   useEffect(() => {
//     if (messagesEndRef.current) {
//       messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
//     }
//   }, [messages]);

//   const handleSend = () => {
//     if (!inputValue.trim()) return;
//     setMessages((prev) => [...prev, { role: "user", text: inputValue }]);
//     setInputValue("");
//     // 模拟机器人回复
//     setTimeout(() => {
//       setMessages((prev) => [
//         ...prev,
//         { role: "bot", text: "这是模拟的回复内容。这是模拟的回复内容。这是模拟的回复内容。这是模拟的回复内容。这是模拟的回复内容。这是模拟的回复内容。这是模拟的回复内容。这是模拟的回复内容。这是模拟的回复内容。这是模拟的回复内容。" },
//       ]);
//     }, 1000);
//   };

//   // 支持按回车发送（shift+Enter 换行）
//   const handleKeyPress = (e) => {
//     if (e.key === "Enter" && !e.shiftKey) {
//       e.preventDefault();
//       handleSend();
//     }
//   };

//   return (
//     <div className="chat-page">
//       <header className="chat-header">
//         <button className="chat-back-button" onClick={onBack}>
//           ← 返回 Panel Discussion
//         </button>
//         <h2 className="chat-title">Chat Mode</h2>
//       </header>
//       <main className="chat-content">
//         <div className="messages">
//           {/* {messages.map((msg, index) => (
//             <div key={index} className={`message ${msg.role}`}>
//               {msg.text}
//             </div>
//           ))} */}
//           {messages.map((msg, index) => (
//             <div key={index} className={`message ${msg.role}`}>
//               {msg.text.split("\n").map((line, i) => (
//                 <React.Fragment key={i}>
//                   {line}
//                   <br />
//                 </React.Fragment>
//               ))}
//             </div>
//           ))}

//           <div ref={messagesEndRef} />
//         </div>
//       </main>
//       <div className="chat-send-box">
//         <TextareaAutosize
//           className="chat-input"
//           placeholder="请输入消息..."
//           value={inputValue}
//           onChange={(e) => setInputValue(e.target.value)}
//           onKeyPress={handleKeyPress}
//           maxRows={6}  // 限制最大行数，防止无限增长
//         />
//         <button className="chat-send-button" onClick={handleSend}>
//           <FaPaperPlane />
//         </button>
//       </div>
//     </div>
//   );
// }

// export default ChatPage;


import React, { useState, useRef, useEffect } from "react";
import TextareaAutosize from "react-textarea-autosize"; // 自动调整高度的 textarea
import { FaPaperPlane } from "react-icons/fa"; // 发送图标
import axios from "axios";  // 引入 axios
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

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    // 先添加用户消息到对话列表中
    // const userMessage = { role: "user", content: inputValue };
    // setMessages((prev) => [...prev, userMessage]);

    const userMessage = { role: "user", content: inputValue };
    const updatedMessages = [...messages, userMessage];
  
    // 立即更新消息状态，同时使用 updatedMessages 调用 API
    setMessages(updatedMessages);
    setInputValue("");
    // 调用后端 API 处理消息
    try {
      const response = await axios.post("http://localhost:3000/api/chat", { messages: updatedMessages });
      // 假设后端返回的数据格式为 { reply: "后端回复的内容" }
      const botReply = response.data.reply || "后端没有返回回复内容";
      setMessages((prev) => [...prev, { role: "assistant", content: botReply }]);
    } catch (error) {
      console.error("Error sending chat to backend:", error);
      setMessages((prev) => [...prev, { role: "assistant", content: "后端错误，请稍后重试。" }]);
    }

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
          {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.role}`}>
              {msg.content.split("\n").map((line, i) => (
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
          placeholder="请输入消息"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          minRows={3}
          maxRows={8}  // 限制最大行数，防止无限增长
        />
        <button className="chat-send-button" onClick={handleSend}>
          <FaPaperPlane />
        </button>
      </div>
    </div>
  );
}

export default ChatPage;
