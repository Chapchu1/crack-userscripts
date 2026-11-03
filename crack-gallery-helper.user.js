// ==UserScript==
// @name         크랙 이미지 보관함 · 사진 정보 확인 (시험용)
// @namespace    crack-gallery-helper
// @version      0.2.0
// @description  보관함 이미지와 해당 사진에 연결된 페이지 내부 항목의 이름·힌트를 확인합니다. 서버 잠금 해제나 흐린 원본 복원 기능은 아닙니다.
// @match        https://crack.wrtn.ai/*
// @run-at       document-idle
// @noframes
// @grant        GM_registerMenuCommand
// @grant        GM_setClipboard
// @grant        unsafeWindow
// @sandbox      JavaScript
// ==/UserScript==

(() => {
  'use strict';
  const VERSION = '0.2.0';
  const MARK = 'data-cgh-installed';
  if (document.documentElement.hasAttribute(MARK)) return;
  document.documentElement.setAttribute(MARK, VERSION);
  const TITLE = /^이미지\s*보관함(?:\s*\([^)]*\))?\s*$/;
  const MODAL = '[role="dialog"],dialog,[aria-modal="true"]';
  const GENERIC_IMAGE = /^(image|img|photo|picture|이미지|사진|situation image|상황 이미지|locked image|thumbnail|thumbnail image|썸네일|썸네일 이미지)$/i;
  let title = null, activeRoot = null, launcher = null, viewer = null, timer = 0;
  const pending = new Set();
  const clean = value => String(value || '').replace(/\s+/g, ' ').trim().slice(0, 500);

  function element(tag, text, attrs = {}) {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    return node;
  }
  function button(text, action) {
    const node = element('button', text, { type: 'button' });
    node.addEventListener('click', action);
    return node;
  }
  function own(node) {
    return node instanceof Element && Boolean(node.closest('[data-cgh-host]'));
  }
  function visible(node) {
    return Boolean(node?.isConnected && !node.closest('[hidden],[aria-hidden="true"]') && node.getClientRects().length && getComputedStyle(node).visibility !== 'hidden');
  }
  function foreground(node) {
    if (!visible(node)) return false;
    const r = node.getBoundingClientRect();
    const left = Math.max(0, r.left), right = Math.min(innerWidth, r.right);
    const top = Math.max(0, r.top), bottom = Math.min(innerHeight, r.bottom);
    if (right <= left || bottom <= top) return false;
    const hit = document.elementFromPoint((left + right) / 2, (top + bottom) / 2);
    return Boolean(hit && (node.contains(hit) || hit.contains(node)));
  }
  function findTitle(root) {
    if (!(root instanceof Element) || own(root)) return null;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let text;
    while ((text = walker.nextNode())) {
      const parent = text.parentElement;
      if (parent && parent.closest(MODAL) === root && !own(parent) && !parent.closest('script,style,textarea') && TITLE.test(clean(parent.textContent)) && foreground(parent)) return parent;
    }
    return null;
  }
  function galleryRoot() {
    title = null;
    // Settings has a same-named album preview. Only inspect the foreground album dialog.
    for (const root of Array.from(document.querySelectorAll(MODAL)).reverse()) {
      if (root === document.body || root === document.documentElement || own(root) || !visible(root)) continue;
      const text = root.textContent || '';
      if (/채팅방\s*설정/.test(text) && /유저\s*노트|대화\s*프로필/.test(text)) continue;
      const found = findTitle(root);
      if (found) { title = found; return root; }
    }
    return null;
  }
  function usableSource(img) {
    const raw = img.currentSrc || img.getAttribute('src') || '';
    if (/^data:image\/(?:png|jpeg|jpg|webp|gif|avif);/i.test(raw) || raw.startsWith('blob:')) return raw;
    try {
      const url = new URL(raw, document.baseURI);
      return raw && /^(https?:)$/.test(url.protocol) ? url.href : '';
    } catch { return ''; }
  }
  function describe(img, root) {
    const nearby = [img];
    let p = img.parentElement;
    // Multi-image wrappers are never treated as one image's metadata.
    for (let depth = 0; p && p !== root && depth < 3 && p.querySelectorAll('img').length === 1; depth++, p = p.parentElement) nearby.push(p);
    const values = attrs => [...new Set(nearby.flatMap(node => attrs.map(attr => node.getAttribute(attr))).filter(value => value && value.trim()))];
    const descriptions = values(['data-image-name', 'data-name', 'data-title', 'alt', 'title']);
    const names = descriptions.filter(s => !GENERIC_IMAGE.test(s.trim()));
    const genericLabels = descriptions.filter(s => GENERIC_IMAGE.test(s.trim()));
    const hints = values(['data-unlock-hint', 'data-hint', 'data-unlock-condition', 'data-condition']);
    const blur = [];
    for (let node = img, depth = 0; node && depth < 9; node = node.parentElement, depth++) {
      const css = getComputedStyle(node);
      for (const prop of ['filter', 'backdrop-filter', '-webkit-backdrop-filter']) {
        const value = css.getPropertyValue(prop);
        if (/blur\((?!0(?:px)?\))/.test(value)) blur.push(`${prop}: ${value}`);
      }
      if (node === root) break;
    }
    return { src: usableSource(img), node: img, names, genericLabels, hints, blur: [...new Set(blur)], referrerPolicy: img.referrerPolicy, detail: null };
  }
  // Read data properties only: do not invoke application getters or callbacks.
  function data(object, key) {
    try { const d = Object.getOwnPropertyDescriptor(object, key); return d && Object.prototype.hasOwnProperty.call(d, 'value') ? d.value : undefined; }
    catch { return undefined; }
  }
  const fieldKey = key => String(key).replace(/[_-]/g, '').toLowerCase();
  const URL_FIELDS = new Set(['url','src','image','imageurl','thumbnail','thumbnailurl','blurredurl','blurimageurl','blurredimageurl','originalurl','mediaurl']);
  const NAME_FIELDS = new Set(['name','title','label','caption','imagename','situationname','imagekeyword','keyword']);
  const HINT_FIELDS = new Set(['hint','unlockhint','unlockcondition','unlockconditions','condition','conditiondescription','openingcondition']);
  const CONTAINERS = new Set(['image','images','item','items','data','media','asset','assets','situation','situations','imagedata','thumbnail','thumbnails','gallery','galleryimages','situationimages','list','result','results','content','metadata','imageinfo']);
  const TRANSFORMS = new Set(['w','width','h','height','q','quality','fit','format','blur']);
  function sourceKeys(raw) {
    const keys = new Set();
    function add(value, depth) {
      if (typeof value !== 'string' || value.length > 8192) return;
      try {
        const u = new URL(value, document.baseURI);
        if (!/^https?:$/.test(u.protocol)) return;
        u.hash = '';
        // Disregard rendering parameters only. Identity parameters and tokens stay intact.
        for (const key of Array.from(u.searchParams.keys())) if (TRANSFORMS.has(key.toLowerCase())) u.searchParams.delete(key);
        u.searchParams.sort(); keys.add(u.href);
        if (depth === 0 && /\/_next\/image$/.test(u.pathname)) add(u.searchParams.get('url'), 1);
      } catch { /* Not a usable HTTP image address. */ }
    }
    add(raw, 0); return keys;
  }
  function imageFacts(item) {
    const img = item.node;
    const size = img.naturalWidth && img.naturalHeight ? `${img.naturalWidth} × ${img.naturalHeight}` : '아직 확인 안 됨';
    const params = [];
    try {
      const u = new URL(item.src, document.baseURI);
      for (const [key, value] of u.searchParams) {
        if (TRANSFORMS.has(key.toLowerCase()) && /^(?:\d{1,5}(?:\.\d+)?|true|false|auto|jpe?g|png|webp|avif|cover|contain)$/i.test(value)) params.push(`${key}=${value}`);
      }
    } catch { /* No source URL is copied into the report. */ }
    return `받은 이미지 크기: ${size}\n주소의 크기·흐림 옵션: ${params.join(', ') || '확인 안 됨'}`;
  }
  function inspectMetadata(item, root) {
    const result = { status:'', names:[], hints:[], keys:[], facts:imageFacts(item) };
    if (!item.node.isConnected || !root?.contains(item.node) || usableSource(item.node) !== item.src) {
      result.status = '사진이 변경됨: 확인창을 닫고 다시 열어 주세요'; return result;
    }
    const started = performance.now(), seeds = [], fibers = new Set();
    let limited = false, linked = 0;
    const tooLate = () => performance.now() - started > 45;
    const remember = value => {
      if (!value || typeof value !== 'object' || seeds.includes(value)) return;
      if (seeds.length >= 60) { limited = true; return; }
      seeds.push(value);
    };
    function gather(img, boundary) {
      for (let node = img, n = 0; node && node !== boundary && n < 6; node = node.parentElement, n++) {
        if (tooLate()) { limited = true; break; }
        let keys; try { keys = Object.getOwnPropertyNames(node); } catch { continue; }
        for (const key of keys) {
          if (/^__reactProps\$/.test(key)) { linked++; remember(data(node,key)); }
          if (!/^__(?:reactFiber|reactInternalInstance)\$/.test(key)) continue;
          linked++;
          let fiber = data(node,key);
          for (let depth = 0; fiber && typeof fiber === 'object' && depth < 12 && !fibers.has(fiber); depth++) {
            fibers.add(fiber);
            const dom = data(fiber,'stateNode');
            if (dom && typeof dom === 'object') {
              try { if (boundary.isSameNode(dom) || !boundary.contains(dom)) break; }
              catch { /* A React component instance is not a DOM Node. Do not read its properties. */ }
            }
            remember(data(fiber,'memoizedProps'));
            fiber = data(fiber,'return');
          }
        }
      }
    }
    // Obtain the page-world wrapper for this exact image, without reading global application state.
    const marker = 'data-cgh-inspect', old = item.node.getAttribute(marker);
    try {
      if (typeof unsafeWindow !== 'undefined') {
        const nonce = 'cgh'+Math.random().toString(36).slice(2);
        item.node.setAttribute(marker,nonce);
        const pageImg = unsafeWindow.document.querySelector(`[${marker}="${nonce}"]`);
        const pageRoot = pageImg?.closest(MODAL);
        if (pageImg && pageRoot && root.isSameNode(pageRoot)) gather(pageImg,pageRoot);
      }
    } catch { /* Fall back to the current wrapper when page-world access is unavailable. */ }
    finally { if (old === null) item.node.removeAttribute(marker); else item.node.setAttribute(marker,old); }
    gather(item.node,root);
    const wanted = sourceKeys(item.src), queue = seeds.map(value => [value,0]), seen = new Set(), candidates = new Map(), schema = new Set();
    let visited = 0, matched = 0;
    while (queue.length) {
      if (visited >= 600 || tooLate()) { limited = true; break; }
      const [object, depth] = queue.shift();
      if (!object || typeof object !== 'object' || seen.has(object)) continue;
      seen.add(object); visited++;
      if (Array.isArray(object)) {
        const length = data(object,'length');
        if (length > 600 || (depth >= 6 && length > 0) || queue.length + length > 800) { limited = true; break; }
        for (let i=0;i<length;i++) { const child = data(object,String(i)); if (child && typeof child === 'object') queue.push([child,depth+1]); }
        continue;
      }
      let keys; try { keys = Object.getOwnPropertyNames(object); } catch { continue; }
      if (keys.length > 120) { limited = true; break; }
      const fields = keys.map(key => [key,fieldKey(key),data(object,key)]);
      const matches = fields.some(([,key,value]) => URL_FIELDS.has(key) && typeof value === 'string' && Array.from(sourceKeys(value)).some(s=>wanted.has(s)));
      if (matches) {
        matched++;
        const names=[], hints=[];
        for (const [key, normalized, value] of fields) {
          if (typeof value !== 'string' || !value.trim()) continue;
          if ((NAME_FIELDS.has(normalized) || HINT_FIELDS.has(normalized)) && value.length > 4000) { limited = true; continue; }
          if (NAME_FIELDS.has(normalized) && !GENERIC_IMAGE.test(value.trim())) names.push(`${key}: ${value}`);
          if (HINT_FIELDS.has(normalized)) hints.push(`${key}: ${value}`);
        }
        if (names.length || hints.length) {
          names.sort(); hints.sort(); const candidate = {names,hints}; candidates.set(JSON.stringify(candidate),candidate);
        }
      }
      for (const [key, normalized, value] of fields) {
        if (schema.size < 18 && /^[a-zA-Z][a-zA-Z0-9_]{0,40}$/.test(key) && !/token|pass|secret|auth|cookie|prompt|message|apikey|^on[A-Z]/i.test(key)) schema.add(key);
        if (!CONTAINERS.has(normalized) || !value || typeof value !== 'object') continue;
        if (depth >= 6 || queue.length >= 800) { limited = true; continue; }
        queue.push([value,depth+1]);
      }
    }
    result.keys = Array.from(schema);
    if (limited) result.status = '검사 한도에 도달: 이름·힌트 판단 보류';
    else if (!linked || !seeds.length) result.status = '내부 항목에 접근하지 못함 (미제공 여부는 판단 불가)';
    else if (candidates.size > 1) result.status = '일치 항목이 여러 개이고 정보가 달라 판단 보류';
    else if (candidates.size === 1) { Object.assign(result,candidates.values().next().value); result.status = '선택한 사진 주소와 일치하는 이미지 항목 확인'; }
    else result.status = matched ? '이미지 주소는 일치하지만 이름·힌트 필드는 찾지 못함' : '선택한 사진과 일치 항목을 찾지 못함';
    return result;
  }
  function detailText(detail) {
    if (!detail) return '내부 이미지 항목: 아직 확인 안 함 (상세 확인 버튼)';
    return `내부 이미지 항목: ${detail.status}\n내부 이름·설명: ${detail.names.join(' / ') || '확인 안 됨'}\n내부 힌트: ${detail.hints.join(' / ') || '확인 안 됨'}\n${detail.facts}\n확인 가능한 항목명: ${detail.keys.join(', ') || '없음'}`;
  }
  function collect(root) {
    if (!root) return [];
    return Array.from(root.querySelectorAll('img')).filter(img => {
      const box = img.getBoundingClientRect();
      return !own(img) && img.closest(MODAL) === root && visible(img) && box.width >= 40 && box.height >= 40;
    }).slice(0, 2000).map(img => describe(img, root)).filter(item => item.src);
  }
  function host(parent = document.body) {
    const node = element('div', '', { 'data-cgh-host': '' });
    node.style.cssText = 'all:initial;position:fixed;z-index:2147483647;display:block;';
    const shadow = node.attachShadow({ mode: 'open' });
    shadow.append(element('style', `
      :host { color-scheme:dark; font:14px/1.5 system-ui,sans-serif; }
      * { box-sizing:border-box; }
      button { background:#333841; color:#fff; border:1px solid #626976; border-radius:10px; padding:9px 12px; font:inherit; cursor:pointer; }
      button:disabled { opacity:.35; cursor:default; }
      button:focus-visible { outline:2px solid #b8cfff; outline-offset:2px; }
      p { margin:8px 0; overflow-wrap:anywhere; }
      .small { font-size:12px; color:#bcc3ce; }
      .row { display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap; }
      .panel { width:min(540px,100%); max-height:100%; overflow:auto; background:#15171b; color:#f4f5f7; border:1px solid #5b626e; border-radius:16px; padding:16px; box-shadow:0 10px 50px #000a; }
      img { display:block; width:100%; max-height:37vh; max-height:37dvh; object-fit:contain; margin:12px 0; background:#08090b; border-radius:10px; filter:none!important; backdrop-filter:none!important; }
      .value { margin-bottom:9px; white-space:pre-wrap; overflow-wrap:anywhere; }
    `));
    parent.append(node);
    return { node, shadow };
  }
  function close() {
    const previous = viewer;
    viewer = null;
    previous?.node.remove();
    if (previous?.focus?.isConnected) previous.focus.focus();
  }
  function open() {
    close();
    const focus = document.activeElement;
    const root = galleryRoot();
    const target = title ? clean(title.textContent) : '인식하지 못함';
    const items = collect(root);
    // Keep pointer/focus events inside the site's modal so it does not dismiss the album.
    const { node, shadow } = host(root || document.body);
    node.style.cssText += 'inset:0;background:#0009;display:flex;align-items:center;justify-content:center;padding:12px;';
    viewer = { node, focus, root };
    const panel = element('section', '', { class: 'panel', 'data-cgh-panel': '', role: 'dialog', 'aria-modal': 'true', 'aria-label': '사진 정보 확인' });
    shadow.append(panel);
    const top = element('div', '', { class: 'row' });
    top.append(element('strong', `사진 정보 확인 ${VERSION} · 시험용`), button('닫기', close));
    panel.append(top, element('p', '이미 받은 이미지 그대로 보기예요. 여전히 흐리면 흐린 파일·축소본일 수 있어요. 잠금 상태는 바뀌지 않아요.', { class: 'small' }));
    if (!items.length) {
      panel.append(element('p', '전체 이미지 보관함을 먼저 열어 주세요. 채팅방 설정의 썸네일 미리보기는 검사하지 않아요. 전체 보관함이 열려 있다면 화면 구조를 인식하지 못한 상태예요.'));
    } else {
      let index = 0;
      const counter = element('p');
      const image = element('img', '', { 'data-cgh-preview': '', alt: '현재 전달된 이미지', decoding: 'async' });
      const status = element('p', '', { class: 'small', 'aria-live': 'polite' });
      const name = element('div', '', { class: 'value' });
      const generic = element('p', '', { class: 'small' });
      const hint = element('div', '', { class: 'value' });
      const effect = element('p', '', { class: 'small' });
      const detail = element('p', '', { class: 'small value', 'aria-live':'polite' });
      const controls = element('div', '', { class: 'row' });
      const previous = button('이전', () => { index--; render(); });
      const next = button('다음', () => { index++; render(); });
      const inspect = button('상세 확인', () => {
        try { items[index].detail = inspectMetadata(items[index],root); }
        catch { items[index].detail = {status:'내부 항목 검사 실패: 브라우저 또는 페이지 구조가 지원되지 않음',names:[],hints:[],keys:[],facts:imageFacts(items[index])}; }
        detail.textContent = detailText(items[index].detail);
      });
      const copy = button('결과 복사', () => {
        const item = items[index];
        const report = `크랙 사진 정보 확인 ${VERSION}\n대상 화면: ${target}\n이미지: ${index + 1}/${items.length} (현재 보관함에서 확인한 수)\n이름·설명: ${item.names.join(' / ') || '화면에서 확인 안 됨'}\n공통 대체문구: ${item.genericLabels.join(' / ') || '없음'}\n힌트: ${item.hints.join(' / ') || '화면에서 확인 안 됨'}\n화면 흐림 효과: ${item.blur.join(' / ') || '해당 이미지·상위 요소에서 확인 안 됨'}\n${detailText(item.detail)}\n서버 추가 조회·잠금 상태 변경: 하지 않음`;
        try {
          if (typeof GM_setClipboard === 'function') { GM_setClipboard(report, 'text'); status.textContent = '결과를 복사했어요.'; }
          else { status.textContent = report; }
        } catch { status.textContent = report; }
      });
      controls.append(previous, next, inspect, copy);
      image.addEventListener('error', () => { status.textContent = '같은 이미지 주소를 다시 표시하지 못했어요. 보관함을 다시 열어 확인해 주세요.'; });
      panel.append(element('p', `대상: ${target}`, { class: 'small' }), counter, image, status, element('strong', '이름·설명 (화면 속 속성)'), name, generic, element('strong', '힌트 (명시된 속성)'), hint, effect,
        element('p', '이름은 개방 조건과 다를 수 있어요. 정보가 안 보인다는 결과만으로 서버에도 없다고 판단할 수는 없어요.', { class: 'small' }), detail, controls);
      function render() {
        const item = items[index];
        counter.textContent = `${index + 1} / ${items.length} · 현재 화면에서 확인한 이미지`;
        image.referrerPolicy = item.referrerPolicy || '';
        image.src = item.src;
        status.textContent = '';
        name.textContent = item.names.join('\n') || '화면에서 확인 안 됨';
        generic.textContent = item.genericLabels.length ? `공통 대체문구: ${item.genericLabels.join(' / ')} (사진 이름이 아님)` : '';
        hint.textContent = item.hints.join('\n') || '화면에서 확인 안 됨';
        effect.textContent = item.blur.length ? `화면 흐림 효과 확인: ${item.blur.join(', ')}` : '화면 흐림 효과: 해당 이미지·상위 요소에서는 확인 안 됨';
        detail.textContent = detailText(item.detail);
        previous.disabled = index === 0;
        next.disabled = index === items.length - 1;
      }
      render();
    }
    node.addEventListener('click', event => { if (event.composedPath()[0] === node) close(); });
    shadow.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
      if (event.key === 'Tab') {
        const buttons = Array.from(shadow.querySelectorAll('button:not(:disabled)'));
        const at = buttons.indexOf(shadow.activeElement);
        if ((event.shiftKey && at <= 0) || (!event.shiftKey && at === buttons.length - 1)) {
          event.preventDefault(); (event.shiftKey ? buttons.at(-1) : buttons[0]).focus();
        }
      }
    });
    shadow.querySelector('button').focus();
  }
  function discover() {
    timer = 0;
    pending.clear();
    if (viewer?.root && visible(viewer.root) && viewer.node.isConnected) return;
    if (viewer && !viewer.node.isConnected) viewer = null;
    const root = galleryRoot();
    if (root === activeRoot && launcher?.isConnected) return;
    launcher?.remove(); launcher = null;
    activeRoot = root;
    if (!root) return;
    const { node, shadow } = host(root);
    node.style.cssText += 'right:14px;bottom:calc(16px + env(safe-area-inset-bottom,0px));';
    shadow.append(button('사진 정보', open));
    launcher = node;
  }
  const observer = new MutationObserver(records => {
    let relevant = !title?.isConnected;
    for (const record of records) {
      if (own(record.target)) continue;
      if (record.type === 'attributes') {
        if (!title?.isConnected || record.target.contains(title) || record.target.matches?.(MODAL) || record.target.querySelector?.(MODAL)) {
          pending.add(record.target); relevant = true;
        }
        continue;
      }
      for (const added of record.addedNodes) {
        const root = added instanceof Element ? added : added.parentElement;
        if (root && !own(root) && (!title?.isConnected || !launcher || root.matches?.(MODAL) || root.querySelector?.(MODAL) || root.textContent?.includes('이미지 보관함'))) { pending.add(root); relevant = true; }
      }
    }
    if (relevant && !timer) timer = window.setTimeout(discover, 150);
  });
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'style', 'class', 'aria-hidden', 'open', 'data-state'] });
  pending.add(document.body); discover();
  if (typeof GM_registerMenuCommand === 'function') GM_registerMenuCommand('이미지 보관함 · 사진 정보 확인', open);
})();
