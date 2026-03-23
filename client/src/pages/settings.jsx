import { useState, useEffect } from 'react';
import api from '../api/axiosConfig';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Container, Card, Button, Modal, Form, Alert, InputGroup } from 'react-bootstrap';
import {
    FaUser,
    FaEnvelope,
    FaShieldAlt,
    FaArrowLeft,
    FaTrash,
    FaExclamationTriangle,
    FaEye,
    FaEyeSlash,
    FaCog
} from 'react-icons/fa';
import { cacheUser, clearCachedUser, getCachedUser } from '../utils/authUserCache';

// --- THEME PANEL STYLE ---
const glassStyle = {
    background: 'var(--glass-surface)',
    border: '1px solid var(--glass-border)',
    boxShadow: 'var(--glass-shadow)'
};

const Settings = () => {
    // --- STATE MANAGEMENT ---
    const [user, setUser] = useState(() => getCachedUser() || { username: '', email: '', role: '' });
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // New state for toggling password visibility
    const [showPassword, setShowPassword] = useState(false);

    const navigate = useNavigate();

    // --- 1. FETCH PROFILE ON LOAD ---
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await api.get('/auth/profile');
                setUser(response.data);
                cacheUser(response.data);
            } catch (error) {
                // Silently fail and redirect to login if session is invalid
                navigate('/login');
            }
        };
        fetchProfile();
    }, [navigate]);

    // --- 2. DELETE ACCOUNT HANDLER ---
   const handleDeleteAccount = async () => {
           if (!password) {
               toast.error("Please enter your password.");
               return;
           }

           setLoading(true);
           try {
               await api.post('/auth/delete-account', {
                   password: password
               });

               localStorage.removeItem('jwtToken');
               localStorage.removeItem('lastActive');
               clearCachedUser();
               toast.success("Account deleted successfully. Goodbye!");
               navigate('/');
           } catch (error) {
               // Your interceptor already extracted the message into error.message
               // Do NOT check error.response here.
               const msg = error.message || "Failed to delete account.";
               toast.error(msg);
           } finally {
               setLoading(false);
               setShowDeleteModal(false);
           }
       };

    return (
        <div className="min-vh-100 fade-in py-5 app-theme-page" style={{ overflow: 'hidden' }}>

            {/* Background Blobs */}
            <div className="background-blob modern-blob blob-indigo blob-lg blob-top-left"></div>
            <div className="background-blob modern-blob blob-cyan blob-md blob-bottom-right"></div>

            <Container className="app-page-content" style={{ position: 'relative', maxWidth: '800px' }}>

                {/* HEADER */}
                <div className="mb-4">
                    <Button variant="link" onClick={() => navigate('/dashboard')} className="p-0 text-decoration-none mb-3 fw-bold text-muted small">
                        <FaArrowLeft className="me-2" /> Back to Dashboard
                    </Button>
                    <div className="d-flex align-items-center">
                        <div className="bg-white p-3 rounded-circle shadow-sm me-3 text-primary">
                            <FaCog size={28} />
                        </div>
                        <div>
                            <h2 className="fw-bold text-dark mb-0">Account Settings</h2>
                            <p className="text-muted mb-0">Manage your profile and security preferences</p>
                        </div>
                    </div>
                </div>

                {/* PROFILE CARD */}
                <Card className="border-0 mb-5" style={glassStyle}>
                    <Card.Body className="p-4">
                        <h5 className="fw-bold mb-4 text-primary pb-2 border-bottom border-secondary border-opacity-10">
                            Profile Information
                        </h5>

                        <Form.Group className="mb-4">
                            <Form.Label className="fw-semibold text-muted small text-uppercase ls-1"><FaUser className="me-2 text-primary opacity-75"/> Username</Form.Label>
                            <Form.Control
                                type="text"
                                value={user.username}
                                disabled
                                className="bg-white border-0 shadow-sm py-2 px-3 fw-bold text-dark"
                            />
                        </Form.Group>

                        <Form.Group className="mb-4">
                            <Form.Label className="fw-semibold text-muted small text-uppercase ls-1"><FaEnvelope className="me-2 text-primary opacity-75"/> Email Address</Form.Label>
                            <Form.Control
                                type="text"
                                value={user.email}
                                disabled
                                className="bg-white border-0 shadow-sm py-2 px-3 fw-bold text-dark"
                            />
                        </Form.Group>

                        <Form.Group className="mb-2">
                            <Form.Label className="fw-semibold text-muted small text-uppercase ls-1"><FaShieldAlt className="me-2 text-primary opacity-75"/> Account Role</Form.Label>
                            <Form.Control
                                type="text"
                                value={user.role}
                                disabled
                                className="bg-white border-0 shadow-sm py-2 px-3 fw-bold text-dark"
                            />
                        </Form.Group>
                    </Card.Body>
                </Card>

                {/* DANGER ZONE CARD */}
                <Card className="border-danger shadow-sm" style={{ background: 'var(--danger-surface)', border: '1px solid var(--danger-border)', boxShadow: 'var(--danger-shadow)' }}>
                    <Card.Header className="bg-danger text-white fw-bold border-0 d-flex align-items-center">
                        <FaExclamationTriangle className="me-2" /> Danger Zone
                    </Card.Header>
                    <Card.Body className="p-4">
                        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                            <div>
                                <h5 className="fw-bold text-danger">Delete Account</h5>
                                <p className="text-danger-emphasis mb-0 small" style={{ maxWidth: '450px' }}>
                                    Once you delete your account, there is no going back. All your data will be permanently removed. Please be certain.
                                </p>
                            </div>
                            <Button variant="outline-danger" className="fw-bold px-4 rounded-pill" onClick={() => setShowDeleteModal(true)}>
                                Delete Account
                            </Button>
                        </div>
                    </Card.Body>
                </Card>

                {/* DELETE CONFIRMATION MODAL */}
                <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered backdrop="static">
                    <Modal.Header closeButton className="border-0 pb-0">
                        <Modal.Title className="text-danger fw-bold">
                            <FaTrash className="me-2" /> Confirm Account Deletion
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body className="pt-2">
                        <Alert variant="warning" className="small border-0 shadow-sm mb-4">
                            <FaExclamationTriangle className="me-2" />
                            All your uploaded contracts, chats, and personal data will be permanently removed.
                        </Alert>

                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold text-muted small text-uppercase">Enter Password to Confirm</Form.Label>
                            <InputGroup>
                                <Form.Control
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="border-end-0 shadow-none"
                                />
                                <Button
                                    variant="outline-secondary"
                                    className="border-start-0 bg-white"
                                    onClick={() => setShowPassword(!showPassword)}
                                    title={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                                </Button>
                            </InputGroup>
                        </Form.Group>

                        {/* FORGOT PASSWORD LINK */}
                        <div className="text-end">
                            <Button
                                variant="link"
                                className="p-0 text-decoration-none small text-primary fw-bold"
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    navigate('/forgot-password', {
                                        state: {
                                            returnPath: '/settings',
                                            username: user.username,
                                            email: user.email
                                        }
                                    });
                                }}
                            >
                                Forgot Password?
                            </Button>
                        </div>

                    </Modal.Body>
                    <Modal.Footer className="border-0 pt-0">
                        <Button variant="light" onClick={() => setShowDeleteModal(false)} className="rounded-pill px-4 fw-bold">
                            Cancel
                        </Button>
                        <Button
                            variant="danger"
                            onClick={handleDeleteAccount}
                            disabled={loading || !password}
                            className="rounded-pill px-4 fw-bold shadow-sm"
                        >
                            {loading ? "Deleting..." : "Permanently Delete Account"}
                        </Button>
                    </Modal.Footer>
                </Modal>
            </Container>
        </div>
    );
};

export default Settings;
