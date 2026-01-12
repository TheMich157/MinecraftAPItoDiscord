import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Shield, Bot, Server, Zap, Lock, BarChart3, Users, MessageSquare, Settings } from 'lucide-react';
import './Landing.css';

function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    const cards = document.querySelectorAll('.feature-card');
    if (!cards || cards.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    cards.forEach(card => observer.observe(card));

    return () => observer.disconnect();
  }, []);

  const features = [
    {
      icon: <Bot size={32} />,
      title: 'Discord Bot Integration',
      description: 'Full-featured Discord bot with slash commands, automatic notifications, and server management capabilities.'
    },
    {
      icon: <Server size={32} />,
      title: 'Minecraft Server Control',
      description: 'Direct integration with your Minecraft server via RCON. Manage whitelist, bans, and execute commands remotely.'
    },
    {
      icon: <Shield size={32} />,
      title: 'Enterprise Security',
      description: 'AES-256 encryption, input validation, rate limiting, and comprehensive audit logging for maximum security.'
    },
    {
      icon: <BarChart3 size={32} />,
      title: 'Request Management',
      description: 'Streamlined workflow for managing whitelist requests. Approve, reject, or track requests with ease.'
    },
    {
      icon: <Zap size={32} />,
      title: 'Real-time Updates',
      description: 'Instant notifications in Discord channels. Players receive DMs when their requests are approved.'
    },
    {
      icon: <Lock size={32} />,
      title: 'Role-Based Access',
      description: 'Granular permission system. Separate admin and client dashboards with configurable access control.'
    },
    {
      icon: <Users size={32} />,
      title: 'User Management',
      description: 'Easy management of Discord IDs for admins and clients. Add or remove access with a few clicks.'
    },
    {
      icon: <Settings size={32} />,
      title: 'Console Mirroring',
      description: 'Real-time server console output in Discord. Monitor your server activity without leaving Discord.'
    },
    {
      icon: <MessageSquare size={32} />,
      title: 'Discord OAuth',
      description: 'One-click login with Discord. Secure authentication without managing passwords.'
    }
  ];

  const handleGetStarted = () => {
    navigate('/login');
  };

  return (
    <div className="landing-container">
      <nav className="landing-nav">
        <div className="nav-content">
          <div className="nav-logo">
            <Shield size={28} />
            <span className="logo-text">WhitelistHub</span>
          </div>
          <div className="nav-links">
            <a href="#features" className="nav-link">Features</a>
            <a href="#docs" className="nav-link">Documentation</a>
            <a href="#contact" className="nav-link">Contact</a>
            <button onClick={handleGetStarted} className="nav-button">
              <LogIn size={18} />
              Get Started
            </button>
          </div>
        </div>
      </nav>

      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-badge">
            <Shield size={16} />
            <span>Professional Minecraft Whitelist Management</span>
          </div>
          <h1 className="hero-title">
            Streamline Your Minecraft
            <span className="gradient-text"> Whitelist Management</span>
          </h1>
          <p className="hero-description">
            The all-in-one solution for managing Minecraft server whitelist requests through Discord. 
            Automate approvals, manage users, and control your server—all from one powerful platform.
          </p>
          <div className="hero-buttons">
            <button onClick={handleGetStarted} className="btn-hero btn-primary">
              <LogIn size={20} />
              Get Started
            </button>
            <a href="#features" className="btn-hero btn-secondary">
              Learn More
            </a>
          </div>
          <div className="hero-stats">
            <div className="stat-item">
              <div className="stat-value">100%</div>
              <div className="stat-label">Secure</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">24/7</div>
              <div className="stat-label">Available</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">Fast</div>
              <div className="stat-label">Setup</div>
            </div>
          </div>
        </div>
          <div className="hero-visual">
            <div className="visual-card animate-entrance" id="visualCard">
            <div className="visual-header">
              <div className="visual-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <div className="visual-title">WhitelistHub Dashboard</div>
            </div>
            <div className="visual-content">
              <div className="visual-item">
                <div className="visual-icon">✓</div>
                <div className="visual-text">
                  <div className="visual-bold">Request Approved</div>
                  <div className="visual-sub">PlayerName added to whitelist</div>
                </div>
              </div>
              <div className="visual-item">
                <div className="visual-icon">⏳</div>
                <div className="visual-text">
                  <div className="visual-bold">Pending Request</div>
                  <div className="visual-sub">Awaiting admin review</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="features-section">
        <div className="features-container">
          <div className="section-header">
            <h2 className="section-title">Everything You Need</h2>
            <p className="section-description">
              Comprehensive features designed to make whitelist management effortless
            </p>
          </div>
          <div className="features-grid">
            {features.map((feature, index) => (
              <div key={index} className="feature-card" data-index={index}>
                <div className="feature-icon">{feature.icon}</div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="how-it-works">
        <div className="how-it-works-container">
          <div className="section-header">
            <h2 className="section-title">How It Works</h2>
            <p className="section-description">
              Get started in minutes with our simple 3-step process
            </p>
          </div>
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">1</div>
              <h3 className="step-title">Player Submits Request</h3>
              <p className="step-description">
                Players use the Discord bot or web dashboard to submit whitelist requests with their Minecraft username.
              </p>
            </div>
            <div className="step-card">
              <div className="step-number">2</div>
              <h3 className="step-title">Admin Reviews</h3>
              <p className="step-description">
                Admins receive notifications in Discord and can approve or reject requests directly from the dashboard.
              </p>
            </div>
            <div className="step-card">
              <div className="step-number">3</div>
              <h3 className="step-title">Automatic Whitelist</h3>
              <p className="step-description">
                Approved players are automatically added to your Minecraft server whitelist via RCON integration.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="docs" className="docs-section">
        <div className="docs-container">
          <div className="section-header">
            <h2 className="section-title">Documentation</h2>
            <p className="section-description">
              Everything you need to set up servers, manage access, and run the plugin + bot.
            </p>
          </div>

          <div className="docs-grid">
            <div className="docs-card">
              <h3 className="docs-title">Roles & Access</h3>
              <p className="docs-text">
                WhitelistHub separates Platform Admins (developers) from Server Owners/Staff. Access is per-server.
              </p>
              <div className="docs-list">
                <div className="docs-item">
                  <div className="docs-item-title">Platform Admin</div>
                  <div className="docs-item-text">Manages global config, approves registrations, and can manage any server.</div>
                </div>
                <div className="docs-item">
                  <div className="docs-item-title">Server Owner</div>
                  <div className="docs-item-text">Full control over one server: requests, members, clients allowlist, settings.</div>
                </div>
                <div className="docs-item">
                  <div className="docs-item-title">Server Dev / Viewer</div>
                  <div className="docs-item-text">Dev can manage clients/settings; Viewer is read-only for server data.</div>
                </div>
              </div>
            </div>

            <div className="docs-card">
              <h3 className="docs-title">Server Owner Registration (3 steps)</h3>
              <div className="docs-steps">
                <div className="docs-step">
                  <div className="docs-step-badge">1</div>
                  <div>
                    <div className="docs-step-title">Submit registration</div>
                    <div className="docs-step-text">Go to Dashboard and submit: server id, name, ip, port, online-mode.</div>
                  </div>
                </div>
                <div className="docs-step">
                  <div className="docs-step-badge">2</div>
                  <div>
                    <div className="docs-step-title">Get approved + download config</div>
                    <div className="docs-step-text">After approval, download the pre-filled plugin config from the dashboard.</div>
                  </div>
                </div>
                <div className="docs-step">
                  <div className="docs-step-badge">3</div>
                  <div>
                    <div className="docs-step-title">Install plugin + finish setup</div>
                    <div className="docs-step-text">Start the server so the plugin connects. Then click “Finish setup” to unlock the owner panel.</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="docs-card">
              <h3 className="docs-title">Plugin Setup</h3>
              <p className="docs-text">
                The Minecraft plugin connects to the WebSocket hub using the serverId + apiKey generated for your server.
              </p>
              <div className="docs-item">
                <div className="docs-item-title">1) Download config</div>
                <div className="docs-item-text">Dashboard → approved server → “Download plugin config”.</div>
              </div>
              <div className="docs-item">
                <div className="docs-item-title">2) Place files</div>
                <div className="docs-item-text">Put plugin jar into <span className="docs-code">plugins/</span> and put config into the plugin folder.</div>
              </div>
              <div className="docs-item">
                <div className="docs-item-title">3) Start server</div>
                <div className="docs-item-text">Once connected, the dashboard will show the server as Connected and events/state will appear.</div>
              </div>
            </div>

            <div className="docs-card">
              <h3 className="docs-title">Discord Bot Commands</h3>
              <p className="docs-text">
                The bot submits whitelist requests per-server and respects the per-server client allowlist + whitelistEnabled toggle.
              </p>
              <div className="docs-list">
                <div className="docs-item">
                  <div className="docs-item-title">Whitelist request</div>
                  <div className="docs-item-text">Users submit a Minecraft username; server staff approve in the dashboard.</div>
                </div>
                <div className="docs-item">
                  <div className="docs-item-title">Admin/staff actions</div>
                  <div className="docs-item-text">Staff can approve/reject; approvals trigger a whitelist add via the server connection.</div>
                </div>
              </div>
            </div>

            <div className="docs-card docs-wide">
              <h3 className="docs-title">Troubleshooting</h3>
              <div className="docs-faq">
                <details className="docs-details">
                  <summary className="docs-summary">I’m approved but I don’t see the Owner Panel</summary>
                  <div className="docs-details-body">
                    Use “Refresh access” in Dashboard. If the server is not connected yet, install the plugin and start the Minecraft server, then click “Finish setup”.
                  </div>
                </details>
                <details className="docs-details">
                  <summary className="docs-summary">Server shows Offline / not connected</summary>
                  <div className="docs-details-body">
                    Check the plugin config: serverId and apiKey must match. Then verify the API URL/WebSocket URL is reachable from the server.
                  </div>
                </details>
                <details className="docs-details">
                  <summary className="docs-summary">Whitelist approvals do nothing</summary>
                  <div className="docs-details-body">
                    Ensure whitelist is enabled in Settings for that server, and the server is connected so whitelist commands can be delivered.
                  </div>
                </details>
              </div>
            </div>
          </div>

          <div className="docs-cta">
            <button onClick={handleGetStarted} className="nav-button">
              <LogIn size={18} /> Open Dashboard
            </button>
          </div>
        </div>
      </section>

      <section id="contact" className="contact-section">
        <div className="contact-container">
          <div className="section-header">
            <h2 className="section-title">Get In Touch</h2>
            <p className="section-description">
              Have questions? Need support? We're here to help.
            </p>
          </div>
          <div className="contact-grid">
            <div className="contact-card">
              <div className="contact-icon">
                <MessageSquare size={32} />
              </div>
              <h3 className="contact-title">Discord Support</h3>
              <p className="contact-description">
                Get help from our community or contact our support team via Discord
              </p>
              <div className="contact-info">
                <p className="contact-text">Discord Server: Your Discord Invite Link</p>
                <p className="contact-text">Support Channel: #support</p>
              </div>
            </div>
            <div className="contact-card">
              <div className="contact-icon">
                <Settings size={32} />
              </div>
              <h3 className="contact-title">Documentation</h3>
              <p className="contact-description">
                Comprehensive guides, API documentation, and setup instructions
              </p>
              <div className="contact-info">
                <p className="contact-text">Full documentation available in the docs folder</p>
                <p className="contact-text">Quick start guide included in README</p>
              </div>
            </div>
            <div className="contact-card">
              <div className="contact-icon">
                <Shield size={32} />
              </div>
              <h3 className="contact-title">Contact & Support</h3>
              <p className="contact-description">
                Have questions or need assistance? Reach out to us
              </p>
              <div className="contact-info">
                <p className="contact-text">Email: your-email@example.com</p>
                <p className="contact-text">GitHub Issues: For bug reports and feature requests</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-logo">
            <Shield size={24} />
            <span>WhitelistHub</span>
          </div>
          <div className="footer-links">
            <a href="#features">Features</a>
            <a href="#contact">Contact</a>
            <a href="#docs">Documentation</a>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
          </div>
          <div className="footer-copyright">
            © 2024 WhitelistHub. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
