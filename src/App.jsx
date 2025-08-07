import React from "react";
import LyricsForm from "./components/LyricsForm";

function App() {
  return (
    <div style={{ fontFamily: "Arial, sans-serif", padding: "2rem" }}>
      <h1>YouTube Song Lyrics Translator 🎵🌍</h1>
      <p>Paste a YouTube song link below to fetch and translate the lyrics.</p>
      <LyricsForm />
    </div>
  );
}

export default App;
