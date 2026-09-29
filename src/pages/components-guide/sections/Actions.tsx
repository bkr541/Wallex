export default function Actions() {
  return (
    <section className="view-panel" data-view="actions">
      <div className="component-grid">
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Primary button</span>
          </header>
          <div className="component-stage center">
            <button className="demo-btn primary">Analyze Track</button>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Secondary button</span>
          </header>
          <div className="component-stage center">
            <button className="demo-btn secondary">Save Preset</button>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Tertiary / ghost button</span>
          </header>
          <div className="component-stage center">
            <button className="demo-btn ghost">View Details</button>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Icon button</span>
          </header>
          <div className="component-stage center">
            <button className="demo-btn secondary icon-only" aria-label="Play">
              <svg className="demo-icon" viewBox="0 0 24 24">
                <path d="m9 7 8 5-8 5z" />
              </svg>
            </button>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Split button</span>
          </header>
          <div className="component-stage center">
            <div className="split-button">
              <button className="split-main">Export</button>
              <button className="split-toggle" id="splitToggle">⌄</button>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Toggle button</span>
          </header>
          <div className="component-stage center">
            <button className="demo-btn secondary toggle-demo" data-toggle-button aria-pressed="false">
              <span>Disabled</span>
            </button>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Button group</span>
          </header>
          <div className="component-stage center">
            <div className="button-group" data-button-group>
              <button className="active">1/4</button>
              <button>1/8</button>
              <button>1/16</button>
              <button>1/32</button>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Floating action button</span>
          </header>
          <div className="component-stage no-pad">
            <div className="fab-stage">
              <button className="fab" aria-label="Add">
                <svg className="demo-icon" viewBox="0 0 24 24">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Destructive / danger button</span>
          </header>
          <div className="component-stage center">
            <div className="danger-wrap">
              <button className="demo-btn danger">
                <svg className="demo-icon" viewBox="0 0 24 24">
                  <path d="M5 7h14M9 7V5h6v2M8 7l1 12h6l1-12" />
                </svg>
                Delete Track
              </button>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Loading button</span>
          </header>
          <div className="component-stage center">
            <button className="demo-btn primary loading" id="loadingButton">
              <span>Generate</span>
            </button>
          </div>
        </article>
      </div>
    </section>
  );
}
