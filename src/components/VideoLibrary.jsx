import React, { useState } from 'react';
import { Play, Download, ExternalLink, FileText, CheckCircle2, Clock, X } from 'lucide-react';
import YoutubeIcon from './YoutubeIcon';

export default function VideoLibrary({ videos }) {
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [showScript, setShowScript] = useState(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      <div className="glass-panel" style={{ padding: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <YoutubeIcon size={24} color="#FF0000" />
            <h2 style={{ fontSize: '1.6rem', fontWeight: 700 }}>Studio Video Library & Output Hub</h2>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Browse, preview, download, or review scripts for all automatically generated and uploaded YouTube videos.
          </p>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.75rem 1.25rem', borderRadius: '12px', fontWeight: 600 }}>
          {videos.length} Videos Total
        </div>
      </div>

      {/* Video Gallery Grid */}
      {videos.length === 0 ? (
        <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <YoutubeIcon size={48} style={{ opacity: 0.4, marginBottom: '1rem' }} />
          <h3>No Generated Videos in Storage</h3>
          <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
            Start the continuous automation engine or use the Manual Sandbox to build your first video!
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {videos.map(vid => (
            <div key={vid.id} className="glass-panel" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              
              {/* Thumbnail Container */}
              <div 
                style={{ position: 'relative', width: '100%', height: '180px', background: 'linear-gradient(135deg, #1E1B4B 0%, #0F172A 100%)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => setSelectedVideo(vid)}
              >
                <img 
                  src={`http://localhost:3001${vid.thumbnailFile}`} 
                  alt={vid.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }}
                  onError={(e) => { e.target.style.opacity = '0'; }}
                />
                
                {/* Play overlay button */}
                <div style={{ 
                  position: 'absolute', 
                  inset: 0, 
                  background: 'rgba(0,0,0,0.3)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  opacity: 0.9,
                  transition: 'all 0.2s ease',
                  zIndex: 2
                }}>
                  <div style={{ background: 'var(--primary)', padding: '0.85rem', borderRadius: '50%', boxShadow: '0 0 20px var(--primary-glow)' }}>
                    <Play size={24} color="white" fill="white" />
                  </div>
                </div>

                {/* Genre badge */}
                <div style={{ position: 'absolute', top: '10px', left: '10px' }} className="badge badge-live">
                  {vid.genreName}
                </div>

                {/* Format badge */}
                <div style={{ position: 'absolute', bottom: '10px', right: '10px', background: 'rgba(0,0,0,0.8)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                  {vid.aspectRatio === '9:16' ? '9:16 Shorts' : '16:9 HD'}
                </div>
              </div>

              {/* Card Meta Content */}
              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1, justifyContent: 'space-between' }}>
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.35rem', lineHeight: 1.3 }}>
                    {vid.title}
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Topic: {vid.topic}
                  </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>{new Date(vid.createdAt).toLocaleDateString()}</span>
                  <div className="badge badge-youtube" style={{ fontSize: '0.7rem' }}>
                    <CheckCircle2 size={12} /> {vid.status}
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                  <button 
                    className="btn-secondary" 
                    style={{ flex: 1, padding: '0.4rem', fontSize: '0.8rem', justifyContent: 'center' }}
                    onClick={() => setSelectedVideo(vid)}
                  >
                    <Play size={14} /> Watch MP4
                  </button>

                  <button 
                    className="btn-secondary" 
                    style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                    onClick={() => setShowScript(showScript === vid.id ? null : vid.id)}
                    title="View Script Text"
                  >
                    <FileText size={14} />
                  </button>

                  {vid.youtubeUrl && (
                    <a 
                      href={vid.youtubeUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="btn-primary" 
                      style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                      title="Open on YouTube"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}

                  <a 
                    href={`http://localhost:3001${vid.videoFile}`} 
                    download={`${vid.id}.mp4`}
                    className="btn-secondary" 
                    style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                    title="Download MP4"
                  >
                    <Download size={14} />
                  </a>
                </div>

                {/* Inline Script viewer */}
                {showScript === vid.id && (
                  <div style={{ marginTop: '0.5rem', background: 'rgba(0,0,0,0.4)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.75rem', color: 'var(--text-muted)', maxHeight: '120px', overflowY: 'auto' }}>
                    <strong>Full Narration Script:</strong>
                    <p style={{ marginTop: '0.25rem', whiteSpace: 'pre-wrap' }}>{vid.scriptText}</p>
                  </div>
                )}
              </div>

            </div>
          ))}
        </div>
      )}

      {/* HTML5 Video Player Modal */}
      {selectedVideo && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '2rem'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '700px', padding: '1.5rem', position: 'relative' }}>
            <button 
              onClick={() => setSelectedVideo(null)}
              style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
            >
              <X size={24} />
            </button>

            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', paddingRight: '2rem' }}>
              {selectedVideo.title}
            </h3>

            <div style={{ width: '100%', background: '#000', borderRadius: '10px', overflow: 'hidden', marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
              <video 
                src={`http://localhost:3001${selectedVideo.videoFile}`} 
                controls 
                autoPlay 
                preload="metadata"
                style={{ width: '100%', maxHeight: '450px' }} 
              >
                Your browser does not support HTML5 video playback.
              </video>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Genre: {selectedVideo.genreName} • Aspect: {selectedVideo.aspectRatio}
              </span>
              <a 
                href={`http://localhost:3001${selectedVideo.videoFile}`} 
                download 
                className="btn-primary" 
                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
              >
                <Download size={16} /> Download MP4
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
