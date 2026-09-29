export default function LayoutComponents() {
  return (
    <section className="view-panel" data-view="layout-components">
      <div className="component-grid">
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">App shell</span>
          </header>
          <div className="component-stage no-pad">
            <div className="layoutlib-shell">
              <div className="layoutlib-shell-nav">
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>
              <div className="layoutlib-shell-header">
                <i />
                <i />
                <i />
              </div>
              <div className="layoutlib-shell-main">
                <i />
                <i />
              </div>
              <div className="layoutlib-shell-footer">
                <i />
                <i />
                <i />
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Header</span>
          </header>
          <div className="component-stage center">
            <div className="layoutlib-header">
              <span className="layoutlib-brand">
                <i />
                <strong>Workspace</strong>
              </span>
              <span className="layoutlib-header-actions">
                <i />
                <i />
                <i />
              </span>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Footer</span>
          </header>
          <div className="component-stage center">
            <div className="layoutlib-footer">
              <strong>Project synced</strong>
              <span>
                <i />
                Online
              </span>
              <span>v2.4.1</span>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Sidebar</span>
          </header>
          <div className="component-stage no-pad">
            <div className="layoutlib-sidebar-demo">
              <div className="layoutlib-sidebar-rail">
                <span className="active">Library</span>
                <span>Projects</span>
                <span>Samples</span>
                <span>Settings</span>
              </div>
              <div className="layoutlib-sidebar-content">
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
            <span className="component-title">Main content area</span>
          </header>
          <div className="component-stage center">
            <div className="layoutlib-mainarea">
              <header>
                <strong>Main content</strong>
                <i />
              </header>
              <div className="layoutlib-mainarea-body">
                <i />
                <i />
                <i />
              </div>
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Grid</span>
          </header>
          <div className="component-stage">
            <div className="layoutlib-grid">
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
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Stack</span>
          </header>
          <div className="component-stage center">
            <div className="layoutlib-stack">
              <i />
              <i />
              <i />
              <i />
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Flex row</span>
          </header>
          <div className="component-stage center">
            <div className="layoutlib-flexrow">
              <i />
              <i />
              <i />
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Flex column</span>
          </header>
          <div className="component-stage center">
            <div className="layoutlib-flexcol">
              <i />
              <i />
              <i />
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Split view</span>
          </header>
          <div className="component-stage no-pad">
            <div className="layoutlib-split">
              <div className="layoutlib-split-pane">
                <i />
                <i />
                <i />
                <i />
              </div>
              <div className="layoutlib-split-divider" />
              <div className="layoutlib-split-pane detail">
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
            <span className="component-title">Master-detail view</span>
          </header>
          <div className="component-stage no-pad">
            <div className="layoutlib-masterdetail">
              <div className="layoutlib-master" data-master-list>
                <button className="active" type="button">Project A</button>
                <button type="button">Project B</button>
                <button type="button">Project C</button>
                <button type="button">Project D</button>
              </div>
              <div className="layoutlib-detail">
                <strong data-master-title>Project A</strong>
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
            <span className="component-title">Resizable divider</span>
          </header>
          <div className="component-stage no-pad">
            <div className="layoutlib-resizable" data-layout-resizable>
              <div className="layoutlib-resize-left">
                <i />
                <i />
                <i />
              </div>
              <div className="layoutlib-resize-grip" data-layout-grip />
              <div className="layoutlib-resize-right">
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
            <span className="component-title">Spacer</span>
          </header>
          <div className="component-stage center">
            <div className="layoutlib-spacer">
              <span className="layoutlib-spacer-block" />
              <span className="layoutlib-spacer-gap">
                <span>24 px</span>
              </span>
              <span className="layoutlib-spacer-block" />
            </div>
          </div>
        </article>
        <article className="component-card">
          <header className="component-header">
            <span className="component-title">Container</span>
          </header>
          <div className="component-stage center">
            <div className="layoutlib-container">
              <div className="layoutlib-container-inner">
                <i />
                <i />
                <i />
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
