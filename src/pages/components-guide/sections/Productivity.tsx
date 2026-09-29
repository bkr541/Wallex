export default function Productivity() {
  return (
    <section className="view-panel" data-view="productivity">
      <div className="component-grid">
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Toolbar</span>
          </header>
          <div className="component-stage center">
            <div className="app-toolbar">
              <button className="app-tool active">↖</button>
              <button className="app-tool">✥</button>
              <button className="app-tool">T</button>
              <span className="app-toolbar-sep" />
              <button className="app-tool">⌁</button>
              <button className="app-tool">◇</button>
              <span className="app-toolbar-spacer" />
              <button className="app-tool tool-accent">＋</button>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Action bar</span>
          </header>
          <div className="component-stage center">
            <div className="app-actionbar">
              <span>
                <strong>3 items selected</strong>
                <small>12.4 MB total</small>
              </span>
              <div className="app-actions-right">
                <button>Duplicate</button>
                <button>Delete</button>
                <button>Export</button>
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Inspector panel</span>
          </header>
          <div className="component-stage no-pad">
            <div className="inspector-demo">
              <div className="inspector-head">
                <strong>Inspector</strong>
                <span>Track 04</span>
              </div>
              <div className="inspector-body">
                <div className="inspector-group">
                  <span>Transform</span>
                  <div className="inspector-row">
                    <em>Position</em>
                    <b>0, 0</b>
                  </div>
                  <div className="inspector-row">
                    <em>Scale</em>
                    <b>100%</b>
                  </div>
                </div>
                <div className="inspector-group">
                  <span>Audio</span>
                  <div className="inspector-row">
                    <em>Gain</em>
                    <b>−3.0 dB</b>
                  </div>
                  <div className="inspector-row">
                    <em>Pan</em>
                    <b>Center</b>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Properties panel</span>
          </header>
          <div className="component-stage center">
            <div className="properties-demo">
              <div className="property-row">
                <span>Name</span>
                <div className="property-value">
                  Drop Vocal
                  {' '}
                  <i>⌄</i>
                </div>
              </div>
              <div className="property-row">
                <span>Type</span>
                <div className="property-value">
                  Audio Clip
                  {' '}
                  <i>⌄</i>
                </div>
              </div>
              <div className="property-row">
                <span>BPM</span>
                <div className="property-value">
                  150.00
                  {' '}
                  <i>↕</i>
                </div>
              </div>
              <div className="property-row">
                <span>Key</span>
                <div className="property-value">
                  B♭ Major
                  {' '}
                  <i>⌄</i>
                </div>
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Settings panel</span>
          </header>
          <div className="component-stage center">
            <div className="settings-panel-demo">
              <header>
                <strong>Playback</strong>
                <span>Preferences</span>
              </header>
              <div className="settings-item-demo">
                <span>
                  <strong>Auto-scroll</strong>
                  <small>Follow playhead</small>
                </span>
                <i className="mini-switch on" />
              </div>
              <div className="settings-item-demo">
                <span>
                  <strong>Loop region</strong>
                  <small>Repeat selection</small>
                </span>
                <i className="mini-switch" />
              </div>
              <div className="settings-item-demo">
                <span>
                  <strong>Snap to grid</strong>
                  <small>1/16 note</small>
                </span>
                <i className="mini-switch on" />
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Dock</span>
          </header>
          <div className="component-stage no-pad">
            <div className="dock-demo">
              <div className="dock-window">
                <i />
                <i />
                <i />
              </div>
              <div className="app-dock">
                <span className="dock-item">LIB</span>
                <span className="dock-item active">ARR</span>
                <span className="dock-item">MIX</span>
                <span className="dock-item">FX</span>
                <span className="dock-item">EXP</span>
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Status bar</span>
          </header>
          <div className="component-stage center">
            <div className="statusbar-demo">
              <div className="statusbar-left">
                <span className="status-ok" />
                <b>Ready</b>
                <span>48 kHz</span>
                <span>24-bit</span>
              </div>
              <div className="statusbar-right">
                <span>
                  CPU
                  {' '}
                  <b>18%</b>
                </span>
                <span>150 BPM</span>
                <span>4/4</span>
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Workspace</span>
          </header>
          <div className="component-stage no-pad">
            <div className="workspace-demo">
              <div className="workspace-rail">
                <i className="active" />
                <i />
                <i />
                <i />
              </div>
              <div className="workspace-canvas">
                <span className="workspace-object" />
              </div>
              <div className="workspace-inspector">
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>
              <div className="workspace-footer">
                <i />
                <i className="active" />
                <i />
                <i />
                <i />
                <i />
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Canvas</span>
          </header>
          <div className="component-stage no-pad">
            <div className="canvas-demo">
              <span className="canvas-link one" />
              <span className="canvas-link two" />
              <div className="canvas-node a">Audio Input</div>
              <div className="canvas-node b">Reverb</div>
              <div className="canvas-node c">Output</div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Editor</span>
          </header>
          <div className="component-stage no-pad">
            <div className="editor-demo">
              <div className="editor-toolbar">
                <button className="active">B</button>
                <button>I</button>
                <button>U</button>
                <button>H1</button>
                <button>•</button>
              </div>
              <div className="editor-sheet">
                <h4>Session notes</h4>
                <p>
                  Build tension through the second phrase, then open the stereo image before the drop.
                  <span className="editor-cursor" />
                </p>
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Code editor</span>
          </header>
          <div className="component-stage no-pad">
            <div className="code-editor-demo">
              <div className="code-lines">
                1
                <br />
                2
                <br />
                3
                <br />
                4
                <br />
                5
                <br />
                6
              </div>
              <div className="code-content">
                <span className="code-key">{"const"}</span>
                {" cue = {\n  bpm: "}
                <span className="code-num">{"150"}</span>
                {",\n  key: "}
                <span className="code-str">{"'Bb Major'"}</span>
                {",\n  trigger: "}
                <span className="code-fn">{"onDrop"}</span>
                {",\n  intensity: "}
                <span className="code-num">{"0.86"}</span>
                {"\n};"}
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">File browser</span>
          </header>
          <div className="component-stage no-pad">
            <div className="file-browser-demo">
              <div className="file-browser-head">
                <span>Project Files</span>
                <span>14 items</span>
              </div>
              <div className="file-list">
                <div className="file-row-demo active">
                  <span className="file-kind">W</span>
                  <span>Master.wav</span>
                  <small>48 MB</small>
                </div>
                <div className="file-row-demo">
                  <span className="file-kind">A</span>
                  <span>Drop.als</span>
                  <small>2.1 MB</small>
                </div>
                <div className="file-row-demo">
                  <span className="file-kind">M</span>
                  <span>Lead.mid</span>
                  <small>18 KB</small>
                </div>
                <div className="file-row-demo">
                  <span className="file-kind">P</span>
                  <span>Artwork.png</span>
                  <small>8.4 MB</small>
                </div>
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Folder tree</span>
          </header>
          <div className="component-stage center">
            <div className="folder-tree-demo" data-folder-tree>
              <div className="folder-row-demo active">
                <span className="folder-chevron">⌄</span>
                <span className="folder-icon-demo" />
                <span>Project</span>
              </div>
              <div className="folder-row-demo depth-1">
                <span className="folder-chevron">⌄</span>
                <span className="folder-icon-demo" />
                <span>Audio</span>
              </div>
              <div className="folder-row-demo depth-2">
                <span className="folder-chevron" />
                <span className="folder-icon-demo" />
                <span>Vocals</span>
              </div>
              <div className="folder-row-demo depth-2">
                <span className="folder-chevron" />
                <span className="folder-icon-demo" />
                <span>Drums</span>
              </div>
              <div className="folder-row-demo depth-1">
                <span className="folder-chevron">›</span>
                <span className="folder-icon-demo" />
                <span>Exports</span>
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Search results panel</span>
          </header>
          <div className="component-stage center">
            <div className="search-results-demo">
              <div className="search-result-row">
                <span className="result-icon">WAV</span>
                <span>
                  <strong>Vocal Chop 07</strong>
                  <small>Samples / Vocals</small>
                </span>
                <b>148 BPM</b>
              </div>
              <div className="search-result-row">
                <span className="result-icon">ALS</span>
                <span>
                  <strong>Vocal Drop</strong>
                  <small>Projects / Ideas</small>
                </span>
                <b>Yesterday</b>
              </div>
              <div className="search-result-row">
                <span className="result-icon">FX</span>
                <span>
                  <strong>Vocal Air</strong>
                  <small>Presets / Reverb</small>
                </span>
                <b>Preset</b>
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Recent-items panel</span>
          </header>
          <div className="component-stage center">
            <div className="recent-panel-demo">
              <div className="recent-item-demo">
                <span className="media-art recent-thumb" />
                <span>
                  <strong>Reverie_08</strong>
                  <small>Ableton project</small>
                </span>
                <small>4m</small>
              </div>
              <div className="recent-item-demo">
                <span className="media-art recent-thumb" />
                <span>
                  <strong>Master_v12.wav</strong>
                  <small>Audio export</small>
                </span>
                <small>18m</small>
              </div>
              <div className="recent-item-demo">
                <span className="media-art recent-thumb" />
                <span>
                  <strong>Crystal_Stage</strong>
                  <small>Visual preset</small>
                </span>
                <small>1h</small>
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">History panel</span>
          </header>
          <div className="component-stage center">
            <div className="history-panel-demo">
              <div className="history-row-demo">
                <span className="history-dot" />
                <span>
                  <strong>Exported master</strong>
                  <small>Master_v12.wav</small>
                </span>
                <b>1m</b>
              </div>
              <div className="history-row-demo">
                <span className="history-dot" />
                <span>
                  <strong>Adjusted gain</strong>
                  <small>Lead Synth · −2.4 dB</small>
                </span>
                <b>8m</b>
              </div>
              <div className="history-row-demo">
                <span className="history-dot" />
                <span>
                  <strong>Added track</strong>
                  <small>Atmosphere</small>
                </span>
                <b>22m</b>
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
