import React from 'react';

export default function Tabs({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'dashboard', label: '📊 Dashboard' },
    { id: 'tracker', label: '📋 Project Tracker' },
    { id: 'gantt', label: '📅 Gantt' },
    { id: 'stages', label: '🔍 Stage Guide' },
    { id: 'raci', label: '👥 RACI' },
    { id: 'risks', label: '⚠ Risks' },
  ];

  return (
    <nav className="tabs">
      <div className="tabs-inner">
        {tabs.map(t => (
          <div
            key={t.id}
            className={`tab ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => onTabChange(t.id)}
          >
            {t.label}
          </div>
        ))}
      </div>
    </nav>
  );
}
