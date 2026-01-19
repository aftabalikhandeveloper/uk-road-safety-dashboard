import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check for stored token on mount
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        // Verify token is still valid
        verifyToken();
      } catch (e) {
        logout();
      }
    }
    setLoading(false);
  }, []);

  const verifyToken = async () => {
    try {
      await api.get('/users/verify-token');
    } catch (err) {
      // Token is invalid, logout
      logout();
    }
  };

  const login = async (email, password) => {
    try {
      setError(null);
      const response = await api.post('/users/login', { email, password });
      const { access_token, user: userData } = response.data;
      
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(userData));
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      // Also set the API key for data requests
      localStorage.setItem('api_key', userData.api_key);
      
      setUser(userData);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.detail || 'Login failed';
      setError(message);
      return { success: false, error: message };
    }
  };

  const signup = async (email, password, name) => {
    try {
      setError(null);
      const response = await api.post('/users/signup', { email, password, name });
      const { access_token, user: userData } = response.data;
      
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(userData));
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      // Also set the API key for data requests
      localStorage.setItem('api_key', userData.api_key);
      
      setUser(userData);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.detail || 'Signup failed';
      setError(message);
      return { success: false, error: message };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('api_key');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
  };

  const updateProfile = async (updates) => {
    try {
      const response = await api.put('/users/me', updates);
      const updatedUser = response.data;
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.detail || 'Update failed';
      return { success: false, error: message };
    }
  };

  const regenerateApiKey = async () => {
    try {
      const response = await api.post('/users/regenerate-api-key');
      const updatedUser = response.data;
      localStorage.setItem('user', JSON.stringify(updatedUser));
      localStorage.setItem('api_key', updatedUser.api_key);
      setUser(updatedUser);
      return { success: true, api_key: updatedUser.api_key };
    } catch (err) {
      const message = err.response?.data?.detail || 'Failed to regenerate API key';
      return { success: false, error: message };
    }
  };

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    signup,
    logout,
    updateProfile,
    regenerateApiKey
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
