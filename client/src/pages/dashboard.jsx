import { useEffect, useState, useRef } from 'react';
import api, { deleteContract } from '../api/axiosConfig';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { PDFDocument } from 'pdf-lib';
import { Container, Navbar, Button, Row, Col, Card, Form, ProgressBar, Badge, Modal, Dropdown, Alert, InputGroup, Spinner } from 'react-bootstrap';
import {
    FaCheckCircle,
    FaExclamationTriangle,
    FaFileContract,
    FaSignOutAlt,
    FaUpload,
    FaRobot,
    FaClock,
    FaTrash,
    FaComments,
    FaUserCircle,
    FaCog,
    FaShieldAlt,
    FaUser,
    FaCreditCard,
    FaSearch,
    FaCalendarCheck,
    FaInfinity,
    FaArrowRight,
    FaInfoCircle,
    FaEye,
    FaTimesCircle
} from 'react-icons/fa';
import { cacheUser, clearCachedUser, getCachedUser } from '../utils/authUserCache';

const MAX_UPLOAD_SIZE_BYTES = 20 * 1024 * 1024;
const MAX_UPLOAD_PAGES = 15;

const Dashboard = () => {
    // --- STATE MANAGEMENT ---
    const [contracts, setContracts] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // User Profile State
    const [user, setUser] = useState(() => getCachedUser() || { username: '', email: '', role: 'USER' });

    // Rate Limiting State
    const [remainingQuota, setRemainingQuota] = useState(null);
    const [timerString, setTimerString] = useState("");

    // File Upload State
    const [selectedFile, setSelectedFile] = useState(null);
    const [fileStats, setFileStats] = useState(null);
    const [analysisProgress, setAnalysisProgress] = useState(0);
    const fileInputRef = useRef(null);

    // Modal State
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [contractToDelete, setContractToDelete] = useState(null);

    // --- Analysis Options State ---
    const [jurisdiction, setJurisdiction] = useState('General');
    const [contractType, setContractType] = useState('General Contract');

    const navigate = useNavigate();
    const isAdmin = user.role === 'ADMIN';
    const displayUsername = user.username || 'Loading...';

    // --- INITIAL DATA FETCHING ---
    useEffect(() => {
        fetchUserProfile();
        fetchContracts();
        fetchQuota();
    }, []);

    // --- COUNTDOWN TIMER LOGIC ---
    useEffect(() => {
        let interval;
        if (remainingQuota?.resetTime && remainingQuota.remaining === 0) {
            interval = setInterval(() => {
                const now = Date.now();
                const diff = remainingQuota.resetTime - now;

                if (diff <= 0) {
                    setTimerString("");
                    fetchQuota();
                    clearInterval(interval);
                } else {
                    const minutes = Math.floor((diff / 1000 / 60) % 60);
                    const seconds = Math.floor((diff / 1000) % 60);
                    setTimerString(
                        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
                    );
                }
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [remainingQuota]);

    // --- API CALLS ---
    const fetchUserProfile = async () => {
        try {
            const response = await api.get('/auth/profile');
            setUser(response.data);
            cacheUser(response.data);
        } catch {
            console.log("Could not fetch navbar profile info");
        }
    };

    const fetchContracts = async () => {
        try {
            const response = await api.get('/contracts');
            setContracts(response.data);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchQuota = async () => {
        try {
            const response = await api.get('/contracts/rate-limit');
            setRemainingQuota(response.data);
        } catch {
            console.error("Failed to fetch quota");
        }
    };

    // --- HANDLERS ---
    const handleDeleteClick = (id, e) => {
        e.stopPropagation();
        setContractToDelete(id);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!contractToDelete) return;
        try {
            await deleteContract(contractToDelete);
            toast.success("Contract deleted successfully!");
            fetchContracts();
        } catch {
            toast.error("Failed to delete contract");
        } finally {
            setShowDeleteModal(false);
            setContractToDelete(null);
        }
    };

    const clearSelectedFile = () => {
        setSelectedFile(null);
        setFileStats(null);
        setAnalysisProgress(0);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) {
            clearSelectedFile();
            return;
        }

        if (file.size > MAX_UPLOAD_SIZE_BYTES) {
            toast.error("File size exceeds 20MB limit. Please upload a smaller PDF.");
            clearSelectedFile();
            return;
        }

        setSelectedFile(file);
        setFileStats(null);

        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        setFileStats({ size: sizeMB, pages: "Calculating..." });

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
            const pageCount = pdfDoc.getPageCount();

            if (pageCount > MAX_UPLOAD_PAGES) {
                toast.error("PDF exceeds 15-page limit. Please upload a PDF with up to 15 pages.");
                clearSelectedFile();
                return;
            }

            setFileStats({ size: sizeMB, pages: pageCount });
        } catch {
            toast.error("Unable to read PDF. Please upload a valid PDF file.");
            clearSelectedFile();
            return;
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) return;

        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("jurisdiction", jurisdiction);
        formData.append("contractType", contractType);

        setUploading(true);
        setAnalysisProgress(5);
        try {
            toast.info(`Uploading ${contractType}...`);

            const response = await api.post('/contracts/upload', formData, {
                headers: { 'Content-Type': undefined },
                onUploadProgress: (event) => {
                    if (!event.total) return;
                    const uploadPercent = Math.round((event.loaded / event.total) * 20);
                    setAnalysisProgress((prev) => Math.max(prev, Math.min(20, uploadPercent)));
                }
            });

            const contractId = response.data.id;
            setAnalysisProgress((prev) => Math.max(prev, 25));
            toast.info("AI Analysis running in background...");

            fetchContracts();
            fetchQuota();

            let isAnalysisComplete = false;
            while (!isAnalysisComplete) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                const statusRes = await api.get(`/contracts/${contractId}/status`);
                const status = statusRes.data.status;
                const progress = statusRes.data.progress;

                if (typeof progress === 'number') {
                    const clampedProgress = Math.max(20, Math.min(99, progress));
                    setAnalysisProgress((prev) => Math.max(prev, clampedProgress));
                }

                if (status === 'COMPLETED') {
                    isAnalysisComplete = true;
                    setAnalysisProgress(100);
                    toast.success("Analysis Complete!");
                    fetchContracts();
                    clearSelectedFile();
                } else if (status === 'FAILED') {
                    isAnalysisComplete = true;
                    toast.error("Analysis Failed. Please try again.");
                    fetchContracts();
                }
            }

        } catch (error) {
            if (error?.response?.status === 404) {
                toast.error("Analysis failed. Contract removed automatically.");
                fetchContracts();
            } else {
                const msg = error.response?.data?.message || "Upload failed!";
                toast.error(msg);
            }
        } finally {
            setUploading(false);
            setAnalysisProgress(0);
        }
    };

    const handleLogout = async () => {
        try {
            await api.post('/auth/logout');
        } catch (errorMessage) {
            console.warn("Logout API failed:", errorMessage);
        }
        localStorage.removeItem('lastActive');
        clearCachedUser();
        navigate('/');
        toast.success("Logout Successful!")
    };

    const getRiskBadge = (riskLevel = 'low') => {
        const riskLevels = {
            low: { text: 'Low Risk', variant: 'success', icon: <FaCheckCircle /> },
            medium: { text: 'Medium Risk', variant: 'warning', icon: <FaExclamationTriangle /> },
            high: { text: 'High Risk', variant: 'danger', icon: <FaExclamationTriangle /> }
        };
        return riskLevels[riskLevel] || riskLevels.low;
    };

    const normalizeStatus = (status = '') => status.toString().trim().toUpperCase();

    const getSafeFilename = (contract) => {
        const filename = contract?.filename;
        return typeof filename === 'string' && filename.trim() ? filename : 'Untitled contract';
    };

    const getFormattedUploadDate = (uploadDate) => {
        if (!uploadDate) return 'Unknown upload date';
        const date = new Date(uploadDate);
        return Number.isNaN(date.getTime()) ? 'Unknown upload date' : date.toLocaleDateString();
    };

    const filteredContracts = contracts
        .filter((contract) => contract && typeof contract === 'object')
        .filter((contract) => normalizeStatus(contract?.status) !== 'FAILED')
        .filter((contract) =>
            getSafeFilename(contract).toLowerCase().includes(searchTerm.toLowerCase())
        );

    return (
        <div className="min-vh-100 fade-in pb-5 app-theme-page" style={{ overflowX: 'hidden' }}>

            {/* Background Blobs */}
            <div className="background-blob modern-blob blob-indigo blob-lg blob-top-left"></div>
            <div className="background-blob modern-blob blob-cyan blob-md blob-bottom-right"></div>

            <Container className="app-page-content pt-3 pt-md-4">

                {/* --- 1. FLOATING NAVBAR --- */}
                <Navbar className="px-4 py-2 mb-5 nav-glass rounded-pill animate-3d-appear stagger-1" style={{ position: 'relative', zIndex: 10 }}>
                    <Container fluid className="d-flex justify-content-between align-items-center p-0">
                        <div
                            className="d-flex align-items-center gap-2"
                            onClick={() => navigate('/')}
                            style={{ cursor: 'pointer' }}
                        >
                             <div className="glass-3d p-2 rounded-circle d-flex align-items-center justify-content-center text-primary">
                                {isAdmin ? <FaShieldAlt size={20} className="text-danger" /> : <FaFileContract size={20} />}
                             </div>
                             <h4 className="fw-bold text-dark mb-0 d-none d-sm-block">
                                {isAdmin ? "Admin Console" : "Dashboard"}
                             </h4>
                        </div>

                        <div className="d-flex align-items-center gap-2">
                            <Button className="dashboard-nav-cta px-2 px-md-3 py-2 fw-bold rounded-pill d-flex align-items-center" onClick={() => navigate('/chat/general')}>
                                <FaComments className="me-md-2" /> 
                                <span className="d-none d-md-inline">AI Counsel</span>
                            </Button>

                            <Dropdown align="end">
                                <Dropdown.Toggle variant="white" className="glass-3d d-flex align-items-center rounded-pill px-3 py-2 text-dark border-0">
                                    <FaUserCircle size={20} className="me-2 text-primary pulse" />
                                    <span className="d-none d-sm-inline fw-bold small">{displayUsername}</span>
                                </Dropdown.Toggle>
                                <Dropdown.Menu className="glass-3d border-0 p-0 mt-3 rounded-4 overflow-hidden" style={{ minWidth: '220px' }}>
                                    <div className="px-4 py-3 border-bottom border-secondary border-opacity-10">
                                        <div className="fw-bold text-dark">{displayUsername}</div>
                                        <div className="small text-muted text-truncate">{user.email}</div>
                                        {isAdmin && <Badge bg="danger" className="mt-2 rounded-pill">SYSTEM ADMIN</Badge>}
                                    </div>
                                    <div className="p-2">
                                        <Dropdown.Item onClick={() => navigate('/settings')} className="rounded-3 py-2">
                                            <FaCog className="me-2 text-muted" /> Settings
                                        </Dropdown.Item>
                                        <Dropdown.Divider className="opacity-10" />
                                        <Dropdown.Item onClick={handleLogout} className="rounded-3 py-2 text-danger fw-bold">
                                            <FaSignOutAlt className="me-2" /> Logout
                                        </Dropdown.Item>
                                    </div>
                                </Dropdown.Menu>
                            </Dropdown>
                        </div>
                    </Container>
                </Navbar>

                {/* --- 2. QUOTA WARNING --- */}
                {!isAdmin && remainingQuota?.remaining === 0 && (
                    <Alert className="mb-4 glass-3d border-0 border-start border-warning border-5 rounded-4 animate-3d-appear stagger-1" style={{ background: 'rgba(255, 193, 7, 0.05)' }}>
                        <div className="d-flex align-items-center fw-bold text-dark p-2">
                            <FaClock className="me-3 text-warning pulse" size={24} />
                            <div>
                                <div className="small text-muted uppercase ls-1">Quota Exceeded</div>
                                <span>Refill incoming in: <span className="text-danger fs-5 ms-1 font-monospace">{timerString || "..." }</span></span>
                            </div>
                        </div>
                    </Alert>
                )}

                {/* --- 3. STATS & UPLOAD ROW --- */}
                <Row className="g-4 mb-5 animate-3d-appear stagger-2">
                    {!isAdmin && (
                        <Col md={12} lg={5}>
                            <Card className="border-0 h-100 glass-3d overflow-hidden" style={{ borderRadius: '28px' }}>
                                <div className="position-absolute top-0 end-0 p-4 opacity-10">
                                    <FaCreditCard size={120} style={{ transform: 'rotate(-15deg)' }} />
                                </div>
                                <Card.Body className="p-4 d-flex flex-column justify-content-center" style={{ zIndex: 1 }}>
                                    <h6 className="text-muted text-uppercase small fw-bold ls-2 mb-2">Available Credits</h6>
                                    <div className="d-flex align-items-baseline gap-3 mb-3">
                                        <h2 className="display-3 fw-bold text-primary mb-0">
                                            {remainingQuota?.isUnlimited ? <FaInfinity /> : remainingQuota?.remaining}
                                        </h2>
                                        <Badge bg="primary-subtle" className="text-primary rounded-pill px-3 glass-3d border-0">DAILY PASS</Badge>
                                    </div>
                                    <div className="glass-3d-inset p-3 rounded-4 bg-white bg-opacity-20 mt-auto">
                                        <p className="small mb-0 text-muted">
                                            <FaInfoCircle className="me-2 text-primary" />
                                            Limits reset hourly after depletion. Admin overrides applied.
                                        </p>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                    )}

                    <Col md={12} lg={!isAdmin ? 7 : 12}>
                        <Card className="border-0 h-100 glass-3d" style={{ borderRadius: '28px' }}>
                            <Card.Body className="p-4">
                                <div className="d-flex justify-content-between align-items-center mb-4">
                                    <h5 className="fw-bold mb-0 text-dark d-flex align-items-center">
                                        <div className="glass-3d p-2 rounded-3 me-3 text-primary" style={{ background: 'var(--gradient-accent)', color: 'white !important' }}>
                                            <FaShieldAlt style={{ color: 'white' }} />
                                        </div>
                                        Vault Deposit
                                    </h5>
                                    {selectedFile && <Badge bg="success" className="rounded-pill px-3 pulse">Ready to Scan</Badge>}
                                </div>
                                
                                <div className="d-flex flex-column gap-3">
                                    <div className="d-flex flex-column flex-md-row gap-3">
                                        <div className="flex-fill">
                                            <Form.Label className="small fw-bold text-muted ms-2 mb-1 uppercase ls-1">Jurisdiction</Form.Label>
                                            <Form.Select
                                                value={jurisdiction}
                                                onChange={(e) => setJurisdiction(e.target.value)}
                                                className="glass-3d-inset border-0 py-2 fw-bold text-dark rounded-4"
                                                disabled={uploading}
                                            >
                                                <option value="General">Global Standards</option>
                                                <option value="India">🇮🇳 India</option>
                                                <option value="United States">🇺🇸 United States</option>
                                                <option value="United Kingdom">🇬🇧 United Kingdom</option>
                                                <option value="European Union">🇪🇺 European Union</option>
                                            </Form.Select>
                                        </div>

                                        <div className="flex-fill">
                                            <Form.Label className="small fw-bold text-muted ms-2 mb-1 uppercase ls-1">Document Type</Form.Label>
                                            <Form.Select
                                                value={contractType}
                                                onChange={(e) => setContractType(e.target.value)}
                                                className="glass-3d-inset border-0 py-2 fw-bold text-dark rounded-4"
                                                disabled={uploading}
                                            >
                                                <option value="General Contract">General Contract</option>
                                                <option value="Employment Agreement">Employment Agreement</option>
                                                <option value="Non-Disclosure Agreement (NDA)">NDA</option>
                                                <option value="Software License (SaaS)">SaaS Terms</option>
                                                <option value="Lease Agreement">Lease Agreement</option>
                                                <option value="Freelance Contract">Service Contract</option>
                                            </Form.Select>
                                        </div>
                                    </div>

                                    <div className="d-flex flex-column flex-md-row gap-3 mt-2">
                                        <div className="position-relative flex-grow-1">
                                            <Form.Control
                                                type="file"
                                                ref={fileInputRef}
                                                onChange={handleFileSelect}
                                                accept="application/pdf"
                                                disabled={uploading || (!isAdmin && remainingQuota?.remaining === 0)}
                                                className="glass-3d-inset border-0 py-3 pe-5 rounded-4"
                                            />
                                            {selectedFile && !uploading && (
                                                <Button
                                                    variant="link"
                                                    onClick={clearSelectedFile}
                                                    className="position-absolute top-50 end-0 translate-middle-y me-3 p-0 text-danger"
                                                    style={{ zIndex: 5 }}
                                                >
                                                    <FaTimesCircle size={20} />
                                                </Button>
                                            )}
                                        </div>

                                        <Button
                                            variant="primary"
                                            onClick={handleUpload}
                                            disabled={uploading || !selectedFile}
                                            className="btn-primary glass-3d rounded-pill px-5 fw-bold"
                                        >
                                            {uploading ? <><Spinner animation="border" size="sm" className="me-2" /> {analysisProgress}%</> : "Run Audit"}
                                        </Button>
                                    </div>

                                    <div className="d-flex flex-wrap gap-3 mt-2">
                                        <Badge bg="secondary-subtle" className="text-muted fw-normal glass-3d border-0 px-3">MAX 20MB</Badge>
                                        <Badge bg="secondary-subtle" className="text-muted fw-normal glass-3d border-0 px-3">MAX 15 PAGES</Badge>
                                        {isAdmin && fileStats && (
                                            <Badge bg="warning-subtle" className="text-warning fw-bold glass-3d border-0 px-3">
                                                ADMIN: {fileStats.size}MB | {fileStats.pages}P
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                {uploading && (
                                    <div className="mt-4 px-2">
                                        <div className="d-flex justify-content-between align-items-center small text-muted mb-2 fw-bold">
                                            <span className="d-flex align-items-center gap-2"><FaRobot /> AI Decomposition...</span>
                                            <span>{analysisProgress}%</span>
                                        </div>
                                        <ProgressBar animated now={analysisProgress} className="glass-3d-inset" style={{ height: '10px' }} />
                                    </div>
                                )}
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>

                {/* --- 4. SEARCH & FILTER --- */}
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-4 gap-3 animate-3d-appear stagger-3">
                    <h4 className="fw-bold text-dark mb-0 d-flex align-items-center">
                        {isAdmin ? "System Archives" : "Your Vault"}
                        <Badge bg="primary-subtle" className="text-primary ms-3 fs-6 rounded-pill border-0 glass-3d px-3">{filteredContracts.length}</Badge>
                    </h4>

                    <InputGroup
                        className="glass-3d-inset rounded-pill overflow-hidden border-0 mobile-full-width"
                        style={{ width: '320px' }}
                    >
                        <InputGroup.Text className="bg-transparent border-0 ps-3 text-muted"><FaSearch /></InputGroup.Text>
                        <Form.Control
                            placeholder="Search documents..."
                            className="bg-transparent border-0 shadow-none py-2"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </InputGroup>
                </div>

                {/* --- 5. CONTRACTS GRID --- */}
                <Row xs={1} md={2} lg={3} xl={4} className="g-4 animate-3d-appear stagger-4">
                    {filteredContracts.map((contract) => {
                        let riskLevel = 'low';
                        try {
                            if (contract.analysisJson) {
                                const analysis = JSON.parse(contract.analysisJson);
                                if (analysis.risk_level) riskLevel = analysis.risk_level.toLowerCase();
                            }
                        } catch (err) {
                            console.error("Parse error:", err);
                        }

                        const displayFilename = getSafeFilename(contract);
                        const normalizedStatus = normalizeStatus(contract?.status);
                        const isProcessing = normalizedStatus === 'PROCESSING';
                        const processingProgress = Math.max(
                            0,
                            Math.min(99, typeof contract.analysisProgress === 'number' ? contract.analysisProgress : 0)
                        );
                        const formattedUploadDate = getFormattedUploadDate(contract?.uploadDate);
                        const riskBadge = getRiskBadge(riskLevel);

                        return (
                            <Col key={contract.id}>
                                <Card className="h-100 border-0 glass-3d" style={{ borderRadius: '24px' }}>
                                    <Card.Body className="d-flex flex-column p-4">
                                        <div className="d-flex justify-content-between align-items-start mb-4">
                                            <div className="glass-3d p-2 rounded-circle text-primary d-flex align-items-center justify-content-center" style={{ width: '42px', height: '42px' }}>
                                                <FaFileContract size={20} />
                                            </div>

                                            {isProcessing ? (
                                                <Badge bg="secondary-subtle" className="text-secondary py-2 px-3 rounded-pill fw-bold d-flex align-items-center glass-3d border-0 shadow-sm">
                                                    <div className="spinner-border spinner-border-sm me-2" style={{ width: '12px', height: '12px' }}></div>
                                                    <span style={{ fontSize: '0.7rem' }}>{processingProgress}% SCAN</span>
                                                </Badge>
                                            ) : (
                                                <Badge bg={`${riskBadge.variant}-subtle`} className={`text-${riskBadge.variant} py-2 px-3 rounded-pill fw-bold d-flex align-items-center glass-3d border-0 shadow-sm`}>
                                                    <span style={{ fontSize: '0.7rem' }}>{riskBadge.text.toUpperCase()}</span>
                                                </Badge>
                                            )}
                                        </div>

                                        <Card.Title className="text-truncate fw-bold text-dark mb-1 h5" title={displayFilename}>
                                            {displayFilename}
                                        </Card.Title>

                                        {isAdmin && (
                                            <div className="mb-2">
                                                <Badge bg="warning-subtle" className="text-warning-emphasis fw-bold rounded-pill border-0 px-2 py-1">
                                                    <FaUser className="me-1" size={10} /> {contract.ownerUsername}
                                                </Badge>
                                            </div>
                                        )}

                                        <Card.Text className="text-muted small mb-4 d-flex align-items-center">
                                            <FaClock className="me-2 opacity-50" />
                                            {formattedUploadDate}
                                        </Card.Text>

                                        <div className="mt-auto">
                                            <Button
                                                variant="outline-dark"
                                                size="sm"
                                                className="w-100 rounded-pill fw-bold mb-2 glass-3d border-0 py-2 btn-black-hover"
                                                disabled={isProcessing}
                                                onClick={() => navigate(`/contracts/${contract.id}`)}
                                            >
                                                Audit Report <FaArrowRight className="ms-2" size={12} />
                                            </Button>
                                            <div className="d-flex gap-2">
                                                <Button size="sm" className="dashboard-nav-cta flex-grow-1 rounded-pill fw-bold py-2" onClick={() => navigate(`/chat/${contract.id}`)}>
                                                    <FaComments className="me-2" /> Counsel
                                                </Button>
                                                <Button variant="white" size="sm" className="glass-3d border-0 rounded-circle text-danger p-2 d-flex align-items-center justify-content-center" onClick={(e) => handleDeleteClick(contract.id, e)} style={{ width: '38px', height: '38px' }}>
                                                    <FaTrash />
                                                </Button>
                                            </div>
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                        );
                    })}
                    {filteredContracts.length === 0 && !uploading && (
                        <Col xs={12} className="text-center py-5">
                            <div className="glass-3d p-5 rounded-5 d-inline-block">
                                <FaSearch size={50} className="text-muted mb-4 opacity-20" />
                                <h5 className="text-muted fw-bold">Vault is Empty</h5>
                                <p className="text-muted small mb-0">No documents found matching your search</p>
                            </div>
                        </Col>
                    )}
                </Row>

            </Container>

            {/* DELETE MODAL */}
            <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered backdrop="static">
                <Modal.Header closeButton className="border-0 bg-transparent">
                    <Modal.Title className="text-danger fw-bold h4">
                        <FaTrash className="me-2" /> Final Disposal
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="bg-transparent">
                    <p className="mb-4 text-muted fw-semibold">Are you certain you wish to permanently purge this document from the AI vault? This action is irreversible.</p>
                    {isAdmin && <Alert variant="danger" className="glass-3d border-0 text-danger fw-bold small rounded-4 py-3">ADMIN PROTOCOL: You are purging a managed entity file.</Alert>}
                </Modal.Body>
                <Modal.Footer className="border-0 bg-transparent pb-4">
                    <Button variant="link" onClick={() => setShowDeleteModal(false)} className="text-decoration-none text-muted fw-bold px-4">
                        Cancel
                    </Button>
                    <Button variant="danger" onClick={confirmDelete} className="btn-danger glass-3d border-0 rounded-pill px-4 fw-bold">
                        Confirm Purge
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default Dashboard;
