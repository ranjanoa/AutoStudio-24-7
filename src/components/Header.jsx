import React from 'react';
import { Play, Pause, Cpu, Layers, Video, Settings, Terminal, Activity } from 'lucide-react';
import YoutubeIcon from './YoutubeIcon';

export default function Header({ activeTab, setActiveTab, status, onToggleContinuous }) {
  const isContinuous = status?.automation?.active;

  return (
    <header className="glass-panel" style={{ borderRadius: 0, borderTop: 0, borderLeft: 0, borderRight: 0, padding: '1rem 2rem', marginBottom: '2rem' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        
        {/* Logo & Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ 
            background: 'linear-gradient(135deg, #FF0000 0%, #B91C1C 100%)', 
            padding: '0.75rem', 
            borderRadius: '12px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(255, 0, 0, 0.4)'
          }}>
            <YoutubeIcon size={28} color="white" />
          </div>
          <div>
            <h1 className="text-gradient" style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.5px' }}>
              AutoStudio 24/7
            </h1>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Continuous YouTube AI Video Generation & Upload Suite
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.3)', padding: '0.35rem', borderRadius: '12px' }}>
          {[
            { id: 'dashboard', label: 'Dashboard', icon: Activity },
            { id: 'automation', label: 'Continuous 24/7', icon: Cpu },
            { id: 'genres', label: 'Genre Hub', icon: Layers },
            { id: 'generator', label: 'Manual Sandbox', icon: Video },
            { id: 'library', label: 'Video Library', icon: YoutubeIcon },
            { id: 'settings', label: 'API & YouTube', icon: Settings },
            { id: 'logs', label: 'Console Logs', icon: Terminal }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  background: isActive ? 'var(--primary)' : 'transparent',
                  color: isActive ? 'white' : 'var(--text-muted)',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  transition: 'all 0.2s ease'
                }}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Continuous Quick Toggle Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={onToggleContinuous}
            className={isContinuous ? "btn-danger" : "btn-primary"}
            style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
          >
            {isContinuous ? (
              <>
                <Pause size={16} /> STOP CONTINUOUS LOOP
              </>
            ) : (
              <>
                <Play size={16} /> START CONTINUOUS 24/7
              </>
            )}
          </button>
          
          <div className={isContinuous ? "badge badge-live" : "badge badge-idle"}>
            {isContinuous && <div className="pulse-dot" />}
            {isContinuous ? "24/7 ACTIVE" : "IDLE"}
          </div>
        </div>

      </div>
    </header>
  );
}
