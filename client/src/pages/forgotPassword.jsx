import { useState, useEffect } from 'react';
import api from '../api/axiosConfig';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Container, Card, Form, Button, InputGroup, Spinner } from 'react-bootstrap';
import {
    FaLock,
    FaEnvelope,
    FaArrowLeft,
    FaKey,
    FaCheckCircle,
    FaEye,
    FaEyeSlash,
    FaRedo
} from 'react-icons/fa';

// --- THEME PANEL STYLE ---
const glassStyle = {
    background: 'var(--glass-surface)',
    border: '1px solid var(--glass-border)',
    boxShadow: 'var(--glass-shadow)'
};

const ForgotPassword = () => {
    const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [timer, setTimer] = useState(0);
    const [canResend, setCanResend] = useState(false);

    const navigate = useNavigate();

    // Timer Logic for OTP
    useEffect(() => {
        let interval;
        if (timer > 0) {
            interval = setInterval(() => setTimer(prev => prev - 1), 1000);
        } else if (timer === 0 && step === 2) {
            setCanResend(true);
        }
        return () => clearInterval(interval);
    }, [timer, step]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Step 1: Send OTP
    const handleSendOtp = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/auth/forgot-password/send-otp', { email });
            toast.success("OTP sent to your email.");
            setStep(2);
            setTimer(60);
            setCanResend(false);
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to send OTP. Check email.");
        } finally {
            setLoading(false);
        }
    };

    // Step 2: Verify OTP
    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/auth/forgot-password/verify-otp', { email, otp });
            toast.success("OTP Verified!");
            setStep(3);
        } catch (error) {
            toast.error("Invalid OTP. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // Step 3: Reset Password
    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast.error("Passwords do not match!");
            return;
        }
        setLoading(true);
        try {
            await api.post('/auth/forgot-password/reset', { email, otp, newPassword });
            toast.success("Password Reset Successful! Please Login.");
            setTimeout(() => navigate('/login'), 2000);
        } catch (error) {
            toast.error("Failed to reset password.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="d-flex justify-content-center align-items-center min-vh-100 fade-in app-theme-page" style={{ overflowX: 'hidden' }}>

            {/* Background Blobs */}
            <div className="background-blob modern-blob blob-indigo blob-lg blob-top-left"></div>
            <div className="background-blob modern-blob blob-cyan blob-md blob-bottom-right"></div>

            <Container className="app-page-content" style={{ maxWidth: '420px' }}>
                <Card className="border-0 shadow-lg" style={glassStyle}>
                    <Card.Body className="p-4">
                        <div className="text-start mb-2">
                            <Button variant="link" onClick={() => navigate('/login')} className="p-0 text-decoration-none text-muted fw-bold small">
                                <FaArrowLeft className="me-2" /> Back to Login
                            </Button>
                        </div>

                        <div className="text-center mb-4">
                            <div className="bg-white p-2 rounded-circle shadow-sm d-inline-block mb-2 text-warning">
                                {step === 3 ? <FaCheckCircle size={28} className="text-success" /> : <FaKey size={28} />}
                            </div>
                            <h4 className="fw-bold text-dark mb-1">
                                {step === 1 && "Forgot Password?"}
                                {step === 2 && "Verify OTP"}
                                {step === 3 && "Reset Password"}
                            </h4>
                            <p className="text-muted small mb-0">
                                {step === 1 && "Enter your email to receive a code"}
                                {step === 2 && `Code sent to ${email}`}
                                {step === 3 && "Create a new strong password"}
                            </p>
                        </div>

                        {/* --- FORM STEP 1: EMAIL --- */}
                        {step === 1 && (
                            <Form onSubmit={handleSendOtp}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-semibold text-muted small text-uppercase ls-1 mb-1">Email Address</Form.Label>
                                    <InputGroup>
                                        <InputGroup.Text className="bg-white border-end-0"><FaEnvelope className="text-primary opacity-50" /></InputGroup.Text>
                                        <Form.Control
                                            type="email"
                                            placeholder="name@example.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            className="form-control border-start-0 ps-0 shadow-none"
                                        />
                                    </InputGroup>
                                </Form.Group>
                                <Button variant="primary" type="submit" className="w-100 btn fw-bold rounded-pill py-2 shadow-sm" disabled={loading}>
                                    {loading ? <Spinner animation="border" size="sm" /> : "Send Code"}
                                </Button>
                            </Form>
                        )}

                        {/* --- FORM STEP 2: OTP --- */}
                        {step === 2 && (
                            <Form onSubmit={handleVerifyOtp}>
                                <Form.Group className="mb-3">
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
                                    <Button variant="link" onClick={handleSendOtp} disabled={!canResend || loading} className="p-0 text-decoration-none small fw-bold text-muted">
                                        {canResend ? <span className="text-primary"><FaRedo className="me-1" /> Resend Code</span> : <span>Resend in {formatTime(timer)}</span>}
                                    </Button>
                                </div>
                                <Button variant="primary" type="submit" className="w-100 btn fw-bold rounded-pill py-2 shadow-sm" disabled={loading}>
                                    {loading ? <Spinner animation="border" size="sm" /> : "Verify Code"}
                                </Button>
                            </Form>
                        )}

                        {/* --- FORM STEP 3: NEW PASSWORD --- */}
                        {step === 3 && (
                            <Form onSubmit={handleResetPassword}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-semibold text-muted small text-uppercase ls-1 mb-1">New Password</Form.Label>
                                    <InputGroup>
                                        <InputGroup.Text className="bg-white border-end-0"><FaLock className="text-primary opacity-50" /></InputGroup.Text>
                                        <Form.Control
                                            type={showPassword ? "text" : "password"}
                                            placeholder="New password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            required
                                            className="form-control border-start-0 border-end-0 ps-0 shadow-none"
                                        />
                                        <Button variant="outline-secondary" className="border-start-0 bg-white text-muted" onClick={() => setShowPassword(!showPassword)}>
                                            {showPassword ? <FaEyeSlash /> : <FaEye />}
                                        </Button>
                                    </InputGroup>
                                </Form.Group>
                                <Form.Group className="mb-4">
                                    <Form.Label className="fw-semibold text-muted small text-uppercase ls-1 mb-1">Confirm Password</Form.Label>
                                    <InputGroup>
                                        <InputGroup.Text className="bg-white border-end-0"><FaCheckCircle className="text-primary opacity-50" /></InputGroup.Text>
                                        <Form.Control
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Confirm password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                            className="form-control border-start-0 ps-0 shadow-none"
                                        />
                                    </InputGroup>
                                </Form.Group>
                                <Button variant="success" type="submit" className="w-100 btn fw-bold rounded-pill py-2 shadow-sm" disabled={loading}>
                                    {loading ? <Spinner animation="border" size="sm" /> : "Reset Password"}
                                </Button>
                            </Form>
                        )}

                    </Card.Body>
                </Card>
            </Container>
        </div>
    );
};

export default ForgotPassword;
