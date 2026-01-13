import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import Landing from './components/Landing';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Registration from './components/Registration';
import AdminPanel from './components/AdminPanel';
import RoleSelector from './components/RoleSelector';
import DiscordCallback from './components/DiscordCallback';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || '';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isDeveloper, setIsDeveloper] = useState(false);
  const [hasServers, setHasServers] = useState(false);
  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState({ isAdmin: false, servers: [], canRegister: false });
  const [showRoleSelector, setShowRoleSelector] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    const savedUser = localStorage.getItem('user');
    const savedAuth = localStorage.getItem('isAuthenticated');
    const savedDev = localStorage.getItem('isDeveloper');
    const savedRoles = localStorage.getItem('roles');
    
    if (savedUser && savedAuth === 'true') {
      const userData = JSON.parse(savedUser);
      setUser(userData);
      setIsAuthenticated(true);
      const isAdmin = savedDev === 'true';
      setIsDeveloper(isAdmin);
      let parsedRoles = { isAdmin, servers: [], canRegister: false };
      try {
        parsedRoles = savedRoles ? JSON.parse(savedRoles) : parsedRoles;
      } catch {
      }
      setRoles(parsedRoles);
      const serverCount = Array.isArray(parsedRoles.servers) ? parsedRoles.servers.length : 0;
      setHasServers(serverCount > 0);
      
      // Check if user has both roles
      if (isAdmin && serverCount > 0) {
        setShowRoleSelector(true);
      }
    }
  }, []);

  const handleLogin = (userData, developer = false, userRoles = { isAdmin: false, servers: [], canRegister: false }, authToken = null) => {
    setUser(userData);
    setIsAuthenticated(true);
    setIsDeveloper(!!developer);
    setRoles(userRoles || { isAdmin: !!developer, servers: [], canRegister: false });
    const serverCount = Array.isArray(userRoles?.servers) ? userRoles.servers.length : 0;
    setHasServers(serverCount > 0);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('isDeveloper', (!!developer).toString());
    localStorage.setItem('roles', JSON.stringify(userRoles || { isAdmin: !!developer, servers: [], canRegister: false }));
    if (authToken) {
      localStorage.setItem('authToken', authToken);
    }
    
    // Check if user has both roles
    if (developer && serverCount > 0) {
      setShowRoleSelector(true);
    }
  };

  const handleRoleSelect = (role) => {
    if (role === 'admin') {
      setIsDeveloper(true);
      localStorage.setItem('isDeveloper', 'true');
      setShowRoleSelector(false);
      window.location.href = '/admin';
    } else {
      setIsDeveloper(false);
      localStorage.setItem('isDeveloper', 'false');
      setShowRoleSelector(false);
      window.location.href = '/dashboard';
    }
  };

  const handleLogout = () => {
    setUser(null);
    setIsAuthenticated(false);
    setIsDeveloper(false);
    setHasServers(false);
    setRoles({ isAdmin: false, servers: [], canRegister: false });
    setShowRoleSelector(false);
    localStorage.removeItem('user');
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('isDeveloper');
    localStorage.removeItem('roles');
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
                <Navigate to={showRoleSelector ? "/" : (isDeveloper ? "/admin" : (hasServers ? "/dashboard" : "/registration"))} />
              )
            } 
          />
          <Route 
            path="/dashboard" 
            element={
              isAuthenticated && (!isDeveloper && hasServers) ? (
                <Dashboard user={user} onLogout={handleLogout} />
              ) : (
                <Navigate to="/login" />
              )
            } 
          />

          <Route
            path="/registration"
            element={
              isAuthenticated && !isDeveloper && (roles.canRegister || !hasServers) ? (
                <Registration user={user} onLogout={handleLogout} />
              ) : (
                <Navigate to={isAuthenticated ? (isDeveloper ? "/admin" : "/dashboard") : "/login"} />
              )
            }
          />

          <Route path="/register" element={<Navigate to="/registration" replace />} />
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
              <Navigate to={isDeveloper ? "/admin" : (hasServers ? "/dashboard" : "/registration")} />
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
