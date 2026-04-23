import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Spinner } from 'react-bootstrap';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import api from './api/axiosConfig';
import { cacheUser, clearCachedUser } from './utils/authUserCache';

// --- FIX: Change these imports to match your new lowercase filenames ---
import Home from './pages/home';        // changed from './pages/Home'
import Login from './pages/login';      // changed from './pages/Login'
import Register from './pages/register';// changed from './pages/Register'
import Dashboard from './pages/dashboard';
import Chat from './pages/chat';
import ContractDetails from './pages/contractDetails';
import Settings from './pages/settings';
import ForgotPassword from './pages/forgotPassword';
import CompleteRegistration from './pages/completeRegistration';
import AutoLogout from './pages/AutoLogout';

const PrivateRoute = ({ children }) => {
    const location = useLocation();
    const [authStatus, setAuthStatus] = useState(() =>
        localStorage.getItem('lastActive') ? 'checking' : 'unauthenticated'
    );

    useEffect(() => {
        let isMounted = true;

        const verifySession = async () => {
            if (!localStorage.getItem('lastActive')) {
                if (isMounted) {
                    setAuthStatus('unauthenticated');
                }
                return;
            }

            if (isMounted) {
                setAuthStatus('checking');
            }

            try {
                const response = await api.get('/auth/profile');
                cacheUser(response.data);
                if (isMounted) {
                    setAuthStatus('authenticated');
                }
            } catch {
                localStorage.removeItem('lastActive');
                clearCachedUser();
                if (isMounted) {
                    setAuthStatus('unauthenticated');
                }
            }
        };

        verifySession();

        return () => {
            isMounted = false;
        };
    }, [location.pathname]);

    if (authStatus === 'checking') {
        return (
            <div className="min-vh-100 d-flex align-items-center justify-content-center app-theme-page">
                <Spinner animation="border" variant="primary" />
            </div>
        );
    }

    return authStatus === 'authenticated'
        ? children
        : <Navigate to="/login" replace state={{ from: location }} />;
};

function App() {
  return (
    <Router>
      <ToastContainer position="top-center" autoClose={3000} />
      <AutoLogout />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/oauth2-login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Protected Routes */}
        <Route
            path="/dashboard"
            element={
                <PrivateRoute>
                    <Dashboard />
                </PrivateRoute>
            }
        />
        <Route path="/complete-registration" element={<CompleteRegistration />} />
        <Route
            path="/chat/:contractId"
            element={
                <PrivateRoute>
                    <Chat />
                </PrivateRoute>
            }
        />
        <Route
            path="/contracts/:id"
            element={
                <PrivateRoute>
                    <ContractDetails />
                </PrivateRoute>
            }
        />
        <Route
            path="/settings"
            element={
                <PrivateRoute>
                    <Settings />
                </PrivateRoute>
            }
        />
      </Routes>
    </Router>
  );
}

export default App;
