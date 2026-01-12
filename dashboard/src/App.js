import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import Landing from './components/Landing';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import AdminPanel from './components/AdminPanel';
import RoleSelector from './components/RoleSelector';
import DiscordCallback from './components/DiscordCallback';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || '';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isDeveloper, setIsDeveloper] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [user, setUser] = useState(null);
  const [showRoleSelector, setShowRoleSelector] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    const savedUser = localStorage.getItem('user');
    const savedAuth = localStorage.getItem('isAuthenticated');
    const savedDev = localStorage.getItem('isDeveloper');
    const savedClient = localStorage.getItem('isClient');
    
    if (savedUser && savedAuth === 'true') {
      const userData = JSON.parse(savedUser);
      setUser(userData);
      setIsAuthenticated(true);
      setIsDeveloper(savedDev === 'true');
      setIsClient(savedClient === 'true');
      
      // Check if user has both roles
      if (savedDev === 'true' && savedClient === 'true') {
        setShowRoleSelector(true);
      }
    }
  }, []);

  const handleLogin = (userData, developer = false, isClientUser = false, authToken = null) => {
    setUser(userData);
    setIsAuthenticated(true);
    setIsDeveloper(developer);
    setIsClient(isClientUser);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('isDeveloper', developer.toString());
    localStorage.setItem('isClient', isClientUser.toString());
    if (authToken) {
      localStorage.setItem('authToken', authToken);
    }
    
    // Check if user has both roles
    if (developer && isClientUser) {
      setShowRoleSelector(true);
    }
  };

  const handleRoleSelect = (role) => {
    if (role === 'admin') {
      setIsDeveloper(true);
      setIsClient(false);
      localStorage.setItem('isDeveloper', 'true');
      localStorage.setItem('isClient', 'false');
      setShowRoleSelector(false);
      window.location.href = '/admin';
    } else {
      setIsDeveloper(false);
      setIsClient(true);
      localStorage.setItem('isDeveloper', 'false');
      localStorage.setItem('isClient', 'true');
      setShowRoleSelector(false);
      window.location.href = '/dashboard';
    }
  };

  const handleLogout = () => {
    setUser(null);
    setIsAuthenticated(false);
    setIsDeveloper(false);
    setIsClient(false);
    setShowRoleSelector(false);
    localStorage.removeItem('user');
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('isDeveloper');
    localStorage.removeItem('isClient');
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('authToken');
  };

  if (showRoleSelector && user) {
    return (
      <div className="App">
        <RoleSelector user={user} onSelectRole={handleRoleSelect} />
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route 
            path="/auth/discord/callback" 
            element={
              <DiscordCallback onLogin={handleLogin} />
            } 
          />
          <Route 
            path="/login" 
            element={
              !isAuthenticated ? (
                <Login onLogin={handleLogin} />
              ) : (
                <Navigate to={showRoleSelector ? "/" : (isDeveloper ? "/admin" : "/dashboard")} />
              )
            } 
          />
          <Route 
            path="/dashboard" 
            element={
              isAuthenticated && (isClient || isDeveloper) ? (
                <Dashboard user={user} onLogout={handleLogout} />
              ) : (
                <Navigate to="/login" />
              )
            } 
          />
          <Route 
            path="/admin" 
            element={
              isAuthenticated && isDeveloper ? (
                <AdminPanel user={user} onLogout={handleLogout} />
              ) : (
                <Navigate to="/login" />
              )
            } 
          />
          <Route path="/" element={
            showRoleSelector && user ? (
              <RoleSelector user={user} onSelectRole={handleRoleSelect} />
            ) : isAuthenticated ? (
              <Navigate to={isDeveloper ? "/admin" : "/dashboard"} />
            ) : (
              <Landing />
            )
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
