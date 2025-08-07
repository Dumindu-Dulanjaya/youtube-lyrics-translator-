// Translation API using LibreTranslate
// Free and public: https://libretranslate.com

export const translateText = async (text, targetLang) => {
  try {
    const response = await fetch('https://libretranslate.de/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        q: text,
        source: 'auto',
        target: targetLang,
        format: 'text'
      })
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    return data.translatedText;
  } catch (error) {
    console.error('Translation error:', error);
    return '⚠️ Translation failed. Please try again.';
  }
};
