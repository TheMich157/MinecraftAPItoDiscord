import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Shield, Bot, Server, Zap, Lock, BarChart3, Users, MessageSquare, Settings } from 'lucide-react';
import './Landing.css';

function Landing() {
  const navigate = useNavigate();

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
          <div className="visual-card">
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
              <div key={index} className="feature-card">
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
            <a href="/documentation">Documentation</a>
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
