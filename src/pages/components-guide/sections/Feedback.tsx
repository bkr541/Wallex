export default function Feedback() {
  return (
    <section className="view-panel" data-view="feedback">
      <div className="component-grid">
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Badge</span>
          </header>
          <div className="component-stage center">
            <div className="badge-demo">
              <span>Notifications</span>
              <b>12</b>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Status indicator</span>
          </header>
          <div className="component-stage center">
            <div className="status-indicator-demo">
              <span className="status-orb good" />
              <span>
                <strong>System ready</strong>
                <small>All services available</small>
              </span>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Status dot</span>
          </header>
          <div className="component-stage flex-center">
            <span className="status-dot-demo online" />
            <span className="status-dot-demo idle" />
            <span className="status-dot-demo warning" />
            <span className="status-dot-demo error" />
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Chip</span>
          </header>
          <div className="component-stage flex-center">
            <button className="feedback-chip active">B♭ Major</button>
            <button className="feedback-chip">150 BPM</button>
            <button className="feedback-chip">24-bit</button>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Tag</span>
          </header>
          <div className="component-stage flex-center">
            <span className="feedback-tag">
              Melodic Bass
              {' '}
              <button>×</button>
            </span>
            <span className="feedback-tag">
              Vocal
              {' '}
              <button>×</button>
            </span>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Pill</span>
          </header>
          <div className="component-stage flex-center">
            <span className="feedback-pill active">Mastered</span>
            <span className="feedback-pill">Draft</span>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Alert</span>
          </header>
          <div className="component-stage center">
            <div className="alert-demo">
              <span className="feedback-symbol">i</span>
              <span>
                <strong>Analysis complete</strong>
                <small>Tempo and key were updated.</small>
              </span>
              <button>×</button>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Banner</span>
          </header>
          <div className="component-stage no-pad">
            <div className="banner-demo">
              <span className="feedback-symbol">!</span>
              <span>
                <strong>Project has unsaved changes</strong>
                <small>Save before closing the session.</small>
              </span>
              <button>Save</button>
            </div>
            <div className="banner-canvas">
              <i />
              <i />
              <i />
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Toast notification</span>
          </header>
          <div className="component-stage no-pad">
            <div className="toast-stage">
              <div className="toast-demo" data-toast>
                <span className="toast-check">✓</span>
                <span>
                  <strong>Export complete</strong>
                  <small>Master.wav saved successfully</small>
                </span>
                <button className="toast-close">×</button>
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Inline validation message</span>
          </header>
          <div className="component-stage center">
            <label className="validation-demo">
              <span>Project name</span>
              <input defaultValue="Reverie / Final" />
              <small>
                <i>!</i>
                {' '}
                Remove the “/” character.
              </small>
            </label>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Success message</span>
          </header>
          <div className="component-stage center">
            <div className="message-demo success">
              <span className="message-icon">✓</span>
              <span>
                <strong>Changes saved</strong>
                <small>Your project metadata is up to date.</small>
              </span>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Warning message</span>
          </header>
          <div className="component-stage center">
            <div className="message-demo warning">
              <span className="message-icon">!</span>
              <span>
                <strong>Low disk space</strong>
                <small>18 GB remaining on this drive.</small>
              </span>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Error state</span>
          </header>
          <div className="component-stage center">
            <div className="error-state-demo">
              <span className="error-state-icon">!</span>
              <strong>Analysis failed</strong>
              <small>The audio file could not be decoded.</small>
              <button className="demo-btn secondary">Try again</button>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Loading spinner</span>
          </header>
          <div className="component-stage center">
            <div className="spinner-demo">
              <span />
              <strong>Analyzing</strong>
              <small>Reading audio features…</small>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Skeleton loader</span>
          </header>
          <div className="component-stage center">
            <div className="skeleton-demo">
              <div className="skeleton-cover shimmer" />
              <div className="skeleton-copy">
                <i className="shimmer" />
                <i className="shimmer" />
                <i className="shimmer short" />
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Empty state</span>
          </header>
          <div className="component-stage center">
            <div className="empty-demo">
              <span className="empty-icon">
                <i />
                <i />
                <i />
              </span>
              <strong>No tracks yet</strong>
              <small>Import audio to start building this session.</small>
              <button className="demo-btn secondary">Import audio</button>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Offline state</span>
          </header>
          <div className="component-stage center">
            <div className="offline-demo">
              <span className="offline-icon">
                <i />
              </span>
              <strong>You’re offline</strong>
              <small>Local projects remain available.</small>
              <button className="demo-btn ghost">Retry connection</button>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
