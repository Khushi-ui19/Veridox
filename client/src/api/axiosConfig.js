import axios from 'axios';
import { toast } from 'react-toastify';
import { clearCachedUser } from '../utils/authUserCache';

const api = axios.create({
    baseURL: (import.meta.env.VITE_API_URL || 'http://localhost:8080') + '/api',
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

        // 1. Generic Error Message
        let errorMessage = "An unexpected error occurred.";

        if (response && response.data) {
            // Use the "message" field we standardized in GlobalExceptionHandler
            errorMessage = response.data.message || response.data.error || errorMessage;
        }

        // 2. Handle 401 Unauthorized (Token Expired/Invalid)
       if (response && response.status === 401) {
           if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
               clearCachedUser();
               sessionStorage.setItem('db_wiped_alert', 'true');
               // We no longer need to clear the token from localStorage
               // The browser will handle the expired cookie automatically

               window.location.href = '/register';
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
