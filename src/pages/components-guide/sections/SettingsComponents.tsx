export default function SettingsComponents() {
  return (
    <section className="view-panel" data-view="settings-components">
      <div className="component-grid">
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Settings row</span>
          </header>
          <div className="component-stage center">
            <div className="settingslib-row">
              <span className="settingslib-copy">
                <strong>Auto-save project</strong>
                <small>Save changes every 5 minutes</small>
              </span>
              <span className="settingslib-value">
                <b>On</b>
                <i className="settingslib-chevron" />
              </span>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Settings section</span>
          </header>
          <div className="component-stage center">
            <div className="settingslib-section">
              <header>
                Playback
                {' '}
                <span>3 options</span>
              </header>
              <div className="settingslib-row">
                <span className="settingslib-copy">
                  <strong>Audio device</strong>
                </span>
                <span className="settingslib-value">Built-in</span>
              </div>
              <div className="settingslib-row">
                <span className="settingslib-copy">
                  <strong>Buffer size</strong>
                </span>
                <span className="settingslib-value">256 samples</span>
              </div>
              <div className="settingslib-row">
                <span className="settingslib-copy">
                  <strong>Sample rate</strong>
                </span>
                <span className="settingslib-value">48 kHz</span>
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Preference toggle</span>
          </header>
          <div className="component-stage center">
            <label className="settingslib-row">
              <span className="settingslib-copy">
                <strong>Follow playhead</strong>
                <small>Keep the current position centered</small>
              </span>
              <span className="settingslib-switch">
                <input type="checkbox" defaultChecked />
                <i className="settingslib-switch-track" />
              </span>
            </label>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Key/value setting</span>
          </header>
          <div className="component-stage center">
            <div className="settingslib-keyvalue">
              <span>Project format</span>
              <strong>24-bit / 48 kHz WAV</strong>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Nested settings group</span>
          </header>
          <div className="component-stage center">
            <div className="settingslib-nested">
              <div className="settingslib-nested-head">
                <i />
                <span>Audio Engine</span>
              </div>
              <div className="settingslib-nested-body">
                <div className="settingslib-row">
                  <span className="settingslib-copy">
                    <strong>Input</strong>
                  </span>
                  <span className="settingslib-value">Scarlett 2i2</span>
                </div>
                <div className="settingslib-row">
                  <span className="settingslib-copy">
                    <strong>Output</strong>
                  </span>
                  <span className="settingslib-value">Main Out 1/2</span>
                </div>
                <div className="settingslib-row">
                  <span className="settingslib-copy">
                    <strong>Latency</strong>
                  </span>
                  <span className="settingslib-value">5.3 ms</span>
                </div>
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Permission selector</span>
          </header>
          <div className="component-stage center">
            <div className="settingslib-permissions">
              <div className="settingslib-permission">
                <span className="settingslib-permission-icon">
                  <svg className="demo-icon" viewBox="0 0 24 24">
                    <path d="M4 7h16v12H4zM8 7V5h8v2" />
                  </svg>
                </span>
                <strong>Project access</strong>
                <select>
                  <option>Editor</option>
                  <option>Viewer</option>
                  <option>Owner</option>
                </select>
              </div>
              <div className="settingslib-permission">
                <span className="settingslib-permission-icon">
                  <svg className="demo-icon" viewBox="0 0 24 24">
                    <circle cx="12" cy="8" r="3" />
                    <path d="M6 19c.8-3 2.8-5 6-5s5.2 2 6 5" />
                  </svg>
                </span>
                <strong>Guests</strong>
                <select>
                  <option>View only</option>
                  <option>Comment</option>
                  <option>Edit</option>
                </select>
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Keyboard shortcut field</span>
          </header>
          <div className="component-stage center">
            <div className="settingslib-shortcut">
              <span>
                <strong>Toggle metronome</strong>
                <small>Click keys to reassign</small>
              </span>
              <span className="settingslib-keys">
                <kbd>⌘</kbd>
                <kbd>⇧</kbd>
                <kbd>M</kbd>
              </span>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Reset-to-default control</span>
          </header>
          <div className="component-stage center">
            <div className="settingslib-reset">
              <span className="settingslib-copy">
                <strong>Restore defaults</strong>
                <small>Reset this section only</small>
              </span>
              <button className="settingslib-reset-btn" type="button" data-reset-settings>Reset</button>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Save / Apply / Cancel actions</span>
          </header>
          <div className="component-stage center">
            <div className="settingslib-actions">
              <button className="settingslib-action ghost" type="button" data-settings-action="cancel">Cancel</button>
              <button className="settingslib-action" type="button" data-settings-action="apply">Apply</button>
              <button className="settingslib-action primary" type="button" data-settings-action="save">Save</button>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
