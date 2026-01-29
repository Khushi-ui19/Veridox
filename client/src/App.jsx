import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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
    const token = localStorage.getItem('jwtToken');
    return token ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <Router>
      <ToastContainer position="top-center" autoClose={3000} />
      <AutoLogout />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
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