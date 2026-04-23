import { useState, useEffect } from 'react';
import api from '../api/axiosConfig';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Container, Card, Button, Modal, Form, Alert, InputGroup, Row, Col } from 'react-bootstrap';
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
               const msg = error.message || "Failed to delete account.";
               toast.error(msg);
           } finally {
               setLoading(false);
               setShowDeleteModal(false);
           }
       };

    return (
        <div className="min-vh-100 fade-in py-5 app-theme-page animate-3d-appear">

            {/* Background Blobs */}
            <div className="background-blob modern-blob blob-indigo blob-lg blob-top-left"></div>
            <div className="background-blob modern-blob blob-cyan blob-md blob-bottom-right"></div>

            <Container className="app-page-content" style={{ position: 'relative', maxWidth: '800px' }}>

                {/* HEADER */}
                <div className="mb-5 animate-3d-appear stagger-1">
                    <Button variant="link" onClick={() => navigate('/dashboard')} className="p-0 text-decoration-none mb-4 fw-bold text-muted small glass-3d px-3 py-1 rounded-pill">
                        <FaArrowLeft className="me-2" /> Back to Vault
                    </Button>
                    <div className="d-flex align-items-center">
                        <div className="p-3 rounded-circle glass-3d me-4 text-primary pulse">
                            <FaCog size={32} />
                        </div>
                        <div>
                            <h2 className="fw-bold text-dark mb-0">Control Center</h2>
                            <p className="text-muted mb-0">Manage your secure identity and protocols</p>
                        </div>
                    </div>
                </div>

                {/* PROFILE CARD */}
                <Card className="border-0 mb-5 glass-3d animate-3d-appear stagger-2" style={{ borderRadius: '28px' }}>
                    <Card.Body className="p-4 p-md-5">
                        <h5 className="fw-bold mb-4 text-primary d-flex align-items-center">
                            <div className="bg-primary bg-opacity-10 rounded-4 me-3 d-flex align-items-center justify-content-center" style={{ width: '42px', height: '42px' }}>
                                <FaUser size={20} />
                            </div>
                            Core Profile
                        </h5>

                        <Row className="g-4">
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="fw-bold text-secondary small text-uppercase ls-1 ms-2 mb-2">Username</Form.Label>
                                    <div className="glass-3d-inset p-3 rounded-4 bg-soft opacity-75">
                                        <div className="d-flex align-items-center text-dark fw-bold">
                                            <FaUser className="me-2 text-primary opacity-50" size={14}/>
                                            {user.username}
                                        </div>
                                    </div>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="fw-bold text-secondary small text-uppercase ls-1 ms-2 mb-2">Account Role</Form.Label>
                                    <div className="glass-3d-inset p-3 rounded-4 bg-soft opacity-75">
                                        <div className="d-flex align-items-center text-dark fw-bold">
                                            <FaShieldAlt className="me-2 text-primary opacity-50" size={14}/>
                                            {user.role}
                                        </div>
                                    </div>
                                </Form.Group>
                            </Col>
                            <Col xs={12}>
                                <Form.Group>
                                    <Form.Label className="fw-bold text-secondary small text-uppercase ls-1 ms-2 mb-2">Primary Email</Form.Label>
                                    <div className="glass-3d-inset p-3 rounded-4 bg-soft opacity-75">
                                        <div className="d-flex align-items-center text-dark fw-bold">
                                            <FaEnvelope className="me-2 text-primary opacity-50" size={14}/>
                                            {user.email}
                                        </div>
                                    </div>
                                </Form.Group>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>

                {/* DANGER ZONE CARD */}
                <Card className="border-0 animate-3d-appear stagger-3 overflow-hidden shadow-sm" style={{ borderRadius: '28px', background: 'rgba(228, 88, 122, 0.04)', border: '1px solid rgba(228, 88, 122, 0.15) !important' }}>
                    <div className="p-3 bg-danger text-white fw-bold d-flex align-items-center uppercase ls-2 small">
                        <FaExclamationTriangle className="me-2" /> Termination Protocol
                    </div>
                    <Card.Body className="p-4 p-md-5">
                        <div className="d-flex justify-content-between align-items-center flex-wrap gap-4">
                            <div>
                                <h5 className="fw-bold text-danger mb-2">Purge Account</h5>
                                <p className="text-dark mb-0 small fw-medium" style={{ maxWidth: '480px', opacity: 0.8 }}>
                                    Initiating this protocol will permanently delete your identity, uploaded contracts, and analysis history from the AI vault. This action is irreversible.
                                </p>
                            </div>
                            <Button variant="danger" className="btn-danger border-0 fw-bold px-4 py-2 rounded-pill shadow-sm" onClick={() => setShowDeleteModal(true)}>
                                Purge Identity
                            </Button>
                        </div>
                    </Card.Body>
                </Card>

                {/* DELETE CONFIRMATION MODAL */}
                <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered backdrop="static">
                    <Modal.Header closeButton className="border-0 bg-transparent p-4 pb-0">
                        <Modal.Title className="text-danger fw-bold h4">
                            <FaTrash className="me-2" /> Final Disposal
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body className="bg-transparent p-4">
                        <Alert variant="warning" className="glass-3d border-0 text-dark fw-bold small rounded-4 py-3 mb-4 d-flex align-items-center">
                            <FaExclamationTriangle className="me-3 text-warning" size={24} />
                            All vault data, neural scans, and chat logs will be permanently erased.
                        </Alert>

                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold text-muted small text-uppercase ms-2 mb-2">Vault Authorization</Form.Label>
                            <InputGroup className="glass-3d-inset rounded-4 overflow-hidden border-0">
                                <Form.Control
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Enter password to confirm"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="bg-transparent border-0 py-3 ps-3 shadow-none"
                                />
                                <Button
                                    variant="link"
                                    className="bg-transparent border-0 text-muted pe-3"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                                </Button>
                            </InputGroup>
                        </Form.Group>

                        <div className="text-end">
                            <Button
                                variant="link"
                                className="auth-text-action small text-decoration-none"
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    navigate('/forgot-password', {
                                        state: { returnPath: '/settings', username: user.username, email: user.email }
                                    });
                                }}
                            >
                                Forgot password?
                            </Button>
                        </div>

                    </Modal.Body>
                    <Modal.Footer className="border-0 bg-transparent p-4 pt-0">
                        <Button variant="link" onClick={() => setShowDeleteModal(false)} className="text-decoration-none text-muted fw-bold">
                            Cancel
                        </Button>
                        <Button
                            variant="danger"
                            onClick={handleDeleteAccount}
                            disabled={loading || !password}
                            className="btn-danger glass-3d border-0 rounded-pill px-4 py-2 fw-bold"
                        >
                            {loading ? "Purging..." : "Confirm Deletion"}
                        </Button>
                    </Modal.Footer>
                </Modal>
            </Container>
        </div>
    );
};

export default Settings;
