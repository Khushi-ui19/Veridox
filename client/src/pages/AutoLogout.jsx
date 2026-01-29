import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const AutoLogout = () => {
    const navigate = useNavigate();
    // 30 Minutes in milliseconds (30 * 60 * 1000)
    const TIMEOUT_DURATION = 30 * 60 * 1000;

    const logoutUser = useCallback(() => {
        // 1. Clear Data
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('lastActive');

        // 2. Alert User
        toast.info("Session timed out due to inactivity.");

        // 3. Redirect
        navigate('/');
    }, [navigate]);

    const checkInactivity = useCallback(() => {
        const token = localStorage.getItem('jwtToken');
        const lastActive = localStorage.getItem('lastActive');

        // Only check if user is currently logged in
        if (token && lastActive) {
            const now = Date.now();
            const timeSinceLastActive = now - parseInt(lastActive, 10);

            // If inactive for > 30 minutes, Logout
            if (timeSinceLastActive > TIMEOUT_DURATION) {
                logoutUser();
            }
        }
    }, [logoutUser, TIMEOUT_DURATION]);

    const updateLastActive = () => {
        // Update the timestamp to "Now" whenever the user does something
        if (localStorage.getItem('jwtToken')) {
            localStorage.setItem('lastActive', Date.now().toString());
        }
    };

    useEffect(() => {
        // A. Check immediately when the App loads (e.g., user re-opens tab)
        checkInactivity();

        // B. Listen for user activity to reset the "lastActive" time
        const events = ['mousemove', 'keydown', 'click', 'scroll'];

        // We throttle this slightly to avoid writing to localStorage on every pixel move
        let timeout;
        const throttledUpdate = () => {
            if (!timeout) {
                timeout = setTimeout(() => {
                    updateLastActive();
                    timeout = null;
                }, 1000); // Update max once per second
            }
        };

        events.forEach(event => window.addEventListener(event, throttledUpdate));

        // C. Check periodically (every 1 minute) while the tab is open
        const intervalId = setInterval(checkInactivity, 60000);

        // Cleanup
        return () => {
            events.forEach(event => window.removeEventListener(event, throttledUpdate));
            clearInterval(intervalId);
            if (timeout) clearTimeout(timeout);
        };
    }, [checkInactivity]);

    return null; // This component is invisible
};

export default AutoLogout;