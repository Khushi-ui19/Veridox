import axios from 'axios';
import { toast } from 'react-toastify';

const api = axios.create({
    baseURL: '/api',
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

        // 4. Return rejection so local components can still handle specific cases if needed
        return Promise.reject(error.message);
    }
);

export const deleteContract = async (id) => {
    return await api.delete(`/contracts/${id}`);
};

export default api;