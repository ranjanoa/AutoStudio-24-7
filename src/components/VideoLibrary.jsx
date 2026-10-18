import React, { useState } from 'react';
import { Play, Download, ExternalLink, FileText, CheckCircle2, Clock, X, Upload, RefreshCw, AlertCircle } from 'lucide-react';
import YoutubeIcon from './YoutubeIcon';

export default function VideoLibrary({ videos, onRefresh }) {
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [showScript, setShowScript] = useState(null);
  const [uploadingIds, setUploadingIds] = useState({});
  const [uploadNotifications, setUploadNotifications] = useState({});

  const isVideoUploaded = (vid) => {
    return vid.status === 'uploaded' && vid.youtubeUrl && !vid.youtubeUrl.includes('sim_');
  };

  const uploadedCount = videos.filter(isVideoUploaded).length;
  const pendingCount = videos.length - uploadedCount;

  const handlePushToYouTube = async (vid) => {
    setUploadingIds(prev => ({ ...prev, [vid.id]: true }));
    setUploadNotifications(prev => ({ ...prev, [vid.id]: null }));

    try {
      const res = await fetch(`http://localhost:3001/api/videos/${vid.id}/push-to-youtube`, {
        method: 'POST'
      });
      const data = await res.json();

      if (data.success && data.youtubeUrl) {
        setUploadNotifications(prev => ({
          ...prev,
          [vid.id]: { type: 'success', text: `Uploaded to YouTube! (ID: ${data.video?.id})` }
        }));
        if (onRefresh) onRefresh();
      } else {
        setUploadNotifications(prev => ({
          ...prev,
          [vid.id]: { type: 'error', text: data.error || 'Failed to upload video to YouTube.' }
        }));
      }
    } catch (err) {
      setUploadNotifications(prev => ({
        ...prev,
        [vid.id]: { type: 'error', text: 'Network connection or server error.' }
      }));
    } finally {
      setUploadingIds(prev => ({ ...prev, [vid.id]: false }));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header Info Panel */}
      <div className="glass-panel" style={{ padding: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <YoutubeIcon size={26} color="#FF0000" />
            <h2 style={{ fontSize: '1.6rem', fontWeight: 700 }}>Studio Video Library & Output Hub</h2>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Browse, preview, download, or review scripts. Push any local video directly to your YouTube channel with 1 click.
          </p>
        </div>

        {/* Counts summary */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ background: 'rgba(255,255,255,0.06)', padding: '0.6rem 1rem', borderRadius: '10px', fontSize: '0.85rem' }}>
            <strong>{videos.length}</strong> Total Videos
          </div>
          <div style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#34D399', padding: '0.6rem 1rem', borderRadius: '10px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <CheckCircle2 size={14} /> <strong>{uploadedCount}</strong> On YouTube
          </div>
          {pendingCount > 0 && (
            <div style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#F87171', padding: '0.6rem 1rem', borderRadius: '10px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Clock size={14} /> <strong>{pendingCount}</strong> Ready to Push
            </div>
          )}
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: '1.5rem' }}>
          {videos.map(vid => {
            const isUploaded = isVideoUploaded(vid);
            const isUploading = !!uploadingIds[vid.id];
            const notification = uploadNotifications[vid.id];

            return (
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
                    {isUploaded ? (
                      <div className="badge badge-youtube" style={{ fontSize: '0.7rem' }}>
                        <CheckCircle2 size={12} /> Uploaded to YouTube
                      </div>
                    ) : (
                      <div className="badge badge-idle" style={{ fontSize: '0.7rem' }}>
                        <Clock size={12} /> Local / Pending Push
                      </div>
                    )}
                  </div>

                  {/* Upload Notification feedback */}
                  {notification && (
                    <div style={{ 
                      padding: '0.5rem 0.75rem', 
                      borderRadius: '6px', 
                      fontSize: '0.75rem', 
                      background: notification.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      color: notification.type === 'success' ? '#34D399' : '#F87171',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}>
                      {notification.type === 'success' ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                      {notification.text}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', flexWrap: 'wrap' }}>
                    
                    {/* Watch MP4 */}
                    <button 
                      className="btn-secondary" 
                      style={{ padding: '0.4rem 0.65rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                      onClick={() => setSelectedVideo(vid)}
                    >
                      <Play size={13} /> Watch
                    </button>

                    {/* View Script Text */}
                    <button 
                      className="btn-secondary" 
                      style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                      onClick={() => setShowScript(showScript === vid.id ? null : vid.id)}
                      title="View Script Text"
                    >
                      <FileText size={13} />
                    </button>

                    {/* Download MP4 */}
                    <a 
                      href={`http://localhost:3001${vid.videoFile}`} 
                      download={`${vid.id}.mp4`}
                      className="btn-secondary" 
                      style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                      title="Download MP4"
                    >
                      <Download size={13} />
                    </a>

                    {/* Push to YouTube or View on YouTube */}
                    {isUploaded ? (
                      <a 
                        href={vid.youtubeUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="btn-primary" 
                        style={{ flex: 1, padding: '0.4rem 0.75rem', fontSize: '0.8rem', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                        title="Open live video on YouTube"
                      >
                        <ExternalLink size={13} /> Open on YouTube
                      </a>
                    ) : (
                      <button
                        onClick={() => handlePushToYouTube(vid)}
                        disabled={isUploading}
                        className="btn-primary"
                        style={{
                          flex: 1,
                          background: '#FF0000',
                          borderColor: '#FF0000',
                          padding: '0.4rem 0.75rem',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          justifyContent: 'center',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          cursor: isUploading ? 'wait' : 'pointer'
                        }}
                        title="Upload this video directly to your YouTube channel"
                      >
                        {isUploading ? (
                          <>
                            <RefreshCw size={13} className="spin" /> Uploading...
                          </>
                        ) : (
                          <>
                            <Upload size={13} /> Push to YouTube
                          </>
                        )}
                      </button>
                    )}

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
            );
          })}
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
