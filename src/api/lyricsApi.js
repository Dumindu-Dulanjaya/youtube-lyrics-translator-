// src/api/lyricsApi.js
class LyricsApiError extends Error {
  constructor(message, type, statusCode = null) {
    super(message);
    this.name = 'LyricsApiError';
    this.type = type;
    this.statusCode = statusCode;
  }
}

class LyricsApi {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';
    this.timeout = 30000; // 30 seconds
  }

  validateYouTubeUrl(url) {
    const patterns = [
      /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
      /^https?:\/\/(www\.)?youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/
    ];
    
    return patterns.some(pattern => pattern.test(url));
  }

  extractVideoId(url) {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    
    throw new LyricsApiError('Invalid YouTube URL format', 'INVALID_URL');
  }

  async makeRequest(endpoint, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        switch (response.status) {
          case 400:
            throw new LyricsApiError(
              errorData.message || 'Invalid request parameters',
              'INVALID_REQUEST',
              400
            );
          case 404:
            throw new LyricsApiError(
              'Video not found or unavailable',
              'VIDEO_NOT_FOUND',
              404
            );
          case 429:
            throw new LyricsApiError(
              'Rate limit exceeded. Please try again later',
              'RATE_LIMITED',
              429
            );
          case 500:
            throw new LyricsApiError(
              'Server error. Please try again later',
              'SERVER_ERROR',
              500
            );
          default:
            throw new LyricsApiError(
              errorData.message || `HTTP ${response.status}`,
              'HTTP_ERROR',
              response.status
            );
        }
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new LyricsApiError(
          'Request timeout. The video might be too long or server is busy',
          'TIMEOUT'
        );
      }

      if (error instanceof LyricsApiError) {
        throw error;
      }

      if (!navigator.onLine) {
        throw new LyricsApiError(
          'No internet connection. Please check your network',
          'NETWORK_ERROR'
        );
      }

      throw new LyricsApiError(
        'Network error. Please check your connection',
        'NETWORK_ERROR'
      );
    }
  }

  async extractLyrics(youtubeUrl) {
    try {
      // Validate URL first
      if (!this.validateYouTubeUrl(youtubeUrl)) {
        throw new LyricsApiError(
          'Please enter a valid YouTube URL',
          'INVALID_URL'
        );
      }

      const videoId = this.extractVideoId(youtubeUrl);
      
      const response = await this.makeRequest('/extract-lyrics', {
        method: 'POST',
        body: JSON.stringify({ videoId, url: youtubeUrl })
      });

      if (!response.lyrics || response.lyrics.trim().length === 0) {
        throw new LyricsApiError(
          'No lyrics found in this video. Try a video with clear vocals or captions',
          'NO_LYRICS_FOUND'
        );
      }

      return {
        success: true,
        data: {
          lyrics: response.lyrics,
          title: response.title || 'Unknown Title',
          artist: response.artist || 'Unknown Artist',
          duration: response.duration,
          videoId
        }
      };

    } catch (error) {
      if (error instanceof LyricsApiError) {
        throw error;
      }
      
      throw new LyricsApiError(
        'Failed to extract lyrics from video',
        'EXTRACTION_ERROR'
      );
    }
  }

  async translateLyrics(lyrics, targetLanguage = 'si') {
    try {
      if (!lyrics || lyrics.trim().length === 0) {
        throw new LyricsApiError(
          'No lyrics provided for translation',
          'NO_LYRICS'
        );
      }

      const response = await this.makeRequest('/translate', {
        method: 'POST',
        body: JSON.stringify({
          text: lyrics,
          targetLanguage,
          sourceLanguage: 'auto'
        })
      });

      if (!response.translatedText) {
        throw new LyricsApiError(
          'Translation service returned empty result',
          'TRANSLATION_EMPTY'
        );
      }

      return {
        success: true,
        data: {
          originalText: lyrics,
          translatedText: response.translatedText,
          detectedLanguage: response.detectedLanguage,
          targetLanguage
        }
      };

    } catch (error) {
      if (error instanceof LyricsApiError) {
        throw error;
      }
      
      throw new LyricsApiError(
        'Translation service is currently unavailable',
        'TRANSLATION_ERROR'
      );
    }
  }

  async processVideo(youtubeUrl, targetLanguage = 'si') {
    try {
      // Step 1: Extract lyrics
      const lyricsResult = await this.extractLyrics(youtubeUrl);
      
      // Step 2: Translate lyrics
      const translationResult = await this.translateLyrics(
        lyricsResult.data.lyrics,
        targetLanguage
      );

      return {
        success: true,
        data: {
          ...lyricsResult.data,
          ...translationResult.data
        }
      };

    } catch (error) {
      return {
        success: false,
        error: {
          message: error.message,
          type: error.type,
          statusCode: error.statusCode
        }
      };
    }
  }

  // Retry wrapper for failed requests
  async withRetry(operation, maxRetries = 3, delay = 1000) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        // Don't retry certain error types
        if (error.type === 'INVALID_URL' || 
            error.type === 'VIDEO_NOT_FOUND' || 
            error.type === 'NO_LYRICS_FOUND') {
          throw error;
        }
        
        if (attempt === maxRetries) break;
        
        // Exponential backoff
        await new Promise(resolve => 
          setTimeout(resolve, delay * Math.pow(2, attempt - 1))
        );
      }
    }
    
    throw lastError;
  }
}

export default new LyricsApi();
export { LyricsApiError };