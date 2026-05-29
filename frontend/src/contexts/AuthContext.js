import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import analytics from '../utils/analytics';

const AuthContext = createContext(null);
const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function formatApiErrorDetail(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).filter(Boolean).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const { data } = await axios.get(`${API}/auth/me`, { withCredentials: true });
      setUser(data);
    } catch (error) {
      setUser(false);
    } finally {
      setLoading(false);
    }
  }

  async function login(email, password) {
    try {
      const { data } = await axios.post(`${API}/auth/login`, { email, password }, { withCredentials: true });
      setUser(data);
      analytics.identify(String(data._id), {
        name: data.name,
        email: data.email.toLowerCase(),
      });
      analytics.track('User Logged In', {
        user_id: String(data._id),
        email: data.email.toLowerCase(),
      });
      return { success: true };
    } catch (e) {
      return { success: false, error: formatApiErrorDetail(e.response?.data?.detail) || e.message };
    }
  }

  async function register(email, password, name) {
    try {
      const { data } = await axios.post(`${API}/auth/register`, { email, password, name }, { withCredentials: true });
      setUser(data);
      analytics.identify(String(data._id), {
        name: data.name,
        email: data.email.toLowerCase(),
        created_at: new Date().toISOString(),
      });
      analytics.track('User Registered', {
        user_id: String(data._id),
        name: data.name,
        email: data.email.toLowerCase(),
      });
      return { success: true };
    } catch (e) {
      return { success: false, error: formatApiErrorDetail(e.response?.data?.detail) || e.message };
    }
  }

  async function logout() {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
      analytics.reset(); // Clear anonymous ID so next user on this device starts fresh
      setUser(false);
    } catch (e) {
      console.error('Logout failed:', e);
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
