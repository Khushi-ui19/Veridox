import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';
import { toast } from 'react-toastify';
import { Container, Card, Form, Button, InputGroup, Spinner } from 'react-bootstrap';
import { cacheUser } from '../utils/authUserCache';
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
            await api.post('/auth/oauth-complete', {
                email,
                username,
                password,
                tempToken
            });

            localStorage.setItem('lastActive', Date.now().toString());
            try {
                const profileRes = await api.get('/auth/profile');
                cacheUser(profileRes.data);
            } catch {
                // PrivateRoute re-check
            }
            toast.success("Identity Verified! Welcome.");
            navigate('/dashboard');
        } catch (error) {
            const msg = error.response?.data?.message || "Verification failed.";
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="d-flex justify-content-center align-items-center min-vh-100 fade-in app-theme-page animate-3d-appear">

            <div className="background-blob modern-blob blob-indigo blob-lg blob-top-left"></div>
            <div className="background-blob modern-blob blob-cyan blob-md blob-bottom-right"></div>

            <Container className="app-page-content" style={{ maxWidth: '440px' }}>
                <Card className="border-0 glass-3d" style={{ borderRadius: '24px' }}>
                    <Card.Body className="p-4">

                        <div className="text-start mb-3">
                            <Button variant="link" onClick={() => navigate('/login')} className="p-0 text-decoration-none text-secondary fw-bold small glass-3d px-3 py-1 rounded-pill">
                                <FaArrowLeft className="me-2" /> Login
                            </Button>
                        </div>

                        <div className="text-center mb-4">
                            <div className="p-2 rounded-circle glass-3d d-inline-block mb-2 text-success pulse">
                                <FaUserCheck size={28} />
                            </div>
                            <h3 className="fw-bold text-dark mb-0">Final Step</h3>
                            <p className="text-muted small mt-1 mb-0">Establish your secure profile</p>
                        </div>

                        <Form onSubmit={handleSubmit}>
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-bold text-secondary small text-uppercase ls-1 mb-1 ms-2">Linked Email</Form.Label>
                                <InputGroup className="glass-3d-inset rounded-4 overflow-hidden border-0 bg-soft opacity-75">
                                    <InputGroup.Text className="bg-transparent border-0 ps-3"><FaEnvelope className="text-secondary" /></InputGroup.Text>
                                    <Form.Control
                                        type="email"
                                        value={email}
                                        disabled
                                        className="bg-transparent border-0 py-2 shadow-none text-secondary fw-bold"
                                    />
                                    <InputGroup.Text className="bg-transparent border-0 pe-3 text-success"><FaCheckCircle /></InputGroup.Text>
                                </InputGroup>
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label className="fw-bold text-secondary small text-uppercase ls-1 mb-1 ms-2">Choose Username</Form.Label>
                                <InputGroup className="glass-3d-inset rounded-4 overflow-hidden border-0">
                                    <InputGroup.Text className="bg-transparent border-0 ps-3"><FaUser className="text-primary" /></InputGroup.Text>
                                    <Form.Control
                                        type="text"
                                        placeholder="Pick a handle"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        required
                                        className="bg-transparent border-0 py-2 shadow-none text-dark"
                                    />
                                </InputGroup>
                            </Form.Group>

                            <Form.Group className="mb-4">
                                <div className="d-flex justify-content-between align-items-center mb-1 ms-2">
                                    <Form.Label className="fw-bold text-secondary small text-uppercase ls-1 mb-0">Secure Password</Form.Label>
                                    <Button variant="link" onClick={generatePassword} className="p-0 text-decoration-none small fw-bold text-primary">
                                        <FaMagic className="me-1" /> Auto-Generate
                                    </Button>
                                </div>
                                <InputGroup className="glass-3d-inset rounded-4 overflow-hidden border-0">
                                    <InputGroup.Text className="bg-transparent border-0 ps-3"><FaLock className="text-primary" /></InputGroup.Text>
                                    <Form.Control
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Create password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="bg-transparent border-0 py-2 shadow-none text-dark"
                                    />
                                    <Button variant="link" className="bg-transparent border-0 text-muted pe-3" onClick={() => setShowPassword(!showPassword)}>
                                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                                    </Button>
                                </InputGroup>
                            </Form.Group>

                            <Button variant="success" type="submit" className="w-100 btn-success glass-3d fw-bold mb-3 rounded-pill py-2 shadow-sm" disabled={loading}>
                                {loading ? (
                                    <>
                                        <Spinner animation="border" size="sm" className="me-2" /> Syncing...
                                    </>
                                ) : (
                                    "Establish Profile"
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
