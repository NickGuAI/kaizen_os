import React, { useState } from 'react';

const KaizenDashboard = () => {
  const [intentionView, setIntentionView] = useState('Week');
  const [themeView, setThemeView] = useState('allocation');
  
  // Theme data with time allocations
  const allocatedThemes = [
    { name: 'Mastery and Impact on AI and startups', allocation: 50, hoursPlanned: 45, hoursLogged: 32, color: '#7A8B5C' },
    { name: 'Love & Presence', allocation: 25, hoursPlanned: 22.5, hoursLogged: 18, color: '#8B9467' },
    { name: 'Wisdom and Growth', allocation: 15, hoursPlanned: 13.5, hoursLogged: 8, color: '#9BA578' },
    { name: 'Health & Self Mastery', allocation: 10, hoursPlanned: 9, hoursLogged: 6, color: '#ABB589' },
  ];
  
  const unallocatedThemes = [
    { name: 'Life Admin', allocation: 0, hoursLogged: 4, actions: 1 },
  ];
  
  // Intention data
  const intentions = [
    { name: 'Deep Work Sessions', theme: 'Mastery and Impact', hours: 24, target: 30 },
    { name: 'Family Time', theme: 'Love & Presence', hours: 12, target: 15 },
    { name: 'Reading & Learning', theme: 'Wisdom and Growth', hours: 6, target: 10 },
    { name: 'Exercise', theme: 'Health & Self Mastery', hours: 4, target: 7 },
    { name: 'Meditation', theme: 'Health & Self Mastery', hours: 2, target: 3.5 },
  ];
  
  const totalHoursLogged = allocatedThemes.reduce((sum, t) => sum + t.hoursLogged, 0) + 
                          unallocatedThemes.reduce((sum, t) => sum + t.hoursLogged, 0);
  const untaggedHours = 147.3 - totalHoursLogged;

  return (
    <div style={styles.container}>
      {/* ===== HEADER - UNCHANGED ===== */}
      <header style={styles.header}>
        <div style={styles.logo}>Kaizen OS</div>
        <div style={styles.navControls}>
          <div style={styles.viewToggle}>
            <button style={styles.toggleBtn}>Day</button>
            <button style={{...styles.toggleBtn, ...styles.toggleBtnActive}}>Week</button>
          </div>
          <div style={styles.menuDropdown}>
            <span style={styles.menuIcon}>☰</span> Menu
            <span style={styles.dropdownArrow}>▼</span>
          </div>
        </div>
      </header>

      <div style={styles.mainContent}>
        {/* ===== LEFT PANEL - UNCHANGED ===== */}
        <aside style={styles.leftPanel}>
          <div style={styles.themesCard}>
            <div style={styles.themesHeader}>
              <span style={styles.themesIcon}>🎯</span>
              <h2 style={styles.themesTitle}>Themes</h2>
              <button style={styles.addThemeBtn}>+ Theme</button>
            </div>
            <p style={styles.seasonLabel}>Season Allocation</p>
          </div>
          
          <div style={styles.seasonCard}>
            <div style={styles.seasonHeader}>
              <h3 style={styles.seasonName}>S1 2026</h3>
              <span style={styles.activeBadge}>Active</span>
            </div>
            <p style={styles.seasonDates}>Dec 28, 2025 — Mar 22, 2026</p>
            <div style={styles.seasonProgress}></div>
            
            <div style={styles.seasonStats}>
              <div style={styles.statItem}>
                <span style={styles.statLabel}>WEEKS LEFT</span>
                <span style={styles.statValue}>10</span>
              </div>
              <div style={styles.statItem}>
                <span style={styles.statLabel}>UTILITY RATE</span>
                <span style={styles.statValue}>90h/wk</span>
              </div>
              <div style={styles.statItem}>
                <span style={styles.statLabel}>TOTAL HOURS</span>
                <span style={styles.statValue}>1080h</span>
              </div>
            </div>
            
            <button style={styles.editSeasonBtn}>Edit Season</button>
          </div>
        </aside>

        {/* ===== REDESIGNED MIDDLE SECTION ===== */}
        <main style={styles.middleSection}>
          <div style={styles.sectionCard}>
            <div style={styles.sectionHeader}>
              <h3 style={styles.sectionTitle}>ALLOCATED THEMES</h3>
              <div style={styles.viewTabs}>
                <button 
                  style={themeView === 'allocation' ? styles.tabActive : styles.tab}
                  onClick={() => setThemeView('allocation')}
                >
                  Allocation
                </button>
                <button 
                  style={themeView === 'progress' ? styles.tabActive : styles.tab}
                  onClick={() => setThemeView('progress')}
                >
                  Progress
                </button>
              </div>
            </div>
            
            <div style={styles.themesList}>
              {allocatedThemes.map((theme, index) => (
                <div key={index} style={styles.themeRow}>
                  <div style={styles.themeInfo}>
                    <div style={styles.themeNameRow}>
                      <div style={{...styles.themeColorDot, backgroundColor: theme.color}}></div>
                      <span style={styles.themeName}>{theme.name}</span>
                    </div>
                    <div style={styles.themeStats}>
                      <span style={styles.themeAllocation}>{theme.allocation}%</span>
                      <span style={styles.themeSeparator}>•</span>
                      <span style={styles.themeHours}>
                        {themeView === 'allocation' 
                          ? `${theme.hoursPlanned}h planned`
                          : `${theme.hoursLogged}h / ${theme.hoursPlanned}h`
                        }
                      </span>
                    </div>
                  </div>
                  
                  <div style={styles.themeBarContainer}>
                    {themeView === 'allocation' ? (
                      <div style={styles.allocationBar}>
                        <div 
                          style={{
                            ...styles.allocationFill,
                            width: `${theme.allocation}%`,
                            backgroundColor: theme.color
                          }}
                        ></div>
                      </div>
                    ) : (
                      <div style={styles.progressBar}>
                        <div 
                          style={{
                            ...styles.progressFill,
                            width: `${(theme.hoursLogged / theme.hoursPlanned) * 100}%`,
                            backgroundColor: theme.color
                          }}
                        ></div>
                        <div 
                          style={{
                            ...styles.progressTarget,
                            left: '100%'
                          }}
                        ></div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Visual Time Distribution */}
            <div style={styles.timeDistribution}>
              <div style={styles.distributionLabel}>Time Distribution</div>
              <div style={styles.distributionBar}>
                {allocatedThemes.map((theme, index) => (
                  <div 
                    key={index}
                    style={{
                      ...styles.distributionSegment,
                      width: `${theme.allocation}%`,
                      backgroundColor: theme.color,
                    }}
                    title={`${theme.name}: ${theme.allocation}%`}
                  >
                    {theme.allocation >= 15 && (
                      <span style={styles.segmentLabel}>{theme.allocation}%</span>
                    )}
                  </div>
                ))}
              </div>
              <div style={styles.distributionLegend}>
                {allocatedThemes.map((theme, index) => (
                  <div key={index} style={styles.legendItem}>
                    <div style={{...styles.legendDot, backgroundColor: theme.color}}></div>
                    <span style={styles.legendText}>{theme.name.split(' ').slice(0, 2).join(' ')}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Unallocated Themes */}
          <div style={styles.unallocatedSection}>
            <h3 style={styles.unallocatedTitle}>UNALLOCATED THEMES</h3>
            <div style={styles.unallocatedList}>
              {unallocatedThemes.map((theme, index) => (
                <div key={index} style={styles.unallocatedItem}>
                  <div style={styles.unallocatedDot}></div>
                  <span style={styles.unallocatedName}>{theme.name}</span>
                  <span style={styles.unallocatedStats}>{theme.allocation}% • {theme.actions} actions</span>
                </div>
              ))}
            </div>
          </div>
        </main>

        {/* ===== REDESIGNED RIGHT SECTION ===== */}
        <aside style={styles.rightPanel}>
          <div style={styles.intentionCard}>
            <div style={styles.intentionHeader}>
              <div style={styles.intentionTitleRow}>
                <span style={styles.intentionIcon}>📊</span>
                <h3 style={styles.intentionTitle}>INTENTION</h3>
              </div>
              <div style={styles.intentionTabs}>
                <button 
                  style={intentionView === 'Week' ? styles.intentionTabActive : styles.intentionTab}
                  onClick={() => setIntentionView('Week')}
                >
                  Week
                </button>
                <button 
                  style={intentionView === 'Season' ? styles.intentionTabActive : styles.intentionTab}
                  onClick={() => setIntentionView('Season')}
                >
                  Season
                </button>
              </div>
            </div>
            
            <div style={styles.dateNav}>
              <button style={styles.dateNavBtn}>←</button>
              <span style={styles.dateRange}>Jan 12 - Jan 18, 2026</span>
              <button style={styles.dateNavBtn}>→</button>
              <button style={styles.todayBtn}>Today</button>
            </div>
            
            {/* Time Summary */}
            <div style={styles.timeSummary}>
              <div style={styles.summaryItem}>
                <span style={styles.summaryValue}>147.3h</span>
                <span style={styles.summaryLabel}>Total Logged</span>
              </div>
              <div style={styles.summaryDivider}></div>
              <div style={styles.summaryItem}>
                <span style={styles.summaryValue}>{totalHoursLogged}h</span>
                <span style={styles.summaryLabel}>Tagged</span>
              </div>
              <div style={styles.summaryDivider}></div>
              <div style={styles.summaryItem}>
                <span style={{...styles.summaryValue, color: '#E74C3C'}}>{untaggedHours.toFixed(1)}h</span>
                <span style={styles.summaryLabel}>Untagged</span>
              </div>
            </div>
            
            {/* Intentions List */}
            <div style={styles.intentionsList}>
              <div style={styles.intentionsListHeader}>
                <span>Intention</span>
                <span>Progress</span>
              </div>
              
              {intentions.map((intention, index) => {
                const progress = (intention.hours / intention.target) * 100;
                const themeData = allocatedThemes.find(t => t.name.includes(intention.theme.split(' ')[0]));
                
                return (
                  <div key={index} style={styles.intentionRow}>
                    <div style={styles.intentionInfo}>
                      <span style={styles.intentionName}>{intention.name}</span>
                      <span style={styles.intentionTheme}>{intention.theme}</span>
                    </div>
                    <div style={styles.intentionProgress}>
                      <div style={styles.intentionProgressBar}>
                        <div 
                          style={{
                            ...styles.intentionProgressFill,
                            width: `${Math.min(progress, 100)}%`,
                            backgroundColor: themeData?.color || '#8B9467'
                          }}
                        ></div>
                      </div>
                      <span style={styles.intentionHours}>
                        {intention.hours}h / {intention.target}h
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Untagged Alert */}
            <div style={styles.untaggedAlert}>
              <div style={styles.alertIcon}>⚠</div>
              <div style={styles.alertContent}>
                <span style={styles.alertTitle}>{untaggedHours.toFixed(1)}h Untagged</span>
                <span style={styles.alertDesc}>{((untaggedHours / 147.3) * 100).toFixed(0)}% of logged time needs categorization</span>
              </div>
              <button style={styles.alertBtn}>Review →</button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#F5F1EB',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  
  // Header styles (unchanged functionality)
  header: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px 24px',
    gap: '24px',
  },
  logo: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#8B9467',
    letterSpacing: '-0.02em',
  },
  navControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  viewToggle: {
    display: 'flex',
    backgroundColor: '#fff',
    borderRadius: '10px',
    padding: '4px',
    border: '1px solid rgba(139, 148, 103, 0.15)',
  },
  toggleBtn: {
    padding: '8px 16px',
    border: 'none',
    background: 'transparent',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#666',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  toggleBtnActive: {
    backgroundColor: 'rgba(139, 148, 103, 0.12)',
    color: '#1A1A1A',
    fontWeight: '500',
  },
  menuDropdown: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    backgroundColor: '#fff',
    borderRadius: '10px',
    border: '1px solid rgba(139, 148, 103, 0.15)',
    fontSize: '14px',
    color: '#666',
    cursor: 'pointer',
  },
  menuIcon: {
    fontSize: '12px',
  },
  dropdownArrow: {
    fontSize: '10px',
    marginLeft: '4px',
  },
  
  // Main content layout
  mainContent: {
    display: 'grid',
    gridTemplateColumns: '280px 1fr 340px',
    gap: '20px',
    padding: '0 24px 24px',
    maxWidth: '1600px',
  },
  
  // Left panel (unchanged)
  leftPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  themesCard: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid rgba(139, 148, 103, 0.1)',
  },
  themesHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  themesIcon: {
    fontSize: '16px',
  },
  themesTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#8B9467',
    flex: 1,
    margin: 0,
  },
  addThemeBtn: {
    padding: '6px 12px',
    backgroundColor: '#fff',
    border: '1px solid rgba(139, 148, 103, 0.2)',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#666',
    cursor: 'pointer',
  },
  seasonLabel: {
    fontSize: '13px',
    color: '#999',
    margin: 0,
  },
  seasonCard: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid rgba(139, 148, 103, 0.1)',
  },
  seasonHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '4px',
  },
  seasonName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1A1A1A',
    margin: 0,
  },
  activeBadge: {
    padding: '4px 10px',
    backgroundColor: 'rgba(139, 148, 103, 0.1)',
    borderRadius: '12px',
    fontSize: '12px',
    color: '#8B9467',
    fontWeight: '500',
  },
  seasonDates: {
    fontSize: '13px',
    color: '#666',
    margin: '0 0 12px 0',
  },
  seasonProgress: {
    height: '4px',
    backgroundColor: 'rgba(139, 148, 103, 0.15)',
    borderRadius: '2px',
    marginBottom: '16px',
    position: 'relative',
    overflow: 'hidden',
  },
  seasonStats: {
    display: 'flex',
    gap: '20px',
    marginBottom: '16px',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  statLabel: {
    fontSize: '11px',
    color: '#999',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1A1A1A',
  },
  editSeasonBtn: {
    width: '100%',
    padding: '10px',
    backgroundColor: 'transparent',
    border: '1px solid rgba(139, 148, 103, 0.15)',
    borderRadius: '10px',
    fontSize: '14px',
    color: '#666',
    cursor: 'pointer',
    textAlign: 'center',
  },
  
  // Middle section (redesigned)
  middleSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '24px',
    border: '1px solid rgba(139, 148, 103, 0.1)',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px',
  },
  sectionTitle: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#999',
    letterSpacing: '0.05em',
    margin: 0,
  },
  viewTabs: {
    display: 'flex',
    gap: '4px',
    backgroundColor: 'rgba(139, 148, 103, 0.08)',
    padding: '3px',
    borderRadius: '8px',
  },
  tab: {
    padding: '6px 12px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#666',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  tabActive: {
    padding: '6px 12px',
    backgroundColor: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#1A1A1A',
    fontWeight: '500',
    cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  
  // Theme rows
  themesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  themeRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  themeInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  themeNameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  themeColorDot: {
    width: '10px',
    height: '10px',
    borderRadius: '3px',
    flexShrink: 0,
  },
  themeName: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1A1A1A',
    lineHeight: '1.4',
  },
  themeStats: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexShrink: 0,
  },
  themeAllocation: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#8B9467',
  },
  themeSeparator: {
    color: '#ccc',
    fontSize: '10px',
  },
  themeHours: {
    fontSize: '13px',
    color: '#999',
  },
  themeBarContainer: {
    marginLeft: '20px',
  },
  allocationBar: {
    height: '8px',
    backgroundColor: 'rgba(139, 148, 103, 0.1)',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  allocationFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.3s ease',
  },
  progressBar: {
    height: '8px',
    backgroundColor: 'rgba(139, 148, 103, 0.1)',
    borderRadius: '4px',
    position: 'relative',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.3s ease',
  },
  progressTarget: {
    position: 'absolute',
    top: '-2px',
    width: '2px',
    height: '12px',
    backgroundColor: '#1A1A1A',
    borderRadius: '1px',
  },
  
  // Time distribution visualization
  timeDistribution: {
    marginTop: '28px',
    paddingTop: '20px',
    borderTop: '1px solid rgba(139, 148, 103, 0.1)',
  },
  distributionLabel: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#999',
    marginBottom: '12px',
    letterSpacing: '0.02em',
  },
  distributionBar: {
    display: 'flex',
    height: '40px',
    borderRadius: '10px',
    overflow: 'hidden',
    marginBottom: '12px',
  },
  distributionSegment: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'opacity 0.2s ease',
    cursor: 'pointer',
  },
  segmentLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#fff',
    textShadow: '0 1px 2px rgba(0,0,0,0.2)',
  },
  distributionLegend: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  legendDot: {
    width: '8px',
    height: '8px',
    borderRadius: '2px',
  },
  legendText: {
    fontSize: '12px',
    color: '#666',
  },
  
  // Unallocated section
  unallocatedSection: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '20px 24px',
    border: '1px solid rgba(139, 148, 103, 0.1)',
  },
  unallocatedTitle: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#999',
    letterSpacing: '0.05em',
    margin: '0 0 12px 0',
  },
  unallocatedList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  unallocatedItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    backgroundColor: 'rgba(139, 148, 103, 0.04)',
    borderRadius: '10px',
  },
  unallocatedDot: {
    width: '10px',
    height: '10px',
    borderRadius: '3px',
    backgroundColor: '#ddd',
  },
  unallocatedName: {
    fontSize: '14px',
    color: '#666',
    flex: 1,
  },
  unallocatedStats: {
    fontSize: '13px',
    color: '#999',
  },
  
  // Right panel (redesigned)
  rightPanel: {
    display: 'flex',
    flexDirection: 'column',
  },
  intentionCard: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid rgba(139, 148, 103, 0.1)',
  },
  intentionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  intentionTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  intentionIcon: {
    fontSize: '14px',
  },
  intentionTitle: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#999',
    letterSpacing: '0.05em',
    margin: 0,
  },
  intentionTabs: {
    display: 'flex',
    gap: '4px',
    backgroundColor: 'rgba(139, 148, 103, 0.08)',
    padding: '3px',
    borderRadius: '8px',
  },
  intentionTab: {
    padding: '5px 10px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    color: '#666',
    cursor: 'pointer',
  },
  intentionTabActive: {
    padding: '5px 10px',
    backgroundColor: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    color: '#1A1A1A',
    fontWeight: '500',
    cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  dateNav: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '20px',
  },
  dateNavBtn: {
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    border: '1px solid rgba(139, 148, 103, 0.15)',
    borderRadius: '6px',
    fontSize: '12px',
    color: '#666',
    cursor: 'pointer',
  },
  dateRange: {
    fontSize: '13px',
    color: '#1A1A1A',
    fontWeight: '500',
    flex: 1,
    textAlign: 'center',
  },
  todayBtn: {
    padding: '5px 10px',
    backgroundColor: 'transparent',
    border: '1px solid rgba(139, 148, 103, 0.15)',
    borderRadius: '6px',
    fontSize: '12px',
    color: '#666',
    cursor: 'pointer',
  },
  
  // Time summary
  timeSummary: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: 'rgba(139, 148, 103, 0.06)',
    borderRadius: '12px',
    marginBottom: '20px',
  },
  summaryItem: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
  },
  summaryValue: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1A1A1A',
  },
  summaryLabel: {
    fontSize: '11px',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
  },
  summaryDivider: {
    width: '1px',
    height: '32px',
    backgroundColor: 'rgba(139, 148, 103, 0.2)',
  },
  
  // Intentions list
  intentionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  intentionsListHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11px',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
    padding: '0 4px',
    marginBottom: '4px',
  },
  intentionRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: 'rgba(139, 148, 103, 0.03)',
    borderRadius: '10px',
    transition: 'background-color 0.2s ease',
  },
  intentionInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    flex: 1,
    minWidth: 0,
  },
  intentionName: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#1A1A1A',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  intentionTheme: {
    fontSize: '11px',
    color: '#999',
  },
  intentionProgress: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '4px',
    marginLeft: '12px',
  },
  intentionProgressBar: {
    width: '80px',
    height: '6px',
    backgroundColor: 'rgba(139, 148, 103, 0.12)',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  intentionProgressFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.3s ease',
  },
  intentionHours: {
    fontSize: '11px',
    color: '#666',
    fontFamily: 'monospace',
  },
  
  // Untagged alert
  untaggedAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginTop: '20px',
    padding: '14px',
    backgroundColor: 'rgba(231, 76, 60, 0.06)',
    border: '1px solid rgba(231, 76, 60, 0.15)',
    borderRadius: '12px',
  },
  alertIcon: {
    fontSize: '16px',
    color: '#E74C3C',
  },
  alertContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  alertTitle: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#E74C3C',
  },
  alertDesc: {
    fontSize: '11px',
    color: '#999',
  },
  alertBtn: {
    padding: '6px 12px',
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '500',
    color: '#E74C3C',
    cursor: 'pointer',
  },
};

export default KaizenDashboard;
