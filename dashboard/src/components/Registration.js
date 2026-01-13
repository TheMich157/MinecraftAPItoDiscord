import React from 'react';
import { useNavigate } from 'react-router-dom';
import Dashboard from './Dashboard';

function Registration({ user, onLogout }) {
  const navigate = useNavigate();

  return (
    <Dashboard
      user={user}
      onLogout={() => {
        onLogout();
        navigate('/login');
      }}
      mode="registration"
    />
  );
}

export default Registration;
