// ==UserScript==
// @name         Chasm Anti-Scroll Jacking (v1.3.1 스마트 가디언)
// @namespace    https://github.com/milkyway0308/crystallized-chasm
// @version      1.3.2
// @description  1.3.2: 새로고침 위치를 메시지·문단 기준으로 복원하고 역방향 스크롤 및 로딩 중 저장 덮어쓰기를 보완합니다. 평소에는 크랙의 자연스러운 자동 따라가기를 유지하고, 사용자가 직접 스크롤하면 자동 스크롤 탈취를 막습니다. 새로고침 뒤 위치를 복원하되 사용자가 스크롤하는 순간 복원 재시도를 즉시 중단합니다.
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

    window.addEventListener('pagehide', persistNow, true);
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
            if (shouldBlockGeneric(container)) return;
            return original.apply(this, args);
        };
    });

    const originalFocus = HTMLElement.prototype.focus;
    HTMLElement.prototype.focus = function(...args) {
        const container = findScrollableFrom(this);
        if (shouldBlockGeneric(container)) {
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
