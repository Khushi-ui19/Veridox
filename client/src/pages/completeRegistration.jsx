import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';
import { toast } from 'react-toastify';
import { Container, Card, Form, Button, InputGroup, Spinner } from 'react-bootstrap';
import {
    FaUserCheck,
    FaUser,
    FaEnvelope,
    FaLock,
    FaEye,
    FaEyeSlash,
    FaCheckCircle,
    FaMagic,
    FaArrowLeft
} from 'react-icons/fa';

// --- THEME PANEL STYLE ---
const glassStyle = {
    background: 'var(--glass-surface)',
    border: '1px solid var(--glass-border)',
    boxShadow: 'var(--glass-shadow)'
};

const CompleteRegistration = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [tempToken, setTempToken] = useState('');

    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const emailParam = searchParams.get('email');
        const nameParam = searchParams.get('name');
        const tokenParam = searchParams.get('tempToken');

        if (emailParam) setEmail(emailParam);
        if (nameParam) setUsername(nameParam);
        if (tokenParam) setTempToken(tokenParam);

        if (!emailParam || !tokenParam) {
            toast.error("Invalid registration link.");
            navigate('/login');
        }
    }, [searchParams, navigate]);

    const generatePassword = () => {
        const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
        let newPassword = "";
        for (let i = 0; i < 12; i++) {
            newPassword += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setPassword(newPassword);
        setShowPassword(true);
        toast.info("Strong password generated!");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await api.post('/auth/oauth-complete', {
                email,
                username,
                password,
                tempToken
            });

            localStorage.setItem('jwtToken', response.data.token);
            localStorage.setItem('lastActive', Date.now().toString());
            toast.success("Registration Complete! Welcome.");
            navigate('/dashboard');
        } catch (error) {
            const msg = error.response?.data?.message || "Registration failed.";
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="d-flex justify-content-center align-items-center min-vh-100 fade-in app-theme-page" style={{ overflowX: 'hidden' }}>

            <div className="background-blob modern-blob blob-indigo blob-lg blob-top-left"></div>
            <div className="background-blob modern-blob blob-cyan blob-md blob-bottom-right"></div>

            <Container className="app-page-content" style={{ maxWidth: '450px' }}>
                <Card className="border-0 shadow-lg" style={glassStyle}>
                    <Card.Body className="p-4">

                        <div className="text-start mb-2">
                            <Button variant="link" onClick={() => navigate('/login')} className="p-0 text-decoration-none text-secondary fw-bold small">
                                <FaArrowLeft className="me-2" /> Back to Login
                            </Button>
                        </div>

                        <div className="text-center mb-4">
                            <div className="bg-white p-2 rounded-circle shadow-sm d-inline-block mb-3 text-success">
                                <FaUserCheck size={28} />
                            </div>
                            <h4 className="fw-bold text-dark mb-1">Final Step</h4>
                            <p className="text-secondary small">Complete your Google registration</p>
                        </div>

                        <Form onSubmit={handleSubmit}>
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-semibold text-secondary small text-uppercase ls-1 mb-1">Email</Form.Label>
                                <InputGroup>
                                    <InputGroup.Text className="bg-light border-end-0"><FaEnvelope className="text-secondary" /></InputGroup.Text>
                                    <Form.Control
                                        type="email"
                                        value={email}
                                        disabled
                                        className="form-control bg-light border-start-0 ps-0 shadow-none text-secondary"
                                    />
                                    <InputGroup.Text className="bg-light border-start-0 text-success"><FaCheckCircle /></InputGroup.Text>
                                </InputGroup>
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label className="fw-semibold text-secondary small text-uppercase ls-1 mb-1">Username</Form.Label>
                                <InputGroup>
                                    <InputGroup.Text className="bg-white border-end-0"><FaUser className="text-primary" /></InputGroup.Text>
                                    <Form.Control
                                        type="text"
                                        placeholder="Choose a username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        required
                                        className="form-control border-start-0 ps-0 shadow-none"
                                    />
                                </InputGroup>
                            </Form.Group>

                            <Form.Group className="mb-4">
                                <div className="d-flex justify-content-between align-items-center mb-1">
                                    <Form.Label className="fw-semibold text-secondary small text-uppercase ls-1 mb-0">Set Password</Form.Label>
                                    <Button variant="link" onClick={generatePassword} className="p-0 text-decoration-none small fw-bold text-primary">
                                        <FaMagic className="me-1" /> Auto-Generate
                                    </Button>
                                </div>
                                <InputGroup>
                                    <InputGroup.Text className="bg-white border-end-0"><FaLock className="text-primary" /></InputGroup.Text>
                                    <Form.Control
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Create a password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="form-control border-start-0 border-end-0 ps-0 shadow-none"
                                    />
                                    <Button variant="outline-secondary" className="border-start-0 bg-white text-secondary" onClick={() => setShowPassword(!showPassword)}>
                                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                                    </Button>
                                </InputGroup>
                            </Form.Group>

                            {/* --- FIX IS HERE: Wrapped content in fragments/spans --- */}
                            <Button variant="success" type="submit" className="w-100 btn fw-bold mb-3 shadow-sm rounded-pill py-2" disabled={loading}>
                                {loading ? (
                                    <>
                                        <Spinner animation="border" size="sm" className="me-2" /> Saving...
                                    </>
                                ) : (
                                    "Complete Registration"
                                )}
                            </Button>
                        </Form>
                    </Card.Body>
                </Card>
            </Container>
        </div>
    );
};

export default CompleteRegistration;
