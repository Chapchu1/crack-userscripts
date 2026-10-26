// ==UserScript==
// @name         크랙 생성 실패 메시지 삭제 보정
// @namespace    crack-delete-error-fix
// @version      1.0.1
// @description  생성 지연 오류 메시지를 삭제할 때 서버의 같은 답변을 확인하여 임시 ID 오류를 보정합니다.
// @match        https://crack.wrtn.ai/*
// @grant        unsafeWindow
// @run-at       document-start
// @noframes
// @updateURL    https://raw.githubusercontent.com/Chapchu1/crack-userscripts/main/crack-delete-error-fix.meta.js
// @downloadURL  https://raw.githubusercontent.com/Chapchu1/crack-userscripts/main/crack-delete-error-fix.user.js
// ==/UserScript==

(() => {
    'use strict';
    const w = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
    const originalFetch = w.fetch;
    if (typeof originalFetch !== 'function') return;
    const OBJECT_ID = /^[a-f\d]{24}$/i;
    const UUID = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
    const NOTICE = 'AI 답변 생성이 지연되어 요청을 완료하지 못했어요. (크래커는 차감되지 않습니다.)';
    const normalize = text => String(text ?? '').replace(/\s+/g, ' ').trim();
    const groupOf = node => node?.closest?.('[data-message-group-id]') || null;
    let lastGroup = null, pending = null, permit = null, permitTimer = 0;

    function here() {
        const match = location.pathname.match(/^\/stories\/[^/]+\/episodes\/([a-f\d]{24})(?:\/|$)/i);
        return match ? { id: match[1], path: location.pathname,
            base: `https://crack-api.wrtn.ai/crack-gen/v3/chats/${match[1]}/messages` } : null;
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
        return (fiber.alternate && root?.stateNode?.current && root.stateNode.current !== root
            ? fiber.alternate : fiber).memoizedProps;
    }
    function bridge(group) {
        let store = null, state = null;
        for (let f = fiberOf(group?.querySelector('.wrtn-markdown') || group), i = 0; f && i < 500; f = f.return, i++) {
            const value = liveProps(f)?.value;
            if (!value || typeof value !== 'object') continue;
            try {
                if (!store && typeof value.getState === 'function' && typeof value.getState()?.messages?.get === 'function') store = value;
                if (!state && typeof value.status === 'string' && 'chatId' in value && 'selectedMessageId' in value) state = value;
            } catch (_) { /* An unrelated provider is not a chat bridge. */ }
        }
        return { store, state };
    }
    function timeoutMessage(row) {
        return row?.role === 'assistant' && typeof row._id === 'string' && row._id.length === 26 &&
            !OBJECT_ID.test(row._id) && !row.turnId && !row.parentTurnId && normalize(row.content) === NOTICE;
    }
    function capture(group, room) {
        if (!group?.isConnected || !room) return null;
        const { store, state } = bridge(group);
        if (!store || state?.chatId !== room.id || state.status !== 'IDLE') return null;
        const messages = store.getState().messages;
        const id = group.getAttribute('data-message-group-id'), target = messages.get(id);
        if (!timeoutMessage(target) || (state.selectedMessageId && state.selectedMessageId !== id)) return null;
        if (normalize(group.querySelector('.wrtn-markdown')?.textContent) !== NOTICE) return null;
        if (Array.from(messages.values()).filter(timeoutMessage).length !== 1) return null;
        // Both normal and column-reverse containers occur. Use actual vertical order,
        // not Map insertion order or an assumed DOM direction. Only the visible tail qualifies.
        const groups = Array.from(document.querySelectorAll('[data-message-group-id]'))
            .map(node => ({ node, rect: node.getBoundingClientRect() }))
            .filter(entry => entry.rect.height > 0).sort((a, b) => a.rect.top - b.rect.top);
        const index = groups.findIndex(entry => entry.node === group);
        if (index < 1 || index !== groups.length - 1) return null;
        const userGroup = groups[index - 1].node;
        const userId = userGroup.getAttribute('data-message-group-id'), user = messages.get(userId);
        if (!OBJECT_ID.test(userId) || user?._id !== userId || user.role !== 'user' ||
            typeof user.content !== 'string' || !UUID.test(user.turnId)) return null;
        return { room, group, id, at: Date.now(), content: target.content, userGroup, userId, userContent: user.content,
            userTurn: user.turnId, ids: new Set(messages.keys()), store };
    }
    function stillCurrent(snapshot) {
        if (here()?.path !== snapshot.room.path) return false;
        const now = capture(snapshot.group, snapshot.room);
        return !!now && now.store === snapshot.store && now.id === snapshot.id && now.content === snapshot.content &&
            now.userId === snapshot.userId && now.userContent === snapshot.userContent && now.userTurn === snapshot.userTurn &&
            now.ids.size === snapshot.ids.size && Array.from(now.ids).every(id => snapshot.ids.has(id));
    }
    function serverTarget(rows, snapshot) {
        if (!Array.isArray(rows) || !rows.length || rows.length > 40 || new Set(rows.map(row => row?._id)).size !== rows.length) return null;
        const user = rows.find(row => row?._id === snapshot.userId);
        if (user?.role !== 'user' || user.content !== snapshot.userContent || !UUID.test(snapshot.userTurn) ||
            user.turnId !== snapshot.userTurn) return null;
        const children = rows.filter(row => row?.parentTurnId === user.turnId);
        if (children.length !== 1) return null;
        const target = children[0];
        // Restrict a head-page lookup to its newest answer/user pair. Never search
        // older rows for an otherwise plausible blank reply.
        if (rows[0] !== target || rows[1] !== user) return null;
        if (target.role !== 'assistant' || target.content !== '' || !OBJECT_ID.test(target._id) || !UUID.test(target.turnId) ||
            snapshot.ids.has(target._id) || rows.some(row => row?.parentTurnId === target.turnId)) return null;
        return target._id;
    }
    function notice(dialog, text) {
        if (!dialog.isConnected) return;
        let node = dialog.querySelector('[data-crack-delete-repair]');
        if (!node) {
            node = document.createElement('p'); node.setAttribute('data-crack-delete-repair', '');
            node.setAttribute('role', 'status');
            node.style.cssText = 'margin:10px 0;font-size:14px;line-height:1.5;white-space:normal;overflow-wrap:anywhere;color:inherit';
            dialog.appendChild(node);
        }
        node.textContent = text;
    }
    function clearPermit() {
        permit = null; clearTimeout(permitTimer); permitTimer = 0;
    }
    function cancel() {
        if (pending) { pending.cancelled = true; pending.controller.abort(); }
        clearPermit();
    }
    async function prepare(job) {
        const { snapshot, button, dialog } = job;
        const timer = setTimeout(() => job.controller.abort(), 18000);
        try {
            const headers = { accept: 'application/json, text/plain, */*', platform: 'web', 'wrtn-locale': 'ko-KR' };
            const token = document.cookie.match(/(?:^|;\s*)access_token=([^;]*)/);
            if (token) headers.authorization = 'Bearer ' + decodeURIComponent(token[1]);
            const response = await originalFetch.call(w, snapshot.room.base + '?limit=40', {
                method: 'GET', headers, credentials: 'include', cache: 'no-store', signal: job.controller.signal
            });
            if (!response.ok) throw new Error('read-failed');
            const json = await response.json();
            const id = serverTarget(json?.data?.messages, snapshot);
            if (job.cancelled || !dialog.isConnected || dialog.getAttribute('data-state') === 'closed') return;
            if (!stillCurrent(snapshot)) {
                notice(dialog, '대화 상태가 바뀌어 삭제를 멈췄어요. 현재 메시지를 다시 선택해 주세요.'); return;
            }
            if (!id) {
                notice(dialog, '서버에서 삭제할 답변을 하나로 확인하지 못했어요. 대화는 변경하지 않았어요.'); return;
            }
            clearPermit(); permit = { snapshot, id };
            permitTimer = setTimeout(clearPermit, 18000);
            job.replaying = true;
            button.disabled = false;
            dialog.querySelector('[data-crack-delete-repair]')?.remove();
            button.click(); // The site's original confirmed deletion owns the write and success UI.
        } catch (_) {
            if (!job.cancelled) notice(dialog, '삭제할 답변을 확인하지 못했어요. 연결 상태를 확인한 뒤 다시 눌러 주세요.');
        } finally {
            clearTimeout(timer);
            if (!job.replaying && button.isConnected) button.disabled = job.wasDisabled;
            if (pending === job) pending = null;
        }
    }
    document.addEventListener('pointerdown', event => {
        const group = groupOf(event.target);
        if (group) { lastGroup = group; if (!pending) clearPermit(); }
    }, { capture: true, passive: true });
    document.addEventListener('click', event => {
        const button = event.target?.closest?.('button, [role="button"]');
        if (pending?.replaying && button === pending.button) return;
        if (pending && button !== pending.button) cancel();
        const dialog = button?.closest('[role="dialog"], [role="alertdialog"], dialog');
        if (!dialog || !/^삭제(?:하기)?$/.test(button.textContent.trim()) || !/스토리 내용.*삭제/.test(dialog.textContent)) return;
        const room = here();
        const snapshot = capture(lastGroup, room);
        if (!snapshot) return;
        event.preventDefault(); event.stopImmediatePropagation();
        if (pending) return;
        clearPermit();
        const job = { snapshot, button, dialog, controller: new w.AbortController(), wasDisabled: button.disabled,
            cancelled: false, replaying: false };
        pending = job; button.disabled = true;
        notice(dialog, '삭제할 답변을 확인하고 있어요…');
        void prepare(job);
    }, true);
    function correctedURL(method, input) {
        if (!permit || String(method).toUpperCase() !== 'DELETE') return null;
        let url;
        try { url = new URL(typeof input === 'string' ? input : input?.url || input?.href || '', location.href); }
        catch (_) { return null; }
        const entry = permit;
        if (url.href !== entry.snapshot.room.base + '/' + encodeURIComponent(entry.snapshot.id)) return null;
        clearPermit();
        if (!stillCurrent(entry.snapshot)) return null;
        return { url: entry.snapshot.room.base + '/' + entry.id, snapshot: entry.snapshot, id: entry.id };
    }
    function deletionCompleted(entry) {
        // Only a successful, explicitly confirmed repair is a cancellation hint.
        // Suite independently rechecks server history; this does not unlock it itself.
        try { w.dispatchEvent(new w.CustomEvent('crack:failed-answer-deleted', { detail: {
            apiChatId: entry.snapshot.room.id, messageId: entry.id, userId: entry.snapshot.userId,
            userTurn: entry.snapshot.userTurn, startedAt: entry.snapshot.at, at: Date.now()
        } })); } catch (_) { /* Deletion must still complete without Suite. */ }
    }
    w.fetch = function(input, init) {
        const entry = correctedURL(init?.method || input?.method || 'GET', input);
        if (!entry) return originalFetch.apply(this, arguments);
        const args = Array.from(arguments);
        args[0] = typeof input?.clone === 'function' ? new w.Request(entry.url, input) : entry.url;
        const result = originalFetch.apply(this, args);
        Promise.resolve(result).then(response => { if (response?.ok) deletionCompleted(entry); }, () => {});
        return result;
    };
    const open = w.XMLHttpRequest?.prototype?.open;
    if (open) {
        const requests = new WeakMap(), send = w.XMLHttpRequest.prototype.send;
        w.XMLHttpRequest.prototype.open = function(method, url) {
            requests.delete(this);
            const entry = correctedURL(method, url);
            if (!entry) return open.apply(this, arguments);
            const args = Array.from(arguments); args[1] = entry.url;
            const result = open.apply(this, args); requests.set(this, entry); return result;
        };
        w.XMLHttpRequest.prototype.send = function() {
            const entry = requests.get(this);
            if (!entry) return send.apply(this, arguments);
            const done = () => {
                this.removeEventListener('loadend', done);
                if (requests.get(this) !== entry) return;
                requests.delete(this);
                if (this.status >= 200 && this.status < 300) deletionCompleted(entry);
            };
            this.addEventListener('loadend', done);
            try { return send.apply(this, arguments); }
            catch (error) { this.removeEventListener('loadend', done); requests.delete(this); throw error; }
        };
    }
    w.addEventListener('pagehide', cancel);
    w.addEventListener('popstate', cancel);
})();
