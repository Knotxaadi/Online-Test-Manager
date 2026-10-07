import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export function Login() {
  const [role, setRole] = useState('student'); // 'student' | 'admin'
  const [studentId, setStudentId] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (role === 'student') {
        const res = await api.loginStudent({ studentId: studentId.trim(), password });
        login(res.token, res.user);
        navigate('/dashboard');
      } else {
        const res = await api.loginAdmin({ username: username.trim(), password });
        login(res.token, res.user);
        navigate('/admin');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      backgroundColor: 'var(--color-bg)'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '420px', padding: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.6rem', color: 'var(--color-text)', marginBottom: '0.25rem' }}>
            Online Test System
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
            College Assessment Portal
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div style={{
          display: 'flex',
          backgroundColor: 'var(--color-bg)',
          borderRadius: 'var(--radius-md)',
          padding: '0.25rem',
          marginBottom: '1.5rem'
        }}>
          <button
            type="button"
            onClick={() => { setRole('student'); setError(''); }}
            style={{
              flex: 1,
              padding: '0.5rem',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              backgroundColor: role === 'student' ? 'var(--color-surface)' : 'transparent',
              color: role === 'student' ? 'var(--color-primary)' : 'var(--color-text-muted)',
              boxShadow: role === 'student' ? 'var(--shadow-card)' : 'none',
              transition: 'all 150ms ease'
            }}
          >
            Student Login
          </button>
          <button
            type="button"
            onClick={() => { setRole('admin'); setError(''); }}
            style={{
              flex: 1,
              padding: '0.5rem',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              backgroundColor: role === 'admin' ? 'var(--color-surface)' : 'transparent',
              color: role === 'admin' ? 'var(--color-primary)' : 'var(--color-text-muted)',
              boxShadow: role === 'admin' ? 'var(--shadow-card)' : 'none',
              transition: 'all 150ms ease'
            }}
          >
            Admin Login
          </button>
        </div>

        {error && (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid var(--color-danger)',
            color: 'var(--color-danger)',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.9rem',
            marginBottom: '1.25rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {role === 'student' ? (
            <div>
              <label style={{ display: 'block', fontWeight: 500, fontSize: '0.9rem', marginBottom: '0.35rem' }}>
                Student ID / Roll No.
              </label>
              <input
                type="text"
                placeholder="e.g. STU001"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                required
                style={{
                  width: '100%',
                  height: '40px',
                  padding: '0 0.75rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.95rem'
                }}
              />
            </div>
          ) : (
            <div>
              <label style={{ display: 'block', fontWeight: 500, fontSize: '0.9rem', marginBottom: '0.35rem' }}>
                Admin Username / Email
              </label>
              <input
                type="text"
                placeholder="e.g. admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                style={{
                  width: '100%',
                  height: '40px',
                  padding: '0 0.75rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.95rem'
                }}
              />
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontWeight: 500, fontSize: '0.9rem', marginBottom: '0.35rem' }}>
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                height: '40px',
                padding: '0 0.75rem',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.95rem'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.5rem', height: '42px' }}
          >
            {loading ? 'Logging in...' : `Log In as ${role === 'student' ? 'Student' : 'Admin'}`}
          </button>
        </form>

        <div style={{
          marginTop: '1.5rem',
          paddingTop: '1rem',
          borderTop: '1px solid var(--color-border)',
          fontSize: '0.8rem',
          color: 'var(--color-text-muted)',
          textAlign: 'center'
        }}>
          Demo Credentials:<br />
          Student: <strong>STU001</strong> / <strong>Student@123</strong><br />
          Admin: <strong>admin</strong> / <strong>Admin@123</strong>
        </div>
      </div>
    </div>
  );
}

export default Login;
