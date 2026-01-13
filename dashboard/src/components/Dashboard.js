import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { LogOut, RefreshCw, Download, Users, ListChecks, Activity, Settings, Shield } from 'lucide-react';
import './Dashboard.css';

const API_URL = process.env.REACT_APP_API_URL || '';

function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function Dashboard({ user, onLogout, mode = 'dashboard' }) {
  const [loading, setLoading] = useState(true);
  const [registrations, setRegistrations] = useState([]);
  const [serverRoles, setServerRoles] = useState([]);
  const [selectedServerId, setSelectedServerId] = useState('');
  const [activeTab, setActiveTab] = useState('requests');

  const [serverRequests, setServerRequests] = useState([]);
  const [editingRequestId, setEditingRequestId] = useState(null);
  const [minecraftUsername, setMinecraftUsername] = useState('');

  const [serverInfo, setServerInfo] = useState(null);
  const [serverEvents, setServerEvents] = useState([]);
  const [serverState, setServerState] = useState(null);

  const [members, setMembers] = useState({});
  const [newMemberDiscordId, setNewMemberDiscordId] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('dev');

  const [clientDiscordIdsText, setClientDiscordIdsText] = useState('');
  const [whitelistEnabled, setWhitelistEnabled] = useState(true);

  const [serverId, setServerId] = useState('');
  const [serverName, setServerName] = useState('');
  const [serverIp, setServerIp] = useState('');
  const [serverPort, setServerPort] = useState(25565);
  const [onlineMode, setOnlineMode] = useState(true);
  const [toast, setToast] = useState('');

  const authHeaders = useMemo(() => {
    const authToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    return authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
  }, []);

  const canRegister = useMemo(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('roles') || 'null');
      return !!parsed?.canRegister;
    } catch {
      return false;
    }
  }, []);

  const isRegistrationMode = mode === 'registration';

  useEffect(() => {
    const savedRoles = localStorage.getItem('roles');
    try {
      const parsed = savedRoles ? JSON.parse(savedRoles) : null;
      const servers = Array.isArray(parsed?.servers) ? parsed.servers : [];
      setServerRoles(servers);
      if (servers.length > 0) {
        setSelectedServerId(servers[0].serverId);
      }
    } catch {
      setServerRoles([]);
    }

    fetchRegistrations();
  }, []);

  const refreshRoles = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/auth/roles`, { headers: authHeaders });
      const newRoles = res.data?.roles || { isAdmin: false, servers: [], canRegister: false };
      localStorage.setItem('roles', JSON.stringify(newRoles));

      const servers = Array.isArray(newRoles?.servers) ? newRoles.servers : [];
      setServerRoles(servers);
      if (servers.length > 0) {
        setSelectedServerId((prev) => prev || servers[0].serverId);
      }
      return newRoles;
    } catch (error) {
      console.error('Error refreshing roles:', error);
      const msg = error?.response?.data?.error || 'Failed to refresh access';
      setToast(msg);
      setTimeout(() => setToast(''), 3000);
      return null;
    }
  };

  const finishSetup = async (sid) => {
    try {
      if (!sid) return;
      await axios.post(`${API_URL}/api/servers/${encodeURIComponent(sid)}/onboarding/complete`, {}, { headers: authHeaders });
      setToast('Setup completed. Refreshing access...');
      setTimeout(() => setToast(''), 2500);
      await refreshRoles();
      await fetchRegistrations();
    } catch (error) {
      console.error('Error finishing setup:', error);
      const msg = error?.response?.data?.error || 'Failed to finish setup';
      setToast(msg);
      setTimeout(() => setToast(''), 3000);
    }
  };

  const checkServerConnection = async (sid) => {
    try {
      const res = await axios.get(`${API_URL}/api/servers/${encodeURIComponent(sid)}`, { headers: authHeaders });
      return !!res.data?.connected;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    if (!selectedServerId) return;
    fetchServerRequests(selectedServerId);
    fetchServerInfo(selectedServerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedServerId]);

  useEffect(() => {
    if (!selectedServerId) return;
    if (serverRoles.length === 0) return;

    let intervalId = null;
    if (activeTab === 'events') {
      fetchServerEvents(selectedServerId);
      fetchServerState(selectedServerId);
      intervalId = window.setInterval(() => {
        fetchServerEvents(selectedServerId);
        fetchServerState(selectedServerId);
      }, 2000);
    }

    return () => {
      if (intervalId) window.clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedServerId]);

  const fetchRegistrations = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/registrations/me`, { headers: authHeaders });
      setRegistrations(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching registrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchServerInfo = async (sid) => {
    try {
      const res = await axios.get(`${API_URL}/api/servers/${encodeURIComponent(sid)}`, { headers: authHeaders });
      setServerInfo(res.data);
      setWhitelistEnabled(!!res.data?.whitelistEnabled);
      const ids = Array.isArray(res.data?.clientDiscordIds) ? res.data.clientDiscordIds : [];
      setClientDiscordIdsText(ids.join('\n'));
    } catch (error) {
      console.error('Error fetching server info:', error);
      setServerInfo(null);
    }
  };

  const fetchServerEvents = async (sid) => {
    try {
      const res = await axios.get(`${API_URL}/api/servers/${encodeURIComponent(sid)}/events?limit=200`, { headers: authHeaders });
      setServerEvents(Array.isArray(res.data?.events) ? res.data.events : []);
    } catch (error) {
      console.error('Error fetching server events:', error);
      setServerEvents([]);
    }
  };

  const fetchServerState = async (sid) => {
    try {
      const res = await axios.get(`${API_URL}/api/servers/${encodeURIComponent(sid)}/state`, { headers: authHeaders });
      setServerState(res.data?.state || null);
    } catch (error) {
      console.error('Error fetching server state:', error);
      setServerState(null);
    }
  };

  const fetchMembers = async (sid) => {
    try {
      const res = await axios.get(`${API_URL}/api/servers/${encodeURIComponent(sid)}/members`, { headers: authHeaders });
      setMembers(res.data?.members && typeof res.data.members === 'object' ? res.data.members : {});
    } catch (error) {
      console.error('Error fetching members:', error);
      setMembers({});
      const msg = error?.response?.data?.error;
      if (msg) {
        setToast(msg);
        setTimeout(() => setToast(''), 2500);
      }
    }
  };

  const addMember = async (sid) => {
    try {
      const id = (newMemberDiscordId || '').trim();
      if (!id) return;
      await axios.post(`${API_URL}/api/servers/${encodeURIComponent(sid)}/members`, {
        discordId: id,
        role: newMemberRole
      }, { headers: authHeaders });
      setNewMemberDiscordId('');
      await fetchMembers(sid);
    } catch (error) {
      console.error('Error adding member:', error);
      const msg = error?.response?.data?.error || 'Failed to add member';
      setToast(msg);
      setTimeout(() => setToast(''), 3000);
    }
  };

  const updateMemberRole = async (sid, discordId, role) => {
    try {
      await axios.put(`${API_URL}/api/servers/${encodeURIComponent(sid)}/members/${encodeURIComponent(discordId)}`, { role }, { headers: authHeaders });
      await fetchMembers(sid);
    } catch (error) {
      console.error('Error updating member:', error);
      const msg = error?.response?.data?.error || 'Failed to update member';
      setToast(msg);
      setTimeout(() => setToast(''), 3000);
    }
  };

  const removeMember = async (sid, discordId) => {
    try {
      await axios.delete(`${API_URL}/api/servers/${encodeURIComponent(sid)}/members/${encodeURIComponent(discordId)}`, { headers: authHeaders });
      await fetchMembers(sid);
    } catch (error) {
      console.error('Error removing member:', error);
      const msg = error?.response?.data?.error || 'Failed to remove member';
      setToast(msg);
      setTimeout(() => setToast(''), 3000);
    }
  };

  const saveClients = async (sid) => {
    try {
      const ids = clientDiscordIdsText
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean);
      await axios.put(`${API_URL}/api/servers/${encodeURIComponent(sid)}/clients`, { clientDiscordIds: ids }, { headers: authHeaders });
      setToast('Client allowlist saved');
      setTimeout(() => setToast(''), 2000);
      await fetchServerInfo(sid);
    } catch (error) {
      console.error('Error saving clients:', error);
      const msg = error?.response?.data?.error || 'Failed to save clients';
      setToast(msg);
      setTimeout(() => setToast(''), 3000);
    }
  };

  const saveSettings = async (sid) => {
    try {
      await axios.put(`${API_URL}/api/servers/${encodeURIComponent(sid)}/settings`, { whitelistEnabled }, { headers: authHeaders });
      setToast('Settings saved');
      setTimeout(() => setToast(''), 2000);
      await fetchServerInfo(sid);
    } catch (error) {
      console.error('Error saving settings:', error);
      const msg = error?.response?.data?.error || 'Failed to save settings';
      setToast(msg);
      setTimeout(() => setToast(''), 3000);
    }
  };

  const fetchServerRequests = async (sid) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/servers/${encodeURIComponent(sid)}/requests`, { headers: authHeaders });
      setServerRequests(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching server requests:', error);
      setServerRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const approveServerRequest = async (sid, request) => {
    try {
      const finalUsername = (minecraftUsername || request.minecraftUsername || '').trim();
      if (!finalUsername) {
        setToast('Minecraft username is required to approve');
        setTimeout(() => setToast(''), 2500);
        return;
      }

      const authToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
      await axios.put(`${API_URL}/api/servers/${encodeURIComponent(sid)}/requests/${encodeURIComponent(request.id)}`, {
        status: 'approved',
        minecraftUsername: finalUsername
      }, { headers });

      setEditingRequestId(null);
      setMinecraftUsername('');
      fetchServerRequests(sid);
    } catch (error) {
      console.error('Error approving request:', error);
      const msg = error?.response?.data?.error || 'Failed to approve request';
      setToast(msg);
      setTimeout(() => setToast(''), 3000);
    }
  };

  const rejectServerRequest = async (sid, request) => {
    try {
      const authToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
      await axios.put(`${API_URL}/api/servers/${encodeURIComponent(sid)}/requests/${encodeURIComponent(request.id)}`, {
        status: 'rejected'
      }, { headers });
      fetchServerRequests(sid);
    } catch (error) {
      console.error('Error rejecting request:', error);
      const msg = error?.response?.data?.error || 'Failed to reject request';
      setToast(msg);
      setTimeout(() => setToast(''), 3000);
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
        {isRegistrationMode ? (
          <>
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
                  <div className="step-dot step-dot-active">1</div>
                  <div className="step-body">
                    <div className="step-title">Submit registration</div>
                    <div className="step-sub">Server details + online mode</div>
                  </div>
                </div>
                <div className="step-line" />
                <div className="step">
                  <div className="step-dot">2</div>
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
          </>
        ) : (
          <>
            <div className="card dashboard-panel">
              <div className="card-header">
                <h2>Server Owner Panel</h2>
                <button
                  onClick={() => {
                    if (!selectedServerId) return;
                    fetchServerInfo(selectedServerId);
                    if (activeTab === 'requests') fetchServerRequests(selectedServerId);
                    if (activeTab === 'members') fetchMembers(selectedServerId);
                    if (activeTab === 'events') {
                      fetchServerEvents(selectedServerId);
                      fetchServerState(selectedServerId);
                    }
                  }}
                  className="btn btn-secondary"
                  disabled={loading || !selectedServerId}
                >
                  <RefreshCw size={18} className={loading ? 'spinning' : ''} /> Refresh
                </button>
              </div>

              <div className="panel-topbar">
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label>Selected Server</label>
                  <select
                    value={selectedServerId}
                    onChange={(e) => {
                      setSelectedServerId(e.target.value);
                      setActiveTab('requests');
                      setEditingRequestId(null);
                      setMinecraftUsername('');
                    }}
                  >
                    {serverRoles.map((s) => (
                      <option key={s.serverId} value={s.serverId}>{s.serverId} ({s.role})</option>
                    ))}
                  </select>
                </div>

                <div className="server-badges">
                  <span className={`pill ${serverInfo?.connected ? 'pill-ok' : 'pill-bad'}`}>{serverInfo?.connected ? 'Connected' : 'Offline'}</span>
                  <span className={`pill ${serverInfo?.whitelistEnabled ? 'pill-ok' : 'pill-warn'}`}>{serverInfo?.whitelistEnabled ? 'Whitelist ON' : 'Whitelist OFF'}</span>
                </div>

                <button className="btn btn-secondary" disabled={!selectedServerId} onClick={() => downloadPluginConfig(selectedServerId)}>
                  <Download size={18} /> Download plugin config
                </button>
              </div>

              <div className="tabs">
                <button className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`} onClick={() => { setActiveTab('requests'); fetchServerRequests(selectedServerId); }}>
                  <ListChecks size={18} /> Requests
                </button>
                <button className={`tab-btn ${activeTab === 'members' ? 'active' : ''}`} onClick={() => { setActiveTab('members'); fetchMembers(selectedServerId); }}>
                  <Users size={18} /> Members
                </button>
                <button className={`tab-btn ${activeTab === 'allowlist' ? 'active' : ''}`} onClick={() => { setActiveTab('allowlist'); fetchServerInfo(selectedServerId); }}>
                  <Shield size={18} /> Allowlist
                </button>
                <button className={`tab-btn ${activeTab === 'events' ? 'active' : ''}`} onClick={() => { setActiveTab('events'); }}>
                  <Activity size={18} /> Events
                </button>
                <button className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => { setActiveTab('settings'); fetchServerInfo(selectedServerId); }}>
                  <Settings size={18} /> Settings
                </button>
              </div>

              <div className="tab-body">
                {activeTab === 'requests' && (
                  <div className="fade-in">
                    <h3>Whitelist Requests</h3>
                    {loading ? (
                      <div className="loading">Loading...</div>
                    ) : serverRequests.length === 0 ? (
                      <div className="empty-state">No requests found for this server.</div>
                    ) : (
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Discord User</th>
                            <th>Minecraft Username</th>
                            <th>Status</th>
                            <th>Submitted</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {serverRequests.map((r) => (
                            <tr key={r.id}>
                              <td>{escapeHtml(r.discordUsername)} ({escapeHtml(r.discordId)})</td>
                              <td>
                                {editingRequestId === r.id ? (
                                  <input
                                    type="text"
                                    value={minecraftUsername || r.minecraftUsername}
                                    onChange={(e) => setMinecraftUsername(e.target.value)}
                                    placeholder="Minecraft username"
                                    className="inline-input"
                                  />
                                ) : (
                                  escapeHtml(r.minecraftUsername || 'Not provided')
                                )}
                              </td>
                              <td>
                                <span className={`badge badge-${r.status}`}>{r.status}</span>
                              </td>
                              <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                              <td>
                                {r.status === 'pending' ? (
                                  <div className="action-buttons">
                                    {editingRequestId === r.id ? (
                                      <>
                                        <button className="btn btn-success btn-sm" onClick={() => approveServerRequest(selectedServerId, r)}>
                                          Confirm
                                        </button>
                                        <button className="btn btn-secondary btn-sm" onClick={() => { setEditingRequestId(null); setMinecraftUsername(''); }}>
                                          Cancel
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button className="btn btn-success btn-sm" onClick={() => { setEditingRequestId(r.id); setMinecraftUsername(r.minecraftUsername || ''); }}>
                                          Approve
                                        </button>
                                        <button className="btn btn-danger btn-sm" onClick={() => rejectServerRequest(selectedServerId, r)}>
                                          Reject
                                        </button>
                                      </>
                                    )}
                                  </div>
                                ) : (
                                  <span style={{ opacity: 0.8 }}>—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {activeTab === 'members' && (
                  <div className="fade-in">
                    <h3>Members & Roles</h3>
                    <div className="grid-2">
                      <div className="card-inner">
                        <h4>Add member</h4>
                        <div className="input-group">
                          <label>Discord ID</label>
                          <input value={newMemberDiscordId} onChange={(e) => setNewMemberDiscordId(e.target.value)} placeholder="123456789012345678" />
                        </div>
                        <div className="input-group">
                          <label>Role</label>
                          <select value={newMemberRole} onChange={(e) => setNewMemberRole(e.target.value)}>
                            <option value="owner">owner</option>
                            <option value="dev">dev</option>
                            <option value="viewer">viewer</option>
                          </select>
                        </div>
                        <button className="btn btn-primary" onClick={() => addMember(selectedServerId)} disabled={!selectedServerId}>Add</button>
                        <div style={{ marginTop: 10, opacity: 0.8 }}>Only owners can add/remove members. Devs can view members.</div>
                      </div>

                      <div className="card-inner">
                        <h4>Current members</h4>
                        {Object.keys(members || {}).length === 0 ? (
                          <div className="empty-state">No members returned (or you don't have permission).</div>
                        ) : (
                          <table className="table">
                            <thead>
                              <tr>
                                <th>Discord ID</th>
                                <th>Role</th>
                                <th>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.entries(members).map(([id, info]) => (
                                <tr key={id}>
                                  <td>{escapeHtml(id)}</td>
                                  <td>
                                    <select value={info?.role || 'viewer'} onChange={(e) => updateMemberRole(selectedServerId, id, e.target.value)}>
                                      <option value="owner">owner</option>
                                      <option value="dev">dev</option>
                                      <option value="viewer">viewer</option>
                                    </select>
                                  </td>
                                  <td>
                                    <button className="btn btn-danger btn-sm" onClick={() => removeMember(selectedServerId, id)}>Remove</button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'allowlist' && (
                  <div className="fade-in">
                    <h3>Client Allowlist (Discord IDs)</h3>
                    <div className="card-inner">
                      <div className="input-group">
                        <label>Allowed client Discord IDs (one per line)</label>
                        <textarea rows={8} value={clientDiscordIdsText} onChange={(e) => setClientDiscordIdsText(e.target.value)} />
                        <small>Only these users can use the bot command to request whitelist for this server.</small>
                      </div>
                      <button className="btn btn-primary" onClick={() => saveClients(selectedServerId)} disabled={!selectedServerId}>Save allowlist</button>
                    </div>
                  </div>
                )}

                {activeTab === 'events' && (
                  <div className="fade-in">
                    <h3>Live Events & State</h3>
                    <div className="grid-2">
                      <div className="card-inner">
                        <h4>Server state</h4>
                        {!serverState ? (
                          <div className="empty-state">No state received yet.</div>
                        ) : (
                          <pre className="code-block">{JSON.stringify(serverState, null, 2)}</pre>
                        )}
                      </div>
                      <div className="card-inner">
                        <h4>Recent events</h4>
                        {serverEvents.length === 0 ? (
                          <div className="empty-state">No events received yet.</div>
                        ) : (
                          <div className="event-feed">
                            {serverEvents.slice().reverse().map((ev, idx) => (
                              <div key={`${ev.ts}-${idx}`} className="event-item">
                                <div className="event-meta">
                                  <span className="event-type">{ev.type}</span>
                                  <span className="event-ts">{new Date(ev.ts).toLocaleTimeString()}</span>
                                </div>
                                {ev.payload && Object.keys(ev.payload).length > 0 && (
                                  <div className="event-payload">{JSON.stringify(ev.payload)}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'settings' && (
                  <div className="fade-in">
                    <h3>Server Settings</h3>
                    <div className="card-inner">
                      <div className="input-group">
                        <label>Whitelist</label>
                        <select value={whitelistEnabled ? 'on' : 'off'} onChange={(e) => setWhitelistEnabled(e.target.value === 'on')}>
                          <option value="on">Enabled</option>
                          <option value="off">Disabled</option>
                        </select>
                        <small>If disabled, requests can still be submitted but approvals will be blocked.</small>
                      </div>
                      <button className="btn btn-primary" onClick={() => saveSettings(selectedServerId)} disabled={!selectedServerId}>Save settings</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
      {toast && (
        <div className="toast-notification">{toast}</div>
      )}
    </div>
  );
}

export default Dashboard;
