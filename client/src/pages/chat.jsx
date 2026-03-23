import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';
import { Container, Button, Card, Form, Badge, Spinner } from 'react-bootstrap';
import { FaArrowLeft, FaRobot, FaUser, FaArrowUp, FaClock, FaComments, FaFileContract, FaTrashAlt } from 'react-icons/fa';

// --- THEME PANEL STYLE ---
const glassStyle = {
    background: 'var(--glass-surface)',
    border: '1px solid var(--glass-border)',
    boxShadow: 'var(--glass-shadow)'
};

const Chat = () => {
    // --- 1. YOUR ORIGINAL LOGIC ---
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

    // Conversation Memory Logic
    const storageKey = `chat_session_${contractId}`;
    const [conversationId, setConversationId] = useState(localStorage.getItem(storageKey) || '');

    const messagesContainerRef = useRef(null);
    const inputRef = useRef(null);
    const navigate = useNavigate();

    // Auto-scroll only the chat list (never the browser page).
    useEffect(() => {
        const container = messagesContainerRef.current;
        if (!container) return;

        const behavior = 'auto';
        container.scrollTo({ top: container.scrollHeight, behavior });
    }, [messages]);

    // Keep cursor in chat input after AI responses/clear actions.
    useEffect(() => {
        if (!loading) {
            inputRef.current?.focus();
        }
    }, [loading]);

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

    // --- 2. LAYOUT & STYLING ---
    return (
        <div className="d-flex flex-column app-theme-page"
             style={{
                 minHeight: '100dvh'
             }}>

            {/* Background Blobs */}
            <div className="background-blob modern-blob blob-indigo blob-lg blob-top-left"></div>
            <div className="background-blob modern-blob blob-rose blob-sm blob-bottom-right"></div>

            <Container
                className="app-page-content d-flex flex-column py-3 gap-3"
                style={{ maxWidth: '900px', minHeight: 'calc(100dvh - 1.5rem)', height: 'auto' }}
            >

                {/* --- HEADER (Fixed Top) --- */}
                <Card className="border-0 flex-shrink-0 chat-shell-card" style={glassStyle}>
                    <Card.Body className="d-flex align-items-center justify-content-between py-2 px-3">
                        <div className="d-flex align-items-center">
                            <Button variant="link" onClick={() => navigate('/dashboard')} className="p-0 text-decoration-none text-muted me-3">
                                <FaArrowLeft size={20} />
                            </Button>
                            <div>
                                <h6 className="fw-bold mb-0 d-flex align-items-center text-dark">
                                    {isGeneral ? <FaComments className="me-2 text-primary" /> : <FaFileContract className="me-2 text-primary" />}
                                    {isGeneral ? 'General Assistant' : 'Contract Assistant'}
                                </h6>
                                <div className="d-flex align-items-center gap-2 mt-1">
                                    {isGeneral && <Badge bg="primary" style={{ fontSize: '0.65rem' }}>General Mode</Badge>}
                                </div>
                            </div>
                        </div>
                        <div className="d-flex align-items-center gap-3">
                            <Button
                                variant="link"
                                onClick={handleClearChat}
                                disabled={loading}
                                className="p-0 text-decoration-none text-danger d-flex align-items-center justify-content-center"
                                title="Clear chat"
                                aria-label="Clear chat"
                            >
                                <FaTrashAlt size={18} />
                            </Button>
                        </div>
                    </Card.Body>
                </Card>

                {/* --- CHAT AREA (Scrollable Middle) --- */}
                <Card className="border-0 shadow-sm chat-shell-card"
                      style={{
                          ...glassStyle,
                          background: 'var(--glass-surface-alt)',
                          flexGrow: 1,  // TAKE REMAINING SPACE
                          minHeight: 0, // CRITICAL FOR SCROLLING: Allows container to shrink
                          overflow: 'hidden' // Hide outer scrollbar
                      }}>
                    <Card.Body className="p-0 d-flex flex-column h-100 chat-scroll-body" style={{ minHeight: 0 }}>
                        {/* SCROLLABLE DIV */}
                        <div ref={messagesContainerRef} className="flex-grow-1 overflow-auto p-3 chat-messages-scroll">
                            {messages.map((msg, index) => {
                                const isUser = msg.sender === 'user';
                                return (
                                    <div key={index} className={`d-flex mb-3 ${isUser ? 'justify-content-end' : 'justify-content-start'}`}>

                                        {!isUser && (
                                            <div className="me-2 mt-1">
                                                <div className="bg-white p-2 rounded-circle shadow-sm text-primary d-flex align-items-center justify-content-center" style={{ width: 32, height: 32 }}>
                                                    <FaRobot size={16} />
                                                </div>
                                            </div>
                                        )}

                                        <div
                                            className={`p-3 shadow-sm ${isUser ? 'text-white' : 'text-dark'}`}
                                             style={{
                                                 maxWidth: '80%',
                                                 borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                                 background: isUser ? 'var(--gradient-accent)' : 'var(--glass-surface)',
                                                 border: isUser ? 'none' : '1px solid var(--glass-border)'
                                             }}
                                         >
                                            <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem', lineHeight: '1.5' }}>
                                                {msg.text}
                                            </div>
                                            <div className={`small mt-1 text-end ${isUser ? 'text-white-50' : 'text-muted'}`} style={{ fontSize: '0.65rem' }}>
                                                <FaClock className="me-1"/>
                                                {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </div>
                                        </div>

                                        {isUser && (
                                            <div className="ms-2 mt-1">
                                                <div className="bg-primary text-white p-2 rounded-circle shadow-sm d-flex align-items-center justify-content-center" style={{ width: 32, height: 32 }}>
                                                    <FaUser size={14} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {loading && (
                                <div className="d-flex justify-content-start mb-3">
                                    <div className="me-2 mt-1">
                                        <div className="bg-white p-2 rounded-circle shadow-sm text-primary" style={{ width: 32, height: 32 }}><FaRobot size={16} /></div>
                                    </div>
                                    <div className="bg-white px-3 py-2 shadow-sm text-muted rounded-pill border d-flex align-items-center small">
                                        <Spinner animation="grow" size="sm" className="me-2" /> Thinking...
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card.Body>
                </Card>

                {/* --- INPUT AREA (Fixed Bottom) --- */}
                <div className="flex-shrink-0" style={{ zIndex: 10 }}>
                    <Form onSubmit={sendMessage}>
                        <div className="position-relative shadow-lg rounded-pill bg-white p-1 d-flex align-items-center border">
                            <Form.Control
                                ref={inputRef}
                                type="text"
                                placeholder={isGeneral ? "Ask a legal question..." : "Ask about this contract..."}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                disabled={loading}
                                className="border-0 shadow-none bg-transparent ps-4 py-2"
                                style={{ paddingRight: '50px', fontSize: '1rem' }}
                                autoFocus
                            />
                            <Button
                                type="submit"
                                variant="primary"
                                disabled={loading || !input.trim()}
                                className="rounded-circle position-absolute end-0 me-1 d-flex align-items-center justify-content-center shadow-sm"
                                style={{ width: 40, height: 40 }}
                            >
                                {loading ? <Spinner animation="border" size="sm" /> : <FaArrowUp size={16} />}
                            </Button>
                        </div>
                    </Form>
                </div>

            </Container>
        </div>
    );
};

export default Chat;
