import { createContext, useContext, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [verifyToken, setVerifyToken] = useState(localStorage.getItem('verifyToken'));
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState(null);
  const queryClient = useQueryClient();

  // Validate token on mount
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      if (!token) return null;
      const response = await api.get('/auth/me');
      return response.data.data;
    },
    enabled: !!token,
    retry: false,
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async ({ email, password }) => {
      const response = await api.post('/auth/login', { email, password });
      return response.data.data;
    },
    onSuccess: (data) => {
      if (data.needsVerification) {
        // Store verify token, don't set auth token
        localStorage.setItem('verifyToken', data.verifyToken);
        setVerifyToken(data.verifyToken);
        setPendingVerificationEmail(data.email);
        return;
      }
      localStorage.removeItem('verifyToken');
      setVerifyToken(null);
      setPendingVerificationEmail(null);
      localStorage.setItem('token', data.token);
      setToken(data.token);
      queryClient.setQueryData(['auth', 'me'], data.user);
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      // Client-side logout
      localStorage.removeItem('token');
      setToken(null);
      queryClient.setQueryData(['auth', 'me'], null);
      queryClient.clear();
    },
  });

  // Forgot password mutation
  const forgotPasswordMutation = useMutation({
    mutationFn: async (email) => {
      const response = await api.post('/auth/forgot-password', { email });
      return response.data;
    },
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ token, newPassword }) => {
      const response = await api.post('/auth/reset-password', { token, newPassword });
      return response.data;
    },
  });

  // Send login verification code
  const sendLoginCodeMutation = useMutation({
    mutationFn: async (verifyTok) => {
      const response = await api.post('/auth/send-login-code', { verifyToken: verifyTok });
      return response.data;
    },
  });

  // Verify login code
  const verifyLoginCodeMutation = useMutation({
    mutationFn: async ({ verifyToken: vt, code }) => {
      const response = await api.post('/auth/verify-login-code', { verifyToken: vt, code });
      return response.data;
    },
    onSuccess: (data) => {
      localStorage.removeItem('verifyToken');
      setVerifyToken(null);
      setPendingVerificationEmail(null);
      localStorage.setItem('token', data.data.token);
      setToken(data.data.token);
      queryClient.setQueryData(['auth', 'me'], data.data.user);
    },
  });

  const login = (email, password) => loginMutation.mutateAsync({ email, password });
  const logout = () => {
    localStorage.removeItem('verifyToken');
    setVerifyToken(null);
    setPendingVerificationEmail(null);
    return logoutMutation.mutateAsync();
  };
  const forgotPassword = (email) => forgotPasswordMutation.mutateAsync(email);
  const resetPassword = (token, newPassword) => 
    resetPasswordMutation.mutateAsync({ token, newPassword });
  const sendLoginCode = (vt) => sendLoginCodeMutation.mutateAsync(vt);
  const verifyLoginCode = (vt, code) => 
    verifyLoginCodeMutation.mutateAsync({ verifyToken: vt, code });

  const hasRole = (...roles) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  // Module-aware helpers
  const hasModuleAccess = (module) => {
    if (!user) return false;
    // Base admin role grants access to all modules
    if (user.role === 'admin') return true;
    return user.moduleAccess?.[module]?.enabled === true;
  };

  const hasModuleRole = (module, ...roles) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    const moduleRole = user.moduleAccess?.[module]?.role;
    return roles.includes(moduleRole);
  };

  const hasPermission = (module, permission) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    const moduleAccess = user.moduleAccess?.[module];
    if (!moduleAccess?.enabled) return false;
    if (moduleAccess.role === 'admin') return true;
    if (moduleAccess.permissions?.includes('*')) return true;
    return moduleAccess.permissions?.includes(permission) === true;
  };

  const getModuleRole = (module) => {
    if (!user) return null;
    if (user.role === 'admin') return 'admin';
    return user.moduleAccess?.[module]?.role || null;
  };

  const getModulePermissions = (module) => {
    if (!user) return [];
    if (user.role === 'admin') return ['*'];
    return user.moduleAccess?.[module]?.permissions || [];
  };

  const value = {
    user: user || null,
    token,
    verifyToken,
    pendingVerificationEmail,
    isLoading,
    isAuthenticated: !!user,
    error,
    login,
    logout,
    forgotPassword,
    resetPassword,
    sendLoginCode,
    verifyLoginCode,
    hasRole,
    hasModuleAccess,
    hasModuleRole,
    hasPermission,
    getModuleRole,
    getModulePermissions,
    isLoggingIn: loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    loginError: loginMutation.error,
    isForgotPasswordPending: forgotPasswordMutation.isPending,
    isResetPasswordPending: resetPasswordMutation.isPending,
    isSendCodePending: sendLoginCodeMutation.isPending,
    isVerifyCodePending: verifyLoginCodeMutation.isPending,
    verifyError: verifyLoginCodeMutation.error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
