import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LogOut, RefreshCw, Download } from 'lucide-react';
import './Dashboard.css';

const API_URL = process.env.REACT_APP_API_URL || '';

function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function Dashboard({ user, onLogout }) {
  const [loading, setLoading] = useState(true);
  const [registrations, setRegistrations] = useState([]);
  const [serverId, setServerId] = useState('');
  const [serverName, setServerName] = useState('');
  const [serverIp, setServerIp] = useState('');
  const [serverPort, setServerPort] = useState(25565);
  const [onlineMode, setOnlineMode] = useState(true);
  const [toast, setToast] = useState('');

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const fetchRegistrations = async () => {
    try {
      const authToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};

      const response = await axios.get(`${API_URL}/api/registrations/me`, { headers });
      setRegistrations(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching registrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRegistration = async (e) => {
    e.preventDefault();
    try {
      const authToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};

      await axios.post(`${API_URL}/api/registrations`, {
        serverId,
        serverName,
        serverIp,
        serverPort,
        onlineMode
      }, { headers });

      setServerId('');
      setServerName('');
      setServerIp('');
      setServerPort(25565);
      setOnlineMode(true);
      await fetchRegistrations();
      setToast('Registration submitted! Waiting for platform admin approval.');
      setTimeout(() => setToast(''), 3000);
    } catch (error) {
      console.error('Error submitting registration:', error);
      const msg = error?.response?.data?.error || 'Failed to submit registration. Please try again.';
      setToast(msg);
      setTimeout(() => setToast(''), 3000);
    }
  };

  const downloadPluginConfig = async (approvedServerId) => {
    try {
      const authToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
      const response = await axios.get(`${API_URL}/api/servers/${encodeURIComponent(approvedServerId)}/plugin-config`, {
        headers,
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'text/yaml' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `WhitelistHub-${approvedServerId}-config.yml`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading plugin config:', error);
      setToast('Failed to download config');
      setTimeout(() => setToast(''), 2500);
    }
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>WhitelistHub</h1>
          <div className="header-actions">
            <span className="user-info">Welcome, {user.username}</span>
            <button onClick={onLogout} className="btn btn-secondary">
              <LogOut size={18} /> Logout
            </button>
          </div>
        </div>
      </header>

      <div className="container">
        <div className="card">
          <h2>Register Your Server</h2>
          <p style={{ marginTop: 4, opacity: 0.8 }}>Submit your server details. A platform admin must approve your registration before you can generate the plugin config.</p>
          <form onSubmit={handleSubmitRegistration}>
            <div className="input-group">
              <label>Server ID</label>
              <input
                type="text"
                value={serverId}
                onChange={(e) => setServerId(e.target.value)}
                placeholder="e.g. survival"
                required
              />
            </div>
            <div className="input-group">
              <label>Server Name</label>
              <input
                type="text"
                value={serverName}
                onChange={(e) => setServerName(e.target.value)}
                placeholder="e.g. My Survival Server"
              />
            </div>
            <div className="input-group">
              <label>Server IP</label>
              <input
                type="text"
                value={serverIp}
                onChange={(e) => setServerIp(e.target.value)}
                placeholder="e.g. play.example.com"
                required
              />
            </div>
            <div className="input-group">
              <label>Server Port</label>
              <input
                type="number"
                value={serverPort}
                onChange={(e) => setServerPort(parseInt(e.target.value || '25565', 10))}
                min={1}
                max={65535}
              />
            </div>
            <div className="input-group">
              <label>Online Mode</label>
              <select value={onlineMode ? 'online' : 'cracked'} onChange={(e) => setOnlineMode(e.target.value === 'online')}>
                <option value="online">Online (Premium)</option>
                <option value="cracked">Cracked</option>
              </select>
              <small>You can change this later.</small>
            </div>
            <button type="submit" className="btn btn-primary">
              Submit Registration
            </button>
          </form>
        </div>

        <div className="card">
          <div className="card-header">
            <h2>My Registrations</h2>
            <button onClick={fetchRegistrations} className="btn btn-secondary" disabled={loading}>
              <RefreshCw size={18} className={loading ? 'spinning' : ''} /> Refresh
            </button>
          </div>

          {loading ? (
            <div className="loading">Loading...</div>
          ) : registrations.length === 0 ? (
            <div className="empty-state">No registrations found. Submit one above!</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Server</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Next step</th>
                </tr>
              </thead>
              <tbody>
                {registrations.map((r) => (
                  <tr key={r.id}>
                    <td>{escapeHtml(r.serverName || r.serverId)} ({escapeHtml(r.serverId)})</td>
                    <td>
                      <span className={`badge badge-${r.status}`}>
                        {r.status}
                      </span>
                    </td>
                    <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td>
                      {r.status === 'approved' ? (
                        <button className="btn btn-secondary" onClick={() => downloadPluginConfig(r.serverId)}>
                          <Download size={18} /> Download config
                        </button>
                      ) : r.status === 'pending' ? (
                        <span style={{ opacity: 0.8 }}>Waiting for approval</span>
                      ) : (
                        <span style={{ opacity: 0.8 }}>Rejected</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      {toast && (
        <div className="toast-notification">{toast}</div>
      )}
    </div>
  );
}

export default Dashboard;
