// ==UserScript==
// @name         Chasm Anti-Scroll Jacking (v1.3.1 스마트 가디언)
// @namespace    https://github.com/milkyway0308/crystallized-chasm
// @version      1.3.3
// @description  1.3.3: 본문 편집 커서가 키보드와 하단 입력창에 가려지지 않도록 보완합니다. 새로고침 위치 복원과 사용자가 직접 스크롤할 때의 자동 스크롤 차단은 유지합니다.
// @author       이름없는 유동
// @match        https://crack.wrtn.ai/stories/*/episodes/*
// @match        https://crack.wrtn.ai/characters/chat/*
// @match        https://crack.wrtn.ai/characters/*/chats/*
// @match        https://crack.wrtn.ai/u/*/c/*
// @grant        GM_addStyle
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    const BOTTOM_EPSILON = 6;
    const USER_GESTURE_MS = 700;
    const RESTORE_MAX_AGE = 30 * 60 * 1000;
    const RESTORE_RETRIES = [0, 40, 90, 160, 280, 450, 700, 1100, 1700, 2600, 4000, 6000, 8000];

    const MESSAGE_SELECTOR = '[data-message-group-id]';
    const BLOCK_SELECTOR = 'p, li, pre, blockquote, img, h1, h2, h3, h4, h5, h6';
    let cachedScroller = null, cachedMessage = null, cachedRoute = '';
    let pendingSavedState = null;
    let pendingSavedKey = '';

    const locked = new WeakSet();
    const userGestureUntil = new WeakMap();
    let globalUserGestureUntil = 0;
    let restoring = false;
    let internalRestoreWrite = false;
    let restoreTarget = null;
    let restoreTop = null;
    let restoreTimerIds = [];
    let persistTimer = 0;

    const COMPOSER_SELECTOR = '.__chat_input_textarea, [data-sgb-input-box], [data-cmu-theme-input-box], [data-cmu-keyboard-composer]';
    let activeEditor = null, editorRoute = '', editorFrame = 0, editorPaused = false;
    let editorNeedsSettle = false;
    let editorPadding = null;

    const css = `
        * {
            scroll-behavior: auto !important;
            overflow-anchor: none !important;
        }
    `;
    if (typeof GM_addStyle !== 'undefined') {
        GM_addStyle(css);
    } else {
        const style = document.createElement('style');
        style.textContent = css;
        (document.head || document.documentElement).appendChild(style);
    }

    try {
        if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    } catch (_) {}

    function docScroller() {
        return document.scrollingElement || document.documentElement || document.body;
    }

    function isScrollable(el) {
        if (!(el instanceof Element)) return false;
        try {
            const cs = getComputedStyle(el);
            const oy = cs.overflowY;
            return el.scrollHeight > el.clientHeight + 2 &&
                (oy === 'auto' || oy === 'scroll' || oy === 'overlay' || el === docScroller());
        } catch (_) {
            return el.scrollHeight > el.clientHeight + 2;
        }
    }

    function findScrollableFrom(node) {
        let el = node instanceof Element ? node : null;
        while (el && el !== document.body && el !== document.documentElement) {
            if (isScrollable(el)) return el;
            el = el.parentElement;
        }
        return docScroller();
    }

    function primaryScroller() {
        const route = routeKey();
        if (cachedRoute === route && cachedScroller?.isConnected && cachedMessage?.isConnected &&
            cachedScroller.contains(cachedMessage) && cachedScroller.clientHeight > 0) return cachedScroller;
        const doc = docScroller();
        const group = document.querySelector('main ' + MESSAGE_SELECTOR) || document.querySelector(MESSAGE_SELECTOR);
        if (group && !group.closest('[role="dialog"], aside, nav')) {
            for (let el = group.parentElement; el && el !== document.body && el !== document.documentElement; el = el.parentElement) {
                if (/auto|scroll|overlay/.test(getComputedStyle(el).overflowY) && el.clientHeight > 0) {
                    cachedScroller = el; cachedMessage = group; cachedRoute = route;
                    return el;
                }
            }
            return doc;
        }
        const candidates = [doc];
        try {
            const root = document.querySelector('main, [role="main"]') || document;
            root.querySelectorAll('main, [role="main"], [class*="scroll"], [class*="overflow"], div').forEach(el => {
                if (el.closest('[role="dialog"], aside, nav') || !isScrollable(el)) return;
                const r = el.getBoundingClientRect();
                if (r.width >= 120 && r.height >= 120) candidates.push(el);
            });
        } catch (_) {}
        candidates.sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight));
        return candidates[0] || doc;
    }

    function isReverseScroller(el) {
        return el !== docScroller() && getComputedStyle(el).flexDirection === 'column-reverse';
    }

    function distanceToBottom(el) {
        if (!el) return 0;
        return isReverseScroller(el) ? Math.max(0, -el.scrollTop)
            : Math.max(0, el.scrollHeight - el.scrollTop - el.clientHeight);
    }

    function viewportTop(el) {
        return el === docScroller() ? 0 : el.getBoundingClientRect().top + el.clientTop;
    }

    function captureAnchor(el) {
        const top = viewportTop(el);
        const box = el === docScroller() ? { left: 0, width: window.innerWidth, bottom: window.innerHeight } : el.getBoundingClientRect();
        const visibleTop = Math.max(0, top), bottom = Math.min(window.innerHeight, box.bottom);
        if (bottom <= visibleTop) return null;
        // Hit testing avoids measuring every old message on each saved scroll.
        for (const y of [Math.min(bottom - 1, visibleTop + 8), (visibleTop + bottom) / 2]) {
            for (const hit of document.elementsFromPoint(box.left + box.width / 2, y)) {
                const group = hit.closest(MESSAGE_SELECTOR);
                if (!group || !el.contains(group) || group.closest('[role="dialog"], aside, nav')) continue;
                const candidate = hit.closest(BLOCK_SELECTOR);
                const block = candidate && group.contains(candidate) ? candidate : group;
                const path = [];
                for (let node = block; node !== group && node?.parentElement; node = node.parentElement)
                    path.unshift(Array.from(node.parentElement.children).indexOf(node));
                return { id: group.getAttribute('data-message-group-id'), offset: group.getBoundingClientRect().top - top,
                    blockPath: path, blockTag: block.tagName, blockOffset: block.getBoundingClientRect().top - top };
            }
        }
        return null;
    }

    function findAnchor(el, anchor) {
        if (!anchor) return null;
        const root = el === docScroller() ? document : el;
        const group = root.querySelector('[data-message-group-id="' + CSS.escape(anchor.id) + '"]');
        if (!group || !group.getClientRects().length || group.getBoundingClientRect().height <= 0) return null;
        let block = group;
        for (const index of anchor.blockPath || []) block = block?.children[index];
        if (block && block.tagName === anchor.blockTag && Number.isFinite(anchor.blockOffset) && block.getClientRects().length)
            return { node: block, offset: anchor.blockOffset };
        return { node: group, offset: anchor.offset };
    }

    function atBottom(el) {
        return distanceToBottom(el) <= BOTTOM_EPSILON;
    }

    function setUserGesture(el) {
        const until = Date.now() + USER_GESTURE_MS;
        globalUserGestureUntil = until;
        if (el) userGestureUntil.set(el, until);
    }

    function userGestureActive(el) {
        const now = Date.now();
        return now < globalUserGestureUntil || (el && now < (userGestureUntil.get(el) || 0));
    }

    function updateLockFromUserScroll(el) {
        if (!el) return;
        if (atBottom(el)) {
            locked.delete(el);
        } else {
            locked.add(el);
        }
        schedulePersist();
    }

    function shouldBlockDownward(el, nextTop) {
        if (!el) return false;
        if (internalRestoreWrite) return false;

        if (restoring && restoreTarget === el && Number.isFinite(restoreTop)) {
            if (nextTop > el.scrollTop + 1) return true;
        }

        if (!locked.has(el)) return false;
        if (atBottom(el)) {
            locked.delete(el);
            return false;
        }
        return nextTop > el.scrollTop + 1;
    }

    function shouldBlockGeneric(el) {
        if (!el) return false;
        if (restoring && restoreTarget === el) return true;
        if (!locked.has(el)) return false;
        if (atBottom(el)) {
            locked.delete(el);
            return false;
        }
        return true;
    }

    function routeKey() {
        return `${location.pathname}${location.search}`;
    }

    function storageKey() {
        return `chasm-smart-scroll:v1.3:${routeKey()}`;
    }

    function makeScrollState(el) {
        const max = Math.max(0, el.scrollHeight - el.clientHeight);
        return {
            at: Date.now(),
            top: el.scrollTop,
            anchor: captureAnchor(el),
            max,
            bottom: distanceToBottom(el),
            wasBottom: atBottom(el),
        };
    }

    function persistNow() {
        clearTimeout(persistTimer);
        persistTimer = 0;
        if (pendingSavedState && pendingSavedKey !== storageKey()) {
            clearRestoreTimers();
            pendingSavedState = null;
            pendingSavedKey = '';
            restoring = false;
            restoreTarget = null;
            restoreTop = null;
        }
        if (restoring || pendingSavedState) return;
        try {
            const el = primaryScroller();
            if (!el || !el.clientHeight || el.scrollHeight <= el.clientHeight) return;
            sessionStorage.setItem(storageKey(), JSON.stringify(makeScrollState(el)));
        } catch (_) {}
    }

    function schedulePersist() {
        if (persistTimer) return;
        const key = storageKey();
        persistTimer = window.setTimeout(() => {
            persistTimer = 0;
            if (key === storageKey()) persistNow();
        }, 120);
    }

    function loadSavedState() {
        try {
            const raw = sessionStorage.getItem(storageKey());
            if (!raw) return null;
            const state = JSON.parse(raw);
            if (!state || !Number.isFinite(state.top) || !Number.isFinite(state.at)) return null;
            if (Date.now() - state.at > RESTORE_MAX_AGE) return null;
            if (state.anchor && (typeof state.anchor.id !== 'string' || state.anchor.id.length > 200 ||
                !Number.isFinite(state.anchor.offset))) delete state.anchor;
            if (state.anchor && (!Array.isArray(state.anchor.blockPath) || state.anchor.blockPath.length > 32 ||
                state.anchor.blockPath.some(index => !Number.isInteger(index) || index < 0))) delete state.anchor.blockPath;
            return state;
        } catch (_) {
            return null;
        }
    }

    function clearRestoreTimers() {
        restoreTimerIds.forEach(id => clearTimeout(id));
        restoreTimerIds = [];
    }

    function stopRestoreForUser() {
        // 사용자가 실제로 스크롤하기 시작한 순간부터는
        // 과거 위치 복원 재시도가 현재 위치를 다시 끌어당기면 안 된다.
        if (!restoring && !restoreTimerIds.length && !pendingSavedState) return;
        clearRestoreTimers();
        pendingSavedState = null;
        pendingSavedKey = '';
        restoring = false;
        internalRestoreWrite = false;
        restoreTarget = null;
        restoreTop = null;
        schedulePersist();
    }

    // Crack의 본문 편집기(tiptap)만 대상으로 한다. 대화 입력창은 기존 동작을 유지한다.
    function messageEditor(node) {
        if (!(node instanceof Element)) return null;
        const editor = node.closest('[contenteditable="true"], [contenteditable=""], [contenteditable="plaintext-only"]');
        // 꾸미기용 input-box 표시는 CMU가 본문 편집창에도 붙이므로 구분 기준으로 쓰지 않는다.
        return editor?.closest(MESSAGE_SELECTOR) && !editor.closest('.__chat_input_textarea') &&
            editor.getAttribute('aria-readonly') !== 'true' ? editor : null;
    }

    function clearEditorPadding() {
        if (!editorPadding) return;
        const { el, value, priority, applied, hadStyle } = editorPadding;
        // 다른 스크립트가 이후 바꾼 스타일은 덮어쓰지 않는다.
        if (el.style.getPropertyValue('padding-bottom') === applied && el.style.getPropertyPriority('padding-bottom') === 'important') {
            if (value) el.style.setProperty('padding-bottom', value, priority);
            else el.style.removeProperty('padding-bottom');
            if (!hadStyle && !el.style.length) el.removeAttribute('style');
        }
        editorPadding = null;
    }

    function finishEditor() {
        cancelAnimationFrame(editorFrame);
        editorFrame = 0;
        editorNeedsSettle = false;
        clearEditorPadding();
        activeEditor = null;
        editorRoute = '';
        editorPaused = false;
    }

    function pauseEditor() {
        if (!activeEditor) return;
        editorPaused = true;
        cancelAnimationFrame(editorFrame);
        editorFrame = 0;
        editorNeedsSettle = false;
    }

    function caretBox() {
        const selection = window.getSelection();
        if (!selection?.focusNode || !activeEditor?.contains(selection.focusNode)) return null;
        const range = document.createRange();
        range.setStart(selection.focusNode, selection.focusOffset);
        range.collapse(true);
        const box = range.getBoundingClientRect();
        // 빈 문단의 <br>에서는 collapsed Range의 사각형이 비어 있을 수 있다.
        if (box.height) return box;
        const node = selection.focusNode.nodeType === 1 ? selection.focusNode : selection.focusNode.parentElement;
        const block = node?.closest('p, li') || node;
        return block && activeEditor.contains(block) && !block.textContent ? block.getBoundingClientRect() : null;
    }

    function portBox(el) {
        if (el === docScroller()) return { top: 0, bottom: window.innerHeight, scale: 1 };
        const rect = el.getBoundingClientRect();
        const scale = el.offsetHeight ? rect.height / el.offsetHeight || 1 : 1;
        const top = rect.top + el.clientTop * scale;
        return { top, bottom: top + el.clientHeight * scale, scale };
    }

    function revealEditorCaret() {
        let caret = caretBox();
        if (!caret) return;
        const viewport = window.visualViewport;
        const top = viewport?.offsetTop || 0;
        let bottom = top + (viewport?.height || window.innerHeight);
        // 키보드 위로 올라온 입력창도 실제로 커서를 덮는 영역에 포함한다.
        for (const composer of document.querySelectorAll(COMPOSER_SELECTOR)) {
            if (composer.closest(MESSAGE_SELECTOR) || composer.contains(activeEditor)) continue;
            const box = composer.getBoundingClientRect();
            if (box.height > 0 && box.right > caret.left && box.left <= caret.right && box.bottom > top && box.top > top)
                bottom = Math.min(bottom, box.top);
        }
        const ports = [];
        let foundParentPort = false;
        for (let el = activeEditor; el && el !== document.body && el !== document.documentElement; el = el.parentElement) {
            if (!el.clientHeight || !/auto|scroll|overlay/.test(getComputedStyle(el).overflowY)) continue;
            if (isScrollable(el) || (el !== activeEditor && !foundParentPort)) ports.push(el);
            if (el !== activeEditor) foundParentPort = true;
        }
        if (isScrollable(docScroller()) || !ports.length) ports.push(docScroller());
        const outer = ports[ports.length - 1];
        const outerBox = portBox(outer);
        const reserve = Math.max(0, (outerBox.bottom - bottom + 8) / outerBox.scale);
        if (editorPadding && (editorPadding.el !== outer || reserve < editorPadding.reserve)) clearEditorPadding();
        for (const port of ports) {
            const box = portBox(port);
            const low = Math.max(box.top, port === outer ? top : box.top) + 8;
            const high = Math.min(box.bottom, port === outer ? bottom : box.bottom) - 8;
            if (high <= low) continue;
            const move = () => {
                caret = caretBox();
                if (!caret) return;
                const delta = caret.bottom > high ? caret.bottom - high : Math.min(0, caret.top - low);
                if (!delta) return;
                internalRestoreWrite = true;
                try { port.scrollTop += delta / box.scale; }
                finally { internalRestoreWrite = false; }
                if (!atBottom(port)) locked.add(port);
            };
            move();
            caret = caretBox();
            // 마지막 줄은 스크롤 여지가 부족할 때만 필요한 만큼 임시 여백을 둔다.
            if (port === outer && caret && caret.bottom > high + 1 && reserve > 0) {
                if (editorPadding && (port.style.getPropertyValue('padding-bottom') !== editorPadding.applied ||
                    port.style.getPropertyPriority('padding-bottom') !== 'important')) editorPadding = null;
                if (!editorPadding) editorPadding = { el: port, value: port.style.getPropertyValue('padding-bottom'),
                    priority: port.style.getPropertyPriority('padding-bottom'), hadStyle: port.hasAttribute('style'),
                    base: parseFloat(getComputedStyle(port).paddingBottom) || 0 };
                editorPadding.reserve = reserve;
                editorPadding.applied = `${editorPadding.base + reserve}px`;
                port.style.setProperty('padding-bottom', editorPadding.applied, 'important');
                move();
            }
        }
    }

    function scheduleEditorReveal() {
        if (!activeEditor) return;
        editorNeedsSettle = true;
        if (editorFrame) return;
        const reveal = () => {
            const needsSettle = editorNeedsSettle;
            editorNeedsSettle = false;
            if (!activeEditor?.isConnected || messageEditor(document.activeElement) !== activeEditor || editorRoute !== routeKey()) {
                finishEditor();
                return;
            }
            if (editorPaused) { editorFrame = 0; return; }
            revealEditorCaret();
            // 같은 resize에 반응하는 입력창 배치가 끝난 다음 프레임까지 한 번만 확인한다.
            // 대기 중 새 이벤트가 오면 그 이벤트의 배치 완료도 놓치지 않는다.
            editorFrame = 0;
            if (needsSettle || editorNeedsSettle) editorFrame = requestAnimationFrame(reveal);
        };
        editorFrame = requestAnimationFrame(reveal);
    }

    document.addEventListener('focusin', () => {
        const editor = messageEditor(document.activeElement);
        if (editor !== activeEditor || editorRoute !== routeKey()) finishEditor();
        if (!editor) return;
        activeEditor = editor;
        editorRoute = routeKey();
        editorPaused = false;
        stopRestoreForUser();
        scheduleEditorReveal();
    }, true);
    document.addEventListener('focusout', scheduleEditorReveal, true);
    for (const event of ['input', 'selectionchange']) document.addEventListener(event, () => {
        if (activeEditor) {
            editorPaused = false;
            scheduleEditorReveal();
        }
    }, true);
    window.visualViewport?.addEventListener('resize', scheduleEditorReveal, { passive: true });
    window.visualViewport?.addEventListener('scroll', scheduleEditorReveal, { passive: true });
    window.addEventListener('resize', scheduleEditorReveal, { passive: true });
    window.addEventListener('popstate', finishEditor);
    window.addEventListener('hashchange', finishEditor);
    window.navigation?.addEventListener('currententrychange', () => {
        if (activeEditor && editorRoute !== routeKey()) finishEditor();
    });

    function restoreSavedPosition() {
        const state = loadSavedState();
        if (!state) return;
        const key = storageKey();
        pendingSavedState = state;
        pendingSavedKey = key;
        restoring = true;
        clearRestoreTimers();

        const finish = (resolved) => {
            clearRestoreTimers();
            restoring = false;
            restoreTarget = null;
            restoreTop = null;
            if (resolved || key !== storageKey()) {
                pendingSavedState = null;
                pendingSavedKey = '';
            }
            if (resolved && key === storageKey()) schedulePersist();
        };
        const attempt = (last) => {
            if (key !== storageKey()) { finish(false); return; }
            const el = primaryScroller();
            let resolved = false;
            if (el && el.clientHeight > 0) {
                restoreTarget = el;
                const max = Math.max(0, el.scrollHeight - el.clientHeight);
                const reverse = isReverseScroller(el);
                const anchor = findAnchor(el, state.anchor);
                let wanted = state.wasBottom ? (reverse ? 0 : max) : state.top;
                if (!state.wasBottom && anchor) {
                    const scale = el === docScroller() || !el.offsetHeight ? 1 : el.getBoundingClientRect().height / el.offsetHeight;
                    wanted = el.scrollTop + (anchor.node.getBoundingClientRect().top - viewportTop(el) - anchor.offset) / (scale || 1);
                }
                restoreTop = reverse ? Math.max(-max, Math.min(0, wanted)) : Math.max(0, Math.min(max, wanted));
                internalRestoreWrite = true;
                try { el.scrollTop = restoreTop; }
                catch (_) { try { el.scrollTo(0, restoreTop); } catch (_) {} }
                finally { internalRestoreWrite = false; }
                resolved = max > 0 && (state.wasBottom || !state.anchor || !!anchor) && Math.abs(el.scrollTop - wanted) < 2;
                if (state.wasBottom) locked.delete(el); else locked.add(el);
            }
            if (last) restoreTimerIds.push(window.setTimeout(() => finish(resolved), 120));
        };
        // shortcut: only already-rendered history can be restored within the existing 8 s window;
        // add site-specific history loading only if absent-message recovery is required.
        RESTORE_RETRIES.forEach((ms, index) => {
            restoreTimerIds.push(window.setTimeout(() => attempt(index === RESTORE_RETRIES.length - 1), ms));
        });
    }

    window.addEventListener('wheel', (e) => {
        const el = findScrollableFrom(e.target);
        pauseEditor();
        stopRestoreForUser();
        setUserGesture(el);
        requestAnimationFrame(() => updateLockFromUserScroll(el));
    }, { capture: true, passive: true });

    let touchStartY = null;
    let touchTarget = null;
    let touchMoved = false;
    window.addEventListener('touchstart', (e) => {
        if (!e.touches || !e.touches.length) return;
        touchStartY = e.touches[0].clientY;
        touchTarget = findScrollableFrom(e.target);
        touchMoved = false;
    }, { capture: true, passive: true });

    window.addEventListener('touchmove', (e) => {
        if (!e.touches || !e.touches.length || touchStartY == null) return;
        const y = e.touches[0].clientY;
        if (Math.abs(y - touchStartY) < 3) return;
        const el = touchTarget || findScrollableFrom(e.target);
        touchMoved = true;
        pauseEditor();
        stopRestoreForUser();
        setUserGesture(el);
        requestAnimationFrame(() => updateLockFromUserScroll(el));
        touchStartY = y;
    }, { capture: true, passive: true });

    window.addEventListener('touchend', () => {
        const el = touchTarget;
        if (el && touchMoved) {
            setUserGesture(el);
            requestAnimationFrame(() => {
                updateLockFromUserScroll(el);
                schedulePersist();
            });
        }
        touchStartY = null;
        touchTarget = null;
        touchMoved = false;
    }, { capture: true, passive: true });

    window.addEventListener('keydown', (e) => {
        if (e.target instanceof Element && e.target.closest('input, textarea, [contenteditable="true"]')) return;
        if (!['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' ','Spacebar'].includes(e.key)) return;
        const el = primaryScroller();
        stopRestoreForUser();
        setUserGesture(el);
        requestAnimationFrame(() => updateLockFromUserScroll(el));
    }, { capture: true });

    window.addEventListener('scroll', (e) => {
        const el = (e.target === document ? docScroller() : e.target);
        if (!(el instanceof Element)) return;

        if (userGestureActive(el)) updateLockFromUserScroll(el);
        schedulePersist();
    }, { capture: true, passive: true });

    window.addEventListener('pagehide', () => { finishEditor(); persistNow(); }, true);
    window.addEventListener('beforeunload', persistNow, true);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') persistNow();
    }, true);

    const originalScrollTopDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollTop');
    if (originalScrollTopDescriptor && originalScrollTopDescriptor.set && originalScrollTopDescriptor.get) {
        Object.defineProperty(Element.prototype, 'scrollTop', {
            set: function(value) {
                if (shouldBlockDownward(this, Number(value))) return;
                return originalScrollTopDescriptor.set.call(this, value);
            },
            get: function() {
                return originalScrollTopDescriptor.get.call(this);
            },
            configurable: true
        });
    }

    const elementScrollMethods = ['scrollTo', 'scroll', 'scrollBy'];
    elementScrollMethods.forEach(method => {
        if (!Element.prototype[method]) return;
        const original = Element.prototype[method];
        Element.prototype[method] = function(...args) {
            let nextTop = this.scrollTop;
            const first = args[0];

            if (method === 'scrollBy') {
                if (typeof first === 'object' && first) nextTop += Number(first.top || 0);
                else if (args.length > 1) nextTop += Number(args[1] || 0);
            } else {
                if (typeof first === 'object' && first) nextTop = Number(first.top ?? nextTop);
                else if (args.length > 1) nextTop = Number(args[1] ?? nextTop);
            }

            if (shouldBlockDownward(this, nextTop)) return;
            return original.apply(this, args);
        };
    });

    ['scrollIntoView', 'scrollIntoViewIfNeeded'].forEach(method => {
        if (!Element.prototype[method]) return;
        const original = Element.prototype[method];
        Element.prototype[method] = function(...args) {
            const container = findScrollableFrom(this);
            const editor = messageEditor(this);
            if ((!editor || editor !== messageEditor(document.activeElement)) && shouldBlockGeneric(container)) return;
            if (editor) scheduleEditorReveal();
            return original.apply(this, args);
        };
    });

    const originalFocus = HTMLElement.prototype.focus;
    HTMLElement.prototype.focus = function(...args) {
        const container = findScrollableFrom(this);
        if (!messageEditor(this) && shouldBlockGeneric(container)) {
            try {
                return originalFocus.call(this, { ...(args[0] || {}), preventScroll: true });
            } catch (_) {
                return;
            }
        }
        return originalFocus.apply(this, args);
    };

    const winMethods = ['scrollTo', 'scroll', 'scrollBy'];
    winMethods.forEach(method => {
        const original = window[method];
        if (typeof original !== 'function') return;
        window[method] = function(...args) {
            const el = docScroller();
            let nextTop = el.scrollTop;
            const first = args[0];

            if (method === 'scrollBy') {
                if (typeof first === 'object' && first) nextTop += Number(first.top || 0);
                else if (args.length > 1) nextTop += Number(args[1] || 0);
            } else {
                if (typeof first === 'object' && first) nextTop = Number(first.top ?? nextTop);
                else if (args.length > 1) nextTop = Number(args[1] ?? nextTop);
            }

            if (shouldBlockDownward(el, nextTop)) return;
            return original.apply(this, args);
        };
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', restoreSavedPosition, { once: true });
    } else {
        restoreSavedPosition();
    }
})();
