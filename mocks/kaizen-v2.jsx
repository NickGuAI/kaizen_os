import React, { useState, useEffect } from 'react';

/**
 * KAIZEN OS - Redesign v2
 * 
 * Layout Structure (matching responsive design):
 * - Desktop: Sidebar (280px) + Main content with header
 * - Header: Theme filters (left) + Action buttons (right)
 * - Sub-header: Date navigation + View toggle
 * - Day View: Arena list (left) + Deliverables/Playlist (right)
 * - Week View: Full calendar grid
 * 
 * Style: Our Zen design system with vibrant theme colors
 */

const KaizenOS = () => {
  // View & Navigation State
  const [activeView, setActiveView] = useState('week');
  const [activeTheme, setActiveTheme] = useState(null);
  const [selectedDay, setSelectedDay] = useState(12);
  const [playlistFilter, setPlaylistFilter] = useState('all');
  
  // Mode State
  const [activeMode, setActiveMode] = useState(null); // null, 'tag', 'plan', 'review'
  const [tagType, setTagType] = useState('intention');
  const [tagValue, setTagValue] = useState(null);
  
  // Mobile State
  const [isMobile, setIsMobile] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [mobileTab, setMobileTab] = useState('arena');

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ==================== DATA ====================

  // VIBRANT THEME COLORS
  const themes = [
    { id: 'life', name: 'Life Admin', color: '#EA580C', allocation: 0, actual: 16.8 },
    { id: 'mastery', name: 'Mastery & Impact', color: '#2563EB', allocation: 50, actual: 38.5 },
    { id: 'wisdom', name: 'Wisdom & Humility', color: '#7C3AED', allocation: 15, actual: 3 },
    { id: 'health', name: 'Health & Self Mastery', color: '#059669', allocation: 10, actual: 4.8 },
    { id: 'love', name: 'Love & Presence', color: '#DB2777', allocation: 25, actual: 26.8 },
  ];

  const vetoes = [
    { id: 1, text: 'No self-deception and ego-protecting lies', count: 1 },
    { id: 2, text: 'No multi-tasking during focus blocks', count: 1 },
    { id: 3, text: 'No saying "yes" in the moment to commitments', count: 1 },
    { id: 4, text: 'No attending or personally running PMAI events beyond cap', count: 1 },
    { id: 5, text: 'No purchases >$500 that aren\'t pre-budgeted', count: 0 },
    { id: 6, text: 'No new projects without a defined "kill date"', count: 0 },
  ];

  const intentions = [
    { value: 'want', label: 'I want to do it', color: '#059669' },
    { value: 'dont_want', label: "I don't want to do it", color: '#DC2626' },
    { value: 'dont_care', label: "I don't care", color: '#6B7280' },
  ];

  // Review Data
  const reviewData = {
    period: 'Jan 4 - Jan 10',
    totalTime: 98.3,
    eventsCount: 94,
    autoClassified: 94,
    needsReview: 0,
    coverage: 100,
    themeHours: [
      { theme: 'love', hours: 26.8, planned: 10 },
      { theme: 'health', hours: 4.8, planned: 10 },
      { theme: 'wisdom', hours: 3, planned: 10 },
      { theme: 'mastery', hours: 38.5, planned: 10 },
      { theme: 'life', hours: 16.8, planned: 0 },
    ],
    classifiedEvents: [
      { event: 'Morning Play & Drop Off', classification: '2 device-free hours per day with Aria', theme: 'love' },
      { event: 'Chat with Mom and Dad every day, 15 mins before bed', classification: 'Chat with Mom and Dad every day, 15 mins before bed. One hour on weekends', theme: 'love' },
      { event: 'PMAI Jan newsletter', classification: 'Scale PMAI as proof-of-concept for ecosystem building', theme: 'mastery' },
      { event: 'return clothes', classification: 'Operational Tasks For Life', theme: 'life' },
      { event: 'Lunch', classification: 'Operational Tasks For Life', theme: 'life' },
      { event: 'PMAI Ops / Strategy', classification: 'Scale PMAI as proof-of-concept for ecosystem building', theme: 'mastery' },
      { event: 'team meeting', classification: 'PMAI leads sync monthly (2 hrs)', theme: 'mastery' },
      { event: 'Chelsea / Nick', classification: '2x 1:1 with founder/investor weekly (1 hr each)', theme: 'love' },
      { event: 'Gym @ Chelsea', classification: 'Health & Self Mastery', theme: 'health' },
      { event: 'daily journal', classification: 'Wisdom and Humility', theme: 'wisdom' },
    ],
  };

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
    { time: '13:00', endTime: '13:30', title: 'Google Team Meeting', description: 'Land Chat Benchmark for Google Codewiki', theme: 'mastery', isKaizen: false },
    { time: '13:30', endTime: '15:00', title: 'Land Chat Benchmark for Google Codewiki', description: 'Benchmark development', theme: 'mastery', isKaizen: true },
    { time: '15:00', endTime: '15:30', title: 'PMAI Sponsor', description: 'Scale PMAI as proof-of-concept', theme: 'mastery', isKaizen: true },
    { time: '17:30', endTime: '18:30', title: 'Gym @ Chelsea', description: 'Health & fitness', theme: 'health', isKaizen: false },
  ];

  const playlistItems = [
    { id: 1, title: 'Schedule meeting with grip', done: true },
    { id: 2, title: 'Review Q1 OKRs draft', done: false },
    { id: 3, title: 'Send follow-up to Sarah', done: false },
  ];

  const weekEvents = {
    12: [
      { time: '7:00', duration: 20, title: 'Read AI/tech news', theme: 'mastery' },
      { time: '9:00', duration: 15, title: 'Chat with Mom and Dad', theme: 'love' },
      { time: '9:00', duration: 60, title: 'Asset allocation', theme: 'life' },
      { time: '10:00', duration: 60, title: 'Secure strategic role', theme: 'mastery', isKaizen: true },
      { time: '11:00', duration: 45, title: 'GV Interview Crystal', theme: 'mastery' },
      { time: '12:00', duration: 30, title: 'Nick G Coffee Chat', theme: 'love' },
      { time: '12:30', duration: 30, title: 'Call to schedule surgery', theme: 'health', isKaizen: true },
      { time: '13:00', duration: 30, title: 'Google Team Meeting', theme: 'mastery' },
      { time: '13:30', duration: 90, title: 'Land Chat Benchmark', theme: 'mastery', isKaizen: true },
      { time: '15:00', duration: 30, title: 'PMAI Sponsor', theme: 'mastery', isKaizen: true },
      { time: '17:30', duration: 60, title: 'Gym @ Chelsea', theme: 'health' },
      { time: '19:00', duration: 60, title: 'commute', theme: 'life' },
      { time: '20:30', duration: 90, title: 'Kaizen Revamp', theme: 'wisdom' },
    ],
    13: [
      { time: '6:00', duration: 90, title: 'GV Prep', theme: 'mastery', isKaizen: true },
      { time: '7:00', duration: 20, title: 'Read AI/tech news', theme: 'mastery' },
      { time: '8:00', duration: 60, title: 'Morning Play & Drop Off', theme: 'love' },
      { time: '9:00', duration: 75, title: 'Chat with Mom and Dad', theme: 'love' },
      { time: '10:00', duration: 45, title: 'GV Interview K.J.', theme: 'mastery' },
      { time: '11:00', duration: 60, title: 'Scale PMAI', theme: 'mastery', isKaizen: true },
      { time: '12:00', duration: 60, title: 'Kaizen Nick/Jeremiah', theme: 'mastery' },
      { time: '13:00', duration: 30, title: 'Google Team Meeting', theme: 'mastery' },
      { time: '14:00', duration: 90, title: 'Land Chat Benchmark', theme: 'mastery', isKaizen: true },
      { time: '15:30', duration: 90, title: 'PMAI Sponsor', theme: 'mastery' },
      { time: '17:00', duration: 60, title: 'commute', theme: 'life' },
      { time: '18:00', duration: 60, title: 'Nick + Alex', theme: 'love' },
      { time: '19:00', duration: 90, title: 'Building Starriver', theme: 'wisdom' },
      { time: '20:30', duration: 60, title: 'Time with Aria', theme: 'love' },
    ],
    14: [
      { time: '5:00', duration: 120, title: 'Protected building block', theme: 'wisdom', isBlock: true },
      { time: '7:00', duration: 20, title: 'Read AI/tech news', theme: 'mastery' },
      { time: '8:00', duration: 60, title: 'Morning Play & Drop Off', theme: 'love' },
      { time: '9:00', duration: 75, title: 'Chat with Mom and Dad', theme: 'love' },
      { time: '10:00', duration: 60, title: 'Landscape Mapping', theme: 'mastery' },
      { time: '11:00', duration: 60, title: 'Optiver Interview', theme: 'mastery' },
      { time: '12:00', duration: 60, title: 'Lunch', theme: 'life' },
      { time: '13:00', duration: 30, title: 'Google Team Meeting', theme: 'mastery' },
      { time: '14:00', duration: 60, title: 'PMAI Tax Reporting', theme: 'life' },
      { time: '15:00', duration: 60, title: 'Google Sync', theme: 'mastery' },
      { time: '16:00', duration: 120, title: 'Protected building block', theme: 'wisdom', isBlock: true },
      { time: '18:00', duration: 60, title: 'Gym @ Chelsea', theme: 'health' },
      { time: '19:00', duration: 60, title: 'commute', theme: 'life' },
      { time: '20:00', duration: 90, title: 'Time w/ Aria', theme: 'love' },
    ],
    15: [
      { time: '7:00', duration: 60, title: 'Read AI/tech + Lab Meeting', theme: 'mastery' },
      { time: '8:00', duration: 60, title: 'Morning Play & Drop Off', theme: 'love' },
      { time: '9:00', duration: 75, title: 'Chat with Mom and Dad', theme: 'love' },
      { time: '10:00', duration: 60, title: 'Daily Email Review', theme: 'life' },
      { time: '11:00', duration: 60, title: 'PMAI Infra', theme: 'mastery' },
      { time: '12:00', duration: 60, title: 'Dev Agents', theme: 'mastery' },
      { time: '13:00', duration: 60, title: 'Google Team Meeting', theme: 'mastery' },
      { time: '14:00', duration: 90, title: 'Land Chat Benchmark', theme: 'mastery', isKaizen: true },
      { time: '16:00', duration: 60, title: 'on my way', theme: 'life' },
      { time: '17:00', duration: 120, title: 'Protected building block', theme: 'wisdom', isBlock: true },
      { time: '19:00', duration: 60, title: 'PMAI Ops', theme: 'mastery' },
      { time: '20:00', duration: 60, title: 'Aria', theme: 'love' },
    ],
    16: [
      { time: '7:00', duration: 20, title: 'Read AI/tech news', theme: 'mastery' },
      { time: '8:00', duration: 60, title: 'Morning Play & Drop Off', theme: 'love' },
      { time: '9:00', duration: 75, title: 'Chat with Mom and Dad', theme: 'love' },
      { time: '10:00', duration: 120, title: 'AI Salon NYC', theme: 'mastery' },
      { time: '12:00', duration: 75, title: 'Nick Gu and Robert', theme: 'love' },
      { time: '14:00', duration: 60, title: 'Lunch with Xiaoqing', theme: 'love' },
      { time: '15:00', duration: 120, title: 'Scale PMAI', theme: 'mastery', isKaizen: true },
      { time: '17:00', duration: 60, title: 'Commute', theme: 'life' },
      { time: '18:00', duration: 60, title: 'Gym @ Chelsea', theme: 'health' },
      { time: '19:00', duration: 60, title: 'Chiro', theme: 'health' },
      { time: '20:00', duration: 60, title: 'Aria', theme: 'love' },
      { time: '21:00', duration: 120, title: 'Protected building block', theme: 'wisdom', isBlock: true },
    ],
    17: [
      { time: '8:00', duration: 60, title: 'Teach family AI', theme: 'love' },
      { time: '9:00', duration: 60, title: 'Aria Play', theme: 'love' },
      { time: '10:00', duration: 60, title: 'Run quarterly asset', theme: 'life' },
      { time: '11:00', duration: 60, title: 'Aria Play', theme: 'love' },
      { time: '13:00', duration: 120, title: 'Private School Shortlist', theme: 'life', isKaizen: true },
      { time: '16:00', duration: 120, title: 'Aria Play', theme: 'love' },
      { time: '20:00', duration: 60, title: 'daily journal', theme: 'wisdom' },
    ],
    18: [
      { time: '8:00', duration: 60, title: 'Teach family AI', theme: 'love' },
      { time: '9:00', duration: 60, title: 'Chat with...', theme: 'love' },
      { time: '10:00', duration: 60, title: 'Aria Play', theme: 'love' },
      { time: '13:00', duration: 60, title: 'school', theme: 'life' },
      { time: '16:00', duration: 120, title: 'Aria Play', theme: 'love' },
      { time: '20:00', duration: 60, title: 'daily journal', theme: 'wisdom' },
      { time: '21:00', duration: 90, title: 'PMAI Core Team', theme: 'mastery' },
    ],
  };

  // ==================== HELPERS ====================

  const getThemeColor = (themeId) => themes.find(t => t.id === themeId)?.color || '#78716C';
  const getTheme = (themeId) => themes.find(t => t.id === themeId);
  const hours = Array.from({ length: 18 }, (_, i) => i + 5); // 5am to 10pm

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
      background: 'rgba(245, 241, 235, 0.95)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(139, 148, 103, 0.1)',
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
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="1.5">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 11, letterSpacing: '0.1em', color: '#8B9467', fontWeight: 600 }}>KAIZEN OS</div>
        <div style={{ fontSize: 15, fontWeight: 500, color: '#1A1A1A', marginTop: 2 }}>
          {activeView === 'day' 
            ? `${days.find(d => d.date === selectedDay)?.dayFull}, Jan ${selectedDay}`
            : 'Jan 12 – 18, 2026'}
        </div>
      </div>

      <button style={{ background: 'transparent', border: 'none', padding: 8, cursor: 'pointer' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="1.5">
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
          background: 'rgba(0, 0, 0, 0.4)',
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
        background: '#F5F1EB',
        zIndex: 300,
        transform: showSidebar ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s ease',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 20px',
          borderBottom: '1px solid rgba(139, 148, 103, 0.15)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 600, color: '#1A1A1A', margin: 0 }}>Kaizen OS</h1>
            <span style={{ fontSize: 12, color: '#8B9467', fontWeight: 500 }}>Continuous improvement</span>
          </div>
          <button
            onClick={() => setShowSidebar(false)}
            style={{ background: 'transparent', border: 'none', padding: 8, cursor: 'pointer' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Season Card */}
        <div style={{
          margin: 16,
          padding: 20,
          background: 'white',
          borderRadius: 16,
          border: '1px solid rgba(139, 148, 103, 0.15)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#8B9467', letterSpacing: '0.05em' }}>S1 2026</span>
            <span style={{ fontSize: 12, color: '#666' }}>Week 3/12</span>
          </div>
          
          <div style={{ display: 'flex', gap: 20 }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 600, color: '#1A1A1A' }}>1080h</div>
              <div style={{ fontSize: 11, color: '#999' }}>capacity</div>
            </div>
            <div style={{ borderLeft: '1px solid rgba(139, 148, 103, 0.15)', paddingLeft: 20 }}>
              <div style={{ fontSize: 24, fontWeight: 600, color: '#1A1A1A' }}>26</div>
              <div style={{ fontSize: 11, color: '#999' }}>actions</div>
            </div>
          </div>

          <div style={{ marginTop: 16, height: 4, background: 'rgba(139, 148, 103, 0.15)', borderRadius: 2 }}>
            <div style={{ width: '18%', height: '100%', background: '#8B9467', borderRadius: 2 }} />
          </div>
        </div>

        {/* Vetoes */}
        <div style={{ flex: 1, overflow: 'auto', padding: '0 16px 16px' }}>
          <h2 style={{ fontSize: 11, fontWeight: 600, color: '#8B9467', letterSpacing: '0.05em', marginBottom: 12 }}>
            SEASON VETOES
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {vetoes.map((veto) => (
              <div key={veto.id} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '10px 12px',
                background: veto.count > 0 ? 'rgba(220, 38, 38, 0.06)' : 'white',
                borderRadius: 10,
                border: `1px solid ${veto.count > 0 ? 'rgba(220, 38, 38, 0.15)' : 'rgba(139, 148, 103, 0.1)'}`,
              }}>
                <div style={{
                  minWidth: 20,
                  height: 20,
                  borderRadius: 10,
                  background: veto.count > 0 ? 'rgba(220, 38, 38, 0.15)' : 'rgba(139, 148, 103, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 600,
                  color: veto.count > 0 ? '#DC2626' : '#999',
                }}>{veto.count}</div>
                <span style={{ fontSize: 13, lineHeight: 1.4, color: veto.count > 0 ? '#1A1A1A' : '#666' }}>
                  {veto.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Themes */}
        <div style={{
          padding: '16px',
          borderTop: '1px solid rgba(139, 148, 103, 0.15)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
        }}>
          {themes.map((theme) => (
            <div key={theme.id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 10px',
              background: 'white',
              borderRadius: 8,
              border: '1px solid rgba(139, 148, 103, 0.1)',
            }}>
              <div style={{ width: 8, height: 8, borderRadius: 4, background: theme.color }} />
              <span style={{ fontSize: 12, color: '#666' }}>{theme.name}</span>
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
      background: 'rgba(245, 241, 235, 0.95)',
      backdropFilter: 'blur(12px)',
      borderTop: '1px solid rgba(139, 148, 103, 0.1)',
      padding: '8px 0 max(8px, env(safe-area-inset-bottom))',
      display: 'flex',
      justifyContent: 'space-around',
      zIndex: 100,
    }}>
      {[
        { id: 'day', icon: '📅', label: 'Day' },
        { id: 'week', icon: '📆', label: 'Week' },
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
          <span style={{ fontSize: 20 }}>{nav.icon}</span>
          <span style={{
            fontSize: 11,
            fontWeight: activeView === nav.id ? 600 : 400,
            color: activeView === nav.id ? '#8B9467' : '#999',
          }}>{nav.label}</span>
        </button>
      ))}
    </nav>
  );

  const MobileDayView = () => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingBottom: 80 }}>
      {/* Day Selector */}
      <div style={{
        display: 'flex',
        gap: 8,
        padding: '12px 16px',
        overflow: 'auto',
        borderBottom: '1px solid rgba(139, 148, 103, 0.1)',
      }}>
        {days.map((day) => (
          <button
            key={day.date}
            onClick={() => setSelectedDay(day.date)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '10px 14px',
              background: selectedDay === day.date ? '#8B9467' : 'white',
              border: `1px solid ${selectedDay === day.date ? '#8B9467' : 'rgba(139, 148, 103, 0.15)'}`,
              borderRadius: 12,
              cursor: 'pointer',
              minWidth: 52,
            }}
          >
            <span style={{
              fontSize: 10,
              fontWeight: 500,
              color: selectedDay === day.date ? 'rgba(255,255,255,0.7)' : '#999',
            }}>{day.day}</span>
            <span style={{
              fontSize: 18,
              fontWeight: 600,
              color: selectedDay === day.date ? 'white' : '#1A1A1A',
              marginTop: 2,
            }}>{day.date}</span>
            {day.isToday && (
              <div style={{
                width: 4,
                height: 4,
                borderRadius: 2,
                background: selectedDay === day.date ? 'white' : '#8B9467',
                marginTop: 4,
              }} />
            )}
          </button>
        ))}
      </div>

      {/* Tab Switcher */}
      <div style={{
        display: 'flex',
        padding: '12px 16px',
        gap: 8,
        borderBottom: '1px solid rgba(139, 148, 103, 0.1)',
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
              background: mobileTab === tab.id ? 'rgba(139, 148, 103, 0.1)' : 'transparent',
              border: `1px solid ${mobileTab === tab.id ? 'rgba(139, 148, 103, 0.2)' : 'transparent'}`,
              borderRadius: 10,
              fontSize: 13,
              fontWeight: mobileTab === tab.id ? 600 : 400,
              color: mobileTab === tab.id ? '#1A1A1A' : '#999',
              cursor: 'pointer',
            }}
          >
            {tab.label} <span style={{ opacity: 0.6 }}>({tab.count})</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {mobileTab === 'arena' && (
          <div style={{ padding: '8px 0' }}>
            {todayBlocks.map((block, index) => (
              <div key={index} style={{
                display: 'flex',
                padding: '14px 16px',
                gap: 12,
                borderBottom: '1px solid rgba(139, 148, 103, 0.06)',
              }}>
                <div style={{ minWidth: 44, textAlign: 'right' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A' }}>{block.time}</div>
                  <div style={{ fontSize: 11, color: '#999' }}>{block.endTime}</div>
                </div>
                <div style={{ flex: 1, borderLeft: `3px solid ${getThemeColor(block.theme)}`, paddingLeft: 12 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#1A1A1A', lineHeight: 1.4 }}>
                    {block.isKaizen && <span style={{ color: getThemeColor(block.theme) }}>● </span>}
                    {block.title}
                  </div>
                  <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{block.description}</div>
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
            color: '#999',
          }}>
            <span style={{ fontSize: 48 }}>🎯</span>
            <p style={{ marginTop: 16, fontSize: 14, textAlign: 'center' }}>
              No focus items set for today
            </p>
            <button style={{
              marginTop: 16,
              padding: '10px 20px',
              background: '#8B9467',
              color: 'white',
              border: 'none',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
            }}>Set Focus</button>
          </div>
        )}

        {mobileTab === 'playlist' && (
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {['all', 'active', 'done'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setPlaylistFilter(filter)}
                  style={{
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 500,
                    background: playlistFilter === filter ? '#8B9467' : 'transparent',
                    color: playlistFilter === filter ? 'white' : '#666',
                    border: `1px solid ${playlistFilter === filter ? '#8B9467' : 'rgba(139, 148, 103, 0.15)'}`,
                    borderRadius: 8,
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
                  gap: 12,
                  padding: '14px 16px',
                  background: 'white',
                  borderRadius: 12,
                  border: '1px solid rgba(139, 148, 103, 0.1)',
                }}>
                  <div style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    border: item.done ? 'none' : '2px solid rgba(139, 148, 103, 0.3)',
                    background: item.done ? '#8B9467' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: 12,
                  }}>{item.done && '✓'}</div>
                  <span style={{
                    fontSize: 14,
                    color: item.done ? '#999' : '#1A1A1A',
                    textDecoration: item.done ? 'line-through' : 'none',
                  }}>{item.title}</span>
                </div>
              ))}
            </div>

            <button style={{
              marginTop: 16,
              padding: 14,
              width: '100%',
              background: 'transparent',
              border: '2px dashed rgba(139, 148, 103, 0.2)',
              borderRadius: 12,
              color: '#8B9467',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
            }}>+ Add task</button>
          </div>
        )}
      </div>
    </div>
  );

  const MobileWeekView = () => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingBottom: 80 }}>
      {/* Week Header */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(139, 148, 103, 0.1)' }}>
        <div style={{ width: 44 }} />
        {days.map((day) => (
          <div
            key={day.date}
            onClick={() => { setSelectedDay(day.date); setActiveView('day'); }}
            style={{
              flex: 1,
              padding: '12px 4px',
              textAlign: 'center',
              background: day.isToday ? 'rgba(139, 148, 103, 0.08)' : 'transparent',
              cursor: 'pointer',
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 500, color: '#999' }}>{day.day}</div>
            <div style={{
              fontSize: 16,
              fontWeight: day.isToday ? 600 : 400,
              color: day.isToday ? '#8B9467' : '#1A1A1A',
              marginTop: 2,
            }}>{day.date}</div>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        <div style={{ display: 'flex' }}>
          <div style={{ width: 44, flexShrink: 0 }}>
            {hours.map((hour) => (
              <div key={hour} style={{
                height: 48,
                paddingRight: 8,
                textAlign: 'right',
                fontSize: 10,
                color: '#999',
                transform: 'translateY(-6px)',
              }}>
                {hour === 12 ? '12p' : hour > 12 ? `${hour - 12}` : hour}
              </div>
            ))}
          </div>

          {days.map((day) => (
            <div key={day.date} style={{
              flex: 1,
              position: 'relative',
              borderLeft: '1px solid rgba(139, 148, 103, 0.08)',
            }}>
              {hours.map((hour) => (
                <div key={hour} style={{
                  height: 48,
                  borderBottom: '1px solid rgba(139, 148, 103, 0.06)',
                }} />
              ))}

              {weekEvents[day.date]?.map((event, eventIndex) => {
                const [eventHour, eventMin] = event.time.split(':').map(Number);
                const top = (eventHour - 5) * 48 + (eventMin / 60) * 48;
                const height = Math.max((event.duration / 60) * 48 - 2, 18);
                const themeColor = getThemeColor(event.theme);
                
                return (
                  <div
                    key={eventIndex}
                    onClick={() => { setSelectedDay(day.date); setActiveView('day'); }}
                    style={{
                      position: 'absolute',
                      top,
                      left: 2,
                      right: 2,
                      height,
                      background: event.isBlock 
                        ? `repeating-linear-gradient(45deg, ${themeColor}15, ${themeColor}15 3px, transparent 3px, transparent 6px)`
                        : `${themeColor}20`,
                      borderLeft: `2px solid ${themeColor}`,
                      borderRadius: 4,
                      padding: '2px 4px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{
                      fontSize: 9,
                      fontWeight: 500,
                      color: '#1A1A1A',
                      lineHeight: 1.2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>{event.title}</div>
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
      borderRight: '1px solid rgba(139, 148, 103, 0.12)',
      padding: '28px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 24,
      background: 'linear-gradient(180deg, #F5F1EB 0%, #EDE9E3 100%)',
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ marginBottom: 4 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: '#1A1A1A', margin: 0, letterSpacing: '-0.02em' }}>
          Kaizen OS
        </h1>
        <span style={{ fontSize: 12, color: '#8B9467', fontWeight: 500 }}>Continuous improvement</span>
      </div>

      {/* Season Card */}
      <div style={{
        background: 'white',
        borderRadius: 16,
        padding: 20,
        border: '1px solid rgba(139, 148, 103, 0.12)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#8B9467', letterSpacing: '0.05em' }}>SEASON ONE</span>
          <span style={{ fontSize: 13, color: '#666' }}>2026</span>
        </div>
        
        <div style={{ display: 'flex', gap: 20 }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 600, color: '#1A1A1A', lineHeight: 1 }}>1080</div>
            <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>hours</div>
          </div>
          <div style={{ borderLeft: '1px solid rgba(139, 148, 103, 0.15)', paddingLeft: 20 }}>
            <div style={{ fontSize: 26, fontWeight: 600, color: '#1A1A1A', lineHeight: 1 }}>5</div>
            <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>themes</div>
          </div>
          <div style={{ borderLeft: '1px solid rgba(139, 148, 103, 0.15)', paddingLeft: 20 }}>
            <div style={{ fontSize: 26, fontWeight: 600, color: '#1A1A1A', lineHeight: 1 }}>26</div>
            <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>actions</div>
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: '#666' }}>Week 3 of 12</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#8B9467' }}>18%</span>
          </div>
          <div style={{ height: 4, background: 'rgba(139, 148, 103, 0.15)', borderRadius: 2 }}>
            <div style={{ width: '18%', height: '100%', background: '#8B9467', borderRadius: 2 }} />
          </div>
        </div>
      </div>

      {/* Vetoes */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <h2 style={{ fontSize: 11, fontWeight: 600, color: '#8B9467', letterSpacing: '0.05em', marginBottom: 12 }}>
          SEASON VETOES
        </h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {vetoes.map((veto) => (
            <div key={veto.id} style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '10px 12px',
              background: veto.count > 0 ? 'rgba(220, 38, 38, 0.06)' : 'white',
              borderRadius: 10,
              border: `1px solid ${veto.count > 0 ? 'rgba(220, 38, 38, 0.15)' : 'rgba(139, 148, 103, 0.1)'}`,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}>
              <div style={{
                minWidth: 20,
                height: 20,
                borderRadius: 10,
                background: veto.count > 0 ? 'rgba(220, 38, 38, 0.15)' : 'rgba(139, 148, 103, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 600,
                color: veto.count > 0 ? '#DC2626' : '#999',
              }}>{veto.count}</div>
              <span style={{ fontSize: 13, lineHeight: 1.4, color: veto.count > 0 ? '#1A1A1A' : '#666' }}>
                {veto.text}
              </span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );

  const DesktopHeader = () => (
    <>
      {/* Main Header with Theme Filters + Actions */}
      <header style={{
        padding: '16px 24px',
        borderBottom: '1px solid rgba(139, 148, 103, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#F5F1EB',
        flexShrink: 0,
      }}>
        {/* Theme Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {themes.map((theme) => (
            <button
              key={theme.id}
              onClick={() => setActiveTheme(activeTheme === theme.id ? null : theme.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                background: activeTheme === theme.id ? 'white' : 'transparent',
                border: `1px solid ${activeTheme === theme.id ? 'rgba(139, 148, 103, 0.2)' : 'transparent'}`,
                borderRadius: 10,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                background: theme.color,
                opacity: activeTheme && activeTheme !== theme.id ? 0.3 : 1,
              }} />
              <span style={{
                fontSize: 13,
                fontWeight: 500,
                color: activeTheme && activeTheme !== theme.id ? '#CCC' : '#1A1A1A',
              }}>{theme.name}</span>
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setActiveMode('tag')}
            style={{
              padding: '10px 16px',
              background: '#EA580C',
              color: 'white',
              border: 'none',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >🏷️ Tag</button>
          <button style={{
            padding: '10px 16px',
            background: 'transparent',
            color: '#666',
            border: '1px solid rgba(139, 148, 103, 0.2)',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
          }}>🔄 Sync</button>
          <button
            onClick={() => setActiveMode('review')}
            style={{
              padding: '10px 16px',
              background: 'transparent',
              color: '#666',
              border: '1px solid rgba(139, 148, 103, 0.2)',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >📊 Review</button>
          <button
            onClick={() => setActiveMode('plan')}
            style={{
              padding: '10px 16px',
              background: '#1A1A1A',
              color: 'white',
              border: 'none',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >📋 Plan</button>
        </div>
      </header>

      {/* Date Navigation Row */}
      <div style={{
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        background: '#F5F1EB',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button style={{
            background: 'transparent',
            border: 'none',
            fontSize: 18,
            color: '#999',
            cursor: 'pointer',
            padding: 8,
          }}>←</button>
          <h2 style={{ fontSize: 18, fontWeight: 500, color: '#1A1A1A', margin: 0 }}>
            {activeView === 'day' 
              ? `${days.find(d => d.date === selectedDay)?.dayFull}, January ${selectedDay}, 2026`
              : 'January 12 – 18, 2026'}
          </h2>
          <button style={{
            background: 'transparent',
            border: 'none',
            fontSize: 18,
            color: '#999',
            cursor: 'pointer',
            padding: 8,
          }}>→</button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {['Day', 'Week'].map((view) => (
            <button
              key={view}
              onClick={() => setActiveView(view.toLowerCase())}
              style={{
                padding: '8px 14px',
                background: activeView === view.toLowerCase() ? 'white' : 'transparent',
                border: `1px solid ${activeView === view.toLowerCase() ? 'rgba(139, 148, 103, 0.2)' : 'transparent'}`,
                borderRadius: 8,
                fontSize: 13,
                fontWeight: activeView === view.toLowerCase() ? 600 : 400,
                color: activeView === view.toLowerCase() ? '#1A1A1A' : '#999',
                cursor: 'pointer',
              }}
            >{view}</button>
          ))}
          <button style={{
            marginLeft: 12,
            padding: '8px 14px',
            background: 'transparent',
            border: '1px solid rgba(139, 148, 103, 0.2)',
            borderRadius: 8,
            fontSize: 13,
            color: '#666',
            cursor: 'pointer',
          }}>Today</button>
        </div>
      </div>
    </>
  );

  const DesktopDayView = () => (
    <div style={{ flex: 1, display: 'flex', gap: 0, overflow: 'hidden' }}>
      {/* Left Panel - Today's Arena */}
      <div style={{
        width: 340,
        borderRight: '1px solid rgba(139, 148, 103, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        background: 'white',
      }}>
        <div style={{
          padding: '20px',
          borderBottom: '1px solid rgba(139, 148, 103, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h2 style={{ fontSize: 11, fontWeight: 600, color: '#8B9467', letterSpacing: '0.05em', margin: 0 }}>
            TODAY'S ARENA
          </h2>
          <span style={{
            fontSize: 12,
            color: '#666',
            background: 'rgba(139, 148, 103, 0.1)',
            padding: '4px 10px',
            borderRadius: 8,
          }}>{todayBlocks.length} blocks</span>
        </div>

        <div style={{ flex: 1, overflow: 'auto' }}>
          {todayBlocks.map((block, index) => (
            <div key={index} style={{
              display: 'flex',
              padding: '14px 20px',
              gap: 14,
              borderBottom: '1px solid rgba(139, 148, 103, 0.06)',
              cursor: 'pointer',
              transition: 'background 0.15s ease',
            }}>
              <div style={{ minWidth: 48, textAlign: 'right' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A' }}>{block.time}</div>
                <div style={{ fontSize: 11, color: '#999' }}>{block.endTime}</div>
              </div>
              <div style={{
                flex: 1,
                borderLeft: `3px solid ${getThemeColor(block.theme)}`,
                paddingLeft: 12,
              }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#1A1A1A', lineHeight: 1.4, marginBottom: 2 }}>
                  {block.isKaizen && <span style={{ color: getThemeColor(block.theme) }}>● </span>}
                  {block.title}
                </div>
                <div style={{ fontSize: 12, color: '#666', lineHeight: 1.4 }}>{block.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel - Deliverables + Playlist */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'white', overflow: 'hidden' }}>
        {/* Top 3 Deliverables */}
        <div style={{ padding: 24, borderBottom: '1px solid rgba(139, 148, 103, 0.08)', minHeight: 160 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 11, fontWeight: 600, color: '#8B9467', letterSpacing: '0.05em', margin: 0 }}>
              TOP 3 DELIVERABLES
            </h2>
            <span style={{ fontSize: 12, color: '#999' }}>0/0 done</span>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 80,
            color: '#999',
            fontSize: 14,
          }}>
            <span style={{ marginRight: 8 }}>🎯</span>
            No focus items set for today
          </div>
        </div>

        {/* Today's Playlist */}
        <div style={{ flex: 1, padding: 24, overflow: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 11, fontWeight: 600, color: '#8B9467', letterSpacing: '0.05em', margin: 0 }}>
              TODAY'S PLAYLIST
            </h2>
            <span style={{ fontSize: 12, color: '#999' }}>{playlistItems.length} tasks</span>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {['all', 'active', 'done'].map((filter) => (
              <button
                key={filter}
                onClick={() => setPlaylistFilter(filter)}
                style={{
                  padding: '8px 12px',
                  fontSize: 12,
                  fontWeight: 500,
                  background: playlistFilter === filter ? '#8B9467' : 'transparent',
                  color: playlistFilter === filter ? 'white' : '#666',
                  border: `1px solid ${playlistFilter === filter ? '#8B9467' : 'rgba(139, 148, 103, 0.15)'}`,
                  borderRadius: 8,
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
                gap: 12,
                padding: '12px 14px',
                background: 'rgba(139, 148, 103, 0.04)',
                borderRadius: 10,
                border: '1px solid rgba(139, 148, 103, 0.08)',
                cursor: 'pointer',
              }}>
                <div style={{
                  width: 20,
                  height: 20,
                  borderRadius: 5,
                  border: item.done ? 'none' : '2px solid rgba(139, 148, 103, 0.3)',
                  background: item.done ? '#8B9467' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: 11,
                }}>{item.done && '✓'}</div>
                <span style={{
                  fontSize: 14,
                  color: item.done ? '#999' : '#1A1A1A',
                  textDecoration: item.done ? 'line-through' : 'none',
                }}>{item.title}</span>
              </div>
            ))}
          </div>

          <button style={{
            marginTop: 16,
            padding: 12,
            width: '100%',
            background: 'transparent',
            border: '2px dashed rgba(139, 148, 103, 0.2)',
            borderRadius: 10,
            color: '#8B9467',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
          }}>+ Add task</button>
        </div>
      </div>
    </div>
  );

  const DesktopWeekView = () => (
    <div style={{
      flex: 1,
      display: 'flex',
      overflow: 'hidden',
      margin: '0 24px 24px',
      background: 'white',
      borderRadius: 16,
      border: '1px solid rgba(139, 148, 103, 0.12)',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
    }}>
      {/* Time Column */}
      <div style={{ width: 56, borderRight: '1px solid rgba(139, 148, 103, 0.08)', paddingTop: 52 }}>
        {hours.map((hour) => (
          <div key={hour} style={{
            height: 48,
            paddingRight: 10,
            textAlign: 'right',
            fontSize: 11,
            color: '#999',
            transform: 'translateY(-6px)',
          }}>
            {hour === 12 ? '12 pm' : hour > 12 ? `${hour - 12} pm` : `${hour} am`}
          </div>
        ))}
      </div>

      {/* Day Columns */}
      <div style={{ flex: 1, display: 'flex', overflow: 'auto' }}>
        {days.map((day, dayIndex) => (
          <div key={day.date} style={{
            flex: 1,
            minWidth: 100,
            borderRight: dayIndex < days.length - 1 ? '1px solid rgba(139, 148, 103, 0.08)' : 'none',
            position: 'relative',
          }}>
            {/* Day Header */}
            <div style={{
              height: 52,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              borderBottom: '1px solid rgba(139, 148, 103, 0.08)',
              background: day.isToday ? 'rgba(139, 148, 103, 0.08)' : 'transparent',
            }}>
              <span style={{ fontSize: 11, fontWeight: 500, color: '#999' }}>{day.day}</span>
              <span style={{
                fontSize: 18,
                fontWeight: day.isToday ? 600 : 400,
                color: day.isToday ? '#8B9467' : '#1A1A1A',
                marginTop: 2,
              }}>{day.date}</span>
            </div>

            {/* Hour Grid */}
            <div style={{ position: 'relative' }}>
              {hours.map((hour) => (
                <div key={hour} style={{
                  height: 48,
                  borderBottom: '1px solid rgba(139, 148, 103, 0.04)',
                }} />
              ))}

              {/* Events */}
              {weekEvents[day.date]?.map((event, eventIndex) => {
                const [eventHour, eventMin] = event.time.split(':').map(Number);
                const top = (eventHour - 5) * 48 + (eventMin / 60) * 48;
                const height = Math.max((event.duration / 60) * 48 - 2, 20);
                const themeColor = getThemeColor(event.theme);
                
                return (
                  <div
                    key={eventIndex}
                    style={{
                      position: 'absolute',
                      top,
                      left: 3,
                      right: 3,
                      height,
                      background: event.isBlock 
                        ? `repeating-linear-gradient(45deg, ${themeColor}12, ${themeColor}12 4px, transparent 4px, transparent 8px)`
                        : `${themeColor}18`,
                      borderLeft: `3px solid ${themeColor}`,
                      borderRadius: 6,
                      padding: '3px 6px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      transition: 'transform 0.1s ease, box-shadow 0.1s ease',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'scale(1.02)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)';
                      e.currentTarget.style.zIndex = '10';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.zIndex = '1';
                    }}
                  >
                    <div style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: '#1A1A1A',
                      lineHeight: 1.3,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: height < 36 ? 'nowrap' : 'normal',
                    }}>
                      {event.isKaizen && <span style={{ color: themeColor }}>● </span>}
                      {event.title}
                    </div>
                    {height >= 36 && (
                      <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>
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

  // ==================== MODE MODALS ====================

  const TagModeModal = () => {
    if (activeMode !== 'tag') return null;

    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
      }}>
        {/* Left Panel */}
        <div style={{
          width: 280,
          background: 'white',
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1A1A1A', margin: 0 }}>🏷️ Tag Mode</h2>
            <button
              onClick={() => setActiveMode(null)}
              style={{
                padding: '6px 12px',
                background: 'rgba(220, 38, 38, 0.1)',
                color: '#DC2626',
                border: 'none',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >Exit</button>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#8B9467', letterSpacing: '0.05em' }}>TAG TYPE</label>
            <select 
              value={tagType}
              onChange={(e) => setTagType(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid rgba(139, 148, 103, 0.2)',
                borderRadius: 10,
                fontSize: 14,
                marginTop: 8,
                background: 'white',
                outline: 'none',
              }}
            >
              <option value="intention">Intention</option>
              <option value="theme">Theme</option>
              <option value="action">Action</option>
            </select>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#8B9467', letterSpacing: '0.05em' }}>SELECT VALUE</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              {tagType === 'intention' && intentions.map(intent => (
                <button
                  key={intent.value}
                  onClick={() => setTagValue(intent.value)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '12px 14px',
                    background: tagValue === intent.value ? `${intent.color}15` : '#FAFAF9',
                    border: `2px solid ${tagValue === intent.value ? intent.color : 'rgba(139, 148, 103, 0.15)'}`,
                    borderRadius: 10,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ width: 12, height: 12, borderRadius: 6, background: intent.color }} />
                  <span style={{ fontSize: 14, color: '#1A1A1A' }}>{intent.label}</span>
                </button>
              ))}

              {tagType === 'theme' && themes.map(theme => (
                <button
                  key={theme.id}
                  onClick={() => setTagValue(theme.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 14px',
                    background: tagValue === theme.id ? `${theme.color}15` : '#FAFAF9',
                    border: `2px solid ${tagValue === theme.id ? theme.color : 'rgba(139, 148, 103, 0.15)'}`,
                    borderRadius: 10,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: theme.color }} />
                  <span style={{ fontSize: 13, color: '#1A1A1A' }}>{theme.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div style={{
            padding: 16,
            background: 'rgba(139, 148, 103, 0.08)',
            borderRadius: 10,
            fontSize: 13,
            color: '#666',
            lineHeight: 1.5,
          }}>
            Select a tag value above, then click on events in the calendar to tag them.
          </div>

          <div style={{
            marginTop: 'auto',
            padding: 16,
            background: '#FAFAF9',
            borderRadius: 10,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 36, fontWeight: 600, color: '#1A1A1A' }}>0</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#8B9467', letterSpacing: '0.05em' }}>EVENTS TAGGED THIS SESSION</div>
          </div>
        </div>

        {/* Calendar Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#F5F1EB' }}>
          {/* Theme Pills */}
          <div style={{
            padding: '12px 24px',
            background: 'white',
            borderBottom: '1px solid rgba(139, 148, 103, 0.1)',
            display: 'flex',
            gap: 8,
            alignItems: 'center',
          }}>
            {themes.map(theme => (
              <div key={theme.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                background: '#FAFAF9',
                borderRadius: 8,
                border: '1px solid rgba(139, 148, 103, 0.1)',
              }}>
                <div style={{ width: 8, height: 8, borderRadius: 4, background: theme.color }} />
                <span style={{ fontSize: 12, color: '#666' }}>{theme.name}</span>
              </div>
            ))}
            <button style={{
              marginLeft: 'auto',
              padding: '6px 12px',
              background: 'transparent',
              border: '1px solid rgba(139, 148, 103, 0.2)',
              borderRadius: 8,
              fontSize: 12,
              color: '#666',
              cursor: 'pointer',
            }}>Manage →</button>
          </div>

          <div style={{ flex: 1, padding: 24, overflow: 'auto' }}>
            <div style={{
              background: 'white',
              borderRadius: 16,
              padding: 24,
              textAlign: 'center',
              color: '#999',
              border: '1px solid rgba(139, 148, 103, 0.1)',
            }}>
              [Interactive calendar with clickable events would render here]
              <br /><br />
              Click events to apply the selected tag
            </div>
          </div>
        </div>
      </div>
    );
  };

  const PlanModeModal = () => {
    if (activeMode !== 'plan') return null;

    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
      }}>
        {/* Left Panel */}
        <div style={{
          width: 280,
          background: 'white',
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1A1A1A', margin: 0 }}>📋 Plan Mode</h2>
            <button
              onClick={() => setActiveMode(null)}
              style={{
                padding: '6px 12px',
                background: 'rgba(220, 38, 38, 0.1)',
                color: '#DC2626',
                border: 'none',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >Exit</button>
          </div>

          {/* Commitment Status */}
          <div style={{
            padding: 16,
            background: 'rgba(5, 150, 105, 0.1)',
            borderRadius: 12,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#059669', marginBottom: 4 }}>Already Committed</div>
            <div style={{ fontSize: 12, color: '#059669' }}>4h 19m until next planning</div>
          </div>

          {/* Progress */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: '#666' }}>Planned:</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>89.7h</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: '#666' }}>Utility:</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>90h</span>
            </div>
            <div style={{ height: 8, background: 'rgba(139, 148, 103, 0.15)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: '100%', height: '100%', background: '#059669' }} />
            </div>
            <div style={{ textAlign: 'right', marginTop: 6 }}>
              <span style={{
                fontSize: 11,
                fontWeight: 600,
                padding: '2px 8px',
                background: 'rgba(5, 150, 105, 0.1)',
                color: '#059669',
                borderRadius: 10,
              }}>100%</span>
            </div>
          </div>

          {/* Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button style={{
              padding: '8px 14px',
              background: '#FAFAF9',
              border: '1px solid rgba(139, 148, 103, 0.15)',
              borderRadius: 8,
              fontSize: 12,
              color: '#666',
              cursor: 'pointer',
            }}>← Prev</button>
            <button style={{
              padding: '8px 14px',
              background: '#FAFAF9',
              border: '1px solid rgba(139, 148, 103, 0.15)',
              borderRadius: 8,
              fontSize: 12,
              color: '#666',
              cursor: 'pointer',
            }}>Next →</button>
          </div>

          {/* Current Action */}
          <div style={{
            padding: 16,
            background: '#FAFAF9',
            borderRadius: 12,
            borderLeft: '4px solid #2563EB',
          }}>
            <div style={{
              display: 'inline-block',
              padding: '2px 8px',
              background: '#2563EB',
              color: 'white',
              fontSize: 10,
              fontWeight: 600,
              borderRadius: 6,
              marginBottom: 8,
            }}>GATE</div>
            <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>Mastery and Impact</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#1A1A1A', lineHeight: 1.4 }}>
              Build founder-focused relationship system for systematic ecosystem engagement
            </div>
          </div>

          {/* Time Blocks */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 14 }}>📆</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>Time Blocks (0)</span>
            </div>
            <div style={{
              padding: 16,
              background: '#FAFAF9',
              borderRadius: 10,
              textAlign: 'center',
              fontSize: 13,
              color: '#999',
            }}>
              Click on calendar to add time blocks
            </div>
          </div>

          {/* Tasks */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 14 }}>✅</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>Tasks</span>
            </div>
            <button style={{
              width: '100%',
              padding: 12,
              background: 'transparent',
              border: '2px dashed rgba(139, 148, 103, 0.2)',
              borderRadius: 10,
              color: '#8B9467',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}>+ Task</button>
          </div>
        </div>

        {/* Calendar */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#F5F1EB' }}>
          <div style={{
            padding: '12px 24px',
            background: 'white',
            borderBottom: '1px solid rgba(139, 148, 103, 0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div style={{ display: 'flex', gap: 12 }}>
              {['Unassigned', 'Auto', 'Planned', 'Current'].map((label, i) => (
                <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#666' }}>
                  <span style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    background: ['#9CA3AF', '#3B82F6', '#7C3AED', '#059669'][i],
                  }} />
                  {label}
                </span>
              ))}
            </div>
            <span style={{ fontSize: 14, fontWeight: 500, color: '#1A1A1A' }}>Jan 12 - Jan 18, 2026</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{
                padding: '6px 12px',
                background: 'transparent',
                border: '1px solid rgba(139, 148, 103, 0.2)',
                borderRadius: 8,
                fontSize: 12,
                color: '#666',
                cursor: 'pointer',
              }}>📷 View</button>
              <button style={{
                padding: '6px 12px',
                background: 'transparent',
                border: '1px solid rgba(139, 148, 103, 0.2)',
                borderRadius: 8,
                fontSize: 12,
                color: '#666',
                cursor: 'pointer',
              }}>Today</button>
            </div>
          </div>

          <div style={{ flex: 1, padding: 24, overflow: 'auto' }}>
            <div style={{
              background: 'white',
              borderRadius: 16,
              padding: 24,
              textAlign: 'center',
              color: '#999',
              border: '1px solid rgba(139, 148, 103, 0.1)',
              height: '100%',
            }}>
              [Full calendar with drag-and-drop planning would render here]
            </div>
          </div>
        </div>

        {/* All Actions Panel */}
        <div style={{
          width: 280,
          background: 'white',
          padding: 24,
          borderLeft: '1px solid rgba(139, 148, 103, 0.1)',
          overflow: 'auto',
        }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A', margin: '0 0 16px' }}>All Actions (26)</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { title: 'Build founder-focused relationship system', theme: 'mastery', active: true },
              { title: 'Scale PMAI as proof-of-concept', theme: 'mastery' },
              { title: 'Secure strategic role for VC partnership', theme: 'mastery' },
              { title: 'Complete health procedures by week 11', theme: 'health' },
              { title: 'Develop private school shortlist', theme: 'love' },
            ].map((action, i) => (
              <div key={i} style={{
                padding: 12,
                background: action.active ? 'rgba(37, 99, 235, 0.1)' : '#FAFAF9',
                borderRadius: 10,
                border: `1px solid ${action.active ? '#2563EB' : 'rgba(139, 148, 103, 0.1)'}`,
                cursor: 'pointer',
              }}>
                <div style={{ fontSize: 10, color: action.active ? '#2563EB' : '#666', marginBottom: 4 }}>
                  {getTheme(action.theme)?.name}
                </div>
                <div style={{
                  fontSize: 12,
                  color: '#1A1A1A',
                  lineHeight: 1.4,
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}>{action.title}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ==================== REVIEW MODE ====================

  const ReviewModeModal = () => {
    if (activeMode !== 'review') return null;

    const totalActualHours = reviewData.themeHours.reduce((sum, t) => sum + t.hours, 0);

    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: '40px 20px',
        overflow: 'auto',
      }}>
        <div style={{
          width: '100%',
          maxWidth: 1000,
          background: '#F5F1EB',
          borderRadius: 20,
          overflow: 'hidden',
          boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
        }}>
          {/* Header */}
          <div style={{
            padding: '20px 24px',
            background: 'white',
            borderBottom: '1px solid rgba(139, 148, 103, 0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 600, color: '#1A1A1A', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>📊</span> Weekly Review
              </h1>
              <p style={{ fontSize: 13, color: '#666', margin: '4px 0 0' }}>
                Reviewing: {reviewData.period}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button style={{
                padding: '10px 20px',
                background: '#8B9467',
                color: 'white',
                border: 'none',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}>Complete Review</button>
              <button
                onClick={() => setActiveMode(null)}
                style={{
                  padding: '10px 16px',
                  background: 'rgba(220, 38, 38, 0.1)',
                  color: '#DC2626',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >Close</button>
            </div>
          </div>

          {/* Content */}
          <div style={{ padding: 24 }}>
            {/* Success Banner */}
            {reviewData.needsReview === 0 && (
              <div style={{
                background: 'rgba(5, 150, 105, 0.1)',
                border: '1px solid rgba(5, 150, 105, 0.2)',
                borderRadius: 12,
                padding: '14px 20px',
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}>
                <span style={{ fontSize: 20 }}>✓</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#059669' }}>
                  All events classified!
                </span>
              </div>
            )}

            {/* Week Summary Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 16,
              marginBottom: 24,
            }}>
              <div style={{
                background: 'white',
                borderRadius: 14,
                padding: 20,
                border: '1px solid rgba(139, 148, 103, 0.1)',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 32, fontWeight: 700, color: '#1A1A1A', marginBottom: 4 }}>
                  {reviewData.totalTime}h
                </div>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#666' }}>Total Time</div>
                <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>synced from Google Calendar</div>
              </div>
              
              <div style={{
                background: 'white',
                borderRadius: 14,
                padding: 20,
                border: '1px solid rgba(139, 148, 103, 0.1)',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 32, fontWeight: 700, color: '#2563EB', marginBottom: 4 }}>
                  {reviewData.autoClassified}
                </div>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#666' }}>Auto-Classified</div>
                <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>events</div>
              </div>
              
              <div style={{
                background: 'white',
                borderRadius: 14,
                padding: 20,
                border: '1px solid rgba(139, 148, 103, 0.1)',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 32, fontWeight: 700, color: reviewData.needsReview > 0 ? '#F59E0B' : '#059669', marginBottom: 4 }}>
                  {reviewData.needsReview}
                </div>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#666' }}>Needs Review</div>
                <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>events</div>
              </div>
              
              <div style={{
                background: 'white',
                borderRadius: 14,
                padding: 20,
                border: '1px solid rgba(139, 148, 103, 0.1)',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 32, fontWeight: 700, color: '#059669', marginBottom: 4 }}>
                  {reviewData.coverage}%
                </div>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#666' }}>Coverage</div>
                <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>complete</div>
              </div>
            </div>

            {/* Hours by Theme */}
            <div style={{
              background: 'white',
              borderRadius: 16,
              padding: 24,
              border: '1px solid rgba(139, 148, 103, 0.1)',
              marginBottom: 24,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1A1A1A', margin: 0 }}>
                  Hours by Theme
                </h2>
                <button style={{
                  padding: '6px 14px',
                  background: '#8B9467',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}>Planned vs Actual</button>
              </div>

              {/* Theme Distribution Bar */}
              <div style={{
                height: 12,
                borderRadius: 6,
                display: 'flex',
                overflow: 'hidden',
                marginBottom: 20,
                background: 'rgba(139, 148, 103, 0.1)',
              }}>
                {reviewData.themeHours.map(item => {
                  const theme = getTheme(item.theme);
                  const percentage = (item.hours / totalActualHours) * 100;
                  return (
                    <div
                      key={item.theme}
                      style={{
                        width: `${percentage}%`,
                        background: theme?.color || '#999',
                        transition: 'width 0.3s ease',
                      }}
                      title={`${theme?.name}: ${item.hours}h (${Math.round(percentage)}%)`}
                    />
                  );
                })}
              </div>

              {/* Theme Cards Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                {reviewData.themeHours.map(item => {
                  const theme = getTheme(item.theme);
                  const percentage = Math.round((item.hours / totalActualHours) * 100);
                  return (
                    <div key={item.theme} style={{
                      padding: 16,
                      background: '#FAFAF9',
                      borderRadius: 12,
                      borderLeft: `4px solid ${theme?.color || '#999'}`,
                    }}>
                      <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>{theme?.name}</div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <span style={{ fontSize: 28, fontWeight: 700, color: '#1A1A1A' }}>{item.hours}h</span>
                        <span style={{ fontSize: 12, color: '#999' }}>of {item.planned}h planned</span>
                      </div>
                      <div style={{
                        height: 4,
                        background: 'rgba(139, 148, 103, 0.15)',
                        borderRadius: 2,
                        marginTop: 10,
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          width: `${Math.min((item.hours / 40) * 100, 100)}%`,
                          height: '100%',
                          background: theme?.color || '#999',
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Auto-Classified Events */}
            <div style={{
              background: 'white',
              borderRadius: 16,
              padding: 24,
              border: '1px solid rgba(139, 148, 103, 0.1)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1A1A1A', margin: 0 }}>
                  Auto-Classified ({reviewData.autoClassified})
                </h2>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    placeholder="Search events..."
                    style={{
                      padding: '8px 12px',
                      border: '1px solid rgba(139, 148, 103, 0.2)',
                      borderRadius: 8,
                      fontSize: 13,
                      width: 200,
                      outline: 'none',
                    }}
                  />
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {reviewData.classifiedEvents.map((item, i) => {
                  const theme = getTheme(item.theme);
                  return (
                    <div key={i} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 16px',
                      background: '#FAFAF9',
                      borderRadius: 10,
                      gap: 16,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                        <div style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          background: theme?.color || '#999',
                          flexShrink: 0,
                        }} />
                        <span style={{
                          fontSize: 14,
                          color: '#1A1A1A',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>{item.event}</span>
                      </div>
                      <span style={{
                        fontSize: 12,
                        color: '#666',
                        background: 'white',
                        padding: '6px 12px',
                        borderRadius: 8,
                        border: '1px solid rgba(139, 148, 103, 0.1)',
                        maxWidth: '45%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}>{item.classification}</span>
                    </div>
                  );
                })}
              </div>

              {/* Show more */}
              <button style={{
                width: '100%',
                marginTop: 12,
                padding: 12,
                background: 'transparent',
                border: '1px solid rgba(139, 148, 103, 0.2)',
                borderRadius: 10,
                color: '#8B9467',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
              }}>
                Show all {reviewData.autoClassified} events →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ==================== MAIN RENDER ====================

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F5F1EB',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      color: '#1A1A1A',
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

      {/* Mode Modals */}
      <TagModeModal />
      <PlanModeModal />
      <ReviewModeModal />

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        button { font-family: inherit; transition: all 0.15s ease; }
        button:hover { opacity: 0.85; }
        input, select { font-family: inherit; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(139, 148, 103, 0.2); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(139, 148, 103, 0.3); }
      `}</style>
    </div>
  );
};

export default KaizenOS;
