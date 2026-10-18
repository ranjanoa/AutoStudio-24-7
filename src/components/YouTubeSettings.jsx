import React, { useState, useEffect } from 'react';
import { Settings, Key, CheckCircle2, AlertCircle, Save, ExternalLink, ShieldCheck, RefreshCw, LogIn, AlertTriangle, Radio } from 'lucide-react';
import YoutubeIcon from './YoutubeIcon';

export default function YouTubeSettings({ status, onSaveCredentials }) {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [llmKey, setLlmKey] = useState('');
  const [savingLlm, setSavingLlm] = useState(false);
  const [llmMsg, setLlmMsg] = useState(null);

  const [authStatus, setAuthStatus] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(false);
  const [authorizing, setAuthorizing] = useState(false);
  const [authMsg, setAuthMsg] = useState(null);

  const hasSecrets = status?.hasOAuthSecrets;
  const hasLlm = status?.hasLlmKey;

  const fetchAuthStatus = async () => {
    setCheckingAuth(true);
    try {
      const res = await fetch('http://localhost:3001/api/youtube/auth-status');
      const data = await res.json();
      setAuthStatus(data);
    } catch (err) {
      setAuthStatus({ status: 'error', message: 'Could not connect to API' });
    }
    setCheckingAuth(false);
  };

  useEffect(() => {
    fetchAuthStatus();
  }, []);

  const [directAuthUrl, setDirectAuthUrl] = useState(null);

  const handleAuthorize = async () => {
    setAuthorizing(true);
    setAuthMsg(null);
    setDirectAuthUrl(null);
    try {
      const res = await fetch('http://localhost:3001/api/youtube/authorize', {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success && data.authUrl) {
        // Open Google OAuth sign-in directly in a new browser tab
        window.open(data.authUrl, '_blank', 'noopener,noreferrer');
        setDirectAuthUrl(data.authUrl);
        setAuthMsg({
          type: 'info',
          text: 'Google Sign-In opened in a new tab! Select your account and grant YouTube upload permissions.'
        });

        // Automatically poll for status every 2.5s until authorized
        const pollTimer = setInterval(async () => {
          try {
            const checkRes = await fetch('http://localhost:3001/api/youtube/auth-status');
            const checkData = await checkRes.json();
            if (checkData.status === 'valid') {
              setAuthStatus(checkData);
              setDirectAuthUrl(null);
              setAuthMsg({
                type: 'success',
                text: '🎉 YouTube Channel linked and authorized successfully! Auto-uploads are now active.'
              });
              clearInterval(pollTimer);
            }
          } catch (e) {}
        }, 2500);

        setTimeout(() => clearInterval(pollTimer), 180000); // 3 min timeout
      } else {
        setAuthMsg({ type: 'error', text: data.error || 'Failed to start authorization.' });
      }
    } catch (err) {
      setAuthMsg({ type: 'error', text: 'Error initiating authorization process.' });
    }
    setAuthorizing(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await onSaveCredentials({ client_id: clientId, client_secret: clientSecret });
      if (res.success) {
        setMsg({ type: 'success', text: 'Google OAuth client_secrets.json configured successfully!' });
        fetchAuthStatus();
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'Failed to save credentials' });
    }
    setSaving(false);
  };

  const handleLlmSubmit = async (e) => {
    e.preventDefault();
    setSavingLlm(true);
    setLlmMsg(null);
    try {
      const res = await fetch('http://localhost:3001/api/settings/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: llmKey })
      });
      const data = await res.json();
      if (data.success) {
        setLlmMsg({ type: 'success', text: 'LLM API key saved successfully!' });
        setLlmKey('');
      }
    } catch (err) {
      setLlmMsg({ type: 'error', text: 'Failed to save LLM API key' });
    }
    setSavingLlm(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <Settings size={24} color="#818CF8" />
          <h2 style={{ fontSize: '1.6rem', fontWeight: 700 }}>YouTube API & OAuth Credentials Hub</h2>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Connect AutoStudio directly to your YouTube Channel via the official YouTube Data API v3 for automated video publishing.
        </p>
      </div>

      {/* Live YouTube Channel Authorization Card */}
      <div className="glass-panel" style={{ padding: '2rem', border: authStatus?.status === 'valid' ? '1px solid rgba(16, 185, 129, 0.4)' : authStatus?.status === 'expired' ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <YoutubeIcon size={28} color={authStatus?.status === 'valid' ? '#10B981' : '#FF0000'} />
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>YouTube Channel Connection Status</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Direct channel publishing requires an active OAuth 2.0 authorization token.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button 
              onClick={fetchAuthStatus}
              disabled={checkingAuth}
              className="btn-secondary"
              style={{ padding: '0.5rem 0.85rem', fontSize: '0.8rem' }}
              title="Refresh connection status"
            >
              <RefreshCw size={14} className={checkingAuth ? "spin" : ""} /> Check Status
            </button>
            <div className={authStatus?.status === 'valid' ? "badge badge-live" : authStatus?.status === 'expired' ? "badge badge-error" : "badge badge-idle"}>
              {authStatus?.status === 'valid' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
              {authStatus?.status === 'valid' ? "CHANNEL LINKED & ACTIVE" : authStatus?.status === 'expired' ? "TOKEN EXPIRED (SIMULATING)" : "NOT AUTHORIZED"}
            </div>
          </div>
        </div>

        {/* Detailed Status Notice */}
        {authStatus?.status === 'expired' && (
          <div style={{ padding: '1rem 1.25rem', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', marginBottom: '1.25rem', color: '#FCA5A5', fontSize: '0.88rem', lineHeight: 1.6 }}>
            <strong>⚠️ OAuth Token Expired or Revoked (invalid_grant):</strong>
            <p style={{ marginTop: '0.35rem', color: '#FEE2E2' }}>
              Your Google OAuth authorization has expired. Google Cloud projects in <i>Testing</i> mode expire refresh tokens after 7 days. Because of this, automatic uploads have been falling back to <strong>simulated mode</strong>.
            </p>
            <p style={{ marginTop: '0.35rem', fontWeight: 600 }}>
              Click "Authorize / Reconnect YouTube Channel" below to log in and restore live auto-uploading.
            </p>
          </div>
        )}

        {authStatus?.status === 'valid' && (
          <div style={{ padding: '1rem 1.25rem', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.25)', marginBottom: '1.25rem', color: '#6EE7B7', fontSize: '0.88rem' }}>
            <strong>✨ YouTube Channel is connected and active:</strong> {authStatus.message}. All continuous cycles and manual videos will upload directly to your channel!
          </div>
        )}

        {authMsg && (
          <div style={{ padding: '0.85rem 1.25rem', borderRadius: '10px', marginBottom: '1.25rem', background: authMsg.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)', color: authMsg.type === 'error' ? '#F87171' : '#93C5FD', fontSize: '0.88rem', lineHeight: 1.6 }}>
            {authMsg.text}
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button 
            onClick={handleAuthorize} 
            disabled={authorizing || !hasSecrets}
            className="btn-primary" 
            style={{ padding: '0.85rem 1.5rem', fontSize: '0.95rem', fontWeight: 600, background: '#FF0000', borderColor: '#FF0000', cursor: authorizing ? 'wait' : 'pointer' }}
          >
            <LogIn size={18} /> {authorizing ? "Opening Google Sign-In..." : "Authorize / Reconnect YouTube Channel"}
          </button>
          
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Opens Google consent in your browser to generate a fresh token for your channel.
          </span>
        </div>

        {directAuthUrl && (
          <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'rgba(59, 130, 246, 0.15)', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
            <span style={{ fontSize: '0.85rem', color: '#93C5FD' }}>
              Popup blocked? <a href={directAuthUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#60A5FA', fontWeight: 600, textDecoration: 'underline' }}>Click here to open Google Sign-In manually <ExternalLink size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /></a>
            </span>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        
        {/* Credentials Form */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Google OAuth Credentials</h3>
            <div className={hasSecrets ? "badge badge-live" : "badge badge-idle"}>
              {hasSecrets ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
              {hasSecrets ? "SECRETS CONFIGURED" : "MISSING SECRETS"}
            </div>
          </div>

          {msg && (
            <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', background: msg.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', color: msg.type === 'success' ? '#34D399' : '#F87171', fontSize: '0.85rem' }}>
              {msg.text}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                Client ID
              </label>
              <input
                type="text"
                placeholder="xxxxxxxxx-xxxxxxxxxx.apps.googleusercontent.com"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                required
                style={{ width: '100%', background: 'rgba(0,0,0,0.4)', color: 'white', border: '1px solid var(--border-color)', padding: '0.75rem', borderRadius: '10px', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                Client Secret
              </label>
              <input
                type="password"
                placeholder="GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                required
                style={{ width: '100%', background: 'rgba(0,0,0,0.4)', color: 'white', border: '1px solid var(--border-color)', padding: '0.75rem', borderRadius: '10px', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
              />
            </div>

            <button className="btn-primary" disabled={saving} type="submit" style={{ padding: '0.85rem', justifyContent: 'center', marginTop: '0.5rem' }}>
              <Save size={16} /> Save YouTube OAuth Secrets
            </button>
          </form>
        </div>

        {/* LLM API Key Form */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>LLM API Key (OpenAI / Gemini)</h3>
            <div className={hasLlm ? "badge badge-live" : "badge badge-idle"}>
              {hasLlm ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
              {hasLlm ? "AI CONFIGURED" : "USING STATIC TEMPLATES"}
            </div>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Enter an OpenAI (sk-...) or Google Gemini (AIza...) API Key. The engine will automatically detect the provider and generate 100% unique, dynamic scripts!
          </p>

          {llmMsg && (
            <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', background: llmMsg.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', color: llmMsg.type === 'success' ? '#34D399' : '#F87171', fontSize: '0.85rem' }}>
              {llmMsg.text}
            </div>
          )}

          <form onSubmit={handleLlmSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                API Key
              </label>
              <input
                type="password"
                placeholder="sk-... or AIza..."
                value={llmKey}
                onChange={(e) => setLlmKey(e.target.value)}
                required
                style={{ width: '100%', background: 'rgba(0,0,0,0.4)', color: 'white', border: '1px solid var(--border-color)', padding: '0.75rem', borderRadius: '10px', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
              />
            </div>
            <button className="btn-primary" disabled={savingLlm} type="submit" style={{ padding: '0.85rem', justifyContent: 'center', marginTop: '0.5rem' }}>
              <Save size={16} /> Save AI API Key
            </button>
          </form>
        </div>

        {/* Step-by-Step setup guide */}
        <div className="glass-panel" style={{ padding: '2rem', gridColumn: 'span 2' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={20} color="#34D399" /> Preventing 7-Day OAuth Expiration in Google Cloud
          </h3>

          <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.8, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <p>
              By default, Google expires OAuth refresh tokens every <strong>7 days</strong> if your Google Cloud Console OAuth Consent Screen is in <strong>Testing</strong> mode.
            </p>
            <p>
              To make your authorization permanent without expiring every week:
            </p>
            <ol style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>
                Open the <a href="https://console.cloud.google.com/apis/credentials/consent" target="_blank" rel="noreferrer" style={{ color: '#818CF8' }}>Google Cloud OAuth Consent Screen <ExternalLink size={12} /></a>.
              </li>
              <li>
                Under <strong>Publishing status</strong>, click <strong>"PUBLISH APP"</strong>.
              </li>
              <li>
                Even if verification is unverified/pending, published apps for personal channels will keep refresh tokens alive indefinitely without 7-day timeouts!
              </li>
              <li>
                Alternatively, if you keep it in Testing mode, simply click <strong>"Authorize / Reconnect YouTube Channel"</strong> above once a week to refresh permissions.
              </li>
            </ol>
          </div>
        </div>

      </div>

    </div>
  );
}
