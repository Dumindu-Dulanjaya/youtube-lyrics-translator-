// src/api/lyricsApi.js
import axios from 'axios';

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
    this.baseURL = process.env.REACT_APP_API_BASE_URL || '/api';
    this.timeout = 30000; // 30 seconds
    
    // Configure axios instance
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Setup response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => this.handleAxiosError(error)
    );
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

  handleAxiosError(error) {
    if (error.code === 'ECONNABORTED') {
      throw new LyricsApiError(
        'Request timeout. The video might be too long or server is busy',
        'TIMEOUT'
      );
    }

    if (!error.response) {
      // Network error
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

    const { status, data } = error.response;
    const errorMessage = data?.message || data?.error || 'Unknown error';

    switch (status) {
      case 400:
        throw new LyricsApiError(
          errorMessage || 'Invalid request parameters',
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
          errorMessage || `HTTP ${status}`,
          'HTTP_ERROR',
          status
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

      const response = await this.client.get('/lyrics', {
        params: { url: youtubeUrl }
      });

      const data = response.data;

      // Handle different response formats
      if (data.success === false) {
        throw new LyricsApiError(
          data.error?.message || 'Failed to extract lyrics',
          data.error?.type || 'EXTRACTION_ERROR',
          data.error?.statusCode
        );
      }

      const lyrics = data.data?.lyrics || data.lyrics;
      if (!lyrics || lyrics.trim().length === 0) {
        throw new LyricsApiError(
          'No lyrics found in this video. Try a video with clear vocals or captions',
          'NO_LYRICS_FOUND'
        );
      }

      return {
        success: true,
        data: {
          lyrics,
          title: data.data?.title || data.title || 'Unknown Title',
          artist: data.data?.artist || data.artist || 'Unknown Artist',
          duration: data.data?.duration || data.duration,
          videoId: this.extractVideoId(youtubeUrl)
        }
      };

    } catch (error) {
      if (error instanceof LyricsApiError) {
        throw error;
      }
      
      console.error('extractLyrics error:', error);
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

      const response = await this.client.post('/translate', {
        text: lyrics,
        targetLanguage,
        sourceLanguage: 'auto'
      });

      const data = response.data;

      // Handle different response formats
      if (data.success === false) {
        throw new LyricsApiError(
          data.error?.message || 'Translation failed',
          data.error?.type || 'TRANSLATION_ERROR',
          data.error?.statusCode
        );
      }

      const translatedText = data.data?.translatedText || data.translatedText;
      if (!translatedText) {
        throw new LyricsApiError(
          'Translation service returned empty result',
          'TRANSLATION_EMPTY'
        );
      }

      return {
        success: true,
        data: {
          originalText: lyrics,
          translatedText,
          detectedLanguage: data.data?.detectedLanguage || data.detectedLanguage,
          targetLanguage
        }
      };

    } catch (error) {
      if (error instanceof LyricsApiError) {
        throw error;
      }
      
      console.error('translateLyrics error:', error);
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
      console.error('processVideo error:', error);
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

  // Combined lyrics extraction and translation (matching the second version's pattern)
  async lyricsTranslate(url, target = 'si') {
    try {
      const response = await this.client.post('/lyrics-translate', {
        url,
        target
      });

      const data = response.data;

      if (data.success === false) {
        return {
          success: false,
          error: {
            type: data.error?.type || 'UNKNOWN_ERROR',
            message: data.error?.message || 'Translation failed'
          }
        };
      }

      return data;

    } catch (error) {
      console.error('lyricsTranslate error:', error);
      return {
        success: false,
        error: {
          type: error.type || 'NETWORK_ERROR',
          message: error.message
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

// Create and export instance
const lyricsApi = new LyricsApi();

// Export both class methods and standalone functions for compatibility
export default lyricsApi;

// Standalone functions for backward compatibility
export async function extractLyrics(youtubeUrl) {
  try {
    return await lyricsApi.extractLyrics(youtubeUrl);
  } catch (error) {
    console.error('extractLyrics error:', error);
    return {
      success: false,
      error: {
        type: error.type || 'NETWORK_ERROR',
        message: error.message
      }
    };
  }
}

export async function lyricsTranslate(url, target = 'si') {
  return await lyricsApi.lyricsTranslate(url, target);
}

export { LyricsApiError };