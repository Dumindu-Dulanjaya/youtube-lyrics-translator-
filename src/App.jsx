import React, { useState } from "react";
import { Music, Globe, Play, Sparkles, ArrowRight } from "lucide-react";
import "./App.css";

function App() {
  const [youtubeLink, setYoutubeLink] = useState("");
  const [language, setLanguage] = useState("Sinhala");
  const [isLoading, setIsLoading] = useState(false);

  const handleTranslate = () => {
    setIsLoading(true);
    // Simulate processing
    setTimeout(() => {
      setIsLoading(false);
    }, 2000);
  };

  return (
    <div className="app-container">
      {/* Animated Background Elements */}
      <div className="background-elements">
        <div className="bg-element bg-element-1"></div>
        <div className="bg-element bg-element-2"></div>
        <div className="bg-element bg-element-3"></div>
      </div>

      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-left">
          <div className="navbar-icon-container">
            <Music className="navbar-icon" />
          </div>
          <span className="navbar-title">LyricsFlow</span>
        </div>
        <div className="navbar-right">
          <a href="#home">Home</a>
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-icon-container">
          <div className="hero-icon-wrapper">
            <Sparkles className="hero-icon" />
          </div>
        </div>
        <h1 className="hero-title">Translate Any Song</h1>
        <p className="hero-description">
          Transform YouTube music into your language with AI-powered translation. 
          Experience lyrics like never before.
        </p>
      </div>

      {/* Main Form */}
      <div className="main-container">
        <div className="form-container">
          <div className="form-content">
            {/* YouTube Link Input */}
            <div className="input-group">
              <label className="input-label">
                <Play className="label-icon play-icon" />
                <span>YouTube Song Link</span>
              </label>
              <div className="input-wrapper">
                <input
                  type="text"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={youtubeLink}
                  onChange={(e) => setYoutubeLink(e.target.value)}
                  className="text-input"
                />
                <div className="input-icon">
                  <Music className="input-icon-svg" />
                </div>
              </div>
            </div>

            {/* Language Selection */}
            <div className="input-group">
              <label className="input-label">
                <Globe className="label-icon globe-icon" />
                <span>Translate to</span>
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="select-input"
              >
                <option value="Sinhala">🇱🇰 Sinhala</option>
                <option value="Tamil">🇮🇳 Tamil</option>
                <option value="Hindi">🇮🇳 Hindi</option>
                <option value="Spanish">🇪🇸 Spanish</option>
                <option value="French">🇫🇷 French</option>
                <option value="German">🇩🇪 German</option>
                <option value="Japanese">🇯🇵 Japanese</option>
                <option value="Korean">🇰🇷 Korean</option>
              </select>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleTranslate}
              disabled={!youtubeLink.trim() || isLoading}
              className={`submit-button ${isLoading ? 'loading' : ''} ${!youtubeLink.trim() ? 'disabled' : ''}`}
            >
              {isLoading ? (
                <>
                  <div className="loading-spinner"></div>
                  <span>Translating...</span>
                </>
              ) : (
                <>
                  <span>Transform Lyrics</span>
                  <ArrowRight className="button-icon" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="feature-grid">
          <div className="feature-card">
            <div className="feature-icon-container purple">
              <Music className="feature-icon" />
            </div>
            <h3 className="feature-title">Auto-Extract</h3>
            <p className="feature-description">Automatically extracts lyrics from any YouTube music video</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon-container blue">
              <Globe className="feature-icon" />
            </div>
            <h3 className="feature-title">Multi-Language</h3>
            <p className="feature-description">Supports translation to dozens of world languages</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon-container pink">
              <Sparkles className="feature-icon" />
            </div>
            <h3 className="feature-title">AI-Powered</h3>
            <p className="feature-description">Advanced AI ensures accurate and contextual translations</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;