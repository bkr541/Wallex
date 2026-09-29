import type { CSSProperties } from 'react';

export default function Containers() {
  return (
    <section className="view-panel" data-view="containers">
      <div className="component-grid">
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Card</span>
          </header>
          <div className="component-stage center">
            <div className="inner-card-demo">
              <div className="inner-card-top">
                <span className="inner-card-icon" />
                <span className="mini-badge">Active</span>
              </div>
              <strong>Reverie</strong>
              <small>12 tracks · 03:48</small>
              <div className="inner-card-progress">
                <i />
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Panel</span>
          </header>
          <div className="component-stage no-pad">
            <div className="panel-demo">
              <header>
                <strong>Inspector</strong>
                <button>•••</button>
              </header>
              <div className="panel-body">
                <div className="panel-field">
                  <span>Warp</span>
                  <b>Complex Pro</b>
                </div>
                <div className="panel-field">
                  <span>Gain</span>
                  <b>−1.5 dB</b>
                </div>
                <div className="panel-field">
                  <span>Pan</span>
                  <b>Center</b>
                </div>
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Section</span>
          </header>
          <div className="component-stage">
            <section className="section-demo">
              <header>
                <div>
                  <strong>Audio Analysis</strong>
                  <small>Signal properties</small>
                </div>
                <span className="section-count">04</span>
              </header>
              <div className="section-list">
                <span>
                  Tempo
                  {' '}
                  <b>150 BPM</b>
                </span>
                <span>
                  Key
                  {' '}
                  <b>B♭ Major</b>
                </span>
                <span>
                  LUFS
                  {' '}
                  <b>−8.9</b>
                </span>
              </div>
            </section>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Accordion</span>
          </header>
          <div className="component-stage">
            <div className="accordion-demo" data-accordion>
              <button className="accordion-row active">
                <span>Mix settings</span>
                <i>⌃</i>
              </button>
              <div className="accordion-content active">
                <span>Headroom</span>
                <strong>−6 dB</strong>
              </div>
              <button className="accordion-row">
                <span>Export settings</span>
                <i>⌄</i>
              </button>
              <div className="accordion-content">
                <span>Format</span>
                <strong>WAV</strong>
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Collapsible group</span>
          </header>
          <div className="component-stage">
            <div className="collapsible-demo open" data-collapsible>
              <button className="collapsible-head" type="button">
                <span>
                  <i className="group-dot" />
                  Master Chain
                </span>
                <b>4</b>
              </button>
              <div className="collapsible-items">
                <span>EQ Eight</span>
                <span>Glue Compressor</span>
                <span>Limiter</span>
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Fieldset / settings group</span>
          </header>
          <div className="component-stage">
            <fieldset className="settings-group">
              <legend>Playback</legend>
              <label>
                <span>Auto warp</span>
                <input className="switch-input" type="checkbox" defaultChecked />
                <i className="switch-track" />
              </label>
              <label>
                <span>Follow playhead</span>
                <input className="switch-input" type="checkbox" />
                <i className="switch-track" />
              </label>
            </fieldset>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Tile</span>
          </header>
          <div className="component-stage center">
            <button className="tile-demo" type="button">
              <span className="tile-icon">
                <svg className="demo-icon" viewBox="0 0 24 24">
                  <path d="M5 18V9m4 9V5m4 13v-7m4 7V7" />
                </svg>
              </span>
              <span>
                <strong>Analyze audio</strong>
                <small>Tempo, key, dynamics</small>
              </span>
              <i>↗</i>
            </button>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Dashboard widget</span>
          </header>
          <div className="component-stage center">
            <div className="widget-demo">
              <header>
                <span>Session Health</span>
                <span className="widget-status">Good</span>
              </header>
              <div className="widget-score">
                <strong>84</strong>
                <small>/ 100</small>
              </div>
              <div className="widget-bars">
                <i style={{ '--v': "74%" } as CSSProperties} />
                <i style={{ '--v': "88%" } as CSSProperties} />
                <i style={{ '--v': "64%" } as CSSProperties} />
                <i style={{ '--v': "92%" } as CSSProperties} />
                <i style={{ '--v': "81%" } as CSSProperties} />
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Drawer</span>
          </header>
          <div className="component-stage no-pad">
            <div className="drawer-demo" data-drawer>
              <div className="drawer-canvas">
                <button className="demo-btn secondary drawer-open" type="button">Open drawer</button>
              </div>
              <aside className="drawer-panel">
                <header>
                  <strong>Track details</strong>
                  <button className="drawer-close" type="button">×</button>
                </header>
                <span>Lead Vocal</span>
                <span>03:48 · WAV</span>
              </aside>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Sheet</span>
          </header>
          <div className="component-stage no-pad">
            <div className="sheet-demo" data-sheet>
              <button className="demo-btn secondary sheet-open" type="button">Open sheet</button>
              <div className="sheet-panel">
                <i className="sheet-handle" />
                <div>
                  <strong>Export options</strong>
                  <small>Choose a render preset</small>
                </div>
                <div className="sheet-actions">
                  <span>Streaming</span>
                  <span>Master</span>
                  <span>Stems</span>
                </div>
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Split pane</span>
          </header>
          <div className="component-stage no-pad">
            <div className="split-pane-demo">
              <section>
                <header>Library</header>
                <div className="split-lines">
                  <i />
                  <i />
                  <i />
                </div>
              </section>
              <span className="split-divider" />
              <section>
                <header>Inspector</header>
                <div className="split-lines narrow">
                  <i />
                  <i />
                </div>
              </section>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Resizable panel</span>
          </header>
          <div className="component-stage no-pad">
            <div className="resize-demo" id="resizeDemo">
              <div className="resize-main">
                <span>Canvas</span>
              </div>
              <div className="resize-panel" id="resizePanel">
                <span>Inspector</span>
                <i className="resize-grip" id="resizeGrip" />
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Scroll container</span>
          </header>
          <div className="component-stage center">
            <div className="scroll-demo">
              <div className="scroll-row">
                <span>01</span>
                <strong>Lead Vocal</strong>
                <small>WAV</small>
              </div>
              <div className="scroll-row">
                <span>02</span>
                <strong>Drums</strong>
                <small>GROUP</small>
              </div>
              <div className="scroll-row">
                <span>03</span>
                <strong>Bass</strong>
                <small>MIDI</small>
              </div>
              <div className="scroll-row">
                <span>04</span>
                <strong>Atmosphere</strong>
                <small>WAV</small>
              </div>
              <div className="scroll-row">
                <span>05</span>
                <strong>FX Rise</strong>
                <small>WAV</small>
              </div>
              <div className="scroll-row">
                <span>06</span>
                <strong>Synth Lead</strong>
                <small>MIDI</small>
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
