import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';
import { Container, Button, Card, Row, Col, Badge, Spinner, Accordion } from 'react-bootstrap';
import { FaArrowLeft, FaRobot, FaExclamationTriangle, FaCheckCircle, FaFileAlt, FaListUl, FaDownload } from 'react-icons/fa';
import { toast } from 'react-toastify';

// --- GLASSMORPHISM STYLE ---
const glassStyle = {
    background: 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.5)',
    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.1)'
};

const ContractDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [contract, setContract] = useState(null);
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
            let isMounted = true; // Prevents errors if user leaves the page

            const fetchContract = async () => {
                try {
                    const response = await api.get(`/contracts/${id}`);

                    if (isMounted) {
                        setContract(response.data);

                        // --- NEW: POLLING LOGIC ---
                        if (response.data.status === 'PROCESSING') {
                            // If status is still processing, wait 2s and try again
                            setTimeout(fetchContract, 2000);
                            return; // Stop here, don't try to parse JSON yet
                        }
                        // --------------------------

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

            return () => { isMounted = false; }; // Cleanup function
        }, [id]);

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
            link.setAttribute('download', `Analysis_Report_${contract.filename || 'contract'}.pdf`);
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
        <div className="d-flex justify-content-center align-items-center min-vh-100" style={{ background: '#f3f4f6' }}>
            <Spinner animation="border" variant="primary" />
        </div>
    );

    if (!contract) return (
        <div className="text-center mt-5 text-muted">
            <h3>Contract not found</h3>
            <Button variant="link" onClick={() => navigate('/dashboard')}>Go Back</Button>
        </div>
    );

if (!loading && contract && contract.status === 'PROCESSING') {
        return (
            <Container className="d-flex flex-column align-items-center justify-content-center text-center" style={{ minHeight: '60vh' }}>
                <div className="spinner-border text-primary" style={{ width: '4rem', height: '4rem' }} role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
                <h2 className="mt-4 fw-bold text-dark">Analysis in Progress...</h2>
                <p className="text-muted fs-5">
                    Our AI is reading your contract. This usually takes 10-20 seconds.
                    <br />
                    Please stay on this page.
                </p>
                <Badge bg="info" className="px-3 py-2 rounded-pill">
                    Status: Processing
                </Badge>
            </Container>
        );
    }

    return (
        <div className="min-vh-100 fade-in py-4 py-md-5"
             style={{
                 background: 'linear-gradient(135deg, #e0e7ff 0%, #f3f4f6 100%)',
                 position: 'relative',
                 overflowX: 'hidden'
             }}>

            <Container style={{ position: 'relative', zIndex: 1 }}>

                {/* --- RESPONSIVE HEADER --- */}
                {/* Stack buttons on mobile */}
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-4 gap-3">
                    <Button variant="white" className="shadow-sm rounded-pill px-3 fw-bold text-muted border w-100 w-md-auto" onClick={() => navigate('/dashboard')}>
                        <FaArrowLeft className="me-2" /> Back to Dashboard
                    </Button>
                    <div className="d-flex flex-column flex-sm-row gap-2 w-100 w-md-auto">
                        <Button variant="success" className="shadow-sm rounded-pill fw-bold flex-grow-1" onClick={handleDownloadAnalysis}>
                            <FaDownload className="me-2" /> Download Report
                        </Button>
                        <Button variant="primary" className="shadow-sm rounded-pill fw-bold flex-grow-1" onClick={() => navigate(`/chat/${id}`)}>
                            <FaRobot className="me-2" /> Chat with Contract
                        </Button>
                    </div>
                </div>

                {/* --- SUMMARY CARD (STACKED) --- */}
                <Card className="border-0 mb-4" style={glassStyle}>
                    <Card.Body className="p-4">
                        <Row className="align-items-center g-4">
                            {/* Text Info */}
                            <Col xs={12} md={8} className="text-center text-md-start">
                                <h2 className="fw-bold text-dark mb-1 text-break">{contract.filename}</h2>
                                <p className="text-muted small mb-3">
                                    Uploaded on: {new Date(contract.uploadDate).toLocaleString()}
                                </p>
                                <h5 className="fw-bold text-primary">Executive Summary</h5>
                                <p className="text-secondary mb-0" style={{ lineHeight: '1.6' }}>
                                    {analysis?.summary || "No summary available."}
                                </p>
                            </Col>

                            {/* Risk Score (Centered on mobile) */}
                            <Col xs={12} md={4} className="text-center border-start-md border-secondary border-opacity-10 pt-3 pt-md-0">
                                <h6 className="text-muted text-uppercase fw-bold mb-3 small ls-1">Risk Assessment</h6>
                                <div className="position-relative d-inline-flex align-items-center justify-content-center mb-3"
                                     style={{
                                         width: 130,
                                         height: 130,
                                         borderRadius: '50%',
                                         border: `8px solid var(--bs-${getVariant(analysis?.risk_level)})`,
                                         boxShadow: '0 0 20px rgba(0,0,0,0.05)',
                                         background: '#fff'
                                     }}>
                                    <div className={`display-5 fw-bold text-${getVariant(analysis?.risk_level)}`}>
                                        {analysis?.risk_score || 0}
                                    </div>
                                </div>
                                <div>
                                    <Badge bg={getVariant(analysis?.risk_level)} className="px-4 py-2 rounded-pill shadow-sm text-uppercase fw-bold">
                                        {analysis?.risk_level || "Unknown"} Risk
                                    </Badge>
                                </div>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>

                <Row className="g-4">
                    {/* --- LEFT COLUMN: RISKS & RECOMMENDATIONS --- */}
                    <Col xs={12} lg={7}>
                        {/* Key Risks */}
                        <Card className="border-0 mb-4 shadow-sm" style={glassStyle}>
                            <Card.Header className="bg-transparent border-0 pt-4 px-4 pb-2">
                                <h5 className="fw-bold text-danger m-0"><FaExclamationTriangle className="me-2" /> Key Risks Identified</h5>
                            </Card.Header>
                            <Card.Body className="p-4 pt-2">
                                {analysis?.key_risks?.length > 0 ? (
                                    <Accordion flush className="custom-accordion">
                                        {analysis.key_risks.map((risk, idx) => (
                                            <Accordion.Item eventKey={idx.toString()} key={idx} className="bg-transparent border-bottom">
                                                <Accordion.Header>
                                                    <Badge bg={getVariant(risk.severity)} className="me-2 rounded-pill">{risk.severity}</Badge>
                                                    <span className="text-dark fw-semibold">{risk.clause}</span>
                                                </Accordion.Header>
                                                <Accordion.Body className="text-muted small bg-white bg-opacity-50 rounded mb-2">
                                                    <strong>Why it's risky: </strong> {risk.risk_explanation}
                                                </Accordion.Body>
                                            </Accordion.Item>
                                        ))}
                                    </Accordion>
                                ) : <div className="p-3 text-muted">No significant risks detected.</div>}
                            </Card.Body>
                        </Card>

                        <Row className="g-4">
                            {/* Missing Clauses */}
                            <Col md={6}>
                                <Card className="border-0 mb-4 h-100 shadow-sm" style={glassStyle}>
                                    <Card.Body className="p-4">
                                        <h5 className="fw-bold text-warning mb-3"><FaListUl className="me-2" /> Missing Clauses</h5>
                                        <ul className="list-group list-group-flush small bg-transparent">
                                            {analysis?.missing_clauses?.map((item, i) => (
                                                <li key={i} className="list-group-item px-0 text-secondary border-0 py-1 bg-transparent">
                                                    • {item}
                                                </li>
                                            ))}
                                        </ul>
                                    </Card.Body>
                                </Card>
                            </Col>

                            {/* Recommendations */}
                            <Col md={6}>
                                <Card className="border-0 mb-4 h-100 shadow-sm" style={glassStyle}>
                                    <Card.Body className="p-4">
                                        <h5 className="fw-bold text-success mb-3"><FaCheckCircle className="me-2" /> Recommendations</h5>
                                        <ul className="list-group list-group-flush small bg-transparent">
                                            {analysis?.recommendations?.map((item, i) => (
                                                <li key={i} className="list-group-item px-0 text-secondary border-0 py-1 bg-transparent">
                                                    • {item}
                                                </li>
                                            ))}
                                        </ul>
                                    </Card.Body>
                                </Card>
                            </Col>
                        </Row>
                    </Col>

                    {/* --- RIGHT COLUMN: RAW CONTENT --- */}
                    <Col xs={12} lg={5}>
                        <Card className="border-0 h-100 shadow-lg" style={{ ...glassStyle, minHeight: '600px', overflow: 'hidden' }}>
                            <Card.Header className="bg-white bg-opacity-50 border-bottom py-3 px-4 fw-bold text-primary">
                                <FaFileAlt className="me-2" /> Original Contract Content
                            </Card.Header>
                            <Card.Body className="p-0 position-relative bg-white bg-opacity-25">
                                <div className="p-4 h-100 w-100 position-absolute text-dark"
                                     style={{
                                         overflowY: 'auto',
                                         fontSize: '0.85rem',
                                         whiteSpace: 'pre-wrap',
                                         fontFamily: 'Consolas, "Courier New", monospace',
                                         lineHeight: '1.6'
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