import type { CSSProperties } from 'react';

export default function Navigation() {
  return (
    <section className="view-panel" data-view="navigation">
      <div className="component-grid">
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Top navigation bar / app header</span>
          </header>
          <div className="component-stage no-pad">
            <div className="demo-topbar">
              <span className="topbar-mark" />
              <div className="topbar-links">
                <button className="topbar-link active">Library</button>
                <button className="topbar-link">Projects</button>
                <button className="topbar-link">Mixes</button>
              </div>
              <div className="topbar-actions">
                <button className="mini-circle">⌕</button>
                <button className="mini-circle">•••</button>
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Sidebar / left navigation</span>
          </header>
          <div className="component-stage no-pad">
            <div className="demo-sidebar-layout">
              <div className="demo-side">
                <div className="demo-side-item active">
                  <i className="dot-icon" />
                  <span>Library</span>
                </div>
                <div className="demo-side-item">
                  <i className="dot-icon" />
                  <span>Projects</span>
                </div>
                <div className="demo-side-item">
                  <i className="dot-icon" />
                  <span>Samples</span>
                </div>
                <div className="demo-side-item">
                  <i className="dot-icon" />
                  <span>Exports</span>
                </div>
              </div>
              <div className="demo-content-lines">
                <div className="demo-line accent" />
                <div className="demo-line" />
                <div className="demo-line" />
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Collapsible sidebar</span>
          </header>
          <div className="component-stage no-pad" style={{ position: "relative" } as CSSProperties}>
            <div className="collapse-demo" id="collapseDemo">
              <div className="collapse-rail">
                <div className="demo-side-item active">
                  <i className="dot-icon" />
                  <span>Home</span>
                </div>
                <div className="demo-side-item">
                  <i className="dot-icon" />
                  <span>Tracks</span>
                </div>
                <div className="demo-side-item">
                  <i className="dot-icon" />
                  <span>Tags</span>
                </div>
              </div>
              <div className="demo-content-lines">
                <div className="demo-line accent" />
                <div className="demo-line" />
                <div className="demo-line" />
              </div>
            </div>
            <button className="collapse-mini-toggle" id="collapseDemoButton">›</button>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Navigation tabs</span>
          </header>
          <div className="component-stage center">
            <div className="tabs-demo" data-tabs>
              <button className="tab-demo active">Overview</button>
              <button className="tab-demo">Tracks</button>
              <button className="tab-demo">Metadata</button>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Breadcrumbs</span>
          </header>
          <div className="component-stage center">
            <nav className="breadcrumbs">
              <button className="crumb">Library</button>
              <span className="crumb-sep">/</span>
              <button className="crumb">Projects</button>
              <span className="crumb-sep">/</span>
              <button className="crumb current">Reverie</button>
            </nav>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Bottom navigation</span>
          </header>
          <div className="component-stage" style={{ position: "relative" } as CSSProperties}>
            <nav className="bottom-nav-demo" data-bottom-nav>
              <button className="bottom-nav-item active">
                <svg className="demo-icon" viewBox="0 0 24 24">
                  <path d="M4 11.5 12 5l8 6.5v7a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z" />
                </svg>
                <span>Home</span>
              </button>
              <button className="bottom-nav-item">
                <svg className="demo-icon" viewBox="0 0 24 24">
                  <path d="M4 6h16M4 12h16M4 18h10" />
                </svg>
                <span>Tracks</span>
              </button>
              <button className="bottom-nav-item">
                <svg className="demo-icon" viewBox="0 0 24 24">
                  <path d="M12 4v16M5 9v6M19 8v8M8 6v12M16 10v4" />
                </svg>
                <span>Mixer</span>
              </button>
              <button className="bottom-nav-item">
                <svg className="demo-icon" viewBox="0 0 24 24">
                  <circle cx="12" cy="8" r="3" />
                  <path d="M6 20c.8-4 3-6 6-6s5.2 2 6 6" />
                </svg>
                <span>Profile</span>
              </button>
            </nav>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Menu / dropdown menu</span>
          </header>
          <div className="component-stage center">
            <div className="dropdown-anchor" id="dropdownAnchor">
              <button className="demo-btn secondary" id="dropdownButton">
                Track options
                {' '}
                <span>⌄</span>
              </button>
              <div className="dropdown-menu">
                <div className="menu-row">
                  <span>Duplicate</span>
                  <kbd>⌘D</kbd>
                </div>
                <div className="menu-row">
                  <span>Rename</span>
                  <kbd>R</kbd>
                </div>
                <div className="menu-row">
                  <span>Move to group</span>
                  <span>›</span>
                </div>
                <div className="menu-row">
                  <span>Export</span>
                  <span />
                </div>
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Context menu / right-click menu</span>
          </header>
          <div className="component-stage no-pad">
            <div className="context-zone">
              <div className="context-menu">
                <div className="menu-row">
                  <span>Open</span>
                  <kbd>↵</kbd>
                </div>
                <div className="menu-row">
                  <span>Reveal in browser</span>
                  <span />
                </div>
                <div className="menu-row">
                  <span>Add tag</span>
                  <kbd>T</kbd>
                </div>
                <div className="menu-row danger-row">
                  <span>Remove</span>
                  <kbd>⌫</kbd>
                </div>
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Command palette</span>
          </header>
          <div className="component-stage center">
            <div className="command-palette">
              <div className="command-input">
                <span>⌕</span>
                <input defaultValue="" placeholder="Search commands" />
                <kbd>ESC</kbd>
              </div>
              <div className="command-results">
                <div className="command-row active">
                  <span>Open project</span>
                  <span>⌘ O</span>
                </div>
                <div className="command-row">
                  <span>Analyze sample</span>
                  <span>⌘ A</span>
                </div>
                <div className="command-row">
                  <span>Export selection</span>
                  <span>⌘ E</span>
                </div>
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Back / forward controls</span>
          </header>
          <div className="component-stage center">
            <div className="history-controls">
              <button className="history-btn">
                <svg className="demo-icon" viewBox="0 0 24 24">
                  <path d="m14 6-6 6 6 6" />
                </svg>
              </button>
              <span className="history-divider" />
              <button className="history-btn">
                <svg className="demo-icon" viewBox="0 0 24 24">
                  <path d="m10 6 6 6-6 6" />
                </svg>
              </button>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
