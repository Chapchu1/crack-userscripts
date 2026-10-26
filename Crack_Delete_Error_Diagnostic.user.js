// ==UserScript==
// @name         크랙 삭제 오류 진단 (임시 확인용)
// @namespace    crack-delete-error-diagnostic
// @version      0.1.0
// @description  삭제 오류의 식별값 형식을 익명 기록합니다. 삭제 동작을 바꾸거나 추가 API 요청을 보내지 않습니다. 확인 후 제거하세요.
// @match        https://crack.wrtn.ai/*
// @grant        unsafeWindow
// @run-at       document-start
// @noframes
// ==/UserScript==

(() => {
    'use strict';
    const w = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
    const KEY = 'crack-delete-diagnostic:v1';
    const MAX_AGE = 30 * 60 * 1000;
    let saved = null;
    try {
        const value = JSON.parse(sessionStorage.getItem(KEY) || 'null');
        if (value?.report?.version === '0.1.0' && typeof value.salt === 'string' &&
            Date.now() - value.report.updatedAt < MAX_AGE && Array.isArray(value.report.events)) saved = value;
        else if (value) sessionStorage.removeItem(KEY);
    } catch (_) { /* 저장소가 막혀도 현재 페이지의 진단은 가능하다. */ }
    let report = saved?.report || null;
    let salt = saved?.salt || '';
    let armed = !!report, epoch = 0, chain = Promise.resolve(), lastGroup = null;
    let statusTimer = 0;
    const roomId = () => {
        const match = location.pathname.match(/\/(?:episodes|chats?)\/([^/?#]+)/);
        try { return match ? decodeURIComponent(match[1]) : null; } catch (_) { return null; }
    };
    const enqueue = fn => {
        const capturedEpoch = epoch;
        chain = chain.then(async () => { if (capturedEpoch === epoch) await fn(capturedEpoch); }).catch(() => {});
    };
    async function tag(value, type = 'id') {
        if (value == null || value === '') return null;
        const bytes = new TextEncoder().encode(salt + '\n' + type + '\n' + String(value));
        const hash = await crypto.subtle.digest('SHA-256', bytes);
        return type + '-' + Array.from(new Uint8Array(hash)).slice(0, 10).map(v => v.toString(16).padStart(2, '0')).join('');
    }
    async function identity(value) {
        if (value == null || value === '') return null;
        const text = String(value);
        const kind = /^[a-f\d]{24}$/i.test(text) ? 'object-id'
            : /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(text) ? 'uuid'
            : /^(?:temp|tmp|dummy|placeholder|optimistic)(?:[-_:]|$)/i.test(text) ? 'temporary' : 'other';
        return { tag: await tag(text), kind, length: text.length };
    }
    function pickMessage(row) {
        if (!row || typeof row !== 'object') return null;
        return { id: row._id ?? row.id ?? row.messageId, role: row.role, parentTurnId: row.parentTurnId,
            turnId: row.turnId, content: typeof row.content === 'string' ? row.content : null };
    }
    async function message(row) {
        if (!row) return null;
        return { id: await identity(row.id), role: ['user', 'assistant', 'system'].includes(row.role) ? row.role : 'other',
            parentTurnId: await identity(row.parentTurnId), turnId: await identity(row.turnId),
            contentLength: row.content?.length ?? null, contentTag: await tag(row.content, 'text'),
            timeoutNotice: typeof row.content === 'string' && /AI 답변 생성이 지연되어/.test(row.content) };
    }
    async function bodyIds(raw) {
        const result = {};
        try {
            const text = await raw;
            if (typeof text !== 'string' || text.length > 16384) return result;
            const body = JSON.parse(text);
            for (const key of ['messageId', 'message_id', '_id', 'id', 'parentTurnId', 'turnId']) {
                if (typeof body?.[key] === 'string' || typeof body?.[key] === 'number') result[key] = await identity(body[key]);
            }
        } catch (_) {}
        return result;
    }
    const fiberOf = node => {
        const key = node && Object.keys(node).find(k => k.startsWith('__reactFiber$'));
        return key ? node[key] : null;
    };
    function liveProps(fiber) {
        let root = fiber;
        for (let i = 0; root?.return && i < 3000; i++) root = root.return;
        return (fiber.alternate && root?.stateNode?.current && root.stateNode.current !== root ? fiber.alternate : fiber).memoizedProps;
    }
    function snapshot(anchor, requestedId) {
        const group = lastGroup?.isConnected ? lastGroup : document.querySelector('[data-message-group-id]');
        let store = null, state = null;
        for (let fiber = fiberOf(anchor) || fiberOf(group), depth = 0; fiber && depth < 500; fiber = fiber.return, depth++) {
            const value = liveProps(fiber)?.value;
            if (!value || typeof value !== 'object') continue;
            try {
                if (!store && typeof value.getState === 'function' && typeof value.getState()?.messages?.get === 'function') store = value;
                if (!state && typeof value.status === 'string' && 'chatId' in value && 'selectedMessageId' in value) state = value;
            } catch (_) {}
        }
        const selectedId = state?.selectedMessageId;
        const targetId = requestedId || selectedId || group?.getAttribute('data-message-group-id');
        let target = null;
        try { target = pickMessage(store?.getState().messages.get(targetId)); } catch (_) {}
        return { bridgeFound: !!store, chatMatchesRoute: state ? String(state.chatId) === roomId() : null,
            status: ['IDLE','GENERATING','ERROR','LOADING'].includes(state?.status) ? state.status : 'unknown',
            selectedId, groupId: group?.getAttribute('data-message-group-id'), target };
    }
    async function client(raw) {
        return { bridgeFound: raw.bridgeFound, chatMatchesRoute: raw.chatMatchesRoute, status: raw.status,
            selectedId: await identity(raw.selectedId), groupId: await identity(raw.groupId), target: await message(raw.target) };
    }
    function persist() {
        if (!report) return;
        report.updatedAt = Date.now();
        report.events = report.events.slice(-10);
        try { sessionStorage.setItem(KEY, JSON.stringify({ salt, report })); } catch (_) {}
        show();
    }
    function clear() {
        epoch++; armed = false; report = null; salt = '';
        clearTimeout(statusTimer); statusTimer = 0;
        try { sessionStorage.removeItem(KEY); } catch (_) {}
        document.getElementById('crack-delete-diagnostic')?.remove();
    }
    function show() {
        if (!report || !document.body || document.getElementById('crack-delete-diagnostic')) return;
        const box = document.createElement('div'); box.id = 'crack-delete-diagnostic';
        box.style.cssText = 'position:fixed;top:calc(env(safe-area-inset-top,0px) + 8px);right:8px;z-index:2147483647;display:flex;gap:6px;padding:8px;background:#263e40;color:#fff;border:1px solid #a8d7cc;border-radius:12px;box-shadow:0 2px 10px #0005;font:14px sans-serif;max-width:calc(100vw - 16px)';
        const save = document.createElement('button'); save.id = 'crack-delete-diagnostic-save'; save.textContent = '삭제 오류 진단 파일 받기';
        save.type = 'button'; save.style.cssText = 'padding:8px;border:0;border-radius:8px;background:#d4eee5;color:#153b32;font:inherit;cursor:pointer';
        save.onclick = () => enqueue(async capturedEpoch => {
            if (!report || capturedEpoch !== epoch) return;
            const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
            const link = document.createElement('a'); link.href = url; link.download = 'crack-delete-diagnostic.json';
            document.body.appendChild(link); link.click(); link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        });
        const close = document.createElement('button'); close.id = 'crack-delete-diagnostic-clear'; close.textContent = '닫기'; close.type = 'button';
        close.style.cssText = 'border:0;background:transparent;color:#fff;padding:8px;font:inherit;cursor:pointer';
        close.onclick = clear; box.append(save, close); document.body.appendChild(box);
    }
    document.addEventListener('pointerdown', event => {
        const group = event.target?.closest?.('[data-message-group-id]');
        if (group) lastGroup = group;
    }, { capture: true, passive: true });
    document.addEventListener('click', event => {
        const button = event.target?.closest?.('button, [role="button"]');
        const dialog = button?.closest('[role="dialog"], [role="alertdialog"], dialog');
        if (!dialog || !/^삭제(?:하기)?$/.test(button.textContent.trim()) || !/(?:스토리 내용|메시지|대화).*삭제/.test(dialog.textContent)) return;
        const room = roomId(); if (!room) return;
        const raw = snapshot(button);
        armed = true;
        enqueue(async capturedEpoch => {
            if (!salt) salt = Array.from(crypto.getRandomValues(new Uint8Array(24))).map(v => v.toString(16).padStart(2,'0')).join('');
            const roomTag = await tag(room);
            if (capturedEpoch !== epoch) return;
            if (!report || report.room !== roomTag) report = { version: '0.1.0', purpose: 'diagnostic-only', room: roomTag, events: [], serverMessages: [] };
            const entry = { kind: 'confirm', at: Date.now(), client: await client(raw) };
            if (capturedEpoch !== epoch) return;
            report.events.push(entry); persist();
            clearTimeout(statusTimer);
            statusTimer = setTimeout(() => {
                if (capturedEpoch !== epoch || !report) return;
                entry.pageContainsInvalidIdentifier = !!document.body?.textContent?.includes('Invalid identifier format');
                persist();
            }, 500);
        });
    }, true);
    function metadata(method, input) {
        try {
            const url = new URL(typeof input === 'string' ? input : input?.url || input?.href || '', location.href);
            if (!['https://crack-api.wrtn.ai','https://contents-api.wrtn.ai'].includes(url.origin)) return null;
            const match = url.pathname.match(/^\/(crack-gen|character-chat)\/(v\d+\/chats|character-chats)\/([^/]+)\/messages(?:\/([^/]+))?\/?$/);
            const verb = String(method || 'GET').toUpperCase();
            if (!match || !['GET','DELETE'].includes(verb) || (verb === 'GET' && (match[4] || url.searchParams.has('cursor')))) return null;
            const room = decodeURIComponent(match[3]);
            if (room !== roomId()) return null;
            return { method: verb, resource: match[1] + '/' + match[2], room, id: match[4] ? decodeURIComponent(match[4]) : null };
        } catch (_) { return null; }
    }
    function consume(meta, status, json, raw, capturedEpoch, body) {
        if (!meta) return;
        enqueue(async () => {
            if (capturedEpoch !== epoch || !report || await tag(meta.room) !== report.room) return;
            if (meta.method === 'GET') {
                if (status < 200 || status >= 300 || !Array.isArray(json?.data?.messages)) return;
                const rows = await Promise.all(json.data.messages.slice(0,40).map(row => message(pickMessage(row))));
                if (capturedEpoch !== epoch) return;
                report.serverMessages = rows;
            } else {
                const entry = { kind: 'delete-response', at: Date.now(), resource: meta.resource, status,
                    requestedId: await identity(meta.id), invalidIdentifier: /invalid identifier format/i.test(String(json?.message || json?.error?.message || '')),
                    bodyIds: await bodyIds(body), client: await client(raw) };
                if (capturedEpoch !== epoch) return;
                report.events.push(entry);
            }
            persist();
        });
    }
    const originalFetch = w.fetch;
    if (typeof originalFetch === 'function') w.fetch = function(input, init) {
        const meta = armed ? metadata(init?.method || input?.method, input) : null;
        const capturedEpoch = epoch;
        const raw = meta?.method === 'DELETE' ? snapshot(null, meta.id) : null;
        let body = init?.body;
        if (meta?.method === 'DELETE' && body === undefined && typeof input?.clone === 'function') {
            try { body = input.clone().text().catch(() => null); } catch (_) {}
        }
        const result = originalFetch.apply(this, arguments);
        if (meta && typeof result?.then === 'function') result.then(response => {
            let copy;
            try { copy = response.clone(); } catch (_) { return; }
            copy.json().catch(() => null).then(json => consume(meta, response.status, json, raw, capturedEpoch, body));
        }).catch(() => {});
        return result;
    };
    const xhrMeta = new WeakMap();
    const XHR = w.XMLHttpRequest;
    if (XHR?.prototype?.open && XHR.prototype.send) {
        const open = XHR.prototype.open, send = XHR.prototype.send;
        XHR.prototype.open = function(method, url) {
            xhrMeta.set(this, armed ? metadata(method, url) : null);
            return open.apply(this, arguments);
        };
        XHR.prototype.send = function() {
            const meta = xhrMeta.get(this), capturedEpoch = epoch;
            const raw = meta?.method === 'DELETE' ? snapshot(null, meta.id) : null;
            const body = arguments[0];
            if (meta) this.addEventListener('loadend', () => {
                let json = null;
                try { json = this.responseType === 'json' ? this.response : JSON.parse(this.responseText); } catch (_) {}
                consume(meta, this.status, json, raw, capturedEpoch, body);
            }, { once: true });
            return send.apply(this, arguments);
        };
    }
    const resume = () => enqueue(async () => { if (report && await tag(roomId()) === report.room) show(); });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', resume, { once: true });
    else resume();
})();
