import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import RegistrationForm from './RegistrationForm';

function Registration({ user, onLogout, isAuthenticated }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  const handleLogin = () => {
    sessionStorage.setItem('oauth_redirect_intent', '/registration');
    navigate('/login');
  };

  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '40px',
          maxWidth: '500px',
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
        }}>
          <h1 style={{ margin: '0 0 16px 0', fontSize: '32px', fontWeight: 800, color: '#667eea' }}>Register Your Server</h1>
          <p style={{ margin: '0 0 24px 0', fontSize: '16px', color: '#666', lineHeight: 1.6 }}>
            To register your Minecraft server with WhitelistHub, you need to authenticate with Discord first.
          </p>
          <button
            onClick={handleLogin}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '14px 28px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'transform 0.2s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <LogIn size={20} />
            Login with Discord
          </button>
          <p style={{ marginTop: 20, fontSize: 14, opacity: 0.7 }}>
            After login, you'll be redirected back here to complete your server registration.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <header style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#667eea' }}>WhitelistHub</h1>
        <button
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            background: '#f3f4f6',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 600,
            cursor: 'pointer',
            color: '#333'
          }}
        >
          Logout
        </button>
      </header>
      <RegistrationForm user={user} onLogout={handleLogout} />
    </div>
  );
}

export default Registration;
