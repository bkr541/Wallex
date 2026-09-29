import type { CSSProperties } from 'react';

export default function Cards() {
  return (
    <section className="view-panel" data-view="cards">
      <div className="cards-grid">
        <article className="ui-card wallet-card" aria-label="Wallet card">
          <div className="wallet-top">
            <span className="wallet-currency">
              <span className="flag" aria-hidden="true">🇺🇸</span>
              <span>US Dollar</span>
            </span>
            <button className="wallet-eye" type="button" aria-label="Show or hide balance">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M2.7 12s3.4-5.4 9.3-5.4S21.3 12 21.3 12 17.9 17.4 12 17.4 2.7 12 2.7 12Z" />
                <circle cx="12" cy="12" r="2.4" />
              </svg>
            </button>
          </div>
          <div className="wallet-balance">
            <span>Available Balance</span>
            <strong>$ 80,500.40</strong>
          </div>
          <div className="wallet-actions">
            <button className="wallet-action icon" type="button" aria-label="Transactions">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 3.5h10a2 2 0 0 1 2 2v15l-3-2-2 2-2-2-2 2-2-2-3 2v-15a2 2 0 0 1 2-2Z" />
                <path d="M9 8h6M9 12h6" />
              </svg>
            </button>
            <button className="wallet-action" type="button">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M19 12H5M10 7l-5 5 5 5" />
              </svg>
              <span>Request</span>
            </button>
            <button className="wallet-action" type="button">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 12h14M14 7l5 5-5 5" />
              </svg>
              <span>Transfer</span>
            </button>
            <button className="wallet-action add" type="button" aria-label="Add">+</button>
          </div>
        </article>
        <article className="ui-card waveform-card">
          <header className="card-header">
            <span className="card-title">Waveform</span>
            <span className="header-control status">
              <i />
            </span>
          </header>
          <div className="waveform-panel">
            <svg className="waveform-svg" viewBox="0 0 640 150" preserveAspectRatio="none" aria-hidden="true">
              <g className="wave-bars">
                <path d="M8 70v10 M18 60v30 M28 48v54 M38 33v84 M48 46v58 M58 62v26 M68 72v8 M78 66v20 M88 54v44 M98 38v76 M108 26v100 M118 42v68 M128 58v34 M138 67v16 M148 61v28 M158 49v52 M168 36v78 M178 20v110 M188 34v82 M198 51v48 M208 65v20 M218 71v8 M228 63v24 M238 50v50 M248 31v88 M258 16v118 M268 29v92 M278 48v54 M288 61v28 M298 70v10 M308 64v22 M318 52v46 M328 36v78 M338 24v102 M348 39v72 M358 56v38 M368 68v14 M378 61v28 M388 46v58 M398 28v94 M408 14v122 M418 32v86 M428 51v48 M438 63v24 M448 70v10 M458 62v26 M468 48v54 M478 34v82 M488 22v106 M498 40v70 M508 56v38 M518 67v16 M528 60v30 M538 44v62 M548 29v92 M558 18v114 M568 35v80 M578 52v46 M588 65v20 M598 71v8 M608 64v22 M618 52v46 M628 60v30" />
              </g>
              <line className="playhead-line" x1="368" x2="368" y1="0" y2="150" />
              <circle className="playhead-head" cx="368" cy="11" r="4" />
            </svg>
          </div>
          <footer className="card-footer timeline-footer">
            <span>01:24.672</span>
            <span className="chip">128 BPM</span>
            <span>03:42.910</span>
          </footer>
        </article>
        <article className="ui-card">
          <header className="card-header">
            <span className="card-title">Audio Tracks</span>
            <span className="header-control">4</span>
          </header>
          <div className="track-list">
            <div className="track-row">
              <span className="track-color" />
              <span className="track-name">Lead Vocal</span>
              <span className="level">
                <i style={{ '--level': "72%" } as CSSProperties} />
              </span>
              <span className="track-state active" />
            </div>
            <div className="track-row">
              <span className="track-color" />
              <span className="track-name">Drums</span>
              <span className="level">
                <i style={{ '--level': "88%" } as CSSProperties} />
              </span>
              <span className="track-state active" />
            </div>
            <div className="track-row">
              <span className="track-color" />
              <span className="track-name">Bass</span>
              <span className="level">
                <i style={{ '--level': "62%" } as CSSProperties} />
              </span>
              <span className="track-state active" />
            </div>
            <div className="track-row">
              <span className="track-color" />
              <span className="track-name">Atmosphere</span>
              <span className="level">
                <i style={{ '--level': "41%" } as CSSProperties} />
              </span>
              <span className="track-state" />
            </div>
          </div>
        </article>
        <article className="ui-card">
          <header className="card-header">
            <span className="card-title">Metadata</span>
            <span className="header-control info">i</span>
          </header>
          <div className="metadata-grid">
            <div>
              <span className="field-label">Title</span>
              <strong>Reverie_08</strong>
            </div>
            <div>
              <span className="field-label">Key</span>
              <strong>B♭ Major</strong>
            </div>
            <div>
              <span className="field-label">Tempo</span>
              <strong>150 BPM</strong>
            </div>
            <div>
              <span className="field-label">Length</span>
              <strong>03:48</strong>
            </div>
            <div>
              <span className="field-label">Sample Rate</span>
              <strong>48 kHz</strong>
            </div>
            <div>
              <span className="field-label">Bit Depth</span>
              <strong>24-bit</strong>
            </div>
          </div>
          <footer className="card-footer file-footer">
            <span>WAV</span>
            <span>127.4 MB</span>
          </footer>
        </article>
        <article className="ui-card">
          <header className="card-header">
            <span className="card-title">Groups</span>
            <button className="header-control add" type="button">+</button>
          </header>
          <div className="group-list">
            <div className="group-row">
              <span className="group-mark">A</span>
              <span>Drum Bus</span>
              <b>8</b>
            </div>
            <div className="group-row">
              <span className="group-mark">B</span>
              <span>Music</span>
              <b>12</b>
            </div>
            <div className="group-row">
              <span className="group-mark">C</span>
              <span>Vocals</span>
              <b>6</b>
            </div>
            <div className="group-row">
              <span className="group-mark">D</span>
              <span>FX</span>
              <b>9</b>
            </div>
          </div>
        </article>
        <article className="ui-card">
          <header className="card-header">
            <span className="card-title">Tags</span>
            <span className="header-control">9</span>
          </header>
          <div className="tag-list">
            <span className="tag selected">Melodic Bass</span>
            <span className="tag">150 BPM</span>
            <span className="tag">Cinematic</span>
            <span className="tag">Vocal</span>
            <span className="tag">Drop</span>
            <span className="tag">Atmospheric</span>
            <span className="tag">Wide</span>
            <span className="tag">Mastered</span>
            <span className="tag">Festival</span>
          </div>
          <footer className="card-footer tag-footer">
            <span className="add-small">+</span>
            <span>Add tag</span>
          </footer>
        </article>
        <article className="ui-card">
          <header className="card-header">
            <span className="card-title">Mixer</span>
            <span className="header-control text">Master</span>
          </header>
          <div className="mixer">
            <div className="channel">
              <div className="meter">
                <i style={{ '--meter': "72%" } as CSSProperties} />
              </div>
              <div className="fader">
                <span style={{ '--pos': "39%" } as CSSProperties} />
              </div>
              <small>DRM</small>
            </div>
            <div className="channel">
              <div className="meter">
                <i style={{ '--meter': "86%" } as CSSProperties} />
              </div>
              <div className="fader">
                <span style={{ '--pos': "28%" } as CSSProperties} />
              </div>
              <small>BASS</small>
            </div>
            <div className="channel">
              <div className="meter">
                <i style={{ '--meter': "59%" } as CSSProperties} />
              </div>
              <div className="fader">
                <span style={{ '--pos': "52%" } as CSSProperties} />
              </div>
              <small>MUS</small>
            </div>
            <div className="channel">
              <div className="meter">
                <i style={{ '--meter': "77%" } as CSSProperties} />
              </div>
              <div className="fader">
                <span style={{ '--pos': "35%" } as CSSProperties} />
              </div>
              <small>VOX</small>
            </div>
          </div>
        </article>
        <article className="ui-card">
          <header className="card-header">
            <span className="card-title">Arrangement</span>
            <span className="header-control text">64 Bars</span>
          </header>
          <div className="ruler">
            <span>1</span>
            <span>17</span>
            <span>33</span>
            <span>49</span>
            <span>64</span>
          </div>
          <div className="arrangement">
            <div className="arrange-row">
              <span className="track-label">DRM</span>
              <div className="lane">
                <i className="clip active" style={{ '--x': "2%", '--w': "26%" } as CSSProperties} />
                <i className="clip" style={{ '--x': "32%", '--w': "20%" } as CSSProperties} />
                <i className="clip active" style={{ '--x': "57%", '--w': "40%" } as CSSProperties} />
              </div>
            </div>
            <div className="arrange-row">
              <span className="track-label">MUS</span>
              <div className="lane">
                <i className="clip" style={{ '--x': "7%", '--w': "17%" } as CSSProperties} />
                <i className="clip active" style={{ '--x': "28%", '--w': "38%" } as CSSProperties} />
                <i className="clip" style={{ '--x': "71%", '--w': "22%" } as CSSProperties} />
              </div>
            </div>
            <div className="arrange-row">
              <span className="track-label">VOX</span>
              <div className="lane">
                <i className="clip active" style={{ '--x': "15%", '--w': "43%" } as CSSProperties} />
                <i className="clip" style={{ '--x': "63%", '--w': "31%" } as CSSProperties} />
              </div>
            </div>
          </div>
          <footer className="card-footer section-footer">
            <span>Intro</span>
            <span>Build</span>
            <span className="selected">Drop</span>
          </footer>
        </article>
        <article className="ui-card">
          <header className="card-header">
            <span className="card-title">Spectrum</span>
            <span className="header-control text">Live</span>
          </header>
          <div className="spectrum-panel">
            <div className="spectrum-bars">
              <i style={{ '--h': "22%" } as CSSProperties} />
              <i style={{ '--h': "34%" } as CSSProperties} />
              <i style={{ '--h': "47%" } as CSSProperties} />
              <i style={{ '--h': "65%" } as CSSProperties} />
              <i style={{ '--h': "80%" } as CSSProperties} />
              <i style={{ '--h': "58%" } as CSSProperties} />
              <i style={{ '--h': "43%" } as CSSProperties} />
              <i style={{ '--h': "68%" } as CSSProperties} />
              <i style={{ '--h': "90%" } as CSSProperties} />
              <i style={{ '--h': "75%" } as CSSProperties} />
              <i style={{ '--h': "55%" } as CSSProperties} />
              <i style={{ '--h': "45%" } as CSSProperties} />
              <i style={{ '--h': "63%" } as CSSProperties} />
              <i style={{ '--h': "79%" } as CSSProperties} />
              <i style={{ '--h': "57%" } as CSSProperties} />
              <i style={{ '--h': "41%" } as CSSProperties} />
              <i style={{ '--h': "32%" } as CSSProperties} />
              <i style={{ '--h': "25%" } as CSSProperties} />
            </div>
          </div>
          <footer className="card-footer frequency-footer">
            <span>20 Hz</span>
            <span>1 kHz</span>
            <span>20 kHz</span>
          </footer>
        </article>
      </div>
    </section>
  );
}
