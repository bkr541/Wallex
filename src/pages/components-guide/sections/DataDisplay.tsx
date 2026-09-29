import type { CSSProperties } from 'react';

export default function DataDisplay() {
  return (
    <section className="view-panel" data-view="data-display">
      <div className="component-grid">
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Table</span>
          </header>
          <div className="component-stage no-pad">
            <div className="table-demo">
              <div className="table-row table-head">
                <span>Track</span>
                <span>Type</span>
                <span>Length</span>
                <span>Key</span>
              </div>
              <div className="table-row">
                <strong>Lead Vocal</strong>
                <span>Audio</span>
                <span>03:48</span>
                <span>B♭</span>
              </div>
              <div className="table-row">
                <strong>Drums</strong>
                <span>Group</span>
                <span>03:48</span>
                <span>—</span>
              </div>
              <div className="table-row">
                <strong>Bass</strong>
                <span>MIDI</span>
                <span>03:48</span>
                <span>B♭</span>
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Data grid</span>
          </header>
          <div className="component-stage no-pad">
            <div className="data-grid-demo">
              <div className="data-grid-toolbar">
                <span>6 items</span>
                <div>
                  <button>Filter</button>
                  <button>Columns</button>
                </div>
              </div>
              <div className="data-grid-head">
                <span />
                <span>Name</span>
                <span>BPM</span>
                <span>Key</span>
                <span>State</span>
              </div>
              <label className="data-grid-row">
                <input type="checkbox" />
                <i />
                <strong>Reverie</strong>
                <span>150</span>
                <span>6B</span>
                <b>Ready</b>
              </label>
              <label className="data-grid-row">
                <input type="checkbox" defaultChecked />
                <i />
                <strong>Afterglow</strong>
                <span>142</span>
                <span>9A</span>
                <b>Ready</b>
              </label>
              <label className="data-grid-row">
                <input type="checkbox" />
                <i />
                <strong>Ghostline</strong>
                <span>128</span>
                <span>11A</span>
                <b className="muted">Draft</b>
              </label>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">List</span>
          </header>
          <div className="component-stage center">
            <div className="list-demo">
              <div className="list-demo-row">
                <span className="list-avatar">A</span>
                <span>
                  <strong>Atmosphere</strong>
                  <small>12 samples</small>
                </span>
                <b>›</b>
              </div>
              <div className="list-demo-row">
                <span className="list-avatar">D</span>
                <span>
                  <strong>Drums</strong>
                  <small>42 samples</small>
                </span>
                <b>›</b>
              </div>
              <div className="list-demo-row">
                <span className="list-avatar">V</span>
                <span>
                  <strong>Vocals</strong>
                  <small>18 samples</small>
                </span>
                <b>›</b>
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">List item</span>
          </header>
          <div className="component-stage center">
            <button className="single-list-item" type="button">
              <span className="list-wave">
                <i />
                <i />
                <i />
                <i />
                <i />
              </span>
              <span className="single-list-copy">
                <strong>Vocal Chop 07</strong>
                <small>WAV · 148 BPM · F#m</small>
              </span>
              <span className="single-list-more">•••</span>
            </button>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Tree view</span>
          </header>
          <div className="component-stage center">
            <div className="tree-demo" data-tree>
              <button className="tree-node branch open">
                <span className="tree-caret">›</span>
                <i className="folder-icon" />
                <strong>Samples</strong>
              </button>
              <div className="tree-children">
                <button className="tree-node branch open">
                  <span className="tree-caret">›</span>
                  <i className="folder-icon" />
                  <span>Drums</span>
                </button>
                <div className="tree-children nested">
                  <button className="tree-node leaf">
                    <span />
                    <i className="file-dot" />
                    <span>Kicks</span>
                  </button>
                  <button className="tree-node leaf">
                    <span />
                    <i className="file-dot" />
                    <span>Snares</span>
                  </button>
                </div>
                <button className="tree-node leaf">
                  <span />
                  <i className="file-dot accent" />
                  <span>Vocals</span>
                </button>
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Hierarchical tree</span>
          </header>
          <div className="component-stage center">
            <div className="hierarchy-demo">
              <div className="hierarchy-root">Session</div>
              <div className="hierarchy-line-v" />
              <div className="hierarchy-branches">
                <span />
                <span />
                <span />
              </div>
              <div className="hierarchy-level">
                <div>
                  <strong>Drums</strong>
                  <small>8</small>
                </div>
                <div>
                  <strong>Music</strong>
                  <small>12</small>
                </div>
                <div>
                  <strong>Vocals</strong>
                  <small>6</small>
                </div>
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Key-value property list</span>
          </header>
          <div className="component-stage center">
            <dl className="kv-demo">
              <div>
                <dt>Tempo</dt>
                <dd>150 BPM</dd>
              </div>
              <div>
                <dt>Key</dt>
                <dd>B♭ Major</dd>
              </div>
              <div>
                <dt>Sample rate</dt>
                <dd>48 kHz</dd>
              </div>
              <div>
                <dt>Bit depth</dt>
                <dd>24-bit</dd>
              </div>
            </dl>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Description list</span>
          </header>
          <div className="component-stage center">
            <dl className="description-demo">
              <div>
                <dt>Project</dt>
                <dd>Reverie</dd>
              </div>
              <div>
                <dt>Modified</dt>
                <dd>Today, 11:42 PM</dd>
              </div>
              <div>
                <dt>Location</dt>
                <dd>Music / Ableton / Active</dd>
              </div>
            </dl>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Timeline</span>
          </header>
          <div className="component-stage center">
            <div className="timeline-demo">
              <div className="timeline-item done">
                <i />
                <span>
                  <strong>Imported</strong>
                  <small>10:22 PM</small>
                </span>
              </div>
              <div className="timeline-item done">
                <i />
                <span>
                  <strong>Analyzed</strong>
                  <small>10:24 PM</small>
                </span>
              </div>
              <div className="timeline-item active">
                <i />
                <span>
                  <strong>Mastering</strong>
                  <small>In progress</small>
                </span>
              </div>
              <div className="timeline-item">
                <i />
                <span>
                  <strong>Export</strong>
                  <small>Pending</small>
                </span>
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Activity feed</span>
          </header>
          <div className="component-stage center">
            <div className="activity-demo">
              <div className="activity-row">
                <span className="activity-icon">↻</span>
                <span>
                  <strong>Project analyzed</strong>
                  <small>Reverie · 2m ago</small>
                </span>
              </div>
              <div className="activity-row">
                <span className="activity-icon">+</span>
                <span>
                  <strong>Tag added</strong>
                  <small>Melodic Bass · 8m ago</small>
                </span>
              </div>
              <div className="activity-row">
                <span className="activity-icon">↓</span>
                <span>
                  <strong>Stem exported</strong>
                  <small>Lead Vocal · 17m ago</small>
                </span>
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Statistics / KPI card</span>
          </header>
          <div className="component-stage center">
            <div className="kpi-demo">
              <div className="kpi-top">
                <span>Library size</span>
                <span className="kpi-delta">+12%</span>
              </div>
              <strong>8,426</strong>
              <small>samples indexed</small>
              <div className="kpi-spark">
                <i style={{ '--h': "22%" } as CSSProperties} />
                <i style={{ '--h': "32%" } as CSSProperties} />
                <i style={{ '--h': "29%" } as CSSProperties} />
                <i style={{ '--h': "46%" } as CSSProperties} />
                <i style={{ '--h': "53%" } as CSSProperties} />
                <i style={{ '--h': "49%" } as CSSProperties} />
                <i style={{ '--h': "67%" } as CSSProperties} />
                <i style={{ '--h': "76%" } as CSSProperties} />
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Progress bar</span>
          </header>
          <div className="component-stage center">
            <div className="progress-demo">
              <div>
                <span>Analyzing audio</span>
                <strong>72%</strong>
              </div>
              <div className="progress-track">
                <i style={{ width: "72%" } as CSSProperties} />
              </div>
              <small>18 of 25 files</small>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Progress ring</span>
          </header>
          <div className="component-stage center">
            <div className="ring-demo">
              <div className="progress-ring" style={{ '--progress': "78%" } as CSSProperties}>
                <span>
                  78
                  <small>%</small>
                </span>
              </div>
              <div>
                <strong>Analysis</strong>
                <small>39 of 50 tracks</small>
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Meter / gauge</span>
          </header>
          <div className="component-stage center">
            <div className="gauge-demo">
              <div className="gauge">
                <span className="gauge-arc" />
                <i className="gauge-needle" />
                <b />
              </div>
              <strong>−8.9 LUFS</strong>
              <small>Integrated loudness</small>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Chart</span>
          </header>
          <div className="component-stage center">
            <div className="bar-chart-demo">
              <div className="chart-y">
                <span>100</span>
                <span>50</span>
                <span>0</span>
              </div>
              <div className="bar-chart-plot">
                <i style={{ '--v': "42%" } as CSSProperties} />
                <i style={{ '--v': "65%" } as CSSProperties} />
                <i style={{ '--v': "58%" } as CSSProperties} />
                <i className="active" style={{ '--v': "88%" } as CSSProperties} />
                <i style={{ '--v': "73%" } as CSSProperties} />
                <i style={{ '--v': "53%" } as CSSProperties} />
              </div>
              <div className="chart-x">
                <span>M</span>
                <span>T</span>
                <span>W</span>
                <span>T</span>
                <span>F</span>
                <span>S</span>
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Graph</span>
          </header>
          <div className="component-stage center">
            <div className="graph-demo">
              <svg viewBox="0 0 280 128" preserveAspectRatio="none" aria-hidden="true">
                <path className="graph-grid" d="M0 24H280M0 64H280M0 104H280M56 0V128M112 0V128M168 0V128M224 0V128" />
                <path className="graph-area" d="M0 105 C28 95,36 84,58 88 S94 54,116 61 S146 75,168 52 S205 30,224 40 S255 24,280 19 L280 128 L0 128 Z" />
                <path className="graph-line" d="M0 105 C28 95,36 84,58 88 S94 54,116 61 S146 75,168 52 S205 30,224 40 S255 24,280 19" />
              </svg>
              <div className="graph-legend">
                <span>
                  <i />
                  Energy
                </span>
                <strong>+18.4%</strong>
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Sparkline</span>
          </header>
          <div className="component-stage center">
            <div className="sparkline-demo">
              <div>
                <span>Peak level</span>
                <strong>−0.8 dB</strong>
              </div>
              <svg viewBox="0 0 250 64" preserveAspectRatio="none">
                <path className="spark-fill" d="M0 50 C20 48,24 30,44 34 S74 45,91 24 S120 19,137 30 S162 47,181 29 S211 15,250 8 L250 64 L0 64Z" />
                <path className="spark-line" d="M0 50 C20 48,24 30,44 34 S74 45,91 24 S120 19,137 30 S162 47,181 29 S211 15,250 8" />
              </svg>
              <small>Last 60 seconds</small>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
