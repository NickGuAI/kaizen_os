import React, { useState, useEffect } from 'react';

const KaizenOS = () => {
  const [activeView, setActiveView] = useState('day');
  const [activeTheme, setActiveTheme] = useState(null);
  const [playlistFilter, setPlaylistFilter] = useState('all');
  const [isMobile, setIsMobile] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [selectedDay, setSelectedDay] = useState(12);
  const [mobileTab, setMobileTab] = useState('arena');
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Theme colors using our Zen palette
  const themes = [
    { id: 'life', name: 'Life Admin', color: '#9E8B7D' },
    { id: 'mastery', name: 'Mastery & Impact', color: '#8B9467' },
    { id: 'wisdom', name: 'Wisdom & Humility', color: '#7B8D8E' },
    { id: 'health', name: 'Health & Self Mastery', color: '#8B7D9E' },
    { id: 'love', name: 'Love & Presence', color: '#9E7D8B' },
  ];

  const vetoes = [
    { id: 1, text: 'No self-deception and ego-protecting lies', count: 1 },
    { id: 2, text: 'No multi-tasking during focus blocks', count: 1 },
    { id: 3, text: 'No saying "yes" in the moment to commitments', count: 1 },
    { id: 4, text: 'No attending or personally running PMAI events beyond cap', count: 1 },
    { id: 5, text: 'No purchases >$500 that aren\'t pre-budgeted', count: 0 },
    { id: 6, text: 'No new projects without a defined "kill date"', count: 0 },
  ];

  const days = [
    { date: 12, day: 'Mon', dayFull: 'Monday', isToday: true },
    { date: 13, day: 'Tue', dayFull: 'Tuesday' },
    { date: 14, day: 'Wed', dayFull: 'Wednesday' },
    { date: 15, day: 'Thu', dayFull: 'Thursday' },
    { date: 16, day: 'Fri', dayFull: 'Friday' },
    { date: 17, day: 'Sat', dayFull: 'Saturday' },
    { date: 18, day: 'Sun', dayFull: 'Sunday' },
  ];

  const todayBlocks = [
    { time: '7:00', endTime: '7:20', title: 'Read AI/tech news daily', description: '20 min morning reading', theme: 'mastery', isKaizen: false },
    { time: '9:00', endTime: '9:15', title: 'Chat with Mom and Dad', description: '15 mins before bed', theme: 'love', isKaizen: false },
    { time: '9:00', endTime: '10:00', title: 'Run quarterly asset allocation', description: 'Review and adjust', theme: 'life', isKaizen: false },
    { time: '10:00', endTime: '11:00', title: 'Secure strategic role for VC partnership', description: 'Position for VC partnership', theme: 'mastery', isKaizen: true },
    { time: '11:00', endTime: '11:45', title: 'GV Interview Crystal', description: 'Strategic role positioning', theme: 'mastery', isKaizen: false },
    { time: '12:00', endTime: '12:30', title: 'Nick G Coffee Chat', description: '1:1 with founder/investor', theme: 'love', isKaizen: false },
    { time: '12:30', endTime: '13:00', title: 'Schedule surgery call', description: 'Health procedures by week 11', theme: 'health', isKaizen: true },
    { time: '13:00', endTime: '13:30', title: 'Google Team Meeting', description: 'Chat Benchmark for Codewiki', theme: 'mastery', isKaizen: false },
    { time: '13:30', endTime: '15:00', title: 'Land Chat Benchmark', description: 'Benchmark development', theme: 'mastery', isKaizen: true },
    { time: '15:00', endTime: '15:30', title: 'PMAI Sponsor', description: 'Scale as proof-of-concept', theme: 'mastery', isKaizen: true },
  ];

  const playlistItems = [
    { id: 1, title: 'Schedule meeting with grip', done: true },
    { id: 2, title: 'Review Q1 OKRs draft', done: false },
    { id: 3, title: 'Send follow-up to Sarah', done: false },
  ];

  const weekEvents = {
    12: [
      { time: '7:00', duration: 20, title: 'Read AI/tech news', theme: 'mastery' },
      { time: '9:00', duration: 75, title: 'Asset allocation', theme: 'life' },
      { time: '10:30', duration: 30, title: 'Strategic role', theme: 'mastery' },
      { time: '12:00', duration: 60, title: 'Coffee Chat', theme: 'love' },
      { time: '13:30', duration: 90, title: 'Google Team', theme: 'mastery' },
      { time: '17:30', duration: 60, title: 'Gym', theme: 'health' },
    ],
    13: [
      { time: '7:00', duration: 20, title: 'Read AI/tech news', theme: 'mastery' },
      { time: '8:00', duration: 60, title: 'Morning Play', theme: 'love' },
      { time: '10:00', duration: 45, title: 'GV Interview', theme: 'mastery' },
      { time: '14:00', duration: 60, title: 'Google Team', theme: 'mastery' },
      { time: '15:30', duration: 120, title: 'Building block', theme: 'wisdom', type: 'block' },
    ],
    14: [
      { time: '7:00', duration: 20, title: 'Read AI/tech news', theme: 'mastery' },
      { time: '8:00', duration: 60, title: 'Morning Play', theme: 'love' },
      { time: '11:00', duration: 45, title: 'Optiver Interview', theme: 'mastery' },
      { time: '13:00', duration: 60, title: 'Google Team', theme: 'mastery' },
      { time: '17:30', duration: 60, title: 'Gym', theme: 'health' },
    ],
    15: [
      { time: '7:30', duration: 60, title: 'Lab Meeting', theme: 'mastery' },
      { time: '8:00', duration: 60, title: 'Morning Play', theme: 'love' },
      { time: '11:00', duration: 60, title: 'PMAI Infra', theme: 'mastery' },
      { time: '13:00', duration: 60, title: 'Google Team', theme: 'mastery' },
      { time: '17:30', duration: 60, title: 'Gym', theme: 'health' },
    ],
    16: [
      { time: '7:00', duration: 20, title: 'Read AI/tech news', theme: 'mastery' },
      { time: '10:00', duration: 90, title: 'AI Salon NYC', theme: 'mastery' },
      { time: '12:00', duration: 75, title: 'Nick & Robert', theme: 'love' },
      { time: '13:00', duration: 60, title: 'Google Team', theme: 'mastery' },
    ],
    17: [
      { time: '8:00', duration: 60, title: 'Teach AI', theme: 'love' },
      { time: '10:00', duration: 60, title: 'Aria Play', theme: 'love' },
      { time: '13:00', duration: 120, title: 'School Shortlist', theme: 'life' },
      { time: '16:00', duration: 120, title: 'Aria Play', theme: 'love' },
    ],
    18: [
      { time: '8:00', duration: 60, title: 'Teach AI', theme: 'love' },
      { time: '10:00', duration: 60, title: 'Aria Play', theme: 'love' },
      { time: '16:00', duration: 120, title: 'Aria Play', theme: 'love' },
    ],
  };

  const getThemeColor = (themeId) => themes.find(t => t.id === themeId)?.color || '#8B9467';
  const hours = Array.from({ length: 16 }, (_, i) => i + 6);
  const filteredPlaylist = playlistItems.filter(item => {
    if (playlistFilter === 'active') return !item.done;
    if (playlistFilter === 'done') return item.done;
    return true;
  });

  // ==================== STYLES ====================
  const styles = {
    // Core colors
    sage: '#8B9467',
    sageLight: 'rgba(139, 148, 103, 0.1)',
    sageBorder: 'rgba(139, 148, 103, 0.15)',
    bg: '#F5F1EB',
    card: '#FEFEFE',
    textPrimary: '#1A1A1A',
    textSecondary: '#666666',
    textMuted: '#999999',
    border: 'rgba(139, 148, 103, 0.08)',
    danger: '#E74C3C',
  };

  // ==================== MOBILE COMPONENTS ====================

  const MobileHeader = () => (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      padding: '16px 20px',
      background: 'rgba(254, 254, 254, 0.95)',
      backdropFilter: 'blur(12px)',
      borderBottom: `1px solid ${styles.border}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <button
        onClick={() => setShowSidebar(true)}
        style={{
          background: 'transparent',
          border: 'none',
          padding: 8,
          cursor: 'pointer',
          borderRadius: 8,
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={styles.textPrimary} strokeWidth="1.5">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div style={{ textAlign: 'center' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}>
          <div style={{
            width: 24,
            height: 24,
            background: `linear-gradient(135deg, ${styles.sage}, #9DA873)`,
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: 10,
            fontWeight: 600,
          }}>禅</div>
          <span style={{
            fontSize: 15,
            fontWeight: 600,
            color: styles.textPrimary,
          }}>
            {activeView === 'day' 
              ? `${days.find(d => d.date === selectedDay)?.dayFull}, Jan ${selectedDay}`
              : 'Jan 12 – 18'}
          </span>
        </div>
      </div>

      <button style={{
        background: 'transparent',
        border: 'none',
        padding: 8,
        cursor: 'pointer',
        borderRadius: 8,
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={styles.textSecondary} strokeWidth="1.5">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
      </button>
    </header>
  );

  const MobileSidebar = () => (
    <>
      <div
        onClick={() => setShowSidebar(false)}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.3)',
          zIndex: 200,
          opacity: showSidebar ? 1 : 0,
          pointerEvents: showSidebar ? 'auto' : 'none',
          transition: 'opacity 0.3s ease',
        }}
      />
      
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        width: '85%',
        maxWidth: 320,
        background: styles.card,
        zIndex: 300,
        transform: showSidebar ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.4s cubic-bezier(0.23, 1, 0.32, 1)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: showSidebar ? '0 0 60px rgba(0,0,0,0.15)' : 'none',
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 20px',
          borderBottom: `1px solid ${styles.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36,
              height: 36,
              background: `linear-gradient(135deg, ${styles.sage}, #9DA873)`,
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: 14,
              fontWeight: 600,
            }}>禅</div>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: styles.textPrimary }}>Kaizen OS</h1>
              <span style={{ fontSize: 12, color: styles.textMuted }}>S1 2026</span>
            </div>
          </div>
          <button
            onClick={() => setShowSidebar(false)}
            style={{
              background: styles.bg,
              border: 'none',
              padding: 8,
              cursor: 'pointer',
              borderRadius: 8,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={styles.textMuted} strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Season Card */}
        <div style={{
          margin: '20px',
          padding: '20px',
          background: styles.bg,
          borderRadius: 16,
          border: `1px solid ${styles.border}`,
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 16,
          }}>
            <span style={{
              fontSize: 11,
              letterSpacing: '0.05em',
              color: styles.textMuted,
              textTransform: 'uppercase',
              fontWeight: 600,
            }}>Season Progress</span>
            <span style={{ fontSize: 13, color: styles.sage, fontWeight: 600 }}>Week 3/12</span>
          </div>
          
          <div style={{ display: 'flex', gap: 24 }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 600, color: styles.textPrimary }}>1080h</div>
              <div style={{ fontSize: 11, color: styles.textMuted }}>capacity</div>
            </div>
            <div style={{ borderLeft: `1px solid ${styles.border}`, paddingLeft: 24 }}>
              <div style={{ fontSize: 28, fontWeight: 600, color: styles.textPrimary }}>26</div>
              <div style={{ fontSize: 11, color: styles.textMuted }}>actions</div>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={{ height: 6, background: styles.sageLight, borderRadius: 3 }}>
              <div style={{
                width: '18%',
                height: '100%',
                background: `linear-gradient(90deg, ${styles.sage}, #9DA873)`,
                borderRadius: 3,
              }} />
            </div>
          </div>
        </div>

        {/* Vetoes */}
        <div style={{ flex: 1, overflow: 'auto', padding: '0 20px 20px' }}>
          <h2 style={{
            fontSize: 11,
            letterSpacing: '0.05em',
            color: styles.textMuted,
            textTransform: 'uppercase',
            marginBottom: 12,
            fontWeight: 600,
          }}>Season Vetoes</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {vetoes.map((veto) => (
              <div
                key={veto.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '12px 14px',
                  background: veto.count > 0 ? 'rgba(231, 76, 60, 0.06)' : styles.bg,
                  borderRadius: 12,
                  border: `1px solid ${veto.count > 0 ? 'rgba(231, 76, 60, 0.15)' : styles.border}`,
                }}
              >
                <div style={{
                  minWidth: 22,
                  height: 22,
                  borderRadius: 11,
                  background: veto.count > 0 ? 'rgba(231, 76, 60, 0.12)' : styles.sageLight,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  color: veto.count > 0 ? styles.danger : styles.textMuted,
                  fontWeight: 600,
                }}>
                  {veto.count}
                </div>
                <span style={{
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: veto.count > 0 ? styles.textPrimary : styles.textMuted,
                }}>{veto.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Themes */}
        <div style={{
          padding: '16px 20px',
          borderTop: `1px solid ${styles.border}`,
          background: styles.bg,
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {themes.map((theme) => (
              <div
                key={theme.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  background: styles.card,
                  borderRadius: 20,
                  border: `1px solid ${styles.border}`,
                }}
              >
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  background: theme.color,
                }} />
                <span style={{ fontSize: 12, color: styles.textSecondary }}>{theme.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );

  const MobileNavigation = () => (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: 'rgba(254, 254, 254, 0.95)',
      backdropFilter: 'blur(12px)',
      borderTop: `1px solid ${styles.border}`,
      padding: '8px 0 max(8px, env(safe-area-inset-bottom))',
      display: 'flex',
      justifyContent: 'space-around',
      zIndex: 100,
    }}>
      {[
        { id: 'day', icon: 'M8 4h8M4 8h16v12H4V8z', label: 'Day' },
        { id: 'week', icon: 'M4 4h16v16H4V4zM4 10h16M10 4v16', label: 'Week' },
      ].map((nav) => (
        <button
          key={nav.id}
          onClick={() => setActiveView(nav.id)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            padding: '10px 32px',
            background: activeView === nav.id ? styles.sageLight : 'transparent',
            border: 'none',
            cursor: 'pointer',
            borderRadius: 12,
            transition: 'all 0.2s ease',
          }}
        >
          <svg 
            width="22" 
            height="22" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke={activeView === nav.id ? styles.sage : styles.textMuted} 
            strokeWidth="1.5"
          >
            <path d={nav.icon} />
          </svg>
          <span style={{
            fontSize: 11,
            color: activeView === nav.id ? styles.sage : styles.textMuted,
            fontWeight: activeView === nav.id ? 600 : 400,
          }}>{nav.label}</span>
        </button>
      ))}
    </nav>
  );

  const MobileDayView = () => (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      paddingBottom: 80,
      background: styles.bg,
    }}>
      {/* Day Selector */}
      <div style={{
        display: 'flex',
        gap: 8,
        padding: '16px 20px',
        overflow: 'auto',
        background: styles.card,
        borderBottom: `1px solid ${styles.border}`,
      }}>
        {days.map((day) => (
          <button
            key={day.date}
            onClick={() => setSelectedDay(day.date)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '12px 16px',
              background: selectedDay === day.date 
                ? `linear-gradient(135deg, ${styles.sage}, #9DA873)` 
                : styles.bg,
              border: 'none',
              borderRadius: 14,
              cursor: 'pointer',
              minWidth: 56,
              transition: 'all 0.2s ease',
            }}
          >
            <span style={{
              fontSize: 10,
              letterSpacing: '0.05em',
              color: selectedDay === day.date ? 'rgba(255,255,255,0.7)' : styles.textMuted,
              textTransform: 'uppercase',
              fontWeight: 600,
            }}>{day.day}</span>
            <span style={{
              fontSize: 20,
              fontWeight: 600,
              color: selectedDay === day.date ? '#FFFFFF' : styles.textPrimary,
              marginTop: 2,
            }}>{day.date}</span>
            {day.isToday && (
              <div style={{
                width: 5,
                height: 5,
                borderRadius: 3,
                background: selectedDay === day.date ? '#FFFFFF' : styles.sage,
                marginTop: 4,
              }} />
            )}
          </button>
        ))}
      </div>

      {/* Tab Switcher */}
      <div style={{
        display: 'flex',
        padding: '12px 20px',
        gap: 8,
        background: styles.card,
        borderBottom: `1px solid ${styles.border}`,
      }}>
        {[
          { id: 'arena', label: 'Arena', count: todayBlocks.length },
          { id: 'deliverables', label: 'Focus', count: 0 },
          { id: 'playlist', label: 'Playlist', count: playlistItems.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setMobileTab(tab.id)}
            style={{
              flex: 1,
              padding: '10px 12px',
              background: mobileTab === tab.id ? styles.sageLight : 'transparent',
              border: `1px solid ${mobileTab === tab.id ? styles.sageBorder : 'transparent'}`,
              borderRadius: 10,
              fontSize: 13,
              fontWeight: mobileTab === tab.id ? 600 : 400,
              color: mobileTab === tab.id ? styles.sage : styles.textMuted,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {tab.label}
            <span style={{ opacity: 0.7, marginLeft: 4, fontWeight: 400 }}>({tab.count})</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {mobileTab === 'arena' && (
          <div style={{ padding: '8px 0' }}>
            {todayBlocks.map((block, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  padding: '16px 20px',
                  gap: 14,
                  background: styles.card,
                  marginBottom: 1,
                }}
              >
                <div style={{ minWidth: 48, textAlign: 'right' }}>
                  <div style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: styles.textPrimary,
                  }}>{block.time}</div>
                  <div style={{ fontSize: 11, color: styles.textMuted }}>{block.endTime}</div>
                </div>

                <div style={{
                  flex: 1,
                  borderLeft: `3px solid ${getThemeColor(block.theme)}`,
                  paddingLeft: 14,
                  borderRadius: '0 8px 8px 0',
                  background: `linear-gradient(90deg, ${getThemeColor(block.theme)}08, transparent)`,
                  marginLeft: -14,
                  paddingTop: 2,
                  paddingBottom: 2,
                }}>
                  <div style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: styles.textPrimary,
                    lineHeight: 1.4,
                  }}>
                    {block.isKaizen && (
                      <span style={{ 
                        background: getThemeColor(block.theme),
                        color: 'white',
                        padding: '2px 6px',
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 600,
                        marginRight: 8,
                      }}>K</span>
                    )}
                    {block.title}
                  </div>
                  <div style={{
                    fontSize: 12,
                    color: styles.textSecondary,
                    marginTop: 4,
                    lineHeight: 1.4,
                  }}>{block.description}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {mobileTab === 'deliverables' && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px 20px',
            background: styles.card,
            margin: 16,
            borderRadius: 16,
            border: `1px dashed ${styles.sageBorder}`,
          }}>
            <div style={{
              width: 56,
              height: 56,
              background: styles.sageLight,
              borderRadius: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={styles.sage} strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v8M8 12h8" />
              </svg>
            </div>
            <p style={{ fontSize: 15, color: styles.textSecondary, textAlign: 'center', marginBottom: 20 }}>
              No focus items set for today
            </p>
            <button style={{
              padding: '12px 24px',
              background: `linear-gradient(135deg, ${styles.sage}, #9DA873)`,
              color: 'white',
              border: 'none',
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}>
              Set Focus
            </button>
          </div>
        )}

        {mobileTab === 'playlist' && (
          <div style={{ padding: '16px 20px' }}>
            {/* Filters */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {['all', 'active', 'done'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setPlaylistFilter(filter)}
                  style={{
                    padding: '8px 16px',
                    fontSize: 13,
                    fontWeight: playlistFilter === filter ? 600 : 400,
                    background: playlistFilter === filter ? styles.sage : 'transparent',
                    color: playlistFilter === filter ? 'white' : styles.textSecondary,
                    border: playlistFilter === filter ? 'none' : `1px solid ${styles.border}`,
                    borderRadius: 20,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {filter}
                </button>
              ))}
            </div>

            {/* Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredPlaylist.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '16px 18px',
                    background: styles.card,
                    borderRadius: 14,
                    border: `1px solid ${styles.border}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{
                    width: 24,
                    height: 24,
                    borderRadius: 7,
                    border: item.done ? 'none' : `2px solid ${styles.sageBorder}`,
                    background: item.done ? styles.sage : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    transition: 'all 0.2s ease',
                  }}>
                    {item.done && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  <span style={{
                    fontSize: 15,
                    color: item.done ? styles.textMuted : styles.textPrimary,
                    textDecoration: item.done ? 'line-through' : 'none',
                  }}>{item.title}</span>
                </div>
              ))}
            </div>

            <button style={{
              marginTop: 16,
              padding: '16px',
              width: '100%',
              background: 'transparent',
              border: `1px dashed ${styles.sageBorder}`,
              borderRadius: 14,
              color: styles.sage,
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add task
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const MobileWeekView = () => (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      paddingBottom: 80,
      background: styles.bg,
    }}>
      {/* Week Header */}
      <div style={{
        display: 'flex',
        background: styles.card,
        borderBottom: `1px solid ${styles.border}`,
      }}>
        <div style={{ width: 44 }} />
        {days.map((day) => (
          <div
            key={day.date}
            onClick={() => {
              setSelectedDay(day.date);
              setActiveView('day');
            }}
            style={{
              flex: 1,
              padding: '14px 4px',
              textAlign: 'center',
              background: day.isToday ? styles.sageLight : 'transparent',
              cursor: 'pointer',
              borderRadius: day.isToday ? '0 0 12px 12px' : 0,
            }}
          >
            <div style={{
              fontSize: 10,
              letterSpacing: '0.05em',
              color: day.isToday ? styles.sage : styles.textMuted,
              textTransform: 'uppercase',
              fontWeight: 600,
            }}>{day.day}</div>
            <div style={{
              fontSize: 17,
              fontWeight: day.isToday ? 700 : 400,
              color: day.isToday ? styles.sage : styles.textPrimary,
              marginTop: 2,
            }}>{day.date}</div>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        <div style={{ display: 'flex' }}>
          {/* Time Column */}
          <div style={{ width: 44, flexShrink: 0, background: styles.card }}>
            {hours.map((hour) => (
              <div
                key={hour}
                style={{
                  height: 52,
                  paddingRight: 8,
                  textAlign: 'right',
                  fontSize: 10,
                  color: styles.textMuted,
                  transform: 'translateY(-6px)',
                }}
              >
                {hour === 12 ? '12p' : hour > 12 ? `${hour - 12}` : hour}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          {days.map((day) => (
            <div
              key={day.date}
              style={{
                flex: 1,
                position: 'relative',
                borderLeft: `1px solid ${styles.border}`,
                background: styles.card,
              }}
            >
              {hours.map((hour) => (
                <div
                  key={hour}
                  style={{
                    height: 52,
                    borderBottom: `1px solid ${styles.border}`,
                  }}
                />
              ))}

              {weekEvents[day.date]?.map((event, eventIndex) => {
                const [eventHour, eventMin] = event.time.split(':').map(Number);
                const top = (eventHour - 6) * 52 + (eventMin / 60) * 52;
                const height = (event.duration / 60) * 52;
                const themeColor = getThemeColor(event.theme);
                
                return (
                  <div
                    key={eventIndex}
                    onClick={() => {
                      setSelectedDay(day.date);
                      setActiveView('day');
                    }}
                    style={{
                      position: 'absolute',
                      top,
                      left: 2,
                      right: 2,
                      height: Math.max(height - 2, 20),
                      background: event.type === 'block' 
                        ? `repeating-linear-gradient(45deg, ${themeColor}15, ${themeColor}15 3px, transparent 3px, transparent 6px)`
                        : `${themeColor}20`,
                      borderLeft: `3px solid ${themeColor}`,
                      borderRadius: 6,
                      padding: '3px 6px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: styles.textPrimary,
                      lineHeight: 1.2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {event.title}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ==================== DESKTOP COMPONENTS ====================

  const DesktopSidebar = () => (
    <aside style={{
      width: 300,
      borderRight: `1px solid ${styles.border}`,
      padding: '28px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 28,
      background: styles.card,
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 40,
          height: 40,
          background: `linear-gradient(135deg, ${styles.sage}, #9DA873)`,
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: 16,
          fontWeight: 600,
        }}>禅</div>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: styles.textPrimary }}>Kaizen OS</h1>
          <span style={{ fontSize: 12, color: styles.textMuted }}>Continuous Improvement</span>
        </div>
      </div>

      {/* Season Card */}
      <div style={{
        background: styles.bg,
        borderRadius: 16,
        padding: '24px',
        border: `1px solid ${styles.border}`,
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 20,
        }}>
          <span style={{ 
            fontSize: 11, 
            letterSpacing: '0.05em', 
            color: styles.textMuted, 
            textTransform: 'uppercase',
            fontWeight: 600,
          }}>Season One</span>
          <span style={{ 
            fontSize: 12, 
            color: styles.sage,
            fontWeight: 600,
            background: styles.sageLight,
            padding: '4px 10px',
            borderRadius: 20,
          }}>2026</span>
        </div>
        
        <div style={{ display: 'flex', gap: 24 }}>
          <div>
            <div style={{ fontSize: 32, fontWeight: 600, color: styles.textPrimary, lineHeight: 1 }}>1080</div>
            <div style={{ fontSize: 11, color: styles.textMuted, marginTop: 4 }}>hours</div>
          </div>
          <div style={{ borderLeft: `1px solid ${styles.border}`, paddingLeft: 24 }}>
            <div style={{ fontSize: 32, fontWeight: 600, color: styles.textPrimary, lineHeight: 1 }}>5</div>
            <div style={{ fontSize: 11, color: styles.textMuted, marginTop: 4 }}>themes</div>
          </div>
          <div style={{ borderLeft: `1px solid ${styles.border}`, paddingLeft: 24 }}>
            <div style={{ fontSize: 32, fontWeight: 600, color: styles.textPrimary, lineHeight: 1 }}>26</div>
            <div style={{ fontSize: 11, color: styles.textMuted, marginTop: 4 }}>actions</div>
          </div>
        </div>

        <div style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: styles.textMuted }}>Week 3 of 12</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: styles.sage }}>18%</span>
          </div>
          <div style={{ height: 6, background: styles.sageLight, borderRadius: 3 }}>
            <div style={{ 
              width: '18%', 
              height: '100%', 
              background: `linear-gradient(90deg, ${styles.sage}, #9DA873)`, 
              borderRadius: 3,
            }} />
          </div>
        </div>
      </div>

      {/* Vetoes */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <h2 style={{ 
          fontSize: 11, 
          letterSpacing: '0.05em', 
          color: styles.textMuted, 
          textTransform: 'uppercase', 
          marginBottom: 16, 
          fontWeight: 600,
        }}>Season Vetoes</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {vetoes.map((veto) => (
            <div
              key={veto.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: '14px 16px',
                background: veto.count > 0 ? 'rgba(231, 76, 60, 0.06)' : styles.bg,
                borderRadius: 12,
                border: `1px solid ${veto.count > 0 ? 'rgba(231, 76, 60, 0.15)' : styles.border}`,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{
                minWidth: 24,
                height: 24,
                borderRadius: 12,
                background: veto.count > 0 ? 'rgba(231, 76, 60, 0.12)' : styles.sageLight,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                color: veto.count > 0 ? styles.danger : styles.textMuted,
                fontWeight: 600,
              }}>{veto.count}</div>
              <span style={{ 
                fontSize: 13, 
                lineHeight: 1.5, 
                color: veto.count > 0 ? styles.textPrimary : styles.textMuted,
              }}>{veto.text}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );

  const DesktopHeader = () => (
    <>
      <header style={{
        padding: '16px 32px',
        borderBottom: `1px solid ${styles.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: styles.card,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {themes.map((theme) => (
            <button
              key={theme.id}
              onClick={() => setActiveTheme(activeTheme === theme.id ? null : theme.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 14px',
                background: activeTheme === theme.id ? styles.sageLight : 'transparent',
                border: `1px solid ${activeTheme === theme.id ? styles.sageBorder : 'transparent'}`,
                borderRadius: 20,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ 
                width: 10, 
                height: 10, 
                borderRadius: 5, 
                background: theme.color, 
                opacity: activeTheme && activeTheme !== theme.id ? 0.3 : 1,
                transition: 'opacity 0.2s ease',
              }} />
              <span style={{ 
                fontSize: 13, 
                color: activeTheme && activeTheme !== theme.id ? styles.textMuted : styles.textSecondary,
                fontWeight: activeTheme === theme.id ? 600 : 400,
              }}>{theme.name}</span>
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {['Tag', 'Sync', 'Review', 'Plan'].map((action, i) => (
            <button
              key={action}
              style={{
                padding: '10px 18px',
                background: i === 3 ? `linear-gradient(135deg, ${styles.sage}, #9DA873)` : 'transparent',
                color: i === 3 ? 'white' : styles.textSecondary,
                border: i === 3 ? 'none' : `1px solid ${styles.border}`,
                borderRadius: 10,
                fontSize: 13,
                fontWeight: i === 3 ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >{action}</button>
          ))}
        </div>
      </header>

      <div style={{ 
        padding: '20px 32px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        flexShrink: 0,
        background: styles.bg,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button style={{ 
            background: styles.card, 
            border: `1px solid ${styles.border}`, 
            borderRadius: 8,
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: styles.textMuted, 
            cursor: 'pointer',
            fontSize: 16,
          }}>←</button>
          <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0, color: styles.textPrimary }}>
            {activeView === 'day' ? 'Monday, January 12, 2026' : 'January 12 – 18, 2026'}
          </h2>
          <button style={{ 
            background: styles.card, 
            border: `1px solid ${styles.border}`, 
            borderRadius: 8,
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: styles.textMuted, 
            cursor: 'pointer',
            fontSize: 16,
          }}>→</button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ 
            display: 'flex', 
            background: styles.card, 
            padding: 4, 
            borderRadius: 10,
            border: `1px solid ${styles.border}`,
          }}>
            {['Day', 'Week'].map((view) => (
              <button
                key={view}
                onClick={() => setActiveView(view.toLowerCase())}
                style={{
                  padding: '8px 18px',
                  background: activeView === view.toLowerCase() ? styles.sageLight : 'transparent',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: activeView === view.toLowerCase() ? 600 : 400,
                  color: activeView === view.toLowerCase() ? styles.sage : styles.textMuted,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >{view}</button>
            ))}
          </div>
          <button style={{
            marginLeft: 8,
            padding: '10px 18px',
            background: styles.card,
            border: `1px solid ${styles.border}`,
            borderRadius: 10,
            fontSize: 13,
            color: styles.textSecondary,
            cursor: 'pointer',
          }}>Today</button>
        </div>
      </div>
    </>
  );

  const DesktopDayView = () => (
    <div style={{ flex: 1, display: 'flex', gap: 0, overflow: 'hidden' }}>
      {/* Arena Panel */}
      <div style={{
        width: 360,
        borderRight: `1px solid ${styles.border}`,
        display: 'flex',
        flexDirection: 'column',
        background: styles.card,
      }}>
        <div style={{
          padding: '20px 24px',
          borderBottom: `1px solid ${styles.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h2 style={{ 
            fontSize: 11, 
            letterSpacing: '0.05em', 
            color: styles.textMuted, 
            textTransform: 'uppercase', 
            margin: 0, 
            fontWeight: 600,
          }}>Today's Arena</h2>
          <span style={{ 
            fontSize: 12, 
            color: styles.sage, 
            background: styles.sageLight, 
            padding: '6px 12px', 
            borderRadius: 20,
            fontWeight: 600,
          }}>{todayBlocks.length} blocks</span>
        </div>

        <div style={{ flex: 1, overflow: 'auto' }}>
          {todayBlocks.map((block, index) => (
            <div key={index} style={{ 
              display: 'flex', 
              padding: '18px 24px', 
              gap: 16, 
              borderBottom: `1px solid ${styles.border}`, 
              cursor: 'pointer',
              transition: 'background 0.2s ease',
            }}>
              <div style={{ minWidth: 52, textAlign: 'right' }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: styles.textPrimary }}>{block.time}</div>
                <div style={{ fontSize: 12, color: styles.textMuted }}>{block.endTime}</div>
              </div>
              <div style={{ 
                flex: 1, 
                borderLeft: `3px solid ${getThemeColor(block.theme)}`, 
                paddingLeft: 14,
                borderRadius: '0 8px 8px 0',
                background: `linear-gradient(90deg, ${getThemeColor(block.theme)}08, transparent)`,
                marginLeft: -14,
                padding: '4px 0 4px 14px',
              }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: styles.textPrimary, lineHeight: 1.5, marginBottom: 4 }}>
                  {block.isKaizen && (
                    <span style={{ 
                      background: getThemeColor(block.theme),
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: 10,
                      fontWeight: 600,
                      marginRight: 8,
                    }}>Kaizen</span>
                  )}
                  {block.title}
                </div>
                <div style={{ fontSize: 13, color: styles.textSecondary, lineHeight: 1.5 }}>{block.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: styles.bg, overflow: 'hidden' }}>
        {/* Focus Section */}
        <div style={{ 
          padding: '24px 32px', 
          borderBottom: `1px solid ${styles.border}`, 
          background: styles.card,
          margin: '20px 20px 0',
          borderRadius: 16,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ 
              fontSize: 11, 
              letterSpacing: '0.05em', 
              color: styles.textMuted, 
              textTransform: 'uppercase', 
              margin: 0, 
              fontWeight: 600,
            }}>Top 3 Deliverables</h2>
            <span style={{ fontSize: 12, color: styles.textMuted }}>0/0 done</span>
          </div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: 60, 
            color: styles.textMuted, 
            fontSize: 14,
            background: styles.bg,
            borderRadius: 12,
            border: `1px dashed ${styles.sageBorder}`,
          }}>
            No focus items set for today
          </div>
        </div>

        {/* Playlist Section */}
        <div style={{ 
          flex: 1, 
          padding: '24px 32px', 
          overflow: 'auto',
          background: styles.card,
          margin: '20px',
          borderRadius: 16,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ 
              fontSize: 11, 
              letterSpacing: '0.05em', 
              color: styles.textMuted, 
              textTransform: 'uppercase', 
              margin: 0, 
              fontWeight: 600,
            }}>Today's Playlist</h2>
            <span style={{ fontSize: 12, color: styles.textMuted }}>{playlistItems.length} tasks</span>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            {['all', 'active', 'done'].map((filter) => (
              <button
                key={filter}
                onClick={() => setPlaylistFilter(filter)}
                style={{
                  padding: '8px 18px',
                  fontSize: 13,
                  fontWeight: playlistFilter === filter ? 600 : 400,
                  background: playlistFilter === filter ? styles.sage : 'transparent',
                  color: playlistFilter === filter ? 'white' : styles.textSecondary,
                  border: playlistFilter === filter ? 'none' : `1px solid ${styles.border}`,
                  borderRadius: 20,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  transition: 'all 0.2s ease',
                }}
              >{filter}</button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredPlaylist.map((item) => (
              <div key={item.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '16px 20px',
                background: styles.bg,
                borderRadius: 14,
                border: `1px solid ${styles.border}`,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}>
                <div style={{
                  width: 24,
                  height: 24,
                  borderRadius: 7,
                  border: item.done ? 'none' : `2px solid ${styles.sageBorder}`,
                  background: item.done ? styles.sage : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                }}>
                  {item.done && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                <span style={{
                  fontSize: 15,
                  color: item.done ? styles.textMuted : styles.textPrimary,
                  textDecoration: item.done ? 'line-through' : 'none',
                }}>{item.title}</span>
              </div>
            ))}
          </div>

          <button style={{
            marginTop: 16,
            padding: '16px',
            width: '100%',
            background: 'transparent',
            border: `1px dashed ${styles.sageBorder}`,
            borderRadius: 14,
            color: styles.sage,
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add task
          </button>
        </div>
      </div>
    </div>
  );

  const DesktopWeekView = () => (
    <div style={{
      flex: 1,
      display: 'flex',
      overflow: 'hidden',
      margin: '0 20px 20px',
      background: styles.card,
      borderRadius: 16,
      border: `1px solid ${styles.border}`,
    }}>
      {/* Time Column */}
      <div style={{ width: 60, borderRight: `1px solid ${styles.border}`, paddingTop: 60 }}>
        {hours.map((hour) => (
          <div key={hour} style={{ 
            height: 52, 
            paddingRight: 12, 
            textAlign: 'right', 
            fontSize: 11, 
            color: styles.textMuted, 
            transform: 'translateY(-6px)',
          }}>
            {hour === 12 ? '12 pm' : hour > 12 ? `${hour - 12}` : hour}
          </div>
        ))}
      </div>

      {/* Days */}
      <div style={{ flex: 1, display: 'flex' }}>
        {days.map((day, dayIndex) => (
          <div key={day.date} style={{ 
            flex: 1, 
            borderRight: dayIndex < days.length - 1 ? `1px solid ${styles.border}` : 'none', 
            position: 'relative',
          }}>
            {/* Day Header */}
            <div style={{
              height: 60,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              borderBottom: `1px solid ${styles.border}`,
              background: day.isToday ? styles.sageLight : 'transparent',
            }}>
              <span style={{ 
                fontSize: 11, 
                letterSpacing: '0.05em', 
                color: day.isToday ? styles.sage : styles.textMuted, 
                textTransform: 'uppercase',
                fontWeight: 600,
              }}>{day.day}</span>
              <span style={{ 
                fontSize: 20, 
                fontWeight: day.isToday ? 700 : 400, 
                color: day.isToday ? styles.sage : styles.textPrimary, 
                marginTop: 2,
              }}>{day.date}</span>
            </div>

            {/* Time Slots */}
            <div style={{ position: 'relative' }}>
              {hours.map((hour) => (
                <div key={hour} style={{ height: 52, borderBottom: `1px solid ${styles.border}` }} />
              ))}

              {/* Events */}
              {weekEvents[day.date]?.map((event, eventIndex) => {
                const [eventHour, eventMin] = event.time.split(':').map(Number);
                const top = (eventHour - 6) * 52 + (eventMin / 60) * 52;
                const height = (event.duration / 60) * 52;
                const themeColor = getThemeColor(event.theme);
                
                return (
                  <div
                    key={eventIndex}
                    style={{
                      position: 'absolute',
                      top,
                      left: 4,
                      right: 4,
                      height: Math.max(height - 4, 22),
                      background: event.type === 'block' 
                        ? `repeating-linear-gradient(45deg, ${themeColor}15, ${themeColor}15 3px, transparent 3px, transparent 6px)`
                        : `${themeColor}20`,
                      borderLeft: `3px solid ${themeColor}`,
                      borderRadius: 6,
                      padding: '4px 8px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      transition: 'transform 0.2s ease',
                    }}
                  >
                    <div style={{ 
                      fontSize: 11, 
                      fontWeight: 600, 
                      color: styles.textPrimary, 
                      lineHeight: 1.3, 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis', 
                      whiteSpace: height < 44 ? 'nowrap' : 'normal',
                    }}>{event.title}</div>
                    {height >= 44 && (
                      <div style={{ fontSize: 10, color: styles.textSecondary, marginTop: 2 }}>
                        {event.time} · {event.duration}m
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ==================== RENDER ====================

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: styles.bg,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      color: styles.textPrimary,
    }}>
      {isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <MobileSidebar />
          <MobileHeader />
          {activeView === 'day' ? <MobileDayView /> : <MobileWeekView />}
          <MobileNavigation />
        </div>
      ) : (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
          <DesktopSidebar />
          <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <DesktopHeader />
            {activeView === 'day' ? <DesktopDayView /> : <DesktopWeekView />}
          </main>
        </div>
      )}

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        button:hover { transform: translateY(-1px); }
        button:active { transform: translateY(0); }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(139, 148, 103, 0.2); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(139, 148, 103, 0.3); }
      `}</style>
    </div>
  );
};

export default KaizenOS;
