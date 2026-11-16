
import {
    createContext,
    useContext,
    useEffect,
    useState
} from "react";

import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Check existing login session
    useEffect(() => {

        const checkAuth = async () => {
            try {
                const response = await api.get("/auth/me");
                setUser(response.data.user);
            } catch (error) {
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        checkAuth();

    }, []);

    // Login
    const login = async (email, password) => {

        const response = await api.post("/auth/login", {
            email,
            password
        });

        setUser(response.data.user);

        return response.data.user;
    };

    // Registration
    const register = async (formData) => {

        const response = await api.post(
            "/auth/register",
            formData
        );

        return response.data;
    };

    // Logout
    const logout = async () => {

        try {
            await api.post("/auth/logout");
        } finally {
            setUser(null);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                login,
                register,
                logout,
                isAuthenticated: Boolean(user)
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
