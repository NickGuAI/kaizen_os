import React, { useState, useEffect } from 'react';

const KaizenOS = () => {
  const [activeView, setActiveView] = useState('day');
  const [activeTheme, setActiveTheme] = useState(null);
  const [playlistFilter, setPlaylistFilter] = useState('all');
  const [isMobile, setIsMobile] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [selectedDay, setSelectedDay] = useState(12);
  const [mobileTab, setMobileTab] = useState('arena'); // arena, deliverables, playlist
  
  // Responsive detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const themes = [
    { id: 'life', name: 'Life Admin', color: '#C23B22' },
    { id: 'mastery', name: 'Mastery & Impact', color: '#D4763A' },
    { id: 'wisdom', name: 'Wisdom & Humility', color: '#6B7B5E' },
    { id: 'health', name: 'Health & Self Mastery', color: '#8B6914' },
    { id: 'love', name: 'Love & Presence', color: '#7B5E6B' },
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
    { time: '7:00', endTime: '7:20', title: 'Read AI/tech news daily (20 min)', description: 'Read AI/tech news daily (20 min)', theme: 'mastery', isKaizen: false },
    { time: '9:00', endTime: '9:15', title: 'Chat with Mom and Dad every day', description: '15 mins before bed. One hour on weekends', theme: 'love', isKaizen: false },
    { time: '9:00', endTime: '10:00', title: 'Run quarterly asset allocation', description: 'Review asset allocations and adjust', theme: 'life', isKaizen: false },
    { time: '10:00', endTime: '11:00', title: 'Secure strategic role for VC partnership', description: 'Position for VC partnership', theme: 'mastery', isKaizen: true },
    { time: '11:00', endTime: '11:45', title: 'GV Interview Crystal', description: 'Strategic role positioning', theme: 'mastery', isKaizen: false },
    { time: '12:00', endTime: '12:30', title: 'Nick G Coffee Chat (Maggie Estes)', description: '2x 1:1 with founder/investor weekly', theme: 'love', isKaizen: false },
    { time: '12:30', endTime: '13:00', title: 'Call (718) 491-5800 to schedule surgery', description: 'Complete health procedures by week 11', theme: 'health', isKaizen: true },
    { time: '12:30', endTime: '13:00', title: 'Gehirn Inc Tax Reporting', description: 'Tax reporting', theme: 'life', isKaizen: true },
    { time: '13:00', endTime: '13:30', title: 'Google Team Meeting', description: 'Land Chat Benchmark for Google Codewiki', theme: 'mastery', isKaizen: false },
    { time: '13:30', endTime: '15:00', title: 'Land Chat Benchmark for Google Codewiki', description: 'Benchmark development', theme: 'mastery', isKaizen: true },
    { time: '15:00', endTime: '15:30', title: 'PMAI Sponsor', description: 'Scale PMAI as proof-of-concept', theme: 'mastery', isKaizen: true },
    { time: '15:30', endTime: '16:00', title: 'Move CRM to Monday', description: 'Manage contacts there', theme: 'life', isKaizen: true },
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
      { time: '21:00', duration: 60, title: 'PMAI Core Team', theme: 'mastery' },
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

  const getThemeColor = (themeId) => themes.find(t => t.id === themeId)?.color || '#4A4A4A';

  const hours = Array.from({ length: 16 }, (_, i) => i + 6);

  const filteredPlaylist = playlistItems.filter(item => {
    if (playlistFilter === 'active') return !item.done;
    if (playlistFilter === 'done') return item.done;
    return true;
  });

  // ==================== MOBILE COMPONENTS ====================

  const MobileHeader = () => (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      padding: '16px 20px',
      background: 'rgba(250, 248, 245, 0.95)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(28, 28, 28, 0.06)',
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
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1C1C1C" strokeWidth="1.5">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontSize: 11,
          letterSpacing: '0.12em',
          color: '#8B8B8B',
          textTransform: 'uppercase',
        }}>改善</div>
        <div style={{
          fontSize: 14,
          fontFamily: "'Cormorant Garamond', serif",
          color: '#1C1C1C',
        }}>
          {activeView === 'day' 
            ? `${days.find(d => d.date === selectedDay)?.dayFull}, Jan ${selectedDay}`
            : 'Jan 12 – 18'}
        </div>
      </div>

      <button
        style={{
          background: 'transparent',
          border: 'none',
          padding: 8,
          cursor: 'pointer',
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1C1C1C" strokeWidth="1.5">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
      </button>
    </header>
  );

  const MobileSidebar = () => (
    <>
      {/* Overlay */}
      <div
        onClick={() => setShowSidebar(false)}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(28, 28, 28, 0.3)',
          zIndex: 200,
          opacity: showSidebar ? 1 : 0,
          pointerEvents: showSidebar ? 'auto' : 'none',
          transition: 'opacity 0.3s ease',
        }}
      />
      
      {/* Drawer */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        width: '85%',
        maxWidth: 320,
        background: 'linear-gradient(180deg, #FAF8F5 0%, #F0EBE3 100%)',
        zIndex: 300,
        transform: showSidebar ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.4s cubic-bezier(0.23, 1, 0.32, 1)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 20px',
          borderBottom: '1px solid rgba(28, 28, 28, 0.06)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <h1 style={{
              fontSize: 24,
              fontWeight: 300,
              fontFamily: "'Cormorant Garamond', serif",
              margin: 0,
              color: '#1C1C1C',
            }}>改善</h1>
            <span style={{
              fontSize: 10,
              letterSpacing: '0.12em',
              color: '#8B8B8B',
              textTransform: 'uppercase',
            }}>Kaizen OS</span>
          </div>
          <button
            onClick={() => setShowSidebar(false)}
            style={{
              background: 'transparent',
              border: 'none',
              padding: 8,
              cursor: 'pointer',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8B8B8B" strokeWidth="1.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Season Card - Compact */}
        <div style={{
          margin: '20px',
          padding: '20px',
          background: '#FAF8F5',
          borderRadius: '4px 20px 4px 20px',
          boxShadow: '0 2px 4px rgba(28, 28, 28, 0.02), 0 8px 24px rgba(28, 28, 28, 0.03)',
          border: '1px solid rgba(28, 28, 28, 0.04)',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 16,
          }}>
            <span style={{
              fontSize: 10,
              letterSpacing: '0.12em',
              color: '#8B8B8B',
              textTransform: 'uppercase',
            }}>S1 2026</span>
            <span style={{ fontSize: 12, color: '#8B8B8B' }}>Week 3/12</span>
          </div>
          
          <div style={{ display: 'flex', gap: 20 }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 300, fontFamily: "'Cormorant Garamond', serif" }}>1080h</div>
              <div style={{ fontSize: 10, color: '#8B8B8B' }}>capacity</div>
            </div>
            <div style={{ borderLeft: '1px solid rgba(28, 28, 28, 0.08)', paddingLeft: 20 }}>
              <div style={{ fontSize: 24, fontWeight: 300, fontFamily: "'Cormorant Garamond', serif" }}>26</div>
              <div style={{ fontSize: 10, color: '#8B8B8B' }}>actions</div>
            </div>
          </div>

          <div style={{
            marginTop: 16,
            height: 2,
            background: 'rgba(28, 28, 28, 0.06)',
            borderRadius: 1,
          }}>
            <div style={{
              width: '18%',
              height: '100%',
              background: 'linear-gradient(90deg, #C4C4C4, #4A4A4A)',
              borderRadius: 1,
            }} />
          </div>
        </div>

        {/* Vetoes */}
        <div style={{ flex: 1, overflow: 'auto', padding: '0 20px 20px' }}>
          <h2 style={{
            fontSize: 10,
            letterSpacing: '0.12em',
            color: '#8B8B8B',
            textTransform: 'uppercase',
            marginBottom: 12,
            fontWeight: 500,
          }}>Season Vetoes</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {vetoes.map((veto) => (
              <div
                key={veto.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '10px 12px',
                  background: veto.count > 0 ? 'rgba(194, 59, 34, 0.04)' : 'transparent',
                  borderRadius: '2px 10px 2px 10px',
                  border: `1px solid ${veto.count > 0 ? 'rgba(194, 59, 34, 0.12)' : 'rgba(28, 28, 28, 0.04)'}`,
                }}
              >
                <div style={{
                  minWidth: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: veto.count > 0 ? 'rgba(194, 59, 34, 0.12)' : 'rgba(28, 28, 28, 0.04)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  color: veto.count > 0 ? '#C23B22' : '#8B8B8B',
                  fontWeight: 500,
                }}>
                  {veto.count}
                </div>
                <span style={{
                  fontSize: 12,
                  lineHeight: 1.4,
                  color: veto.count > 0 ? '#4A4A4A' : '#8B8B8B',
                }}>{veto.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Themes */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid rgba(28, 28, 28, 0.06)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
        }}>
          {themes.map((theme) => (
            <div
              key={theme.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 10px',
                background: 'rgba(28, 28, 28, 0.02)',
                borderRadius: '2px 8px 2px 8px',
              }}
            >
              <div style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: theme.color,
              }} />
              <span style={{ fontSize: 11, color: '#4A4A4A' }}>{theme.name}</span>
            </div>
          ))}
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
      background: 'rgba(250, 248, 245, 0.95)',
      backdropFilter: 'blur(12px)',
      borderTop: '1px solid rgba(28, 28, 28, 0.06)',
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
            padding: '8px 24px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <svg 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke={activeView === nav.id ? '#1C1C1C' : '#8B8B8B'} 
            strokeWidth="1.5"
          >
            <path d={nav.icon} />
          </svg>
          <span style={{
            fontSize: 10,
            letterSpacing: '0.04em',
            color: activeView === nav.id ? '#1C1C1C' : '#8B8B8B',
            fontWeight: activeView === nav.id ? 500 : 400,
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
    }}>
      {/* Day Selector Scroll */}
      <div style={{
        display: 'flex',
        gap: 8,
        padding: '16px 20px',
        overflow: 'auto',
        borderBottom: '1px solid rgba(28, 28, 28, 0.04)',
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
              background: selectedDay === day.date ? '#1C1C1C' : 'rgba(28, 28, 28, 0.02)',
              border: 'none',
              borderRadius: '4px 16px 4px 16px',
              cursor: 'pointer',
              minWidth: 56,
              transition: 'all 0.3s ease',
            }}
          >
            <span style={{
              fontSize: 10,
              letterSpacing: '0.08em',
              color: selectedDay === day.date ? 'rgba(250, 248, 245, 0.6)' : '#8B8B8B',
              textTransform: 'uppercase',
            }}>{day.day}</span>
            <span style={{
              fontSize: 20,
              fontWeight: 300,
              fontFamily: "'Cormorant Garamond', serif",
              color: selectedDay === day.date ? '#FAF8F5' : '#1C1C1C',
              marginTop: 2,
            }}>{day.date}</span>
            {day.isToday && (
              <div style={{
                width: 4,
                height: 4,
                borderRadius: '50%',
                background: selectedDay === day.date ? '#FAF8F5' : '#C23B22',
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
        borderBottom: '1px solid rgba(28, 28, 28, 0.04)',
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
              background: mobileTab === tab.id ? 'rgba(28, 28, 28, 0.04)' : 'transparent',
              border: '1px solid',
              borderColor: mobileTab === tab.id ? 'rgba(28, 28, 28, 0.08)' : 'transparent',
              borderRadius: '2px 10px 2px 10px',
              fontSize: 12,
              color: mobileTab === tab.id ? '#1C1C1C' : '#8B8B8B',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
          >
            {tab.label}
            <span style={{ opacity: 0.6, marginLeft: 4 }}>({tab.count})</span>
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
                  padding: '14px 20px',
                  gap: 14,
                  borderBottom: '1px solid rgba(28, 28, 28, 0.03)',
                }}
              >
                <div style={{ minWidth: 40, textAlign: 'right' }}>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: '#1C1C1C',
                    fontFamily: "'Cormorant Garamond', serif",
                  }}>{block.time}</div>
                  <div style={{ fontSize: 10, color: '#C4C4C4' }}>{block.endTime}</div>
                </div>

                <div style={{
                  flex: 1,
                  borderLeft: `2px solid ${getThemeColor(block.theme)}`,
                  paddingLeft: 12,
                }}>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: '#1C1C1C',
                    lineHeight: 1.4,
                  }}>
                    {block.isKaizen && (
                      <span style={{ color: getThemeColor(block.theme) }}>[K] </span>
                    )}
                    {block.title}
                  </div>
                  <div style={{
                    fontSize: 11,
                    color: '#8B8B8B',
                    marginTop: 2,
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
            color: '#C4C4C4',
          }}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1">
              <circle cx="24" cy="24" r="20" strokeDasharray="4 4" />
              <path d="M24 14v20M14 24h20" />
            </svg>
            <p style={{ marginTop: 16, fontSize: 14, textAlign: 'center' }}>
              No focus items set for today
            </p>
            <button style={{
              marginTop: 16,
              padding: '10px 20px',
              background: '#1C1C1C',
              color: '#FAF8F5',
              border: 'none',
              borderRadius: '2px 10px 2px 10px',
              fontSize: 13,
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
                    padding: '6px 12px',
                    fontSize: 11,
                    background: playlistFilter === filter ? '#6B7B5E' : 'transparent',
                    color: playlistFilter === filter ? '#FAF8F5' : '#8B8B8B',
                    border: playlistFilter === filter ? 'none' : '1px solid rgba(28, 28, 28, 0.08)',
                    borderRadius: '2px 8px 2px 8px',
                    cursor: 'pointer',
                    textTransform: 'capitalize',
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
                    gap: 12,
                    padding: '14px 16px',
                    background: 'rgba(28, 28, 28, 0.02)',
                    borderRadius: '2px 12px 2px 12px',
                    border: '1px solid rgba(28, 28, 28, 0.04)',
                  }}
                >
                  <div style={{
                    width: 22,
                    height: 22,
                    borderRadius: 4,
                    border: item.done ? 'none' : '1.5px solid rgba(28, 28, 28, 0.2)',
                    background: item.done ? '#6B7B5E' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FAF8F5',
                    fontSize: 12,
                  }}>
                    {item.done && '✓'}
                  </div>
                  <span style={{
                    fontSize: 14,
                    color: item.done ? '#8B8B8B' : '#1C1C1C',
                    textDecoration: item.done ? 'line-through' : 'none',
                  }}>{item.title}</span>
                </div>
              ))}
            </div>

            <button style={{
              marginTop: 16,
              padding: '14px',
              width: '100%',
              background: 'transparent',
              border: '1px dashed rgba(28, 28, 28, 0.12)',
              borderRadius: '2px 12px 2px 12px',
              color: '#8B8B8B',
              fontSize: 13,
              cursor: 'pointer',
            }}>
              + Add task
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
    }}>
      {/* Week Header */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid rgba(28, 28, 28, 0.04)',
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
              padding: '12px 4px',
              textAlign: 'center',
              background: day.isToday ? 'rgba(28, 28, 28, 0.02)' : 'transparent',
              cursor: 'pointer',
            }}
          >
            <div style={{
              fontSize: 10,
              letterSpacing: '0.06em',
              color: '#8B8B8B',
              textTransform: 'uppercase',
            }}>{day.day}</div>
            <div style={{
              fontSize: 16,
              fontWeight: day.isToday ? 500 : 300,
              fontFamily: "'Cormorant Garamond', serif",
              color: day.isToday ? '#1C1C1C' : '#4A4A4A',
              marginTop: 2,
            }}>{day.date}</div>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        <div style={{ display: 'flex' }}>
          {/* Time Column */}
          <div style={{ width: 44, flexShrink: 0 }}>
            {hours.map((hour) => (
              <div
                key={hour}
                style={{
                  height: 52,
                  paddingRight: 8,
                  textAlign: 'right',
                  fontSize: 10,
                  color: '#8B8B8B',
                  transform: 'translateY(-6px)',
                }}
              >
                {hour === 12 ? '12p' : hour > 12 ? `${hour - 12}` : hour}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          {days.map((day, dayIndex) => (
            <div
              key={day.date}
              style={{
                flex: 1,
                position: 'relative',
                borderLeft: '1px solid rgba(28, 28, 28, 0.04)',
              }}
            >
              {/* Hour lines */}
              {hours.map((hour) => (
                <div
                  key={hour}
                  style={{
                    height: 52,
                    borderBottom: '1px solid rgba(28, 28, 28, 0.03)',
                  }}
                />
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
                    onClick={() => {
                      setSelectedDay(day.date);
                      setActiveView('day');
                    }}
                    style={{
                      position: 'absolute',
                      top,
                      left: 2,
                      right: 2,
                      height: Math.max(height - 2, 18),
                      background: event.type === 'block' 
                        ? `repeating-linear-gradient(45deg, ${themeColor}10, ${themeColor}10 3px, transparent 3px, transparent 6px)`
                        : `${themeColor}18`,
                      borderLeft: `2px solid ${themeColor}`,
                      borderRadius: '1px 4px 1px 4px',
                      padding: '2px 4px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{
                      fontSize: 9,
                      fontWeight: 500,
                      color: '#1C1C1C',
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
      width: 280,
      borderRight: '1px solid rgba(28, 28, 28, 0.06)',
      padding: '32px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 32,
      background: 'linear-gradient(180deg, #FAF8F5 0%, #F0EBE3 100%)',
      flexShrink: 0,
    }}>
      <div style={{ marginBottom: 8 }}>
        <h1 style={{
          fontSize: 20,
          fontWeight: 300,
          fontFamily: "'Cormorant Garamond', serif",
          letterSpacing: '0.08em',
          margin: 0,
          color: '#1C1C1C',
        }}>改善</h1>
        <span style={{
          fontSize: 11,
          letterSpacing: '0.12em',
          color: '#8B8B8B',
          textTransform: 'uppercase',
        }}>Kaizen OS</span>
      </div>

      <div style={{
        background: '#FAF8F5',
        borderRadius: '4px 24px 4px 24px',
        padding: '24px',
        boxShadow: '0 2px 4px rgba(28, 28, 28, 0.02), 0 12px 40px rgba(28, 28, 28, 0.03)',
        border: '1px solid rgba(28, 28, 28, 0.04)',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 20,
        }}>
          <span style={{ fontSize: 11, letterSpacing: '0.12em', color: '#8B8B8B', textTransform: 'uppercase' }}>Season One</span>
          <span style={{ fontSize: 13, color: '#8B8B8B' }}>2026</span>
        </div>
        
        <div style={{ display: 'flex', gap: 24 }}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 300, fontFamily: "'Cormorant Garamond', serif", color: '#1C1C1C', lineHeight: 1 }}>1080</div>
            <div style={{ fontSize: 10, letterSpacing: '0.08em', color: '#8B8B8B', marginTop: 4 }}>hours</div>
          </div>
          <div style={{ borderLeft: '1px solid rgba(28, 28, 28, 0.08)', paddingLeft: 24 }}>
            <div style={{ fontSize: 28, fontWeight: 300, fontFamily: "'Cormorant Garamond', serif", color: '#1C1C1C', lineHeight: 1 }}>5</div>
            <div style={{ fontSize: 10, letterSpacing: '0.08em', color: '#8B8B8B', marginTop: 4 }}>themes</div>
          </div>
          <div style={{ borderLeft: '1px solid rgba(28, 28, 28, 0.08)', paddingLeft: 24 }}>
            <div style={{ fontSize: 28, fontWeight: 300, fontFamily: "'Cormorant Garamond', serif", color: '#1C1C1C', lineHeight: 1 }}>26</div>
            <div style={{ fontSize: 10, letterSpacing: '0.08em', color: '#8B8B8B', marginTop: 4 }}>actions</div>
          </div>
        </div>

        <div style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: '#8B8B8B' }}>Week 3 of 12</span>
            <span style={{ fontSize: 11, color: '#4A4A4A' }}>18%</span>
          </div>
          <div style={{ height: 2, background: 'rgba(28, 28, 28, 0.06)', borderRadius: 1 }}>
            <div style={{ width: '18%', height: '100%', background: 'linear-gradient(90deg, #C4C4C4, #4A4A4A)', borderRadius: 1 }} />
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        <h2 style={{ fontSize: 11, letterSpacing: '0.12em', color: '#8B8B8B', textTransform: 'uppercase', marginBottom: 16, fontWeight: 500 }}>Season Vetoes</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {vetoes.map((veto) => (
            <div
              key={veto.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: '12px 14px',
                background: veto.count > 0 ? 'rgba(194, 59, 34, 0.04)' : 'transparent',
                borderRadius: '2px 12px 2px 12px',
                border: `1px solid ${veto.count > 0 ? 'rgba(194, 59, 34, 0.12)' : 'rgba(28, 28, 28, 0.04)'}`,
                cursor: 'pointer',
              }}
            >
              <div style={{
                minWidth: 20,
                height: 20,
                borderRadius: '50%',
                background: veto.count > 0 ? 'rgba(194, 59, 34, 0.12)' : 'rgba(28, 28, 28, 0.04)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                color: veto.count > 0 ? '#C23B22' : '#8B8B8B',
                fontWeight: 500,
              }}>{veto.count}</div>
              <span style={{ fontSize: 13, lineHeight: 1.5, color: veto.count > 0 ? '#4A4A4A' : '#8B8B8B' }}>{veto.text}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );

  const DesktopDayView = () => (
    <div style={{ flex: 1, display: 'flex', gap: 0, overflow: 'hidden' }}>
      <div style={{
        width: 320,
        borderRight: '1px solid rgba(28, 28, 28, 0.06)',
        display: 'flex',
        flexDirection: 'column',
        background: '#FAF8F5',
      }}>
        <div style={{
          padding: '24px 24px 16px',
          borderBottom: '1px solid rgba(28, 28, 28, 0.04)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h2 style={{ fontSize: 11, letterSpacing: '0.12em', color: '#8B8B8B', textTransform: 'uppercase', margin: 0, fontWeight: 500 }}>Today's Arena</h2>
          <span style={{ fontSize: 12, color: '#8B8B8B', background: 'rgba(28, 28, 28, 0.04)', padding: '4px 10px', borderRadius: '2px 8px 2px 8px' }}>{todayBlocks.length} blocks</span>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
          {todayBlocks.map((block, index) => (
            <div key={index} style={{ display: 'flex', padding: '16px 24px', gap: 16, borderBottom: '1px solid rgba(28, 28, 28, 0.03)', cursor: 'pointer' }}>
              <div style={{ minWidth: 44, textAlign: 'right' }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#1C1C1C', fontFamily: "'Cormorant Garamond', serif" }}>{block.time}</div>
                <div style={{ fontSize: 11, color: '#C4C4C4' }}>{block.endTime}</div>
              </div>
              <div style={{ flex: 1, borderLeft: `2px solid ${getThemeColor(block.theme)}`, paddingLeft: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#1C1C1C', lineHeight: 1.5, marginBottom: 4 }}>
                  {block.isKaizen && <span style={{ color: getThemeColor(block.theme), marginRight: 4 }}>[Kaizen]</span>}
                  {block.title}
                </div>
                <div style={{ fontSize: 12, color: '#8B8B8B', lineHeight: 1.5 }}>{block.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#FAF8F5', overflow: 'hidden' }}>
        <div style={{ padding: '24px 32px', borderBottom: '1px solid rgba(28, 28, 28, 0.04)', minHeight: 180 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h2 style={{ fontSize: 11, letterSpacing: '0.12em', color: '#8B8B8B', textTransform: 'uppercase', margin: 0, fontWeight: 500 }}>Top 3 Deliverables</h2>
            <span style={{ fontSize: 12, color: '#8B8B8B' }}>0/0 done</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 80, color: '#C4C4C4', fontSize: 14, fontStyle: 'italic' }}>
            No focus items set for today
          </div>
        </div>

        <div style={{ flex: 1, padding: '24px 32px', overflow: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 11, letterSpacing: '0.12em', color: '#8B8B8B', textTransform: 'uppercase', margin: 0, fontWeight: 500 }}>Today's Playlist</h2>
            <span style={{ fontSize: 12, color: '#8B8B8B' }}>{playlistItems.length} tasks</span>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            {['all', 'active', 'done'].map((filter) => (
              <button
                key={filter}
                onClick={() => setPlaylistFilter(filter)}
                style={{
                  padding: '8px 14px',
                  fontSize: 12,
                  background: playlistFilter === filter ? '#6B7B5E' : 'transparent',
                  color: playlistFilter === filter ? '#FAF8F5' : '#8B8B8B',
                  border: playlistFilter === filter ? 'none' : '1px solid rgba(28, 28, 28, 0.08)',
                  borderRadius: '2px 10px 2px 10px',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >{filter}</button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredPlaylist.map((item) => (
              <div key={item.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '14px 18px',
                background: 'rgba(28, 28, 28, 0.02)',
                borderRadius: '2px 12px 2px 12px',
                border: '1px solid rgba(28, 28, 28, 0.04)',
                cursor: 'pointer',
              }}>
                <div style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  border: item.done ? 'none' : '1.5px solid rgba(28, 28, 28, 0.2)',
                  background: item.done ? '#6B7B5E' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FAF8F5',
                  fontSize: 12,
                }}>{item.done && '✓'}</div>
                <span style={{
                  fontSize: 14,
                  color: item.done ? '#8B8B8B' : '#1C1C1C',
                  textDecoration: item.done ? 'line-through' : 'none',
                }}>{item.title}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const DesktopWeekView = () => (
    <div style={{
      flex: 1,
      display: 'flex',
      overflow: 'hidden',
      margin: '0 32px 32px',
      background: '#FAF8F5',
      borderRadius: '4px 24px 4px 24px',
      border: '1px solid rgba(28, 28, 28, 0.06)',
      boxShadow: '0 2px 4px rgba(28, 28, 28, 0.02), 0 12px 40px rgba(28, 28, 28, 0.03)',
    }}>
      <div style={{ width: 60, borderRight: '1px solid rgba(28, 28, 28, 0.04)', paddingTop: 56 }}>
        {hours.map((hour) => (
          <div key={hour} style={{ height: 48, paddingRight: 12, textAlign: 'right', fontSize: 11, color: '#8B8B8B', transform: 'translateY(-6px)' }}>
            {hour === 12 ? '12 pm' : hour > 12 ? `${hour - 12}` : hour}
          </div>
        ))}
      </div>

      <div style={{ flex: 1, display: 'flex' }}>
        {days.map((day, dayIndex) => (
          <div key={day.date} style={{ flex: 1, borderRight: dayIndex < days.length - 1 ? '1px solid rgba(28, 28, 28, 0.04)' : 'none', position: 'relative' }}>
            <div style={{
              height: 56,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              borderBottom: '1px solid rgba(28, 28, 28, 0.04)',
              background: day.isToday ? 'rgba(28, 28, 28, 0.02)' : 'transparent',
            }}>
              <span style={{ fontSize: 11, letterSpacing: '0.08em', color: '#8B8B8B', textTransform: 'uppercase' }}>{day.day}</span>
              <span style={{ fontSize: 18, fontWeight: day.isToday ? 500 : 300, fontFamily: "'Cormorant Garamond', serif", color: day.isToday ? '#1C1C1C' : '#4A4A4A', marginTop: 2 }}>{day.date}</span>
            </div>

            <div style={{ position: 'relative' }}>
              {hours.map((hour) => (
                <div key={hour} style={{ height: 48, borderBottom: '1px solid rgba(28, 28, 28, 0.03)' }} />
              ))}

              {weekEvents[day.date]?.map((event, eventIndex) => {
                const [eventHour, eventMin] = event.time.split(':').map(Number);
                const top = (eventHour - 6) * 48 + (eventMin / 60) * 48;
                const height = (event.duration / 60) * 48;
                const themeColor = getThemeColor(event.theme);
                
                return (
                  <div
                    key={eventIndex}
                    style={{
                      position: 'absolute',
                      top,
                      left: 4,
                      right: 4,
                      height: Math.max(height - 4, 20),
                      background: event.type === 'block' ? `repeating-linear-gradient(45deg, ${themeColor}08, ${themeColor}08 4px, transparent 4px, transparent 8px)` : `${themeColor}12`,
                      borderLeft: `2px solid ${themeColor}`,
                      borderRadius: '2px 8px 2px 8px',
                      padding: '4px 8px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 500, color: '#1C1C1C', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: height < 40 ? 'nowrap' : 'normal' }}>{event.title}</div>
                    {height >= 40 && <div style={{ fontSize: 10, color: '#8B8B8B', marginTop: 2 }}>{event.time} · {event.duration}m</div>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const DesktopHeader = () => (
    <>
      <header style={{
        padding: '20px 32px',
        borderBottom: '1px solid rgba(28, 28, 28, 0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#FAF8F5',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {themes.map((theme) => (
            <button
              key={theme.id}
              onClick={() => setActiveTheme(activeTheme === theme.id ? null : theme.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 14px',
                background: activeTheme === theme.id ? 'rgba(28, 28, 28, 0.04)' : 'transparent',
                border: '1px solid transparent',
                borderColor: activeTheme === theme.id ? 'rgba(28, 28, 28, 0.08)' : 'transparent',
                borderRadius: '2px 10px 2px 10px',
                cursor: 'pointer',
              }}
            >
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: theme.color, opacity: activeTheme && activeTheme !== theme.id ? 0.3 : 1 }} />
              <span style={{ fontSize: 13, color: activeTheme && activeTheme !== theme.id ? '#C4C4C4' : '#4A4A4A' }}>{theme.name}</span>
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {['Tag', 'Sync', 'Review', 'Plan'].map((action, i) => (
            <button
              key={action}
              style={{
                padding: '10px 18px',
                background: i === 0 ? '#C23B22' : i === 3 ? '#1C1C1C' : 'transparent',
                color: i === 0 || i === 3 ? '#FAF8F5' : '#4A4A4A',
                border: i === 0 || i === 3 ? 'none' : '1px solid rgba(28, 28, 28, 0.12)',
                borderRadius: '2px 10px 2px 10px',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >{action}</button>
          ))}
        </div>
      </header>

      <div style={{ padding: '24px 32px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button style={{ background: 'transparent', border: 'none', fontSize: 18, color: '#8B8B8B', cursor: 'pointer', padding: 8 }}>←</button>
          <h2 style={{ fontSize: 18, fontWeight: 400, fontFamily: "'Cormorant Garamond', serif", margin: 0 }}>
            {activeView === 'day' ? 'Monday, January 12, 2026' : 'January 12 – 18, 2026'}
          </h2>
          <button style={{ background: 'transparent', border: 'none', fontSize: 18, color: '#8B8B8B', cursor: 'pointer', padding: 8 }}>→</button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {['Day', 'Week'].map((view) => (
            <button
              key={view}
              onClick={() => setActiveView(view.toLowerCase())}
              style={{
                padding: '8px 16px',
                background: activeView === view.toLowerCase() ? 'rgba(28, 28, 28, 0.04)' : 'transparent',
                border: '1px solid',
                borderColor: activeView === view.toLowerCase() ? 'rgba(28, 28, 28, 0.08)' : 'transparent',
                borderRadius: '2px 8px 2px 8px',
                fontSize: 13,
                color: activeView === view.toLowerCase() ? '#1C1C1C' : '#8B8B8B',
                cursor: 'pointer',
              }}
            >{view}</button>
          ))}
          <button style={{
            marginLeft: 16,
            padding: '8px 16px',
            background: 'transparent',
            border: '1px solid rgba(28, 28, 28, 0.12)',
            borderRadius: '2px 8px 2px 8px',
            fontSize: 13,
            color: '#4A4A4A',
            cursor: 'pointer',
          }}>Today</button>
        </div>
      </div>
    </>
  );

  // ==================== RENDER ====================

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#FAF8F5',
      fontFamily: "'Source Sans 3', -apple-system, sans-serif",
      color: '#1C1C1C',
    }}>
      {/* Paper texture */}
      <div style={{
        position: 'fixed',
        inset: 0,
        background: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%' height='100%' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        opacity: 0.015,
        pointerEvents: 'none',
      }} />

      {isMobile ? (
        // MOBILE LAYOUT
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <MobileSidebar />
          <MobileHeader />
          {activeView === 'day' ? <MobileDayView /> : <MobileWeekView />}
          <MobileNavigation />
        </div>
      ) : (
        // DESKTOP LAYOUT
        <div style={{ display: 'flex', minHeight: '100vh' }}>
          <DesktopSidebar />
          <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <DesktopHeader />
            {activeView === 'day' ? <DesktopDayView /> : <DesktopWeekView />}
          </main>
        </div>
      )}

      <style>{`
        * { box-sizing: border-box; }
        button:hover { transform: translateY(-1px); }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(28, 28, 28, 0.1); border-radius: 3px; }
      `}</style>
    </div>
  );
};

export default KaizenOS;
