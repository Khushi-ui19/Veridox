import { useState, useEffect } from 'react';
import api, { getBackendOrigin } from '../api/axiosConfig';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Container, Card, Form, Button, Spinner, InputGroup, Badge } from 'react-bootstrap';
import { cacheUser, clearCachedUser } from '../utils/authUserCache';
import {
    FaShieldAlt,
    FaUser,
    FaLock,
    FaCheckCircle,
    FaArrowLeft,
    FaEye,
    FaEyeSlash,
    FaRedo,
    FaGoogle
} from 'react-icons/fa';

const Login = () => {
    const [step, setStep] = useState(1);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');

    const [showPassword, setShowPassword] = useState(false);
    const [timer, setTimer] = useState(60);
    const [canResend, setCanResend] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        localStorage.removeItem('jwtToken');
        clearCachedUser();
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');
        const error = params.get('error');
        if (token) {
            const finalizeOAuthLogin = async () => {
                localStorage.setItem('lastActive', Date.now().toString());
                try {
                    const profileRes = await api.get('/auth/profile');
                    cacheUser(profileRes.data);
                } catch {
                    // Dashboard still revalidates profile as fallback.
                }
                toast.success("Login Successful via Google!");
                navigate('/dashboard');
            };
            finalizeOAuthLogin();
        } else if (error === 'user_exists') {
             toast.error("User already exists! Please login.");
         }
    }, []);

    useEffect(() => {
        let interval;
        if (step === 2 && !canResend && timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
        } else if (timer === 0) {
            setCanResend(true);
        }
        return () => clearInterval(interval);
    }, [step, canResend, timer]);

    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/auth/login', { username, password });
            setStep(2);
            setTimer(60);
            setCanResend(false);
            toast.success("OTP sent to your email!");
        } catch (err) {
           const errorMessage = err.response?.data?.message || err.response?.data?.error;
           if (err.response && err.response.status === 404) {
               toast.error("Account does not exist. Redirecting to Register...");
               setTimeout(() => navigate('/register'), 2000);
           } else {
               toast.error(errorMessage || "Login failed. Check your username/email and password.");
           }
        } finally {
            setLoading(false);
        }
    };

   const handleGoogleLogin = () => {
        document.cookie = "auth_intent=login; path=/; max-age=300";
       window.location.href = `${getBackendOrigin()}/oauth2/authorization/google`;
    };

    const handleResendOtp = async () => {
        setLoading(true);
        try {
            await api.post('/auth/login', { username, password });
            toast.success("New OTP sent successfully!");
            setTimer(60);
            setCanResend(false);
            setOtp('');
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to resend OTP.");
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        try {
            const response = await api.post('/auth/login/verify', null, {
                params: { username, otp }
            });

            localStorage.setItem('lastActive', Date.now().toString());
            if (response?.data?.user) {
                cacheUser(response.data.user);
            }
            toast.success("Login Successful!");
            navigate('/dashboard');
        } catch (err) {
            toast.error(err.response?.data?.message || "Invalid OTP");
        }
    };

    return (
        <div className="d-flex justify-content-center align-items-center min-vh-100 app-theme-page">

            {/* Background Blobs */}
            <div className="background-blob modern-blob blob-indigo blob-lg blob-top-left" style={{ opacity: 0.3 }}></div>
            <div className="background-blob modern-blob blob-cyan blob-md blob-bottom-right" style={{ opacity: 0.2 }}></div>

            <Container className="app-page-content animate-entrance" style={{ maxWidth: '420px' }}>
                <Card className="border-0 glass-3d-deep shadow-2xl" style={{ borderRadius: '28px', background: 'rgba(255, 255, 255, 0.7)' }}>
                    <Card.Body className="p-3 p-md-4">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <Button variant="link" onClick={() => navigate('/')} className="nav-link-modern p-0 small d-flex align-items-center">
                                <FaArrowLeft className="me-1" /> Back
                            </Button>
                            <Badge bg="primary" className="rounded-pill px-3 smallest opacity-75">v2.0 SECURE</Badge>
                        </div>

                        <div className="text-center mb-3">
                            <div className="p-2 rounded-circle glass-3d d-inline-block mb-2 text-primary animate-float-slow" style={{ background: 'white' }}>
                                <FaShieldAlt size={24} />
                            </div>
                            <h3 className="fw-bold text-dark mb-1">Vault Access</h3>
                            <p className="text-muted smallest m-0">Secure semantic login</p>
                        </div>

                        {step === 1 ? (
                            <Form onSubmit={handleLogin}>
                                <Form.Group className="mb-2">
                                    <Form.Label className="fw-bold text-secondary smallest text-uppercase ls-1 mb-1 ms-1">Neural ID</Form.Label>
                                    <InputGroup className="glass-3d-inset rounded-3 overflow-hidden border-0 bg-white">
                                        <InputGroup.Text className="bg-transparent border-0 ps-3 py-2"><FaUser size={14} className="text-primary" /></InputGroup.Text>
                                        <Form.Control
                                            type="text"
                                            placeholder="Username or email"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            required
                                            className="bg-transparent border-0 py-2 shadow-none text-dark small"
                                        />
                                    </InputGroup>
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <div className="d-flex justify-content-between align-items-center mb-1 ms-1">
                                        <Form.Label className="fw-bold text-secondary smallest text-uppercase ls-1 mb-0">Encryption Key</Form.Label>
                                        <Button variant="link" className="auth-text-action smallest fw-bold" onClick={() => navigate('/forgot-password')}>
                                            Recover?
                                        </Button>
                                    </div>
                                    <InputGroup className="glass-3d-inset rounded-3 overflow-hidden border-0 bg-white">
                                        <InputGroup.Text className="bg-transparent border-0 ps-3 py-2"><FaLock size={14} className="text-primary" /></InputGroup.Text>
                                        <Form.Control
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            className="bg-transparent border-0 py-2 shadow-none text-dark small"
                                        />
                                        <Button variant="link" className="bg-transparent border-0 text-muted pe-3 py-2" onClick={() => setShowPassword(!showPassword)}>
                                            {showPassword ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                                        </Button>
                                    </InputGroup>
                                </Form.Group>

                                <Button type="submit" className="w-100 nav-btn-modern py-2 mb-3 d-flex align-items-center justify-content-center" disabled={loading}>
                                    {loading ? <Spinner animation="border" size="sm" className="me-2" /> : <><FaLock className="me-2" /> Unlock Account</>}
                                </Button>

                                <div className="d-flex align-items-center mb-3">
                                    <hr className="flex-grow-1 opacity-10" />
                                    <span className="px-2 text-muted smallest fw-bold ls-1">OR</span>
                                    <hr className="flex-grow-1 opacity-10" />
                                </div>

                                <Button variant="white" className="w-100 fw-bold glass-3d d-flex align-items-center justify-content-center py-2 rounded-3 text-dark border-0 shadow-sm hover-lift small" onClick={handleGoogleLogin}>
                                    <FaGoogle className="me-2 text-danger" /> Google
                                </Button>
                            </Form>
                        ) : (
                            <Form onSubmit={handleVerify}>
                                <div className="glass-3d-inset p-2 text-center mb-3 border-0 text-success fw-bold smallest rounded-3" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                                    <FaCheckCircle className="me-1" /> Secure code dispatched.
                                </div>
                                <Form.Group className="mb-3">
                                    <Form.Control
                                        type="text"
                                        placeholder="000000"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        required
                                        className="form-control glass-3d-inset text-center fs-3 fw-bold border-0 rounded-3 py-2 bg-white"
                                        maxLength="6"
                                        style={{ letterSpacing: '10px', color: 'var(--primary-color)' }}
                                    />
                                </Form.Group>

                                <div className="d-flex justify-content-center mb-3">
                                    <Button variant="link" onClick={handleResendOtp} disabled={!canResend || loading} className="nav-link-modern smallest">
                                        {canResend ? <span>Request Code</span> : <span>Resend: {formatTime(timer)}</span>}
                                    </Button>
                                </div>

                                <Button type="submit" className="w-100 nav-btn-modern py-2 shadow-lg" style={{ background: 'var(--success-color)' }}>
                                    Verify & Proceed
                                </Button>
                            </Form>
                        )}

                        {step === 1 && (
                            <div className="text-center mt-3 pt-3 border-top border-secondary border-opacity-10">
                                <span className="text-muted smallest">Unregistered? </span>
                                <Button variant="link" onClick={() => navigate('/register')} className="auth-text-action smallest fw-bold ms-1">
                                    Initialize Identity
                                </Button>
                            </div>
                        )}
                    </Card.Body>
                </Card>
            </Container>
        </div>
    );
};

export default Login;
