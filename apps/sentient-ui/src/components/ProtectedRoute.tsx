import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  children: ReactNode;
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

// Utility function to get current user
export function getCurrentUser() {
  const userStr = localStorage.getItem('sentient_user') || sessionStorage.getItem('sentient_user');
  if (!userStr) return null;

  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
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
  window.location.href = '/login';
}
