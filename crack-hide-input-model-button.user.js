// ==UserScript==
// @name         크랙 · 입력창 모델 버튼 숨기기
// @namespace    crack-input-model-button-hider
// @version      1.0.1
// @description  채팅 입력창의 기본 모델·무료 채팅권 버튼 숨김. 자동 감지 / 직접 지정 / 다시 표시 지원.
// @homepageURL  https://github.com/Chapchu1/crack-userscripts
// @downloadURL  https://raw.githubusercontent.com/Chapchu1/crack-userscripts/main/crack-hide-input-model-button.user.js
// @updateURL    https://raw.githubusercontent.com/Chapchu1/crack-userscripts/main/crack-hide-input-model-button.meta.js
// @match        https://crack.wrtn.ai/*
// @run-at       document-idle
// @noframes
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// ==/UserScript==

/*
 * 설치: 탬퍼몽키 → 새 스크립트 → 기본 내용을 전부 지우고 이 파일 전체 붙여넣기 → 저장.
 * 크랙을 새로고침하면 자동 감지를 시작합니다.
 * 버튼이 남으면: 탬퍼몽키 → 이 스크립트 → '숨길 버튼 직접 지정' → 번개·선물 버튼 누르기.
 * 복원: 메뉴의 '모델 버튼 다시 표시', 또는 스크립트를 끄고 새로고침.
 *
 * 참고한 코드: 사용자의 CMU 4.6.0.6에 있는 model-icon / __chat_input_textarea 식별 방식.
 * 실제 2026-10-13 크랙 로그인 화면에는 접근할 수 없어 실사이트 동작은 미검증입니다.
 * 화면의 버튼만 숨깁니다. 모델 설정·채팅 데이터·API 요청은 변경하지 않습니다.
 * 기존 유틸이 원본 버튼을 찾아 클릭할 수 있도록 DOM과 클릭 핸들러는 유지합니다.
 */

(() => {
  'use strict';

  const PREFIX = 'crack-himb';
  const MARK = 'data-crack-himb-target';
  const INPUT = [
    '.__chat_input_textarea',
    'textarea[placeholder*="메시지"]',
    'textarea[placeholder*="message" i]',
    '[contenteditable="true"][data-placeholder*="메시지"]',
    '.ProseMirror[contenteditable="true"]:has([data-placeholder*="메시지"])',
    '.ProseMirror[contenteditable="true"]:has([data-placeholder*="message" i])'
  ].join(',');
  const BUTTON = 'button,[role="button"],[aria-haspopup="menu"],[aria-haspopup="listbox"]';
  const EXCLUDE = [
    '[role="dialog"]', '[aria-modal="true"]', '[role="menu"]', '[role="listbox"]',
    '[data-message-group-id]', '.wrtn-markdown', 'header', 'nav',
    '#chud-sidebar', '#chud-side-content', '#chud-infobar', '[data-side-key]',
    '[id^="chud-"]', '[id^="cmu-"]', '[id^="wrp-"]', '[id^="wrmc-"]',
    '[id^="wish-"]', '[id^="crack-himb-"]'
  ].join(',');
  const ICON = 'img[src*="model-icon"],img[srcset*="model-icon"],svg use[href*="model-icon"]';
  const MODEL_LABEL = /(?:모델\s*(?:선택|변경|전환)|^(?:AI\s*)?모델$|\bmodel[-_\s]*(?:select|switch|picker)|\b(?:select|switch|change)[-_\s]*(?:ai[-_\s]*)?model\b)/i;
  const FREE_CHAT_LABEL = /(?:무료\s*(?:채팅|대화)(?:\s*권)?|(?:채팅|대화)\s*권|\bfree[-_\s]*(?:chat|conversation)(?:[-_\s]*(?:ticket|pass))?\b|\bchat[-_\s]*(?:ticket|pass)\b)/i;
  const GIFT_ICON_LABEL = /(?:선물|(?:^|[^a-z0-9])(?:gift|present)(?=$|[^a-z0-9]))/i;
  const NON_MODEL = /(?:전송|보내기|답변\s*길이|생각\s*조절|이미지\s*생성|선물함|보관함|출석|보상|충전|구매|\b(?:send|submit|reward|attendance|inventory|purchase)\b)/i;
  const EDITOR = 'textarea,input,[contenteditable="true"],.__chat_input_textarea,#chud-model-btn';
  const ROOM_HEADER = '.h-12.justify-between.bg-bg_screen,.h-12.justify-between.border-b';
  let enabled = GM_getValue('enabled', true) !== false;
  let manual = GM_getValue('manualFingerprint', null);
  let roots = [];
  let neighborhoods = [];
  let pending = 0;
  let picking = false;
  let banner = null;
  let menuIds = [];
  const marked = new Map();

  const style = document.createElement('style');
  style.id = `${PREFIX}-style`;
  style.textContent = `
    /* Keep a nonzero box for existing model-launcher scripts. Clipping prevents hit testing. */
    [${MARK}="1"] {
      position: absolute !important;
      width: 28px !important; height: 28px !important;
      min-width: 28px !important; min-height: 28px !important;
      max-width: 28px !important; max-height: 28px !important;
      margin: 0 !important;
      clip-path: inset(100%) !important;
      clip: rect(0, 0, 0, 0) !important;
      overflow: hidden !important;
    }
    #${PREFIX}-banner {
      position: fixed !important; z-index: 2147483647 !important;
      top: max(12px, env(safe-area-inset-top)) !important;
      left: 12px !important; right: 12px !important;
      box-sizing: border-box !important; max-width: 520px !important;
      margin: 0 auto !important; padding: 12px 14px !important;
      border: 1px solid #6371a0 !important; border-radius: 12px !important;
      background: #202533 !important; color: #fff !important;
      font: 14px/1.6 system-ui, sans-serif !important;
      box-shadow: 0 4px 20px #0007 !important;
    }
    #${PREFIX}-banner button {
      margin-left: 10px !important; padding: 5px 12px !important;
      color: #fff !important; background: #424e70 !important;
      border: 0 !important; border-radius: 7px !important;
      font: inherit !important; cursor: pointer !important;
    }
  `;
  (document.head || document.documentElement).appendChild(style);

  function blocked(el) {
    return !(el instanceof Element) || !!el.closest(EXCLUDE);
  }

  function discoverRoots({ forPicker = false } = {}) {
    const result = new Set();
    const nearby = new Set();
    for (const input of document.querySelectorAll(INPUT)) {
      if (blocked(input) || !input.getClientRects().length) continue;
      // Find the smallest common container that actually contains a matching
      // control. An earlier utility row with two unrelated buttons is not enough.
      let node = input.parentElement;
      let candidateRoot = null;
      let pickerRoot = null;
      let neighborhood = null;
      for (let depth = 0; node && depth < 7; depth++, node = node.parentElement) {
        if (node.matches(`main,body,html,${ROOM_HEADER}`) || blocked(node) ||
            node.querySelector(`[data-message-group-id],.wrtn-markdown,header,nav,[data-cmu-global-header="1"],[data-crack-ui-header="1"],#wrtn-custom-global-header,${ROOM_HEADER}`)) break;
        neighborhood = node;
        const buttons = [...node.querySelectorAll(BUTTON)].filter(eligible);
        if (!candidateRoot && buttons.some(el => automatic(el) || matchesManual(el))) candidateRoot = node;
        // Explicit picking must remain available for an unlabelled icon. Only
        // that user-driven mode uses the bounded safe editor neighborhood.
        if (forPicker && buttons.length) pickerRoot = node;
        if (node.tagName === 'FORM') break;
      }
      if (neighborhood) nearby.add(neighborhood);
      if (candidateRoot) result.add(candidateRoot);
      else if (forPicker && pickerRoot) result.add(pickerRoot);
    }
    neighborhoods = [...nearby];
    return [...result];
  }

  function label(el) {
    return ['aria-label', 'title', 'data-testid', 'data-tooltip']
      .map(name => el.getAttribute(name) || '').filter(Boolean).join(' ');
  }

  function eligible(el) {
    return el instanceof HTMLElement && !blocked(el) &&
      !el.matches('input,[type="submit"],[type="reset"]') &&
      !el.querySelector(`${EDITOR},${BUTTON}`) &&
      !NON_MODEL.test(label(el));
  }

  function freeChatSignal(el) {
    // Identity only: callers must restrict this to the editor's native controls.
    // Do not infer gifts from arbitrary SVG paths, color, or button position.
    if (!(el instanceof Element) || !el.matches(BUTTON) || el.querySelector(`${EDITOR},${BUTTON}`)) return false;
    const accessibleLabel = label(el);
    if (FREE_CHAT_LABEL.test(accessibleLabel) || /🎁/.test(accessibleLabel)) return true;
    const text = String(el.textContent || '').trim();
    if (text.length <= 80 && (FREE_CHAT_LABEL.test(text) || /🎁/.test(text))) return true;
    const icons = [...el.querySelectorAll('img,svg,use,[style*="url("]')];
    if (/url\(/i.test(el.getAttribute('style') || '')) icons.push(el);
    return icons.some(icon => {
      if (icon.closest(BUTTON) !== el) return false;
      const identity = ['src', 'srcset', 'alt', 'aria-label', 'title', 'data-icon', 'data-testid', 'class', 'href', 'xlink:href', 'style']
        .map(name => {
          const raw = icon.getAttribute(name) || '';
          try { return decodeURIComponent(raw); } catch { return raw; }
        }).join(' ').replace(/([a-z])([A-Z])/g, '$1 $2');
      return GIFT_ICON_LABEL.test(identity) || FREE_CHAT_LABEL.test(identity) || /🎁/.test(identity);
    });
  }

  function automatic(el) {
    return eligible(el) && ([...el.querySelectorAll(ICON)].some(icon => icon.closest(BUTTON) === el) ||
      MODEL_LABEL.test(label(el)) || freeChatSignal(el));
  }

  function imageKey(image) {
    const raw = image.getAttribute('src');
    if (!raw || raw.length > 2000) return '';
    // Persist only the selected icon reference, never editor contents or chat text.
    try {
      const url = new URL(raw, location.origin);
      if (!/^https?:$/.test(url.protocol)) return '';
      return url.origin + url.pathname + url.search;
    } catch { return ''; }
  }

  function fingerprint(el) {
    for (const name of ['data-testid', 'aria-label', 'title']) {
      const value = el.getAttribute(name);
      if (value && value.length < 160 && (MODEL_LABEL.test(value) || FREE_CHAT_LABEL.test(value))) {
        return { kind: 'attribute', name, value };
      }
    }
    const paths = [...el.querySelectorAll('svg path')].map(p => p.getAttribute('d') || '');
    if (paths.length && paths.join('').length < 6000 && paths.every(Boolean)) {
      return { kind: 'paths', value: paths };
    }
    const use = el.querySelector('svg use');
    const href = use?.getAttribute('href') || use?.getAttribute('xlink:href');
    if (href && href.length < 1000) return { kind: 'use', value: href };
    const img = el.querySelector('img');
    const key = img && imageKey(img);
    return key ? { kind: 'image', value: key } : null;
  }

  function matchesManual(el, saved = manual) {
    if (!saved || typeof saved !== 'object') return false;
    if (saved.kind === 'attribute' && ['data-testid', 'aria-label', 'title'].includes(saved.name)) {
      return el.getAttribute(saved.name) === saved.value;
    }
    if (saved.kind === 'image') return [...el.querySelectorAll('img')].some(img => imageKey(img) === saved.value);
    if (saved.kind === 'paths' && Array.isArray(saved.value)) {
      const paths = [...el.querySelectorAll('svg path')].map(p => p.getAttribute('d') || '');
      return paths.length === saved.value.length && paths.every((d, i) => d === saved.value[i]);
    }
    if (saved.kind === 'use') {
      return [...el.querySelectorAll('svg use')].some(use =>
        (use.getAttribute('href') || use.getAttribute('xlink:href')) === saved.value);
    }
    return false;
  }

  function hide(el) {
    let saved = marked.get(el);
    if (!saved) {
      saved = { tab: el.getAttribute('tabindex'), aria: el.getAttribute('aria-hidden') };
      marked.set(el, saved);
    }
    // React may reuse the button when its icon changes. Reapply only missing
    // values, and remember newer site attributes for the eventual restore.
    if (el.getAttribute(MARK) !== '1') el.setAttribute(MARK, '1');
    if (el.getAttribute('tabindex') !== '-1') {
      saved.tab = el.getAttribute('tabindex');
      el.setAttribute('tabindex', '-1');
    }
    if (el.getAttribute('aria-hidden') !== 'true') {
      saved.aria = el.getAttribute('aria-hidden');
      el.setAttribute('aria-hidden', 'true');
    }
  }

  function restore(el) {
    const saved = marked.get(el);
    if (!saved) return;
    if (el.getAttribute(MARK) === '1') el.removeAttribute(MARK);
    for (const [name, value, ours] of [['tabindex', saved.tab, '-1'], ['aria-hidden', saved.aria, 'true']]) {
      if (el.getAttribute(name) !== ours) continue;
      if (value === null) el.removeAttribute(name); else el.setAttribute(name, value);
    }
    marked.delete(el);
  }

  function scan() {
    pending = 0;
    if (document.hidden) return;
    roots = discoverRoots();
    const wanted = new Set();
    if (enabled && !picking) {
      for (const root of roots) {
        const buttons = [...root.querySelectorAll(BUTTON)].filter(eligible);
        // Never guess between several controls sharing the same icon.
        const custom = buttons.filter(el => matchesManual(el));
        if (custom.length === 1) {
          wanted.add(custom[0]);
        } else {
          const native = buttons.filter(automatic);
          if (native.length === 1) wanted.add(native[0]);
        }
      }
    }
    for (const el of marked.keys()) if (!wanted.has(el)) restore(el);
    for (const el of wanted) hide(el);
  }

  function schedule() {
    if (!pending && !document.hidden && enabled && !picking) pending = setTimeout(scan, 120);
  }

  const observer = new MutationObserver(records => {
    if (!enabled || picking || document.hidden) return;
    if (roots.some(root => !root.isConnected) || neighborhoods.some(root => !root.isConnected)) { schedule(); return; }
    for (const record of records) {
      const target = record.target instanceof Element ? record.target : record.target.parentElement;
      if (!target) continue;
      // A reused hidden node may have become a send control or popup. Recheck
      // it even if the new role would now exclude it from normal discovery.
      if ([...marked.keys()].some(el => el === target || el.contains(target) || target.contains(el))) { schedule(); return; }
      if (blocked(target) || (target.closest(INPUT) && record.type !== 'attributes')) continue;
      // These scopes exist even before the first matching icon arrives.
      if (neighborhoods.some(root => root.contains(target))) { schedule(); return; }
      if (record.type === 'childList') {
        for (const node of record.addedNodes) {
          if (node instanceof Element && !blocked(node) &&
              (node.matches(INPUT) || node.querySelector(INPUT))) { schedule(); return; }
        }
      }
      if (record.type === 'attributes' && (target.matches(INPUT) || target.querySelector(INPUT))) { schedule(); return; }
    }
  });

  function watch() {
    observer.disconnect();
    clearTimeout(pending); pending = 0;
    if (!enabled || document.hidden || picking) return;
    scan();
    observer.observe(document.body, {
      childList: true, subtree: true, attributes: true, characterData: true,
      // Our marker/tabindex/aria-hidden writes are deliberately not observed.
      attributeFilter: ['src', 'srcset', 'alt', 'aria-label', 'title', 'data-testid', 'data-icon', 'data-tooltip', 'type', 'role', 'aria-haspopup', 'href', 'xlink:href', 'class', 'id', 'style', 'd', 'placeholder', 'data-placeholder', 'contenteditable']
    });
  }

  function menus() {
    for (const id of menuIds) GM_unregisterMenuCommand(id);
    menuIds = [
      GM_registerMenuCommand(enabled ? '모델 버튼 다시 표시' : '모델 버튼 숨기기 켜기', () => {
        stopPicker(); enabled = !enabled; GM_setValue('enabled', enabled);
        if (!enabled) for (const el of marked.keys()) restore(el);
        watch(); menus();
      }),
      GM_registerMenuCommand('숨길 버튼 직접 지정', startPicker),
      GM_registerMenuCommand('직접 지정 초기화 (자동 감지 유지)', () => {
        stopPicker(); manual = null; GM_setValue('manualFingerprint', null); scan();
      })
    ];
  }

  function pickerButton(event) {
    const target = event.target instanceof Element ? event.target : null;
    const button = target?.closest(BUTTON);
    return button && eligible(button) && roots.some(root => root.contains(button)) ? button : null;
  }

  function blockPress(event) {
    if (picking && pickerButton(event)) event.stopImmediatePropagation();
  }

  function choose(event) {
    if (!picking) return;
    const button = pickerButton(event);
    if (!button) return;
    event.preventDefault(); event.stopImmediatePropagation();
    const saved = fingerprint(button);
    const root = roots.find(root => root.contains(button));
    const same = saved && [...root.querySelectorAll(BUTTON)].filter(eligible).filter(el => matchesManual(el, saved));
    if (!saved || same.length !== 1) {
      banner.firstChild.textContent = '이 버튼을 고유하게 구분할 수 없어요. 다른 부분을 누르거나 취소해 주세요.';
      return;
    }
    manual = saved; enabled = true;
    GM_setValue('manualFingerprint', manual); GM_setValue('enabled', true);
    stopPicker(); watch(); menus();
  }

  function cancelKey(event) { if (event.key === 'Escape') stopPicker(); }

  function stopPicker() {
    if (!picking) return;
    picking = false;
    for (const name of ['pointerdown', 'mousedown', 'touchstart']) window.removeEventListener(name, blockPress, true);
    window.removeEventListener('click', choose, true);
    window.removeEventListener('keydown', cancelKey, true);
    banner?.remove(); banner = null;
    watch();
  }

  function startPicker() {
    stopPicker();
    roots = discoverRoots({ forPicker: true });
    if (!roots.length) {
      alert('채팅 입력창을 찾지 못했어요. 크랙 채팅방을 연 다음 다시 눌러 주세요.');
      return;
    }
    picking = true; observer.disconnect(); clearTimeout(pending); pending = 0;
    for (const el of marked.keys()) restore(el);
    banner = document.createElement('div'); banner.id = `${PREFIX}-banner`;
    banner.setAttribute('role', 'status');
    banner.append(document.createTextNode('숨길 번개·선물 모델 버튼을 한 번 눌러 주세요.'));
    const cancel = document.createElement('button'); cancel.type = 'button'; cancel.textContent = '취소';
    cancel.addEventListener('click', stopPicker); banner.append(cancel); document.body.append(banner);
    for (const name of ['pointerdown', 'mousedown', 'touchstart']) window.addEventListener(name, blockPress, true);
    window.addEventListener('click', choose, true); window.addEventListener('keydown', cancelKey, true);
  }

  document.addEventListener('visibilitychange', () => { if (document.hidden) stopPicker(); watch(); });
  window.addEventListener('pageshow', watch);
  window.addEventListener('pagehide', () => { stopPicker(); observer.disconnect(); clearTimeout(pending); pending = 0; });
  window.addEventListener('popstate', () => { stopPicker(); watch(); });
  window.addEventListener('hashchange', () => { stopPicker(); watch(); });
  menus(); watch();
})();
