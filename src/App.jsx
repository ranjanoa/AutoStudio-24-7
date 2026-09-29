import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import DashboardOverview from './components/DashboardOverview';
import ContinuousControl from './components/ContinuousControl';
import GenreStudio from './components/GenreStudio';
import VideoGenerator from './components/VideoGenerator';
import VideoLibrary from './components/VideoLibrary';
import YouTubeSettings from './components/YouTubeSettings';
import LogTerminal from './components/LogTerminal';

const API_BASE = 'http://localhost:3001/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [status, setStatus] = useState(null);
  const [videos, setVideos] = useState([]);
  const [genres, setGenres] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch data from API
  const fetchAllData = async () => {
    try {
      const [resStatus, resVideos, resGenres, resLogs] = await Promise.all([
        fetch(`${API_BASE}/status`).then(r => r.json()),
        fetch(`${API_BASE}/videos`).then(r => r.json()),
        fetch(`${API_BASE}/genres`).then(r => r.json()),
        fetch(`${API_BASE}/logs`).then(r => r.json())
      ]);

      setStatus(resStatus);
      setVideos(resVideos);
      setGenres(resGenres);
      setLogs(resLogs);
      setLoading(false);
    } catch (err) {
      console.error("API Polling Error:", err);
    }
  };

  // Poll status every 3 seconds for live 24/7 dashboard telemetry
  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleContinuous = async () => {
    if (!status) return;
    const nextState = !status.automation?.active;
    await fetch(`${API_BASE}/automation/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: nextState })
    });
    fetchAllData();
  };

  const handleUpdateAutomation = async (automationConfig) => {
    await fetch(`${API_BASE}/automation/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(automationConfig)
    });
    fetchAllData();
  };

  const handleSaveGenres = async (updatedGenres) => {
    await fetch(`${API_BASE}/genres`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedGenres)
    });
    fetchAllData();
  };

  const handleGenerateVideo = async (payload) => {
    const res = await fetch(`${API_BASE}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    fetchAllData();
    return data;
  };

  const handleSaveCredentials = async (creds) => {
    const res = await fetch(`${API_BASE}/youtube/credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(creds)
    });
    const data = await res.json();
    fetchAllData();
    return data;
  };

  if (loading && !status) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', color: 'var(--text-muted)' }}>
        <div className="pulse-dot" style={{ width: '20px', height: '20px' }} />
        <h2>Connecting to AutoStudio 24/7 Engine...</h2>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Header & Ticker */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        status={status}
        onToggleContinuous={handleToggleContinuous}
      />

      {/* Main Content Viewport */}
      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 2rem 4rem 2rem', width: '100%', flex: 1 }}>
        {activeTab === 'dashboard' && (
          <DashboardOverview
            status={status}
            videos={videos}
            genres={genres}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'automation' && (
          <ContinuousControl
            status={status}
            genres={genres}
            onUpdateAutomation={handleUpdateAutomation}
          />
        )}

        {activeTab === 'genres' && (
          <GenreStudio
            genres={genres}
            onSaveGenres={handleSaveGenres}
            onTriggerGenerate={(genreId) => {
              setActiveTab('generator');
            }}
          />
        )}

        {activeTab === 'generator' && (
          <VideoGenerator
            genres={genres}
            onGenerateVideo={handleGenerateVideo}
            onVideoCompleted={() => fetchAllData()}
          />
        )}

        {activeTab === 'library' && (
          <VideoLibrary videos={videos} />
        )}

        {activeTab === 'settings' && (
          <YouTubeSettings
            status={status}
            onSaveCredentials={handleSaveCredentials}
          />
        )}

        {activeTab === 'logs' && (
          <LogTerminal
            logs={logs}
            onRefreshLogs={fetchAllData}
          />
        )}
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border-color)', padding: '1.5rem 2rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        AutoStudio 24/7 Autonomous YouTube Video Production System • Powered by Edge-TTS & FFmpeg
      </footer>

    </div>
  );
}
