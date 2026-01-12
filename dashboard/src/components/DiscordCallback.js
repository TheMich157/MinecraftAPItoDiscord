import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '';

function DiscordCallback({ onLogin }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      navigate('/login?error=oauth_failed');
      return;
    }

    if (code) {
      handleCallback(code);
    } else {
      navigate('/login');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCallback = async (code) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/discord/callback`, { code });
      
      if (response.data.success) {
        const { user: userData, roles } = response.data;
        const authToken = userData.discordId;
        
        // Store auth token
        localStorage.setItem('authToken', authToken);
        
        // Call parent login handler
        const hasServers = Array.isArray(roles?.servers) && roles.servers.length > 0;
        onLogin(userData, roles.isAdmin, roles, authToken);
        
        // If user has both roles, they'll see role selector
        // Otherwise redirect based on role
        if (roles.isAdmin && hasServers) {
          // Role selector will be shown by App.js
          window.location.href = '/';
        } else if (roles.isAdmin) {
          window.location.href = '/admin';
        } else if (!hasServers) {
          window.location.href = '/register';
        } else {
          window.location.href = '/dashboard';
        }
      }
    } catch (error) {
      console.error('Discord OAuth error:', error);
      navigate('/login?error=oauth_failed');
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <div style={{ 
        background: 'white', 
        padding: '40px', 
        borderRadius: '12px',
        textAlign: 'center'
      }}>
        <h2>Authenticating with Discord...</h2>
        <p>Please wait while we verify your account.</p>
      </div>
    </div>
  );
}

export default DiscordCallback;
