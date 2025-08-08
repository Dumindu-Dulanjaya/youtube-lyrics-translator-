// src/api/translateApi.js
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
    this.googleTranslateKey = process.env.REACT_APP_GOOGLE_TRANSLATE_KEY;
    this.libretranslateURL = process.env.REACT_APP_LIBRETRANSLATE_URL || 'https://libretranslate.de';
    this.timeout = 15000; // 15 seconds
    this.maxTextLength = 5000; // Maximum characters per request
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
      'ar': 'ar'
    };
    
    return langMap[language.toLowerCase()] || language.toLowerCase();
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

  // Google Translate API implementation
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

  // Main translation method with fallback
  async translate(text, targetLanguage, sourceLanguage = 'auto') {
    try {
      this.validateTranslationRequest(text, targetLanguage);
      
      // Split long text into chunks
      const chunks = this.splitTextIntoChunks(text);
      let translatedChunks = [];
      let detectedLang = sourceLanguage;
      let usedProvider = null;

      for (const chunk of chunks) {
        let chunkResult = null;
        
        // Try Google Translate first
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
      const response = await fetch(`${this.libretranslateURL}/languages`);
      
      if (response.ok) {
        return await response.json();
      }
      
      // Fallback to common languages including English
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
      
    } catch (error) {
      console.error('Failed to fetch supported languages:', error);
      return [];
    }
  }
}

export default new TranslateApi();
export { TranslationError };