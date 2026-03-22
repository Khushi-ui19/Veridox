import { useState, useEffect } from 'react';
import api from '../api/axiosConfig';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Container, Card, Form, Button, InputGroup, Spinner } from 'react-bootstrap';
import {
    FaUserPlus,
    FaUser,
    FaEnvelope,
    FaLock,
    FaArrowLeft,
    FaGoogle,
    FaEye,
    FaEyeSlash,
    FaCheckCircle,
    FaRedo // Icon for Resend
} from 'react-icons/fa';

// --- THEME PANEL STYLE ---
const glassStyle = {
    background: 'var(--glass-surface)',
    border: '1px solid var(--glass-border)',
    boxShadow: 'var(--glass-shadow)'
};

const Register = () => {
    // Form State
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');

    // UI State
    const [step, setStep] = useState(1); // 1 = Register Form, 2 = OTP Verification
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    // Resend Timer State
    const [resendCooldown, setResendCooldown] = useState(0);

    const navigate = useNavigate();

    // Timer Logic for Resend Button
    useEffect(() => {
        let timer;
        if (resendCooldown > 0) {
            timer = setInterval(() => {
                setResendCooldown((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [resendCooldown]);

    // STEP 1: Register and Send OTP
    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Sends data to backend. Backend saves to RAM and sends Email.
            await api.post('/auth/register', { username, email, password });
            toast.success("Verification Code sent to email!");
            setStep(2); // Move to OTP step
            setResendCooldown(30); // Start 30s cooldown
        } catch (err) {
//             const errorMsg = err.response?.data?.message || "Registration failed. Please check your email and try again.";
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    // STEP 2: Verify OTP and Activate Account
    const handleVerify = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Sends OTP to backend. Backend saves to MongoDB.
            await api.post('/auth/register/verify', { email, otp });
            toast.success("Account Verified! Redirecting to login...");
            setTimeout(() => navigate('/login'), 1500);
        } catch (err) {
            const errorMsg = err.response?.data?.message || "Invalid OTP. Please try again.";
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    // RESEND OTP FUNCTION
    const handleResendOtp = async () => {
        if (resendCooldown > 0) return;

        setLoading(true);
        try {
            await api.post('/auth/register/resend-otp', { email });
            toast.info("New code sent!");
            setResendCooldown(60); // Reset cooldown
        } catch (err) {
            const errorMsg = err.response?.data?.message || "Could not resend code.";
            toast.error(errorMsg);
            // If session expired (removed from RAM), go back to step 1
            if(errorMsg.toLowerCase().includes("expired")) {
                setStep(1);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleRegister = () => {
        document.cookie = "auth_intent=register; path=/; max-age=300";
        window.location.href = "/oauth2/authorization/google";
    };

    return (
        <div className="d-flex justify-content-center align-items-center min-vh-100 fade-in app-theme-page" style={{ overflow: 'hidden' }}>

            {/* Background Blobs */}
            <div className="background-blob modern-blob blob-indigo blob-lg blob-top-left"></div>
            <div className="background-blob modern-blob blob-cyan blob-md blob-bottom-right"></div>

            <Container className="app-page-content" style={{ maxWidth: '450px' }}>
                <Card className="border-0 shadow-lg" style={glassStyle}>
                    <Card.Body className="p-4">

                        {/* Header: Back Button Logic */}
                        <div className="text-start mb-2">
                            <Button variant="link" onClick={() => step === 2 ? setStep(1) : navigate('/')} className="p-0 text-decoration-none text-secondary fw-bold small">
                                <FaArrowLeft className="me-2" /> {step === 2 ? "Change Email" : "Back"}
                            </Button>
                        </div>

                        {/* Title Section */}
                        <div className="text-center mb-3">
                            <div className="bg-white p-2 rounded-circle shadow-sm d-inline-block mb-2 text-primary">
                                {step === 1 ? <FaUserPlus size={28} /> : <FaCheckCircle size={28} />}
                            </div>
                            <h4 className="fw-bold text-dark mb-0">{step === 1 ? "Create Account" : "Verify Email"}</h4>
                            {step === 2 && <small className="text-secondary">Enter the code sent to <strong>{email}</strong></small>}
                        </div>

                        {/* STEP 1: REGISTRATION FORM */}
                        {step === 1 && (
                            <Form onSubmit={handleRegister}>
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

                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-semibold text-secondary small text-uppercase ls-1 mb-1">Email Address</Form.Label>
                                    <InputGroup>
                                        <InputGroup.Text className="bg-white border-end-0"><FaEnvelope className="text-primary" /></InputGroup.Text>
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

                                <Form.Group className="mb-4">
                                    <Form.Label className="fw-semibold text-secondary small text-uppercase ls-1 mb-1">Password</Form.Label>
                                    <InputGroup>
                                        <InputGroup.Text className="bg-white border-end-0"><FaLock className="text-primary" /></InputGroup.Text>
                                        <Form.Control
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Create a strong password"
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

                                <Button variant="primary" type="submit" className="w-100 btn fw-bold mb-3 shadow-sm rounded-pill py-2" disabled={loading}>
                                    {loading ? <><Spinner animation="border" size="sm" className="me-2" /> Sending OTP...</> : "Sign Up"}
                                </Button>

                                <div className="d-flex align-items-center my-3">
                                    <hr className="flex-grow-1 opacity-25" />
                                    <span className="px-3 text-secondary small fw-bold">OR</span>
                                    <hr className="flex-grow-1 opacity-25" />
                                </div>

                                <Button variant="white" className="w-100 fw-bold border shadow-sm d-flex align-items-center justify-content-center py-2 rounded-pill bg-white text-dark hover-lift" onClick={handleGoogleRegister}>
                                    <FaGoogle className="me-2 text-danger" /> Sign up with Google
                                </Button>
                            </Form>
                        )}

                        {/* STEP 2: OTP VERIFICATION FORM */}
                        {step === 2 && (
                            <Form onSubmit={handleVerify}>
                                <Form.Group className="mb-4">
                                    <Form.Label className="fw-semibold text-secondary small text-uppercase ls-1 mb-1">Verification Code</Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="000000"
                                        className="text-center fs-4 letter-spacing-1 shadow-sm"
                                        maxLength="8"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        required
                                        style={{ letterSpacing: '0.2em', fontWeight: 'bold' }}
                                    />
                                </Form.Group>

                                <Button variant="success" type="submit" className="w-100 btn fw-bold rounded-pill py-2 shadow-sm mb-3" disabled={loading}>
                                    {loading ? <><Spinner animation="border" size="sm" className="me-2" /> Verifying...</> : "Verify & Activate"}
                                </Button>

                                {/* RESEND CODE BUTTON */}
                                <div className="text-center">
                                    <span className="text-secondary small">Didn't receive code? </span>
                                    <Button
                                        variant="link"
                                        onClick={handleResendOtp}
                                        disabled={resendCooldown > 0 || loading}
                                        className="p-0 fw-bold text-primary text-decoration-none small ms-1"
                                    >
                                        {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : <><FaRedo className="me-1 small"/> Resend OTP</>}
                                    </Button>
                                </div>
                            </Form>
                        )}

                        {/* Login Link (Only show on Step 1) */}
                        {step === 1 && (
                            <div className="text-center mt-3 pt-2 border-top">
                                <span className="text-secondary small">Already have an account? </span>
                                <Button variant="link" onClick={() => navigate('/login')} className="p-0 fw-bold text-primary text-decoration-none small">
                                    Login Here
                                </Button>
                            </div>
                        )}
                    </Card.Body>
                </Card>
            </Container>
        </div>
    );
};

export default Register;
