import { useState, useEffect } from 'react';
import api, { getBackendOrigin } from '../api/axiosConfig';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Container, Card, Form, Button, InputGroup, Spinner, Badge } from 'react-bootstrap';
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
    FaRedo
} from 'react-icons/fa';

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
            await api.post('/auth/register', { username, email, password });
            toast.success("Verification Code sent to email!");
            setStep(2);
            setResendCooldown(30);
        } catch (err) {
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

    const handleResendOtp = async () => {
        if (resendCooldown > 0) return;

        setLoading(true);
        try {
            await api.post('/auth/register/resend-otp', { email });
            toast.info("New code sent!");
            setResendCooldown(60);
        } catch (err) {
            const errorMsg = err.response?.data?.message || "Could not resend code.";
            toast.error(errorMsg);
            if(errorMsg.toLowerCase().includes("expired")) {
                setStep(1);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleRegister = () => {
        document.cookie = "auth_intent=register; path=/; max-age=300";
        window.location.href = `${getBackendOrigin()}/oauth2/authorization/google`;
    };

    return (
        <div className="d-flex justify-content-center align-items-center min-vh-100 app-theme-page" style={{ overflowX: 'hidden' }}>

            {/* Background Blobs */}
            <div className="background-blob modern-blob blob-indigo blob-lg blob-top-left" style={{ opacity: 0.3 }}></div>
            <div className="background-blob modern-blob blob-cyan blob-md blob-bottom-right" style={{ opacity: 0.2 }}></div>

            <Container className="app-page-content animate-entrance" style={{ maxWidth: '440px' }}>
                <Card className="border-0 glass-3d-deep shadow-2xl" style={{ borderRadius: '28px', background: 'rgba(255, 255, 255, 0.7)' }}>
                    <Card.Body className="p-3 p-md-4">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <Button variant="link" onClick={() => step === 2 ? setStep(1) : navigate('/')} className="nav-link-modern p-0 small d-flex align-items-center">
                                <FaArrowLeft className="me-1" /> {step === 2 ? "Back" : "Home"}
                            </Button>
                            <Badge bg="secondary" className="rounded-pill px-3 smallest opacity-75">IDENTITY v2</Badge>
                        </div>

                        {/* Title Section */}
                        <div className="text-center mb-3">
                            <div className="p-2 rounded-circle glass-3d d-inline-block mb-2 text-primary animate-float-slow" style={{ background: 'white' }}>
                                {step === 1 ? <FaUserPlus size={24} /> : <FaCheckCircle size={24} />}
                            </div>
                            <h3 className="fw-bold text-dark mb-1">{step === 1 ? "Neural Identity" : "Verify Node"}</h3>
                            {step === 2 ? (
                                <p className="text-muted smallest">Token sent to <span className="text-primary fw-bold">{email}</span></p>
                            ) : (
                                <p className="text-muted smallest">Establish secure legal presence</p>
                            )}
                        </div>

                        {/* STEP 1: REGISTRATION FORM */}
                        {step === 1 && (
                            <Form onSubmit={handleRegister}>
                                <Form.Group className="mb-2">
                                    <Form.Label className="fw-bold text-secondary smallest text-uppercase ls-1 mb-1 ms-1">Alias</Form.Label>
                                    <InputGroup className="glass-3d-inset rounded-3 overflow-hidden border-0 bg-white">
                                        <InputGroup.Text className="bg-transparent border-0 ps-3 py-2"><FaUser size={14} className="text-primary" /></InputGroup.Text>
                                        <Form.Control
                                            type="text"
                                            placeholder="Username"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            required
                                            className="bg-transparent border-0 py-2 shadow-none text-dark small"
                                        />
                                    </InputGroup>
                                </Form.Group>

                                <Form.Group className="mb-2">
                                    <Form.Label className="fw-bold text-secondary smallest text-uppercase ls-1 mb-1 ms-1">Comms Port</Form.Label>
                                    <InputGroup className="glass-3d-inset rounded-3 overflow-hidden border-0 bg-white">
                                        <InputGroup.Text className="bg-transparent border-0 ps-3 py-2"><FaEnvelope size={14} className="text-primary" /></InputGroup.Text>
                                        <Form.Control
                                            type="email"
                                            placeholder="name@nexus.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            className="bg-transparent border-0 py-2 shadow-none text-dark small"
                                        />
                                    </InputGroup>
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-bold text-secondary smallest text-uppercase ls-1 mb-1 ms-1">Master Key</Form.Label>
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
                                    {loading ? <Spinner animation="border" size="sm" className="me-2" /> : "Request Access"}
                                </Button>

                                <div className="d-flex align-items-center mb-3">
                                    <hr className="flex-grow-1 opacity-10" />
                                    <span className="px-2 text-muted smallest fw-bold ls-1">OR</span>
                                    <hr className="flex-grow-1 opacity-10" />
                                </div>

                                <Button variant="white" className="w-100 fw-bold glass-3d d-flex align-items-center justify-content-center py-2 rounded-3 text-dark border-0 shadow-sm hover-lift small" onClick={handleGoogleRegister}>
                                    <FaGoogle className="me-2 text-danger" /> Google
                                </Button>
                            </Form>
                        )}

                        {/* STEP 2: OTP VERIFICATION FORM */}
                        {step === 2 && (
                            <Form onSubmit={handleVerify}>
                                <div className="glass-3d-inset p-2 text-center mb-3 border-0 text-success fw-bold smallest rounded-3" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                                    <FaCheckCircle className="me-1" /> Transmission successful.
                                </div>
                                <Form.Group className="mb-3">
                                    <Form.Control
                                        type="text"
                                        placeholder="00000000"
                                        className="form-control glass-3d-inset text-center fs-3 fw-bold border-0 rounded-3 py-2 bg-white"
                                        maxLength="8"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        required
                                        style={{ letterSpacing: '8px', color: 'var(--primary-color)' }}
                                    />
                                </Form.Group>

                                <Button type="submit" className="w-100 nav-btn-modern py-2 mb-3 shadow-lg" style={{ background: 'var(--success-color)' }} disabled={loading}>
                                    {loading ? <Spinner animation="border" size="sm" className="me-2" /> : "Verify & Initialize"}
                                </Button>

                                <div className="text-center">
                                    <span className="text-muted smallest">No signal? </span>
                                    <Button
                                        variant="link"
                                        onClick={handleResendOtp}
                                        disabled={resendCooldown > 0 || loading}
                                        className="nav-link-modern smallest"
                                    >
                                        {resendCooldown > 0 ? `${resendCooldown}s` : "Resend"}
                                    </Button>
                                </div>
                            </Form>
                        )}

                        {/* Login Link */}
                        {step === 1 && (
                            <div className="text-center mt-3 pt-3 border-top border-secondary border-opacity-10">
                                <span className="text-muted smallest">Identity exists? </span>
                                <Button variant="link" onClick={() => navigate('/login')} className="auth-text-action smallest fw-bold ms-1">
                                    Sign In
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
