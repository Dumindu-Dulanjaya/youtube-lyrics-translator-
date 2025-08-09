import React, { useState, useReducer } from 'react';
import { extractLyrics } from '../api/lyricsApi';
import { translate } from '../api/translateApi';
import {
  Youtube,
  Globe2,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Copy,
} from 'lucide-react';

const initialState = {
  error: null,
  result: null,
  loading: false,
};

function reducer(state, action) {
  switch (action.type) {
    case 'START':
      return { ...state, loading: true, error: null, result: null };
    case 'SUCCESS':
      return { ...state, loading: false, result: action.payload };
    case 'ERROR':
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
}

export default function LyricsForm() {
  const [url, setUrl] = useState('');
  const [language, setLanguage] = useState('en');
  const [state, dispatch] = useReducer(reducer, initialState);

  const getErrorMessage = (error) => {
    if (!error) return '';
    if (typeof error === 'string') return error;
    if (error.type === 'MAX_RETRIES') {
      return 'We tried multiple times but could not fetch the lyrics. Please try again later.';
    }
    return error.message || 'Something went wrong. Please try again.';
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    dispatch({ type: 'START' });

    try {
      const lyricsResp = await extractLyrics(url);

      if (!lyricsResp.success) {
        dispatch({ type: 'ERROR', payload: lyricsResp.error });
        return;
      }

      if (!lyricsResp.data.lyrics) {
        dispatch({
          type: 'ERROR',
          payload: {
            type: 'NO_LYRICS_FOUND',
            message: 'No lyrics found. Please paste manually.',
          },
        });
        return;
      }

      const tr = await translate(lyricsResp.data.lyrics, language);
      if (!tr.success) {
        dispatch({ type: 'ERROR', payload: tr.error });
        return;
      }

      dispatch({
        type: 'SUCCESS',
        payload: {
          translatedLyrics: tr.data.translatedText,
          originalLyrics: lyricsResp.data.lyrics,
          title: lyricsResp.data.title,
        },
      });
    } catch (err) {
      dispatch({
        type: 'ERROR',
        payload: {
          type: err?.type || 'UNKNOWN_ERROR',
          message: err?.message || 'Something went wrong.',
        },
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* URL input */}
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-2">
            YouTube Song URL
          </label>
          <div className="relative">
            <Youtube className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
            <input
              type="url"
              required
              placeholder="https://youtube.com/watch?v=..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100"
            />
          </div>
        </div>

        {/* Language selector */}
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-2">
            Target Language
          </label>
          <div className="relative">
            <Globe2 className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100"
            >
              <option value="en">English</option>
              <option value="si">Sinhala</option>
              <option value="ta">Tamil</option>
              <option value="hi">Hindi</option>
            </select>
          </div>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={state.loading}
          className="w-full flex justify-center items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white"
        >
          {state.loading && <Loader2 className="w-5 h-5 animate-spin mr-2" />}
          {state.loading ? 'Translating...' : 'Translate Lyrics'}
        </button>
      </form>

      {/* Error Message */}
      {state.error && (
        <div className="mt-6 bg-red-500/10 border border-red-500/20 rounded-xl p-6">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-red-300 font-medium mb-1">
                {state.error.type === 'MAX_RETRIES'
                  ? 'Maximum Retries Reached'
                  : 'Error'}
              </h3>
              <p className="text-red-200 text-sm">
                {getErrorMessage(state.error)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Success Display */}
      {state.result && (
        <div className="mt-6 bg-green-500/10 border border-green-500/20 rounded-xl p-6 space-y-4">
          <div className="flex items-start">
            <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-green-300 font-medium mb-1">
                Translated Lyrics
              </h3>
              <p className="text-green-200 text-sm whitespace-pre-wrap">
                {state.result.translatedLyrics}
              </p>
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(state.result.translatedLyrics)
                }
                className="mt-3 flex items-center text-green-300 hover:text-green-100 text-sm"
              >
                <Copy className="w-4 h-4 mr-2" /> Copy to Clipboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
