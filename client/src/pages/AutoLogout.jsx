import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../api/axiosConfig';
import { clearCachedUser } from '../utils/authUserCache';

const createThrottle = (fn, waitMs) => {
    let lastRun = 0;
    let timerId = null;
    let pendingArgs = null;

    const invoke = (args) => {
        lastRun = Date.now();
        fn(...args);
    };

    const throttled = (...args) => {
        const elapsed = Date.now() - lastRun;
        const remaining = waitMs - elapsed;

        if (remaining <= 0 || lastRun === 0) {
            if (timerId) {
                clearTimeout(timerId);
                timerId = null;
            }
            pendingArgs = null;
            invoke(args);
            return;
        }

        pendingArgs = args;
        if (!timerId) {
            timerId = setTimeout(() => {
                timerId = null;
                const argsToRun = pendingArgs || [];
                pendingArgs = null;
                invoke(argsToRun);
            }, remaining);
        }
    };

    throttled.cancel = () => {
        if (timerId) {
            clearTimeout(timerId);
            timerId = null;
        }
        pendingArgs = null;
    };

    return throttled;
};

const AutoLogout = () => {
    const navigate = useNavigate();
    // 30 Minutes in milliseconds (30 * 60 * 1000)
    const TIMEOUT_DURATION = 30 * 60 * 1000;

    const logoutUser = useCallback(async() => {
        try {
            await api.post('/auth/logout');
        } catch (error) {
            console.error("Logout API failed", error);
        }
        // 1. Clear Data
        localStorage.removeItem('lastActive');
        clearCachedUser();

        // 2. Alert User
        toast.info("Session timed out due to inactivity.");

        // 3. Redirect
        navigate('/');
    }, [navigate]);

    const checkInactivity = useCallback(() => {
        const lastActive = localStorage.getItem('lastActive');

        // Only check if user is currently logged in
        if (lastActive) {
            const now = Date.now();
            const timeSinceLastActive = now - parseInt(lastActive, 10);

            // If inactive for > 30 minutes, Logout
            if (timeSinceLastActive > TIMEOUT_DURATION) {
                logoutUser();
            }
        }
    }, [logoutUser, TIMEOUT_DURATION]);

    const updateLastActive = useCallback(() => {
        // Update the timestamp to "Now" whenever the user does something
        if (localStorage.getItem('lastActive')) {
            localStorage.setItem('lastActive', Date.now().toString());
        }
    }, []);

    useEffect(() => {
        // A. Check immediately when the App loads (e.g., user re-opens tab)
        checkInactivity();

        // B. Listen for user activity to reset the "lastActive" time
        const events = ['mousemove', 'keydown', 'click'];

        let scrollIdleTimer;
        const throttledUpdate = createThrottle(updateLastActive, 1000);

        events.forEach(event => window.addEventListener(event, throttledUpdate));
        const onScroll = createThrottle(() => {
            document.body.classList.add('is-scrolling');
            if (scrollIdleTimer) clearTimeout(scrollIdleTimer);
            scrollIdleTimer = setTimeout(() => {
                document.body.classList.remove('is-scrolling');
            }, 120);
            throttledUpdate();
        }, 120);
        window.addEventListener('scroll', onScroll, { passive: true });

        // C. Check periodically (every 1 minute) while the tab is open
        const intervalId = setInterval(checkInactivity, 60000);

        // Cleanup
        return () => {
            events.forEach(event => window.removeEventListener(event, throttledUpdate));
            window.removeEventListener('scroll', onScroll);
            clearInterval(intervalId);
            throttledUpdate.cancel();
            onScroll.cancel();
            if (scrollIdleTimer) clearTimeout(scrollIdleTimer);
            document.body.classList.remove('is-scrolling');
        };
    }, [checkInactivity, updateLastActive]);

    return null; // This component is invisible
};

export default AutoLogout;
