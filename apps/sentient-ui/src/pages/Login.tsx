import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { SentientEye } from '../components/SentientEye/SentientEye';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import styles from './Login.module.css';

interface LoginCredentials {
  email: string;
  password: string;
  rememberMe: boolean;
}

export function Login() {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Login failed' }));
        throw new Error(errorData.message || 'Invalid email or password');
      }

      const data = await response.json();

      // Store JWT token
      const storage = credentials.rememberMe ? localStorage : sessionStorage;
      storage.setItem('sentient_token', data.access_token);
      if (data.user) {
        storage.setItem('sentient_user', JSON.stringify(data.user));
      }

      // Navigate to overview page
      navigate('/overview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginCard}>
        {/* Sentient Eye Logo */}
        <div className={styles.logoContainer}>
          <div className={styles.eyeWrapper}>
            <SentientEye />
          </div>
          <h1 className={styles.title}>Sentient Engine</h1>
          <p className={styles.subtitle}>Theatrical Control & Orchestration Platform</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && (
            <div className={styles.errorAlert}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className={styles.inputGroup}>
            <label htmlFor="email" className={styles.label}>
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={credentials.email}
              onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
              className={styles.input}
              placeholder="your.email@example.com"
              required
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="password" className={styles.label}>
              Password
            </label>
            <div className={styles.passwordWrapper}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                className={styles.input}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={styles.passwordToggle}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className={styles.checkboxGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={credentials.rememberMe}
                onChange={(e) => setCredentials({ ...credentials, rememberMe: e.target.checked })}
                className={styles.checkbox}
              />
              <span>Remember me</span>
            </label>
          </div>

          <button type="submit" className={styles.submitButton} disabled={isLoading}>
            {isLoading ? (
              <>
                <div className={styles.spinner} />
                <span>Signing in...</span>
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Footer */}
        <div className={styles.footer}>
          <p>Sentient Engine v1.0.0</p>
          <p className={styles.copyright}>© 2025 Paragon Escape Games</p>
        </div>
      </div>

      {/* Background gradient effect */}
      <div className={styles.backgroundGradient} />
    </div>
  );
}
