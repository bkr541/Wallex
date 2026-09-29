export default function Selection() {
  return (
    <section className="view-panel" data-view="selection">
      <div className="component-grid">
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Tabs</span>
          </header>
          <div className="component-stage center">
            <div className="selection-tabs" data-selection-tabs>
              <button className="active">Library</button>
              <button>Projects</button>
              <button>Exports</button>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Segmented control</span>
          </header>
          <div className="component-stage center">
            <div className="segmented-control" data-segmented>
              <button className="active">Waveform</button>
              <button>Spectrum</button>
              <button>Meter</button>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Filter bar</span>
          </header>
          <div className="component-stage center">
            <div className="filter-bar-demo">
              <div className="filter-search">
                <span>⌕</span>
                <input defaultValue="vocal" aria-label="Filter" />
                <kbd>⌘F</kbd>
              </div>
              <button className="filter-button active">
                Type
                {' '}
                <b>Audio</b>
              </button>
              <button className="filter-button">
                BPM
                {' '}
                <b>140–155</b>
              </button>
              <button className="filter-clear">Clear</button>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Filter chip</span>
          </header>
          <div className="component-stage flex-center">
            <button className="filter-chip-demo active" type="button">
              Melodic Bass
              {' '}
              <span>×</span>
            </button>
            <button className="filter-chip-demo" type="button">150 BPM</button>
            <button className="filter-chip-demo" type="button">Vocal</button>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Sort control</span>
          </header>
          <div className="component-stage center">
            <button className="sort-control-demo" type="button" data-sort-control>
              <span>
                <small>Sort by</small>
                <strong>Date modified</strong>
              </span>
              <i>↓</i>
            </button>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Pagination</span>
          </header>
          <div className="component-stage center">
            <nav className="pagination-demo" data-pagination>
              <button disabled>‹</button>
              <button className="active">1</button>
              <button>2</button>
              <button>3</button>
              <span>…</span>
              <button>12</button>
              <button>›</button>
            </nav>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Stepper</span>
          </header>
          <div className="component-stage center">
            <div className="stepper-demo" data-stepper>
              <button className="done">
                <span>✓</span>
                <small>Import</small>
              </button>
              <i />
              <button className="active">
                <span>2</span>
                <small>Analyze</small>
              </button>
              <i />
              <button>
                <span>3</span>
                <small>Review</small>
              </button>
              <i />
              <button>
                <span>4</span>
                <small>Export</small>
              </button>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Wizard</span>
          </header>
          <div className="component-stage center">
            <div className="wizard-demo" data-wizard>
              <div className="wizard-progress">
                <span className="active" />
                <span />
                <span />
              </div>
              <div className="wizard-page">
                <small>STEP 1 OF 3</small>
                <strong>Choose source folders</strong>
                <p>Select the directories this workspace should index.</p>
              </div>
              <div className="wizard-actions">
                <button className="demo-btn ghost" data-wizard-back disabled>Back</button>
                <button className="demo-btn primary" data-wizard-next>Continue</button>
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Category selector</span>
          </header>
          <div className="component-stage center">
            <div className="category-selector" data-category-selector>
              <button className="active">
                <span className="category-mark drums">
                  <i />
                  <i />
                  <i />
                </span>
                <strong>Drums</strong>
                <small>248</small>
              </button>
              <button>
                <span className="category-mark synth">
                  <i />
                  <i />
                </span>
                <strong>Synth</strong>
                <small>184</small>
              </button>
              <button>
                <span className="category-mark vocal">
                  <i />
                </span>
                <strong>Vocals</strong>
                <small>96</small>
              </button>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Tree selector</span>
          </header>
          <div className="component-stage center">
            <div className="tree-selector-demo" data-tree-selector>
              <label className="tree-select-row root">
                <input type="checkbox" />
                <span className="tree-checkbox" />
                <i>⌄</i>
                <strong>Samples</strong>
                <small>386</small>
              </label>
              <div className="tree-select-children">
                <label className="tree-select-row">
                  <input type="checkbox" defaultChecked />
                  <span className="tree-checkbox" />
                  <i />
                  <strong>Drums</strong>
                  <small>248</small>
                </label>
                <label className="tree-select-row">
                  <input type="checkbox" />
                  <span className="tree-checkbox" />
                  <i />
                  <strong>Vocals</strong>
                  <small>96</small>
                </label>
                <label className="tree-select-row">
                  <input type="checkbox" defaultChecked />
                  <span className="tree-checkbox" />
                  <i />
                  <strong>FX</strong>
                  <small>42</small>
                </label>
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Transfer list</span>
          </header>
          <div className="component-stage center">
            <div className="transfer-list-demo" data-transfer-list>
              <section>
                <header>
                  Available
                  {' '}
                  <span>3</span>
                </header>
                <button className="selected">Drums</button>
                <button>Synths</button>
                <button>Vocals</button>
              </section>
              <div className="transfer-actions">
                <button data-transfer-right>›</button>
                <button data-transfer-left>‹</button>
              </div>
              <section>
                <header>
                  Selected
                  {' '}
                  <span>2</span>
                </header>
                <button>Bass</button>
                <button>Atmosphere</button>
              </section>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Drag-and-drop item</span>
          </header>
          <div className="component-stage center">
            <div className="drag-drop-demo" data-drag-demo>
              <div className="drag-item-demo" draggable="true">
                <span className="drag-handle-dots">
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
                <span>
                  <strong>Vocal Chop 07</strong>
                  <small>WAV · 148 BPM</small>
                </span>
                <b>03:21</b>
              </div>
              <div className="drop-target-demo">Drop into playlist</div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Reorder handle</span>
          </header>
          <div className="component-stage center">
            <div className="reorder-list-demo" data-reorder-list>
              <div className="reorder-row" draggable="true">
                <span className="reorder-handle">
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
                <strong>Intro</strong>
                <small>16 bars</small>
              </div>
              <div className="reorder-row" draggable="true">
                <span className="reorder-handle">
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
                <strong>Build</strong>
                <small>16 bars</small>
              </div>
              <div className="reorder-row active" draggable="true">
                <span className="reorder-handle">
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
                <strong>Drop</strong>
                <small>32 bars</small>
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
