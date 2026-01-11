import React from 'react';
import { Shield, Users } from 'lucide-react';
import './RoleSelector.css';

function RoleSelector({ user, onSelectRole }) {
  return (
    <div className="role-selector-container">
      <div className="role-selector-card">
        <div className="role-selector-header">
          <h1>Welcome, {user.username}!</h1>
          <p>You have access to multiple roles. Please choose how you want to proceed:</p>
        </div>

        <div className="role-options">
          <button
            onClick={() => onSelectRole('admin')}
            className="role-option admin-option"
          >
            <Shield size={48} />
            <h2>Admin Panel</h2>
            <p>Manage whitelist requests, configure system settings, and view all requests</p>
          </button>

          <button
            onClick={() => onSelectRole('client')}
            className="role-option client-option"
          >
            <Users size={48} />
            <h2>Client Dashboard</h2>
            <p>Submit whitelist requests and view your request status</p>
          </button>
        </div>
      </div>
    </div>
  );
}

export default RoleSelector;
