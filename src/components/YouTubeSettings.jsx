import React, { useState } from 'react';
import { Settings, Key, CheckCircle2, AlertCircle, Save, ExternalLink, ShieldCheck } from 'lucide-react';
import YoutubeIcon from './YoutubeIcon';

export default function YouTubeSettings({ status, onSaveCredentials }) {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [llmKey, setLlmKey] = useState('');
  const [savingLlm, setSavingLlm] = useState(false);
  const [llmMsg, setLlmMsg] = useState(null);

  const hasSecrets = status?.hasOAuthSecrets;
  const hasLlm = status?.hasLlmKey;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await onSaveCredentials({ client_id: clientId, client_secret: clientSecret });
      if (res.success) {
        setMsg({ type: 'success', text: 'Google OAuth client_secrets.json configured successfully!' });
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        
        {/* Credentials Form */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Google OAuth Credentials</h3>
            <div className={hasSecrets ? "badge badge-live" : "badge badge-idle"}>
              {hasSecrets ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
              {hasSecrets ? "OAUTH CONFIGURED" : "SANDBOX SIMULATION MODE"}
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
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={20} color="#34D399" /> How to get Google OAuth Credentials
          </h3>

          <ol style={{ paddingLeft: '1.25rem', color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.8, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <li>
              Go to the <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" style={{ color: '#818CF8' }}>Google Cloud Console <ExternalLink size={12} /></a> and create a new project.
            </li>
            <li>
              Enable the <strong>YouTube Data API v3</strong> under <i>APIs & Services ➔ Library</i>.
            </li>
            <li>
              Configure the <strong>OAuth Consent Screen</strong> (set app type to <i>External</i> or <i>Testing</i> and add your YouTube Google account email as a Test User).
            </li>
            <li>
              Under <i>APIs & Services ➔ Credentials</i>, click <strong>Create Credentials ➔ OAuth Client ID</strong>.
            </li>
            <li>
              Select Application Type: <strong>Desktop App</strong>.
            </li>
            <li>
              Copy the generated <code>Client ID</code> and <code>Client Secret</code> into the form on the left!
            </li>
          </ol>
        </div>

      </div>

    </div>
  );
}
