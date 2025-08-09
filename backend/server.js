// backend/server.js
const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Helper: extract video title using YouTube oEmbed
async function getYoutubeTitle(videoUrl) {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`;
    const r = await axios.get(oembedUrl, { timeout: 8000 });
    return r.data.title; // e.g. "Artist - Song Title"
  } catch (e) {
    return null;
  }
}

// Helper: naive split title into artist and song
function splitTitleToArtistSong(title) {
  if (!title) return { artist: null, song: null };
  // common separators: " - ", " – ", "|"
  const separators = [' - ', ' – ', ' — ', '|'];
  for (const sep of separators) {
    if (title.includes(sep)) {
      const parts = title.split(sep);
      return { artist: parts[0].trim(), song: parts.slice(1).join(sep).trim() };
    }
  }
  // fallback: use entire title as song
  return { artist: null, song: title.trim() };
}

/**
 * GET /api/lyrics?url=<youtube_url>
 * returns { success: true, data: { title, artist, lyrics } } or { success:false, error: { type, message } }
 */
app.get('/api/lyrics', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ success: false, error: { type: 'INVALID_URL', message: 'Missing url parameter' } });

  try {
    const title = await getYoutubeTitle(url);
    if (!title) {
      return res.status(404).json({ success: false, error: { type: 'VIDEO_NOT_FOUND', message: 'Could not get video title' } });
    }

    const { artist, song } = splitTitleToArtistSong(title);
    // If we have artist & song try lyrics.ovh
    let lyrics = null;
    if (artist && song) {
      try {
        const lyricRes = await axios.get(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(song)}`, { timeout: 8000 });
        if (lyricRes.data && lyricRes.data.lyrics) lyrics = lyricRes.data.lyrics;
      } catch (e) {
        // ignore — lyrics not found via lyrics.ovh
      }
    }

    // If not found, return title + notice
    if (!lyrics) {
      return res.json({
        success: true,
        data: {
          title,
          artist,
          lyrics: null,
          note: 'Lyrics not found automatically. You may paste lyrics manually.'
        }
      });
    }

    return res.json({ success: true, data: { title, artist, lyrics } });

  } catch (err) {
    console.error('Lyrics error:', err.message || err);
    return res.status(500).json({ success: false, error: { type: 'SERVER_ERROR', message: 'Internal server error' } });
  }
});

/**
 * POST /api/translate
 * body: { text: string, target: 'si'|'en'|... }
 */
app.post('/api/translate', async (req, res) => {
  const { text, target } = req.body;
  if (!text || !target) return res.status(400).json({ success: false, error: { type: 'INVALID_INPUT', message: 'text and target are required' } });

  try {
    const r = await axios.post('https://libretranslate.de/translate', {
      q: text,
      source: 'auto',
      target,
      format: 'text'
    }, { headers: { 'accept': 'application/json' }, timeout: 20000 });

    return res.json({ success: true, data: { translatedText: r.data.translatedText } });
  } catch (err) {
    console.error('Translate error:', err.message || err);
    return res.status(500).json({ success: false, error: { type: 'TRANSLATION_ERROR', message: 'Translation service failed' } });
  }
});

/**
 * POST /api/lyrics-translate
 * body: { url: '<youtube url>', target: 'si' }
 * convenience route: extract lyrics then translate
 */
app.post('/api/lyrics-translate', async (req, res) => {
  const { url, target } = req.body;
  if (!url || !target) return res.status(400).json({ success: false, error: { type: 'INVALID_INPUT', message: 'url and target required' } });

  try {
    // reuse extraction
    const title = await getYoutubeTitle(url);
    const { artist, song } = splitTitleToArtistSong(title || '');
    let lyrics = null;
    if (artist && song) {
      try {
        const lyricRes = await axios.get(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(song)}`, { timeout: 8000 });
        lyrics = lyricRes.data?.lyrics || null;
      } catch (e) {}
    }

    if (!lyrics) {
      return res.json({ success: false, error: { type: 'NO_LYRICS_FOUND', message: 'Could not find lyrics automatically' } });
    }

    // translate
    const tr = await axios.post('https://libretranslate.de/translate', {
      q: lyrics,
      source: 'auto',
      target,
      format: 'text'
    }, { headers: { 'accept': 'application/json' }, timeout: 20000 });

    return res.json({
      success: true,
      data: {
        title,
        artist,
        lyrics,
        translatedLyrics: tr.data.translatedText
      }
    });

  } catch (err) {
    console.error('lyrics-translate error:', err.message || err);
    return res.status(500).json({ success: false, error: { type: 'SERVER_ERROR', message: 'Internal server error' } });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
