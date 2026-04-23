import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';
import { Container, Navbar, Button, Row, Col, Card, Badge, Spinner, Accordion, ProgressBar, Dropdown } from 'react-bootstrap';
import {
    FaArrowLeft,
    FaRobot,
    FaExclamationTriangle,
    FaCheckCircle,
    FaFileAlt,
    FaListUl,
    FaDownload,
    FaFileContract,
    FaShieldAlt,
    FaUserCircle,
    FaCog,
    FaSignOutAlt,
    FaComments,
    FaClock,
    FaArrowRight,
    FaInfoCircle
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { cacheUser, clearCachedUser, getCachedUser } from '../utils/authUserCache';

const ContractDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [contract, setContract] = useState(null);
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(() => getCachedUser() || { username: '', email: '', role: 'USER' });

    const isAdmin = user.role === 'ADMIN';
    const displayUsername = user.username || 'Loading...';

    const fetchUserProfile = async () => {
        try {
            const response = await api.get('/auth/profile');
            setUser(response.data);
            cacheUser(response.data);
        } catch {
            console.log("Could not fetch navbar profile info");
        }
    };

    useEffect(() => {
        fetchUserProfile();
        let isMounted = true;

        const fetchContract = async () => {
            try {
                const response = await api.get(`/contracts/${id}`);

                if (isMounted) {
                    setContract(response.data);

                    if (response.data.status === 'PROCESSING') {
                        setTimeout(fetchContract, 2000);
                        return;
                    }

                    if (response.data.analysisJson) {
                        try {
                            setAnalysis(JSON.parse(response.data.analysisJson));
                        } catch (e) {
                            console.error("Failed to parse analysis JSON", e);
                        }
                    }
                    setLoading(false);
                }
            } catch (error) {
                console.error("Error fetching contract details:", error);
                if (isMounted) setLoading(false);
            }
        };

        fetchContract();

        return () => { isMounted = false; };
    }, [id]);

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

    const getVariant = (level) => {
        if (!level) return 'secondary';
        const l = level.toString().toLowerCase();
        if (l.includes('high')) return 'danger';
        if (l.includes('medium')) return 'warning';
        return 'success';
    };

    const handleDownloadAnalysis = async () => {
        try {
            toast.info("Generating PDF Report...");
            const response = await api.get(`/contracts/${id}/download-report`, {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Analysis_Report_${contract?.filename || 'contract'}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
            toast.success("Report downloaded successfully!");
        } catch (error) {
            console.error("Download failed", error);
            toast.error("Failed to download PDF report.");
        }
    };

    if (loading) return (
        <div className="d-flex justify-content-center align-items-center min-vh-100 app-theme-page">
            <div className="background-blob modern-blob blob-indigo blob-lg blob-top-left"></div>
            <div className="background-blob modern-blob blob-cyan blob-md blob-bottom-right"></div>
            <div className="app-page-content">
                <Spinner animation="border" variant="primary" />
            </div>
        </div>
    );

    if (!contract) return (
        <div className="d-flex justify-content-center align-items-center min-vh-100 app-theme-page">
            <div className="background-blob modern-blob blob-indigo blob-lg blob-top-left"></div>
            <div className="background-blob modern-blob blob-cyan blob-md blob-bottom-right"></div>
            <div className="app-page-content text-center text-muted">
                <div className="glass-3d p-5 rounded-5 d-inline-block">
                    <FaExclamationTriangle size={50} className="text-muted mb-4 opacity-20" />
                    <h3 className="fw-bold text-dark">Contract not found</h3>
                    <Button variant="primary" className="rounded-pill px-4 mt-3" onClick={() => navigate('/dashboard')}>Go Back</Button>
                </div>
            </div>
        </div>
    );

    if (!loading && contract && contract.status === 'PROCESSING') {
        const processingProgress = Math.max(
            0,
            Math.min(99, typeof contract.analysisProgress === 'number' ? contract.analysisProgress : 0)
        );
        return (
            <div className="min-vh-100 app-theme-page d-flex align-items-center">
                <div className="background-blob modern-blob blob-indigo blob-lg blob-top-left"></div>
                <div className="background-blob modern-blob blob-cyan blob-md blob-bottom-right"></div>
                <Container className="app-page-content d-flex flex-column align-items-center justify-content-center text-center" style={{ minHeight: '60vh' }}>
                    <div className="glass-3d p-5 rounded-5 d-flex flex-column align-items-center">
                        <div className="spinner-border text-primary" style={{ width: '4rem', height: '4rem' }} role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                        <h2 className="mt-4 fw-bold text-dark">Analysis in Progress...</h2>
                        <p className="text-muted fs-5">
                            Our AI is reading your contract. This usually takes 10-20 seconds.
                        </p>
                        <div className="w-100 mb-3" style={{ maxWidth: '360px' }}>
                            <div className="d-flex justify-content-between small text-muted mb-2 fw-bold">
                                <span>Analysis Progress</span>
                                <span>{processingProgress}%</span>
                            </div>
                            <ProgressBar animated={processingProgress < 100} now={processingProgress} className="glass-3d-inset" />
                        </div>
                        <Badge bg="primary-subtle" className="text-primary px-3 py-2 rounded-pill glass-3d border-0">
                            {`Status: Processing (${processingProgress}%)`}
                        </Badge>
                    </div>
                </Container>
            </div>
        );
    }

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
                            onClick={() => navigate('/dashboard')}
                            style={{ cursor: 'pointer' }}
                        >
                             <div className="glass-3d p-2 rounded-circle d-flex align-items-center justify-content-center text-primary">
                                {isAdmin ? <FaShieldAlt size={20} className="text-danger" /> : <FaFileContract size={20} />}
                             </div>
                             <h4 className="fw-bold text-dark mb-0 d-none d-sm-block">
                                Audit Report
                             </h4>
                        </div>

                        <div className="d-flex align-items-center gap-2">
                            <Button variant="white" className="glass-3d d-none d-md-flex align-items-center rounded-pill px-3 py-2 fw-bold text-muted border-0 me-1" onClick={() => navigate('/dashboard')}>
                                <FaArrowLeft className="me-2" /> Back
                            </Button>

                            <Button className="dashboard-nav-cta px-2 px-md-3 py-2 fw-bold rounded-pill d-flex align-items-center me-1" onClick={() => navigate(`/chat/${id}`)}>
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

                {/* --- 2. HEADER ACTIONS --- */}
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-4 gap-3 animate-3d-appear stagger-2">
                    <div className="d-flex align-items-center gap-3">
                        <div className="glass-3d p-3 rounded-4 text-primary d-flex align-items-center justify-content-center">
                            <FaFileAlt size={24} />
                        </div>
                        <div>
                            <h2 className="fw-bold text-dark mb-0 text-break">{contract.filename}</h2>
                            <p className="text-muted small mb-0 d-flex align-items-center">
                                <FaClock className="me-2" /> Uploaded: {new Date(contract.uploadDate).toLocaleString()}
                            </p>
                        </div>
                    </div>
                    <div className="d-flex flex-column flex-sm-row gap-2 w-100 w-md-auto-custom">
                        <Button variant="success" className="btn-success glass-3d border-0 rounded-pill px-4 fw-bold flex-grow-1 d-flex align-items-center justify-content-center" onClick={handleDownloadAnalysis}>
                            <FaDownload className="me-2" /> PDF Report
                        </Button>
                        <Button className="dashboard-nav-cta rounded-pill px-4 fw-bold flex-grow-1 d-flex align-items-center justify-content-center" onClick={() => navigate(`/chat/${id}`)}>
                            <FaComments className="me-2" /> AI Counsel
                        </Button>
                    </div>
                </div>

                {/* --- 3. SUMMARY CARD --- */}
                <Card className="border-0 mb-4 glass-3d animate-3d-appear stagger-2" style={{ borderRadius: '28px' }}>
                    <Card.Body className="p-4">
                        <Row className="align-items-center g-4">
                            <Col xs={12} md={8}>
                                <div className="d-flex align-items-center mb-3">
                                    <div className="glass-3d-inset p-2 rounded-3 text-primary me-3">
                                        <FaInfoCircle />
                                    </div>
                                    <h5 className="fw-bold text-primary mb-0 uppercase ls-1">Executive Summary</h5>
                                </div>
                                <p className="text-secondary mb-0 fs-5" style={{ lineHeight: '1.7', fontWeight: 500 }}>
                                    {analysis?.summary || "No summary available."}
                                </p>
                            </Col>

                            <Col xs={12} md={4} className="text-center border-md-start border-secondary border-opacity-10 pt-3 pt-md-0">
                                <h6 className="text-muted text-uppercase fw-bold mb-3 small ls-2">Risk Assessment</h6>
                                <div className="position-relative d-inline-flex align-items-center justify-content-center mb-3"
                                         style={{
                                             width: 140,
                                             height: 140,
                                             borderRadius: '50%',
                                             border: `10px solid var(--bs-${getVariant(analysis?.risk_level)})`,
                                             boxShadow: 'var(--neumorphic-3d-shadow)',
                                             background: 'var(--bg-chip)'
                                         }}>
                                    <div className={`display-4 fw-bold text-${getVariant(analysis?.risk_level)}`}>
                                        {analysis?.risk_score || 0}
                                    </div>
                                </div>
                                <div>
                                    <Badge bg={`${getVariant(analysis?.risk_level)}-subtle`} className={`text-${getVariant(analysis?.risk_level)} px-4 py-2 rounded-pill glass-3d border-0 shadow-sm text-uppercase fw-bold ls-1`}>
                                        {analysis?.risk_level || "Unknown"} Risk
                                    </Badge>
                                </div>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>

                <Row className="g-4 animate-3d-appear stagger-3">
                    {/* --- LEFT COLUMN: RISKS & RECOMMENDATIONS --- */}
                    <Col xs={12} lg={7}>
                        {/* Key Risks */}
                        <Card className="border-0 mb-4 glass-3d" style={{ borderRadius: '24px' }}>
                            <Card.Header className="bg-transparent border-0 pt-4 px-4 pb-2">
                                <h5 className="fw-bold text-danger m-0 d-flex align-items-center">
                                    <div className="glass-3d-inset p-2 rounded-3 me-3 text-danger">
                                        <FaExclamationTriangle />
                                    </div>
                                    Key Risks Identified
                                </h5>
                            </Card.Header>
                            <Card.Body className="p-4 pt-2">
                                {analysis?.key_risks?.length > 0 ? (
                                    <Accordion flush className="custom-accordion">
                                        {analysis.key_risks.map((risk, idx) => (
                                            <Accordion.Item eventKey={idx.toString()} key={idx} className="bg-transparent border-bottom border-secondary border-opacity-10 mb-2">
                                                <Accordion.Header>
                                                    <Badge bg={`${getVariant(risk.severity)}-subtle`} className={`text-${getVariant(risk.severity)} me-3 rounded-pill border-0`}>{risk.severity.toUpperCase()}</Badge>
                                                    <span className="text-dark fw-bold">{risk.clause}</span>
                                                </Accordion.Header>
                                                <Accordion.Body className="text-muted rounded mb-2 glass-3d-inset p-3 mx-2 my-2" style={{ fontSize: '0.9rem' }}>
                                                    <strong className="text-dark">Exposure Logic: </strong> {risk.risk_explanation}
                                                </Accordion.Body>
                                            </Accordion.Item>
                                        ))}
                                    </Accordion>
                                ) : (
                                    <div className="p-4 text-center">
                                        <FaCheckCircle className="text-success mb-3 opacity-20" size={40} />
                                        <p className="text-muted fw-bold">No critical risks detected.</p>
                                    </div>
                                )}
                            </Card.Body>
                        </Card>

                        <Row className="g-4">
                            {/* Missing Clauses */}
                            <Col md={6}>
                                <Card className="border-0 h-100 glass-3d" style={{ borderRadius: '24px' }}>
                                    <Card.Body className="p-4">
                                        <h5 className="fw-bold text-warning mb-4 d-flex align-items-center">
                                            <div className="glass-3d-inset p-2 rounded-3 me-3 text-warning">
                                                <FaListUl />
                                            </div>
                                            Missing Clauses
                                        </h5>
                                        <div className="d-flex flex-column gap-2">
                                            {analysis?.missing_clauses?.map((item, i) => (
                                                <div key={i} className="glass-3d-inset p-2 px-3 rounded-3 text-secondary small fw-semibold">
                                                    <FaArrowRight className="me-2 text-warning" size={10} /> {item}
                                                </div>
                                            ))}
                                            {(!analysis?.missing_clauses || analysis.missing_clauses.length === 0) && (
                                                <div className="text-muted small text-center py-3">All essential clauses present.</div>
                                            )}
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>

                            {/* Recommendations */}
                            <Col md={6}>
                                <Card className="border-0 h-100 glass-3d" style={{ borderRadius: '24px' }}>
                                    <Card.Body className="p-4">
                                        <h5 className="fw-bold text-success mb-4 d-flex align-items-center">
                                            <div className="glass-3d-inset p-2 rounded-3 me-3 text-success">
                                                <FaCheckCircle />
                                            </div>
                                            Recommendations
                                        </h5>
                                        <div className="d-flex flex-column gap-2">
                                            {analysis?.recommendations?.map((item, i) => (
                                                <div key={i} className="glass-3d-inset p-2 px-3 rounded-3 text-secondary small fw-semibold">
                                                    <FaArrowRight className="me-2 text-success" size={10} /> {item}
                                                </div>
                                            ))}
                                            {(!analysis?.recommendations || analysis.recommendations.length === 0) && (
                                                <div className="text-muted small text-center py-3">No specific actions required.</div>
                                            )}
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                        </Row>
                    </Col>

                    {/* --- RIGHT COLUMN: RAW CONTENT --- */}
                    <Col xs={12} lg={5}>
                        <Card className="border-0 h-100 glass-3d overflow-hidden" style={{ borderRadius: '24px', minHeight: '600px' }}>
                            <Card.Header className="bg-transparent border-bottom border-secondary border-opacity-10 py-3 px-4 fw-bold text-primary d-flex align-items-center">
                                <div className="glass-3d-inset p-2 rounded-3 me-3 text-primary">
                                    <FaFileAlt />
                                </div>
                                Original Text
                            </Card.Header>
                            <Card.Body className="p-0 position-relative">
                                <div className="p-4 h-100 w-100 position-absolute text-dark contract-raw-scroll"
                                     style={{
                                         overflowY: 'auto',
                                         fontSize: '0.88rem',
                                         whiteSpace: 'pre-wrap',
                                         fontFamily: 'Consolas, "Courier New", monospace',
                                         lineHeight: '1.8'
                                     }}>
                                    {contract.rawText || "No text content available."}
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Container>
        </div>
    );
};

export default ContractDetails;
