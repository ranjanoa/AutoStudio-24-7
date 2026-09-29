import React, { useState } from 'react';
import { Cpu, Play, Pause, RefreshCw, Clock, CheckSquare, Square, Shield, Zap } from 'lucide-react';

export default function ContinuousControl({ status, genres, onUpdateAutomation }) {
  const currentAuto = status?.automation || {};
  
  const [active, setActive] = useState(currentAuto.active || false);
  const [intervalMinutes, setIntervalMinutes] = useState(currentAuto.intervalMinutes || 15);
  const [strategy, setStrategy] = useState(currentAuto.strategy || 'sequential');
  const [privacy, setPrivacy] = useState(currentAuto.privacy || 'unlisted');
  const [autoUpload, setAutoUpload] = useState(currentAuto.autoUpload !== false);
  const [selectedGenres, setSelectedGenres] = useState(
    currentAuto.selectedGenres || genres.map(g => g.id)
  );
  const [saving, setSaving] = useState(false);

  const toggleGenre = (genreId) => {
    if (selectedGenres.includes(genreId)) {
      if (selectedGenres.length > 1) {
        setSelectedGenres(selectedGenres.filter(id => id !== genreId));
      }
    } else {
      setSelectedGenres([...selectedGenres, genreId]);
    }
  };

  const handleSaveAndToggle = async (newActiveState) => {
    setSaving(true);
    const targetState = newActiveState !== undefined ? newActiveState : active;
    setActive(targetState);
    await onUpdateAutomation({
      active: targetState,
      intervalMinutes: parseInt(intervalMinutes),
      strategy,
      privacy,
      autoUpload,
      selectedGenres
    });
    setSaving(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header Info */}
      <div className="glass-panel" style={{ padding: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <Cpu size={24} color="#818CF8" />
            <h2 style={{ fontSize: '1.6rem', fontWeight: 700 }}>24/7 Continuous Automation Studio</h2>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '750px' }}>
            Configure AutoStudio to autonomously research, voiceover, composite, render, and upload YouTube videos in an endless loop across all your enabled genres.
          </p>
        </div>

        <button
          className={active ? "btn-danger" : "btn-primary"}
          disabled={saving}
          onClick={() => handleSaveAndToggle(!active)}
          style={{ padding: '1rem 2rem', fontSize: '1rem', borderRadius: '12px' }}
        >
          {saving ? <RefreshCw size={20} className="spin" /> : active ? <Pause size={20} /> : <Play size={20} />}
          {active ? "STOP AUTOMATION" : "START CONTINUOUS 24/7"}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        
        {/* Settings Form */}
        <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            Automation Parameters
          </h3>

          {/* Interval frequency */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-main)' }}>
              Video Creation Frequency Interval
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
              {[
                { label: 'Every 5 Mins', val: 5 },
                { label: 'Every 15 Mins', val: 15 },
                { label: 'Every 1 Hour', val: 60 },
                { label: 'Every 3 Hours', val: 180 }
              ].map(item => (
                <button
                  key={item.val}
                  type="button"
                  onClick={() => setIntervalMinutes(item.val)}
                  style={{
                    background: intervalMinutes === item.val ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                    color: intervalMinutes === item.val ? 'white' : 'var(--text-muted)',
                    border: '1px solid var(--border-color)',
                    padding: '0.75rem',
                    borderRadius: '10px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rotation Strategy */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-main)' }}>
              Genre Rotation Strategy
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div
                onClick={() => setStrategy('sequential')}
                style={{
                  background: strategy === 'sequential' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(0,0,0,0.3)',
                  border: `2px solid ${strategy === 'sequential' ? 'var(--primary)' : 'transparent'}`,
                  borderRadius: '12px',
                  padding: '1rem',
                  cursor: 'pointer'
                }}
              >
                <div style={{ fontWeight: 700, color: 'white', marginBottom: '0.25rem' }}>
                  🔄 Round-Robin Sequential
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Cycles through genres sequentially (History ➔ Kids ➔ Languages ➔ Trending ➔ Politics).
                </p>
              </div>

              <div
                onClick={() => setStrategy('random')}
                style={{
                  background: strategy === 'random' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(0,0,0,0.3)',
                  border: `2px solid ${strategy === 'random' ? 'var(--primary)' : 'transparent'}`,
                  borderRadius: '12px',
                  padding: '1rem',
                  cursor: 'pointer'
                }}
              >
                <div style={{ fontWeight: 700, color: 'white', marginBottom: '0.25rem' }}>
                  🎲 Weighted Random Selection
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Picks a random genre from your enabled list for unpredictable fresh video uploads.
                </p>
              </div>
            </div>
          </div>

          {/* Enabled Genres Selection */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-main)' }}>
              Enabled Genres in Continuous Rotation ({selectedGenres.length} active)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
              {genres.map(g => {
                const isSelected = selectedGenres.includes(g.id);
                return (
                  <div
                    key={g.id}
                    onClick={() => toggleGenre(g.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      background: isSelected ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.2)',
                      border: `1px solid ${isSelected ? g.themeColor : 'rgba(255,255,255,0.05)'}`,
                      padding: '0.75rem',
                      borderRadius: '10px',
                      cursor: 'pointer'
                    }}
                  >
                    {isSelected ? <CheckSquare size={18} color={g.themeColor} /> : <Square size={18} color="gray" />}
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{g.name}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* YouTube Upload Privacy */}
          <div style={{ display: 'flex', gap: '2rem' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>
                YouTube Default Privacy
              </label>
              <select
                value={privacy}
                onChange={(e) => setPrivacy(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(0,0,0,0.4)',
                  color: 'white',
                  border: '1px solid var(--border-color)',
                  padding: '0.75rem',
                  borderRadius: '10px',
                  fontWeight: 600
                }}
              >
                <option value="unlisted">Unlisted (Recommended for sandbox testing)</option>
                <option value="public">Public (Instant Live YouTube reach)</option>
                <option value="private">Private (Draft review mode)</option>
              </select>
            </div>

            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1.5rem' }}>
              <input
                type="checkbox"
                id="autoUploadCheck"
                checked={autoUpload}
                onChange={(e) => setAutoUpload(e.target.checked)}
                style={{ width: '20px', height: '20px', accentColor: 'var(--primary)' }}
              />
              <label htmlFor="autoUploadCheck" style={{ fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}>
                Auto-Upload to YouTube API immediately after rendering MP4
              </label>
            </div>
          </div>

          <button
            className="btn-primary"
            disabled={saving}
            onClick={() => handleSaveAndToggle(active)}
            style={{ marginTop: '1rem', padding: '0.9rem', justifyContent: 'center' }}
          >
            Save Automation Settings
          </button>
        </div>

        {/* Live Engine Monitor Side Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={18} color="#34D399" /> Engine Loop Telemetry
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '10px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Loop Status</span>
                <strong style={{ fontSize: '1.1rem', color: active ? '#34D399' : 'var(--text-muted)' }}>
                  {active ? "RUNNING CONTINUOUSLY" : "PAUSED"}
                </strong>
              </div>

              {active && currentAuto.nextRunTime && (
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '10px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Next Automated Batch</span>
                  <strong style={{ fontSize: '1.1rem', color: '#818CF8' }}>
                    {new Date(currentAuto.nextRunTime).toLocaleTimeString()}
                  </strong>
                </div>
              )}

              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '10px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Auto Videos Generated</span>
                <strong style={{ fontSize: '1.5rem' }}>{currentAuto.totalAutoGenerated || 0}</strong>
              </div>

              <button
                className="btn-secondary"
                onClick={() => handleSaveAndToggle(true)}
                style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}
              >
                <Zap size={16} color="#FBBF24" /> Trigger Immediate Cycle Now
              </button>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(239, 68, 68, 0.05)', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#F87171', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Shield size={16} /> YouTube Quota & Safety Notice
            </h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Standard YouTube Data API v3 free tier quota allows ~6 video uploads per day (1,600 units per video upload). AutoStudio includes automatic simulated fallback mode when quota limits are reached.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
