import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LogOut, RefreshCw, Settings, Users, CheckCircle, XCircle, Copy, Key } from 'lucide-react';
import './AdminPanel.css';

const API_URL = process.env.REACT_APP_API_URL || '';

function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function AdminPanel({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('requests');
  const [requests, setRequests] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [users, setUsers] = useState([]);
  const [userQuery, setUserQuery] = useState('');
  const [registrationFilter, setRegistrationFilter] = useState('all');
  const [showLegacy, setShowLegacy] = useState(false);
  const [hasServers, setHasServers] = useState(false);
  const [config, setConfig] = useState({
    minecraftApiKey: '',
    minecraftServers: {},
    servers: {},
    registrationEnabled: true,
    notificationChannelId: '',
    adminDiscordIds: '',
    clientDiscordIds: '',
    minecraftServerId: 'default',
    minecraftServerDomain: '',
    minecraftWhitelistFile: '',
    clientId: ''
  });
  const [serverIP, setServerIP] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingRequest, setEditingRequest] = useState(null);
  const [minecraftUsername, setMinecraftUsername] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchData();
    try {
      const savedRoles = localStorage.getItem('roles');
      const parsed = savedRoles ? JSON.parse(savedRoles) : null;
      const serverCount = Array.isArray(parsed?.servers) ? parsed.servers.length : 0;
      setHasServers(serverCount > 0);
    } catch {
      setHasServers(false);
    }
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const authToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
      const [requestsRes, configRes, serverRes] = await Promise.all([
        axios.get(`${API_URL}/api/requests`, { headers }),
        axios.get(`${API_URL}/api/config`, { headers }),
        axios.get(`${API_URL}/api/server`, { headers })
      ]);
      setRequests(requestsRes.data);
      const configData = configRes.data;
      setConfig({
        minecraftApiKey: configData.minecraftApiKey || '',
        minecraftServers: configData.minecraftServers || {},
        servers: configData.servers || {},
        registrationEnabled: configData.registrationEnabled !== false,
        notificationChannelId: configData.notificationChannelId || '',
        adminDiscordIds: (configData.adminDiscordIds || []).join('\n'),
        clientDiscordIds: (configData.clientDiscordIds || []).join('\n'),
        minecraftServerId: configData.minecraftServerId || 'default',
        minecraftServerDomain: configData.minecraftServerDomain || '',
        minecraftWhitelistFile: configData.minecraftWhitelistFile || '',
        clientId: configData.clientId || ''
      });
      setServerIP(serverRes.data.ip || '');

      try {
        const regsRes = await axios.get(`${API_URL}/api/platform/registrations`, { headers });
        setRegistrations(Array.isArray(regsRes.data) ? regsRes.data : []);
      } catch (e) {
        setRegistrations([]);
      }

      try {
        const usersRes = await axios.get(`${API_URL}/api/platform/users`, { headers });
        setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
      } catch (e) {
        setUsers([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateServerAPIKey = async () => {
    try {
      const authToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
      const serverId = (config.minecraftServerId || 'default').trim();
      const res = await axios.post(`${API_URL}/api/servers/${encodeURIComponent(serverId)}/key`, {}, { headers });
      const apiKey = res.data.apiKey;
      setConfig(prev => ({
        ...prev,
        servers: {
          ...(prev.servers || {}),
          [serverId]: {
            ...(prev.servers?.[serverId] || {}),
            apiKey
          }
        },
        minecraftServers: {
          ...(prev.minecraftServers || {}),
          [serverId]: { apiKey }
        }
      }));
      alert('Server API key generated');
    } catch (error) {
      console.error('Error generating server api key:', error);
      alert('Failed to generate server API key');
    }
  };

  const reviewRegistration = async (registration, newStatus) => {
    try {
      const authToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
      await axios.put(`${API_URL}/api/platform/registrations/${registration.id}`, { status: newStatus }, { headers });
      await fetchData();
    } catch (error) {
      console.error('Error reviewing registration:', error);
    }
  };

  const updateUserRole = async (discordId, isAdmin, canRegister) => {
    try {
      const authToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
      await axios.put(`${API_URL}/api/platform/users/${encodeURIComponent(discordId)}`, { isAdmin, canRegister }, { headers });
      await fetchData();
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const filteredUsers = users.filter(u => {
    const q = (userQuery || '').trim().toLowerCase();
    if (!q) return true;
    const id = (u.discordId || '').toLowerCase();
    const servers = (u.servers || []).map(s => s.toLowerCase()).join(' ');
    return id.includes(q) || servers.includes(q);
  });

  const filteredRegistrations = registrations
    .filter(r => {
      if (registrationFilter === 'all') return true;
      return r.status === registrationFilter;
    })
    .sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

  const handleConfigSave = async (e) => {
    if (e) e.preventDefault();
    try {
      const authToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
      
      const adminIds = config.adminDiscordIds
        .split('\n')
        .map(id => id.trim())
        .filter(id => id.length > 0);
      
      const clientIds = config.clientDiscordIds
        .split('\n')
        .map(id => id.trim())
        .filter(id => id.length > 0);

      await Promise.all([
        axios.post(`${API_URL}/api/config`, {
          ...config,
          adminDiscordIds: adminIds,
          clientDiscordIds: clientIds
        }, { headers }),
        serverIP ? axios.post(`${API_URL}/api/server`, {
          ip: serverIP
        }, { headers }) : Promise.resolve()
      ]);
      alert('Configuration saved successfully!');
      if (activeTab === 'clients') {
        fetchData();
      }
    } catch (error) {
      console.error('Error saving config:', error);
      alert('Failed to save configuration');
    }
  };

  const handleApprove = async (request) => {
    if (!minecraftUsername && !request.minecraftUsername) {
      alert('Please enter a Minecraft username');
      return;
    }

    try {
      const authToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
      await axios.put(`${API_URL}/api/requests/${request.id}`, {
        status: 'approved',
        minecraftUsername: minecraftUsername || request.minecraftUsername,
        approvedBy: user.username
      }, { headers });
      setEditingRequest(null);
      setMinecraftUsername('');
      fetchData();
    } catch (error) {
      console.error('Error approving request:', error);
      alert('Failed to approve request');
    }
  };

  const handleReject = async (request) => {
    if (!window.confirm('Are you sure you want to reject this request?')) return;

    try {
      const authToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
      await axios.put(`${API_URL}/api/requests/${request.id}`, {
        status: 'rejected',
        approvedBy: user.username
      }, { headers });
      fetchData();
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Failed to reject request');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this request?')) return;

    try {
      const authToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
      await axios.delete(`${API_URL}/api/requests/${id}`, { headers });
      fetchData();
    } catch (error) {
      console.error('Error deleting request:', error);
      alert('Failed to delete request');
    }
  };

  const generateAPIKey = () => {
    // Generate a secure random API key using crypto
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    const apiKey = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    setConfig({ ...config, minecraftApiKey: apiKey });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy:', err);
      alert('Failed to copy to clipboard');
    });
  };

  return (
    <div className="admin-container">
      <header className="admin-header">
        <div className="header-content">
          <h1>WhitelistHub Admin</h1>
          <div className="header-actions">
            <span className="user-info">Admin: {user.username}</span>
            {hasServers && (
              <button onClick={() => { localStorage.setItem('isDeveloper', 'false'); window.location.href = '/'; }} className="btn btn-secondary">
                <Users size={18} /> Switch to Dashboard
              </button>
            )}
            <button onClick={onLogout} className="btn btn-secondary">
              <LogOut size={18} /> Logout
            </button>
          </div>
        </div>
      </header>

      <div className="admin-tabs">
        <button
          className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          <Users size={18} /> Requests
        </button>
        <button
          className={`tab-btn ${activeTab === 'registrations' ? 'active' : ''}`}
          onClick={() => setActiveTab('registrations')}
        >
          <CheckCircle size={18} /> Registrations
        </button>
        <button
          className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <Users size={18} /> Users
        </button>
        <button
          className={`tab-btn ${activeTab === 'config' ? 'active' : ''}`}
          onClick={() => setActiveTab('config')}
        >
          <Settings size={18} /> Configuration
        </button>
      </div>

      <div className="container">
        {activeTab === 'requests' && (
          <div className="card">
            <div className="card-header">
              <h2>Whitelist Requests</h2>
              <button onClick={fetchData} className="btn btn-secondary" disabled={loading}>
                <RefreshCw size={18} className={loading ? 'spinning' : ''} /> Refresh
              </button>
            </div>

            {loading ? (
              <div className="loading">Loading...</div>
            ) : requests.length === 0 ? (
              <div className="empty-state">No requests found</div>
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
                  {requests.map((request) => (
                    <tr key={request.id}>
                      <td>{escapeHtml(request.discordUsername)} ({escapeHtml(request.discordId)})</td>
                      <td>
                        {editingRequest === request.id ? (
                          <input
                            type="text"
                            value={minecraftUsername || request.minecraftUsername}
                            onChange={(e) => setMinecraftUsername(e.target.value)}
                            placeholder="Minecraft username"
                            className="inline-input"
                          />
                        ) : (
                          escapeHtml(request.minecraftUsername || 'Not provided')
                        )}
                      </td>
                      <td>
                        <span className={`badge badge-${request.status}`}>
                          {request.status}
                        </span>
                      </td>
                      <td>{new Date(request.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div className="action-buttons">
                          {request.status === 'pending' && (
                            <>
                              {editingRequest === request.id ? (
                                <>
                                  <button
                                    onClick={() => handleApprove(request)}
                                    className="btn btn-success btn-sm"
                                  >
                                    <CheckCircle size={16} /> Confirm
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingRequest(null);
                                      setMinecraftUsername('');
                                    }}
                                    className="btn btn-secondary btn-sm"
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => {
                                      setEditingRequest(request.id);
                                      setMinecraftUsername(request.minecraftUsername || '');
                                    }}
                                    className="btn btn-success btn-sm"
                                  >
                                    <CheckCircle size={16} /> Approve
                                  </button>
                                  <button
                                    onClick={() => handleReject(request)}
                                    className="btn btn-danger btn-sm"
                                  >
                                    <XCircle size={16} /> Reject
                                  </button>
                                </>
                              )}
                            </>
                          )}
                          <button
                            onClick={() => handleDelete(request.id)}
                            className="btn btn-danger btn-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'registrations' && (
          <div className="card">
            <div className="card-header">
              <h2>Server Registrations</h2>
              <div className="tab-tools">
                <div className="filter-buttons">
                  <button
                    className={`btn btn-sm ${registrationFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setRegistrationFilter('all')}
                  >
                    All
                  </button>
                  <button
                    className={`btn btn-sm ${registrationFilter === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setRegistrationFilter('pending')}
                  >
                    Pending
                  </button>
                  <button
                    className={`btn btn-sm ${registrationFilter === 'approved' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setRegistrationFilter('approved')}
                  >
                    Approved
                  </button>
                  <button
                    className={`btn btn-sm ${registrationFilter === 'rejected' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setRegistrationFilter('rejected')}
                  >
                    Rejected
                  </button>
                </div>
                <button onClick={fetchData} className="btn btn-secondary" disabled={loading}>
                  <RefreshCw size={18} className={loading ? 'spinning' : ''} /> Refresh
                </button>
              </div>
            </div>
            {loading ? (
              <div className="loading">Loading...</div>
            ) : filteredRegistrations.length === 0 ? (
              <div className="empty-state">No {registrationFilter !== 'all' ? registrationFilter : ''} registrations found.</div>
            ) : (
              <div className="registration-list">
                {filteredRegistrations.map((r) => (
                  <div key={r.id} className="registration-item">
                    <div className="registration-item-top">
                      <div>
                        <div className="registration-title">{escapeHtml(r.serverName || r.serverId)} <span style={{ opacity: 0.7 }}>({escapeHtml(r.serverId)})</span></div>
                        <div className="registration-meta">
                          Owner: {escapeHtml(r.ownerDiscordId || '—')} | {escapeHtml(r.serverIp || '—')}:{r.serverPort} | {r.onlineMode ? 'Online' : 'Cracked'}
                        </div>
                      </div>
                      <span className={`badge badge-${r.status}`}>{r.status}</span>
                    </div>

                    {r.status === 'pending' ? (
                      <div className="registration-actions">
                        <button className="btn btn-primary" onClick={() => reviewRegistration(r, 'approved')}>Approve</button>
                        <button className="btn btn-secondary" onClick={() => reviewRegistration(r, 'rejected')}>Reject</button>
                      </div>
                    ) : (
                      <div className="registration-hint">No actions available for this status.</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="card">
            <div className="card-header">
              <h2>Users Management</h2>
              <div className="tab-tools">
                <input
                  className="search-input"
                  placeholder="Search by Discord ID or server..."
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                />
                <button onClick={fetchData} className="btn btn-secondary" disabled={loading}>
                  <RefreshCw size={18} className={loading ? 'spinning' : ''} /> Refresh
                </button>
              </div>
            </div>
            {loading ? (
              <div className="loading">Loading...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="empty-state">No users found.</div>
            ) : (
              <div className="user-list">
                {filteredUsers.map((u) => (
                  <div key={u.discordId} className="user-item">
                    <div className="user-item-top">
                      <div>
                        <div className="user-title">{escapeHtml(u.discordId)}</div>
                        <div className="user-meta">
                          {u.isAdmin && <span className="badge badge-approved">Admin</span>}
                          {u.canRegister && <span className="badge badge-pending">Can Register</span>}
                          {u.servers && u.servers.length > 0 && (
                            <span style={{ opacity: 0.8 }}>Servers: {u.servers.join(', ')}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="user-actions">
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input
                          type="checkbox"
                          checked={!!u.isAdmin}
                          onChange={(e) => updateUserRole(u.discordId, e.target.checked, u.canRegister)}
                        />
                        Admin
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input
                          type="checkbox"
                          checked={!!u.canRegister}
                          onChange={(e) => updateUserRole(u.discordId, u.isAdmin, e.target.checked)}
                        />
                        Can Register
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'config' && (
          <div className="card">
            <h2>Configuration</h2>
            <form onSubmit={handleConfigSave}>
              <div className="input-group">
                <label>Server Registrations</label>
                <div className="action-buttons">
                  <button
                    type="button"
                    className={`btn btn-sm ${config.registrationEnabled ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setConfig({ ...config, registrationEnabled: true })}
                  >
                    Enable
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${!config.registrationEnabled ? 'btn-danger' : 'btn-secondary'}`}
                    onClick={() => setConfig({ ...config, registrationEnabled: false })}
                  >
                    Disable
                  </button>
                </div>
                <small>When disabled, server owners cannot submit new registration requests.</small>
              </div>
              <div className="input-group">
                <label>Discord Client ID (Optional - Auto-filled when bot starts)</label>
                <input
                  type="text"
                  value={config.clientId}
                  onChange={(e) => setConfig({ ...config, clientId: e.target.value })}
                  placeholder="Bot will auto-fill this on startup"
                  disabled
                />
                <small>This is automatically set when the bot starts</small>
              </div>

              <div className="input-group">
                <label>Minecraft Server API Key</label>
                <div className="input-with-buttons">
                  <input
                    type="text"
                    value={config.minecraftApiKey}
                    onChange={(e) => setConfig({ ...config, minecraftApiKey: e.target.value })}
                    placeholder="Enter Minecraft server API key or generate one"
                  />
                  <div className="input-buttons">
                    <button
                      type="button"
                      onClick={generateAPIKey}
                      className="btn btn-secondary btn-sm"
                      title="Generate new API key"
                    >
                      <Key size={16} /> Generate
                    </button>
                    {config.minecraftApiKey && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(config.minecraftApiKey)}
                        className="btn btn-secondary btn-sm"
                        title="Copy API key"
                      >
                        <Copy size={16} /> {copied ? 'Copied!' : 'Copy'}
                      </button>
                    )}
                  </div>
                </div>
                <small>This key must match the one configured on your Minecraft server</small>
              </div>

              <div className="input-group">
                <label>Target Minecraft Server ID</label>
                <input
                  type="text"
                  value={config.minecraftServerId}
                  onChange={(e) => setConfig({ ...config, minecraftServerId: e.target.value })}
                  placeholder="default"
                />
              </div>

              <div className="input-group">
                <label>Target Server API Key</label>
                <div className="input-with-buttons">
                  <input
                    type="text"
                    value={((config.servers && config.servers[config.minecraftServerId]?.apiKey) || (config.minecraftServers && config.minecraftServers[config.minecraftServerId]?.apiKey)) || ''}
                    onChange={(e) => {
                      const sid = (config.minecraftServerId || 'default').trim();
                      setConfig(prev => ({
                        ...prev,
                        servers: {
                          ...(prev.servers || {}),
                          [sid]: {
                            ...(prev.servers?.[sid] || {}),
                            apiKey: e.target.value
                          }
                        },
                        minecraftServers: {
                          ...(prev.minecraftServers || {}),
                          [sid]: { apiKey: e.target.value }
                        }
                      }));
                    }}
                    placeholder="Generate or paste server key"
                  />
                  <div className="input-buttons">
                    <button
                      type="button"
                      onClick={generateServerAPIKey}
                      className="btn btn-secondary btn-sm"
                      title="Generate server key"
                    >
                      <Key size={16} /> Generate
                    </button>
                  </div>
                </div>
              </div>

              <div className="input-group">
                <label>Notification Channel ID</label>
                <input
                  type="text"
                  value={config.notificationChannelId}
                  onChange={(e) => setConfig({ ...config, notificationChannelId: e.target.value })}
                  placeholder="Enter Discord channel ID for notifications"
                />
              </div>

              <div className="input-group">
                <label>Admin Discord IDs</label>
                <textarea
                  value={config.adminDiscordIds}
                  onChange={(e) => setConfig({ ...config, adminDiscordIds: e.target.value })}
                  placeholder="Enter additional Discord IDs for admin access, one per line"
                  rows={5}
                />
                <small>Users with these IDs can access the admin panel.</small>
              </div>

              <div className="card-inner" style={{ marginTop: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div>
                    <h3 style={{ margin: 0 }}>Advanced / Legacy</h3>
                    <div style={{ opacity: 0.8, marginTop: 4 }}>These settings exist for backwards compatibility. Prefer per-server settings in the Server Owner Panel.</div>
                  </div>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowLegacy(v => !v)}>
                    {showLegacy ? 'Hide' : 'Show'}
                  </button>
                </div>

                {showLegacy && (
                  <div style={{ marginTop: 14 }}>
                    <div className="input-group">
                      <label>Legacy: Global Client Discord IDs (one per line)</label>
                      <textarea
                        value={config.clientDiscordIds}
                        onChange={(e) => setConfig({ ...config, clientDiscordIds: e.target.value })}
                        placeholder="Leave empty to deny all. Prefer per-server allowlists."
                        rows={5}
                      />
                    </div>

                    <div className="input-group">
                      <label>Legacy: Minecraft Server Domain/URL</label>
                      <input
                        type="text"
                        value={config.minecraftServerDomain}
                        onChange={(e) => setConfig({ ...config, minecraftServerDomain: e.target.value })}
                        placeholder="(deprecated)"
                      />
                    </div>

                    <div className="input-group">
                      <label>Legacy: Minecraft Whitelist File Path</label>
                      <input
                        type="text"
                        value={config.minecraftWhitelistFile}
                        onChange={(e) => setConfig({ ...config, minecraftWhitelistFile: e.target.value })}
                        placeholder="(deprecated)"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="input-group">
                <label>Minecraft Server IP</label>
                <input
                  type="text"
                  value={serverIP}
                  onChange={(e) => setServerIP(e.target.value)}
                  placeholder="play.example.com or 192.168.1.1:25565"
                />
                <small>This IP will be shown when users use the !ip command</small>
              </div>

              <button type="submit" className="btn btn-primary">
                Save Configuration
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminPanel;
