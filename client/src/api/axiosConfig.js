import axios from 'axios';
import { toast } from 'react-toastify';
import { clearCachedUser } from '../utils/authUserCache';

const normalizeBaseOrigin = (value) => {
    if (!value || typeof value !== 'string') return '';
    return value.trim().replace(/\/+$/, '').replace(/\/api$/i, '');
};

const configuredBackendOrigin = normalizeBaseOrigin(import.meta.env.VITE_API_URL);
const isLocalHostname = (hostname) => hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
const isLocalDevServer = () =>
    typeof window !== 'undefined' && isLocalHostname(window.location.hostname) && window.location.port === '5173';

export const getBackendOrigin = () => {
    if (typeof window === 'undefined') {
        return configuredBackendOrigin;
    }

    const { hostname, port, origin } = window.location;

    // 1. If we are on Vercel, we MUST use the external production backend (Koyeb)
    if (hostname.includes('vercel.app')) {
        return configuredBackendOrigin || origin;
    }

    // 2. If we are on the Vite Dev Server, point to the local Spring Boot backend
    if (port === '5173' && isLocalHostname(hostname)) {
        return 'http://localhost:8081';
    }

    // 3. Otherwise (Docker, Localhost Prod, Local Network IP), the backend is the same as the frontend
    return origin;
};

export const getApiBaseUrl = () => {
    // If we are on the Vite Dev Server, use '/api' (proxied to localhost:8080)
    if (isLocalDevServer()) {
        return '/api';
    }

    // If we are served from the backend directly (Docker, Prod), relative paths are safest.
    if (typeof window !== 'undefined') {
        const { hostname, port } = window.location;
        // If not Vercel and not Vite dev server, use relative path
        if (!hostname.includes('vercel.app') && port !== '5173') {
            return '/api';
        }
    }

    // Fallback to absolute URL for external hosting (Vercel)
    return `${getBackendOrigin()}/api`;
};

const api = axios.create({
    baseURL: getApiBaseUrl(),
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    }
});

// Response Interceptor (NEW: Handles Global Errors)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const { response } = error;

        if (!response) {
            toast.error(
                `Cannot reach the backend server. Make sure it is running and the frontend points to ${getBackendOrigin()}.`,
                { toastId: 'backend-unreachable' }
            );
            return Promise.reject(error);
        }

        // 2. Handle 401 Unauthorized (Token Expired/Invalid)
       if (response && response.status === 401) {
           if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
               clearCachedUser();
               localStorage.removeItem('lastActive');

               window.location.href = '/login';
           }
       }

        // 3. Handle 403 Forbidden
        if (response && response.status === 403) {
            toast.error("You do not have permission to perform this action.");
        }

        // 4. Return the original error so callers can inspect status/body
        return Promise.reject(error);
    }
);

export const deleteContract = async (id) => {
    return await api.delete(`/contracts/${id}`);
};

export default api;
