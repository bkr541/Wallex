export default function Discovery() {
  return (
    <section className="view-panel" data-view="discovery">
      <div className="component-grid">
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Global search</span>
          </header>
          <div className="component-stage center">
            <div className="search-global-demo">
              <label className="global-search-shell">
                <svg viewBox="0 0 24 24">
                  <circle cx="10.5" cy="10.5" r="6.5" />
                  <path d="M15.5 15.5L21 21" />
                </svg>
                <input type="search" placeholder="Search projects, samples, commands…" />
                <span className="search-shortcut">⌘ K</span>
              </label>
              <small>Search across the entire workspace</small>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Inline search</span>
          </header>
          <div className="component-stage center">
            <label className="inline-search-demo">
              <svg viewBox="0 0 24 24">
                <circle cx="10.5" cy="10.5" r="6.5" />
                <path d="M15.5 15.5L21 21" />
              </svg>
              <input type="search" placeholder="Search tracks" />
              <button type="button" aria-label="Clear">×</button>
            </label>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Search suggestions</span>
          </header>
          <div className="component-stage center">
            <div className="search-suggestions-demo">
              <div className="suggest-query">
                Search for
                {' '}
                <b>lead</b>
              </div>
              <div className="suggest-row active">
                <span className="suggest-icon">⌕</span>
                <span>Lead Synth</span>
                <small>Track</small>
              </div>
              <div className="suggest-row">
                <span className="suggest-icon">⌕</span>
                <span>Lead Vocal</span>
                <small>Audio</small>
              </div>
              <div className="suggest-row">
                <span className="suggest-icon">⌕</span>
                <span>Lead Layer</span>
                <small>Group</small>
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Recent searches</span>
          </header>
          <div className="component-stage center">
            <div className="recent-searches-demo" data-recent-searches>
              <div className="recent-search-row">
                <span className="recent-clock">↺</span>
                <strong>melodic bass</strong>
                <button>×</button>
              </div>
              <div className="recent-search-row">
                <span className="recent-clock">↺</span>
                <strong>150 bpm vocals</strong>
                <button>×</button>
              </div>
              <div className="recent-search-row">
                <span className="recent-clock">↺</span>
                <strong>crystal visual</strong>
                <button>×</button>
              </div>
              <button className="recent-clear" type="button">Clear recent</button>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Search filters</span>
          </header>
          <div className="component-stage center">
            <div className="search-filter-bar" data-search-filters>
              <button className="search-filter-btn active">Audio</button>
              <button className="search-filter-btn">Projects</button>
              <button className="search-filter-btn">Presets</button>
              <button className="search-filter-btn">Images</button>
              <button className="search-filter-reset">Reset</button>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Faceted filters</span>
          </header>
          <div className="component-stage center">
            <div className="facets-demo">
              <div className="facet-group">
                <div className="facet-head">
                  <strong>Type</strong>
                  <span>2 selected</span>
                </div>
                <div className="facet-options">
                  <button className="facet-option selected">Loop</button>
                  <button className="facet-option selected">One-shot</button>
                  <button className="facet-option">Stem</button>
                </div>
              </div>
              <div className="facet-group">
                <div className="facet-head">
                  <strong>Key</strong>
                  <span>Any</span>
                </div>
                <div className="facet-options">
                  <button className="facet-option">A</button>
                  <button className="facet-option">B♭</button>
                  <button className="facet-option">E</button>
                  <button className="facet-option">G</button>
                </div>
              </div>
              <div className="facet-group">
                <div className="facet-head">
                  <strong>BPM</strong>
                  <span>140–155</span>
                </div>
                <div className="facet-options">
                  <button className="facet-option selected">140–155</button>
                  <button className="facet-option">160+</button>
                </div>
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Sort dropdown</span>
          </header>
          <div className="component-stage center">
            <div className="sort-dropdown-demo" data-sort-dropdown>
              <button className="sort-trigger" type="button">
                <span>Sort by</span>
                <strong data-sort-label>Recently modified</strong>
                <b>⌄</b>
              </button>
              <div className="sort-menu-demo">
                <button className="active" data-sort-option>Recently modified</button>
                <button data-sort-option>Name</button>
                <button data-sort-option>Date created</button>
                <button data-sort-option>File size</button>
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Results list</span>
          </header>
          <div className="component-stage center">
            <div className="results-list-demo">
              <div className="result-item-demo">
                <span className="result-thumb">W</span>
                <span className="result-copy">
                  <strong>Lead Vocal Chop.wav</strong>
                  <small>Audio · 150 BPM · E minor</small>
                </span>
                <span className="result-score">98%</span>
              </div>
              <div className="result-item-demo">
                <span className="result-thumb">A</span>
                <span className="result-copy">
                  <strong>Reverie Lead.als</strong>
                  <small>Project · modified today</small>
                </span>
                <span className="result-score">91%</span>
              </div>
              <div className="result-item-demo">
                <span className="result-thumb">P</span>
                <span className="result-copy">
                  <strong>Lead Stack.adg</strong>
                  <small>Preset · Instrument Rack</small>
                </span>
                <span className="result-score">84%</span>
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Search highlighting</span>
          </header>
          <div className="component-stage center">
            <div className="highlight-demo">
              <span>3 matches in project notes</span>
              <p>
                The
                {' '}
                <mark>lead vocal</mark>
                {' '}
                enters after the second build. Double the
                {' '}
                <mark>lead</mark>
                {' '}
                with a wider layer, then automate the
                {' '}
                <mark>vocal</mark>
                {' '}
                send into the drop.
              </p>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Command/search hybrid</span>
          </header>
          <div className="component-stage center">
            <div className="command-search-demo">
              <div className="command-search-input">
                <span>›</span>
                <input defaultValue="export" aria-label="Command search" />
                <kbd>ESC</kbd>
              </div>
              <div className="command-search-results">
                <div className="command-search-row active">
                  <i>⇧</i>
                  <strong>Export master</strong>
                  <small>⌘E</small>
                </div>
                <div className="command-search-row">
                  <i>↗</i>
                  <strong>Export stems</strong>
                  <small>⇧⌘E</small>
                </div>
                <div className="command-search-row">
                  <i>⌕</i>
                  <strong>Search exports</strong>
                  <small>Files</small>
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
