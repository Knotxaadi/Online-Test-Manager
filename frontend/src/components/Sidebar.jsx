import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { label: '📊 Dashboard', path: '/admin' },
    { label: '👥 Students', path: '/admin/students' },
    { label: '📚 Subjects', path: '/admin/subjects' },
    { label: '📝 Tests', path: '/admin/tests' },
    { label: '❓ Question Bank', path: '/admin/questions' },
    { label: '📈 Results', path: '/admin/results' }
  ];

  return (
    <aside style={{
      width: '250px',
      minWidth: '250px',
      backgroundColor: 'var(--color-surface)',
      borderRight: '1px solid var(--color-border)',
      height: '100vh',
      position: 'sticky',
      top: 0,
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      zIndex: 50
    }}>
      <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ color: 'var(--color-primary)' }}>OTS</span> Admin Portal
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.35rem' }}>
          Logged in as: <strong>{user?.username || 'admin'}</strong>
        </div>
      </div>

      <nav style={{ padding: '1rem 0.75rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem', overflowY: 'auto' }}>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/admin'}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              padding: '0.7rem 1rem',
              borderRadius: 'var(--radius-md)',
              textDecoration: 'none',
              fontWeight: isActive ? 600 : 500,
              fontSize: '0.925rem',
              color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              backgroundColor: isActive ? 'var(--color-primary-light)' : 'transparent',
              transition: 'all 150ms ease'
            })}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div style={{ padding: '1.25rem', borderTop: '1px solid var(--color-border)' }}>
        <button
          onClick={handleLogout}
          className="btn btn-secondary"
          style={{ width: '100%', justifyContent: 'center', gap: '0.5rem' }}
        >
          🚪 Logout
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
