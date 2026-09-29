// @ts-nocheck -- near-verbatim port of the reference's vanilla DOM script; the whole guide is temporary.
// Behaviour for the interactive demos in the Components style guide.
// Ported from the vanilla script in the reference HTML: it wires listeners onto the (static, never
// re-rendered) demo markup, scoped to `root`. Temporary, like the rest of the guide.
export function wireLibrary(root: HTMLElement): () => void {
  const $ = (sel: string): any => root.querySelector(sel);
  const $$ = (sel: string): any[] => Array.from(root.querySelectorAll(sel));
  const cleanups: Array<() => void> = [];
  const docOn = (type: string, fn: (e: Event) => void) => {
    document.addEventListener(type, fn);
    cleanups.push(() => document.removeEventListener(type, fn));
  };

  // Placeholder links (href="#") in the demos shouldn't navigate.
  root.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('a[href="#"]')) e.preventDefault();
  });

  // Demo interactions
  for (const tabs of $$('[data-tabs]')) {
    tabs.addEventListener('click', e => {
      const tab = e.target.closest('.tab-demo');
      if (!tab) return;
      tabs.querySelectorAll('.tab-demo').forEach(x => x.classList.remove('active'));
      tab.classList.add('active');
    });
  }
  for (const nav of $$('[data-bottom-nav]')) {
    nav.addEventListener('click', e => {
      const item = e.target.closest('.bottom-nav-item');
      if (!item) return;
      nav.querySelectorAll('.bottom-nav-item').forEach(x => x.classList.remove('active'));
      item.classList.add('active');
    });
  }
  for (const group of $$('[data-button-group]')) {
    group.addEventListener('click', e => {
      const btn = e.target.closest('button');
      if (!btn) return;
      group.querySelectorAll('button').forEach(x => x.classList.remove('active'));
      btn.classList.add('active');
    });
  }

  $$('[data-toggle-button]').forEach(btn => {
    btn.addEventListener('click', () => {
      const active = btn.classList.toggle('active');
      btn.setAttribute('aria-pressed', String(active));
      btn.querySelector('span').textContent = active ? 'Enabled' : 'Disabled';
    });
  });

  const collapseDemo = $('#collapseDemo');
  const collapseDemoButton = $('#collapseDemoButton');
  if (collapseDemoButton) collapseDemoButton.addEventListener('click', () => collapseDemo.classList.toggle('open'));

  const dropdownAnchor = $('#dropdownAnchor');
  const dropdownButton = $('#dropdownButton');
  if (dropdownButton) dropdownButton.addEventListener('click', e => {
    e.stopPropagation();
    dropdownAnchor.classList.toggle('open');
  });
  docOn('click', e => {
    if (dropdownAnchor && !dropdownAnchor.contains(e.target)) dropdownAnchor.classList.remove('open');
  });

  const loadingButton = $('#loadingButton');
  if (loadingButton) loadingButton.addEventListener('click', () => {
    if (loadingButton.dataset.loading === 'true') return;
    loadingButton.dataset.loading = 'true';
    loadingButton.innerHTML = '<i class="spinner"></i><span>Processing</span>';
    setTimeout(() => {
      loadingButton.dataset.loading = 'false';
      loadingButton.innerHTML = '<span>Generate</span>';
    }, 1400);
  });

  const splitToggle = $('#splitToggle');
  if (splitToggle) splitToggle.addEventListener('click', () => splitToggle.classList.toggle('active'));

  // Form control interactions
  const passwordDemo = $('#passwordDemo');
  const passwordToggle = $('#passwordToggle');
  if (passwordDemo && passwordToggle) {
    passwordToggle.addEventListener('click', () => {
      passwordDemo.type = passwordDemo.type === 'password' ? 'text' : 'password';
    });
  }

  $$('[data-number-step]').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = $('#numberDemo');
      if (!input) return;
      input.stepUp(Number(btn.dataset.numberStep) > 0 ? 1 : 0);
      if (Number(btn.dataset.numberStep) < 0) input.stepDown();
    });
  });

  $$('[data-multi-select]').forEach(group => {
    group.addEventListener('click', e => {
      const chip = e.target.closest('.multi-chip');
      if (chip) chip.classList.toggle('active');
    });
  });

  const comboControl = $('.combo-control');
  if (comboControl) {
    const comboToggle = comboControl.querySelector('.combo-toggle');
    const comboInput = comboControl.querySelector('input');
    comboToggle?.addEventListener('click', e => {
      e.stopPropagation();
      comboControl.classList.toggle('open');
    });
    comboControl.querySelectorAll('.combo-menu button').forEach(option => {
      option.addEventListener('click', () => {
        comboInput.value = option.textContent.trim();
        comboControl.classList.remove('open');
      });
    });
    docOn('click', e => {
      if (!comboControl.contains(e.target)) comboControl.classList.remove('open');
    });
  }

  const autoInput = $('#autocompleteDemo');
  if (autoInput) {
    const menu = autoInput.parentElement.querySelector('.autocomplete-menu');
    menu?.querySelectorAll('button').forEach(option => option.addEventListener('click', () => {
      autoInput.value = option.querySelector('strong').textContent;
    }));
  }

  const sliderDemo = $('#sliderDemo');
  const sliderValue = $('#sliderValue');
  function updateSlider(){
    if (!sliderDemo) return;
    sliderDemo.style.setProperty('--range-fill', `${sliderDemo.value}%`);
    if (sliderValue) sliderValue.value = `${sliderDemo.value}%`;
  }
  sliderDemo?.addEventListener('input', updateSlider);
  updateSlider();

  const rangeLow = $('#rangeLow');
  const rangeHigh = $('#rangeHigh');
  const rangeValue = $('#rangeValue');
  const dualTrack = $('.dual-range-track');
  function updateDualRange(source){
    if (!rangeLow || !rangeHigh) return;
    let low = Number(rangeLow.value), high = Number(rangeHigh.value);
    if (high - low < 8) {
      if (source === rangeLow) low = high - 8;
      else high = low + 8;
      rangeLow.value = low;
      rangeHigh.value = high;
    }
    dualTrack?.style.setProperty('background', `linear-gradient(90deg,#35373a 0 ${low}%,var(--accent) ${low}% ${high}%,#35373a ${high}% 100%)`);
    if (rangeValue) rangeValue.value = `${Math.round(low*10)} Hz – ${Math.round(high/100*16)} kHz`;
  }
  rangeLow?.addEventListener('input', () => updateDualRange(rangeLow));
  rangeHigh?.addEventListener('input', () => updateDualRange(rangeHigh));
  updateDualRange();

  const colorDemo = $('#colorDemo');
  const colorSwatch = $('#colorSwatch');
  const colorValue = $('#colorValue');
  colorDemo?.addEventListener('input', () => {
    if (colorSwatch) colorSwatch.style.background = colorDemo.value;
    if (colorValue) colorValue.textContent = colorDemo.value.toUpperCase();
  });

  const fileDemo = $('#fileDemo');
  const fileName = $('#fileName');
  fileDemo?.addEventListener('change', () => {
    if (fileDemo.files?.[0] && fileName) fileName.textContent = fileDemo.files[0].name;
  });

  const dropZone = $('#dropZone');
  const dropFile = $('#dropFile');
  const dropZoneTitle = $('#dropZoneTitle');
  if (dropZone) {
    ['dragenter','dragover'].forEach(type => dropZone.addEventListener(type, e => {
      e.preventDefault(); dropZone.classList.add('dragging');
    }));
    ['dragleave','drop'].forEach(type => dropZone.addEventListener(type, e => {
      e.preventDefault(); dropZone.classList.remove('dragging');
    }));
    dropZone.addEventListener('drop', e => {
      const file = e.dataTransfer?.files?.[0];
      if (file && dropZoneTitle) dropZoneTitle.textContent = file.name;
    });
    dropFile?.addEventListener('change', () => {
      if (dropFile.files?.[0] && dropZoneTitle) dropZoneTitle.textContent = dropFile.files[0].name;
    });
  }

  // Content-container interactions
  $$('[data-accordion]').forEach(acc => {
    acc.querySelectorAll('.accordion-row').forEach(row => {
      row.addEventListener('click', () => {
        const content = row.nextElementSibling;
        const active = row.classList.contains('active');
        acc.querySelectorAll('.accordion-row').forEach(r => r.classList.remove('active'));
        acc.querySelectorAll('.accordion-content').forEach(c => c.classList.remove('active'));
        if (!active) { row.classList.add('active'); content?.classList.add('active'); }
      });
    });
  });

  $$('[data-collapsible]').forEach(group => {
    group.querySelector('.collapsible-head')?.addEventListener('click', () => group.classList.toggle('open'));
  });

  $$('[data-drawer]').forEach(drawer => {
    drawer.querySelector('.drawer-open')?.addEventListener('click', () => drawer.classList.add('open'));
    drawer.querySelector('.drawer-close')?.addEventListener('click', () => drawer.classList.remove('open'));
  });

  $$('[data-sheet]').forEach(sheet => {
    sheet.querySelector('.sheet-open')?.addEventListener('click', () => sheet.classList.toggle('open'));
  });

  const resizeDemo = $('#resizeDemo');
  const resizePanel = $('#resizePanel');
  const resizeGrip = $('#resizeGrip');
  if (resizeDemo && resizePanel && resizeGrip) {
    let resizing = false;
    resizeGrip.addEventListener('pointerdown', e => { resizing = true; resizeGrip.setPointerCapture(e.pointerId); });
    resizeGrip.addEventListener('pointermove', e => {
      if (!resizing) return;
      const rect = resizeDemo.getBoundingClientRect();
      const width = Math.max(rect.width * .24, Math.min(rect.width * .68, rect.right - e.clientX));
      resizePanel.style.width = `${width}px`;
    });
    resizeGrip.addEventListener('pointerup', () => { resizing = false; });
  }


  // Data display interactions
  $$('[data-tree] .tree-node.branch').forEach(node => {
    node.addEventListener('click', () => node.classList.toggle('open'));
  });

  // Status and feedback interactions
  $$('.feedback-chip').forEach(chip => {
    chip.addEventListener('click', () => chip.classList.toggle('active'));
  });
  $$('.feedback-tag button').forEach(btn => {
    btn.addEventListener('click', () => btn.closest('.feedback-tag')?.remove());
  });
  $$('[data-toast] .toast-close').forEach(btn => {
    btn.addEventListener('click', () => btn.closest('[data-toast]')?.classList.add('hidden'));
  });
  $$('.alert-demo > button').forEach(btn => {
    btn.addEventListener('click', () => btn.closest('.alert-demo')?.classList.toggle('soft-dismissed'));
  });


  // Overlay interactions
  $$('[data-popover-demo]').forEach(pop => {
    pop.querySelector('.popover-anchor')?.addEventListener('click', () => pop.classList.toggle('closed'));
  });
  $$('[data-dropdown-overlay]').forEach(drop => {
    drop.querySelector('.dropdown-overlay-anchor')?.addEventListener('click', () => drop.classList.toggle('closed'));
    drop.querySelectorAll('.dropdown-overlay-menu button').forEach(btn => btn.addEventListener('click', () => {
      drop.querySelectorAll('.dropdown-overlay-menu button').forEach(x => x.classList.remove('active'));
      btn.classList.add('active');
    }));
  });
  $$('[data-overlay-panel]').forEach(panel => {
    panel.querySelector('[data-panel-open]')?.addEventListener('click', () => panel.classList.add('open'));
    panel.querySelector('[data-panel-close]')?.addEventListener('click', () => panel.classList.remove('open'));
  });
  $$('[data-bottom-sheet-demo]').forEach(sheet => {
    sheet.querySelector('[data-bottom-open]')?.addEventListener('click', () => sheet.classList.add('open'));
    sheet.querySelector('[data-bottom-close]')?.addEventListener('click', () => sheet.classList.remove('open'));
  });
  $$('[data-lightbox-demo]').forEach(box => {
    box.querySelector('[data-lightbox-open]')?.addEventListener('click', () => box.classList.add('open'));
    box.querySelector('[data-lightbox-close]')?.addEventListener('click', () => box.classList.remove('open'));
  });

  // Selection and organization interactions
  function singleSelect(root, selector='button'){
    root.addEventListener('click', e => {
      const button = e.target.closest(selector);
      if (!button || !root.contains(button)) return;
      root.querySelectorAll(selector).forEach(x => x.classList.remove('active'));
      button.classList.add('active');
    });
  }
  $$('[data-selection-tabs],[data-segmented],[data-category-selector]').forEach(root => singleSelect(root));
  $$('.filter-chip-demo').forEach(chip => chip.addEventListener('click', () => chip.classList.toggle('active')));
  $$('[data-sort-control]').forEach(sort => sort.addEventListener('click', () => sort.classList.toggle('desc')));
  $$('[data-pagination]').forEach(pager => {
    pager.addEventListener('click', e => {
      const btn = e.target.closest('button');
      if (!btn || btn.disabled || ['‹','›'].includes(btn.textContent.trim())) return;
      pager.querySelectorAll('button').forEach(x => x.classList.remove('active'));
      btn.classList.add('active');
    });
  });
  $$('[data-stepper]').forEach(stepper => {
    const buttons = [...stepper.querySelectorAll('button')];
    buttons.forEach((btn, index) => btn.addEventListener('click', () => {
      buttons.forEach((b, i) => {
        b.classList.toggle('active', i === index);
        b.classList.toggle('done', i < index);
        if (i < index) b.querySelector('span').textContent = '✓';
        else b.querySelector('span').textContent = String(i + 1);
      });
    }));
  });
  $$('[data-wizard]').forEach(wizard => {
    const bars = [...wizard.querySelectorAll('.wizard-progress span')];
    const page = wizard.querySelector('.wizard-page');
    const next = wizard.querySelector('[data-wizard-next]');
    const back = wizard.querySelector('[data-wizard-back]');
    const steps = [
      ['Choose source folders','Select the directories this workspace should index.'],
      ['Configure analysis','Choose which audio and project metadata to scan.'],
      ['Review workspace','Confirm the settings before creating the workspace.']
    ];
    let index = 0;
    const render = () => {
      bars.forEach((b,i) => b.classList.toggle('active', i <= index));
      page.querySelector('small').textContent = `STEP ${index + 1} OF 3`;
      page.querySelector('strong').textContent = steps[index][0];
      page.querySelector('p').textContent = steps[index][1];
      back.disabled = index === 0;
      next.textContent = index === steps.length - 1 ? 'Finish' : 'Continue';
    };
    next?.addEventListener('click', () => { index = Math.min(steps.length - 1,index+1); render(); });
    back?.addEventListener('click', () => { index = Math.max(0,index-1); render(); });
    render();
  });
  $$('[data-transfer-list]').forEach(list => {
    const sections = [...list.querySelectorAll('section')];
    sections.forEach(section => section.addEventListener('click', e => {
      const btn = e.target.closest('button');
      if (!btn) return;
      section.querySelectorAll('button').forEach(x => x.classList.remove('selected'));
      btn.classList.add('selected');
    }));
    const move = (from,to) => {
      const selected = from.querySelector('button.selected');
      if (!selected) return;
      selected.classList.remove('selected');
      to.appendChild(selected);
      sections.forEach(section => {
        const count = section.querySelectorAll('button').length;
        const span = section.querySelector('header span'); if (span) span.textContent = count;
      });
    };
    list.querySelector('[data-transfer-right]')?.addEventListener('click', () => move(sections[0],sections[1]));
    list.querySelector('[data-transfer-left]')?.addEventListener('click', () => move(sections[1],sections[0]));
  });
  $$('[data-drag-demo]').forEach(area => {
    const item = area.querySelector('.drag-item-demo');
    const target = area.querySelector('.drop-target-demo');
    item?.addEventListener('dragstart', () => item.classList.add('dragging'));
    item?.addEventListener('dragend', () => item.classList.remove('dragging'));
    target?.addEventListener('dragover', e => { e.preventDefault(); target.classList.add('over'); });
    target?.addEventListener('dragleave', () => target.classList.remove('over'));
    target?.addEventListener('drop', e => { e.preventDefault(); target.classList.remove('over'); target.textContent = 'Added to playlist'; });
  });
  $$('[data-reorder-list]').forEach(list => {
    let dragged = null;
    list.querySelectorAll('.reorder-row').forEach(row => {
      row.addEventListener('dragstart', () => { dragged = row; row.classList.add('dragging'); });
      row.addEventListener('dragend', () => { row.classList.remove('dragging'); dragged = null; });
      row.addEventListener('dragover', e => {
        e.preventDefault();
        if (!dragged || dragged === row) return;
        const rect = row.getBoundingClientRect();
        list.insertBefore(dragged, e.clientY < rect.top + rect.height/2 ? row : row.nextSibling);
      });
    });
  });


  // Media component interactions
  function updateMediaRange(input, output){
    if (!input) return;
    const min=Number(input.min||0), max=Number(input.max||100), value=Number(input.value);
    const pct=((value-min)/(max-min))*100;
    input.style.setProperty('--fill', `${pct}%`);
    if (output) output.value = `${Math.round(value)}%`;
  }
  const mediaVolume=$('#mediaVolume');
  const mediaVolumeValue=$('#mediaVolumeValue');
  mediaVolume?.addEventListener('input',()=>updateMediaRange(mediaVolume,mediaVolumeValue));
  updateMediaRange(mediaVolume,mediaVolumeValue);
  const mediaSeek=$('#mediaSeek');
  mediaSeek?.addEventListener('input',()=>updateMediaRange(mediaSeek));
  updateMediaRange(mediaSeek);

  $$('[data-audio-play]').forEach(btn=>btn.addEventListener('click',()=>{
    const playing=btn.textContent.trim()==='❚❚'; btn.textContent=playing?'▶':'❚❚';
  }));
  $$('[data-video-demo]').forEach(player=>{
    player.querySelectorAll('[data-video-play]').forEach(btn=>btn.addEventListener('click',()=>{
      const all=[...player.querySelectorAll('[data-video-play]')];
      const playing=all.some(x=>x.textContent.trim()==='❚❚');
      all.forEach(x=>x.textContent=playing?'▶':'❚❚');
    }));
  });
  $$('[data-big-play]').forEach(btn=>btn.addEventListener('click',()=>{
    const active=btn.getAttribute('aria-pressed')==='true';
    btn.setAttribute('aria-pressed',String(!active)); btn.textContent=active?'▶':'❚❚';
    const state=btn.parentElement.querySelector('[data-play-state]'); if(state) state.textContent=active?'Paused · 01:24':'Playing · 01:24';
  }));
  $$('[data-transport-play]').forEach(btn=>btn.addEventListener('click',()=>{btn.textContent=btn.textContent.trim()==='❚❚'?'▶':'❚❚';}));
  $$('[data-media-carousel]').forEach(carousel=>{
    let index=1; const slides=[...carousel.querySelectorAll('.media-slide')]; const dots=[...carousel.querySelectorAll('.carousel-dots i')];
    const render=()=>{slides.forEach((s,i)=>{const d=i-index;s.style.transform=`translateX(${d*13}%) scale(${i===index?1:.86})`;s.style.opacity=i===index?'1':'.45';s.style.zIndex=i===index?'2':'1';}); dots.forEach((d,i)=>d.classList.toggle('active',i===index));};
    carousel.querySelector('[data-carousel-prev]')?.addEventListener('click',()=>{index=(index+slides.length-1)%slides.length;render();});
    carousel.querySelector('[data-carousel-next]')?.addEventListener('click',()=>{index=(index+1)%slides.length;render();});
  });
  $$('[data-fullscreen-open]').forEach(btn=>btn.addEventListener('click',()=>btn.parentElement.querySelector('[data-fullscreen-overlay]')?.classList.add('open')));
  $$('[data-fullscreen-close]').forEach(btn=>btn.addEventListener('click',()=>btn.closest('[data-fullscreen-overlay]')?.classList.remove('open')));

  // Application / productivity interactions
  $$('.app-tool').forEach(btn=>btn.addEventListener('click',()=>{ if(!btn.classList.contains('tool-accent')) btn.classList.toggle('active'); }));
  $$('.mini-switch').forEach(sw=>sw.addEventListener('click',()=>sw.classList.toggle('on')));
  $$('[data-folder-tree] .folder-row-demo').forEach(row=>row.addEventListener('click',()=>{
    const tree=row.closest('[data-folder-tree]'); tree.querySelectorAll('.folder-row-demo').forEach(x=>x.classList.remove('active')); row.classList.add('active');
  }));


  // Information & Identity interactions
  $$('[data-profile-menu]').forEach(menu => {
    const trigger = menu.querySelector('.profile-trigger');
    trigger?.addEventListener('click', e => { e.stopPropagation(); menu.classList.toggle('open'); });
    docOn('click', e => { if (!menu.contains(e.target)) menu.classList.remove('open'); });
  });
  $$('.icon-showcase').forEach(group => group.addEventListener('click', e => {
    const tile = e.target.closest('.icon-tile'); if (!tile) return;
    group.querySelectorAll('.icon-tile').forEach(x => x.classList.remove('active')); tile.classList.add('active');
  }));

  // Search & Discovery interactions
  $$('.inline-search-demo').forEach(search => {
    const input = search.querySelector('input');
    search.querySelector('button')?.addEventListener('click', () => { if (input) { input.value = ''; input.focus(); } });
  });
  $$('[data-recent-searches]').forEach(list => {
    list.addEventListener('click', e => {
      const rowRemove = e.target.closest('.recent-search-row button');
      if (rowRemove) { rowRemove.closest('.recent-search-row')?.remove(); return; }
      if (e.target.closest('.recent-clear')) list.querySelectorAll('.recent-search-row').forEach(row => row.remove());
    });
  });
  $$('[data-search-filters]').forEach(bar => bar.addEventListener('click', e => {
    const filter = e.target.closest('.search-filter-btn');
    if (filter) filter.classList.toggle('active');
    if (e.target.closest('.search-filter-reset')) bar.querySelectorAll('.search-filter-btn').forEach((b,i) => b.classList.toggle('active', i === 0));
  }));
  $$('.facets-demo').forEach(facets => facets.addEventListener('click', e => {
    const option = e.target.closest('.facet-option'); if (option) option.classList.toggle('selected');
  }));
  $$('[data-sort-dropdown]').forEach(drop => {
    const trigger = drop.querySelector('.sort-trigger'); const label = drop.querySelector('[data-sort-label]');
    trigger?.addEventListener('click', e => { e.stopPropagation(); drop.classList.toggle('open'); });
    drop.querySelectorAll('[data-sort-option]').forEach(option => option.addEventListener('click', () => {
      drop.querySelectorAll('[data-sort-option]').forEach(x => x.classList.remove('active')); option.classList.add('active');
      if (label) label.textContent = option.textContent.trim(); drop.classList.remove('open');
    }));
    docOn('click', e => { if (!drop.contains(e.target)) drop.classList.remove('open'); });
  });


  // Settings Components interactions
  $$('[data-reset-settings]').forEach(btn => {
    btn.addEventListener('click', () => {
      const original = btn.textContent;
      btn.textContent = 'Reset';
      btn.disabled = true;
      requestAnimationFrame(() => {
        btn.textContent = 'Restored';
        setTimeout(() => { btn.textContent = original; btn.disabled = false; }, 1100);
      });
    });
  });

  $$('[data-settings-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.settingsAction;
      const original = btn.textContent;
      if (action === 'cancel') {
        btn.textContent = 'Canceled';
      } else if (action === 'apply') {
        btn.textContent = 'Applied';
      } else {
        btn.textContent = 'Saved';
      }
      setTimeout(() => { btn.textContent = original; }, 900);
    });
  });

  // Layout Components interactions
  $$('[data-master-list]').forEach(list => {
    list.addEventListener('click', e => {
      const btn = e.target.closest('button');
      if (!btn) return;
      list.querySelectorAll('button').forEach(x => x.classList.remove('active'));
      btn.classList.add('active');
      const title = list.parentElement.querySelector('[data-master-title]');
      if (title) title.textContent = btn.textContent.trim();
    });
  });

  $$('[data-layout-resizable]').forEach(demo => {
    const grip = demo.querySelector('[data-layout-grip]');
    if (!grip) return;
    let dragging = false;
    grip.addEventListener('pointerdown', e => {
      dragging = true;
      grip.setPointerCapture(e.pointerId);
    });
    grip.addEventListener('pointermove', e => {
      if (!dragging) return;
      const rect = demo.getBoundingClientRect();
      const pct = Math.max(24, Math.min(72, ((e.clientX - rect.left) / rect.width) * 100));
      demo.style.setProperty('--left', `${pct}%`);
    });
    grip.addEventListener('pointerup', () => { dragging = false; });
    grip.addEventListener('pointercancel', () => { dragging = false; });
  });

  return () => cleanups.forEach((fn) => fn());
}
