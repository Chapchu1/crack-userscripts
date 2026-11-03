// ==UserScript==
// @name         크랙 이미지 보관함 · 사진 정보 확인 (시험용)
// @namespace    crack-gallery-helper
// @version      0.1.0
// @description  보관함에 이미 표시된 이미지와 화면에 있는 이름·힌트를 확인합니다. 서버 잠금 해제나 흐린 원본 복원 기능은 아닙니다.
// @match        https://crack.wrtn.ai/*
// @run-at       document-idle
// @noframes
// @grant        GM_registerMenuCommand
// @grant        GM_setClipboard
// ==/UserScript==

(() => {
  'use strict';
  const VERSION = '0.1.0';
  const MARK = 'data-cgh-installed';
  if (document.documentElement.hasAttribute(MARK)) return;
  document.documentElement.setAttribute(MARK, VERSION);
  const TITLE = /^이미지\s*보관함(?:\s*\([^)]*\))?\s*$/;
  let title = null, launcher = null, viewer = null, timer = 0;
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
  function findTitle(root) {
    if (!(root instanceof Element) || own(root)) return null;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let text;
    while ((text = walker.nextNode())) {
      const parent = text.parentElement;
      if (parent && !own(parent) && !parent.closest('script,style,textarea') && TITLE.test(clean(parent.textContent)) && visible(parent)) return parent;
    }
    return null;
  }
  function galleryRoot() {
    if (!visible(title)) title = findTitle(document.body);
    if (!title) return null;
    // Fail closed if no modal boundary is present; never climb into shared chat layouts.
    const root = title.closest('[role="dialog"],dialog,[aria-modal="true"]');
    return root && root !== document.body && root !== document.documentElement ? root : null;
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
    const names = values(['data-image-name', 'data-name', 'data-title', 'alt', 'title'])
      .filter(s => !/^(image|img|photo|picture|이미지|사진|situation image|상황 이미지|locked image)$/i.test(s.trim()));
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
    return { src: usableSource(img), names, hints, blur: [...new Set(blur)], referrerPolicy: img.referrerPolicy };
  }
  function collect(root) {
    if (!root) return [];
    return Array.from(root.querySelectorAll('img')).filter(img => {
      const box = img.getBoundingClientRect();
      return !own(img) && box.width >= 40 && box.height >= 40;
    }).slice(0, 2000).map(img => describe(img, root)).filter(item => item.src);
  }
  function host() {
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
      .panel { width:min(540px,calc(100vw - 24px)); max-height:calc(100vh - 24px); max-height:calc(100dvh - 24px); overflow:auto; background:#15171b; color:#f4f5f7; border:1px solid #5b626e; border-radius:16px; padding:16px; box-shadow:0 10px 50px #000a; }
      img { display:block; width:100%; max-height:37vh; max-height:37dvh; object-fit:contain; margin:12px 0; background:#08090b; border-radius:10px; filter:none!important; backdrop-filter:none!important; }
      .value { margin-bottom:9px; white-space:pre-wrap; overflow-wrap:anywhere; }
    `));
    document.body.append(node);
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
    const items = collect(galleryRoot());
    const { node, shadow } = host();
    node.style.cssText += 'inset:0;background:#0009;display:flex;align-items:center;justify-content:center;padding:12px;';
    viewer = { node, focus };
    const panel = element('section', '', { class: 'panel', 'data-cgh-panel': '', role: 'dialog', 'aria-modal': 'true', 'aria-label': '사진 정보 확인' });
    shadow.append(panel);
    const top = element('div', '', { class: 'row' });
    top.append(element('strong', '사진 정보 확인 · 시험용'), button('닫기', close));
    panel.append(top, element('p', '이미 받은 이미지 그대로 보기예요. 여전히 흐리면 흐린 파일·축소본일 수 있어요. 잠금 상태는 바뀌지 않아요.', { class: 'small' }));
    if (!items.length) {
      panel.append(element('p', '이미지 보관함을 먼저 열어 주세요. 열려 있는데도 이 문구가 나오면 화면 구조를 인식하지 못한 상태예요.'));
    } else {
      let index = 0;
      const counter = element('p');
      const image = element('img', '', { 'data-cgh-preview': '', alt: '현재 전달된 이미지', decoding: 'async' });
      const status = element('p', '', { class: 'small', 'aria-live': 'polite' });
      const name = element('div', '', { class: 'value' });
      const hint = element('div', '', { class: 'value' });
      const effect = element('p', '', { class: 'small' });
      const controls = element('div', '', { class: 'row' });
      const previous = button('이전', () => { index--; render(); });
      const next = button('다음', () => { index++; render(); });
      const copy = button('결과 복사', () => {
        const item = items[index];
        const report = `크랙 사진 정보 확인 ${VERSION}\n이미지: ${index + 1}/${items.length} (현재 화면에서 확인한 수)\n이름·설명: ${item.names.join(' / ') || '화면에서 확인 안 됨'}\n힌트: ${item.hints.join(' / ') || '화면에서 확인 안 됨'}\n화면 흐림 효과: ${item.blur.join(' / ') || '해당 이미지·상위 요소에서 확인 안 됨'}\n서버 해금 상태 및 비공개 데이터: 검사하지 않음`;
        try {
          if (typeof GM_setClipboard === 'function') { GM_setClipboard(report, 'text'); status.textContent = '결과를 복사했어요.'; }
          else { status.textContent = report; }
        } catch { status.textContent = report; }
      });
      controls.append(previous, next, copy);
      image.addEventListener('error', () => { status.textContent = '같은 이미지 주소를 다시 표시하지 못했어요. 보관함을 다시 열어 확인해 주세요.'; });
      panel.append(counter, image, status, element('strong', '이름·설명 (화면 속 속성)'), name, element('strong', '힌트 (명시된 속성)'), hint, effect,
        element('p', '이름은 개방 조건과 다를 수 있어요. 정보가 안 보인다는 결과만으로 서버에도 없다고 판단할 수는 없어요.', { class: 'small' }), controls);
      function render() {
        const item = items[index];
        counter.textContent = `${index + 1} / ${items.length} · 현재 화면에서 확인한 이미지`;
        image.referrerPolicy = item.referrerPolicy || '';
        image.src = item.src;
        status.textContent = '';
        name.textContent = item.names.join('\n') || '화면에서 확인 안 됨';
        hint.textContent = item.hints.join('\n') || '화면에서 확인 안 됨';
        effect.textContent = item.blur.length ? `화면 흐림 효과 확인: ${item.blur.join(', ')}` : '화면 흐림 효과: 해당 이미지·상위 요소에서는 확인 안 됨';
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
    if (!visible(title)) {
      launcher?.remove(); launcher = null;
      for (const root of pending) {
        const found = root.isConnected ? findTitle(root) : null;
        if (found) { title = found; break; }
      }
    }
    pending.clear();
    if (!visible(title) || launcher?.isConnected) return;
    const { node, shadow } = host();
    node.style.cssText += 'right:14px;bottom:calc(16px + env(safe-area-inset-bottom,0px));';
    shadow.append(button('사진 정보', open));
    launcher = node;
  }
  const observer = new MutationObserver(records => {
    let relevant = !title?.isConnected;
    for (const record of records) {
      if (own(record.target)) continue;
      if (record.type === 'attributes') {
        if (!title?.isConnected || record.target.contains(title)) {
          pending.add(record.target); relevant = true;
        }
        continue;
      }
      for (const added of record.addedNodes) {
        const root = added instanceof Element ? added : added.parentElement;
        if (root && !own(root) && (!title?.isConnected || !launcher)) { pending.add(root); relevant = true; }
      }
    }
    if (relevant && !timer) timer = window.setTimeout(discover, 150);
  });
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'style', 'class', 'aria-hidden', 'open', 'data-state'] });
  pending.add(document.body); discover();
  if (typeof GM_registerMenuCommand === 'function') GM_registerMenuCommand('이미지 보관함 · 사진 정보 확인', open);
})();
