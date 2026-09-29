export default function Forms() {
  return (
    <section className="view-panel" data-view="forms">
      <div className="component-grid">
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Text input</span>
          </header>
          <div className="component-stage center">
            <label className="field-control">
              <span className="control-label">Track name</span>
              <input className="control-input" type="text" defaultValue="Reverie_08" />
            </label>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Textarea</span>
          </header>
          <div className="component-stage center">
            <label className="field-control">
              <span className="control-label">Notes</span>
              <textarea className="control-textarea" defaultValue="Atmospheric intro, wider vocal in the second drop." />
              <span className="control-meta">56 / 240</span>
            </label>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Search field</span>
          </header>
          <div className="component-stage center">
            <label className="search-control">
              <svg className="demo-icon" viewBox="0 0 24 24">
                <circle cx="10.5" cy="10.5" r="5.5" />
                <path d="m15 15 4 4" />
              </svg>
              <input type="search" placeholder="Search samples" />
              <kbd>⌘ K</kbd>
            </label>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Password field</span>
          </header>
          <div className="component-stage center">
            <label className="field-control">
              <span className="control-label">Password</span>
              <span className="input-with-action">
                <input className="control-input" id="passwordDemo" type="password" defaultValue="daydream2026" />
                <button className="input-action" id="passwordToggle" type="button" aria-label="Show password">
                  <svg className="demo-icon" viewBox="0 0 24 24">
                    <path d="M3 12s3.2-5 9-5 9 5 9 5-3.2 5-9 5-9-5-9-5Z" />
                    <circle cx="12" cy="12" r="2.5" />
                  </svg>
                </button>
              </span>
            </label>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Number input</span>
          </header>
          <div className="component-stage center">
            <label className="number-control">
              <span className="control-label">Tempo</span>
              <span className="number-shell">
                <input id="numberDemo" type="number" defaultValue="150" min="40" max="240" />
                <span className="number-unit">BPM</span>
                <span className="number-steps">
                  <button type="button" data-number-step="1">+</button>
                  <button type="button" data-number-step="-1">−</button>
                </span>
              </span>
            </label>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Checkbox</span>
          </header>
          <div className="component-stage center">
            <label className="choice-row">
              <input className="choice-input checkbox" type="checkbox" defaultChecked />
              <span className="choice-mark" />
              <span className="choice-copy">
                <strong>Normalize audio</strong>
                <small>Apply gain before export</small>
              </span>
            </label>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Radio button</span>
          </header>
          <div className="component-stage center">
            <div className="radio-stack">
              <label className="choice-row compact">
                <input className="choice-input radio" name="quality" type="radio" defaultChecked />
                <span className="choice-mark" />
                <span>High quality</span>
              </label>
              <label className="choice-row compact">
                <input className="choice-input radio" name="quality" type="radio" />
                <span className="choice-mark" />
                <span>Draft render</span>
              </label>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Toggle / switch</span>
          </header>
          <div className="component-stage center">
            <label className="switch-row">
              <span>
                <strong>Auto-save</strong>
                <small>Save changes continuously</small>
              </span>
              <input className="switch-input" type="checkbox" defaultChecked />
              <i className="switch-track" />
            </label>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Select / dropdown</span>
          </header>
          <div className="component-stage center">
            <label className="field-control">
              <span className="control-label">Key</span>
              <span className="select-shell">
                <select>
                  <option>B♭ Major</option>
                  <option>G Major</option>
                  <option>E Minor</option>
                </select>
                <svg className="demo-icon" viewBox="0 0 24 24">
                  <path d="m8 10 4 4 4-4" />
                </svg>
              </span>
            </label>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Multi-select</span>
          </header>
          <div className="component-stage center">
            <div className="multi-select-demo" data-multi-select>
              <button type="button" className="multi-chip active">Bass</button>
              <button type="button" className="multi-chip active">Vocal</button>
              <button type="button" className="multi-chip">Drums</button>
              <button type="button" className="multi-chip">FX</button>
              <button type="button" className="multi-chip">Synth</button>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Combo box</span>
          </header>
          <div className="component-stage center">
            <div className="combo-control">
              <label className="control-label" htmlFor="comboDemo">Sample type</label>
              <span className="combo-shell">
                <input id="comboDemo" defaultValue="Synth" />
                <button className="input-action combo-toggle" type="button">⌄</button>
              </span>
              <div className="combo-menu">
                <button type="button">Synth</button>
                <button type="button">Bass</button>
                <button type="button">Vocal</button>
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Autocomplete</span>
          </header>
          <div className="component-stage center">
            <div className="autocomplete-control">
              <label className="control-label" htmlFor="autocompleteDemo">Plugin</label>
              <input className="control-input" id="autocompleteDemo" defaultValue="Ser" />
              <div className="autocomplete-menu">
                <button type="button">
                  <strong>Serum</strong>
                  <small>Xfer Records</small>
                </button>
                <button type="button">
                  <strong>Serato Sample</strong>
                  <small>Serato</small>
                </button>
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Slider</span>
          </header>
          <div className="component-stage center">
            <label className="slider-control">
              <span className="slider-head">
                <span>Gain</span>
                <output id="sliderValue">72%</output>
              </span>
              <input id="sliderDemo" className="range-input" type="range" min="0" max="100" defaultValue="72" />
            </label>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Range slider</span>
          </header>
          <div className="component-stage center">
            <div className="range-control">
              <div className="slider-head">
                <span>Frequency</span>
                <output id="rangeValue">180 Hz – 12 kHz</output>
              </div>
              <div className="dual-range">
                <div className="dual-range-track" />
                <input id="rangeLow" type="range" min="0" max="100" defaultValue="18" />
                <input id="rangeHigh" type="range" min="0" max="100" defaultValue="76" />
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Date picker</span>
          </header>
          <div className="component-stage center">
            <label className="field-control">
              <span className="control-label">Session date</span>
              <span className="date-shell">
                <input className="control-input" type="date" defaultValue="2026-09-26" />
              </span>
            </label>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Time picker</span>
          </header>
          <div className="component-stage center">
            <label className="field-control">
              <span className="control-label">Start time</span>
              <span className="date-shell">
                <input className="control-input" type="time" defaultValue="22:30" />
              </span>
            </label>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Date-range picker</span>
          </header>
          <div className="component-stage center">
            <div className="date-range-control">
              <span className="control-label">Project window</span>
              <div className="date-range-fields">
                <input type="date" defaultValue="2026-09-22" />
                <span>→</span>
                <input type="date" defaultValue="2026-09-26" />
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Color picker</span>
          </header>
          <div className="component-stage center">
            <label className="color-control">
              <input id="colorDemo" type="color" defaultValue="#5ce6d1" />
              <span className="color-swatch" id="colorSwatch" />
              <span>
                <strong id="colorValue">#5CE6D1</strong>
                <small>Accent color</small>
              </span>
            </label>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">File picker / upload</span>
          </header>
          <div className="component-stage center">
            <label className="file-control">
              <input id="fileDemo" type="file" accept="audio/*" />
              <span className="file-icon">
                <svg className="demo-icon" viewBox="0 0 24 24">
                  <path d="M12 16V5m0 0-4 4m4-4 4 4" />
                  <path d="M5 15v4h14v-4" />
                </svg>
              </span>
              <span className="file-copy">
                <strong id="fileName">Choose audio file</strong>
                <small>WAV, AIFF, MP3</small>
              </span>
              <span className="file-browse">Browse</span>
            </label>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Drag-and-drop upload zone</span>
          </header>
          <div className="component-stage center">
            <label className="drop-zone" id="dropZone">
              <input id="dropFile" type="file" hidden />
              <svg className="demo-icon" viewBox="0 0 24 24">
                <path d="M12 15V6m0 0L8.5 9.5M12 6l3.5 3.5" />
                <path d="M5 14v4h14v-4" />
              </svg>
              <strong id="dropZoneTitle">Drop files here</strong>
              <small>or click to browse</small>
            </label>
          </div>
        </article>
      </div>
    </section>
  );
}
