import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LogOut, RefreshCw } from 'lucide-react';
import './Dashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function Dashboard({ user, onLogout }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [minecraftUsername, setMinecraftUsername] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const authToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
      
      const response = await axios.get(`${API_URL}/api/requests`, { headers });
      // Filter to show only user's requests (use discordId from user object)
      const userDiscordId = user.discordId || user.id;
      const userRequests = response.data.filter(r => r.discordId === userDiscordId);
      setRequests(userRequests);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!minecraftUsername) {
      alert('Please enter your Minecraft username');
      return;
    }

    try {
      await axios.post(`${API_URL}/api/requests`, {
        discordId: user.discordId || user.id,
        discordUsername: user.username,
        minecraftUsername: minecraftUsername
      });
      setMinecraftUsername('');
      fetchRequests();
      setToast('Whitelist request submitted successfully!');
      setTimeout(() => setToast(''), 3000);
    } catch (error) {
      console.error('Error submitting request:', error);
      setToast('Failed to submit request. Please try again.');
      setTimeout(() => setToast(''), 3000);
    }
  };

  const copyApiUrl = async () => {
    try {
      await navigator.clipboard.writeText(API_URL);
      setToast('API URL copied to clipboard');
      setTimeout(() => setToast(''), 2500);
    } catch (err) {
      setToast('Failed to copy');
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
          <h2>Submit Whitelist Request</h2>
          <form onSubmit={handleSubmitRequest}>
            <div className="input-group">
              <label>Minecraft Username</label>
              <input
                type="text"
                value={minecraftUsername}
                onChange={(e) => setMinecraftUsername(e.target.value)}
                placeholder="Enter your Minecraft username"
                required
              />
            </div>
            <button type="submit" className="btn btn-primary">
              Submit Request
            </button>
          </form>
            <div style={{ marginTop: 12 }}>
              <button onClick={copyApiUrl} className="btn btn-secondary">Copy API URL</button>
            </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2>My Requests</h2>
            <button onClick={fetchRequests} className="btn btn-secondary" disabled={loading}>
              <RefreshCw size={18} className={loading ? 'spinning' : ''} /> Refresh
            </button>
          </div>

          {loading ? (
            <div className="loading">Loading...</div>
          ) : requests.length === 0 ? (
            <div className="empty-state">No requests found. Submit a request above!</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Minecraft Username</th>
                  <th>Status</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id}>
                    <td>{escapeHtml(request.minecraftUsername || 'Not provided')}</td>
                    <td>
                      <span className={`badge badge-${request.status}`}>
                        {request.status}
                      </span>
                    </td>
                    <td>{new Date(request.createdAt).toLocaleDateString()}</td>
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
