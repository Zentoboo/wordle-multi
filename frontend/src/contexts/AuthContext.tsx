import React, { useState, useEffect, ReactNode } from 'react';
import { AuthContext } from './AuthContextDefinition';
import type { AuthContextType, User, LoginCredentials, RegisterData, ValidationError, AuthResponse } from '../types/auth';

interface AuthProviderProps {
  children: ReactNode;
}

const API_URL = "/api/auth";

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user && !!token;

  // Load auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('accessToken');
      const storedRefreshToken = localStorage.getItem('refreshToken');
      
      if (storedToken && storedRefreshToken) {
        try {
          // Validate stored token by calling /me endpoint
          const res = await fetch(`${API_URL}/me`, {
            headers: { 'Authorization': `Bearer ${storedToken}` }
          });

          if (res.ok) {
            const userData = await res.json();
            setUser(userData);
            setToken(storedToken);
          } else {
            // Token is invalid, try refresh
            const refreshResponse = await fetch(`${API_URL}/refresh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token: storedRefreshToken })
            });

            if (refreshResponse.ok) {
              const authData = await refreshResponse.json();
              setUser(authData.user);
              setToken(authData.accessToken);
              localStorage.setItem('accessToken', authData.accessToken);
              localStorage.setItem('refreshToken', authData.refreshToken);
            } else {
              clearAuthData();
            }
          }
        } catch (error) {
          console.error('Auth initialization failed:', error);
          clearAuthData();
        }
      }
      
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const clearAuthData = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  };

  const refreshTokens = async (refreshToken: string): Promise<void> => {
    try {
      const res = await fetch(`${API_URL}/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: refreshToken })
      });

      if (!res.ok) {
        throw new Error('Token refresh failed');
      }

      const data: AuthResponse = await res.json();
      setUser(data.user);
      setToken(data.accessToken);
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
    } catch {
      clearAuthData();
      throw new Error('Token refresh failed');
    }
  };

  const validateEmail = (email: string): string | null => {
    if (!email) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return 'Please enter a valid email address (e.g., user@example.com)';
    }
    return null;
  };

  const validateUsername = (username: string): string | null => {
    if (!username) return 'Username is required';
    if (username.length < 3) return 'Username must be at least 3 characters long';
    if (username.length > 20) return 'Username must be less than 20 characters';
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return 'Username can only contain letters, numbers, and underscores';
    }
    return null;
  };

  const validatePassword = (password: string): string | null => {
    if (!password) return 'Password is required';
    if (password.length < 6) return 'Password must be at least 6 characters long';
    if (password.length > 50) return 'Password must be less than 50 characters';
    return null;
  };

  const login = async (credentials: LoginCredentials): Promise<ValidationError[]> => {
    const errors: ValidationError[] = [];

    const usernameError = validateUsername(credentials.username);
    if (usernameError) {
      errors.push({ field: 'username', message: usernameError });
    }

    const passwordError = validatePassword(credentials.password);
    if (passwordError) {
      errors.push({ field: 'password', message: passwordError });
    }

    if (errors.length > 0) return errors;

    try {
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });

      const data = await res.text();

      if (!res.ok) {
        return [{ field: 'general', message: data || 'Login failed' }];
      }

      try {
        const authData: AuthResponse = JSON.parse(data);
        setUser(authData.user);
        setToken(authData.accessToken);
        localStorage.setItem('accessToken', authData.accessToken);
        localStorage.setItem('refreshToken', authData.refreshToken);
        return [];
      } catch {
        return [{ field: 'general', message: 'Invalid response from server' }];
      }
    } catch {
      return [{ field: 'general', message: 'Server error. Please try again.' }];
    }
  };

  const register = async (userData: RegisterData): Promise<ValidationError[]> => {
    const errors: ValidationError[] = [];

    const usernameError = validateUsername(userData.username);
    if (usernameError) {
      errors.push({ field: 'username', message: usernameError });
    }

    const emailError = validateEmail(userData.email);
    if (emailError) {
      errors.push({ field: 'email', message: emailError });
    }

    const passwordError = validatePassword(userData.password);
    if (passwordError) {
      errors.push({ field: 'password', message: passwordError });
    }

    if (errors.length > 0) return errors;

    try {
      const res = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      const data = await res.text();

      if (!res.ok) {
        return [{ field: 'general', message: data || 'Registration failed' }];
      }

      try {
        const authData: AuthResponse = JSON.parse(data);
        setUser(authData.user);
        setToken(authData.accessToken);
        localStorage.setItem('accessToken', authData.accessToken);
        localStorage.setItem('refreshToken', authData.refreshToken);
        return [];
      } catch {
        return [{ field: 'general', message: 'Invalid response from server' }];
      }
    } catch {
      return [{ field: 'general', message: 'Server error. Please try again.' }];
    }
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (refreshToken) {
      try {
        await fetch(`${API_URL}/revoke`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: refreshToken })
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    
    clearAuthData();
  };

  const refreshToken = async (): Promise<void> => {
    const storedRefreshToken = localStorage.getItem('refreshToken');
    if (!storedRefreshToken) {
      throw new Error('No refresh token available');
    }
    await refreshTokens(storedRefreshToken);
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    refreshToken
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

