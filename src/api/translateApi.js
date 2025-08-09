// src/api/translateApi.js
import axios from 'axios';

class TranslationError extends Error {
  constructor(message, type, statusCode = null) {
    super(message);
    this.name = 'TranslationError';
    this.type = type;
    this.statusCode = statusCode;
  }
}

class TranslateApi {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_BASE_URL || '/api';
    this.googleTranslateKey = process.env.REACT_APP_GOOGLE_TRANSLATE_KEY;
    this.libretranslateURL = process.env.REACT_APP_LIBRETRANSLATE_URL || 'https://libretranslate.de';
    this.timeout = 15000; // 15 seconds
    this.maxTextLength = 5000; // Maximum characters per request

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

  // Language code mapping
  getLanguageCode(language) {
    const langMap = {
      'sinhala': 'si',
      'si': 'si',
      'tamil': 'ta',
      'ta': 'ta',
      'english': 'en',
      'en': 'en',
      'hindi': 'hi',
      'hi': 'hi',
      'spanish': 'es',
      'es': 'es',
      'french': 'fr',
      'fr': 'fr',
      'german': 'de',
      'de': 'de',
      'italian': 'it',
      'it': 'it',
      'portuguese': 'pt',
      'pt': 'pt',
      'russian': 'ru',
      'ru': 'ru',
      'japanese': 'ja',
      'ja': 'ja',
      'korean': 'ko',
      'ko': 'ko',
      'chinese': 'zh',
      'zh': 'zh',
      'arabic': 'ar',
      'ar': 'ar',
      'bengali': 'bn',
      'bn': 'bn',
      'urdu': 'ur',
      'ur': 'ur',
      'thai': 'th',
      'th': 'th',
      'vietnamese': 'vi',
      'vi': 'vi',
      'indonesian': 'id',
      'id': 'id',
      'malay': 'ms',
      'ms': 'ms'
    };
    
    return langMap[language.toLowerCase()] || language.toLowerCase();
  }

  // Handle axios errors
  handleAxiosError(error) {
    if (error.code === 'ECONNABORTED') {
      throw new TranslationError(
        'Translation timeout. Please try again',
        'TIMEOUT'
      );
    }

    if (!error.response) {
      // Network error
      if (!navigator.onLine) {
        throw new TranslationError(
          'No internet connection. Please check your network',
          'NETWORK_ERROR'
        );
      }
      
      throw new TranslationError(
        'Network error. Please check your connection',
        'NETWORK_ERROR'
      );
    }

    const { status, data } = error.response;
    const errorMessage = data?.message || data?.error || 'Unknown error';

    switch (status) {
      case 400:
        throw new TranslationError(
          errorMessage || 'Invalid translation request',
          'INVALID_REQUEST',
          400
        );
      case 403:
        throw new TranslationError(
          'Translation quota exceeded or invalid API key',
          'QUOTA_EXCEEDED',
          403
        );
      case 404:
        throw new TranslationError(
          'Translation service not found',
          'SERVICE_NOT_FOUND',
          404
        );
      case 429:
        throw new TranslationError(
          'Translation rate limit exceeded. Please try again later',
          'RATE_LIMITED',
          429
        );
      case 500:
        throw new TranslationError(
          'Translation server error. Please try again later',
          'SERVER_ERROR',
          500
        );
      default:
        throw new TranslationError(
          errorMessage || `HTTP ${status}`,
          'HTTP_ERROR',
          status
        );
    }
  }

  // Validate translation parameters
  validateTranslationRequest(text, targetLang) {
    if (!text || typeof text !== 'string') {
      throw new TranslationError(
        'Text is required for translation',
        'MISSING_TEXT'
      );
    }

    if (text.trim().length === 0) {
      throw new TranslationError(
        'Text cannot be empty',
        'EMPTY_TEXT'
      );
    }

    if (text.length > this.maxTextLength) {
      throw new TranslationError(
        `Text too long. Maximum ${this.maxTextLength} characters allowed`,
        'TEXT_TOO_LONG'
      );
    }

    if (!targetLang) {
      throw new TranslationError(
        'Target language is required',
        'MISSING_TARGET_LANGUAGE'
      );
    }
  }

  // Split long text into chunks
  splitTextIntoChunks(text, maxChunkSize = 4000) {
    if (text.length <= maxChunkSize) {
      return [text];
    }

    const chunks = [];
    const sentences = text.split(/(?<=[.!?])\s+/);
    let currentChunk = '';

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length <= maxChunkSize) {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
          currentChunk = sentence;
        } else {
          // Handle very long sentences
          const words = sentence.split(' ');
          let wordChunk = '';
          
          for (const word of words) {
            if ((wordChunk + word).length <= maxChunkSize) {
              wordChunk += (wordChunk ? ' ' : '') + word;
            } else {
              if (wordChunk) chunks.push(wordChunk);
              wordChunk = word;
            }
          }
          
          if (wordChunk) currentChunk = wordChunk;
        }
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  // Main translate method using backend API
  async translate(text, targetLanguage, sourceLanguage = 'auto') {
    try {
      this.validateTranslationRequest(text, targetLanguage);

      const response = await this.client.post('/translate', {
        text,
        target: this.getLanguageCode(targetLanguage),
        source: sourceLanguage === 'auto' ? 'auto' : this.getLanguageCode(sourceLanguage)
      });

      const data = response.data;

      // Handle different response formats
      if (data.success === false) {
        throw new TranslationError(
          data.error?.message || 'Translation failed',
          data.error?.type || 'TRANSLATION_ERROR',
          data.error?.statusCode
        );
      }

      const translatedText = data.data?.translatedText || data.translatedText;
      if (!translatedText) {
        throw new TranslationError(
          'Translation service returned empty result',
          'TRANSLATION_EMPTY'
        );
      }

      return {
        success: true,
        data: {
          originalText: text,
          translatedText,
          sourceLanguage: data.data?.detectedLanguage || data.detectedLanguage || sourceLanguage,
          targetLanguage: this.getLanguageCode(targetLanguage),
          provider: data.data?.provider || data.provider || 'backend'
        }
      };

    } catch (error) {
      if (error instanceof TranslationError) {
        return {
          success: false,
          error: {
            message: error.message,
            type: error.type,
            statusCode: error.statusCode
          }
        };
      }

      console.error('translate error:', error);
      return {
        success: false,
        error: {
          message: error.message || 'Translation failed',
          type: 'TRANSLATION_ERROR'
        }
      };
    }
  }

  // Google Translate API implementation (fallback)
  async translateWithGoogle(text, targetLang, sourceLang = 'auto') {
    if (!this.googleTranslateKey) {
      throw new TranslationError(
        'Google Translate API key not configured',
        'API_KEY_MISSING'
      );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(
        `https://translation.googleapis.com/language/translate/v2?key=${this.googleTranslateKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            q: text,
            target: this.getLanguageCode(targetLang),
            source: sourceLang === 'auto' ? undefined : this.getLanguageCode(sourceLang)
          }),
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 403) {
          throw new TranslationError(
            'Google Translate quota exceeded or invalid API key',
            'QUOTA_EXCEEDED',
            403
          );
        }
        
        throw new TranslationError(
          errorData.error?.message || 'Google Translate API error',
          'GOOGLE_API_ERROR',
          response.status
        );
      }

      const data = await response.json();
      
      if (!data.data?.translations?.[0]?.translatedText) {
        throw new TranslationError(
          'Invalid response from Google Translate',
          'INVALID_RESPONSE'
        );
      }

      return {
        translatedText: data.data.translations[0].translatedText,
        detectedLanguage: data.data.translations[0].detectedSourceLanguage || sourceLang,
        provider: 'google'
      };

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new TranslationError(
          'Translation timeout. Please try again',
          'TIMEOUT'
        );
      }
      
      if (error instanceof TranslationError) {
        throw error;
      }
      
      throw new TranslationError(
        'Google Translate service unavailable',
        'SERVICE_UNAVAILABLE'
      );
    }
  }

  // LibreTranslate API implementation (fallback)
  async translateWithLibre(text, targetLang, sourceLang = 'auto') {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.libretranslateURL}/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text,
          source: sourceLang === 'auto' ? 'auto' : this.getLanguageCode(sourceLang),
          target: this.getLanguageCode(targetLang),
          format: 'text'
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 429) {
          throw new TranslationError(
            'Translation rate limit exceeded',
            'RATE_LIMITED',
            429
          );
        }
        
        throw new TranslationError(
          errorData.error || 'LibreTranslate API error',
          'LIBRE_API_ERROR',
          response.status
        );
      }

      const data = await response.json();
      
      if (!data.translatedText) {
        throw new TranslationError(
          'Invalid response from LibreTranslate',
          'INVALID_RESPONSE'
        );
      }

      return {
        translatedText: data.translatedText,
        detectedLanguage: data.detectedLanguage || sourceLang,
        provider: 'libretranslate'
      };

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new TranslationError(
          'Translation timeout. Please try again',
          'TIMEOUT'
        );
      }
      
      if (error instanceof TranslationError) {
        throw error;
      }
      
      throw new TranslationError(
        'LibreTranslate service unavailable',
        'SERVICE_UNAVAILABLE'
      );
    }
  }

  // Advanced translate method with chunking and fallback
  async translateAdvanced(text, targetLanguage, sourceLanguage = 'auto') {
    try {
      this.validateTranslationRequest(text, targetLanguage);
      
      // Split long text into chunks
      const chunks = this.splitTextIntoChunks(text);
      let translatedChunks = [];
      let detectedLang = sourceLanguage;
      let usedProvider = null;

      for (const chunk of chunks) {
        let chunkResult = null;
        
        // Try backend API first
        try {
          const backendResult = await this.translate(chunk, targetLanguage, sourceLanguage);
          if (backendResult.success) {
            chunkResult = {
              translatedText: backendResult.data.translatedText,
              detectedLanguage: backendResult.data.sourceLanguage,
              provider: backendResult.data.provider
            };
            usedProvider = backendResult.data.provider;
          } else {
            throw new Error('Backend translation failed');
          }
        } catch (backendError) {
          console.warn('Backend translate failed:', backendError.message);
          
          // Try Google Translate
          try {
            chunkResult = await this.translateWithGoogle(chunk, targetLanguage, sourceLanguage);
            usedProvider = 'google';
          } catch (googleError) {
            console.warn('Google Translate failed:', googleError.message);
            
            // Fallback to LibreTranslate
            try {
              chunkResult = await this.translateWithLibre(chunk, targetLanguage, sourceLanguage);
              usedProvider = 'libretranslate';
            } catch (libreError) {
              console.error('LibreTranslate also failed:', libreError.message);
              throw new TranslationError(
                'All translation services are currently unavailable',
                'ALL_SERVICES_FAILED'
              );
            }
          }
        }
        
        translatedChunks.push(chunkResult.translatedText);
        
        // Use detected language from first chunk
        if (detectedLang === 'auto' && chunkResult.detectedLanguage) {
          detectedLang = chunkResult.detectedLanguage;
        }
      }

      return {
        success: true,
        data: {
          originalText: text,
          translatedText: translatedChunks.join(' '),
          sourceLanguage: detectedLang,
          targetLanguage: this.getLanguageCode(targetLanguage),
          provider: usedProvider,
          chunkCount: chunks.length
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

  // Get supported languages
  async getSupportedLanguages() {
    try {
      // Try to get from backend first
      try {
        const response = await this.client.get('/languages');
        if (response.data && Array.isArray(response.data)) {
          return response.data;
        }
      } catch (backendError) {
        console.warn('Backend languages endpoint failed:', backendError.message);
      }

      // Fallback to LibreTranslate
      const response = await fetch(`${this.libretranslateURL}/languages`);
      
      if (response.ok) {
        const languages = await response.json();
        return languages;
      }
      
      // Final fallback to predefined languages
      return this.getDefaultLanguages();
      
    } catch (error) {
      console.error('Failed to fetch supported languages:', error);
      return this.getDefaultLanguages();
    }
  }

  // Get default language list
  getDefaultLanguages() {
    return [
      { code: 'en', name: 'English' },
      { code: 'si', name: 'Sinhala' },
      { code: 'ta', name: 'Tamil' },
      { code: 'hi', name: 'Hindi' },
      { code: 'es', name: 'Spanish' },
      { code: 'fr', name: 'French' },
      { code: 'de', name: 'German' },
      { code: 'it', name: 'Italian' },
      { code: 'pt', name: 'Portuguese' },
      { code: 'ru', name: 'Russian' },
      { code: 'ja', name: 'Japanese' },
      { code: 'ko', name: 'Korean' },
      { code: 'zh', name: 'Chinese (Simplified)' },
      { code: 'ar', name: 'Arabic' },
      { code: 'bn', name: 'Bengali' },
      { code: 'ur', name: 'Urdu' },
      { code: 'th', name: 'Thai' },
      { code: 'vi', name: 'Vietnamese' },
      { code: 'id', name: 'Indonesian' },
      { code: 'ms', name: 'Malay' }
    ];
  }
}

// Create and export instance
const translateApi = new TranslateApi();

// Export both class methods and standalone functions for compatibility
export default translateApi;

// Standalone functions for backward compatibility
export async function translate(text, target, source = 'auto') {
  try {
    return await translateApi.translate(text, target, source);
  } catch (error) {
    console.error('translate API error:', error);
    return {
      success: false,
      error: {
        type: error.type || 'NETWORK_ERROR',
        message: error.message
      }
    };
  }
}

export async function getSupportedLanguages() {
  try {
    return await translateApi.getSupportedLanguages();
  } catch (error) {
    console.error('getSupportedLanguages error:', error);
    // Return minimal set as fallback
    return [
      { code: 'en', name: 'English' },
      { code: 'si', name: 'Sinhala' },
      { code: 'ta', name: 'Tamil' },
      { code: 'hi', name: 'Hindi' }
    ];
  }
}

export { TranslationError };