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
        <div className="d-flex justify-content-center align-items-center min-vh-100 fade-in app-theme-page animate-3d-appear">

            {/* Background Blobs */}
            <div className="background-blob modern-blob blob-indigo blob-lg blob-top-left"></div>
            <div className="background-blob modern-blob blob-cyan blob-md blob-bottom-right"></div>

            <Container className="app-page-content" style={{ maxWidth: '420px' }}>
                <Card className="border-0 glass-3d" style={{ borderRadius: '24px' }}>
                    <Card.Body className="p-4">
                        <div className="text-start mb-3">
                            <Button variant="link" onClick={() => navigate('/login')} className="p-0 text-decoration-none text-secondary fw-bold small glass-3d px-3 py-1 rounded-pill">
                                <FaArrowLeft className="me-2" /> Login
                            </Button>
                        </div>

                        <div className="text-center mb-4">
                            <div className="p-2 rounded-circle glass-3d d-inline-block mb-2 text-warning pulse">
                                {step === 3 ? <FaCheckCircle size={28} className="text-success" /> : <FaKey size={28} />}
                            </div>
                            <h3 className="fw-bold text-dark mb-1">
                                {step === 1 && "Security Key"}
                                {step === 2 && "Verify OTP"}
                                {step === 3 && "New Identity"}
                            </h3>
                            <p className="text-muted small mb-0">
                                {step === 1 && "Access recovery for your vault"}
                                {step === 2 && `Secure code sent to email`}
                                {step === 3 && "Forge a new secure password"}
                            </p>
                        </div>

                        {/* --- FORM STEP 1: EMAIL --- */}
                        {step === 1 && (
                            <Form onSubmit={handleSendOtp}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-bold text-secondary small text-uppercase ls-1 mb-1 ms-2">Email Address</Form.Label>
                                    <InputGroup className="glass-3d-inset rounded-4 overflow-hidden border-0">
                                        <InputGroup.Text className="bg-transparent border-0 ps-3"><FaEnvelope className="text-primary opacity-50" /></InputGroup.Text>
                                        <Form.Control
                                            type="email"
                                            placeholder="Enter your email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            className="bg-transparent border-0 py-2 shadow-none text-dark"
                                        />
                                    </InputGroup>
                                </Form.Group>
                                <Button type="submit" className="w-100 nav-btn-modern py-2 d-flex align-items-center justify-content-center" disabled={loading}>
                                    {loading ? <Spinner animation="border" size="sm" /> : "Request Key"}
                                </Button>
                            </Form>
                        )}

                        {/* --- FORM STEP 2: OTP --- */}
                        {step === 2 && (
                            <Form onSubmit={handleVerifyOtp}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-bold text-secondary small text-uppercase text-center w-100 d-block mb-2">Auth Code</Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="000000"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        required
                                        className="form-control glass-3d-inset text-center fs-3 fw-bold border-0 rounded-4 py-2"
                                        maxLength="6"
                                        style={{ letterSpacing: '8px', color: 'var(--primary-color)' }}
                                    />
                                </Form.Group>
                                <div className="d-flex justify-content-center mb-3">
                                    <Button variant="link" onClick={handleSendOtp} disabled={!canResend || loading} className="p-0 text-decoration-none small fw-bold text-secondary glass-3d px-3 py-1 rounded-pill">
                                        {canResend ? <span className="text-primary"><FaRedo className="me-1" /> Resend</span> : <span>Resend in {formatTime(timer)}</span>}
                                    </Button>
                                </div>
                                <Button type="submit" className="w-100 nav-btn-modern py-2 d-flex align-items-center justify-content-center" disabled={loading}>
                                    {loading ? <Spinner animation="border" size="sm" /> : "Verify Access"}
                                </Button>
                            </Form>
                        )}

                        {/* --- FORM STEP 3: NEW PASSWORD --- */}
                        {step === 3 && (
                            <Form onSubmit={handleResetPassword}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-bold text-secondary small text-uppercase ls-1 mb-1 ms-2">New Password</Form.Label>
                                    <InputGroup className="glass-3d-inset rounded-4 overflow-hidden border-0">
                                        <InputGroup.Text className="bg-transparent border-0 ps-3"><FaLock className="text-primary opacity-50" /></InputGroup.Text>
                                        <Form.Control
                                            type={showPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            required
                                            className="bg-transparent border-0 py-2 shadow-none text-dark"
                                        />
                                        <Button variant="link" className="bg-transparent border-0 text-muted pe-3" onClick={() => setShowPassword(!showPassword)}>
                                            {showPassword ? <FaEyeSlash /> : <FaEye />}
                                        </Button>
                                    </InputGroup>
                                </Form.Group>
                                <Form.Group className="mb-4">
                                    <Form.Label className="fw-bold text-secondary small text-uppercase ls-1 mb-1 ms-2">Confirm Password</Form.Label>
                                    <InputGroup className="glass-3d-inset rounded-4 overflow-hidden border-0">
                                        <InputGroup.Text className="bg-transparent border-0 ps-3"><FaCheckCircle className="text-primary opacity-50" /></InputGroup.Text>
                                        <Form.Control
                                            type={showPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                            className="bg-transparent border-0 py-2 shadow-none text-dark"
                                        />
                                    </InputGroup>
                                </Form.Group>
                                <Button type="submit" className="w-100 nav-btn-modern py-2 d-flex align-items-center justify-content-center" style={{ background: 'var(--success-color)' }} disabled={loading}>
                                    {loading ? <Spinner animation="border" size="sm" /> : "Update Vault Key"}
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
