const AUTH_USER_CACHE_KEY = 'auth_user_cache';

export const getCachedUser = () => {
    try {
        const raw = sessionStorage.getItem(AUTH_USER_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        if (!parsed.username || !parsed.email || !parsed.role) return null;
        return parsed;
    } catch {
        return null;
    }
};

export const cacheUser = (user) => {
    if (!user || typeof user !== 'object') return;
    const safeUser = {
        username: user.username || '',
        email: user.email || '',
        role: user.role || 'USER'
    };
    sessionStorage.setItem(AUTH_USER_CACHE_KEY, JSON.stringify(safeUser));
};

export const clearCachedUser = () => {
    sessionStorage.removeItem(AUTH_USER_CACHE_KEY);
};

