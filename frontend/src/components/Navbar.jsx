import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const homePath = isAdmin ? '/admin' : '/dashboard';

  return (
    <header style={{
      backgroundColor: 'var(--color-surface)',
      borderBottom: '1px solid var(--color-border)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0.75rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Link to={homePath} style={{
          textDecoration: 'none',
          color: 'var(--color-text)',
          fontWeight: 700,
          fontSize: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <span style={{ color: 'var(--color-primary)' }}>OTS</span> College Portal
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          {user && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{user.name || user.username}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                {user.studentId ? `ID: ${user.studentId}` : `Role: ${user.role}`}
              </div>
            </div>
          )}
          <button onClick={handleLogout} className="btn btn-secondary" style={{ height: '34px', fontSize: '0.875rem' }}>
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
