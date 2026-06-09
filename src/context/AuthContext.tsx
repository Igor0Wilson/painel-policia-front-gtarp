import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: string;
  name: string;
  role: string;
  status: string;
  isInstructor?: boolean;
  courseTags?: string[];
  avatarUrl?: string;
  coverUrl?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => Promise<void>;
  hasPermission: (permissionKey: string) => boolean;
  permissions: Record<string, string[]>;
  reloadUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState<boolean>(true);

  const fetchPermissions = async () => {
    try {
      const response = await fetch('/api/permissions');
      if (response.ok) {
        const data = await response.json();
        setPermissions(data);
      }
    } catch (error) {
    }
  };

  const loadUserSession = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        await fetchPermissions();
      } else {
        setUser(null);
      }
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserSession();
  }, []);

  const login = (token: string, userData: User) => {
    // Save to localStorage as a fallback for browsers blocking cross-domain cookies
    localStorage.setItem('auth_token', token);
    setUser(userData);
    fetchPermissions();
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
    }
    localStorage.removeItem('auth_token');
    setUser(null);
    setPermissions({});
    // Trigger full page reload to clear memory state as per security requirements
    window.location.href = '/login';
  };

  const hasPermission = (permissionKey: string) => {
    if (!user) return false;
    if (user.role === 'coronel') return true; // Coronel has bypass to all sections
    const rolePermissions = permissions[user.role] || [];
    return rolePermissions.includes(permissionKey);
  };

  const reloadUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      }
    } catch (error) {
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasPermission, permissions, reloadUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
