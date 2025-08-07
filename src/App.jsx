import React from "react";
import LyricsForm from "./components/LyricsForm";
import "./App.css";

export default function App() {
  return (
    <div className="app-container">
      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="navbar-brand">🎵 YouTube Lyrics Translator</div>
        <ul className="navbar-links">
          <li><a href="#">Home</a></li>
          <li><a href="#">About</a></li>
          <li><a href="#">Contact</a></li>
        </ul>
      </nav>

      {/* Main Content */}
      <main className="content">
        <h1>Fetch & Translate Song Lyrics</h1>
        <p>Paste a YouTube song link, and we’ll get the lyrics and translate them into your chosen language!</p>
        <LyricsForm />
      </main>
    </div>
  );
}
