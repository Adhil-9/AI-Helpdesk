import { useState } from 'react';
import axios from 'axios';
import { Eye, EyeOff, Sun, Moon } from 'lucide-react';
import './Auth.css';
import AILogo from './AILogo';

interface AuthProps {
  onLoginSuccess: (email: string, token: string) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export default function Auth({ onLoginSuccess, theme, toggleTheme }: AuthProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validate = () => {
    if (!email) return 'Please enter your email.';
    if (!/\S+@\S+\.\S+/.test(email)) return 'Please enter a valid email address.';
    if (!password) return 'Please enter your password.';
    
    if (mode === 'register') {
      if (!name) return 'Please enter your name.';
      if (password !== confirmPassword) return 'Passwords do not match.';
    }
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    
    try {
      if (mode === 'login') {
        const response = await axios.post('/api/auth/login/', {
          username: email, // backend uses username
          password
        });
        onLoginSuccess(email, response.data.access);
      } else {
        // Register flow
        await axios.post('/api/auth/register/', {
          username: email, // use email as username
          email: email,
          password: password,
          first_name: name
        });
        
        // Auto login after register
        const loginResponse = await axios.post('/api/auth/login/', {
          username: email,
          password
        });
        onLoginSuccess(email, loginResponse.data.access);
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('Invalid email or password.');
      } else if (err.response?.status === 400) {
        setError(mode === 'register' ? 'An account with this email may already exist or invalid data.' : 'Invalid email or password.');
      } else {
        setError('A network or server error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div 
        className="theme-switch auth-theme-toggle" 
        onClick={toggleTheme} 
        title="Toggle Theme"
        role="button" 
        tabIndex={0} 
        onKeyDown={(e) => { if(e.key === 'Enter') toggleTheme(); }}
      >
        <div className={`theme-switch-icon ${theme === 'light' ? 'active' : ''}`}>
          <Sun size={14} />
        </div>
        <div className={`theme-switch-icon ${theme === 'dark' ? 'active' : ''}`}>
          <Moon size={14} />
        </div>
      </div>
      <div className="auth-card">
        <div className="auth-header">
          <AILogo size={40} />
          <h1>AI Help Desk</h1>
          <h2>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
          <p>{mode === 'login' ? 'Sign in to continue to AI Help Desk' : 'Sign up to get started'}</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'register' && (
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
              />
            </div>
          )}

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
              <button 
                type="button" 
                className="toggle-password" 
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {mode === 'register' && (
            <div className="form-group">
              <label>Confirm Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>
          )}

          <button type="submit" className="auth-submit-btn" disabled={isLoading}>
            {isLoading ? 'Please wait...' : (mode === 'login' ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div className="auth-footer">
          {mode === 'login' ? (
            <p>
              Don't have an account?{' '}
              <button className="auth-switch-btn" onClick={() => { setMode('register'); setError(''); }}>
                Register
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button className="auth-switch-btn" onClick={() => { setMode('login'); setError(''); }}>
                Sign In
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
