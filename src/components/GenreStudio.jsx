import React, { useState } from 'react';
import { Layers, Play, Settings, Plus, Sparkles, Mic, Palette, Edit2, Save } from 'lucide-react';

export default function GenreStudio({ genres, onSaveGenres, onTriggerGenerate }) {
  const [editingGenre, setEditingGenre] = useState(null);
  const [genreForm, setGenreForm] = useState(null);

  const handleEdit = (genre) => {
    setEditingGenre(genre.id);
    setGenreForm({ ...genre });
  };

  const handleSave = () => {
    const updated = genres.map(g => g.id === genreForm.id ? genreForm : g);
    onSaveGenres(updated);
    setEditingGenre(null);
  };

  const handleAddGenre = () => {
    const newId = 'custom_' + Date.now();
    const newGenre = {
      id: newId,
      name: "New Custom Genre",
      description: "A dynamically generated AI genre.",
      voice: "en-US-ChristopherNeural",
      aspectRatio: "9:16",
      themeColor: "#8B5CF6",
      promptTemplate: "Create an exciting story about [topic].",
      presetTopics: ["AI Revolution", "Future Tech"]
    };
    onSaveGenres([...genres, newGenre]);
    setEditingGenre(newId);
    setGenreForm(newGenre);
  };

  const handleDeleteGenre = (idToDelete) => {
    if (window.confirm("Are you sure you want to delete this genre?")) {
      const updated = genres.filter(g => g.id !== idToDelete);
      onSaveGenres(updated);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      <div className="glass-panel" style={{ padding: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <Layers size={24} color="#FBBF24" />
            <h2 style={{ fontSize: '1.6rem', fontWeight: 700 }}>Genre & Niche Management Studio</h2>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '750px' }}>
            Configure prompt structures, neural voice actors, gradient themes, and aspect ratios across your target YouTube content genres.
          </p>
        </div>
      </div>

      {/* Genres Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
        {genres.map(g => {
          const isEditing = editingGenre === g.id;

          if (isEditing) {
            return (
              <div key={g.id} className="glass-panel" style={{ padding: '1.5rem', borderColor: g.themeColor }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', color: g.themeColor }}>
                  Edit Genre: {g.name}
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Genre Name</label>
                    <input
                      type="text"
                      value={genreForm.name}
                      onChange={(e) => setGenreForm({ ...genreForm, name: e.target.value })}
                      style={{ width: '100%', background: 'rgba(0,0,0,0.4)', color: 'white', border: '1px solid var(--border-color)', padding: '0.5rem', borderRadius: '8px' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Neural Voice Model</label>
                    <input
                      type="text"
                      value={genreForm.voice}
                      onChange={(e) => setGenreForm({ ...genreForm, voice: e.target.value })}
                      style={{ width: '100%', background: 'rgba(0,0,0,0.4)', color: 'white', border: '1px solid var(--border-color)', padding: '0.5rem', borderRadius: '8px' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Aspect Ratio</label>
                    <select
                      value={genreForm.aspectRatio}
                      onChange={(e) => setGenreForm({ ...genreForm, aspectRatio: e.target.value })}
                      style={{ width: '100%', background: 'rgba(0,0,0,0.4)', color: 'white', border: '1px solid var(--border-color)', padding: '0.5rem', borderRadius: '8px' }}
                    >
                      <option value="9:16">9:16 Vertical (YouTube Shorts / Reels)</option>
                      <option value="16:9">16:9 Horizontal (Standard YouTube Video)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>AI Prompt Template</label>
                    <textarea
                      value={genreForm.promptTemplate || ''}
                      onChange={(e) => setGenreForm({ ...genreForm, promptTemplate: e.target.value })}
                      style={{ width: '100%', background: 'rgba(0,0,0,0.4)', color: 'white', border: '1px solid var(--border-color)', padding: '0.5rem', borderRadius: '8px', minHeight: '60px', fontFamily: 'inherit', fontSize: '0.85rem' }}
                      placeholder="E.g. Create a scary story..."
                    />
                  </div>
                  
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Preset Topics (Comma Separated)</label>
                    <input
                      type="text"
                      value={genreForm.presetTopics?.join(', ') || ''}
                      onChange={(e) => setGenreForm({ ...genreForm, presetTopics: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                      style={{ width: '100%', background: 'rgba(0,0,0,0.4)', color: 'white', border: '1px solid var(--border-color)', padding: '0.5rem', borderRadius: '8px', fontSize: '0.85rem' }}
                      placeholder="Topic 1, Topic 2, Topic 3"
                    />
                  </div>
                  
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Theme Color (Hex)</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="color"
                        value={genreForm.themeColor || '#ffffff'}
                        onChange={(e) => setGenreForm({ ...genreForm, themeColor: e.target.value })}
                        style={{ width: '40px', height: '40px', padding: '0', border: 'none', background: 'transparent', cursor: 'pointer' }}
                      />
                      <input
                        type="text"
                        value={genreForm.themeColor || '#ffffff'}
                        onChange={(e) => setGenreForm({ ...genreForm, themeColor: e.target.value })}
                        style={{ flex: 1, background: 'rgba(0,0,0,0.4)', color: 'white', border: '1px solid var(--border-color)', padding: '0.5rem', borderRadius: '8px', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button className="btn-primary" onClick={handleSave} style={{ flex: 1, padding: '0.5rem' }}>
                      <Save size={16} /> Save Changes
                    </button>
                    <button className="btn-secondary" onClick={() => setEditingGenre(null)} style={{ padding: '0.5rem 1rem' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div key={g.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: g.themeColor, boxShadow: `0 0 12px ${g.themeColor}` }} />
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{g.name}</h3>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn-secondary" style={{ padding: '0.35rem 0.6rem' }} onClick={() => handleEdit(g)} title="Edit Genre">
                      <Edit2 size={14} />
                    </button>
                    <button className="btn-secondary" style={{ padding: '0.35rem 0.6rem', color: '#EF4444', borderColor: 'rgba(239,68,68,0.3)' }} onClick={() => handleDeleteGenre(g.id)} title="Delete Genre">
                      &times;
                    </button>
                  </div>
                </div>

                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem', minHeight: '40px' }}>
                  {g.description}
                </p>

                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.85rem', borderRadius: '10px', marginBottom: '1.25rem', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}><Mic size={14} style={{ verticalAlign: 'middle' }} /> Voice Engine:</span>
                    <strong>{g.voice}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Format:</span>
                    <strong style={{ color: '#34D399' }}>{g.aspectRatio === '9:16' ? '9:16 Shorts' : '16:9 Video'}</strong>
                  </div>
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                    Preset Topic Pool ({g.presetTopics?.length || 0}):
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {g.presetTopics?.slice(0, 3).map((topic, i) => (
                      <span key={i} style={{ background: 'rgba(255,255,255,0.06)', fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderRadius: '6px', color: '#E2E8F0' }}>
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <button
                className="btn-primary"
                onClick={() => onTriggerGenerate(g.id)}
                style={{ width: '100%', justifyContent: 'center', background: `linear-gradient(135deg, ${g.themeColor} 0%, rgba(0,0,0,0.8) 100%)` }}
              >
                <Sparkles size={16} /> Generate Video for {g.name}
              </button>
            </div>
          );
        })}

        {/* Add New Genre Card */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', cursor: 'pointer', opacity: 0.8 }} onClick={handleAddGenre}>
          <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '50%', marginBottom: '1rem' }}>
            <Plus size={32} color="#818CF8" />
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#818CF8' }}>Create Custom Genre</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', marginTop: '0.5rem' }}>
            Powered by Dynamic LLM Generation
          </p>
        </div>

      </div>

    </div>
  );
}
