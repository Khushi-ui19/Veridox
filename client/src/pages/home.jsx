import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Navbar, Button, Row, Col, Card, Badge, ProgressBar } from 'react-bootstrap';
import api from '../api/axiosConfig';
import { cacheUser, clearCachedUser, getCachedUser } from '../utils/authUserCache';
import {
    FaShieldAlt,
    FaArrowRight,
    FaBrain,
    FaLock,
    FaSearch,
    FaBalanceScale,
    FaRobot,
    FaComments,
    FaLayerGroup,
    FaCube,
    FaFileUpload,
    FaProjectDiagram,
    FaCheckCircle
} from 'react-icons/fa';

const hasActiveSession = () => Boolean(localStorage.getItem('lastActive') && getCachedUser());

// --- SCROLL REVEAL HOOK ---
const useScrollReveal = () => {
    const [isVisible, setIsVisible] = useState(false);
    const domRef = useRef();

    useEffect(() => {
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });
        
        const current = domRef.current;
        if (current) observer.observe(current);
        
        return () => {
            if (current) observer.unobserve(current);
        };
    }, []);

    return [domRef, isVisible];
};

const RevealSection = ({ children, className = "", delay = "" }) => {
    const [ref, isVisible] = useScrollReveal();
    return (
        <div ref={ref} className={`${className} ${delay} reveal-on-scroll ${isVisible ? 'visible' : ''}`}>
            {children}
        </div>
    );
};

const Home = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(() => hasActiveSession());
    const navigate = useNavigate();

    useEffect(() => {
        let isMounted = true;
        const syncAuthState = async () => {
            if (!localStorage.getItem('lastActive')) {
                clearCachedUser();
                if (isMounted) setIsLoggedIn(false);
                return;
            }
            const cachedUser = getCachedUser();
            if (cachedUser) {
                if (isMounted) setIsLoggedIn(true);
                return;
            }
            try {
                const response = await api.get('/auth/profile');
                cacheUser(response.data);
                if (isMounted) setIsLoggedIn(true);
            } catch {
                localStorage.removeItem('lastActive');
                clearCachedUser();
                if (isMounted) setIsLoggedIn(false);
            }
        };
        syncAuthState();
        window.addEventListener('focus', syncAuthState);
        window.addEventListener('storage', syncAuthState);
        return () => {
            isMounted = false;
            window.removeEventListener('focus', syncAuthState);
            window.removeEventListener('storage', syncAuthState);
        };
    }, []);

    return (
        <div className="min-vh-100 fade-in d-flex flex-column app-theme-page">
            {/* Background Decorations */}
            <div className="background-blob modern-blob blob-indigo blob-lg blob-top-left" style={{ opacity: 0.3, willChange: 'transform', transform: 'translateZ(0)' }}></div>
            <div className="background-blob modern-blob blob-cyan blob-md blob-bottom-right" style={{ opacity: 0.2, willChange: 'transform', transform: 'translateZ(0)' }}></div>

            {/* --- 1. PREMIUM GLASS NAVBAR --- */}
            <Navbar className="fixed-top px-3 px-md-4 py-2 mt-2 mt-md-4 mx-2 mx-md-5 nav-glass rounded-pill animate-entrance" style={{ zIndex: 1000, background: 'rgba(255, 255, 255, 0.4)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.5)' }}>
                <Container fluid className="d-flex justify-content-between align-items-center">
                    <Navbar.Brand className="fw-bold d-flex align-items-center text-primary m-0" style={{ fontSize: '1.25rem', letterSpacing: '-0.5px' }}>
                        <div className="glass-3d p-2 rounded-circle me-2 me-md-3 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px' }}>
                            <FaShieldAlt size={18} />
                        </div>
                        <span className="d-none d-sm-inline">Contract<span className="text-dark">Analyzer</span></span>
                    </Navbar.Brand>

                    <div className="d-flex align-items-center gap-2">
                        {!isLoggedIn ? (
                            <div className="d-flex gap-2 align-items-center">
                                <Button variant="link" className="nav-link-modern d-none d-md-block" onClick={() => navigate('/login')}>
                                    Log In
                                </Button>
                                <Button className="nav-btn-modern d-none d-md-block" onClick={() => navigate('/register')}>
                                    Start Free
                                </Button>
                                
                                {/* Mobile Login Button shown instead of Start Free */}
                                <Button className="nav-btn-modern d-block d-md-none px-3" onClick={() => navigate('/login')} style={{ fontSize: '0.85rem' }}>
                                    Log In
                                </Button>
                            </div>
                        ) : (
                            <Button className="nav-btn-modern px-3 px-md-4" onClick={() => navigate('/dashboard')} style={{ fontSize: '0.85rem' }}>
                                <span className="d-none d-sm-inline">Open Vault</span>
                                <span className="d-inline d-sm-none">Vault</span>
                                <FaArrowRight className="ms-2" />
                            </Button>
                        )}
                    </div>
                </Container>
            </Navbar>

            {/* --- 2. 3D HERO SECTION --- */}
            <section className="app-page-content home-hero-offset py-4 py-md-5 mb-4 mb-md-5 animate-entrance">
                <Container>
                    <Row className="align-items-center g-4 g-lg-5">
                        <Col lg={7} className="text-center text-lg-start" style={{ zIndex: 10 }}>
                            <Badge className="mb-3 mb-md-4 px-3 py-2 rounded-pill fw-bold glass-3d-inset text-white border-0 shadow-sm" style={{ background: 'rgba(99, 102, 241, 0.85)' }}>
                                <FaCube className="me-2 spin-slow" /> v2.0 NEURAL ENGINE
                            </Badge>
                            <h1 className="display-1 fw-bold mb-3 mb-md-4 text-dark" style={{ lineHeight: '1', fontSize: 'clamp(2.5rem, 8vw, 5rem)' }}>
                                Master Your <br />
                                <span className="text-dark">
                                    Obligations.
                                </span>
                            </h1>
                            <p className="lead text-secondary mb-4 mb-md-5 pe-lg-5" style={{ fontSize: 'clamp(1rem, 4vw, 1.3rem)', lineHeight: '1.7', opacity: 0.8 }}>
                                The world's first 3D-accelerated legal intelligence. We decompose complex contracts into actionable insights using agentic neural networks.
                            </p>
                            <div className="d-flex flex-column flex-sm-row gap-3 gap-md-4 justify-content-center justify-content-lg-start">
                                <Button size="lg" className="nav-btn-modern px-5 py-3" onClick={() => navigate(isLoggedIn ? '/dashboard' : '/register')}>
                                    Analyze Now <FaArrowRight className="ms-2" />
                                </Button>
                                <Button size="lg" variant="white" className="nav-link-modern px-4 py-3 border rounded-pill shadow-sm" onClick={() => document.getElementById('how-it-works').scrollIntoView()}>
                                    How It Works
                                </Button>
                            </div>
                        </Col>
                        
                        <Col lg={5} className="d-none d-lg-block">
                            <div className="position-relative animate-float-3d" style={{ height: '500px', transformStyle: 'preserve-3d' }}>
                                <div className="position-absolute rounded-5" 
                                    style={{ width: '80%', height: '60%', top: '25%', left: '10%', background: 'rgba(0,0,0,0.03)', filter: 'blur(40px)', transform: 'translateZ(-100px) rotateX(60deg)' }}></div>

                                <Card className="glass-3d-deep border-0 p-4 position-absolute shadow-lg" 
                                    style={{ width: '420px', top: '45%', left: '45%', transform: 'translate(-50%, -50%) translateZ(50px)', borderRadius: '32px' }}>
                                    <Card.Body>
                                        <div className="d-flex justify-content-between align-items-center mb-4">
                                            <div className="d-flex align-items-center">
                                                <div className="bg-primary p-2 rounded-3 me-3 text-white shadow-sm">
                                                    <FaLayerGroup />
                                                </div>
                                                <h6 className="fw-bold m-0 text-dark">Neural Decomposition</h6>
                                            </div>
                                            <Badge bg="success" className="rounded-pill px-3 shadow-sm">SECURE</Badge>
                                        </div>
                                        
                                        <div className="glass-3d-inset p-4 rounded-4 mb-4" style={{ background: 'rgba(255,255,255,0.4)' }}>
                                            <div className="d-flex justify-content-between mb-2">
                                                <small className="text-muted fw-bold">Contextual Analysis</small>
                                                <small className="text-primary fw-bold">94.2%</small>
                                            </div>
                                            <ProgressBar animated now={94} variant="primary" style={{ height: '12px', background: 'rgba(0,0,0,0.05)' }} className="rounded-pill shadow-sm" />
                                        </div>

                                        <Row className="g-3">
                                            <Col xs={6}>
                                                <div className="glass-3d-inset p-3 rounded-4 text-center" style={{ border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                                                    <div className="text-danger fw-bold h3 m-0">12</div>
                                                    <div className="text-muted small fw-bold">Hazards</div>
                                                </div>
                                            </Col>
                                            <Col xs={6}>
                                                <div className="glass-3d-inset p-3 rounded-4 text-center" style={{ border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                                                    <div className="text-success fw-bold h3 m-0">08</div>
                                                    <div className="text-muted small fw-bold">Safe</div>
                                                </div>
                                            </Col>
                                        </Row>
                                    </Card.Body>
                                </Card>

                                <div className="glass-3d position-absolute rounded-circle p-4 shadow-lg d-flex align-items-center justify-content-center" 
                                    style={{ top: '10%', right: '10%', zIndex: 10, width: '90px', height: '90px', transform: 'translateZ(120px)', background: 'var(--gradient-hot)', border: 'none' }}>
                                    <FaLock className="text-white" size={35} />
                                </div>
                            </div>
                        </Col>
                    </Row>
                </Container>
            </section>

            {/* --- 3. HOW IT WORKS --- */}
            <section id="how-it-works" className="py-5 my-5">
                <Container>
                    <RevealSection className="text-center mb-5">
                        <h2 className="display-4 fw-bold mb-3">How It <span className="text-primary">Works</span></h2>
                        <p className="lead text-secondary mx-auto" style={{ maxWidth: '700px' }}>
                            Our proprietary 3-stage neural pipeline transforms raw documents into high-fidelity legal intelligence.
                        </p>
                    </RevealSection>

                    <Row className="g-4">
                        {[
                            { icon: <FaFileUpload />, title: "1. Secure Upload", desc: "Drop your PDF or Image. Our zero-persistence vault encrypts data before processing begins.", color: "primary" },
                            { icon: <FaProjectDiagram />, title: "2. Neural Mapping", desc: "AI decomposes the text into semantic clusters, identifying risks and cross-clause liabilities.", color: "secondary" },
                            { icon: <FaCheckCircle />, title: "3. Actionable Report", desc: "Get a 3D-visualized risk dashboard and an AI counsel ready for interactive questions.", color: "success" }
                        ].map((step, idx) => (
                            <Col md={4} key={idx}>
                                <RevealSection delay={`reveal-delay-${idx + 1}`} className="h-100">
                                    <Card className="glass-3d h-100 border-0 p-4 text-center hover-lift" style={{ borderRadius: '24px' }}>
                                        <div className={`mx-auto mb-4 bg-${step.color} p-3 rounded-circle text-white shadow-lg`} style={{ width: '70px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {step.icon}
                                        </div>
                                        <Card.Title className="fw-bold h4 mb-3">{step.title}</Card.Title>
                                        <Card.Text className="text-muted">
                                            {step.desc}
                                        </Card.Text>
                                    </Card>
                                </RevealSection>
                            </Col>
                        ))}
                    </Row>
                </Container>
            </section>

            {/* --- 4. NEURAL ADVANTAGE (FULL WIDTH) --- */}
            <section className="py-5 my-5" style={{ background: 'rgba(99, 102, 241, 0.04)', borderTop: '1px solid rgba(99, 102, 241, 0.1)', borderBottom: '1px solid rgba(99, 102, 241, 0.1)' }}>
                <Container fluid className="px-4 px-md-5">
                    <RevealSection className="text-center mb-5">
                        <Badge className="mb-3 px-3 py-2 rounded-pill fw-bold text-white border-0 shadow-sm" style={{ background: 'rgba(99, 102, 241, 0.85)' }}>SYSTEM TELEMETRY</Badge>
                        <h2 className="display-3 fw-bold mb-3">The Neural <span className="text-primary">Advantage</span></h2>
                        <p className="lead text-secondary mx-auto" style={{ maxWidth: '800px' }}>
                            Our distributed inference network delivers industry-leading precision and throughput.
                        </p>
                    </RevealSection>

                    <Row className="g-4 justify-content-center">
                        {[
                            { label: "Analysis Speed", value: "0.8s", sub: "Proprietary caching & async OCR processing", icon: <FaRobot />, color: "primary" },
                            { label: "AI Confidence", value: "99.8%", sub: "Zero-shot semantic verification layer", icon: <FaBrain />, color: "secondary" },
                            { label: "Data Privacy", value: "AES-256", sub: "Stateless architecture with volatile memory", icon: <FaLock />, color: "success" },
                            { label: "Risk Detection", value: "140+", sub: "Continuously updated legal hazard patterns", icon: <FaSearch />, color: "warning" }
                        ].map((stat, idx) => (
                            <Col xl={3} lg={6} md={6} key={idx}>
                                <RevealSection delay={`reveal-delay-${idx + 1}`} className="h-100">
                                    <div className="stat-card-premium p-5 rounded-5 text-center animate-glow-breath h-100 d-flex flex-column justify-content-center" style={{ animationDelay: `${idx * 0.5}s`, background: 'rgba(255,255,255,0.6)' }}>
                                        <div className="animate-float-slow mb-4 text-primary" style={{ animationDelay: `${idx * 0.3}s`, fontSize: '3rem' }}>
                                            {stat.icon}
                                        </div>
                                        <h3 className="display-4 fw-bold mb-2 text-dark">{stat.value}</h3>
                                        <div className="h4 fw-bold text-primary mb-3">{stat.label}</div>
                                        <div className="text-muted lead" style={{ fontSize: '1rem' }}>{stat.sub}</div>
                                    </div>
                                </RevealSection>
                            </Col>
                        ))}
                    </Row>
                </Container>
            </section>

            {/* --- 5. FEATURE SECTIONS WITH REVEAL --- */}
            <div id="details" className="app-page-content py-5">
                
                {/* SECTION: INTELLIGENT SCANNING */}
                <section className="py-5">
                    <Container>
                        <Row className="align-items-center g-5">
                            <Col lg={6} className="order-2 order-lg-1">
                                <RevealSection>
                                    <div className="glass-3d p-4 rounded-5 shadow-lg" style={{ transform: 'perspective(1000px) rotateY(10deg)' }}>
                                        <div className="glass-3d-inset p-5 rounded-5" style={{ background: 'rgba(255,255,255,0.2)' }}>
                                            <h2 className="display-5 fw-bold mb-4 text-dark">Neural Clause Extraction</h2>
                                            <p className="lead text-secondary mb-4" style={{ lineHeight: '1.8' }}>
                                                Our engine utilizes Tesseract-OCR fused with deep-learning transformers to "read" your contracts with semantic understanding.
                                            </p>
                                            <div className="d-flex gap-3">
                                                <Badge className="text-white p-2 px-4 rounded-pill glass-3d border-0 fw-bold shadow-sm" style={{ background: 'rgba(99, 102, 241, 0.85)' }}>99.2% Accuracy</Badge>
                                                <Badge className="text-white p-2 px-4 rounded-pill glass-3d border-0 fw-bold shadow-sm" style={{ background: 'rgba(6, 182, 212, 0.85)' }}>LLM-Powered</Badge>
                                            </div>
                                        </div>
                                    </div>
                                </RevealSection>
                            </Col>
                            <Col lg={6} className="order-1 order-lg-2 text-center">
                                <RevealSection className="animate-float-3d">
                                    <div className="p-5 glass-3d-deep rounded-circle d-inline-block shadow-2xl mb-4" style={{ width: '280px', height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <FaBrain size={120} style={{ fill: 'url(#grad-cool)', color: 'var(--primary-color)' }} />
                                    </div>
                                    <div className="mt-2">
                                        <span className="fw-bold text-primary ls-1 small d-block">NEURAL ENGINE ACTIVE</span>
                                        <span className="text-muted small">Real-time semantic processing enabled</span>
                                    </div>
                                </RevealSection>
                            </Col>
                        </Row>
                    </Container>
                </section>

                {/* SECTION: SECURITY */}
                <section className="py-5 my-5" style={{ background: 'rgba(99, 102, 241, 0.02)', position: 'relative' }}>
                    <div className="position-absolute w-100 h-100 top-0 start-0" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.05), transparent)' }}></div>
                    <Container className="position-relative">
                        <Row className="align-items-center g-5">
                            <Col lg={6} className="text-center">
                                <RevealSection className="animate-float-3d">
                                    <div className="glass-3d p-5 rounded-4 d-inline-block shadow-lg" style={{ transform: 'perspective(1000px) rotateX(15deg) rotateY(-10deg)', background: 'var(--gradient-cool)' }}>
                                        <FaLock size={100} className="text-white mb-4 shadow-sm" />
                                        <div className="glass-3d-inset p-3 rounded-4 text-start" style={{ background: 'rgba(255,255,255,0.2)', border: 'none' }}>
                                            <div className="d-flex align-items-center gap-2 mb-2">
                                                <div className="bg-white rounded-circle" style={{ width: '10px', height: '10px' }}></div>
                                                <span className="small fw-bold text-white">Military Grade AES-256</span>
                                            </div>
                                        </div>
                                    </div>
                                </RevealSection>
                            </Col>
                            <Col lg={6}>
                                <RevealSection>
                                    <h2 className="display-5 fw-bold mb-4 text-dark">Zero-Persistence Vault</h2>
                                    <p className="lead text-secondary mb-4" style={{ lineHeight: '1.8' }}>
                                        Privacy is our fundamental protocol. Your documents exist only in encrypted volatile memory during analysis.
                                    </p>
                                    <Button variant="outline-dark" className="rounded-pill px-5 py-3 fw-bold glass-3d border-2 hover-lift btn-black-hover" onClick={() => navigate('/login')}>Security Deep Dive</Button>
                                </RevealSection>
                            </Col>
                        </Row>
                    </Container>
                </section>
            </div>

            {/* --- 6. CTA --- */}
            <section className="app-page-content py-5 my-5 text-center">
                <Container>
                    <RevealSection>
                        <div className="glass-3d p-5 rounded-5 shadow-2xl position-relative overflow-hidden" style={{ background: 'var(--gradient-accent)', border: 'none' }}>
                            <div className="position-absolute top-0 start-0 w-100 h-100" style={{ background: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.05\' fill-rule=\'evenodd\'%3E%3Ccircle cx=\'3\' cy=\'3\' r=\'3\'/%3E%3Ccircle cx=\'13\' cy=\'13\' r=\'3\'/%3E%3C/g%3E%3C/svg%3E")', opacity: 0.5 }}></div>
                            
                            <div className="position-relative z-1">
                                <h2 className="display-4 fw-bold mb-4 text-white">Elevate Your Legal Strategy</h2>
                                <Button size="lg" variant="white" className="px-5 py-3 fw-bold rounded-pill glass-3d neumorphic-button text-primary hover-lift shadow-lg" onClick={() => navigate('/register')}>
                                    Create Free Account
                                </Button>
                            </div>
                        </div>
                    </RevealSection>
                </Container>
            </section>

            {/* --- 7. FOOTER --- */}
            <footer className="py-5 mt-auto app-page-content animate-entrance">
                <Container className="text-center">
                    <p className="text-muted small mb-0 fw-bold">
                        &copy; {new Date().getFullYear()} CONTRACT ANALYZER AI. BUILT FOR PRECISION.
                    </p>
                </Container>
            </footer>

            <svg width="0" height="0" style={{ position: 'absolute' }}>
                <defs>
                    <linearGradient id="grad-cool" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style={{ stopColor: '#6366f1', stopOpacity: 1 }} />
                        <stop offset="100%" style={{ stopColor: '#06b6d4', stopOpacity: 1 }} />
                    </linearGradient>
                </defs>
            </svg>
        </div>
    );
};

export default Home;
