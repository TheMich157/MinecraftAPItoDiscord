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
  const [config, setConfig] = useState({
    botToken: '',
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
  const [newClientId, setNewClientId] = useState('');
  const [serverIP, setServerIP] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingRequest, setEditingRequest] = useState(null);
  const [minecraftUsername, setMinecraftUsername] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchData();
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
        botToken: configData.botToken || '',
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

  const reviewRegistration = async (registration, status) => {
    try {
      const authToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
      await axios.put(`${API_URL}/api/platform/registrations/${registration.id}`, { status }, { headers });
      fetchData();
    } catch (error) {
      console.error('Error reviewing registration:', error);
      alert('Failed to review registration');
    }
  };

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

  const handleAddClientId = () => {
    if (!newClientId.trim()) {
      alert('Please enter a Discord ID');
      return;
    }
    
    const currentIds = config.clientDiscordIds.split('\n').filter(id => id.trim().length > 0);
    if (currentIds.includes(newClientId.trim())) {
      alert('This Discord ID is already in the list');
      return;
    }
    
    setConfig({
      ...config,
      clientDiscordIds: [...currentIds, newClientId.trim()].join('\n')
    });
    setNewClientId('');
  };

  const handleRemoveClientId = (idToRemove) => {
    const currentIds = config.clientDiscordIds.split('\n').filter(id => id.trim() !== idToRemove.trim());
    setConfig({
      ...config,
      clientDiscordIds: currentIds.join('\n')
    });
  };

  return (
    <div className="admin-container">
      <header className="admin-header">
        <div className="header-content">
          <h1>WhitelistHub Admin</h1>
          <div className="header-actions">
            <span className="user-info">Admin: {user.username}</span>
            <button onClick={onLogout} className="btn btn-secondary">
              <LogOut size={18} /> Logout
            </button>
          </div>
        </div>
      </header>

      <div className="admin-tabs">
        <button
          className={`tab ${activeTab === 'requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          <Users size={18} /> Whitelist Requests
        </button>
        <button
          className={`tab ${activeTab === 'registrations' ? 'active' : ''}`}
          onClick={() => setActiveTab('registrations')}
        >
          <Users size={18} /> Server Registrations
        </button>
        <button
          className={`tab ${activeTab === 'config' ? 'active' : ''}`}
          onClick={() => setActiveTab('config')}
        >
          <Settings size={18} /> Configuration
        </button>
        <button
          className={`tab ${activeTab === 'clients' ? 'active' : ''}`}
          onClick={() => setActiveTab('clients')}
        >
          <Users size={18} /> Client Management
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
            <h2>Server Registrations</h2>
            {registrations.length === 0 ? (
              <div className="empty-state">No registrations found.</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Server ID</th>
                    <th>Name</th>
                    <th>Owner</th>
                    <th>IP</th>
                    <th>Port</th>
                    <th>Mode</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((r) => (
                    <tr key={r.id}>
                      <td>{escapeHtml(r.serverId)}</td>
                      <td>{escapeHtml(r.serverName || '')}</td>
                      <td>{escapeHtml(r.ownerDiscordId || '')}</td>
                      <td>{escapeHtml(r.serverIp || '')}</td>
                      <td>{r.serverPort}</td>
                      <td>{r.onlineMode ? 'Online' : 'Cracked'}</td>
                      <td>
                        <span className={`badge badge-${r.status}`}>{r.status}</span>
                      </td>
                      <td>
                        {r.status === 'pending' ? (
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-primary" onClick={() => reviewRegistration(r, 'approved')}>Approve</button>
                            <button className="btn btn-secondary" onClick={() => reviewRegistration(r, 'rejected')}>Reject</button>
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

        {activeTab === 'config' && (
          <div className="card">
            <h2>Configuration</h2>
            <form onSubmit={handleConfigSave}>
              <div className="input-group">
                <label>Server Registrations</label>
                <select
                  value={config.registrationEnabled ? 'enabled' : 'disabled'}
                  onChange={(e) => setConfig({ ...config, registrationEnabled: e.target.value === 'enabled' })}
                >
                  <option value="enabled">Enabled</option>
                  <option value="disabled">Disabled</option>
                </select>
                <small>When disabled, server owners cannot submit new registration requests.</small>
              </div>
              <div className="input-group">
                <label>Discord Bot Token</label>
                <input
                  type="password"
                  value={config.botToken}
                  onChange={(e) => setConfig({ ...config, botToken: e.target.value })}
                  placeholder="Enter Discord bot token"
                />
                <small>Get this from Discord Developer Portal</small>
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

              <div className="input-group">
                <label>Client Discord IDs (one per line)</label>
                <textarea
                  value={config.clientDiscordIds}
                  onChange={(e) => setConfig({ ...config, clientDiscordIds: e.target.value })}
                  placeholder="Enter Discord IDs for client access, one per line. Leave empty to deny all users."
                  rows={5}
                />
                <small>Users with these IDs can access the client dashboard.</small>
              </div>

              <div className="input-group">
                <label>Minecraft Server Domain/URL</label>
                <input
                  type="text"
                  value={config.minecraftServerDomain}
                  onChange={(e) => setConfig({ ...config, minecraftServerDomain: e.target.value })}
                  placeholder="http://localhost:3003 or https://your-minecraft-server.com"
                />
                <small>This is where the API will send whitelist add requests</small>
              </div>

              <div className="input-group">
                <label>Minecraft Whitelist File Path</label>
                <input
                  type="text"
                  value={config.minecraftWhitelistFile}
                  onChange={(e) => setConfig({ ...config, minecraftWhitelistFile: e.target.value })}
                  placeholder="./whitelist.json or /path/to/whitelist.json"
                />
                <small>Path to whitelist.json on your Minecraft server (optional - server can use env var)</small>
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

        {activeTab === 'clients' && (
          <div className="card">
            <h2>Client Discord ID Management</h2>
            <p>Manage Discord IDs that can access the client dashboard.</p>

            <div className="input-group">
              <label>Add New Client Discord ID</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  value={newClientId}
                  onChange={(e) => setNewClientId(e.target.value)}
                  placeholder="Enter Discord ID to add"
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={handleAddClientId}
                  className="btn btn-success"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="input-group">
              <label>Client Discord IDs (Managed in Dashboard)</label>
              <textarea
                value={config.clientDiscordIds}
                onChange={(e) => setConfig({ ...config, clientDiscordIds: e.target.value })}
                placeholder="Enter Discord IDs for client access, one per line. Leave empty to deny all users."
                rows={8}
              />
              <small>
                These IDs are stored in config.json and can be managed here. 
                Leave empty to deny all client access.
              </small>
            </div>

            {config.clientDiscordIds && config.clientDiscordIds.trim().length > 0 && (
              <div style={{ marginTop: '20px' }}>
                <h3>Current Client IDs</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' }}>
                  {config.clientDiscordIds.split('\n').filter(id => id.trim().length > 0).map(id => (
                    <div key={id} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px', 
                      padding: '8px 12px', 
                      backgroundColor: '#f8f9fa', 
                      borderRadius: '4px',
                      border: '1px solid #dee2e6'
                    }}>
                      <span>{escapeHtml(id.trim())}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveClientId(id.trim())}
                        className="btn btn-danger btn-sm"
                        style={{ padding: '2px 8px', fontSize: '12px' }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginTop: '20px' }}>
              <button
                onClick={handleConfigSave}
                className="btn btn-primary"
              >
                Save Client IDs
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminPanel;
