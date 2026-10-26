// ==UserScript==
// @name         크랙 메시지 바로 복사·삭제
// @namespace    crack-message-quick-actions
// @version      1.0.0
// @description  보낸 메시지에 전체 복사·삭제, AI 답변에 삭제 아이콘을 추가합니다. 삭제 대상이 확인되면 확인창 없이 실행합니다.
// @match        https://crack.wrtn.ai/*
// @grant        unsafeWindow
// @run-at       document-end
// @noframes
// @updateURL    https://raw.githubusercontent.com/Chapchu1/crack-userscripts/main/crack-message-quick-actions.meta.js
// @downloadURL  https://raw.githubusercontent.com/Chapchu1/crack-userscripts/main/crack-message-quick-actions.user.js
// ==/UserScript==

(() => {
    'use strict';
    const w = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
    const GROUP = '[data-message-group-id]', CONTROLS = '[data-cqa-controls]';
    const DIALOGS = '[role="dialog"], [role="alertdialog"], dialog';
    const bars = new WeakMap(), managed = new Set(), queued = new Set();
    let frame = 0, flow = null, route = location.pathname, toastTimer = 0;
    const text = value => String(value ?? '').replace(/\s+/g, ' ').trim();
    const roomId = () => location.pathname.match(/^\/(?:stories\/[^/]+\/episodes|characters\/[^/]+\/chats)\/([a-f\d]{24})(?:\/|$)/i)?.[1] || '';
    const style = document.createElement('style');
    style.textContent = `
      [data-cqa-controls]{display:inline-flex;align-items:center;gap:2px;vertical-align:middle;flex-shrink:0;margin-inline-end:3px;line-height:1;z-index:2}
      [data-cqa-controls][data-cqa-absolute]{position:absolute;right:100%;top:50%;transform:translateY(-50%);white-space:nowrap}
      [data-cqa-action]{box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;min-width:32px;padding:6px;border:0;border-radius:8px;background:transparent;color:inherit;opacity:.65;cursor:pointer;touch-action:manipulation;vertical-align:middle}
      [data-cqa-action]:hover,[data-cqa-action]:focus-visible{opacity:1;background:color-mix(in srgb,currentColor 10%,transparent)}
      [data-cqa-action]:focus-visible{outline:2px solid currentColor;outline-offset:1px}
      [data-cqa-action]:disabled{opacity:.3;cursor:wait}
      [data-cqa-action] svg{width:18px;height:18px;display:block;pointer-events:none}
      [data-cqa-pending-ui]{visibility:hidden!important}
      #cqa-notice{position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 12px);transform:translateX(-50%);z-index:2147483647;max-width:calc(100vw - 28px);box-sizing:border-box;padding:10px 14px;border-radius:12px;background:#272b34;color:#fff;font:14px/1.5 system-ui,sans-serif;text-align:center;pointer-events:none}
    `;
    (document.head || document.documentElement).appendChild(style);
    function notify(message) {
        let node = document.getElementById('cqa-notice');
        if (!node) { node = document.createElement('div'); node.id = 'cqa-notice'; node.setAttribute('role', 'status'); document.body.appendChild(node); }
        node.textContent = message; clearTimeout(toastTimer);
        toastTimer = setTimeout(() => node.remove(), 2200);
    }
    function fiberOf(node) {
        for (let el = node, i = 0; el && i < 15; el = el.parentElement, i++) {
            const raw = el.wrappedJSObject || el;
            const key = Object.keys(raw).find(k => k.startsWith('__reactFiber$'));
            if (key) return raw[key];
        }
        return null;
    }
    function liveProps(fiber) {
        let root = fiber;
        for (let i = 0; root?.return && i < 3000; i++) root = root.return;
        return (fiber.alternate && root?.stateNode?.current && root.stateNode.current !== root ? fiber.alternate : fiber).memoizedProps;
    }
    function resolve(group) {
        if (!group?.isConnected || !roomId()) return null;
        try {
            let state = null, store = null, ids = null, shown = null;
            const markdowns = group.querySelectorAll('.wrtn-markdown');
            for (let f = fiberOf(markdowns[0] || group), depth = 0; f && depth < 500; f = f.return, depth++) {
                const props = liveProps(f), value = props?.value;
                if (!ids && Array.isArray(props?.messageIds)) ids = Array.from(props.messageIds);
                if (shown === null && typeof props?.content === 'string' && 'isUserMessage' in props) shown = props.content;
                if (!value || typeof value !== 'object') continue;
                if (!state && typeof value.status === 'string' && 'chatId' in value && 'selectedMessageId' in value) state = value;
                if (!store && typeof value.getState === 'function' && typeof value.getState()?.messages?.get === 'function') store = value;
            }
            if (!state || state.chatId !== roomId() || !store) return null;
            const local = store.getState(), groupId = group.getAttribute('data-message-group-id');
            if (!ids && Array.isArray(local.messageGroups)) {
                const members = local.messageGroups.find(list => Array.isArray(list) && list[0] === groupId);
                if (members) ids = Array.from(members);
            }
            ids ||= [groupId];
            if (!ids.includes(groupId)) return null;
            const candidates = ids.map(id => local.messages.get(id)).filter(row => row && typeof row.content === 'string' && ['user', 'assistant'].includes(row.role));
            let row = candidates.length === 1 && ids.length === 1 ? candidates[0] : null;
            if (!row) {
                const selected = candidates.find(item => item._id === state.selectedMessageId);
                const exact = markdowns.length === 1 && shown !== null ? candidates.filter(item => item.content === shown) : [];
                if (selected && (shown === null || markdowns.length > 1 || selected.content === shown)) row = selected;
                else if (exact.length === 1) row = exact[0];
            }
            if (!row || !ids.includes(row._id)) return null;
            return { id: row._id, content: row.content, role: row.role, ids: JSON.stringify(ids),
                selection: state.selectedMessageId || '', state, store, groupId };
        } catch (_) { return null; }
    }
    function triggerOf(group) {
        return Array.from(group.querySelectorAll('button, [role="button"]')).find(button => !button.closest(CONTROLS) &&
            /메시지\s*(?:옵션|메뉴)/.test(text(button.getAttribute('aria-label') || button.querySelector('[aria-label]')?.getAttribute('aria-label')))) || null;
    }
    function editOf(group) {
        return Array.from(group.querySelectorAll('button')).find(button => !button.closest(CONTROLS) &&
            (/수정|편집/.test(text([button.getAttribute('aria-label'), button.title, button.textContent].join(' '))) ||
                button.querySelector('svg.lucide-pencil, svg.lucide-square-pen'))) || null;
    }
    function visible(node) {
        return !!node?.isConnected && !node.hidden && node.getAttribute('aria-hidden') !== 'true' &&
            node.getAttribute('data-state') !== 'closed' && node.getClientRects().length > 0 && getComputedStyle(node).display !== 'none';
    }
    function icon(kind) {
        const button = document.createElement('button'); button.type = 'button'; button.dataset.cqaAction = kind;
        const label = kind === 'copy' ? '보낸 메시지 전체 복사' : '메시지 바로 삭제';
        button.setAttribute('aria-label', label); button.title = kind === 'copy' ? label : '메시지 바로 삭제 (되돌릴 수 없음)';
        const path = kind === 'copy' ? '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>'
            : '<path d="M3 6h18M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M5 6l1 14a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1l1-14M10 10v7M14 10v7"/>';
        button.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
        return button;
    }
    function mount(group) {
        const previous = bars.get(group), info = resolve(group), trigger = triggerOf(group);
        if (!info || !trigger) { previous?.remove(); managed.delete(group); return; }
        let bar = previous;
        if (!bar || bar.dataset.cqaRole !== info.role) {
            bar?.remove(); bar = document.createElement('span'); bar.dataset.cqaControls = ''; bar.dataset.cqaRole = info.role;
            if (info.role === 'user') bar.appendChild(icon('copy'));
            bar.appendChild(icon('delete')); bars.set(group, bar);
        }
        const edit = info.role === 'assistant' ? editOf(group) : null;
        const anchor = edit || trigger.closest('.dropdown-button') || trigger;
        if (!edit && !anchor.matches('button,[role="button"]') && ['absolute', 'fixed'].includes(getComputedStyle(anchor).position)) {
            bar.dataset.cqaAbsolute = '';
            if (bar.parentElement !== anchor) anchor.appendChild(bar);
        } else {
            delete bar.dataset.cqaAbsolute;
            if (bar.parentElement !== anchor.parentElement || bar.nextElementSibling !== anchor) anchor.before(bar);
        }
        managed.add(group);
    }
    function queue(group) {
        if (!group) return;
        queued.add(group);
        if (!frame) frame = requestAnimationFrame(() => { frame = 0; const batch = [...queued]; queued.clear(); batch.forEach(mount); });
    }
    function scan(node) {
        if (node.nodeType !== 1 || node.closest?.(CONTROLS)) return;
        if (node.matches(GROUP)) queue(node);
        node.querySelectorAll(GROUP).forEach(queue);
    }
    function sameTarget(job) {
        if (location.pathname !== job.path || document.hidden || !job.group.isConnected) return false;
        const now = resolve(job.group), old = job.info;
        return !!now && now.store === old.store && now.state.status === 'IDLE' && !now.state.isEdit &&
            (!now.selection || now.selection === now.id || now.selection === old.selection) &&
            now.groupId === old.groupId && now.id === old.id && now.role === old.role && now.content === old.content && now.ids === old.ids &&
            !job.group.querySelector('[contenteditable="true"]');
    }
    function dialogMatches(job, dialog, button) {
        // Generic title/timing is not ownership. Require an explicit native target;
        // unsupported modal implementations keep their manual confirmation.
        const ids = new Set(), rooms = new Set();
        const add = value => { if (typeof value === 'string' && value) ids.add(value); };
        const inspect = props => {
            if (!props || typeof props !== 'object') return;
            add(props.messageId); add(props.targetMessageId);
            for (const message of [props.message, props.targetMessage, props.messageToDelete]) {
                if (message && typeof message === 'object') add(message._id || message.id || message.messageId);
            }
            if (typeof props.chatId === 'string' && props.chatId) rooms.add(props.chatId);
        };
        try {
            for (const node of [dialog, button]) {
                add(node.getAttribute('data-message-id')); add(node.getAttribute('data-target-message-id'));
                // Only this actual dialog/button's own props are evidence. A
                // surrounding page/provider's messageId may describe another UI.
                const raw = node.wrappedJSObject || node;
                const key = Object.keys(raw).find(name => name.startsWith('__reactFiber$'));
                const props = key ? liveProps(raw[key]) : null;
                inspect(props); inspect(props?.data); inspect(props?.payload);
            }
        } catch (_) { return false; }
        return ids.size === 1 && ids.has(job.info.id) && [...rooms].every(id => id === roomId());
    }
    function finish(message) {
        const job = flow; flow = null;
        if (!job) return;
        clearTimeout(job.timer);
        job.menu?.removeAttribute('data-cqa-pending-ui'); job.dialog?.removeAttribute('data-cqa-pending-ui');
        job.button.disabled = false; job.button.removeAttribute('aria-busy');
        if (message) notify(message);
    }
    function deadline(job, ms) {
        clearTimeout(job.timer);
        job.timer = setTimeout(() => { if (flow === job) finish('처리를 확인하지 못했어요. 기존 메뉴에서 상태를 확인해 주세요.'); }, ms);
    }
    function activate(node) {
        const options = { bubbles: true, cancelable: true, composed: true, view: window, button: 0, buttons: 1, pointerId: 735, pointerType: 'touch', isPrimary: true };
        try { node.focus({ preventScroll: true }); } catch (_) {}
        if (typeof PointerEvent === 'function') node.dispatchEvent(new PointerEvent('pointerdown', options));
        node.dispatchEvent(new MouseEvent('mousedown', options));
        if (typeof PointerEvent === 'function') node.dispatchEvent(new PointerEvent('pointerup', { ...options, buttons: 0 }));
        node.dispatchEvent(new MouseEvent('mouseup', { ...options, buttons: 0 }));
        node.click();
    }
    function advance() {
        const job = flow; if (!job) return;
        if (job.phase !== 'working' && !sameTarget(job)) { finish('대화 상태가 바뀌어 삭제를 멈췄어요. 다시 선택해 주세요.'); return; }
        if (job.phase === 'menu') {
            const menus = Array.from(document.querySelectorAll('[role="menu"]')).filter(visible);
            const own = menus.filter(menu => !job.oldMenus.has(menu) &&
                ((job.trigger.id && (menu.getAttribute('aria-labelledby') || '').split(/\s+/).includes(job.trigger.id)) ||
                    (menu.id && job.trigger.getAttribute('aria-controls') === menu.id)));
            if (own.length !== 1) return;
            const items = Array.from(own[0].querySelectorAll('[role="menuitem"], button')).filter(item =>
                visible(item) && !item.disabled && item.getAttribute('aria-disabled') !== 'true' && /^삭제(?:하기)?$/.test(text(item.textContent || item.getAttribute('aria-label'))));
            if (items.length !== 1) return;
            job.menu = own[0]; job.menu.setAttribute('data-cqa-pending-ui', ''); job.phase = 'dialog';
            deadline(job, 1000); activate(items[0]);
        }
        if (flow !== job) return;
        if (job.phase === 'dialog') {
            const fresh = Array.from(document.querySelectorAll(DIALOGS)).filter(node => visible(node) && !job.oldDialogs.has(node));
            if (!fresh.length) return;
            const dialog = fresh[0];
            const headings = Array.from(dialog.querySelectorAll('h1,h2,h3,[role="heading"]'));
            for (const id of (dialog.getAttribute('aria-labelledby') || '').split(/\s+/)) { const label = document.getElementById(id); if (label) headings.push(label); }
            const title = headings.some(node => /^(?:스토리|대화) 내용을 삭제하시겠어요\?$|^메시지를 삭제하시겠어요\?$/.test(text(node.textContent)));
            const buttons = Array.from(dialog.querySelectorAll('button')).filter(node => visible(node) && !node.disabled &&
                node.getAttribute('aria-disabled') !== 'true' && /^삭제(?:하기)?$/.test(text(node.textContent)));
            if (fresh.length !== 1 || !title || buttons.length !== 1 || dialog.querySelector('input,textarea,[contenteditable="true"]')) {
                finish('삭제 확인창을 정확히 구분하지 못해 멈췄어요.'); return;
            }
            if (!dialogMatches(job, dialog, buttons[0])) {
                finish('확인창의 삭제 대상을 확인하지 못해 자동 삭제를 멈췄어요.'); return;
            }
            if (!sameTarget(job)) { finish('대화가 바뀌어 삭제를 멈췄어요.'); return; }
            job.dialog = dialog; job.phase = 'working'; dialog.setAttribute('data-cqa-pending-ui', '');
            deadline(job, 18000);
            buttons[0].click(); // Exactly once. The native handler and installed error-repair script own the request.
        }
        if (flow !== job || job.phase !== 'working') return;
        if (!job.dialog.isConnected || job.dialog.getAttribute('data-state') === 'closed') { finish(); return; }
        const repairNotice = job.dialog.querySelector('[data-crack-delete-repair]');
        if (repairNotice && /못|멈췄/.test(repairNotice.textContent)) finish();
    }
    function deleteNow(group, button) {
        if (flow) return;
        const info = resolve(group), trigger = triggerOf(group);
        if (!info || !trigger) { notify('삭제할 메시지를 정확히 찾지 못했어요.'); return; }
        const oldDialogs = new Set(document.querySelectorAll(DIALOGS));
        if ([...oldDialogs].some(visible)) { notify('열린 창을 먼저 닫아 주세요.'); return; }
        const job = { group, button, info, trigger, path: location.pathname, oldDialogs,
            oldMenus: new Set(Array.from(document.querySelectorAll('[role="menu"]')).filter(visible)), phase: 'menu', timer: 0 };
        if (!sameTarget(job)) { notify('답변 생성이나 편집이 끝난 뒤 삭제해 주세요.'); return; }
        flow = job; button.disabled = true; button.setAttribute('aria-busy', 'true');
        deadline(job, 1000);
        // Let the initiating click finish before opening/confirming native UI.
        // Otherwise a later listener (including the error repair) can mistake
        // that original icon click for a new click cancelling its pending work.
        setTimeout(() => { if (flow === job) { activate(trigger); advance(); } }, 0);
    }
    async function copyAll(group) {
        const info = resolve(group);
        if (!info || info.role !== 'user') { notify('보낸 글 원문을 찾지 못했어요.'); return; }
        try {
            if (!navigator.clipboard?.writeText) throw new Error('clipboard-unavailable');
            await navigator.clipboard.writeText(info.content); notify('보낸 글 전체를 복사했어요.');
        } catch (_) { notify('클립보드에 복사하지 못했어요. 브라우저의 복사 권한을 확인해 주세요.'); }
    }
    document.addEventListener('click', event => {
        const button = event.target?.closest?.('[data-cqa-action]');
        if (!button) { if (flow && event.isTrusted) finish(); return; }
        event.preventDefault(); event.stopPropagation();
        const group = button.closest(GROUP); if (!group || button.disabled) return;
        if (button.dataset.cqaAction === 'copy') void copyAll(group);
        else deleteNow(group, button);
    }, true);
    document.addEventListener('pointerdown', event => {
        if (flow && event.isTrusted && !event.target?.closest?.(CONTROLS)) finish();
        const group = event.target?.closest?.(GROUP); if (group && !bars.get(group)?.isConnected) queue(group);
    }, { capture: true, passive: true });
    const observer = new MutationObserver(records => {
        if (route !== location.pathname) {
            route = location.pathname; finish(); managed.forEach(group => bars.get(group)?.remove()); managed.clear(); scan(document.body);
        }
        for (const record of records) {
            const group = record.target.nodeType === 1 ? record.target.closest(GROUP) : record.target.parentElement?.closest(GROUP);
            if (record.type === 'attributes') { if (group) queue(group); continue; }
            if (group && !bars.get(group)?.isConnected && !record.target.closest?.(CONTROLS)) queue(group);
            for (const node of record.addedNodes) scan(node);
        }
        if (records.some(record => record.removedNodes.length)) for (const group of managed) if (!group.isConnected) managed.delete(group);
        advance();
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-message-group-id'] });
    scan(document.body);
    w.addEventListener('load', () => scan(document.body), { once: true });
    w.addEventListener('popstate', () => { finish(); scan(document.body); });
    w.addEventListener('pagehide', () => { finish(); cancelAnimationFrame(frame); frame = 0; queued.clear(); observer.disconnect(); });
    w.addEventListener('pageshow', event => { if (event.persisted) { observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-message-group-id'] }); scan(document.body); } });
})();
