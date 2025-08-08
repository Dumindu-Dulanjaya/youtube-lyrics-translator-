// src/components/LyricsForm.jsx
import React, { useState, useEffect } from 'react';
import { Play, Globe, AlertTriangle, RefreshCw, CheckCircle, Loader, Copy, ChevronDown } from 'lucide-react';
import lyricsApi from '../api/lyricsApi';
import translateApi from '../api/translateApi';
import { getPopularLanguages, getAllLanguages, getLanguageName } from '../utils/languageUtils';

const LyricsForm = () => {
  const [formData, setFormData] = useState({
    youtubeUrl: '',
    targetLanguage: 'en' // Default to English
  });
  
  const [state, setState] = useState({
    loading: false,
    error: null,
    result: null,
    step: 'idle', // idle, extracting, translating, completed, error
    retryCount: 0
  });

  const [languageState, setLanguageState] = useState({
    showAllLanguages: false,
    supportedLanguages: []
  });

  // Load supported languages on component mount
  useEffect(() => {
    loadSupportedLanguages();
  }, []);

  const loadSupportedLanguages = async () => {
    try {
      // Try to get languages from API first
      const apiLanguages = await translateApi.getSupportedLanguages();
      
      if (apiLanguages && apiLanguages.length > 0) {
        setLanguageState(prev => ({ ...prev, supportedLanguages: apiLanguages }));
      } else {
        // Use our comprehensive language list
        setLanguageState(prev => ({ 
          ...prev, 
          supportedLanguages: getPopularLanguages() 
        }));
      }
    } catch (error) {
      console.error('Failed to load languages:', error);
      // Use fallback popular languages
      setLanguageState(prev => ({ 
        ...prev, 
        supportedLanguages: getPopularLanguages() 
      }));
    }
  };

  const getDisplayLanguages = () => {
    if (languageState.showAllLanguages) {
      return getAllLanguages();
    }
    return languageState.supportedLanguages.length > 0 
      ? languageState.supportedLanguages 
      : getPopularLanguages();
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (state.error) {
      setState(prev => ({ ...prev, error: null }));
    }
  };

  const getErrorMessage = (error) => {
    const errorMessages = {
      'INVALID_URL': 'Please enter a valid YouTube URL (e.g., https://youtu.be/... or https://youtube.com/watch?v=...)',
      'VIDEO_NOT_FOUND': 'This video is not available. It might be private, deleted, or blocked in your region.',
      'NO_LYRICS_FOUND': 'No lyrics found in this video. Try a song with clear vocals or captions enabled.',
      'NETWORK_ERROR': 'Connection failed. Please check your internet connection and try again.',
      'TIMEOUT': 'Request timed out. The video might be too long. Please try a shorter video.',
      'RATE_LIMITED': 'Too many requests. Please wait a moment and try again.',
      'SERVER_ERROR': 'Server error. Please try again in a few minutes.',
      'TRANSLATION_ERROR': 'Translation failed. Please try again or select a different language.',
      'ALL_SERVICES_FAILED': 'Translation services are currently unavailable. Please try again later.',
      'TEXT_TOO_LONG': 'The lyrics are too long to translate. Try a shorter song.',
      'QUOTA_EXCEEDED': 'Translation quota exceeded. Please try again later.'
    };
    
    return errorMessages[error.type] || error.message || 'An unexpected error occurred. Please try again.';
  };

  const getStepMessage = (step) => {
    const stepMessages = {
      'extracting': 'Extracting lyrics from YouTube video...',
      'translating': 'Translating lyrics to your selected language...',
      'completed': 'Translation completed successfully!',
      'error': 'Something went wrong'
    };
    
    return stepMessages[step] || '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.youtubeUrl.trim()) {
      setState(prev => ({
        ...prev,
        error: { type: 'INVALID_URL', message: 'Please enter a YouTube URL' }
      }));
      return;
    }

    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
      result: null,
      step: 'extracting',
      retryCount: 0
    }));

    try {
      // Step 1: Extract lyrics
      setState(prev => ({ ...prev, step: 'extracting' }));
      const lyricsResult = await lyricsApi.extractLyrics(formData.youtubeUrl);
      
      if (!lyricsResult.success) {
        throw lyricsResult.error;
      }

      // Step 2: Translate lyrics
      setState(prev => ({ ...prev, step: 'translating' }));
      const translationResult = await translateApi.translate(
        lyricsResult.data.lyrics,
        formData.targetLanguage
      );

      if (!translationResult.success) {
        throw translationResult.error;
      }

      // Success
      setState(prev => ({
        ...prev,
        loading: false,
        step: 'completed',
        result: {
          ...lyricsResult.data,
          ...translationResult.data
        }
      }));

    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        step: 'error',
        error: error
      }));
    }
  };

  const handleRetry = async () => {
    if (state.retryCount >= 3) {
      setState(prev => ({
        ...prev,
        error: {
          type: 'MAX_RETRIES',
          message: 'Maximum retry attempts reached. Please check your input and try again later.'
        }
      }));
      return;
    }

    setState(prev => ({
      ...prev,
      retryCount: prev.retryCount + 1
    }));

    await handleSubmit({ preventDefault: () => {} });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      // Could add a toast notification here
      console.log('Copied to clipboard');
    });
  };

  const canRetry = (error) => {
    const retryableErrors = [
      'NETWORK_ERROR', 
      'TIMEOUT', 
      'SERVER_ERROR', 
      'TRANSLATION_ERROR',
      'SERVICE_UNAVAILABLE'
    ];
    return error && retryableErrors.includes(error.type) && state.retryCount < 3;
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 shadow-xl">
        {/* YouTube URL Input */}
        <div className="mb-6">
          <label className="flex items-center text-white/90 text-sm font-medium mb-3">
            <Play className="w-4 h-4 mr-2" />
            YouTube Song Link
          </label>
          <input
            type="url"
            value={formData.youtubeUrl}
            onChange={(e) => handleInputChange('youtubeUrl', e.target.value)}
            placeholder="https://youtu.be/kPa7bsKwL-c?si=DLrstgPguY..."
            className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-white/40 focus:bg-white/10 transition-all"
            disabled={state.loading}
          />
        </div>

        {/* Language Selection */}
        <div className="mb-8">
          <label className="flex items-center text-white/90 text-sm font-medium mb-3">
            <Globe className="w-4 h-4 mr-2" />
            Translate to
          </label>
          <div className="relative">
            <select
              value={formData.targetLanguage}
              onChange={(e) => handleInputChange('targetLanguage', e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white focus:outline-none focus:border-white/40 focus:bg-white/10 transition-all appearance-none pr-10"
              disabled={state.loading}
            >
              {getDisplayLanguages().map(lang => (
                <option key={lang.code} value={lang.code} className="bg-gray-800">
                  {lang.flag ? `${lang.flag} ` : ''}{lang.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/60 pointer-events-none" />
          </div>
          
          {/* Show more languages toggle */}
          {!languageState.showAllLanguages && (
            <button
              type="button"
              onClick={() => setLanguageState(prev => ({ ...prev, showAllLanguages: true }))}
              className="mt-2 text-white/60 hover:text-white/80 text-sm underline transition-colors"
            >
              Show more languages
            </button>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={state.loading || !formData.youtubeUrl.trim()}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-4 rounded-xl font-semibold hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
        >
          {state.loading ? (
            <>
              <Loader className="w-5 h-5 mr-2 animate-spin" />
              {getStepMessage(state.step)}
            </>
          ) : (
            'Translate Lyrics'
          )}
        </button>

        {/* Retry Button */}
        {state.error && canRetry(state.error) && (
          <button
            type="button"
            onClick={handleRetry}
            className="w-full mt-3 bg-white/10 text-white py-3 rounded-xl font-medium hover:bg-white/20 transition-all flex items-center justify-center"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry ({3 - state.retryCount} attempts left)
          </button>
        )}
      </form>

      {/* Error Display */}
      {state.error && (
        <div className="mt-6 bg-red-500/10 border border-red-500/20 rounded-xl p-6">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-red-300 font-medium mb-1">
                {state.error.type === 'MAX_RETRIES' ? 'Maximum Retries Reached' : 'Error'}
              </h3>
              <p className="text-red-200 text-sm"></p>