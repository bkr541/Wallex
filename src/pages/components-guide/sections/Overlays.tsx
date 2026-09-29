export default function Overlays() {
  return (
    <section className="view-panel" data-view="overlays">
      <div className="component-grid">
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Modal</span>
          </header>
          <div className="component-stage no-pad">
            <div className="overlay-demo-stage modal-preview">
              <div className="overlay-scrim" />
              <div className="modal-window">
                <div className="overlay-window-head">
                  <span>
                    <strong>Export master</strong>
                    <small>Choose how this file should be rendered.</small>
                  </span>
                  <button className="overlay-close" type="button">×</button>
                </div>
                <div className="overlay-field-row">
                  <span>Format</span>
                  <b>WAV · 24-bit</b>
                </div>
                <div className="overlay-field-row">
                  <span>Sample rate</span>
                  <b>48 kHz</b>
                </div>
                <div className="overlay-actions">
                  <button className="demo-btn ghost">Cancel</button>
                  <button className="demo-btn primary">Export</button>
                </div>
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Dialog</span>
          </header>
          <div className="component-stage center">
            <div className="dialog-demo">
              <span className="dialog-kicker">Rename project</span>
              <strong>Project title</strong>
              <input defaultValue="Reverie_08" aria-label="Project title" />
              <div className="overlay-actions">
                <button className="demo-btn ghost">Cancel</button>
                <button className="demo-btn primary">Save</button>
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Confirmation dialog</span>
          </header>
          <div className="component-stage center">
            <div className="confirm-demo">
              <span className="confirm-icon">?</span>
              <strong>Replace existing file?</strong>
              <small>Master.wav already exists in this folder.</small>
              <div className="overlay-actions">
                <button className="demo-btn ghost">Keep both</button>
                <button className="demo-btn primary">Replace</button>
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Alert dialog</span>
          </header>
          <div className="component-stage center">
            <div className="confirm-demo alert-dialog-demo">
              <span className="confirm-icon danger">!</span>
              <strong>Audio device unavailable</strong>
              <small>The selected output device is no longer connected.</small>
              <div className="overlay-actions single">
                <button className="demo-btn secondary">Dismiss</button>
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Popover</span>
          </header>
          <div className="component-stage center">
            <div className="popover-demo" data-popover-demo>
              <button className="popover-anchor demo-btn secondary" type="button">
                Track details
                {' '}
                <span>⌄</span>
              </button>
              <div className="popover-panel">
                <div>
                  <span>Key</span>
                  <strong>B♭ Major</strong>
                </div>
                <div>
                  <span>Tempo</span>
                  <strong>150 BPM</strong>
                </div>
                <div>
                  <span>Length</span>
                  <strong>03:48</strong>
                </div>
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Tooltip</span>
          </header>
          <div className="component-stage center">
            <div className="tooltip-demo">
              <button className="tooltip-target" type="button" aria-label="Quantize">Q</button>
              <span className="tooltip-bubble">Quantize · ⌘U</span>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Hover card</span>
          </header>
          <div className="component-stage center">
            <div className="hovercard-demo">
              <button className="hovercard-anchor" type="button">
                <span className="mini-wave-icon">
                  <i />
                  <i />
                  <i />
                </span>
                <span>
                  <strong>Ghostline.wav</strong>
                  <small>Hover for details</small>
                </span>
              </button>
              <div className="hovercard-panel">
                <div className="hovercard-wave">
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
                <div>
                  <strong>Ghostline.wav</strong>
                  <small>148 BPM · F#m · 24-bit</small>
                </div>
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Dropdown overlay</span>
          </header>
          <div className="component-stage center">
            <div className="dropdown-overlay-demo" data-dropdown-overlay>
              <button className="demo-btn secondary dropdown-overlay-anchor" type="button">
                View
                {' '}
                <span>⌄</span>
              </button>
              <div className="dropdown-overlay-menu">
                <button className="active">
                  Compact
                  {' '}
                  <span>✓</span>
                </button>
                <button>Comfortable</button>
                <button>Detailed</button>
                <i />
                <button>Reset layout</button>
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Drawer</span>
          </header>
          <div className="component-stage no-pad">
            <div className="overlay-panel-demo drawer-overlay-demo open" data-overlay-panel>
              <div className="overlay-canvas-lines">
                <i />
                <i />
                <i />
              </div>
              <button className="panel-trigger" type="button" data-panel-open>Open</button>
              <aside className="overlay-side-panel">
                <header>
                  <span>
                    <strong>Track inspector</strong>
                    <small>Lead Vocal</small>
                  </span>
                  <button type="button" data-panel-close>×</button>
                </header>
                <div className="panel-property">
                  <span>Gain</span>
                  <b>−2.4 dB</b>
                </div>
                <div className="panel-property">
                  <span>Pan</span>
                  <b>Center</b>
                </div>
                <div className="panel-property">
                  <span>Warp</span>
                  <b>On</b>
                </div>
              </aside>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Side sheet</span>
          </header>
          <div className="component-stage no-pad">
            <div className="overlay-panel-demo sidesheet-demo open" data-overlay-panel>
              <div className="overlay-canvas-lines">
                <i />
                <i />
                <i />
              </div>
              <button className="panel-trigger" type="button" data-panel-open>Edit</button>
              <aside className="side-sheet-panel">
                <header>
                  <strong>Project settings</strong>
                  <button type="button" data-panel-close>×</button>
                </header>
                <label>
                  <span>Tempo</span>
                  <b>150 BPM</b>
                </label>
                <label>
                  <span>Key</span>
                  <b>B♭ Major</b>
                </label>
                <label>
                  <span>Grid</span>
                  <b>1/16</b>
                </label>
                <button className="demo-btn primary">Apply</button>
              </aside>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Bottom sheet</span>
          </header>
          <div className="component-stage no-pad">
            <div className="bottom-sheet-demo open" data-bottom-sheet-demo>
              <div className="bottom-sheet-canvas">
                <div className="sheet-track">
                  <i />
                  <span>
                    <strong>Lead Vocal</strong>
                    <small>Audio track</small>
                  </span>
                </div>
              </div>
              <button className="panel-trigger bottom-trigger" type="button" data-bottom-open>Actions</button>
              <div className="bottom-overlay-sheet">
                <span className="sheet-grabber" />
                <div className="sheet-title-row">
                  <strong>Track actions</strong>
                  <button data-bottom-close type="button">×</button>
                </div>
                <div className="sheet-grid">
                  <button>Duplicate</button>
                  <button>Freeze</button>
                  <button>Color</button>
                  <button>Archive</button>
                </div>
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Lightbox</span>
          </header>
          <div className="component-stage no-pad">
            <div className="lightbox-demo open" data-lightbox-demo>
              <div className="lightbox-gallery">
                <button type="button" data-lightbox-open>
                  <span className="artwork-thumb">
                    <i />
                  </span>
                  <span>
                    <strong>Visualizer frame</strong>
                    <small>1920 × 1080</small>
                  </span>
                </button>
              </div>
              <div className="lightbox-overlay">
                <button className="lightbox-close" type="button" data-lightbox-close>×</button>
                <div className="lightbox-art">
                  <span className="lightbox-crystal">
                    <i />
                  </span>
                </div>
                <div className="lightbox-caption">
                  <strong>Visualizer frame</strong>
                  <span>1 / 6</span>
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
