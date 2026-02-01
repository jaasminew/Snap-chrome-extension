import React from 'react';
import ReactDOM from 'react-dom/client';
import { saveApiKey, getApiKey, getDefaultLanguage, saveDefaultLanguage } from '@/shared/storage';
import { t } from '@/shared/i18n';
import type { Language } from '@/shared/types';

function Popup() {
  const [apiKey, setApiKey] = React.useState('');
  const [showApiKey, setShowApiKey] = React.useState(false);
  const [language, setLanguage] = React.useState<Language>('en');
  const [saved, setSaved] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  // Load settings on mount
  React.useEffect(() => {
    (async () => {
      const storedKey = await getApiKey();
      const storedLanguage = await getDefaultLanguage();

      if (storedKey) {
        setApiKey(storedKey);
      }

      setLanguage(storedLanguage);
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    if (apiKey.trim()) {
      await saveApiKey(apiKey.trim());
      await saveDefaultLanguage(language);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  if (loading) {
    return (
      <div style={{ width: '400px', padding: '20px', textAlign: 'center' }}>
        Loading...
      </div>
    );
  }

  return (
    <div
      style={{
        width: '400px',
        padding: '20px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <h1 style={{ fontSize: '20px', marginBottom: '8px', color: '#111' }}>
        {t('settings_title', language)}
      </h1>

      <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
        {t('help_text', language)}
      </p>

      {/* API Key */}
      <div style={{ marginBottom: '20px' }}>
        <label
          htmlFor="api-key"
          style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#333' }}
        >
          {t('api_key_label', language)}
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            id="api-key"
            type={showApiKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={t('api_key_placeholder', language)}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: '1px solid #ccc',
              borderRadius: '6px',
              fontSize: '14px',
              fontFamily: 'monospace',
            }}
          />
          <button
            onClick={() => setShowApiKey(!showApiKey)}
            style={{
              padding: '8px 12px',
              backgroundColor: '#f3f4f6',
              border: '1px solid #ccc',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            {showApiKey ? t('api_key_hide', language) : t('api_key_show', language)}
          </button>
        </div>
      </div>

      {/* Default Language */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#333' }}>
          {t('default_language_label', language)}
        </label>
        <div style={{ display: 'flex', gap: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="radio"
              name="language"
              checked={language === 'en'}
              onChange={() => setLanguage('en')}
              style={{ marginRight: '6px' }}
            />
            <span style={{ fontSize: '14px' }}>English</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="radio"
              name="language"
              checked={language === 'zh'}
              onChange={() => setLanguage('zh')}
              style={{ marginRight: '6px' }}
            />
            <span style={{ fontSize: '14px' }}>中文</span>
          </label>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        style={{
          width: '100%',
          padding: '12px',
          backgroundColor: saved ? '#22c55e' : '#5b21b6',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '14px',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'background-color 0.2s',
        }}
      >
        {saved ? '✓ Saved!' : t('save_key', language)}
      </button>

      {/* Help */}
      <div
        style={{
          marginTop: '20px',
          padding: '12px',
          backgroundColor: '#f3f4f6',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#666',
        }}
      >
        <strong>Get your API key:</strong>
        <br />
        Visit{' '}
        <a
          href="https://aistudio.google.com/app/apikey"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#5b21b6' }}
        >
          aistudio.google.com
        </a>
      </div>
    </div>
  );
}

const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(<Popup />);
}
