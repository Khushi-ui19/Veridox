import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';
import { Container, Navbar, Button, Card, Form, Badge, Spinner, Dropdown } from 'react-bootstrap';
import {
    FaArrowLeft,
    FaRobot,
    FaUser,
    FaArrowUp,
    FaClock,
    FaComments,
    FaFileContract,
    FaTrashAlt,
    FaShieldAlt,
    FaUserCircle,
    FaCog,
    FaSignOutAlt,
    FaPaperPlane
} from 'react-icons/fa';
import { cacheUser, clearCachedUser, getCachedUser } from '../utils/authUserCache';
import { toast } from 'react-toastify';

const Chat = () => {
    const { contractId } = useParams();
    const isGeneral = contractId === 'general';
    const getWelcomeMessage = () => ({
        sender: 'ai',
        text: isGeneral
            ? 'Hello! I am your General Legal Assistant. Ask me anything about legal concepts.'
            : 'Hello! I have analyzed this contract. Ask me anything about it.'
    });

    const [messages, setMessages] = useState([getWelcomeMessage()]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState(() => getCachedUser() || { username: '', email: '', role: 'USER' });

    const displayUsername = user.username || 'Loading...';

    // Conversation Memory Logic
    const currentUsername = user.username || 'anonymous';
    const storageKey = `chat_session_${currentUsername}_${contractId}`;
    const [conversationId, setConversationId] = useState('');

    const messagesContainerRef = useRef(null);
    const inputRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchUserProfile();
        setConversationId(localStorage.getItem(storageKey) || '');
    }, [storageKey]);

    // Auto-scroll only the chat list
    useEffect(() => {
        const container = messagesContainerRef.current;
        if (!container) return;
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }, [messages]);

    // Keep cursor in chat input
    useEffect(() => {
        if (!loading) {
            inputRef.current?.focus();
        }
    }, [loading]);

    const fetchUserProfile = async () => {
        try {
            const response = await api.get('/auth/profile');
            setUser(response.data);
            cacheUser(response.data);
        } catch {
            console.log("Could not fetch navbar profile info");
        }
    };

    const handleLogout = async () => {
        try {
            await api.post('/auth/logout');
        } catch (errorMessage) {
            console.warn("Logout API failed:", errorMessage);
        }
        localStorage.removeItem('lastActive');
        clearCachedUser();
        navigate('/');
        toast.success("Logout Successful!")
    };

    const persistConversationId = (nextConversationId) => {
        if (nextConversationId && nextConversationId !== conversationId) {
            setConversationId(nextConversationId);
            localStorage.setItem(storageKey, nextConversationId);
        }
    };

    const handleClearChat = () => {
        setMessages([getWelcomeMessage()]);
        setInput('');
        setLoading(false);
        setConversationId('');
        localStorage.removeItem(storageKey);
        requestAnimationFrame(() => inputRef.current?.focus());
    };

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const newMessages = [...messages, { sender: 'user', text: input }];
        setMessages(newMessages);
        setInput('');
        setLoading(true);

        try {
            const response = await api.post('/contracts/chat', {
                question: input,
                contractId: isGeneral ? null : contractId,
                conversationId: conversationId
            });

            persistConversationId(response.data.conversationId);
            setMessages([...newMessages, { sender: 'ai', text: response.data.response }]);
        } catch {
            setMessages([...newMessages, { sender: 'ai', text: "Error: Could not connect to the AI." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="d-flex flex-column app-theme-page" style={{ minHeight: '100dvh', overflow: 'hidden' }}>

            {/* Background Blobs */}
            <div className="background-blob modern-blob blob-indigo blob-lg blob-top-left"></div>
            <div className="background-blob modern-blob blob-rose blob-md blob-bottom-right"></div>

            <Container className="app-page-content d-flex flex-column py-2 py-md-4 h-100" style={{ maxWidth: '1200px' }}>

                {/* --- 1. FLOATING NAVBAR --- */}
                <Navbar className="px-3 px-md-4 py-2 mb-3 mb-md-4 nav-glass rounded-pill animate-3d-appear stagger-1" style={{ position: 'relative', zIndex: 10 }}>
                    <Container fluid className="d-flex justify-content-between align-items-center p-0">
                        <div
                            className="d-flex align-items-center gap-2"
                            onClick={() => navigate('/dashboard')}
                            style={{ cursor: 'pointer' }}
                        >
                             <div className="glass-3d p-2 rounded-circle d-flex align-items-center justify-content-center text-primary">
                                {isGeneral ? <FaComments size={20} /> : <FaFileContract size={20} />}
                             </div>
                             <h4 className="fw-bold text-dark mb-0 d-none d-sm-block">
                                {isGeneral ? "General Counsel" : "Contract Counsel"}
                             </h4>
                        </div>

                        <div className="d-flex align-items-center gap-2">
                            <Button variant="white" className="glass-3d d-none d-md-flex align-items-center rounded-pill px-3 py-2 fw-bold text-muted border-0 me-2" onClick={() => navigate('/dashboard')}>
                                <FaArrowLeft className="me-2" /> Dashboard
                            </Button>

                            <Dropdown align="end">
                                <Dropdown.Toggle variant="white" className="glass-3d d-flex align-items-center rounded-pill px-3 py-2 text-dark border-0">
                                    <FaUserCircle size={20} className="me-2 text-primary pulse" />
                                    <span className="d-none d-sm-inline fw-bold small">{displayUsername}</span>
                                </Dropdown.Toggle>
                                <Dropdown.Menu className="glass-3d border-0 p-0 mt-3 rounded-4 overflow-hidden" style={{ minWidth: '220px' }}>
                                    <div className="px-4 py-3 border-bottom border-secondary border-opacity-10">
                                        <div className="fw-bold text-dark">{displayUsername}</div>
                                        <div className="small text-muted text-truncate">{user.email}</div>
                                    </div>
                                    <div className="p-2">
                                        <Dropdown.Item onClick={() => navigate('/settings')} className="rounded-3 py-2">
                                            <FaCog className="me-2 text-muted" /> Settings
                                        </Dropdown.Item>
                                        <Dropdown.Divider className="opacity-10" />
                                        <Dropdown.Item onClick={handleLogout} className="rounded-3 py-2 text-danger fw-bold">
                                            <FaSignOutAlt className="me-2" /> Logout
                                        </Dropdown.Item>
                                    </div>
                                </Dropdown.Menu>
                            </Dropdown>
                        </div>
                    </Container>
                </Navbar>

                {/* --- 2. CHAT AREA --- */}
                <Card className="border-0 shadow-sm glass-3d flex-grow-1 overflow-hidden d-flex flex-column animate-3d-appear stagger-2"
                      style={{
                          borderRadius: '24px',
                          minHeight: 0,
                          marginBottom: '10px'
                      }}>
                    <Card.Header className="bg-transparent border-bottom border-secondary border-opacity-10 py-2 py-md-3 px-3 px-md-4 d-flex justify-content-between align-items-center">
                        <div className="d-flex align-items-center gap-2 gap-md-3">
                            <div className="glass-3d-inset p-2 rounded-3 text-primary">
                                <FaRobot />
                            </div>
                            <div>
                                <h6 className="fw-bold mb-0 text-dark">AI Legal Brain</h6>
                                <div className="d-flex align-items-center gap-2">
                                    <span className="badge-pulse"></span>
                                    <span className="smallest text-muted fw-bold uppercase ls-1">System Online</span>
                                </div>
                            </div>
                        </div>
                        <Button
                            variant="white"
                            onClick={handleClearChat}
                            disabled={loading}
                            className="glass-3d border-0 rounded-circle text-danger p-2 d-flex align-items-center justify-content-center"
                            style={{ width: '38px', height: '38px' }}
                            title="Purge History"
                        >
                            <FaTrashAlt size={16} />
                        </Button>
                    </Card.Header>

                    <Card.Body className="p-0 d-flex flex-column h-100 chat-scroll-body" style={{ minHeight: 0 }}>
                        <div ref={messagesContainerRef} className="flex-grow-1 overflow-auto p-2 p-md-4 chat-messages-scroll" style={{ scrollBehavior: 'smooth' }}>
                            {messages.map((msg, index) => {
                                const isUser = msg.sender === 'user';
                                return (
                                    <div key={index} className={`d-flex mb-3 mb-md-4 animate-3d-appear ${isUser ? 'justify-content-end' : 'justify-content-start'}`}>
                                        {!isUser && (
                                            <div className="me-2 me-md-3 mt-1">
                                                <div className="glass-3d p-2 rounded-circle text-primary d-flex align-items-center justify-content-center" style={{ width: 36, height: 36 }}>
                                                    <FaRobot size={18} />
                                                </div>
                                            </div>
                                        )}

                                        <div
                                            className={`p-3 px-3 px-md-4 shadow-sm chat-bubble-hover ${isUser ? 'text-white' : 'text-dark'}`}
                                             style={{
                                                 maxWidth: '85%',
                                                 borderRadius: isUser ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                                                 background: isUser ? 'var(--gradient-accent)' : 'var(--glass-surface)',
                                                 border: isUser ? 'none' : '1px solid var(--glass-border)',
                                                 boxShadow: isUser ? '0 10px 20px rgba(99, 102, 241, 0.15)' : 'var(--neumorphic-3d-shadow)',
                                                 transition: 'all 0.3s ease'
                                             }}
                                         >
                                            <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.98rem', lineHeight: '1.6', fontWeight: isUser ? 500 : 400 }}>
                                                {msg.text}
                                            </div>
                                            <div className={`smallest mt-2 d-flex align-items-center ${isUser ? 'text-white-50' : 'text-muted'}`}>
                                                <FaClock className="me-1" size={10}/>
                                                {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </div>
                                        </div>

                                        {isUser && (
                                            <div className="ms-2 ms-md-3 mt-1">
                                                <div className="glass-3d p-2 rounded-circle text-primary d-flex align-items-center justify-content-center shadow-sm" style={{ width: 36, height: 36, background: 'white' }}>
                                                    <FaUser size={16} className="text-primary" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {loading && (
                                <div className="d-flex justify-content-start mb-4 animate-3d-appear">
                                    <div className="me-3 mt-1">
                                        <div className="glass-3d p-2 rounded-circle text-primary d-flex align-items-center justify-content-center" style={{ width: 40, height: 40 }}>
                                            <FaRobot size={20} />
                                        </div>
                                    </div>
                                    <div className="glass-3d px-4 py-3 text-muted rounded-pill d-flex align-items-center border-0 shadow-sm">
                                        <div className="typing-indicator me-3">
                                            <span></span><span></span><span></span>
                                        </div>
                                        <span className="fw-bold small">Processing Legal Logic...</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* --- 3. INPUT AREA --- */}
                        <div className="p-4 bg-transparent border-top border-secondary border-opacity-10">
                            <Form onSubmit={sendMessage}>
                                <div className="position-relative glass-3d-inset rounded-pill p-1 d-flex align-items-center bg-white bg-opacity-50">
                                    <Form.Control
                                        ref={inputRef}
                                        type="text"
                                        placeholder={isGeneral ? "Ask a legal question..." : "Ask about this contract..."}
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        disabled={loading}
                                        className="border-0 shadow-none bg-transparent ps-4 py-3"
                                        style={{ paddingRight: '60px', fontSize: '1rem', fontWeight: 500 }}
                                        autoFocus
                                    />
                                    <Button
                                        type="submit"
                                        variant="primary"
                                        disabled={loading || !input.trim()}
                                        className="dashboard-nav-cta rounded-circle position-absolute end-0 me-1 d-flex align-items-center justify-content-center"
                                        style={{ width: 48, height: 48, border: 'none' }}
                                    >
                                        {loading ? <Spinner animation="border" size="sm" /> : <FaPaperPlane size={18} />}
                                    </Button>
                                </div>
                                <div className="text-center mt-2">
                                    <span className="smallest text-muted opacity-50 uppercase ls-1 fw-bold">
                                        Secure AI Counsel • Encrypted Session
                                    </span>
                                </div>
                            </Form>
                        </div>
                    </Card.Body>
                </Card>
            </Container>

            <style>{`
                .badge-pulse {
                    width: 8px;
                    height: 8px;
                    background: #10b981;
                    border-radius: 50%;
                    display: inline-block;
                    box-shadow: 0 0 0 rgba(16, 185, 129, 0.4);
                    animation: pulse-green 2s infinite;
                }

                @keyframes pulse-green {
                    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
                    70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
                    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
                }

                .typing-indicator span {
                    height: 8px; width: 8px; float: left; margin: 0 1px; background-color: #6366f1; display: block; border-radius: 50%; opacity: 0.4;
                    animation: typing 1s infinite;
                }
                .typing-indicator span:nth-of-type(1) { animation-delay: 0s; }
                .typing-indicator span:nth-of-type(2) { animation-delay: 0.2s; }
                .typing-indicator span:nth-of-type(3) { animation-delay: 0.4s; }

                @keyframes typing {
                    0% { transform: translateY(0px); opacity: 0.4; }
                    28% { transform: translateY(-5px); opacity: 0.8; }
                    44% { transform: translateY(0px); opacity: 0.4; }
                }

                .chat-bubble-hover:hover {
                    transform: translateY(-2px);
                    filter: brightness(1.02);
                }
            `}</style>
        </div>
    );
};

export default Chat;
