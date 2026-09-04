import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState({ name: '', description: '' });
  const [imageInfo, setImageInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    fetchItems();
    fetchImageInfo();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await axios.get('/api/items');
      setItems(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching items:', error);
      setLoading(false);
    }
  };

  const fetchImageInfo = async () => {
    try {
      const response = await axios.get('/api/image');
      setImageInfo(response.data);
    } catch (error) {
      console.error('Error fetching image info:', error);
    }
  };

  const addItem = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/items', newItem);
      setNewItem({ name: '', description: '' });
      fetchItems();
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  const deleteItem = async (id) => {
    try {
      await axios.delete(`/api/items/${id}`);
      fetchItems();
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  return (
    <div className="App">
      {/* Header with Hero Image */}
      <header className="hero-header">
        <div className="hero-overlay">
          <div className="container">
            <div className="hero-content">
              <div className="hero-text">
                <h1 className="hero-title">Three-Tier Application</h1>
                <p className="hero-subtitle">Running on AWS EKS with MongoDB</p>
                <p className="hero-subtitle">Harish N Shetty</p>
              </div>
              <div className="hero-social">
                <h3>Stay Connected</h3>
                <div className="social-links">
                  <a href="https://harishnshetty.github.io/" target="_blank" rel="noopener noreferrer" className="social-link">
                    <span className="social-icon">🌐</span>
                    <span>Website</span>
                  </a>
                  <a href="https://www.youtube.com/@devopsHarishNShetty" target="_blank" rel="noopener noreferrer" className="social-link">
                    <span className="social-icon">▶️</span>
                    <span>Youtube </span>
                  </a>
                  <a href="https://www.linkedin.com/in/harishnshetty" target="_blank" rel="noopener noreferrer" className="social-link">
                    <span className="social-icon">💼</span>
                    <span>LinkedIn</span>
                  </a>
                  <a href="https://github.com/harishnshetty" target="_blank" rel="noopener noreferrer" className="social-link">
                    <span className="social-icon">🐱</span>
                    <span>GitHub</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
        <img 
          src="/img/img.jpg" 
          alt="Application Hero" 
          className="hero-image"
        />
      </header>

      {/* Navigation */}
      <nav className="main-nav">
        <div className="container">
          <ul>
            <li>
              <button 
                className={activeTab === 'dashboard' ? 'nav-btn active' : 'nav-btn'}
                onClick={() => setActiveTab('dashboard')}
              >
                <span className="nav-icon">📊</span>
                Dashboard
              </button>
            </li>
            <li>
              <button 
                className={activeTab === 'items' ? 'nav-btn active' : 'nav-btn'}
                onClick={() => setActiveTab('items')}
              >
                <span className="nav-icon">📝</span>
                Items Management
              </button>
            </li>
            <li>
              <button 
                className={activeTab === 'about' ? 'nav-btn active' : 'nav-btn'}
                onClick={() => setActiveTab('about')}
              >
                <span className="nav-icon">ℹ️</span>
                About
              </button>
            </li>
          </ul>
        </div>
      </nav>

      {/* Main Content */}
      <main className="main-content">
        <div className="container">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="tab-content">
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon">📦</div>
                  <h3>Total Items</h3>
                  <p className="stat-number">{items.length}</p>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">✅</div>
                  <h3>System Status</h3>
                  <p className="stat-status">Operational</p>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">❤️</div>
                  <h3>API Health</h3>
                  <p className="stat-health">Healthy</p>
                </div>
              </div>

              <div className="recent-items">
                <h2>Recent Items</h2>
                {items.slice(0, 3).map(item => (
                  <div key={item._id} className="item-card">
                    <h4>{item.name}</h4>
                    <p>{item.description}</p>
                    <span className="item-date">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
                {items.length === 0 && !loading && (
                  <p className="no-items">No items yet. Add some using the Items Management tab.</p>
                )}
              </div>
            </div>
          )}

          {/* Items Management Tab */}
          {activeTab === 'items' && (
            <div className="tab-content">
              <div className="items-management">
                <div className="add-item-form">
                  <h2>Add New Item</h2>
                  <form onSubmit={addItem}>
                    <div className="form-group">
                      <input
                        type="text"
                        placeholder="Item Name"
                        value={newItem.name}
                        onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <input
                        type="text"
                        placeholder="Item Description"
                        value={newItem.description}
                        onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                        required
                      />
                    </div>
                    <button type="submit" className="btn-primary">
                      <span className="btn-icon">➕</span>
                      Add Item
                    </button>
                  </form>
                </div>

                <div className="items-list">
                  <h2>Items List</h2>
                  {loading ? (
                    <div className="loading">
                      <span className="loading-spinner"></span>
                      Loading items...
                    </div>
                  ) : (
                    <div className="items-grid">
                      {items.map(item => (
                        <div key={item._id} className="item-card">
                          <div className="item-content">
                            <h4>{item.name}</h4>
                            <p>{item.description}</p>
                            <span className="item-date">
                              Added: {new Date(item.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <button 
                            className="delete-btn"
                            onClick={() => deleteItem(item._id)}
                            aria-label="Delete item"
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                      {items.length === 0 && (
                        <p className="no-items">No items yet. Add one using the form above.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* About Tab */}
          {activeTab === 'about' && (
            <div className="tab-content">
              <div className="about-section">
                <h2>About This Application</h2>
                <div className="about-grid">
                  <div className="about-card">
                    <div className="about-icon">⚛️</div>
                    <h3>Frontend</h3>
                    <p>React-based user interface running in a Docker container on AWS EKS.</p>
                  </div>
                  <div className="about-card">
                    <div className="about-icon">🔧</div>
                    <h3>Backend</h3>
                    <p>Node.js API server with Express.js framework, connecting to MongoDB.</p>
                  </div>
                  <div className="about-card">
                    <div className="about-icon">🗄️</div>
                    <h3>Database</h3>
                    <p>MongoDB replica set with 3 nodes for high availability and data redundancy.</p>
                  </div>
                  <div className="about-card">
                    <div className="about-icon">☁️</div>
                    <h3>Infrastructure</h3>
                    <p>Deployed on AWS EKS with Application Load Balancer for ingress traffic.</p>
                  </div>
                </div>
                
                <div className="developer-info">
                  <h3>About the Developer</h3>
                  <div className="developer-card">
                    <div className="developer-content">
                      <h4>Harish N Shetty</h4>
                      <p>Full Stack Developer & DevOps Engineer</p>
                      <div className="developer-links">
                        <a href="https://harishnshetty.github.io/" target="_blank" rel="noopener noreferrer">
                          <span className="link-icon">🌐</span>
                          Portfolio
                        </a>
                        <a href="https://www.linkedin.com/in/harishnshetty" target="_blank" rel="noopener noreferrer">
                          <span className="link-icon">💼</span>
                          LinkedIn
                        </a>
                        <a href="https://github.com/harishnshetty" target="_blank" rel="noopener noreferrer">
                          <span className="link-icon">🐱</span>
                          GitHub
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="main-footer">
        <div className="container">
          <div className="footer-content">
            <p>&copy; 2025-2026 Three-Tier Application. Built for AWS EKS.</p>
            <div className="footer-links">
              <span>Developed by Harish N Shetty</span>
              <a href="https://harishnshetty.github.io/" target="_blank" rel="noopener noreferrer">Portfolio</a>
              <a href="https://www.linkedin.com/in/harishnshetty" target="_blank" rel="noopener noreferrer">LinkedIn</a>
              <a href="https://github.com/harishnshetty" target="_blank" rel="noopener noreferrer">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;