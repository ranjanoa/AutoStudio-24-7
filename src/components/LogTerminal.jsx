import React, { useState } from 'react';
import { Terminal, RefreshCw, Trash2, Search, Filter } from 'lucide-react';

export default function LogTerminal({ logs, onRefreshLogs }) {
  const [filterText, setFilterText] = useState('');
  const [logLevel, setLogLevel] = useState('all');

  const filteredLogs = logs.filter(log => {
    const matchesText = log.message.toLowerCase().includes(filterText.toLowerCase());
    const matchesLevel = logLevel === 'all' || log.level === logLevel;
    return matchesText && matchesLevel;
  });

  const getLevelColor = (level) => {
    switch (level) {
      case 'success': return '#34D399';
      case 'error': return '#F87171';
      case 'warning': return '#FBBF24';
      default: return '#818CF8';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Terminal size={22} color="#34D399" />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Real-Time System & Engine Console Logs</h2>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '0.4rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <Search size={14} color="gray" style={{ marginRight: '0.5rem' }} />
            <input
              type="text"
              placeholder="Search logs..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              style={{ background: 'none', border: 'none', color: 'white', outline: 'none', fontSize: '0.85rem', width: '150px' }}
            />
          </div>

          {/* Level Filter */}
          <select
            value={logLevel}
            onChange={(e) => setLogLevel(e.target.value)}
            style={{ background: 'rgba(0,0,0,0.3)', color: 'white', border: '1px solid var(--border-color)', padding: '0.4rem 0.75rem', borderRadius: '8px', fontSize: '0.85rem' }}
          >
            <option value="all">All Levels</option>
            <option value="info">Info</option>
            <option value="success">Success</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
          </select>

          <button className="btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} onClick={onRefreshLogs}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Console Display Container */}
      <div className="glass-panel" style={{ 
        padding: '1.5rem', 
        background: '#040711', 
        borderRadius: '12px', 
        fontFamily: 'var(--font-mono)', 
        fontSize: '0.85rem',
        minHeight: '450px',
        maxHeight: '600px',
        overflowY: 'auto'
      }}>
        {filteredLogs.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', paddingTop: '3rem' }}>
            No logs match the filter criteria.
          </div>
        ) : (
          filteredLogs.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.4rem' }}>
              <span style={{ color: '#64748B', flexShrink: 0 }}>
                [{new Date(item.timestamp).toLocaleTimeString()}]
              </span>
              <span style={{ color: getLevelColor(item.level), fontWeight: 600, flexShrink: 0, width: '70px', textTransform: 'uppercase' }}>
                [{item.level}]
              </span>
              <span style={{ color: '#E2E8F0', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {item.message}
              </span>
            </div>
          ))
        )}
      </div>

    </div>
  );
}
