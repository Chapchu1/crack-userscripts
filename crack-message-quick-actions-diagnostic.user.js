// ==UserScript==
// @name         크랙 메시지 바로 복사·삭제 (원인 확인용)
// @namespace    crack-message-quick-actions-diagnostic
// @version      0.2.0
// @description  기존 점 세 개 → 삭제 → 취소 동작의 메뉴 구조만 기록합니다. 자동 삭제하지 않습니다.
// @match        https://crack.wrtn.ai/*
// @grant        unsafeWindow
// @run-at       document-end
// @noframes
// ==/UserScript==

(() => {
    'use strict';
    if (document.getElementById('cqa-passive-diagnostic')) return;
    const w = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
    const GROUP = '[data-message-group-id]';
    const text = value => String(value ?? '').replace(/\s+/g, ' ').trim();
    const roomId = () => location.pathname.match(/^\/(?:stories\/[^/]+\/episodes|characters\/[^/]+\/chats)\/([a-f\d]{24})(?:\/|$)/i)?.[1] || '';
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
    const panel = document.createElement('div'); panel.id = 'cqa-passive-diagnostic';
    panel.style.cssText = 'position:fixed;top:calc(env(safe-area-inset-top,0px) + 54px);left:50%;transform:translateX(-50%);z-index:2147483647;box-sizing:border-box;width:max-content;max-width:94vw;padding:8px 12px;border:1px solid #a1a8e5;border-radius:10px;background:#30364c;color:#fff;font:13px/1.5 system-ui,sans-serif;text-align:center;pointer-events:auto';
    const hint = document.createElement('div'); hint.textContent = '기존 ⋯ → 삭제 → 확인창에서 취소를 눌러 주세요';
    const save = document.createElement('button'); save.type = 'button'; save.dataset.cqaDiagnosticDownload = '';
    save.textContent = '메뉴 진단 저장'; save.disabled = true;
    save.style.cssText = 'margin-top:5px;padding:5px 12px;border:1px solid #a1a8e5;border-radius:7px;background:#414965;color:#fff;font:inherit;cursor:pointer;pointer-events:auto';
    panel.append(hint, save); document.body.append(panel);
    const HANDLERS = ['onClick', 'onPointerDown', 'onPointerUp', 'onMouseDown', 'onMouseUp', 'onTouchStart', 'onTouchEnd', 'onKeyDown', 'onSelect', 'onDelete', 'onConfirm', 'onOpenChange'];
    const TAGS = new Set(['button', 'div', 'span', 'svg', 'path', 'section', 'main', 'body', 'html', 'ul', 'li', 'a', 'dialog', 'h1', 'h2', 'h3']);
    const ROLES = new Set(['button', 'menu', 'menuitem', 'dialog', 'alertdialog', 'presentation', 'none']);
    let session = null, observer = null, frame = 0, expiry = 0, probes = [];
    const ownFiber = node => { const raw = node?.wrappedJSObject || node; return raw?.[Object.keys(raw || {}).find(key => key.startsWith('__reactFiber$'))]; };
    const ownProps = node => { const raw = node?.wrappedJSObject || node; const key = Object.keys(raw || {}).find(key => key.startsWith('__reactProps$')), fiber = ownFiber(node); return key ? raw[key] : fiber ? liveProps(fiber) : null; };
    const handlers = props => HANDLERS.filter(key => typeof props?.[key] === 'function');
    const visible = node => !!node?.isConnected && !node.hidden && node.getAttribute('aria-hidden') !== 'true' && node.getAttribute('data-state') !== 'closed' && !!node.getClientRects().length && getComputedStyle(node).visibility !== 'hidden';
    const label = node => { const value = text(node?.textContent || node?.getAttribute?.('aria-label')); return /^삭제(?:하기)?$/.test(value) ? 'delete' : /^(?:취소|닫기)$/.test(value) ? 'cancel' : ''; };
    function relation(ids, expected) {
        const values = ids.filter(value => typeof value === 'string' && value);
        return !values.length ? 'absent' : !expected ? 'unknown' : values.every(value => value === expected) ? 'same' : values.includes(expected) ? 'mixed' : 'other';
    }
    function fiberShape(node) {
        const out = [];
        for (let f = ownFiber(node), depth = 0; f && depth < 80 && out.length < 16; f = f.return, depth++) {
            const p = liveProps(f); if (!p || typeof p !== 'object') continue;
            const ids = [], rooms = [];
            for (const props of [p, p.data, p.payload]) if (props && typeof props === 'object') {
                ids.push(props.messageId, props.targetMessageId);
                for (const message of [props.message, props.targetMessage, props.messageToDelete]) {
                    if (message && typeof message === 'object') ids.push(message._id || message.id || message.messageId);
                }
                if (Array.isArray(props.messageIds)) ids.push(...props.messageIds.slice(0, 40));
                rooms.push(props.chatId);
            }
            const target = relation(ids, session.info?.id), room = relation(rooms, session.room), names = handlers(p);
            const group = relation([f.stateNode?.getAttribute?.('data-message-group-id')], session.groupId);
            if (target !== 'absent' || room !== 'absent' || group !== 'absent' || names.length) out.push({depth, target, room, group, handlers:names});
        }
        return out;
    }
    function nodeShape(node) {
        const tag = node?.tagName?.toLowerCase(), role = node?.getAttribute?.('role');
        return {tag:TAGS.has(tag) ? tag : 'other', role:ROLES.has(role) ? role : role ? 'other' : 'absent',
            target:relation([node.getAttribute('data-message-id'), node.getAttribute('data-target-message-id')], session.info?.id),
            visible:visible(node), disabled:!!node.disabled || node.getAttribute('aria-disabled') === 'true',
            hasId:!!node.id, hasControls:!!node.getAttribute('aria-controls'), expanded:node.getAttribute('aria-expanded') === 'true',
            popupMenu:node.getAttribute('aria-haspopup') === 'menu', dropdown:node.classList.contains('dropdown-button'),
            sameGroup:node.closest(GROUP) === session.group, sameWrapper:!!session.wrapper && node.closest('.dropdown-button') === session.wrapper,
            insideTrigger:session.trigger.contains(node), containsTrigger:node.contains(session.trigger),
            linked:!!((session.trigger.id && (node.getAttribute('aria-labelledby') || '').split(/\s+/).includes(session.trigger.id)) || (node.id && session.trigger.getAttribute('aria-controls') === node.id)),
            handlers:handlers(ownProps(node)), fiber:fiberShape(node)};
    }
    function pathShape(node) {
        const out = [];
        for (let el = node, i = 0; el && i < 8; el = el.parentElement, i++) { out.push(nodeShape(el)); if (el === session.group || el === document.body) break; }
        return out;
    }
    function actionNodes() {
        const nodes = new Set();
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
                if (node.nodeType === 1) return node === panel || node.matches('script,style,input,textarea,pre,code,.wrtn-markdown,[contenteditable="true"]') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_SKIP;
                return NodeFilter.FILTER_ACCEPT;
            }
        });
        for (let node, count = 0; count < 3000 && nodes.size < 12 && (node = walker.nextNode()); count++) {
            if (!/^삭제(?:하기)?$|^(?:취소|닫기)$/.test(text(node.textContent))) continue;
            let target = node.parentElement, el = target;
            for (let depth = 0; el && depth < 5 && label(el); el = el.parentElement, depth++) {
                target = el;
                if (el.matches('button,[role="menuitem"],[role="button"]') || handlers(ownProps(el)).length) break;
            }
            if (visible(target)) nodes.add(target);
        }
        return [...nodes];
    }
    function capture() {
        if (!session) return;
        try {
            const shape = {
                trigger:nodeShape(session.trigger), targetConnected:session.group.isConnected,
                menus:Array.from(document.querySelectorAll('[role="menu"],[data-radix-menu-content],[data-radix-popper-content-wrapper]')).filter(visible).slice(0, 8).map(nodeShape),
                dialogs:Array.from(document.querySelectorAll('[role="dialog"],[role="alertdialog"],dialog')).filter(visible).slice(0, 8).map(nodeShape),
                actions:actionNodes().map(node => ({label:label(node), node:nodeShape(node), path:pathShape(node)}))
            };
            session.last = shape;
            const signature = JSON.stringify(shape);
            if (signature !== session.signature && session.trace.length < 24) {
                session.signature = signature; session.trace.push({elapsedMs:Math.round(performance.now() - session.start), ...shape});
            }
        } catch (_) { session.captureError = true; }
    }
    function stop(reason) {
        if (!session) return;
        observer?.disconnect(); observer = null; cancelAnimationFrame(frame); frame = 0;
        clearTimeout(expiry); probes.forEach(clearTimeout); probes = [];
        capture(); session.reason = reason;
        hint.textContent = '기록 준비됨 · 메뉴 진단 저장을 눌러 주세요';
    }
    function schedule() {
        if (!observer || frame) return;
        frame = requestAnimationFrame(() => { frame = 0; if (location.pathname !== session.path) stop('navigation'); else if (session.trace.length < 24) capture(); });
    }
    function probe() {
        probes.forEach(clearTimeout); probes = [0, 80, 300].map(ms => setTimeout(schedule, ms));
    }
    function start(trigger, group) {
        if (session) stop('replaced');
        session = {trigger, group, wrapper:trigger.closest('.dropdown-button'), info:resolve(group), groupId:group.getAttribute('data-message-group-id'),
            room:roomId(), path:location.pathname, start:performance.now(), events:[], trace:[], last:null, signature:'', reason:'recording', captureError:false};
        session.initial = nodeShape(trigger); session.triggerPath = pathShape(trigger);
        observer = new MutationObserver(records => {
            if (records.some(record => !panel.contains(record.target))) schedule();
        });
        observer.observe(document.body, {childList:true, subtree:true, attributes:true, attributeFilter:['id','role','aria-controls','aria-labelledby','aria-expanded','aria-hidden','data-state','hidden','data-message-id','data-target-message-id']});
        expiry = setTimeout(() => stop('capture-ended'), 30000);
        save.disabled = false; hint.textContent = '기존 삭제 메뉴 → 확인창에서는 취소를 눌러 주세요'; capture();
    }
    document.addEventListener('click', event => {
        if (!event.isTrusted || panel.contains(event.target)) return;
        try {
            const target = event.target?.closest?.('button,[role="button"]'), group = target?.closest(GROUP);
            let action = '';
            if (group && /메시지\s*(?:옵션|메뉴)/.test(text(target.getAttribute('aria-label') || target.querySelector('[aria-label]')?.getAttribute('aria-label')))) {
                start(target, group); action = 'trigger';
            } else if (observer) {
                if (location.pathname !== session.path) { stop('navigation'); return; }
                for (let node = event.target?.nodeType === 1 ? event.target : event.target?.parentElement, i = 0; node && i < 5; node = node.parentElement, i++) {
                    if (label(node)) { action = label(node); break; }
                }
            }
            if (!observer) return;
            if (action && session.events.length < 8) session.events.push({elapsedMs:Math.round(performance.now() - session.start), action, path:pathShape(event.target.closest('button,[role="menuitem"],[role="button"]') || event.target)});
            capture(); probe();
            if (action === 'cancel') probes.push(setTimeout(() => stop('cancelled'), 350));
        } catch (_) { if (session) session.captureError = true; }
    }, {capture:true, passive:true});
    save.addEventListener('click', () => {
        if (!session) return;
        stop(session.reason === 'recording' ? 'exported' : session.reason);
        const report = {diagnosticVersion:'0.2.0', mode:'manual-native-menu', reason:session.reason, captureError:session.captureError,
            trigger:session.initial, triggerPath:session.triggerPath, events:session.events, trace:session.trace, last:session.last};
        const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], {type:'application/json;charset=utf-8'}));
        const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'crack-quick-actions-diagnostic.json';
        document.body.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
        hint.textContent = '진단 파일 저장됨';
    });
    w.addEventListener('pagehide', () => stop('pagehide'));
    w.addEventListener('popstate', () => stop('navigation'));
})();
