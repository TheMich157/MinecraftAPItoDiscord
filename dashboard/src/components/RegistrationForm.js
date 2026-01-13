import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { RefreshCw, Download } from 'lucide-react';
import './RegistrationForm.css';

const API_URL = process.env.REACT_APP_API_URL || '';

function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function RegistrationForm({ user, onLogout }) {
  const [loading, setLoading] = useState(true);
  const [registrations, setRegistrations] = useState([]);
  const [canRegister, setCanRegister] = useState(false);
  const [toast, setToast] = useState('');

  const [serverId, setServerId] = useState('');
  const [serverName, setServerName] = useState('');
  const [serverIp, setServerIp] = useState('');
  const [serverPort, setServerPort] = useState(25565);
  const [onlineMode, setOnlineMode] = useState(true);

  const authHeaders = useMemo(() => {
    const authToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    return authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
  }, []);

  const registrationProgress = useMemo(() => {
    const regs = Array.isArray(registrations) ? registrations : [];
    if (regs.length === 0) return 1;
    if (regs.some(r => r.status === 'approved')) return 2;
    return 1;
  }, [registrations]);

  const fetchRegistrations = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/registrations/me`, { headers: authHeaders });
      setRegistrations(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching registrations:', error);
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  const refreshRoles = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/auth/roles`, { headers: authHeaders });
      const newRoles = res.data?.roles || { isAdmin: false, servers: [], canRegister: false };
      localStorage.setItem('roles', JSON.stringify(newRoles));
      setCanRegister(!!newRoles.canRegister);
      window.location.reload();
    } catch (error) {
      console.error('Error refreshing roles:', error);
    }
  };

  useEffect(() => {
    const savedRoles = localStorage.getItem('roles');
    try {
      const parsed = savedRoles ? JSON.parse(savedRoles) : null;
      setCanRegister(!!parsed?.canRegister);
    } catch {
      setCanRegister(false);
    }

    fetchRegistrations();
  }, [fetchRegistrations]);

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

  const checkServerConnection = async (sid) => {
    try {
      const res = await axios.get(`${API_URL}/api/servers/${encodeURIComponent(sid)}/state`, { headers: authHeaders });
      return !!res.data?.state?.connected;
    } catch {
      return false;
    }
  };

  const finishSetup = async (sid) => {
    try {
      await axios.post(`${API_URL}/api/registrations/${encodeURIComponent(sid)}/finish`, {}, { headers: authHeaders });
      setToast('Setup complete! Redirecting to dashboard...');
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1500);
    } catch (error) {
      console.error('Error finishing setup:', error);
      const msg = error?.response?.data?.error || 'Failed to finish setup';
      setToast(msg);
      setTimeout(() => setToast(''), 3000);
    }
  };

  return (
    <div className="registration-form-container">
      {toast && <div className="toast">{toast}</div>}

      <div className="card registration-hero">
        <div className="registration-hero-top">
          <div>
            <h2 style={{ marginBottom: 6 }}>Registration</h2>
            <div style={{ opacity: 0.8 }}>Complete the 3-step onboarding to activate your server owner access.</div>
          </div>
          <button className="btn btn-secondary" onClick={async () => { await refreshRoles(); await fetchRegistrations(); }}>
            <RefreshCw size={18} /> Refresh access
          </button>
        </div>
        <div className="stepper">
          <div className="step">
            <div className={`step-dot ${registrationProgress === 1 ? 'step-dot-active' : ''}`}>1</div>
            <div className="step-body">
              <div className="step-title">Submit registration</div>
              <div className="step-sub">Server details + online mode</div>
            </div>
          </div>
          <div className="step-line" />
          <div className="step">
            <div className={`step-dot ${registrationProgress === 2 ? 'step-dot-active' : ''}`}>2</div>
            <div className="step-body">
              <div className="step-title">Download config</div>
              <div className="step-sub">After admin approval</div>
            </div>
          </div>
          <div className="step-line" />
          <div className="step">
            <div className="step-dot">3</div>
            <div className="step-body">
              <div className="step-title">Finish setup</div>
              <div className="step-sub">Plugin connects + confirm</div>
            </div>
          </div>
        </div>
        {registrationProgress >= 2 && (
          <div style={{ marginTop: 10, opacity: 0.85 }}>
            After downloading config, install the plugin on your Minecraft server, start it, then return here and click <b>Finish setup</b>.
          </div>
        )}
      </div>

      <div className="grid-2">
        {canRegister ? (
          <div className="card">
            <div className="card-header" style={{ alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ marginBottom: 6 }}>Step 1/3 — Submit server details</h2>
                <div style={{ opacity: 0.8 }}>A platform admin must approve before you can download the plugin config.</div>
              </div>
            </div>
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
        ) : (
          <div className="card">
            <h2>Access required</h2>
            <p style={{ marginTop: 4, opacity: 0.8 }}>You are not currently allowed to register a server. If you believe this is a mistake, ask a platform admin to enable registrations or add you as a server member.</p>
            <div className="action-buttons">
              <button className="btn btn-secondary" onClick={() => { fetchRegistrations(); refreshRoles(); }}>
                <RefreshCw size={18} /> Refresh access
              </button>
              <button className="btn btn-secondary" onClick={() => window.location.href = '/'}>
                Back to Home
              </button>
            </div>
          </div>
        )}

        <div className="card">
          <div className="card-header">
            <div>
              <h2 style={{ marginBottom: 6 }}>Step 2/3 — Download config</h2>
              <div style={{ opacity: 0.8 }}>Then install the plugin and start your Minecraft server.</div>
            </div>
            <button onClick={fetchRegistrations} className="btn btn-secondary" disabled={loading}>
              <RefreshCw size={18} className={loading ? 'spinning' : ''} /> Refresh
            </button>
          </div>

          {loading ? (
            <div className="loading">Loading...</div>
          ) : registrations.length === 0 ? (
            <div className="empty-state">No registrations found. Submit one above!</div>
          ) : (
            <div className="registration-list">
              {registrations.map((r) => (
                <div key={r.id} className="registration-item">
                  <div className="registration-item-top">
                    <div>
                      <div className="registration-title">{escapeHtml(r.serverName || r.serverId)} <span style={{ opacity: 0.7 }}>({escapeHtml(r.serverId)})</span></div>
                      <div className="registration-meta">Submitted {new Date(r.createdAt).toLocaleDateString()}</div>
                    </div>
                    <span className={`badge badge-${r.status}`}>{r.status}</span>
                  </div>

                  {r.status === 'approved' ? (
                    <div className="registration-actions">
                      <button className="btn btn-secondary" onClick={() => downloadPluginConfig(r.serverId)}>
                        <Download size={18} /> Download config (Step 2/3)
                      </button>
                      <button
                        className="btn btn-primary"
                        onClick={async () => {
                          const connected = await checkServerConnection(r.serverId);
                          if (!connected) {
                            setToast('Server is not connected yet. Start the Minecraft server with the plugin installed, then try again.');
                            setTimeout(() => setToast(''), 3500);
                            return;
                          }
                          await finishSetup(r.serverId);
                        }}
                      >
                        Finish setup (Step 3/3)
                      </button>
                    </div>
                  ) : r.status === 'pending' ? (
                    <div className="registration-hint">Waiting for approval from a platform admin.</div>
                  ) : (
                    <div className="registration-hint">Rejected. Contact a platform admin if you believe this is a mistake.</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RegistrationForm;
