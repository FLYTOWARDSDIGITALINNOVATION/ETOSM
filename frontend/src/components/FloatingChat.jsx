import API_BASE_URL from '../apiConfig';
import React, { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { FaCommentDots, FaTimes, FaPaperPlane } from "react-icons/fa";
import "./FloatingChat.css";

const FloatingChat = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  if (location.pathname.startsWith("/admin")) {
    return null;
  }
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const user = JSON.parse(localStorage.getItem("user"));
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && user) {
      // Load previous messages for this user
      fetch(`${API_BASE_URL}/support/history/${encodeURIComponent(user.email)}`)
        .then(res => res.json())
        .then(data => {
          console.log("Messages loaded:", data);
          if (Array.isArray(data)) {
            const formattedMessages = data.map((msg, idx) => ({
              id: msg._id || idx,
              text: msg.text, // Mapped from Chat schema 'text'
              sender: msg.sender,
              timestamp: new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }));
            setMessages(formattedMessages);
            // Scroll to bottom after loading
            setTimeout(() => scrollToBottom(), 100);
          }
        })
        .catch(err => console.error("Failed to load messages:", err));
    }
  }, [isOpen, user]);

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!user) {
      alert("Please login to send a message");
      return;
    }

    if (!inputValue.trim()) {
      return;
    }

    const messageText = inputValue;
    setInputValue("");
    setIsLoading(true);

    // Add user message immediately
    const userMessage = {
      id: Date.now(),
      text: messageText,
      sender: "user",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const res = await fetch(`${API_BASE_URL}/support`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName: user.name,
          userEmail: user.email,
          message: messageText,
        }),
      });

      if (!res.ok) {
        alert("Failed to send message");
      }
    } catch (err) {
      console.error("Error sending message:", err);
      alert("Error sending message");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fc-floating-chat-container">
      {/* Chat Button */}
      <button
        className="fc-chat-toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
        title="Open chat"
      >
        {isOpen ? <FaTimes size={24} /> : <FaCommentDots size={24} />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fc-chat-window">
          {/* Header */}
          <div className="fc-chat-header">
            <div>
              <h3>Chat with Support</h3>
              <p>We'll help you ASAP</p>
            </div>
            <button onClick={() => setIsOpen(false)} title="Close Chat">
              <FaTimes size={20} />
            </button>
          </div>

          {/* Messages */}
          <div className="fc-chat-messages">
            {messages.length === 0 ? (
              <div className="fc-chat-empty">
                <FaCommentDots size={40} />
                <p>Start a conversation with our support team</p>
              </div>
            ) : (
              <>
                {messages.map((msg, idx) => (
                  <div key={msg.id || idx} className={`fc-chat-message ${msg.sender}`}>
                    <div className="fc-message-content">
                      <p>{msg.text}</p>
                      <span className="fc-message-time">{msg.timestamp}</span>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSendMessage} className="fc-chat-form">
            <input
              type="text"
              placeholder={user ? "Type your message..." : "Please login to chat"}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={!user || isLoading}
            />
            <button type="submit" disabled={!user || isLoading || !inputValue.trim()}>
              <FaPaperPlane size={18} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default FloatingChat;



