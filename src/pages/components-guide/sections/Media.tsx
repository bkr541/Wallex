import type { CSSProperties } from 'react';

export default function Media() {
  return (
    <section className="view-panel" data-view="media">
      <div className="component-grid">
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Image viewer</span>
          </header>
          <div className="component-stage ">
            <div className="media-image-viewer">
              <div className="media-art media-viewer-frame" />
              <div className="media-caption">
                <strong>Crystal_Stage_04.png</strong>
                <span>3840 × 2160</span>
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Image thumbnail</span>
          </header>
          <div className="component-stage center">
            <div className="media-thumbnail-demo">
              <div className="media-art media-thumb" />
              <div className="media-thumb-copy">
                <strong>Visualizer Frame</strong>
                <small>PNG · 8.4 MB</small>
                <div className="media-thumb-meta">
                  <span>4K</span>
                  <span>16:9</span>
                </div>
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Gallery</span>
          </header>
          <div className="component-stage ">
            <div className="media-gallery">
              <div className="media-art" />
              <div className="media-art" />
              <div className="media-art" />
              <div className="media-art" />
              <div className="media-art" />
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Carousel</span>
          </header>
          <div className="component-stage ">
            <div className="media-carousel" data-media-carousel>
              <div className="media-carousel-track">
                <div className="media-art media-slide" />
                <div className="media-art media-slide" />
                <div className="media-art media-slide" />
              </div>
              <div className="carousel-nav">
                <button type="button" data-carousel-prev>‹</button>
                <button type="button" data-carousel-next>›</button>
              </div>
              <div className="carousel-dots">
                <i />
                <i className="active" />
                <i />
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Video player</span>
          </header>
          <div className="component-stage ">
            <div className="media-video" data-video-demo>
              <div className="media-art video-screen">
                <button className="video-play-overlay" type="button" data-video-play>▶</button>
              </div>
              <div className="video-controlbar">
                <button type="button" data-video-play>▶</button>
                <div className="media-progress-track">
                  <i />
                </div>
                <span className="video-time">00:42 / 02:18</span>
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Audio player</span>
          </header>
          <div className="component-stage center">
            <div className="audio-player-demo" data-audio-demo>
              <div className="audio-top">
                <div className="media-art audio-art" />
                <div className="audio-copy">
                  <strong>From Grace.wav</strong>
                  <small>150 BPM · B♭ Major</small>
                </div>
                <button className="audio-play" type="button" data-audio-play>▶</button>
              </div>
              <div className="audio-wave-mini">
                <i style={{ '--h': "20%" } as CSSProperties} />
                <i style={{ '--h': "38%" } as CSSProperties} />
                <i style={{ '--h': "55%" } as CSSProperties} />
                <i style={{ '--h': "72%" } as CSSProperties} />
                <i style={{ '--h': "46%" } as CSSProperties} />
                <i style={{ '--h': "85%" } as CSSProperties} />
                <i style={{ '--h': "64%" } as CSSProperties} />
                <i style={{ '--h': "92%" } as CSSProperties} />
                <i style={{ '--h': "51%" } as CSSProperties} />
                <i style={{ '--h': "74%" } as CSSProperties} />
                <i style={{ '--h': "35%" } as CSSProperties} />
                <i style={{ '--h': "66%" } as CSSProperties} />
                <i style={{ '--h': "88%" } as CSSProperties} />
                <i style={{ '--h': "48%" } as CSSProperties} />
                <i style={{ '--h': "76%" } as CSSProperties} />
                <i style={{ '--h': "39%" } as CSSProperties} />
                <i style={{ '--h': "62%" } as CSSProperties} />
                <i style={{ '--h': "82%" } as CSSProperties} />
                <i style={{ '--h': "45%" } as CSSProperties} />
                <i style={{ '--h': "70%" } as CSSProperties} />
                <i style={{ '--h': "54%" } as CSSProperties} />
                <i style={{ '--h': "90%" } as CSSProperties} />
                <i style={{ '--h': "42%" } as CSSProperties} />
                <i style={{ '--h': "68%" } as CSSProperties} />
                <i style={{ '--h': "78%" } as CSSProperties} />
                <i style={{ '--h': "33%" } as CSSProperties} />
                <i style={{ '--h': "59%" } as CSSProperties} />
                <i style={{ '--h': "84%" } as CSSProperties} />
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Waveform</span>
          </header>
          <div className="component-stage ">
            <div className="media-wave-demo">
              <span />
              <i style={{ '--h': "22%" } as CSSProperties} />
              <i style={{ '--h': "45%" } as CSSProperties} />
              <i style={{ '--h': "68%" } as CSSProperties} />
              <i style={{ '--h': "38%" } as CSSProperties} />
              <i style={{ '--h': "76%" } as CSSProperties} />
              <i style={{ '--h': "52%" } as CSSProperties} />
              <i style={{ '--h': "88%" } as CSSProperties} />
              <i style={{ '--h': "34%" } as CSSProperties} />
              <i style={{ '--h': "60%" } as CSSProperties} />
              <i style={{ '--h': "92%" } as CSSProperties} />
              <i style={{ '--h': "44%" } as CSSProperties} />
              <i style={{ '--h': "72%" } as CSSProperties} />
              <i style={{ '--h': "56%" } as CSSProperties} />
              <i style={{ '--h': "84%" } as CSSProperties} />
              <i style={{ '--h': "31%" } as CSSProperties} />
              <i style={{ '--h': "64%" } as CSSProperties} />
              <i style={{ '--h': "78%" } as CSSProperties} />
              <i style={{ '--h': "42%" } as CSSProperties} />
              <i style={{ '--h': "90%" } as CSSProperties} />
              <i style={{ '--h': "58%" } as CSSProperties} />
              <i style={{ '--h': "74%" } as CSSProperties} />
              <i style={{ '--h': "36%" } as CSSProperties} />
              <i style={{ '--h': "67%" } as CSSProperties} />
              <i style={{ '--h': "82%" } as CSSProperties} />
              <i style={{ '--h': "49%" } as CSSProperties} />
              <i style={{ '--h': "70%" } as CSSProperties} />
              <i style={{ '--h': "40%" } as CSSProperties} />
              <i style={{ '--h': "86%" } as CSSProperties} />
              <i style={{ '--h': "55%" } as CSSProperties} />
              <i style={{ '--h': "77%" } as CSSProperties} />
              <i style={{ '--h': "33%" } as CSSProperties} />
              <i style={{ '--h': "61%" } as CSSProperties} />
              <i style={{ '--h': "73%" } as CSSProperties} />
              <i style={{ '--h': "47%" } as CSSProperties} />
              <i style={{ '--h': "81%" } as CSSProperties} />
              <i style={{ '--h': "39%" } as CSSProperties} />
              <i style={{ '--h': "66%" } as CSSProperties} />
              <i style={{ '--h': "89%" } as CSSProperties} />
              <i style={{ '--h': "52%" } as CSSProperties} />
              <i style={{ '--h': "71%" } as CSSProperties} />
              <i style={{ '--h': "44%" } as CSSProperties} />
              <i style={{ '--h': "79%" } as CSSProperties} />
              <i style={{ '--h': "35%" } as CSSProperties} />
              <i style={{ '--h': "63%" } as CSSProperties} />
              <i style={{ '--h': "85%" } as CSSProperties} />
              <i style={{ '--h': "50%" } as CSSProperties} />
              <i style={{ '--h': "75%" } as CSSProperties} />
              <i style={{ '--h': "41%" } as CSSProperties} />
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Play/pause control</span>
          </header>
          <div className="component-stage center">
            <div className="play-pause-demo">
              <button className="big-play" type="button" data-big-play aria-pressed="false">▶</button>
              <small data-play-state>Paused · 01:24</small>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Transport controls</span>
          </header>
          <div className="component-stage center">
            <div className="transport-demo" data-transport>
              <button title="Previous">│‹</button>
              <button title="Rewind">«</button>
              <button className="transport-stop" title="Stop">■</button>
              <button className="transport-play" title="Play" data-transport-play>▶</button>
              <button title="Forward">»</button>
              <button title="Next">›│</button>
              <span className="transport-time">01:24.318</span>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Volume slider</span>
          </header>
          <div className="component-stage center">
            <div className="volume-demo">
              <span className="volume-icon">◖</span>
              <input className="media-range" id="mediaVolume" type="range" min="0" max="100" defaultValue="68" />
              <output className="volume-readout" id="mediaVolumeValue">68%</output>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Scrubber / seek bar</span>
          </header>
          <div className="component-stage center">
            <div className="scrubber-demo">
              <div className="scrubber-meta">
                <strong>01:24</strong>
                <span>03:48</span>
              </div>
              <input className="media-range" id="mediaSeek" type="range" min="0" max="100" defaultValue="37" />
              <div className="scrubber-thumbs">
                <i />
                <i />
                <i className="active" />
                <i className="active" />
                <i />
                <i />
                <i />
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Timeline</span>
          </header>
          <div className="component-stage no-pad">
            <div className="media-timeline-demo">
              <div className="media-playhead" />
              <div className="media-time-ruler">
                <span>1</span>
                <span>9</span>
                <span>17</span>
                <span>25</span>
                <span>33</span>
              </div>
              <div className="media-track-lane">
                <b style={{ '--x': "4%", '--w': "28%" } as CSSProperties} />
                <b className="active" style={{ '--x': "37%", '--w': "36%" } as CSSProperties} />
              </div>
              <div className="media-track-lane">
                <b style={{ '--x': "18%", '--w': "48%" } as CSSProperties} />
                <b style={{ '--x': "70%", '--w': "22%" } as CSSProperties} />
              </div>
              <div className="media-track-lane">
                <b className="active" style={{ '--x': "8%", '--w': "18%" } as CSSProperties} />
                <b style={{ '--x': "30%", '--w': "56%" } as CSSProperties} />
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Media preview</span>
          </header>
          <div className="component-stage center">
            <div className="media-preview-demo">
              <div className="media-art preview-art" />
              <div className="preview-copy">
                <strong>Crystal Sequence</strong>
                <small>00:18 · 3840×2160</small>
                <small>H.264 · 60 fps</small>
                <div className="preview-actions">
                  <button>Preview</button>
                  <button>Reveal</button>
                </div>
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Fullscreen viewer</span>
          </header>
          <div className="component-stage no-pad">
            <div className="fullscreen-preview-stage">
              <div className="media-art fullscreen-card" />
              <button className="fullscreen-open" type="button" data-fullscreen-open>⛶</button>
              <div className="fullscreen-overlay" data-fullscreen-overlay>
                <button className="fullscreen-close" type="button" data-fullscreen-close>×</button>
                <div className="media-art" />
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
