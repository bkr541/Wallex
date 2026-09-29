export default function Identity() {
  return (
    <section className="view-panel" data-view="identity">
      <div className="component-grid">
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Avatar</span>
          </header>
          <div className="component-stage center">
            <div className="identity-avatar-demo">
              <div className="avatar-stack">
                <div className="avatar-face">KR</div>
                <i className="avatar-status" />
              </div>
              <div className="identity-avatar-copy">
                <strong>Kody Robinson</strong>
                <span>Producer · Online</span>
                <small>Pro workspace</small>
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">User profile menu</span>
          </header>
          <div className="component-stage center">
            <div className="profile-menu-demo" data-profile-menu>
              <button className="profile-trigger" type="button">
                <span className="profile-mini-avatar">KR</span>
                <span>
                  <strong>Kody Robinson</strong>
                  <small>kody@studio.local</small>
                </span>
                <span className="profile-caret">⌄</span>
              </button>
              <div className="profile-popover">
                <button>
                  Profile
                  {' '}
                  <span>⌘P</span>
                </button>
                <button>
                  Workspace
                  {' '}
                  <span>⌘W</span>
                </button>
                <button>
                  Preferences
                  {' '}
                  <span>⌘,</span>
                </button>
                <hr />
                <button>Sign out</button>
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Icon</span>
          </header>
          <div className="component-stage center">
            <div className="icon-showcase">
              <span className="icon-tile active">
                <svg viewBox="0 0 24 24">
                  <path d="M4 12h3l2-6 4 12 2-6h5" />
                </svg>
              </span>
              <span className="icon-tile">
                <svg viewBox="0 0 24 24">
                  <path d="M5 5h14v14H5zM8 15l3-4 2 2 3-4 2 3" />
                </svg>
              </span>
              <span className="icon-tile">
                <svg viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="8" />
                  <path d="M12 8v8M8 12h8" />
                </svg>
              </span>
              <span className="icon-tile">
                <svg viewBox="0 0 24 24">
                  <path d="M6 4h12v16H6zM9 8h6M9 12h6M9 16h3" />
                </svg>
              </span>
              <span className="icon-tile">
                <svg viewBox="0 0 24 24">
                  <path d="M4 18V6l7 4 9-6v14l-9-4-7 4z" />
                </svg>
              </span>
              <span className="icon-tile">
                <svg viewBox="0 0 24 24">
                  <path d="M12 3v18M3 12h18" />
                </svg>
              </span>
              <span className="icon-tile">
                <svg viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="6" />
                  <path d="M16 16l4 4" />
                </svg>
              </span>
              <span className="icon-tile">
                <svg viewBox="0 0 24 24">
                  <path d="M12 4l2.2 4.8L19 11l-4.8 2.2L12 18l-2.2-4.8L5 11l4.8-2.2L12 4z" />
                </svg>
              </span>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Logo</span>
          </header>
          <div className="component-stage center">
            <div className="logo-demo">
              <span className="logo-mark-demo" />
              <span className="logo-word-demo">
                <strong>AUREL</strong>
                <small>Creative system</small>
              </span>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Label</span>
          </header>
          <div className="component-stage flex-center">
            <div className="label-showcase">
              <span className="label-demo">Default</span>
              <span className="label-demo accent">Selected</span>
              <span className="label-demo subtle">Optional</span>
              <span className="label-demo">48 kHz</span>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Heading</span>
          </header>
          <div className="component-stage center">
            <div className="heading-demo">
              <span className="heading-kicker">Project overview</span>
              <h2>Reverie Session</h2>
              <p>Manage tracks, assets, analysis and export settings from one workspace.</p>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Caption</span>
          </header>
          <div className="component-stage center">
            <figure className="caption-demo">
              <div className="caption-visual" />
              <figcaption>
                <strong>Crystal stage study</strong>
                <span>Frame 04 · 16:9</span>
              </figcaption>
            </figure>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Helper text</span>
          </header>
          <div className="component-stage center">
            <div className="helper-field-demo">
              <label htmlFor="helperDemo">Project title</label>
              <input id="helperDemo" defaultValue="Reverie EP" />
              <small>
                <i>i</i>
                Used in exports and project metadata.
              </small>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Metadata</span>
          </header>
          <div className="component-stage center">
            <div className="metadata-demo">
              <div className="metadata-row-demo">
                <span>Created</span>
                <strong>Sep 26, 2026</strong>
              </div>
              <div className="metadata-row-demo">
                <span>Modified</span>
                <strong>12 minutes ago</strong>
              </div>
              <div className="metadata-row-demo">
                <span>Owner</span>
                <strong>Kody Robinson</strong>
              </div>
              <div className="metadata-row-demo">
                <span>Version</span>
                <strong>v12</strong>
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Divider</span>
          </header>
          <div className="component-stage center">
            <div className="divider-demo">
              <div className="divider-line" />
              <div className="divider-labelled">
                <span>OR</span>
              </div>
              <div className="divider-line" />
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Separator</span>
          </header>
          <div className="component-stage center">
            <div className="separator-demo">
              <div className="separator-row">
                <span>Track 04</span>
                <i className="separator-vertical" />
                <button>Mute</button>
                <i className="separator-vertical" />
                <button>Solo</button>
              </div>
              <div className="separator-row">
                <span>150 BPM</span>
                <i className="separator-vertical" />
                <span>B♭ Major</span>
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Link</span>
          </header>
          <div className="component-stage center">
            <div className="link-showcase">
              <a className="link-demo primary" href="#">
                Open project
                {' '}
                <svg viewBox="0 0 24 24">
                  <path d="M8 16L16 8M10 8h6v6" />
                </svg>
              </a>
              <a className="link-demo" href="#">View documentation</a>
              <a className="link-demo muted" href="#">Show advanced options</a>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Breadcrumb item</span>
          </header>
          <div className="component-stage center">
            <nav className="breadcrumb-item-demo">
              <button>Projects</button>
              <i>›</i>
              <button>Reverie</button>
              <i>›</i>
              <span className="current">Master</span>
            </nav>
          </div>
        </article>
      </div>
    </section>
  );
}
