import { useState, useEffect } from 'react';
import api from '../api/axiosConfig';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Container, Card, Form, Button, Spinner, InputGroup } from 'react-bootstrap';
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

// --- GLASSMORPHISM STYLE ---
const glassStyle = {
    background: 'rgba(255, 255, 255, 0.85)', // Slightly higher opacity for cleaner look
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.5)',
    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.1)'
};

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
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');
        const error = params.get('error');
        if (token) {
            localStorage.setItem('lastActive', Date.now().toString());
            toast.success("Login Successful via Google!");
            navigate('/dashboard');
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
           if (err.response && err.response.status === 404) {
               toast.error("Account does not exist. Redirecting to Register...");
               setTimeout(() => navigate('/register'), 2000);
           } else {
               toast.error("Login failed. Check username/password.");
           }
        } finally {
            setLoading(false);
        }
    };

   const handleGoogleLogin = () => {
        document.cookie = "auth_intent=login; path=/; max-age=300";
       window.location.href = "/oauth2/authorization/google";
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
            toast.error("Failed to resend OTP.");
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/auth/login/verify?username=${username}&otp=${otp}`);

            localStorage.setItem('lastActive', Date.now().toString());
            toast.success("Login Successful!");
            navigate('/dashboard');
        } catch (err) {
            toast.error("Invalid OTP");
        }
    };

    return (
        <div className="d-flex justify-content-center align-items-center min-vh-100 fade-in"
             style={{
                 background: 'linear-gradient(135deg, #e0e7ff 0%, #f3f4f6 100%)',
                 position: 'relative',
                 overflow: 'hidden'
             }}>

            {/* Background Blobs */}
            <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '600px', height: '600px', background: '#6366f1', filter: 'blur(150px)', opacity: '0.2', borderRadius: '50%', zIndex: '0' }}></div>
            <div style={{ position: 'absolute', bottom: '10%', right: '-10%', width: '500px', height: '500px', background: '#10b981', filter: 'blur(150px)', opacity: '0.2', borderRadius: '50%', zIndex: '0' }}></div>

            <Container style={{ zIndex: 1, maxWidth: '420px' }}> {/* Reduced maxWidth for a slimmer look */}
                <Card className="border-0 shadow-lg" style={glassStyle}>
                    <Card.Body className="p-4"> {/* Reduced Padding (p-5 -> p-4) */}
                        <div className="text-start mb-2"> {/* Reduced Margin */}
                            <Button variant="link" onClick={() => navigate('/')} className="p-0 text-decoration-none text-muted fw-bold small">
                                <FaArrowLeft className="me-2" /> Back
                            </Button>
                        </div>

                        <div className="text-center mb-3"> {/* Reduced Margin (mb-5 -> mb-3) */}
                            <div className="bg-white p-2 rounded-circle shadow-sm d-inline-block mb-2 text-primary">
                                <FaShieldAlt size={28} />
                            </div>
                            <h4 className="fw-bold text-dark mb-0">Welcome Back</h4>
                        </div>

                        {step === 1 ? (
                            <Form onSubmit={handleLogin}>
                                <Form.Group className="mb-3"> {/* Reduced Margin (mb-4 -> mb-3) */}
                                    <Form.Label className="fw-semibold text-muted small text-uppercase ls-1 mb-1">Username</Form.Label>
                                    <InputGroup>
                                        <InputGroup.Text className="bg-white border-end-0"><FaUser className="text-primary opacity-50" /></InputGroup.Text>
                                        <Form.Control
                                            type="text"
                                            placeholder="Username"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            required
                                            className="form-control border-start-0 ps-0 shadow-none"
                                        />
                                    </InputGroup>
                                </Form.Group>

                                <Form.Group className="mb-3"> {/* Reduced Margin (mb-4 -> mb-3) */}
                                    <div className="d-flex justify-content-between align-items-center mb-1">
                                        <Form.Label className="fw-semibold text-muted small text-uppercase ls-1 mb-0">Password</Form.Label>
                                        <Button variant="link" className="p-0 text-decoration-none small fw-bold" onClick={() => navigate('/forgot-password')}>
                                            Forgot?
                                        </Button>
                                    </div>
                                    <InputGroup>
                                        <InputGroup.Text className="bg-white border-end-0"><FaLock className="text-primary opacity-50" /></InputGroup.Text>
                                        <Form.Control
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            className="form-control border-start-0 border-end-0 ps-0 shadow-none"
                                        />
                                        <Button variant="outline-secondary" className="border-start-0 bg-white text-muted" onClick={() => setShowPassword(!showPassword)}>
                                            {showPassword ? <FaEyeSlash /> : <FaEye />}
                                        </Button>
                                    </InputGroup>
                                </Form.Group>

                                <Button variant="primary" type="submit" className="w-100 btn fw-bold mb-3 shadow-sm rounded-pill py-2" disabled={loading}>
                                    {loading ? <><Spinner animation="border" size="sm" className="me-2" /> Sending...</> : <><FaLock className="me-2" /> Login</>}
                                </Button>

                                <div className="d-flex align-items-center my-3"> {/* Reduced Margin (my-4 -> my-3) */}
                                    <hr className="flex-grow-1 opacity-25" />
                                    <span className="px-3 text-muted small fw-bold">OR</span>
                                    <hr className="flex-grow-1 opacity-25" />
                                </div>

                                <Button variant="white" className="w-100 fw-bold border shadow-sm d-flex align-items-center justify-content-center py-2 rounded-pill bg-white text-dark hover-lift" onClick={handleGoogleLogin}>
                                    <FaGoogle className="me-2 text-danger" /> Google
                                </Button>
                            </Form>
                        ) : (
                            <Form onSubmit={handleVerify}>
                                <div className="alert alert-success py-2 text-center mb-3 border-0 shadow-sm rounded bg-success-subtle text-success fw-bold small">
                                    <FaCheckCircle className="me-2" /> Code Sent
                                </div>
                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-semibold text-muted small text-uppercase text-center w-100 d-block mb-2">Enter OTP</Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="000000"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        required
                                        className="form-control text-center fs-4 fw-bold letter-spacing-2 shadow-none border-primary"
                                        maxLength="6"
                                        style={{ letterSpacing: '6px' }}
                                    />
                                </Form.Group>

                                <div className="d-flex justify-content-center mb-3">
                                    <Button variant="link" onClick={handleResendOtp} disabled={!canResend || loading} className="p-0 text-decoration-none small fw-bold text-muted">
                                        {canResend ? <span className="text-primary"><FaRedo className="me-1" /> Resend</span> : <span>Resend in {formatTime(timer)}</span>}
                                    </Button>
                                </div>

                                <Button variant="success" type="submit" className="w-100 btn fw-bold rounded-pill shadow-sm py-2">
                                    Verify
                                </Button>
                            </Form>
                        )}

                        {step === 1 && (
                            <div className="text-center mt-3 pt-2 border-top">
                                <span className="text-muted small">New here? </span>
                                <Button variant="link" onClick={() => navigate('/register')} className="p-0 fw-bold text-primary text-decoration-none small">
                                    Create Account
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