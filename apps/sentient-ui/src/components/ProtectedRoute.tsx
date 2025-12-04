import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  children: ReactNode;
}

export interface CurrentUser {
  id: string;
  email: string;
  clientId: string;
  role: string;
  isSentientAdmin?: boolean;
  emulatingClientId?: string;
  emulatingClientName?: string;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = () => {
    // Check for token in localStorage or sessionStorage
    const token = localStorage.getItem('sentient_token') || sessionStorage.getItem('sentient_token');

    if (!token) {
      setIsAuthenticated(false);
      return;
    }

    // Optional: Validate token expiry if JWT payload is accessible
    try {
      // Basic JWT validation (check if it's not expired)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const isExpired = payload.exp && payload.exp * 1000 < Date.now();

      if (isExpired) {
        // Clear expired token
        localStorage.removeItem('sentient_token');
        sessionStorage.removeItem('sentient_token');
        localStorage.removeItem('sentient_user');
        sessionStorage.removeItem('sentient_user');
        localStorage.removeItem('sentient_emulating');
        sessionStorage.removeItem('sentient_emulating');
        setIsAuthenticated(false);
        return;
      }

      setIsAuthenticated(true);
    } catch (error) {
      // If token is malformed, consider it invalid
      console.error('Invalid token format:', error);
      localStorage.removeItem('sentient_token');
      sessionStorage.removeItem('sentient_token');
      setIsAuthenticated(false);
    }
  };

  // Show loading state while checking authentication
  if (isAuthenticated === null) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#0d0d12',
        color: '#ffffff',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(255, 140, 66, 0.2)',
            borderTopColor: '#ff8c42',
            borderRadius: '50%',
            animation: 'spin 0.6s linear infinite',
            margin: '0 auto 16px',
          }} />
          <p style={{ fontSize: '14px', color: '#a1a1aa' }}>Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Render protected content
  return <>{children}</>;
}

// Utility function to get current user with emulation info
export function getCurrentUser(): CurrentUser | null {
  const userStr = localStorage.getItem('sentient_user') || sessionStorage.getItem('sentient_user');
  if (!userStr) return null;

  try {
    const user = JSON.parse(userStr) as CurrentUser;

    // Check for emulation state
    const emulatingStr = localStorage.getItem('sentient_emulating') || sessionStorage.getItem('sentient_emulating');
    if (emulatingStr) {
      const emulating = JSON.parse(emulatingStr);
      user.emulatingClientId = emulating.clientId;
      user.emulatingClientName = emulating.clientName;
    }

    return user;
  } catch {
    return null;
  }
}

// Check if current user is a Sentient admin
export function isSentientAdmin(): boolean {
  const user = getCurrentUser();
  return user?.isSentientAdmin === true || user?.role === 'SENTIENT_ADMIN';
}

// Check if currently emulating a client
export function isEmulating(): boolean {
  const emulatingStr = localStorage.getItem('sentient_emulating') || sessionStorage.getItem('sentient_emulating');
  return !!emulatingStr;
}

// Get the effective client ID (emulated client or actual client)
export function getEffectiveClientId(): string | null {
  const user = getCurrentUser();
  if (!user) return null;

  // If emulating, use the emulated client ID
  if (user.emulatingClientId) {
    return user.emulatingClientId;
  }

  return user.clientId;
}

// Start emulating a client (Sentient admin only)
export function startEmulating(clientId: string, clientName: string) {
  const user = getCurrentUser();
  if (!user?.isSentientAdmin) {
    console.error('Only Sentient admins can emulate clients');
    return false;
  }

  const emulating = { clientId, clientName };
  localStorage.setItem('sentient_emulating', JSON.stringify(emulating));
  sessionStorage.setItem('sentient_emulating', JSON.stringify(emulating));
  return true;
}

// Stop emulating a client
export function stopEmulating() {
  localStorage.removeItem('sentient_emulating');
  sessionStorage.removeItem('sentient_emulating');
}

// Utility function to get auth token
export function getAuthToken(): string | null {
  return localStorage.getItem('sentient_token') || sessionStorage.getItem('sentient_token');
}

// Utility function to logout
export function logout() {
  localStorage.removeItem('sentient_token');
  sessionStorage.removeItem('sentient_token');
  localStorage.removeItem('sentient_user');
  sessionStorage.removeItem('sentient_user');
  localStorage.removeItem('sentient_emulating');
  sessionStorage.removeItem('sentient_emulating');
  window.location.href = '/login';
}
