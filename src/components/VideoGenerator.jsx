import React, { useState } from 'react';
import { Video, Sparkles, RefreshCw, CheckCircle2, Play, Upload, FileText, Image as ImageIcon, Music } from 'lucide-react';

export default function VideoGenerator({ genres, onGenerateVideo, onVideoCompleted }) {
  const [selectedGenre, setSelectedGenre] = useState(genres[0]?.id || 'history');
  const [customTopic, setCustomTopic] = useState('');
  const [privacy, setPrivacy] = useState('unlisted');
  const [autoUpload, setAutoUpload] = useState(true);
  
  const [isBuilding, setIsBuilding] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [completedVideo, setCompletedVideo] = useState(null);

  const steps = [
    { title: "Script Storyboard", icon: FileText, desc: "AI writing high-CTR hook and 4 scenes" },
    { title: "Voiceover Synthesis", icon: Music, desc: "Neural TTS generating narration audio" },
    { title: "Visual Slide Graphics", icon: ImageIcon, desc: "Rendering HD glassmorphism slide graphics" },
    { title: "FFmpeg MP4 Render", icon: Video, desc: "Stitching audio & slides into 1080p MP4" },
    { title: "YouTube Auto-Upload", icon: Upload, desc: "Publishing metadata & media to YouTube" }
  ];

  const handleStartBuild = async () => {
    setIsBuilding(true);
    setCompletedVideo(null);
    setActiveStep(1);

    // Simulated progress steps animation while backend processes python engine
    const stepInterval = setInterval(() => {
      setActiveStep(prev => {
        if (prev < 4) return prev + 1;
        return prev;
      });
    }, 2500);

    const result = await onGenerateVideo({
      genreId: selectedGenre,
      topic: customTopic.trim() || undefined,
      privacy,
      autoUpload
    });

    clearInterval(stepInterval);
    setActiveStep(5);
    setIsBuilding(false);

    if (result && result.latestVideo) {
      setCompletedVideo(result.latestVideo);
      if (onVideoCompleted) onVideoCompleted(result.latestVideo);
    }
  };

  const currentGenreObj = genres.find(g => g.id === selectedGenre) || genres[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <Sparkles size={24} color="#818CF8" />
          <h2 style={{ fontSize: '1.6rem', fontWeight: 700 }}>Manual Video Sandbox Studio</h2>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Create an on-demand video for any genre or enter your own custom topic prompt to watch the full pipeline build live.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        
        {/* Controls Form */}
        <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            Video Build Configuration
          </h3>

          {/* Genre selector */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Select Target Genre</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.5rem' }}>
              {genres.map(g => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setSelectedGenre(g.id)}
                  style={{
                    background: selectedGenre === g.id ? g.themeColor : 'rgba(0,0,0,0.3)',
                    color: selectedGenre === g.id ? 'white' : 'var(--text-muted)',
                    border: `1px solid ${selectedGenre === g.id ? g.themeColor : 'rgba(255,255,255,0.08)'}`,
                    padding: '0.6rem',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  {g.name}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Topic Prompt */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>
              Custom Topic / Headline (Optional)
            </label>
            <input
              type="text"
              placeholder={`e.g., "${currentGenreObj?.presetTopics?.[0] || 'Mind-Blowing Discovery'}"`}
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(0,0,0,0.4)',
                color: 'white',
                border: '1px solid var(--border-color)',
                padding: '0.75rem',
                borderRadius: '10px',
                fontSize: '0.95rem'
              }}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem', display: 'block' }}>
              Leave blank to automatically select an engaging preset topic for {currentGenreObj?.name}.
            </span>
          </div>

          {/* Privacy & Upload Toggle */}
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.3rem', fontSize: '0.85rem' }}>Privacy</label>
              <select
                value={privacy}
                onChange={(e) => setPrivacy(e.target.value)}
                style={{ width: '100%', background: 'rgba(0,0,0,0.4)', color: 'white', border: '1px solid var(--border-color)', padding: '0.5rem', borderRadius: '8px' }}
              >
                <option value="unlisted">Unlisted (Sandbox)</option>
                <option value="public">Public (Live Upload)</option>
                <option value="private">Private (Draft)</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.2rem' }}>
              <input
                type="checkbox"
                id="manualUploadCheck"
                checked={autoUpload}
                onChange={(e) => setAutoUpload(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
              />
              <label htmlFor="manualUploadCheck" style={{ fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
                Publish to YouTube
              </label>
            </div>
          </div>

          <button
            className="btn-primary"
            disabled={isBuilding}
            onClick={handleStartBuild}
            style={{ marginTop: '1rem', padding: '1rem', justifyContent: 'center', fontSize: '1rem' }}
          >
            {isBuilding ? <RefreshCw size={20} className="spin" /> : <Sparkles size={20} />}
            {isBuilding ? "GENERATING VIDEO PIPELINE..." : `GENERATE ${currentGenreObj?.name.toUpperCase()} VIDEO`}
          </button>
        </div>

        {/* Live Pipeline Status Progress */}
        <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.5rem' }}>
              Live Execution Telemetry
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {steps.map((st, i) => {
                const Icon = st.icon;
                const isCurrent = isBuilding && activeStep === i + 1;
                const isDone = activeStep > i + 1 || (completedVideo && activeStep === 5);

                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: isDone ? '#10B981' : isCurrent ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isDone || isCurrent ? 'white' : 'var(--text-muted)',
                      boxShadow: isCurrent ? '0 0 15px var(--primary-glow)' : 'none'
                    }}>
                      {isDone ? <CheckCircle2 size={20} /> : <Icon size={20} />}
                    </div>

                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: isDone ? '#34D399' : isCurrent ? 'white' : 'var(--text-muted)' }}>
                        {st.title} {isCurrent && "(Processing...)"}
                      </h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{st.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Completed Video Result Box */}
          {completedVideo && (
            <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: '12px' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ width: '80px', height: '45px', borderRadius: '6px', overflow: 'hidden', background: 'linear-gradient(135deg, #1E1B4B 0%, #0F172A 100%)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img 
                    src={`http://localhost:3001${completedVideo.thumbnailFile}`} 
                    alt={completedVideo.title} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} 
                    onError={(e) => { e.target.style.opacity = '0'; }}
                  />
                  <Play size={14} color="white" style={{ zIndex: 2 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#34D399' }}>Video Created Successfully!</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{completedVideo.title}</p>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
