import { useState } from 'react';

// Simulated lyrics fetching function
const getLyrics = async (youtubeLink) => {
  // You can improve this to extract title and fetch real lyrics later
  return `Sanda Eliya wage piyambanna
Mage mathake hithata thiyanawa`;
};

// Free translation API
const translateText = async (text, targetLang) => {
  try {
    const res = await fetch('https://libretranslate.de/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: text,
        source: 'auto',
        target: targetLang,
        format: 'text',
      }),
    });
    const data = await res.json();
    return data.translatedText;
  } catch (error) {
    return 'Translation failed. Please try again.';
  }
};

const LyricsForm = () => {
  const [youtubeLink, setYoutubeLink] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [translatedLyrics, setTranslatedLyrics] = useState('');
  const [language, setLanguage] = useState('si');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLyrics('');
    setTranslatedLyrics('');

    // Simulate lyrics fetch
    const rawLyrics = await getLyrics(youtubeLink);
    setLyrics(rawLyrics);

    // Translate lyrics
    const translated = await translateText(rawLyrics, language);
    setTranslatedLyrics(translated);
    setLoading(false);
  };

  return (
    <div>
      <form onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
        <label>
          🎬 YouTube Song Link:
          <input
            type="text"
            value={youtubeLink}
            onChange={(e) => setYoutubeLink(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem' }}
            required
          />
        </label>

        <label style={{ display: 'block', marginTop: '1rem' }}>
          🌐 Translate to:
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            style={{ marginLeft: '0.5rem' }}
          >
            <option value="si">Sinhala</option>
            <option value="ta">Tamil</option>
            <option value="en">English</option>
            <option value="hi">Hindi</option>
          </select>
        </label>

        <button
          type="submit"
          style={{ marginTop: '1rem', padding: '0.5rem 1rem' }}
        >
          Translate Lyrics
        </button>
      </form>

      {loading && <p>⏳ Processing...</p>}

      {lyrics && (
        <div style={{ marginTop: '2rem' }}>
          <h3>🎤 Original Lyrics:</h3>
          <pre style={{ background: '#f0f0f0', padding: '1rem' }}>{lyrics}</pre>
        </div>
      )}

      {translatedLyrics && (
        <div style={{ marginTop: '2rem' }}>
          <h3>🌍 Translated Lyrics:</h3>
          <pre style={{ background: '#e0ffe0', padding: '1rem' }}>
            {translatedLyrics}
          </pre>
        </div>
      )}
    </div>
  );
};

export default LyricsForm;
