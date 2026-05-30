import API_BASE_URL from '../apiConfig';
import React, { useState, useEffect } from "react";
import { FaCloudUploadAlt, FaTimes, FaArrowLeft, FaPaperPlane, FaPlus, FaChevronDown, FaChevronUp, FaHeadset } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from '../components/Footer';
import "./CustomerService.css";

const CustomerService = () => {
    const [chats, setChats] = useState([]);
    const [activeChat, setActiveChat] = useState(null);
    const [newMessage, setNewMessage] = useState("");
    const [image, setImage] = useState(null);
    const [preview, setPreview] = useState(null);
    const [activeFaq, setActiveFaq] = useState(null);
    const [view, setView] = useState("faq"); // "faq" or "chat"

    const [showNewChatForm, setShowNewChatForm] = useState(false);
    const [startMessage, setStartMessage] = useState("");

    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    const faqs = [
        { q: "What makes Highgrip socks non-skid?", a: "Our socks feature specially designed rubber grips on the sole that provide excellent traction on smooth surfaces, helping prevent slips and falls." },
        { q: "Who can wear Highgrip socks?", a: "Highgrip socks are designed for everyone! From toddlers taking their first steps to seniors looking for extra stability, our socks offer comfort and safety for all ages." },
        { q: "Are Highgrip socks machine washable?", a: "Yes, they are! We recommend washing them in cold water on a gentle cycle and air drying to maintain the integrity of the rubber grips." },
        { q: "Do you offer different sizes?", a: "Absolutely. We offer a wide range of sizes for babies, kids, and adults. Please check our size chart for the perfect fit." },
        { q: "What are the rubber grips made of?", a: "The grips are made from high-quality, non-toxic silicone that is durable and provides long-lasting traction." },
        { q: "Are your socks suitable for hospital or medical use?", a: "Yes, many customers use our socks in hospitals or for medical recovery because of their superior grip and comfort." },
        { q: "Do you have socks for babies or toddlers?", a: "Yes, we have a specific collection for little ones with extra-soft fabric and full-sole grip for safety." }
    ];

    useEffect(() => {
        if (user.email) fetchChats();
    }, []);

    const fetchChats = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/support/user/${user.email}`);
            const data = await res.json();
            setChats(data);
        } catch (err) {
            console.error("Failed to fetch chats");
        }
    };

    const handleStartChat = async (e) => {
        e.preventDefault();
        if (!user.email) {
            alert("Please login to start a chat");
            navigate("/auth");
            return;
        }
        const formData = new FormData();
        formData.append("userEmail", user.email);
        formData.append("userName", user.name);
        formData.append("message", startMessage);
        if (image) formData.append("image", image);

        try {
            await fetch(`${API_BASE_URL}/support`, { method: "POST", body: formData });
            setStartMessage("");
            setImage(null);
            setPreview(null);
            setShowNewChatForm(false);
            fetchChats();
        } catch (err) {
            alert("Failed to start chat");
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() && !image) return;

        const formData = new FormData();
        formData.append("sender", "user");
        formData.append("text", newMessage);
        if (image) formData.append("image", image);

        try {
            await fetch(`${API_BASE_URL}/support/${activeChat._id}/message`, {
                method: "PUT",
                body: formData
            });
            setNewMessage("");
            setImage(null);
            setPreview(null);

            const res = await fetch(`${API_BASE_URL}/support/user/${user.email}`);
            const data = await res.json();
            setChats(data);
            setActiveChat(data.find(c => c._id === activeChat._id));
        } catch (err) {
            alert("Failed to send message");
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImage(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const toggleFaq = (index) => {
        setActiveFaq(activeFaq === index ? null : index);
    };

    return (
        <div className="customer-service-container">
            <Header />

            <main className="cs-main container">
                <div className="view-toggles">
                    <button className={`toggle-btn ${view === "faq" ? "active" : ""}`} onClick={() => setView("faq")}>
                        Frequently Asked Questions
                    </button>
                    <button className={`toggle-btn ${view === "chat" ? "active" : ""}`} onClick={() => setView("chat")}>
                        <FaHeadset /> Chat with Support
                    </button>
                </div>

                {view === "faq" ? (
                    <section className="faq-section">
                        <div className="faq-header">
                            <h1>How can we help you?</h1>
                            <p>Browse through our most common questions or start a chat with our team.</p>
                        </div>
                        <div className="faq-list">
                            {faqs.map((faq, index) => (
                                <div key={index} className={`faq-item ${activeFaq === index ? "open" : ""}`}>
                                    <div className="faq-question" onClick={() => toggleFaq(index)}>
                                        <h3>{faq.q}</h3>
                                        {activeFaq === index ? <FaChevronUp /> : <FaChevronDown />}
                                    </div>
                                    <div className="faq-answer">
                                        <p>{faq.a}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : (
                    <section className="chat-interface">
                        <div className="chat-inner-container">
                            <div className={`cs-chat-sidebar ${activeChat ? 'mobile-hidden' : ''}`}>
                                <div className="sidebar-header">
                                    <h2>Support History</h2>
                                    <button className="new-chat-btn" onClick={() => setShowNewChatForm(true)}>
                                        <FaPlus /> New Chat
                                    </button>
                                </div>
                                <div className="cs-chat-list">
                                    {chats.length === 0 ? <p className="no-chats">No previous chats found.</p> :
                                        chats.map(chat => (
                                            <div key={chat._id} className={`cs-chat-item ${activeChat?._id === chat._id ? 'active' : ''}`} onClick={() => setActiveChat(chat)}>
                                                <div className="chat-avatar">🎧</div>
                                                <div className="chat-info">
                                                    <h4>{chat.subject}</h4>
                                                    <p>{new Date(chat.lastUpdated).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>

                            <div className={`cs-chat-window ${!activeChat && !showNewChatForm ? 'empty' : ''} ${!activeChat && showNewChatForm ? 'mobile-hidden' : ''}`}>
                                {!activeChat && !showNewChatForm && (
                                    <div className="no-chat-selected">
                                        <FaHeadset size={40} />
                                        <h3>Select a conversation or start a new one</h3>
                                        <p>Our team is ready to assist you with any questions.</p>
                                    </div>
                                )}

                                {showNewChatForm && (
                                    <div className="new-chat-form-container">
                                        <h3>Tell us what you need</h3>
                                        <form onSubmit={handleStartChat}>
                                            <textarea placeholder="Describe your issue or question here..." value={startMessage} onChange={e => setStartMessage(e.target.value)} required />
                                            <div className="form-actions">
                                                <label className="icon-btn">
                                                    <FaCloudUploadAlt />
                                                    <input type="file" hidden onChange={handleImageChange} />
                                                </label>
                                                <button type="submit" className="start-btn">Start Conversation</button>
                                            </div>
                                            {preview && <img src={preview} className="preview-thumb" alt="upload" />}
                                        </form>
                                        <button className="cancel-btn" onClick={() => setShowNewChatForm(false)}>Go Back</button>
                                    </div>
                                )}

                                {activeChat && (
                                    <>
                                        <div className="chat-header">
                                            <button className="mobile-back" onClick={() => setActiveChat(null)}><FaArrowLeft /></button>
                                            <h3>{activeChat.subject}</h3>
                                        </div>
                                        <div className="messages-area">
                                            {activeChat.messages.map((msg, idx) => (
                                                <div key={idx} className={`message-bubble ${msg.sender}`}>
                                                    <div className="message-content">
                                                        {msg.text}
                                                        {msg.image && <img src={`${API_BASE_URL}${msg.image}`} alt="attachment" />}
                                                    </div>
                                                    <span className="message-time">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <form className="chat-input-area" onSubmit={handleSendMessage}>
                                            <label className="attach-btn">
                                                <FaCloudUploadAlt />
                                                <input type="file" hidden onChange={handleImageChange} />
                                            </label>
                                            <input type="text" placeholder="Type your message..." value={newMessage} onChange={e => setNewMessage(e.target.value)} />
                                            <button type="submit" className="send-btn"><FaPaperPlane /></button>
                                        </form>
                                        {preview && (
                                            <div className="input-preview">
                                                <img src={preview} alt="preview" />
                                                <FaTimes onClick={() => { setImage(null); setPreview(null) }} />
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </section>
                )}
            </main>

            <Footer />
        </div>
    );
};

export default CustomerService;


