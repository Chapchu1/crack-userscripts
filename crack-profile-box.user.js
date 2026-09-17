// ==UserScript==
// @name         Crack Profile Box (크랙 프로필 박스)
// @namespace    Crack Profile Box
// @version      1.2.3
// @description  크랙 프로필 박스
// @author       chu
// @updateURL   https://raw.githubusercontent.com/Chapchu1/crack-userscripts/main/crack-profile-box.user.js
// @downloadURL https://raw.githubusercontent.com/Chapchu1/crack-userscripts/main/crack-profile-box.user.js
// @homepageURL https://github.com/Chapchu1/crack-userscripts
// @match        https://crack.wrtn.ai/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(() => {
    'use strict';
    const META_KEY = 'crack_persona_manager_meta_v1';
    const GROUP_ID_KEY = 'crack_persona_manager_profile_group_id_v1';
    const LAUNCHER_POSITION_KEY = 'crack_persona_manager_launcher_position_v1';
    const LAUNCHER_PLACEMENT_KEY = 'crack_persona_manager_launcher_placement_v1';
    const API_BASE = 'https://crack-api.wrtn.ai/crack-api';
    const CHAT_API_BASE = 'https://crack-api.wrtn.ai/crack-gen';
    const EXTERNAL_PROFILE_LAUNCHER_SELECTOR = [
        '#chud-profile-btn',
        '#chud-side-content [data-side-key="profileButton"]',
        '#chud-side-content button[aria-label*="대화 프로필"]',
        '#chud-side-content button[title*="대화 프로필"]',
        '#cmu-toolbar-wrapper [data-cmu-toolbar-button="profile"]',
        '[data-cpm-external-profile-launcher="true"]'
    ].join(', ');
    const state = {
        profiles: [],
        meta: {},
        search: '',
        view: 'all',
        sort: 'created-asc',
        selectedTags: new Set(),
        expandedProfiles: new Set(),
        selectedProfileIds: new Set(),
        selectionMode: false,
        currentChatId: null,
        currentProfileId: null,
        managerOpen: false,
        launcherPlacement: 'floating'
    };
    let profileGroupId = null;
    let authToken = null;
    let profileApiBase = API_BASE;
    let nativeFetch = null;
    let apiSessionHeaders = {};
    let lastApiAuthObservedAt = 0;
    let siteObserver = null;
    let observerTimer = null;
    let profileRefreshPromise = null;
    let chatProfileChangeSequence = 0;
    let toastTimer = null;
    let searchDebounceTimer = null;
    let externalProfileBridgeInstalled = false;
    let viewportSyncFrame = null;
    let viewportSyncInstalled = false;
    let viewportSettleTimers = [];
    // =========================================================
    // 기본 유틸
    // =========================================================
    function qs(selector, root = document) {
        return root.querySelector(selector);
    }
    function qsa(selector, root = document) {
        return [...root.querySelectorAll(selector)];
    }
    function getVisibleViewport() {
        const viewport = window.visualViewport;
        const documentElement = document.documentElement;
        const width = viewport?.width || documentElement?.clientWidth || window.innerWidth || 1;
        const height = viewport?.height || documentElement?.clientHeight || window.innerHeight || 1;
        return {
            left: Number.isFinite(viewport?.offsetLeft) ? Math.max(0, viewport.offsetLeft) : 0,
            top: Number.isFinite(viewport?.offsetTop) ? Math.max(0, viewport.offsetTop) : 0,
            width: Math.max(1, width),
            height: Math.max(1, height)
        };
    }
    function syncViewportLayout() {
        const viewport = getVisibleViewport();
        const root = qs('#cpm-root');
        if (root) {
            root.style.setProperty('--cpm-viewport-left', `${viewport.left}px`);
            root.style.setProperty('--cpm-viewport-top', `${viewport.top}px`);
            root.style.setProperty('--cpm-viewport-width', `${viewport.width}px`);
            root.style.setProperty('--cpm-viewport-height', `${viewport.height}px`);
        }
        const toast = qs('.cpm-toast');
        if (toast) {
            toast.style.setProperty('--cpm-toast-left', `${viewport.left + viewport.width / 2}px`);
            toast.style.setProperty('--cpm-toast-top', `${viewport.top + 12}px`);
        }
        const launcher = qs('#cpm-launcher.cpm-custom-position');
        if (!launcher) {
            return;
        }
        const rect = launcher.getBoundingClientRect();
        const minLeft = viewport.left + 6;
        const minTop = viewport.top + 6;
        const maxLeft = Math.max(minLeft, viewport.left + viewport.width - rect.width - 6);
        const maxTop = Math.max(minTop, viewport.top + viewport.height - rect.height - 6);
        const left = Math.max(minLeft, Math.min(maxLeft, rect.left));
        const top = Math.max(minTop, Math.min(maxTop, rect.top));
        launcher.style.setProperty('--cpm-launcher-left', `${left}px`);
        launcher.style.setProperty('--cpm-launcher-top', `${top}px`);
    }
    function requestViewportSync(waitForFold = false) {
        if (viewportSyncFrame !== null) {
            cancelAnimationFrame(viewportSyncFrame);
        }
        viewportSyncFrame = requestAnimationFrame(() => {
            viewportSyncFrame = null;
            syncViewportLayout();
        });
        if (!waitForFold) {
            return;
        }
        viewportSettleTimers.forEach(clearTimeout);
        viewportSettleTimers = [100, 300, 700].map((delay) =>
            setTimeout(syncViewportLayout, delay)
        );
    }
    function installViewportSync() {
        if (viewportSyncInstalled) {
            return;
        }
        const handleResize = () => requestViewportSync(true);
        const handleViewportMove = () => requestViewportSync(false);
        window.addEventListener('resize', handleResize, { passive: true });
        window.addEventListener('orientationchange', handleResize, { passive: true });
        window.visualViewport?.addEventListener('resize', handleResize, { passive: true });
        window.visualViewport?.addEventListener('scroll', handleViewportMove, { passive: true });
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                requestViewportSync(true);
            }
        });
        viewportSyncInstalled = true;
        requestViewportSync(true);
    }
    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
    function escapeRegExp(value) {
        return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    function highlightSearchText(value) {
        const text = String(value ?? '');
        const query = state.search.trim();
        if (!query) {
            return escapeHtml(text);
        }
        const pattern = new RegExp(escapeRegExp(query), 'giu');
        let html = '';
        let lastIndex = 0;
        for (const match of text.matchAll(pattern)) {
            const index = match.index ?? 0;
            html += escapeHtml(text.slice(lastIndex, index));
            html += `<mark class="cpm-highlight">${escapeHtml(match[0])}</mark>`;
            lastIndex = index + match[0].length;
        }
        html += escapeHtml(text.slice(lastIndex));
        return html;
    }
    function getSearchSnippet(value) {
        const text = String(value ?? '');
        const query = state.search.trim();
        if (!query) return '';
        const index = text.toLocaleLowerCase().indexOf(query.toLocaleLowerCase());
        if (index < 0) return '';
        const start = Math.max(0, index - 34);
        const end = Math.min(text.length, index + query.length + 54);
        const snippet = `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`;
        return highlightSearchText(snippet);
    }
    function sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    function normalizeText(value) {
        return String(value ?? '').trim();
    }
    function normalizeTags(value) {
        const tags = Array.isArray(value) ? value : String(value ?? '').split(',');
        return [
            ...new Set(
                tags
                    .map((tag) => normalizeText(tag).replace(/^#/, ''))
                    .filter(Boolean)
            )
        ];
    }
    function rememberProfileGroupId(value) {
        const id = String(value ?? '');
        if (!/^[a-f0-9]{24}$/i.test(id)) {
            return false;
        }
        profileGroupId = id;
        try {
            localStorage.setItem(GROUP_ID_KEY, id);
        } catch {
            // 저장하지 못해도 현재 페이지에서는 계속 사용한다.
        }
        return true;
    }
    function loadProfileGroupId() {
        try {
            rememberProfileGroupId(localStorage.getItem(GROUP_ID_KEY));
        } catch {
            // 무시
        }
    }
    function loadLauncherPlacement() {
        try {
            state.launcherPlacement =
                localStorage.getItem(LAUNCHER_PLACEMENT_KEY) === 'embedded' ? 'embedded' : 'floating';
        } catch {
            state.launcherPlacement = 'floating';
        }
    }
    function setLauncherPlacement(value) {
        const placement = value === 'embedded' ? 'embedded' : 'floating';
        state.launcherPlacement = placement;
        try {
            localStorage.setItem(LAUNCHER_PLACEMENT_KEY, placement);
        } catch {
            // 저장하지 못해도 현재 페이지에서는 적용한다.
        }
        const launcherPlaced = ensureLauncher();
        renderLauncherPlacementControls();
        return launcherPlaced;
    }
    function findProfileGroupId(value, depth = 0) {
        if (!value || typeof value !== 'object' || depth > 8) {
            return null;
        }
        if (Array.isArray(value)) {
            for (const item of value) {
                const found = findProfileGroupId(item, depth + 1);
                if (found) return found;
            }
            return null;
        }
        const candidate = String(value.profileId ?? '');
        if (/^[a-f0-9]{24}$/i.test(candidate) && value._id && ('information' in value || 'isRepresentative' in value)) {
            return candidate;
        }
        for (const item of Object.values(value)) {
            const found = findProfileGroupId(item, depth + 1);
            if (found) return found;
        }
        return null;
    }
    function getCurrentChatId() {
        const path = location.pathname;
        const match = path.match(/\/(?:stories\/[^/]+\/episodes|characters\/[^/]+\/chats|u\/[^/]+\/c)\/([^/?#]+)/i);
        return match?.[1] || null;
    }
    function findCurrentChatProfile(value, chatId, depth = 0) {
        if (!value || typeof value !== 'object' || depth > 8) {
            return null;
        }
        if (Array.isArray(value)) {
            for (const item of value) {
                const found = findCurrentChatProfile(item, chatId, depth + 1);
                if (found) return found;
            }
            return null;
        }
        if (String(value._id ?? '') === String(chatId) && 'chatProfile' in value) {
            const id = value.chatProfile?._id;
            return {
                found: true,
                id: id ? String(id) : null
            };
        }
        for (const item of Object.values(value)) {
            const found = findCurrentChatProfile(item, chatId, depth + 1);
            if (found) return found;
        }
        return null;
    }
    function updateCurrentProfile(json) {
        const chatId = getCurrentChatId();
        if (!chatId) {
            state.currentChatId = null;
            state.currentProfileId = null;
            return false;
        }
        const result = findCurrentChatProfile(json, chatId);
        if (!result?.found) {
            return false;
        }
        const changed = state.currentChatId !== chatId || state.currentProfileId !== result.id;
        state.currentChatId = chatId;
        state.currentProfileId = result.id;
        if (changed && state.managerOpen) {
            renderProfilesOnly();
        }
        return true;
    }
    function isCurrentProfile(profile) {
        return !!(
            profile?.id &&
            state.currentChatId === getCurrentChatId() &&
            String(profile.id) === state.currentProfileId
        );
    }
    function refreshProfilesWhenReady() {
        const hasApiProfiles = state.profiles.some((profile) => !!profile.id);
        if (!profileGroupId || !authToken || hasApiProfiles || profileRefreshPromise) {
            return;
        }
        profileRefreshPromise = Promise.resolve()
            .then(refreshProfilesFromAPI)
            .finally(() => {
                profileRefreshPromise = null;
            });
    }
    // =========================================================
    // 확프로 자체 저장 데이터
    // =========================================================
    function normalizeMetaEntry(value) {
        const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
        return {
            memo: normalizeText(source.memo),
            tags: normalizeTags(Array.isArray(source.tags) ? source.tags : []),
            favorite: source.favorite === true,
            pinned: source.pinned === true
        };
    }
    function loadMeta() {
        try {
            const raw = localStorage.getItem(META_KEY);
            const parsed = raw ? JSON.parse(raw) : {};
            state.meta = {};
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                for (const [profileId, value] of Object.entries(parsed)) {
                    state.meta[profileId] = normalizeMetaEntry(value);
                }
            }
        } catch {
            state.meta = {};
        }
    }
    function saveMeta() {
        try {
            localStorage.setItem(META_KEY, JSON.stringify(state.meta));
        } catch (error) {
            console.warn('[CPM] 메타 저장 실패', error);
        }
    }
    function getMeta(profileId) {
        if (!profileId) return null;
        const current = state.meta[profileId];
        if (
            !current ||
            typeof current !== 'object' ||
            !Array.isArray(current.tags) ||
            typeof current.memo !== 'string' ||
            typeof current.favorite !== 'boolean' ||
            typeof current.pinned !== 'boolean'
        ) {
            state.meta[profileId] = normalizeMetaEntry(current);
        }
        return state.meta[profileId];
    }
    // =========================================================
    // 사이트 프로필 식별
    // =========================================================
    function extractGroupId(url) {
        if (typeof url !== 'string') return null;
        const match = url.match(/\/profiles\/([a-f0-9]{24})\/chat-profiles(?:\/[a-f0-9]{24})?/i);
        return match?.[1] || null;
    }
    function rememberProfileApiBase(url) {
        try {
            const parsed = new URL(String(url), location.href);
            if (parsed.hostname !== 'crack-api.wrtn.ai') return false;
            const marker = parsed.pathname.match(/^(.*)\/profiles\/[a-f0-9]{24}\/chat-profiles(?:\/|$)/i);
            if (!marker) return false;
            profileApiBase = `${parsed.origin}${marker[1]}`.replace(/\/$/, '');
            return true;
        } catch {
            return false;
        }
    }
    function isReusableApiHeader(name) {
        const lower = String(name || '').toLowerCase();
        return (
            lower === 'authorization' ||
            lower.startsWith('x-wrtn-') ||
            lower === 'x-api-key' ||
            lower === 'x-access-token' ||
            lower === 'x-auth-token' ||
            lower === 'x-id-token' ||
            lower === 'x-device-id' ||
            lower === 'x-client-id' ||
            lower === 'x-csrf-token' ||
            lower === 'x-xsrf-token'
        );
    }
    function rememberApiHeader(name, value) {
        const lower = String(name || '').toLowerCase();
        const normalizedValue = String(value ?? '').trim();
        if (!isReusableApiHeader(lower) || !normalizedValue) {
            return false;
        }
        apiSessionHeaders[lower] = normalizedValue;
        if (lower === 'authorization') {
            authToken = normalizedValue;
        }
        lastApiAuthObservedAt = Date.now();
        return true;
    }
    function rememberApiHeaders(headers) {
        try {
            if (!headers) return false;
            let remembered = false;
            if (typeof headers.forEach === 'function') {
                headers.forEach((value, name) => {
                    remembered = rememberApiHeader(name, value) || remembered;
                });
                return remembered;
            }
            if (Array.isArray(headers)) {
                for (const item of headers) {
                    if (Array.isArray(item) && item.length >= 2) {
                        remembered = rememberApiHeader(item[0], item[1]) || remembered;
                    }
                }
                return remembered;
            }
            for (const [name, value] of Object.entries(headers)) {
                remembered = rememberApiHeader(name, value) || remembered;
            }
            return remembered;
        } catch {
            return false;
        }
    }
    function extractAuth(headers) {
        try {
            if (!headers) return null;
            if (typeof headers.get === 'function') {
                return headers.get('authorization');
            }
            if (Array.isArray(headers)) {
                const entry = headers.find(
                    (item) => Array.isArray(item) && String(item[0]).toLowerCase() === 'authorization'
                );
                return entry?.[1] ? String(entry[1]) : null;
            }
            const key = Object.keys(headers).find((name) => name.toLowerCase() === 'authorization');
            return key ? String(headers[key]) : null;
        } catch {
            return null;
        }
    }
    function findStoredAuthValue(value, depth = 0) {
        if (depth > 5 || value == null) return null;
        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (/^Bearer\s+\S+/i.test(trimmed)) return trimmed;
            if (/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(trimmed)) {
                return `Bearer ${trimmed}`;
            }
            if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && trimmed.length < 200000) {
                try {
                    return findStoredAuthValue(JSON.parse(trimmed), depth + 1);
                } catch {
                    return null;
                }
            }
            return null;
        }
        if (Array.isArray(value)) {
            for (const item of value) {
                const found = findStoredAuthValue(item, depth + 1);
                if (found) return found;
            }
            return null;
        }
        if (typeof value === 'object') {
            const priorityKeys = Object.keys(value).filter((key) =>
                /^(authorization|access[_-]?token|auth[_-]?token|id[_-]?token|token)$/i.test(key)
            );
            for (const key of priorityKeys) {
                const found = findStoredAuthValue(value[key], depth + 1);
                if (found) return found;
            }
            for (const item of Object.values(value)) {
                const found = findStoredAuthValue(item, depth + 1);
                if (found) return found;
            }
        }
        return null;
    }
    function recoverAuthFromStorage() {
        try {
            for (const storage of [localStorage, sessionStorage]) {
                for (let index = 0; index < storage.length; index += 1) {
                    const key = storage.key(index);
                    if (!key || !/(auth|token|session|credential|login)/i.test(key)) continue;
                    const found = findStoredAuthValue(storage.getItem(key));
                    if (found) {
                        rememberApiHeader('authorization', found);
                        return true;
                    }
                }
            }
        } catch {
            // 저장소 접근이 막혀 있으면 네트워크에서 잡은 인증값만 사용한다.
        }
        return false;
    }
    async function waitForFreshApiSession(previousObservedAt, timeout = 1400) {
        window.dispatchEvent(new Event('focus'));
        document.dispatchEvent(new Event('visibilitychange'));
        const startedAt = Date.now();
        while (Date.now() - startedAt < timeout) {
            if (lastApiAuthObservedAt > previousObservedAt) {
                return true;
            }
            await sleep(100);
        }
        return false;
    }
    // =========================================================
    // Fetch / XHR 감시
    // =========================================================
    function installNetworkHooks() {
        if (!window.__CPM_NETWORK_HOOKED__) {
            window.__CPM_NETWORK_HOOKED__ = true;
            const originalFetch = window.fetch;
            if (!nativeFetch) {
                nativeFetch = originalFetch.bind(window);
            }
            window.fetch = async function (input, init) {
                let url = '';
                let method = 'GET';
                let headers = null;
                try {
                    url = typeof input === 'string' ? input : input?.url || '';
                    method = init?.method || (input instanceof Request ? input.method : 'GET');
                    headers = init?.headers || (input instanceof Request ? input.headers : null);
                    if (url.includes('crack-api.wrtn.ai')) {
                        rememberApiHeaders(headers);
                        rememberProfileApiBase(url);
                    }
                    const foundToken = extractAuth(headers);
                    if (foundToken && /^Bearer\s+/i.test(foundToken)) {
                        authToken = foundToken;
                        rememberApiHeader('authorization', foundToken);
                        refreshProfilesWhenReady();
                    }
                    const foundGroupId = extractGroupId(url);
                    if (foundGroupId) {
                        rememberProfileGroupId(foundGroupId);
                    }
                } catch {
                    // 무시
                }
                const response = await originalFetch.apply(this, arguments);
                // 프로필 목록 GET 응답 감시
                try {
                    if (url.includes('crack-api.wrtn.ai') && method.toUpperCase() === 'GET') {
                        const contentType = response.headers.get('content-type') || '';
                        if (contentType.includes('application/json')) {
                            response
                                .clone()
                                .json()
                                .then((json) => {
                                    handleApiResponse(json);
                                })
                                .catch(() => {});
                        }
                    }
                } catch {
                    // 무시
                }
                return response;
            };
        }
        if (!window.__CPM_XHR_HOOKED__) {
            window.__CPM_XHR_HOOKED__ = true;
            const originalOpen = XMLHttpRequest.prototype.open;
            const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
            XMLHttpRequest.prototype.open = function (method, url, ...rest) {
                try {
                    this.__cpmMethod = method;
                    this.__cpmUrl = url;
                    rememberProfileApiBase(url);
                    const foundGroupId = extractGroupId(url);
                    if (foundGroupId) {
                        rememberProfileGroupId(foundGroupId);
                    }
                    if (String(method).toUpperCase() === 'GET' && String(url).includes('crack-api')) {
                        this.addEventListener(
                            'load',
                            () => {
                                try {
                                    let json = null;
                                    if (this.responseType === 'json') {
                                        json = this.response;
                                    } else if (!this.responseType || this.responseType === 'text') {
                                        json = JSON.parse(this.responseText);
                                    }
                                    if (json) {
                                        handleApiResponse(json);
                                    }
                                } catch {
                                    // JSON 응답이 아니면 무시한다.
                                }
                            },
                            { once: true }
                        );
                    }
                } catch {
                    // 무시
                }
                return originalOpen.call(this, method, url, ...rest);
            };
            XMLHttpRequest.prototype.setRequestHeader = function (name, value) {
                try {
                    if (String(this.__cpmUrl || '').includes('crack-api.wrtn.ai')) {
                        rememberApiHeader(name, value);
                    }
                    if (
                        String(name).toLowerCase() === 'authorization' &&
                        typeof value === 'string' &&
                        /^Bearer\s+/i.test(value)
                    ) {
                        authToken = value;
                        rememberApiHeader('authorization', value);
                        refreshProfilesWhenReady();
                    }
                } catch {
                    // 무시
                }
                return originalSetRequestHeader.call(this, name, value);
            };
        }
    }
    function handleApiResponse(json) {
        try {
            updateCurrentProfile(json);
            const foundGroupId = findProfileGroupId(json);
            if (foundGroupId) {
                const groupChanged = String(foundGroupId) !== String(profileGroupId || '');
                rememberProfileGroupId(foundGroupId);
                if (groupChanged) {
                    refreshProfilesWhenReady();
                }
            }
            const list = json?.data?.chatProfiles;
            if (!Array.isArray(list)) {
                return false;
            }
            const first = list.find((item) => item?.profileId);
            if (first?.profileId) {
                rememberProfileGroupId(first.profileId);
            }
            state.profiles = list.map((item) => ({
                id: item?._id ? String(item._id) : null,
                groupId: item?.profileId ? String(item.profileId) : profileGroupId,
                name: normalizeText(item?.name),
                information: normalizeText(item?.information),
                isRepresentative: item?.isRepresentative === true,
                createdAt: item?.createdAt || null,
                updatedAt: item?.updatedAt || null,
                card: null
            }));
            if (state.managerOpen) {
                renderTagsOnly();
                renderProfilesOnly();
            }
            return true;
        } catch (error) {
            console.warn('[CPM] API 응답 처리 실패', error);
            return false;
        }
    }
    // =========================================================
    // DOM 프로필 읽기
    // =========================================================
    function getDOMProfiles() {
        const cards = qsa('div.flex.flex-col.p-4.gap-2.rounded-lg.bg-surface_tertiary.cursor-pointer');
        const results = [];
        const seen = new Set();
        for (const card of cards) {
            const nameEl = card.querySelector('span.typo-text-base_leading-none_semibold');
            const infoEl = card.querySelector('p.typo-text-md_leading-none_medium');
            const name = normalizeText(nameEl?.textContent);
            const information = normalizeText(infoEl?.textContent);
            if (!name) continue;
            const dedupeKey = `${name}\n${information}`;
            if (seen.has(dedupeKey)) {
                continue;
            }
            seen.add(dedupeKey);
            results.push({
                id: null,
                groupId: profileGroupId,
                name,
                information,
                isRepresentative: false,
                createdAt: null,
                updatedAt: null,
                card
            });
        }
        return results;
    }
    function mergeDOMIntoProfiles() {
        const domProfiles = getDOMProfiles();
        if (!domProfiles.length) {
            return;
        }
        const apiProfiles = state.profiles.filter((profile) => !!profile.id);
        if (!apiProfiles.length) {
            state.profiles = domProfiles;
            return;
        }
        // 사이트가 일부 카드만 렌더링하거나 가상 스크롤을 사용하더라도
        // API에서 읽은 전체 프로필은 유지하고, 일치하는 DOM 카드만 연결한다.
        const unmatchedDOMProfiles = [...domProfiles];
        const mergedAPIProfiles = apiProfiles.map((apiProfile) => {
            const matchIndex = unmatchedDOMProfiles.findIndex(
                (domProfile) =>
                    apiProfile.name === domProfile.name && apiProfile.information === domProfile.information
            );
            const domProfile = matchIndex >= 0 ? unmatchedDOMProfiles.splice(matchIndex, 1)[0] : null;
            return {
                ...apiProfile,
                card: domProfile?.card || null
            };
        });
        state.profiles = [...mergedAPIProfiles, ...unmatchedDOMProfiles];
    }
    // =========================================================
    // API 요청
    // =========================================================
    async function apiRequest(path, { method = 'GET', body, base = null, retryAuth = true } = {}) {
        if (!authToken) {
            recoverAuthFromStorage();
        }
        const resolvedBase = base || profileApiBase || API_BASE;
        const headers = {
            accept: 'application/json, text/plain, */*',
            ...apiSessionHeaders
        };
        if (authToken) {
            headers.authorization = authToken;
        }
        if (body !== undefined) {
            headers['content-type'] = 'application/json';
        }
        const fetchImpl = nativeFetch || window.fetch.bind(window);
        const response = await fetchImpl(resolvedBase + path, {
            method,
            mode: 'cors',
            credentials: 'include',
            headers,
            body: body !== undefined ? JSON.stringify(body) : undefined
        });
        if ((response.status === 401 || response.status === 403) && retryAuth) {
            const previousObservedAt = lastApiAuthObservedAt;
            recoverAuthFromStorage();
            const recoveredImmediately = lastApiAuthObservedAt > previousObservedAt;
            const refreshedBySite = recoveredImmediately
                ? true
                : await waitForFreshApiSession(previousObservedAt);
            if (refreshedBySite) {
                return apiRequest(path, { method, body, base: resolvedBase, retryAuth: false });
            }
        }
        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('HTTP 401 · 크랙 로그인 인증정보를 다시 불러오지 못했어요. 페이지를 새로고침한 뒤 다시 시도해 주세요.');
            }
            if (response.status === 403) {
                throw new Error('HTTP 403 · 현재 계정의 프로필 권한을 확인하지 못했어요.');
            }
            throw new Error(`HTTP ${response.status}`);
        }
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            return await response.json();
        }
        return {};
    }
    async function changeChatProfile(profile) {
        const chatId = getCurrentChatId();
        if (!chatId || !profile.id) {
            throw new Error('현재 채팅방이나 프로필을 찾지 못했어요.');
        }
        const changeSequence = ++chatProfileChangeSequence;
        await apiRequest(`/v3/chats/${encodeURIComponent(chatId)}`, {
            method: 'PATCH',
            base: CHAT_API_BASE,
            body: {
                chatProfileId: String(profile.id)
            }
        });
        state.currentChatId = chatId;
        state.currentProfileId = String(profile.id);
        const requestSiteRefresh = () => {
            if (chatProfileChangeSequence !== changeSequence || getCurrentChatId() !== chatId) {
                return;
            }
            // 페이지를 새로고침하지 않고 Crack의
            // 화면 데이터 재검증만 유도한다.
            window.dispatchEvent(new Event('focus'));
            document.dispatchEvent(new Event('visibilitychange'));
        };
        requestSiteRefresh();
        for (const delay of [150, 400, 900, 1800, 2500]) {
            setTimeout(requestSiteRefresh, delay);
        }
    }
    function openProfileSwitchDialog(profile) {
        const root = qs('#cpm-root');
        const chatId = getCurrentChatId();
        if (
            !root ||
            !chatId ||
            !profile.id ||
            (state.currentChatId === chatId && state.currentProfileId === String(profile.id))
        ) {
            return;
        }
        const { modal, confirmButton } = createConfirmModal(root, {
            message: '해당 프로필로 변경하시겠어요?',
            confirmLabel: '변경'
        });
        confirmButton.onclick = async () => {
            confirmButton.disabled = true;
            confirmButton.textContent = '변경 중...';
            try {
                await changeChatProfile(profile);
                modal.remove();
                renderProfilesOnly();
                showToast('채팅방 프로필을 변경했어요.');
            } catch (error) {
                console.warn('[CPM] 채팅방 프로필 변경 실패', error);
                showToast(error?.message || '채팅방 프로필 변경에 실패했어요.');
                confirmButton.disabled = false;
                confirmButton.textContent = '변경';
            }
        };
        enableBackdropClose(modal);
        confirmButton.focus();
    }
    async function refreshProfilesFromAPI() {
        if (!profileGroupId) {
            return false;
        }
        try {
            const json = await apiRequest(`/profiles/${profileGroupId}/chat-profiles`);
            return handleApiResponse(json);
        } catch (error) {
            console.warn('[CPM] 프로필 API 조회 실패', error);
            return false;
        }
    }
    async function refreshProfiles() {
        mergeDOMIntoProfiles();
        if (profileGroupId) {
            await refreshProfilesFromAPI();
        }
        mergeDOMIntoProfiles();
    }
    // =========================================================
    // 검색 / 필터
    // =========================================================
    function getAllTags() {
        const set = new Set();
        for (const profile of state.profiles) {
            if (!profile.id) continue;
            const meta = getMeta(profile.id);
            for (const tag of meta.tags) {
                if (tag) {
                    set.add(tag);
                }
            }
        }
        return [...set].sort((a, b) => a.localeCompare(b, 'ko'));
    }
    function matchesSearch(profile) {
        const query = state.search.trim().toLocaleLowerCase();
        if (!query) {
            return true;
        }
        const meta = profile.id ? getMeta(profile.id) : null;
        const haystack = [profile.name, profile.information, meta?.memo || ''].join('\n').toLocaleLowerCase();
        return haystack.includes(query);
    }
    function getVisibleProfiles() {
        let list = state.profiles.filter((profile) => matchesSearch(profile));
        if (state.view === 'favorite') {
            list = list.filter((profile) => {
                if (!profile.id) {
                    return false;
                }
                return getMeta(profile.id).favorite;
            });
        }
        if (state.selectedTags.size) {
            list = list.filter((profile) => {
                if (!profile.id) {
                    return false;
                }
                const tags = new Set(getMeta(profile.id).tags);
                for (const selected of state.selectedTags) {
                    if (!tags.has(selected)) {
                        return false;
                    }
                }
                return true;
            });
        }
        if (state.sort === 'created-desc') {
            list.reverse();
        }
        if (state.sort === 'name-asc') {
            list.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
        }
        if (state.sort === 'name-desc') {
            list.sort((a, b) => b.name.localeCompare(a.name, 'ko'));
        }
        // 생성순은 사이트 원래 순서 그대로.
        // 최신 생성순은 위에서 reverse() 처리.
        const pinned = [];
        const normal = [];
        for (const profile of list) {
            if (!profile.id) {
                normal.push(profile);
                continue;
            }
            if (getMeta(profile.id).pinned) {
                pinned.push(profile);
            } else {
                normal.push(profile);
            }
        }
        const ordered = [...pinned, ...normal];
        const currentProfileId = state.currentChatId === getCurrentChatId() ? state.currentProfileId : null;
        if (!currentProfileId) {
            return ordered;
        }
        const current = [];
        const others = [];
        for (const profile of ordered) {
            if (String(profile.id) === currentProfileId) {
                current.push(profile);
            } else {
                others.push(profile);
            }
        }
        return [...current, ...others];
    }
    // =========================================================
    // 스타일
    // =========================================================
    function injectStyles() {
        if (qs('#cpm-style')) {
            return true;
        }
        const styleHost = document.head || document.documentElement;
        if (!styleHost) {
            return false;
        }
        const style = document.createElement('style');
        style.id = 'cpm-style';
        style.textContent = `
            /* 사이트 모달이 body의 입력을 막아도 프로필 UI는 입력을 받는다. */
            #cpm-launcher,
            #cpm-embedded-launcher,
            #cpm-root,
            .cpm-menu,
            .cpm-external-profile-launcher {
                pointer-events: auto !important;
            }
            #cpm-launcher {
                position: fixed;
                right: 22px;
                bottom: 22px;
                z-index: 2147483645;
                height: 42px;
                padding: 0 14px;
                border: 1.5px solid #18181b;
                border-radius: 999px;
                background: #fff;
                color: #18181b;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 7px;
                font-family: inherit;
                font-size: 13px;
                font-weight: 650;
                white-space: nowrap;
                user-select: none;
                cursor: pointer;
            }
            #cpm-launcher.cpm-custom-position {
                left: var(--cpm-launcher-left);
                top: var(--cpm-launcher-top);
                right: auto;
                bottom: auto;
            }
            #cpm-launcher.cpm-dragging {
                opacity: .82;
                cursor: grabbing;
            }
            #cpm-launcher:hover {
                background: #f4f4f5;
            }
            #cpm-launcher .cpm-launcher-icon {
                width: 18px;
                height: 18px;
                flex: 0 0 auto;
            }
            html.dark #cpm-launcher,
            html[data-theme="dark"] #cpm-launcher,
            body.dark #cpm-launcher,
            body[data-theme="dark"] #cpm-launcher {
                border-color: #fff;
                background: #18181b;
                color: #fff;
            }
            html.dark #cpm-launcher:hover,
            html[data-theme="dark"] #cpm-launcher:hover,
            body.dark #cpm-launcher:hover,
            body[data-theme="dark"] #cpm-launcher:hover {
                background: #27272a;
            }
            @media (prefers-color-scheme: dark) {
                html:not(.light):not([data-theme="light"])
                #cpm-launcher {
                    border-color: #fff;
                    background: #18181b;
                    color: #fff;
                }
                html:not(.light):not([data-theme="light"])
                #cpm-launcher:hover {
                    background: #27272a;
                }
            }
            #cpm-embedded-launcher {
                padding: 18px 10px;
                box-sizing: border-box;
                flex-shrink: 0;
            }
            #cpm-embedded-launcher [role="button"],
            #cpm-embedded-launcher [role="button"] > span {
                display: flex;
                align-items: center;
                gap: 8px;
                min-width: 0;
            }
            #cpm-embedded-launcher [role="button"] {
                width: 100%;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                line-height: 20px;
                color: inherit;
            }
            #cpm-embedded-launcher .cpm-launcher-icon {
                width: 24px;
                height: 24px;
                flex: 0 0 auto;
                color: var(--icon-tertiary, #8b8b84);
                fill: none !important;
                stroke: currentColor;
            }
            .cpm-external-profile-launcher {
                display: inline-flex !important;
                visibility: visible !important;
                opacity: 1 !important;
                pointer-events: auto !important;
            }
            .cpm-external-profile-launcher .cpm-launcher-icon {
                display: block;
                width: 16.5px;
                height: 16.5px;
                flex: 0 0 auto;
                fill: none !important;
                stroke: currentColor;
                pointer-events: none;
            }
            #cpm-root {
                position: fixed;
                inset: auto;
                left: var(--cpm-viewport-left, 0px);
                top: var(--cpm-viewport-top, 0px);
                width: 100vw;
                height: 100vh;
                width: var(--cpm-viewport-width, 100dvw);
                height: var(--cpm-viewport-height, 100dvh);
                z-index: 2147483644;
                display: flex;
                align-items: center;
                justify-content: center;
                box-sizing: border-box;
                overflow: hidden;
                padding-top: max(14px, env(safe-area-inset-top, 0px));
                padding-right: max(14px, env(safe-area-inset-right, 0px));
                padding-bottom: max(14px, env(safe-area-inset-bottom, 0px));
                padding-left: max(14px, env(safe-area-inset-left, 0px));
            }
            #cpm-backdrop {
                position: absolute;
                inset: 0;
                background:
                    rgba(0,0,0,.38);
            }
            #cpm-panel {
                position: relative;
                width: min(1040px, 100%);
                height: min(820px, 100%);
                max-width: 100%;
                max-height: 100%;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                border:
                    1px solid #e4e4e7;
                border-radius: 15px;
                background: #fff;
                color: #18181b;
                box-shadow:
                    0 20px 70px
                    rgba(0,0,0,.2);
                font-family:
                    -apple-system,
                    BlinkMacSystemFont,
                    "Segoe UI",
                    sans-serif;
            }
            .cpm-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 12px;
                min-width: 0;
                padding: 18px 22px;
                border-bottom:
                    1px solid #ededf0;
                flex-shrink: 0;
            }
            .cpm-title {
                font-size: 20px;
                font-weight: 750;
                white-space: nowrap;
            }
            .cpm-header-actions {
                display: flex;
                align-items: center;
                gap: 10px;
                min-width: 0;
                flex-shrink: 0;
            }
            .cpm-close {
                width: 32px;
                height: 32px;
                flex: 0 0 32px;
                border: none;
                border-radius: 8px;
                background: transparent;
                color: #71717a;
                font-size: 22px;
                cursor: pointer;
            }
            .cpm-close:hover {
                background: #f4f4f5;
                color: #18181b;
            }
            .cpm-toolbar {
                padding:
                    14px 22px 15px;
                border-bottom:
                    1px solid #ededf0;
                flex-shrink: 0;
            }
            .cpm-placement-options {
                display: grid;
                grid-template-columns:
                    repeat(2, minmax(66px, 1fr));
                flex: 0 0 auto;
                padding: 3px;
                border-radius: 999px;
                background: #e4e4e7;
                overflow: hidden;
            }
            .cpm-placement-option {
                min-width: 66px;
                height: 30px;
                padding: 0 9px;
                border: 0;
                border-radius: 999px;
                background: transparent;
                color: #52525b;
                font-family: inherit;
                font-size: 11px;
                font-weight: 650;
                cursor: pointer;
            }
            .cpm-placement-option.active {
                background: #fff;
                color: #18181b;
                box-shadow: 0 1px 4px rgba(0,0,0,.14);
            }
            .cpm-search {
                width: 100%;
                height: 42px;
                box-sizing: border-box;
                padding:
                    0 13px;
                border:
                    1px solid #d4d4d8;
                border-radius: 10px;
                outline: none;
                background: #fff;
                color: #18181b;
                font-size: 13px;
            }
            .cpm-search:focus {
                border-color: #a1a1aa;
                box-shadow:
                    0 0 0 3px
                    rgba(161,161,170,.12);
            }
            .cpm-toolbar-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 12px;
                margin-top: 11px;
            }
            .cpm-tabs {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
            }
            .cpm-selection-actions {
                display: inline-flex;
                flex-wrap: wrap;
                gap: 6px;
            }
            .cpm-selection-actions[hidden],
            [data-selection-action="start"][hidden],
            [data-create-profile][hidden] {
                display: none;
            }
            .cpm-pill {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                border:
                    1px solid #e4e4e7;
                border-radius: 999px;
                padding:
                    7px 11px;
                background: #fff;
                color: #52525b;
                font-size: 12px;
                cursor: pointer;
            }
            .cpm-filter-icon {
                width: 14px;
                height: 14px;
                flex-shrink: 0;
            }
            .cpm-filter-star {
                color: #facc15;
            }
            .cpm-pill:hover {
                background: #f4f4f5;
            }
            .cpm-pill.active {
                border-color: #18181b;
                background: #18181b;
                color: white;
            }
            .cpm-pill.cpm-delete-trigger,
            .cpm-pill.cpm-delete-selected {
                color: #dc2626;
            }
            .cpm-pill.cpm-delete-selected:not(:disabled) {
                border-color: #dc2626;
                background: #dc2626;
                color: white;
            }
            .cpm-pill:disabled {
                opacity: .45;
                cursor: default;
            }
            .cpm-sort {
                width: 150px;
                height: 35px;
                padding:
                    0 9px;
                border:
                    1px solid #e4e4e7;
                border-radius: 8px;
                background: white;
                color: #27272a;
                font-size: 12px;
                outline: none;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
                text-align: left;
            }
            .cpm-sort-wrap {
                position: relative;
                flex: 0 0 150px;
            }
            .cpm-sort-arrow {
                color: #71717a;
                font-size: 11px;
                transition: transform .16s ease;
            }
            .cpm-sort[aria-expanded="true"]
            .cpm-sort-arrow {
                transform: rotate(180deg);
            }
            .cpm-sort-menu {
                position: absolute;
                z-index: 30;
                top: calc(100% + 5px);
                right: 0;
                width: 100%;
                box-sizing: border-box;
                padding: 4px;
                border: 1px solid #e4e4e7;
                border-radius: 8px;
                background: #fff;
            }
            .cpm-sort-menu[hidden] {
                display: none;
            }
            .cpm-sort-option {
                width: 100%;
                padding: 8px 7px;
                border: 0;
                border-radius: 6px;
                background: transparent;
                color: #27272a;
                font: inherit;
                font-size: 12px;
                text-align: left;
                cursor: pointer;
            }
            .cpm-sort-option:hover,
            .cpm-sort-option.active {
                background: #f4f4f5;
            }
            .cpm-sort-option.active {
                font-weight: 600;
            }
            .cpm-section-label {
                margin-top: 11px;
                color: #71717a;
                font-size: 11px;
            }
            .cpm-tags {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
                max-height: 67px;
                overflow-y: auto;
                margin-top: 7px;
            }
            .cpm-tag {
                border:
                    1px solid #e4e4e7;
                border-radius: 999px;
                padding:
                    6px 9px;
                background: white;
                color: #52525b;
                font-size: 11px;
                cursor: pointer;
            }
            .cpm-tag:hover {
                background: #f4f4f5;
            }
            .cpm-tag.active {
                background: #27272a;
                border-color: #27272a;
                color: white;
            }
            .cpm-selected-tags {
                display: flex;
                flex-wrap: wrap;
                gap: 5px;
                margin-top: 7px;
            }
            .cpm-filter-chip {
                padding:
                    4px 7px;
                border-radius: 6px;
                background: #f4f4f5;
                color: #52525b;
                font-size: 10px;
            }
            .cpm-list-wrap {
                flex: 1;
                min-height: 0;
                overflow-y: auto;
                padding:
                    14px 22px 22px;
                background: #f5f5f6;
            }
            .cpm-count {
                margin-bottom: 9px;
                color: #71717a;
                font-size: 11px;
            }
            .cpm-card {
                margin-bottom: 9px;
                padding:
                    13px 14px;
                border:
                    1px solid #dedee3;
                border-radius: 11px;
                background: #fff;
                transition:
                    border-color .15s ease,
                    background-color .15s ease;
            }
            .cpm-card:hover {
                border-color: #aeb0b8;
            }
            .cpm-card.cpm-current {
                padding:
                    12px 13px;
                border:
                    2px solid #27272a;
                background: #fff;
            }
            .cpm-card-head {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                gap: 10px;
            }
            .cpm-name-area {
                min-width: 0;
            }
            .cpm-name {
                color: #18181b;
                font-size: 15px;
                font-weight: 700;
                word-break: break-word;
            }
            .cpm-action-group {
                display: flex;
                gap: 2px;
                flex-shrink: 0;
            }
            .cpm-icon {
                width: 30px;
                height: 30px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                border:
                    1px solid transparent;
                border-radius: 8px;
                background: transparent;
                color: #a1a1aa;
                cursor: pointer;
            }
            .cpm-icon svg {
                width: 16px;
                height: 16px;
                pointer-events: none;
            }
            .cpm-icon:hover {
                background: #f4f4f5;
                color: #52525b;
            }
            .cpm-icon.active {
                border-color: transparent;
                background: transparent;
                color: #27272a;
            }
            .cpm-icon.cpm-favorite.active {
                border-color: transparent;
                background: transparent;
                color: #facc15;
            }
            .cpm-icon.cpm-pin.active {
                border-color: transparent;
                background: transparent;
                color: #ef4444;
            }
            .cpm-card.cpm-switchable {
                cursor: pointer;
            }
            .cpm-card.cpm-selected {
                border-color: #ef4444;
                background: #fffafa;
            }
            .cpm-card.cpm-selection-disabled {
                cursor: default;
            }
            .cpm-select-checkbox {
                width: 17px;
                height: 17px;
                margin: 6px;
                accent-color: #ef4444;
                cursor: pointer;
            }
            .cpm-select-checkbox:disabled {
                cursor: default;
            }
            .cpm-content {
                margin-top: 1px;
                white-space: pre-line;
                word-break: break-word;
                color: #62626b;
                font-size: 13px;
                line-height: 1.48;
                max-height: 5.92em;
                overflow: hidden;
            }
            .cpm-content.expanded {
                max-height: none;
            }
            .cpm-highlight {
                padding: 0 1px;
                border-radius: 2px;
                background: #fef08a;
                color: inherit;
            }
            .cpm-search-snippet {
                margin-top: 5px;
                overflow: hidden;
                color: #71717a;
                font-size: 11px;
                line-height: 1.45;
                white-space: nowrap;
                text-overflow: ellipsis;
            }
            .cpm-search-snippet[hidden] {
                display: none;
            }
            .cpm-expand {
                display: inline-flex;
                align-items: center;
                gap: 3px;
                margin-top: 5px;
                padding: 2px 0;
                border: none;
                background: transparent;
                color: #71717a;
                font-size: 11px;
                cursor: pointer;
            }
            .cpm-expand:hover {
                color: #18181b;
            }
            .cpm-expand[hidden] {
                display: none;
            }
            .cpm-expand svg {
                width: 12px;
                height: 12px;
                pointer-events: none;
            }
            .cpm-info-row {
                display: flex;
                flex-wrap: wrap;
                gap: 5px;
                margin-top: 9px;
            }
            .cpm-info-row + .cpm-info-row {
                margin-top: 5px;
            }
            .cpm-chip {
                padding:
                    4px 6px;
                border-radius: 6px;
                background: #f4f4f5;
                color: #52525b;
                font-size: 10px;
            }
            .cpm-note-chip {
                background: #fffbeb;
                color: #52525b;
                font-size: 11px;
                line-height: 1.48;
                white-space: pre-wrap;
                overflow-wrap: anywhere;
            }
            .cpm-empty {
                padding:
                    60px 20px;
                text-align: center;
                color: #a1a1aa;
                font-size: 13px;
            }
            .cpm-menu {
                position: fixed;
                z-index: 2147483647;
                width: 245px;
                padding: 4px;
                border:
                    1px solid #e4e4e7;
                border-radius: 10px;
                background: white;
                box-shadow:
                    0 12px 32px
                    rgba(0,0,0,.15);
            }
            .cpm-menu-item {
                width: 100%;
                border: none;
                border-radius: 7px;
                padding:
                    9px 10px;
                background: transparent;
                color: #27272a;
                text-align: left;
                font-size: 12px;
                cursor: pointer;
            }
            .cpm-menu-item:hover {
                background: #f4f4f5;
            }
            .cpm-menu-item.danger {
                color: #dc2626;
            }
            .cpm-menu-item.danger:hover {
                background: #fef2f2;
            }
            .cpm-menu-item:disabled {
                opacity: .4;
                cursor: default;
            }
            .cpm-menu-item:disabled:hover {
                background: transparent;
            }
            .cpm-modal {
                position: absolute;
                inset: 0;
                z-index: 10;
                display: flex;
                align-items: center;
                justify-content: center;
                background:
                    rgba(0,0,0,.28);
                animation:
                    cpm-modal-fade-in
                    .16s ease-out both;
            }
            .cpm-dialog {
                width:
                    min(470px,
                    calc(100% - 32px));
                max-height: calc(100% - 24px);
                overflow: auto;
                overscroll-behavior: contain;
                box-sizing: border-box;
                padding: 17px;
                border:
                    1px solid #e4e4e7;
                border-radius: 13px;
                background: white;
                box-shadow:
                    0 18px 50px
                    rgba(0,0,0,.18);
                transform-origin: center;
                animation:
                    cpm-dialog-enter
                    .2s cubic-bezier(.2,.8,.2,1)
                    both;
            }
            .cpm-dialog.cpm-profile-dialog {
                width:
                    min(620px,
                    calc(100% - 32px));
            }
            .cpm-profile-dialog .cpm-textarea {
                min-height: 220px;
            }
            @keyframes cpm-modal-fade-in {
                from {
                    opacity: 0;
                }
                to {
                    opacity: 1;
                }
            }
            @keyframes cpm-dialog-enter {
                from {
                    opacity: 0;
                    transform:
                        translateY(5px)
                        scale(.98);
                }
                to {
                    opacity: 1;
                    transform:
                        translateY(0)
                        scale(1);
                }
            }
            .cpm-dialog-title {
                font-size: 15px;
                font-weight: 700;
            }
            .cpm-dialog-name {
                margin-top: 4px;
                color: #71717a;
                font-size: 11px;
                word-break: break-word;
            }
            .cpm-dialog-message {
                margin-top: 10px;
                color: #52525b;
                font-size: 14px;
                line-height: 1.5;
            }
            .cpm-field-label {
                display: block;
                margin-top: 11px;
                color: #52525b;
                font-size: 11px;
                font-weight: 600;
            }
            .cpm-field-heading {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
            }
            .cpm-field-count {
                color: #a1a1aa;
                font-weight: 400;
            }
            .cpm-field-label .cpm-input,
            .cpm-field-label .cpm-textarea {
                margin-top: 5px;
            }
            .cpm-input,
            .cpm-textarea {
                width: 100%;
                box-sizing: border-box;
                margin-top: 10px;
                padding:
                    9px 10px;
                border:
                    1px solid #d4d4d8;
                border-radius: 8px;
                outline: none;
                background: #fff;
                color: #18181b;
                font-family: inherit;
                font-size: 12px;
            }
            .cpm-textarea {
                min-height: 120px;
                resize: vertical;
            }
            .cpm-input:focus,
            .cpm-textarea:focus {
                border-color: #a1a1aa;
            }
            .cpm-tag-options-label {
                margin-top: 13px;
                color: #71717a;
                font-size: 11px;
            }
            .cpm-tag-options {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
                max-height: 92px;
                overflow-y: auto;
                margin-top: 7px;
            }
            .cpm-dialog-actions {
                display: flex;
                justify-content: flex-end;
                gap: 7px;
                margin-top: 12px;
            }
            .cpm-btn {
                border:
                    1px solid #d4d4d8;
                border-radius: 8px;
                padding:
                    8px 12px;
                background: white;
                color: #27272a;
                font-size: 12px;
                cursor: pointer;
            }
            .cpm-btn:hover {
                background: #f4f4f5;
            }
            .cpm-btn:disabled {
                opacity: .45;
                cursor: default;
            }
            .cpm-btn.primary {
                border-color: #18181b;
                background: #18181b;
                color: white;
            }
            .cpm-btn.danger {
                border-color: #dc2626;
                background: #dc2626;
                color: white;
            }
            .cpm-dialog-warning {
                margin-top: 6px;
                color: #dc2626;
                font-size: 11px;
            }
            .cpm-toast {
                position: fixed;
                top: var(--cpm-toast-top, 22px);
                left: var(--cpm-toast-left, 50%);
                z-index: 2147483647;
                transform:
                    translateX(-50%);
                padding:
                    9px 14px;
                border-radius: 9px;
                background: #18181b;
                color: white;
                font-size: 12px;
                box-shadow:
                    0 8px 24px
                    rgba(0,0,0,.18);
            }
            @media (max-width: 700px) {
                #cpm-root {
                    padding-top: max(6px, env(safe-area-inset-top, 0px));
                    padding-right: max(6px, env(safe-area-inset-right, 0px));
                    padding-bottom: max(6px, env(safe-area-inset-bottom, 0px));
                    padding-left: max(6px, env(safe-area-inset-left, 0px));
                }
                #cpm-launcher[data-cpm-placement="floating"] {
                    right: 12px;
                    bottom: 12px;
                    width: 42px;
                    padding: 0;
                    gap: 0;
                    border-width: 1px;
                    touch-action: none;
                }
                #cpm-launcher[data-cpm-placement="floating"] span {
                    display: none;
                }
                #cpm-panel {
                    width: 100% !important;
                    height: 100% !important;
                }
                .cpm-toolbar-row {
                    flex-direction: column;
                    align-items: stretch;
                }
                .cpm-header {
                    padding: 14px 16px;
                }
                .cpm-header-actions {
                    gap: 6px;
                }
                .cpm-placement-option {
                    min-width: 58px;
                    padding: 0 7px;
                }
                .cpm-sort-wrap,
                .cpm-sort {
                    width: 100%;
                }
                .cpm-sort-wrap {
                    flex: 0 0 auto;
                }
            }
            @media (max-width: 520px) {
                .cpm-header {
                    display: grid;
                    grid-template-columns: minmax(0, 1fr) 32px;
                    grid-template-rows: auto auto;
                    gap: 8px 6px;
                    padding: 12px;
                }
                .cpm-header > :first-child {
                    grid-column: 1;
                    grid-row: 1;
                    min-width: 0;
                }
                .cpm-title {
                    overflow: hidden;
                    font-size: 18px;
                    text-overflow: ellipsis;
                }
                .cpm-header-actions {
                    display: contents;
                }
                .cpm-placement-options {
                    grid-column: 1 / -1;
                    grid-row: 2;
                    width: 100%;
                    box-sizing: border-box;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                }
                .cpm-placement-option {
                    min-width: 0;
                    font-size: 11px;
                }
                .cpm-close {
                    grid-column: 2;
                    grid-row: 1;
                    justify-self: end;
                }
                .cpm-toolbar {
                    padding: 12px;
                }
            }
        `;
        styleHost.appendChild(style);
        return true;
    }
    // =========================================================
    // 토스트
    // =========================================================
    function showToast(message, duration = 2200) {
        qs('.cpm-toast')?.remove();
        clearTimeout(toastTimer);
        const toast = document.createElement('div');
        toast.className = 'cpm-toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        syncViewportLayout();
        toastTimer = setTimeout(() => {
            toast.remove();
            toastTimer = null;
        }, duration);
    }
    function enableBackdropClose(modal, canClose = () => true) {
        modal.addEventListener('click', (event) => {
            if (event.target === modal && canClose()) {
                modal.remove();
            }
        });
    }
    function createManagerModal(root) {
        closeProfileMenu();
        qs('.cpm-modal', root)?.remove();
        const modal = document.createElement('div');
        modal.className = 'cpm-modal';
        return modal;
    }
    function createConfirmModal(root, { title = '', message, warning = '', confirmLabel, danger = false }) {
        const modal = createManagerModal(root);
        modal.innerHTML = `
            <div class="cpm-dialog">
                ${title ? `<div class="cpm-dialog-title">${escapeHtml(title)}</div>` : ''}
                <div class="cpm-dialog-message">${escapeHtml(message)}</div>
                ${warning ? `<div class="cpm-dialog-warning">${escapeHtml(warning)}</div>` : ''}
                <div class="cpm-dialog-actions">
                    <button class="cpm-btn" data-cancel>취소</button>
                    <button class="cpm-btn ${danger ? 'danger' : 'primary'}" data-confirm>
                        ${escapeHtml(confirmLabel)}
                    </button>
                </div>
            </div>
        `;
        root.appendChild(modal);
        const cancelButton = qs('[data-cancel]', modal);
        const confirmButton = qs('[data-confirm]', modal);
        cancelButton.onclick = () => modal.remove();
        return { modal, cancelButton, confirmButton };
    }
    // =========================================================
    // 메타 편집
    // =========================================================
    function openMetaDialog(profile, type) {
        const root = qs('#cpm-root');
        if (!root || !profile.id) {
            return;
        }
        const meta = getMeta(profile.id);
        const modal = createManagerModal(root);
        if (type === 'memo') {
            modal.innerHTML = `
                <div class="cpm-dialog">
                    <div class="cpm-dialog-title">
                        메모 편집
                    </div>
                    <div class="cpm-dialog-name">
                        ${escapeHtml(profile.name)}
                    </div>
                    <textarea
                        class="cpm-textarea"
                        id="cpm-edit-value"
                        placeholder="이 페르소나에 대한 메모"
                    >${escapeHtml(meta.memo)}</textarea>
                    <div class="cpm-dialog-actions">
                        <button
                            class="cpm-btn"
                            data-cancel
                        >
                            취소
                        </button>
                        <button
                            class="cpm-btn primary"
                            data-save
                        >
                            저장
                        </button>
                    </div>
                </div>
            `;
        } else {
            const tagChoices = getAllTags()
                .map(
                    (tag) => `
                        <button
                            class="cpm-tag ${meta.tags.includes(tag) ? 'active' : ''}"
                            type="button"
                            data-tag-choice="${escapeHtml(tag)}"
                        >
                            #${escapeHtml(tag)}
                        </button>
                    `
                )
                .join('');
            modal.innerHTML = `
                <div class="cpm-dialog">
                    <div class="cpm-dialog-title">
                        태그 편집
                    </div>
                    <div class="cpm-dialog-name">
                        ${escapeHtml(profile.name)}
                    </div>
                    <input
                        class="cpm-input"
                        id="cpm-edit-value"
                        type="text"
                        value="${escapeHtml(meta.tags.join(', '))}"
                        placeholder="현대물, 연인, AU"
                    >
                    <div
                        style="
                            margin-top:7px;
                            color:#a1a1aa;
                            font-size:10px;
                        "
                    >
                        여러 태그는 쉼표(,)로 구분
                    </div>
                    ${
                        tagChoices
                            ? `
                                <div class="cpm-tag-options-label">
                                    기존 태그 선택
                                </div>
                                <div class="cpm-tag-options">
                                    ${tagChoices}
                                </div>
                              `
                            : ''
                    }
                    <div class="cpm-dialog-actions">
                        <button
                            class="cpm-btn"
                            data-cancel
                        >
                            취소
                        </button>
                        <button
                            class="cpm-btn primary"
                            data-save
                        >
                            저장
                        </button>
                    </div>
                </div>
            `;
        }
        root.appendChild(modal);
        const valueEl = qs('#cpm-edit-value', modal);
        if (type === 'tags') {
            const readInputTags = () => normalizeTags(valueEl.value);
            const syncTagChoices = () => {
                const selected = new Set(readInputTags());
                qsa('[data-tag-choice]', modal).forEach((button) => {
                    button.classList.toggle('active', selected.has(button.dataset.tagChoice));
                });
            };
            qsa('[data-tag-choice]', modal).forEach((button) => {
                button.onclick = () => {
                    const tag = button.dataset.tagChoice;
                    const tags = readInputTags();
                    const index = tags.indexOf(tag);
                    if (index >= 0) {
                        tags.splice(index, 1);
                    } else {
                        tags.push(tag);
                    }
                    valueEl.value = tags.join(', ');
                    syncTagChoices();
                    valueEl.focus();
                };
            });
            valueEl.addEventListener('input', syncTagChoices);
        }
        qs('[data-cancel]', modal).onclick = () => modal.remove();
        qs('[data-save]', modal).onclick = () => {
            if (type === 'memo') {
                meta.memo = normalizeText(valueEl.value);
            } else {
                meta.tags = normalizeTags(valueEl.value);
            }
            saveMeta();
            modal.remove();
            if (type === 'memo') {
                renderProfilesOnly();
            } else {
                renderTagsOnly();
                renderProfilesOnly();
            }
        };
        if (type === 'tags') {
            valueEl.addEventListener('keydown', (event) => {
                if (event.key !== 'Enter' || event.isComposing || event.keyCode === 229) {
                    return;
                }
                event.preventDefault();
                qs('[data-save]', modal)?.click();
            });
        }
        enableBackdropClose(modal);
    }
    async function saveProfileEdit(profile, name, information) {
        const groupId = profile.groupId || profileGroupId;
        if (!groupId || !profile.id) {
            throw new Error('프로필 식별자를 찾지 못했어요.');
        }
        await apiRequest(`/profiles/${encodeURIComponent(groupId)}/chat-profiles/${encodeURIComponent(profile.id)}`, {
            method: 'PATCH',
            body: {
                name,
                information
            }
        });
        profile.name = name;
        profile.information = information;
    }
    function readProfileForm(nameEl, informationEl) {
        const name = normalizeText(nameEl.value);
        const information = normalizeText(informationEl.value);
        if (!name) {
            showToast('프로필 이름을 입력해 주세요.');
            nameEl.focus();
            return null;
        }
        if (name.length > 12) {
            showToast('프로필 이름은 12자까지 입력할 수 있어요.');
            nameEl.focus();
            return null;
        }
        if (information.length > 500) {
            showToast('프로필 내용은 500자까지 입력할 수 있어요.');
            informationEl.focus();
            return null;
        }
        return {
            name,
            information
        };
    }
    function createProfileForm(root, { title, name = '', information = '', submitLabel, requireChanges = false }) {
        const modal = createManagerModal(root);
        modal.innerHTML = `
            <div class="cpm-dialog cpm-profile-dialog">
                <div class="cpm-dialog-title">${escapeHtml(title)}</div>
                <label class="cpm-field-label">
                    <span class="cpm-field-heading">
                        <span>이름</span>
                        <span class="cpm-field-count" data-name-count></span>
                    </span>
                    <input
                        class="cpm-input"
                        data-profile-name
                        type="text"
                        maxlength="12"
                        value="${escapeHtml(name)}"
                    >
                </label>
                <label class="cpm-field-label">
                    <span class="cpm-field-heading">
                        <span>내용</span>
                        <span class="cpm-field-count" data-information-count></span>
                    </span>
                    <textarea
                        class="cpm-textarea"
                        data-profile-information
                        maxlength="500"
                    >${escapeHtml(information)}</textarea>
                </label>
                <div class="cpm-dialog-actions">
                    <button class="cpm-btn" data-cancel>취소</button>
                    <button class="cpm-btn primary" data-save>${escapeHtml(submitLabel)}</button>
                </div>
            </div>
        `;
        root.appendChild(modal);
        const nameEl = qs('[data-profile-name]', modal);
        const informationEl = qs('[data-profile-information]', modal);
        const saveButton = qs('[data-save]', modal);
        const initialName = normalizeText(name);
        const initialInformation = normalizeText(information);
        const updateState = () => {
            qs('[data-name-count]', modal).textContent = `(${nameEl.value.length}/12)`;
            qs('[data-information-count]', modal).textContent = `(${informationEl.value.length}/500)`;
            const currentName = normalizeText(nameEl.value);
            const unchanged =
                currentName === initialName && normalizeText(informationEl.value) === initialInformation;
            saveButton.disabled = !currentName || (requireChanges && unchanged);
        };
        nameEl.addEventListener('input', updateState);
        informationEl.addEventListener('input', updateState);
        qs('[data-cancel]', modal).onclick = () => modal.remove();
        enableBackdropClose(modal);
        updateState();
        return { modal, nameEl, informationEl, saveButton };
    }
    function openProfileEditDialog(profile) {
        const root = qs('#cpm-root');
        if (!root || !profile.id) {
            return;
        }
        const { modal, nameEl, informationEl, saveButton } = createProfileForm(root, {
            title: '프로필 수정',
            name: profile.name,
            information: profile.information,
            submitLabel: '저장',
            requireChanges: true
        });
        saveButton.onclick = async () => {
            const values = readProfileForm(nameEl, informationEl);
            if (!values) {
                return;
            }
            const { name, information } = values;
            saveButton.disabled = true;
            saveButton.textContent = '저장 중...';
            try {
                await saveProfileEdit(profile, name, information);
                modal.remove();
                renderProfilesOnly();
                showToast('프로필을 수정했어요.');
                await refreshProfilesFromAPI();
            } catch (error) {
                console.warn('[CPM] 프로필 수정 실패', error);
                showToast(error?.message || '프로필 수정에 실패했어요.');
                saveButton.disabled = false;
                saveButton.textContent = '저장';
            }
        };
    }
    async function saveProfileCreate(name, information) {
        if (!profileGroupId) {
            throw new Error('프로필 그룹을 찾지 못했어요.');
        }
        await apiRequest(`/profiles/${encodeURIComponent(profileGroupId)}/chat-profiles`, {
            method: 'POST',
            body: {
                name,
                information
            }
        });
        window.dispatchEvent(new Event('focus'));
    }
    function openProfileCreateDialog() {
        const root = qs('#cpm-root');
        if (!root) return;
        if (!profileGroupId) {
            showToast('프로필 정보를 불러온 뒤 다시 시도해 주세요.');
            return;
        }
        const { modal, nameEl, informationEl, saveButton } = createProfileForm(root, {
            title: '프로필 생성',
            submitLabel: '생성'
        });
        saveButton.onclick = async () => {
            const values = readProfileForm(nameEl, informationEl);
            if (!values) {
                return;
            }
            const { name, information } = values;
            saveButton.disabled = true;
            saveButton.textContent = '생성 중...';
            try {
                await saveProfileCreate(name, information);
                modal.remove();
                await refreshProfilesFromAPI();
                showToast('프로필을 생성했어요.');
            } catch (error) {
                console.warn('[CPM] 프로필 생성 실패', error);
                showToast(error?.message || '프로필 생성에 실패했어요.');
                saveButton.disabled = false;
                saveButton.textContent = '생성';
            }
        };
        nameEl.focus();
    }
    async function deleteProfileFromAPI(profile) {
        const groupId = profile.groupId || profileGroupId;
        if (!groupId || !profile.id) {
            throw new Error('프로필 식별자를 찾지 못했어요.');
        }
        await apiRequest(`/profiles/${encodeURIComponent(groupId)}/chat-profiles/${encodeURIComponent(profile.id)}`, {
            method: 'DELETE'
        });
    }
    function removeProfilesFromState(profileIds) {
        const deletedIds = new Set(profileIds.map(String));
        state.profiles = state.profiles.filter((profile) => !deletedIds.has(String(profile.id)));
        for (const id of deletedIds) {
            delete state.meta[id];
            state.expandedProfiles.delete(id);
            state.selectedProfileIds.delete(id);
        }
    }
    function getSelectedDeletableProfiles() {
        return state.profiles.filter(
            (profile) => profile.id && state.selectedProfileIds.has(String(profile.id)) && !isCurrentProfile(profile)
        );
    }
    function openBulkDeleteDialog() {
        const root = qs('#cpm-root');
        if (!root) return;
        let profiles = getSelectedDeletableProfiles();
        if (!profiles.length) {
            showToast('삭제할 프로필을 선택해 주세요.');
            return;
        }
        const { modal, cancelButton, confirmButton } = createConfirmModal(root, {
            title: '선택한 프로필 삭제',
            message: `선택한 ${profiles.length}개의 프로필을 삭제하시겠어요?`,
            warning: '삭제한 프로필은 되돌릴 수 없습니다.',
            confirmLabel: `${profiles.length}개 삭제`,
            danger: true
        });
        let isDeleting = false;
        confirmButton.onclick = async () => {
            profiles = getSelectedDeletableProfiles();
            if (!profiles.length) {
                modal.remove();
                render();
                return;
            }
            isDeleting = true;
            cancelButton.disabled = true;
            confirmButton.disabled = true;
            const deletedIds = [];
            const failedIds = [];
            for (let index = 0; index < profiles.length; index += 1) {
                const profile = profiles[index];
                confirmButton.textContent = `삭제 중 ${index + 1}/${profiles.length}`;
                try {
                    if (isCurrentProfile(profile)) {
                        throw new Error('현재 사용 중인 프로필');
                    }
                    await deleteProfileFromAPI(profile);
                    deletedIds.push(String(profile.id));
                } catch (error) {
                    console.warn('[CPM] 프로필 삭제 실패', profile.id, error);
                    failedIds.push(String(profile.id));
                }
            }
            removeProfilesFromState(deletedIds);
            saveMeta();
            if (failedIds.length) {
                state.selectedProfileIds = new Set(failedIds);
            } else {
                state.selectedProfileIds.clear();
                state.selectionMode = false;
            }
            modal.remove();
            await refreshProfiles();
            if (state.managerOpen) {
                render();
            }
            if (failedIds.length) {
                showToast(`${deletedIds.length}개 삭제, ${failedIds.length}개 실패했어요.`);
            } else {
                showToast(`${deletedIds.length}개 프로필을 삭제했어요.`);
            }
        };
        enableBackdropClose(modal, () => !isDeleting);
        confirmButton.focus();
    }
    function openProfileDeleteDialog(profile) {
        const root = qs('#cpm-root');
        if (!root || !profile?.id) return;
        if (isCurrentProfile(profile)) {
            showToast('현재 사용 중인 프로필은 삭제할 수 없어요.');
            return;
        }
        const { modal, cancelButton, confirmButton } = createConfirmModal(root, {
            title: '프로필 삭제',
            message: '해당 프로필을 삭제하시겠어요?',
            warning: '삭제한 프로필은 되돌릴 수 없습니다.',
            confirmLabel: '삭제',
            danger: true
        });
        let isDeleting = false;
        confirmButton.onclick = async () => {
            if (isCurrentProfile(profile)) {
                modal.remove();
                showToast('현재 사용 중인 프로필은 삭제할 수 없어요.');
                return;
            }
            isDeleting = true;
            cancelButton.disabled = true;
            confirmButton.disabled = true;
            confirmButton.textContent = '삭제 중...';
            try {
                await deleteProfileFromAPI(profile);
                const profileId = String(profile.id);
                removeProfilesFromState([profileId]);
                saveMeta();
                window.dispatchEvent(new Event('focus'));
                modal.remove();
                const refreshed = await refreshProfilesFromAPI();
                if (state.managerOpen && !refreshed) {
                    render();
                }
                showToast('프로필을 삭제했어요.');
            } catch (error) {
                console.warn('[CPM] 프로필 삭제 실패', profile.id, error);
                isDeleting = false;
                cancelButton.disabled = false;
                confirmButton.disabled = false;
                confirmButton.textContent = '삭제';
                showToast('프로필 삭제에 실패했어요.');
            }
        };
        enableBackdropClose(modal, () => !isDeleting);
        confirmButton.focus();
    }
    // =========================================================
    // 프로필 메뉴
    // =========================================================
    function closeProfileMenu() {
        const menu = qs('.cpm-menu');
        if (!menu) {
            return;
        }
        if (typeof menu.__cpmClose === 'function') {
            menu.__cpmClose();
        } else {
            menu.remove();
        }
    }
    function openProfileMenu(button, profile) {
        const existingMenu = qs('.cpm-menu');
        if (existingMenu) {
            const isSameProfile = existingMenu.dataset.profileId === String(profile.id);
            closeProfileMenu();
            if (isSameProfile) {
                return;
            }
        }
        if (!profile.id) {
            showToast('프로필 식별자를 찾지 못했어요.');
            return;
        }
        const menu = document.createElement('div');
        menu.className = 'cpm-menu';
        menu.dataset.profileId = String(profile.id);
        menu.innerHTML = `
            <button
                class="cpm-menu-item"
                data-action="edit-profile"
            >
                프로필 수정
            </button>
            <button
                class="cpm-menu-item"
                data-action="memo"
            >
                메모 편집
            </button>
            <button
                class="cpm-menu-item"
                data-action="tags"
            >
                태그 편집
            </button>
            <button
                class="cpm-menu-item danger"
                data-action="delete-profile"
                ${isCurrentProfile(profile) ? 'disabled' : ''}
            >
                프로필 삭제
            </button>
        `;
        document.body.appendChild(menu);
        const rect = button.getBoundingClientRect();
        const menuWidth = 245;
        let left = rect.right - menuWidth;
        let top = rect.bottom + 5;
        left = Math.max(8, Math.min(window.innerWidth - menuWidth - 8, left));
        const menuHeight = 185;
        top = Math.max(8, Math.min(window.innerHeight - menuHeight - 8, top));
        menu.style.left = `${left}px`;
        menu.style.top = `${top}px`;
        const closeMenu = () => {
            menu.remove();
            document.removeEventListener('mousedown', outsideHandler, true);
        };
        const outsideHandler = (event) => {
            if (!menu.contains(event.target) && event.target !== button) {
                closeMenu();
            }
        };
        menu.__cpmClose = closeMenu;
        document.addEventListener('mousedown', outsideHandler, true);
        menu.onclick = async (event) => {
            const target = event.target.closest('[data-action]');
            if (!target) {
                return;
            }
            const action = target.dataset.action;
            closeMenu();
            if (action === 'edit-profile') {
                openProfileEditDialog(profile);
                return;
            }
            if (action === 'memo') {
                openMetaDialog(profile, 'memo');
                return;
            }
            if (action === 'tags') {
                openMetaDialog(profile, 'tags');
                return;
            }
            if (action === 'delete-profile') {
                openProfileDeleteDialog(profile);
                return;
            }
        };
    }
    // =========================================================
    // UI 렌더링
    // =========================================================
    function renderTagsOnly() {
        const root = qs('#cpm-root');
        if (!root) return;
        const tagsEl = qs('#cpm-tags', root);
        if (!tagsEl) return;
        const tags = getAllTags();
        const availableTags = new Set(tags);
        for (const selectedTag of [...state.selectedTags]) {
            if (!availableTags.has(selectedTag)) {
                state.selectedTags.delete(selectedTag);
            }
        }
        const selectedEl = qs('#cpm-selected-tags', root);
        if (selectedEl) {
            selectedEl.innerHTML = [...state.selectedTags]
                .map(
                    (tag) => `
                            <span
                                class="cpm-filter-chip"
                            >
                                #${escapeHtml(tag)}
                            </span>
                        `
                )
                .join('');
        }
        if (!tags.length) {
            tagsEl.innerHTML = `
                <span
                    style="
                        color:#a1a1aa;
                        font-size:11px;
                    "
                >
                    아직 만든 태그가 없습니다.
                </span>
            `;
            return;
        }
        tagsEl.innerHTML = tags
            .map(
                (tag) => `
                        <button
                            class="cpm-tag ${state.selectedTags.has(tag) ? 'active' : ''}"
                            data-tag="${escapeHtml(tag)}"
                        >
                            #${escapeHtml(tag)}
                        </button>
                    `
            )
            .join('');
    }
    function renderProfilesOnly() {
        const root = qs('#cpm-root');
        if (!root) return;
        const listEl = qs('#cpm-profile-list', root);
        const countEl = qs('#cpm-count', root);
        if (!listEl) return;
        const profiles = getVisibleProfiles();
        if (countEl) {
            countEl.textContent = `${profiles.length}개 표시 / ${state.profiles.length}개${
                state.selectionMode ? ` · ${state.selectedProfileIds.size}개 선택` : ''
            }`;
        }
        if (!profiles.length) {
            listEl.innerHTML = `
                <div class="cpm-empty">
                    조건에 맞는 페르소나가 없습니다.
                </div>
            `;
            return;
        }
        listEl.innerHTML = profiles
            .map((profile) => {
                const meta = profile.id
                    ? getMeta(profile.id)
                    : {
                          memo: '',
                          tags: [],
                          favorite: false,
                          pinned: false
                      };
                const tags = meta.tags
                    .map(
                        (tag) => `
                                    <span
                                        class="cpm-chip"
                                    >
                                        #${escapeHtml(tag)}
                                    </span>
                                `
                    )
                    .join('');
                const memo = meta.memo
                    ? `
                                <span
                                    class="cpm-chip cpm-note-chip"
                                >${highlightSearchText(meta.memo)}</span>
                              `
                    : '';
                const searchSnippet = getSearchSnippet(profile.information);
                const expanded = profile.id && state.expandedProfiles.has(String(profile.id));
                const isCurrent = isCurrentProfile(profile);
                const isSelected = profile.id && state.selectedProfileIds.has(String(profile.id));
                const isSelectionDisabled = state.selectionMode && isCurrent;
                const isSwitchable = !state.selectionMode && !!profile.id && !!getCurrentChatId() && !isCurrent;
                return `
                        <div
                            class="cpm-card${isCurrent ? ' cpm-current' : ''}${isSwitchable ? ' cpm-switchable' : ''}${
                                isSelected ? ' cpm-selected' : ''
                            }${isSelectionDisabled ? ' cpm-selection-disabled' : ''}"
                            data-profile-id="${escapeHtml(profile.id || '')}"
                        >
                            <div
                                class="cpm-card-head"
                            >
                                <div
                                    class="cpm-name-area"
                                >
                                    <span
                                        class="cpm-name"
                                    >
                                        ${highlightSearchText(profile.name)}
                                    </span>
                                </div>
                                <div
                                    class="cpm-action-group"
                                >
                                    ${
                                        state.selectionMode
                                            ? `
                                                <input
                                                    class="cpm-select-checkbox"
                                                    type="checkbox"
                                                    aria-label="${escapeHtml(profile.name)} 선택"
                                                    ${isSelected ? 'checked' : ''}
                                                    ${isSelectionDisabled || !profile.id ? 'disabled' : ''}
                                                >
                                              `
                                            : `
                                    <button
                                        class="cpm-icon cpm-favorite ${meta.favorite ? 'active' : ''}"
                                        data-card-action="favorite"
                                        title="즐겨찾기"
                                        aria-label="즐겨찾기"
                                        aria-pressed="${meta.favorite}"
                                    >
                                        <svg
                                            viewBox="0 0 24 24"
                                            fill="${meta.favorite ? 'currentColor' : 'none'}"
                                            stroke="currentColor"
                                            stroke-width="1.8"
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            aria-hidden="true"
                                        >
                                            <path d="m12 2.5 2.95 5.98 6.6.96-4.78 4.66 1.13 6.58L12 17.58l-5.9 3.1 1.13-6.58-4.78-4.66 6.6-.96L12 2.5Z"></path>
                                        </svg>
                                    </button>
                                    <button
                                        class="cpm-icon cpm-pin ${meta.pinned ? 'active' : ''}"
                                        data-card-action="pin"
                                        title="고정"
                                        aria-label="상단 고정"
                                        aria-pressed="${meta.pinned}"
                                    >
                                        <svg
                                            viewBox="0 0 24 24"
                                            fill="${meta.pinned ? 'currentColor' : 'none'}"
                                            stroke="currentColor"
                                            stroke-width="1.8"
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            aria-hidden="true"
                                        >
                                            <path d="M12 17v5"></path>
                                            <path d="M5 17h14"></path>
                                            <path d="M6 3h12l-2 7 3 3v2H5v-2l3-3-2-7Z"></path>
                                        </svg>
                                    </button>
                                    <button
                                        class="cpm-icon"
                                        data-card-action="menu"
                                        title="메뉴"
                                    >
                                        ⋯
                                    </button>
                                              `
                                    }
                                </div>
                            </div>
                            <div class="cpm-content ${expanded ? 'expanded' : ''}">${highlightSearchText(
                                profile.information
                            )}</div>
                            <button
                                class="cpm-expand"
                                data-card-action="expand"
                                aria-expanded="${!!expanded}"
                                hidden
                            >
                                ${expanded ? '접기' : '더보기'}
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    aria-hidden="true"
                                >
                                    <path d="${expanded ? 'm6 15 6-6 6 6' : 'm6 9 6 6 6-6'}"></path>
                                </svg>
                            </button>
                            ${
                                searchSnippet
                                    ? `
                                        <div
                                            class="cpm-search-snippet"
                                            hidden
                                        >${searchSnippet}</div>
                                      `
                                    : ''
                            }
                            ${
                                memo
                                    ? `
                                        <div
                                            class="cpm-info-row"
                                        >
                                            ${memo}
                                        </div>
                                      `
                                    : ''
                            }
                            ${
                                tags
                                    ? `
                                        <div
                                            class="cpm-info-row"
                                        >
                                            ${tags}
                                        </div>
                                      `
                                    : ''
                            }
                        </div>
                    `;
            })
            .join('');
        // DOM 측정(read)과 반영(write)을 분리한다.
        // 카드마다 read → write를 번갈아 하면 카드 수만큼
        // 강제 동기 리플로우(layout thrashing)가 발생하므로,
        // 모든 카드를 먼저 다 읽어둔 뒤 마지막에 한 번에 반영한다.
        const cardUpdates = [];
        for (const card of qsa('.cpm-card', listEl)) {
            const content = qs('.cpm-content', card);
            const button = qs('.cpm-expand', card);
            const snippet = qs('.cpm-search-snippet', card);
            if (!content || !button) {
                continue;
            }
            const expanded = content.classList.contains('expanded');
            const overflowing = content.scrollHeight > content.clientHeight + 1;
            let visibleMatch = true;
            if (snippet) {
                const contentRect = content.getBoundingClientRect();
                visibleMatch = qsa('.cpm-highlight', content).some((mark) => {
                    const markRect = mark.getBoundingClientRect();
                    return markRect.top >= contentRect.top - 0.5 && markRect.bottom <= contentRect.bottom + 0.5;
                });
            }
            cardUpdates.push({ button, snippet, expanded, overflowing, visibleMatch });
        }
        for (const { button, snippet, expanded, overflowing, visibleMatch } of cardUpdates) {
            button.hidden = state.selectionMode || (!expanded && !overflowing);
            if (snippet) {
                snippet.hidden = expanded || visibleMatch;
            }
        }
    }
    function renderSelectionControls(root) {
        const availableIds = new Set(
            state.profiles
                .filter((profile) => profile.id && !isCurrentProfile(profile))
                .map((profile) => String(profile.id))
        );
        for (const id of [...state.selectedProfileIds]) {
            if (!availableIds.has(id)) {
                state.selectedProfileIds.delete(id);
            }
        }
        const startButton = qs('[data-selection-action="start"]', root);
        const createButton = qs('[data-create-profile]', root);
        const actions = qs('#cpm-selection-actions', root);
        const deleteButton = qs('#cpm-delete-selected', root);
        if (startButton) {
            startButton.hidden = state.selectionMode;
        }
        if (createButton) {
            createButton.hidden = state.selectionMode;
        }
        if (actions) {
            actions.hidden = !state.selectionMode;
        }
        if (deleteButton) {
            const count = state.selectedProfileIds.size;
            deleteButton.disabled = count === 0;
            deleteButton.textContent = `${count}개 삭제`;
        }
    }
    function renderSelectionState() {
        const root = qs('#cpm-root');
        if (!root) return;
        renderSelectionControls(root);
        renderProfilesOnly();
    }
    function renderLauncherPlacementControls(root = qs('#cpm-root')) {
        if (!root) return;
        qsa('[data-launcher-placement]', root).forEach((button) => {
            const isActive = button.dataset.launcherPlacement === state.launcherPlacement;
            button.classList.toggle('active', isActive);
            button.setAttribute('aria-pressed', String(isActive));
        });
    }
    function render() {
        const root = qs('#cpm-root');
        if (!root) return;
        renderSelectionControls(root);
        renderLauncherPlacementControls(root);
        renderTagsOnly();
        renderProfilesOnly();
        const search = qs('#cpm-search', root);
        if (search && search.value !== state.search) {
            search.value = state.search;
        }
        const sort = qs('#cpm-sort', root);
        if (sort) {
            const labels = {
                'created-asc': '생성순',
                'created-desc': '최신 생성순',
                'name-asc': '이름 오름차순',
                'name-desc': '이름 내림차순'
            };
            const label = qs('[data-sort-label]', sort);
            if (label) {
                label.textContent = labels[state.sort] || labels['created-asc'];
            }
            qsa('[data-sort-value]', root).forEach((option) => {
                option.classList.toggle('active', option.dataset.sortValue === state.sort);
            });
        }
        qsa('[data-view]', root).forEach((button) => {
            button.classList.toggle('active', button.dataset.view === state.view);
        });
    }
    // =========================================================
    // 관리자 열기
    // =========================================================
    async function openManager() {
        if (qs('#cpm-root')) {
            return;
        }
        state.managerOpen = true;
        mergeDOMIntoProfiles();
        const root = document.createElement('div');
        root.id = 'cpm-root';
        root.innerHTML = `
            <div id="cpm-backdrop"></div>
            <div id="cpm-panel">
                <div class="cpm-header">
                    <div>
                        <div class="cpm-title">
                            대화 프로필
                        </div>
                    </div>
                    <div class="cpm-header-actions">
                        <div
                            class="cpm-placement-options"
                            role="group"
                            aria-label="프로필 박스 버튼 위치"
                        >
                            <button
                                class="cpm-placement-option"
                                type="button"
                                data-launcher-placement="floating"
                            >
                                플로팅
                            </button>
                            <button
                                class="cpm-placement-option"
                                type="button"
                                data-launcher-placement="embedded"
                            >
                                채팅 설정창
                            </button>
                        </div>
                        <button
                            class="cpm-close"
                            type="button"
                            title="닫기"
                            aria-label="대화 프로필 닫기"
                        >
                            ×
                        </button>
                    </div>
                </div>
                <div class="cpm-toolbar">
                    <input
                        id="cpm-search"
                        class="cpm-search"
                        type="text"
                        placeholder="이름, 내용, 메모 검색..."
                    >
                    <div class="cpm-toolbar-row">
                        <div class="cpm-tabs">
                            <button
                                class="cpm-pill active"
                                data-view="all"
                            >
                                전체
                            </button>
                            <button
                                class="cpm-pill"
                                data-view="favorite"
                            >
                                <svg
                                    class="cpm-filter-icon cpm-filter-star"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                    stroke="currentColor"
                                    stroke-width="1.8"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    aria-hidden="true"
                                >
                                    <path d="m12 2.5 2.95 5.98 6.6.96-4.78 4.66 1.13 6.58L12 17.58l-5.9 3.1 1.13-6.58-4.78-4.66 6.6-.96L12 2.5Z"></path>
                                </svg>
                                즐겨찾기
                            </button>
                            <button
                                class="cpm-pill"
                                data-create-profile
                            >
                                프로필 생성
                            </button>
                            <button
                                class="cpm-pill cpm-delete-trigger"
                                data-selection-action="start"
                            >
                                선택 삭제
                            </button>
                            <div
                                class="cpm-selection-actions"
                                id="cpm-selection-actions"
                                hidden
                            >
                                <button
                                    class="cpm-pill"
                                    data-selection-action="select-all"
                                >
                                    전체 선택
                                </button>
                                <button
                                    class="cpm-pill"
                                    data-selection-action="cancel"
                                >
                                    선택 취소
                                </button>
                                <button
                                    class="cpm-pill cpm-delete-selected"
                                    id="cpm-delete-selected"
                                    data-selection-action="delete"
                                    disabled
                                >
                                    0개 삭제
                                </button>
                            </div>
                        </div>
                        <div class="cpm-sort-wrap">
                            <button
                                id="cpm-sort"
                                class="cpm-sort"
                                type="button"
                                aria-expanded="false"
                            >
                                <span data-sort-label>
                                    생성순
                                </span>
                                <span class="cpm-sort-arrow">
                                    ▾
                                </span>
                            </button>
                            <div
                                class="cpm-sort-menu"
                                data-sort-menu
                                hidden
                            >
                                <button
                                    class="cpm-sort-option"
                                    type="button"
                                    data-sort-value="created-asc"
                                >
                                    생성순
                                </button>
                                <button
                                    class="cpm-sort-option"
                                    type="button"
                                    data-sort-value="created-desc"
                                >
                                    최신 생성순
                                </button>
                                <button
                                    class="cpm-sort-option"
                                    type="button"
                                    data-sort-value="name-asc"
                                >
                                    이름 오름차순
                                </button>
                                <button
                                    class="cpm-sort-option"
                                    type="button"
                                    data-sort-value="name-desc"
                                >
                                    이름 내림차순
                                </button>
                            </div>
                        </div>
                    </div>
                    <div
                        class="cpm-section-label"
                    >
                        태그
                    </div>
                    <div
                        id="cpm-tags"
                        class="cpm-tags"
                    ></div>
                    <div
                        id="cpm-selected-tags"
                        class="cpm-selected-tags"
                    ></div>
                </div>
                <div
                    class="cpm-list-wrap"
                >
                    <div
                        id="cpm-count"
                        class="cpm-count"
                    >
                        0개 표시 / 0개
                    </div>
                    <div
                        id="cpm-profile-list"
                    ></div>
                </div>
            </div>
        `;
        document.body.appendChild(root);
        syncViewportLayout();
        // 닫기
        qs('.cpm-close', root).onclick = closeManager;
        qs('#cpm-backdrop', root).onclick = closeManager;
        // 검색
        // 입력마다 바로 렌더링하면 카드 수만큼 레이아웃 측정이 반복돼서
        // 타이핑이 버벅일 수 있어 짧게 디바운스한다.
        qs('#cpm-search', root).addEventListener('input', (event) => {
            state.search = event.target.value;
            clearTimeout(searchDebounceTimer);
            searchDebounceTimer = setTimeout(() => {
                // 검색창 자체는 건드리지 않고
                // 목록만 렌더링
                renderProfilesOnly();
            }, 120);
        });
        qsa('[data-launcher-placement]', root).forEach((button) => {
            button.onclick = () => {
                const placement = button.dataset.launcherPlacement;
                if (placement === state.launcherPlacement) {
                    return;
                }
                const launcherPlaced = setLauncherPlacement(placement);
                showToast(
                    placement === 'embedded'
                        ? launcherPlaced
                            ? '프로필 박스를 채팅 설정창 안으로 옮겼어요.'
                            : '점 세 개 메뉴를 열면 프로필 박스가 표시돼요.'
                        : '프로필 박스를 화면에 띄웠어요.',
                    800
                );
            };
        });
        // 정렬
        const sortSelect = qs('#cpm-sort', root);
        const sortMenu = qs('[data-sort-menu]', root);
        const closeSortMenu = () => {
            sortMenu.hidden = true;
            sortSelect.setAttribute('aria-expanded', 'false');
        };
        sortSelect.addEventListener('click', (event) => {
            event.stopPropagation();
            const willOpen = sortMenu.hidden;
            sortMenu.hidden = !willOpen;
            sortSelect.setAttribute('aria-expanded', String(willOpen));
        });
        sortMenu.addEventListener('click', (event) => {
            const option = event.target.closest('[data-sort-value]');
            if (!option) return;
            event.stopPropagation();
            state.sort = option.dataset.sortValue;
            closeSortMenu();
            const label = qs('[data-sort-label]', sortSelect);
            if (label) {
                label.textContent = option.textContent.trim();
            }
            qsa('[data-sort-value]', sortMenu).forEach((item) => {
                item.classList.toggle('active', item === option);
            });
            renderProfilesOnly();
        });
        root.addEventListener('click', (event) => {
            if (!event.target.closest('.cpm-sort-wrap')) {
                closeSortMenu();
            }
        });
        // 전체/즐겨찾기/고정
        qsa('[data-view]', root).forEach((button) => {
            button.onclick = () => {
                state.view = button.dataset.view;
                render();
            };
        });
        // 태그/프로필 액션
        root.addEventListener('click', async (event) => {
            const createProfileButton = event.target.closest('[data-create-profile]');
            if (createProfileButton) {
                openProfileCreateDialog();
                return;
            }
            const selectionActionButton = event.target.closest('[data-selection-action]');
            if (selectionActionButton) {
                const selectionAction = selectionActionButton.dataset.selectionAction;
                if (selectionAction === 'start') {
                    state.selectedProfileIds.clear();
                    state.selectionMode = true;
                    renderSelectionState();
                    return;
                }
                if (selectionAction === 'select-all') {
                    for (const profile of getVisibleProfiles()) {
                        if (profile.id && !isCurrentProfile(profile)) {
                            state.selectedProfileIds.add(String(profile.id));
                        }
                    }
                    renderSelectionState();
                    return;
                }
                if (selectionAction === 'cancel') {
                    state.selectedProfileIds.clear();
                    state.selectionMode = false;
                    renderSelectionState();
                    return;
                }
                if (selectionAction === 'delete') {
                    openBulkDeleteDialog();
                    return;
                }
            }
            // 태그 클릭
            const tagButton = event.target.closest('[data-tag]');
            if (tagButton && root.contains(tagButton)) {
                const tag = tagButton.dataset.tag;
                if (state.selectedTags.has(tag)) {
                    state.selectedTags.delete(tag);
                } else {
                    state.selectedTags.add(tag);
                }
                renderTagsOnly();
                renderProfilesOnly();
                return;
            }
            // 카드 액션
            const actionButton = event.target.closest('[data-card-action]');
            const card = event.target.closest('.cpm-card');
            if (!card) {
                return;
            }
            const id = card.dataset.profileId;
            const profile = state.profiles.find((item) => String(item.id) === String(id));
            if (!profile) {
                showToast('프로필 정보를 찾지 못했어요.');
                return;
            }
            if (state.selectionMode) {
                if (!profile.id || isCurrentProfile(profile)) {
                    if (isCurrentProfile(profile)) {
                        showToast('현재 사용 중인 프로필은 삭제할 수 없어요.');
                    }
                    return;
                }
                const profileId = String(profile.id);
                if (state.selectedProfileIds.has(profileId)) {
                    state.selectedProfileIds.delete(profileId);
                } else {
                    state.selectedProfileIds.add(profileId);
                }
                renderSelectionState();
                return;
            }
            if (!actionButton) {
                openProfileSwitchDialog(profile);
                return;
            }
            const meta = getMeta(profile.id);
            const action = actionButton.dataset.cardAction;
            if (action === 'expand') {
                const key = String(profile.id);
                if (state.expandedProfiles.has(key)) {
                    state.expandedProfiles.delete(key);
                } else {
                    state.expandedProfiles.add(key);
                }
                renderProfilesOnly();
                return;
            }
            if (action === 'favorite') {
                meta.favorite = !meta.favorite;
                saveMeta();
                renderProfilesOnly();
                return;
            }
            if (action === 'pin') {
                meta.pinned = !meta.pinned;
                saveMeta();
                renderProfilesOnly();
                return;
            }
            if (action === 'menu') {
                openProfileMenu(actionButton, profile);
            }
        });
        render();
        // 열자마자 최신 목록 한 번 확인
        await refreshProfiles();
        if (state.managerOpen) {
            render();
        }
    }
    function closeManager() {
        clearTimeout(searchDebounceTimer);
        const root = qs('#cpm-root');
        root?.remove();
        closeProfileMenu();
        state.selectionMode = false;
        state.selectedProfileIds.clear();
        state.managerOpen = false;
    }
    // =========================================================
    // Crack Dashboard / Mobile Utility 프로필 버튼 연동
    // =========================================================
    function decorateExternalProfileLauncher(launcher) {
        if (!(launcher instanceof HTMLElement)) {
            return false;
        }
        launcher.classList.add('cpm-external-profile-launcher');
        launcher.dataset.cpmExternalProfileLauncher = 'true';
        launcher.title = '프로필 박스';
        launcher.setAttribute('aria-label', '프로필 박스 열기');
        if (launcher instanceof HTMLButtonElement) {
            launcher.type = 'button';
            launcher.disabled = false;
        }
        if (
            launcher.dataset.cpmProfileIcon !== '1' ||
            !launcher.querySelector('.cpm-launcher-icon')
        ) {
            launcher.innerHTML = getLauncherIconMarkup();
            launcher.dataset.cpmProfileIcon = '1';
        }
        return true;
    }
    function createExternalProfileLauncherFallback() {
        const content = qs('#chud-side-content');
        if (!content || !getCurrentChatId()) {
            return null;
        }
        const existing = qs('[data-cpm-profile-fallback="true"]', content);
        if (existing) {
            return existing;
        }
        const button = document.createElement('button');
        button.id = 'cpm-chud-profile-btn';
        button.className = 'chud-action-btn';
        button.type = 'button';
        button.dataset.sideKey = 'profileButton';
        button.dataset.cpmProfileFallback = 'true';
        decorateExternalProfileLauncher(button);
        const anchor = qs('#chud-guide-btn', content) || qs('#chud-model-btn', content);
        content.insertBefore(button, anchor?.nextSibling || content.firstChild || null);
        return button;
    }
    function syncExternalProfileLaunchers() {
        const candidates = qsa(EXTERNAL_PROFILE_LAUNCHER_SELECTOR);
        const official = candidates.filter(
            (launcher) => launcher.dataset.cpmProfileFallback !== 'true'
        );
        let launchers = official;
        if (official.length) {
            qsa('[data-cpm-profile-fallback="true"]').forEach((fallback) => fallback.remove());
        } else {
            const fallback = createExternalProfileLauncherFallback();
            launchers = fallback ? [fallback] : [];
        }
        launchers.forEach(decorateExternalProfileLauncher);
        return launchers.length > 0;
    }
    function findExternalProfileLauncher(target) {
        if (!target || typeof target.closest !== 'function') {
            return null;
        }
        const launcher = target.closest(EXTERNAL_PROFILE_LAUNCHER_SELECTOR);
        if (!launcher || launcher.closest?.('#cpm-root')) {
            return null;
        }
        return launcher;
    }
    function dismissMobileKeyboard() {
        const activeElement = document.activeElement;
        if (
            !activeElement ||
            activeElement === document.body ||
            typeof activeElement.blur !== 'function'
        ) {
            return;
        }
        if (
            activeElement.matches?.('input, textarea, select') ||
            activeElement.isContentEditable
        ) {
            activeElement.blur();
        }
    }
    function handleExternalProfileLauncherPointerDown(event) {
        if (findExternalProfileLauncher(event.target)) {
            // 외부 확장프로그램이 기본 동작을 막기 전에 채팅 입력 포커스를 해제한다.
            dismissMobileKeyboard();
        }
    }
    function handleExternalProfileLauncherClick(event) {
        if (!findExternalProfileLauncher(event.target)) {
            return;
        }
        // 두 확장프로그램의 기존 대화 프로필 열기 동작보다 먼저 처리한다.
        event.preventDefault();
        event.stopPropagation();
        dismissMobileKeyboard();
        void openManager();
    }
    function installExternalProfileLauncherBridge() {
        if (externalProfileBridgeInstalled) {
            return;
        }
        document.addEventListener(
            'pointerdown',
            handleExternalProfileLauncherPointerDown,
            true
        );
        document.addEventListener(
            'click',
            handleExternalProfileLauncherClick,
            true
        );
        externalProfileBridgeInstalled = true;
        syncExternalProfileLaunchers();
        [120, 400, 900, 1800, 3500, 7000].forEach((delay) => {
            setTimeout(syncExternalProfileLaunchers, delay);
        });
    }
    // =========================================================
    // 실행 버튼
    // =========================================================
    function applySavedLauncherPosition(button) {
        button.classList.remove('cpm-custom-position');
        button.style.removeProperty('--cpm-launcher-left');
        button.style.removeProperty('--cpm-launcher-top');
        try {
            const saved = JSON.parse(localStorage.getItem(LAUNCHER_POSITION_KEY) || 'null');
            if (Number.isFinite(saved?.left) && Number.isFinite(saved?.top)) {
                button.classList.add('cpm-custom-position');
                button.style.setProperty('--cpm-launcher-left', `${saved.left}px`);
                button.style.setProperty('--cpm-launcher-top', `${saved.top}px`);
            }
        } catch {
            // 저장된 위치를 읽지 못하면 기본 위치를 사용한다.
        }
    }
    function installLauncherDrag(button) {
        let holdTimer = null;
        let pointerId = null;
        let dragging = false;
        let dragMoved = false;
        let suppressClickUntil = 0;
        let startX = 0;
        let startY = 0;
        let startLeft = 0;
        let startTop = 0;
        const clampPosition = (left, top) => ({
            left: Math.max(6, Math.min(window.innerWidth - button.offsetWidth - 6, left)),
            top: Math.max(6, Math.min(window.innerHeight - button.offsetHeight - 6, top))
        });
        const applyPosition = (left, top) => {
            const position = clampPosition(left, top);
            button.classList.add('cpm-custom-position');
            button.style.setProperty('--cpm-launcher-left', `${position.left}px`);
            button.style.setProperty('--cpm-launcher-top', `${position.top}px`);
            return position;
        };
        applySavedLauncherPosition(button);
        const stopHoldTimer = () => {
            clearTimeout(holdTimer);
            holdTimer = null;
        };
        const finishDrag = (event) => {
            if (pointerId !== event.pointerId) {
                return;
            }
            stopHoldTimer();
            if (dragging) {
                button.classList.remove('cpm-dragging');
                if (dragMoved) {
                    // 같은 드래그에서 바로 발생하는 click만 잠깐 막는다.
                    suppressClickUntil = Date.now() + 250;
                    const rect = button.getBoundingClientRect();
                    try {
                        localStorage.setItem(
                            LAUNCHER_POSITION_KEY,
                            JSON.stringify({
                                left: rect.left,
                                top: rect.top
                            })
                        );
                    } catch {
                        // 저장하지 못해도 현재 페이지 이동은 유지한다.
                    }
                }
            }
            dragging = false;
            dragMoved = false;
            pointerId = null;
        };
        button.addEventListener('pointerdown', (event) => {
            if (button.dataset.cpmPlacement !== 'floating' || event.button !== 0) {
                return;
            }
            // 이전 드래그에서 click이 생략됐더라도 새 탭은 정상 클릭이다.
            suppressClickUntil = 0;
            dragMoved = false;
            const rect = button.getBoundingClientRect();
            pointerId = event.pointerId;
            startX = event.clientX;
            startY = event.clientY;
            startLeft = rect.left;
            startTop = rect.top;
            button.setPointerCapture?.(event.pointerId);
            stopHoldTimer();
            holdTimer = setTimeout(() => {
                dragging = true;
                button.classList.add('cpm-dragging');
            }, 320);
        });
        button.addEventListener('pointermove', (event) => {
            if (button.dataset.cpmPlacement !== 'floating' || pointerId !== event.pointerId) {
                return;
            }
            if (!dragging) {
                if (Math.hypot(event.clientX - startX, event.clientY - startY) > 8) {
                    stopHoldTimer();
                }
                return;
            }
            event.preventDefault();
            const deltaX = event.clientX - startX;
            const deltaY = event.clientY - startY;
            if (Math.hypot(deltaX, deltaY) > 3) {
                dragMoved = true;
                applyPosition(startLeft + deltaX, startTop + deltaY);
            }
        });
        button.addEventListener('pointerup', finishDrag);
        button.addEventListener('pointercancel', (event) => {
            if (pointerId !== event.pointerId) {
                return;
            }
            stopHoldTimer();
            button.classList.remove('cpm-dragging');
            dragging = false;
            dragMoved = false;
            suppressClickUntil = 0;
            pointerId = null;
        });
        button.__cpmConsumeDragClick = () => {
            if (Date.now() > suppressClickUntil) {
                suppressClickUntil = 0;
                return false;
            }
            suppressClickUntil = 0;
            return true;
        };
    }
    function getLauncherIconMarkup() {
        return `
            <svg
                class="cpm-launcher-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
            >
                <rect
                    x="3"
                    y="3"
                    width="18"
                    height="18"
                    rx="3"
                ></rect>
                <circle
                    cx="9"
                    cy="9"
                    r="2.25"
                ></circle>
                <path
                    d="M5.8 16c.55-2.05 1.65-3.1 3.2-3.1s2.65 1.05 3.2 3.1"
                ></path>
                <path d="M15 8h3"></path>
                <path d="M15 12h3"></path>
                <path d="M15 16h2"></path>
            </svg>
        `;
    }
    function toggleManagerFromLauncher(event, button) {
        if (button?.__cpmConsumeDragClick?.()) {
            event?.preventDefault();
            return;
        }
        event?.stopPropagation();
        event?.preventDefault();
        if (qs('#cpm-root')) {
            closeManager();
        } else {
            dismissMobileKeyboard();
            openManager();
        }
    }
    function createFloatingLauncher() {
        const button = document.createElement('button');
        button.id = 'cpm-launcher';
        button.type = 'button';
        button.dataset.cpmPlacement = 'floating';
        button.innerHTML = `${getLauncherIconMarkup()}<span>프로필</span>`;
        button.title = '대화 프로필 관리';
        button.setAttribute('aria-label', '대화 프로필 관리');
        button.onclick = (event) => toggleManagerFromLauncher(event, button);
        installLauncherDrag(button);
        return button;
    }
    function isAttachedLauncherAnchor(element) {
        // 접힌 패널/스크롤 아래에도 삽입해 두어 열었을 때 바로 보이게 한다.
        return !!element?.parentNode && element.isConnected !== false;
    }
    function findNativeLauncherAnchor() {
        const normalize = (value) => String(value || '').replace(/\s+/g, '');
        const labels = ['키보드단축키', '요약메모리', '최대출력량조절', '유저노트', '대화프로필', '플레이가이드'];
        const candidates = qsa('button, [role="button"], [role="menuitem"]');
        for (const label of labels) {
            for (const candidate of candidates) {
                if (normalize(candidate.textContent) !== label ||
                    candidate.closest('#cpm-root, #cpm-embedded-launcher, #chud-side-content')) {
                    continue;
                }
                let row = candidate;
                // 버튼 내부가 아닌 메뉴 한 행의 형제로 삽입한다. 스타일 클래스에 의존하지 않는다.
                while (row.parentElement && row.parentElement !== document.body &&
                    normalize(row.parentElement.textContent) === label &&
                    !row.parentElement.matches('aside, nav, [role="dialog"], [role="menu"]')) {
                    row = row.parentElement;
                }
                if (isAttachedLauncherAnchor(row)) return row;
            }
        }
        return null;
    }
    function findEmbeddedLauncherAnchor() {
        const aiSummaryMenu = qs('#crack-ext-ai-sidebar-menu');
        if (isAttachedLauncherAnchor(aiSummaryMenu)) {
            return aiSummaryMenu;
        }
        const translatorMenu = qs('#trans-menu-btn');
        if (isAttachedLauncherAnchor(translatorMenu)) {
            return translatorMenu;
        }
        if (!document.body) {
            return null;
        }
        const nativeAnchor = findNativeLauncherAnchor();
        if (nativeAnchor) return nativeAnchor;
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
        let node = null;
        while ((node = walker.nextNode())) {
            if (!String(node.textContent || '').includes('키보드 단축키')) {
                continue;
            }
            const parent = node.parentElement;
            const container = parent?.closest?.('.px-2\\.5');
            if (
                container &&
                container.id !== 'cpm-embedded-launcher' &&
                isAttachedLauncherAnchor(container)
            ) {
                return container;
            }
        }
        return null;
    }
    function createEmbeddedLauncher() {
        const item = document.createElement('div');
        item.id = 'cpm-embedded-launcher';
        item.className = 'px-2.5 h-4 box-content py-[18px]';
        item.innerHTML = `
            <div
                role="button"
                tabindex="0"
                aria-label="프로필 박스"
                aria-haspopup="dialog"
                class="w-full flex h-4 items-center justify-between typo-text-base_leading-none_medium [&_svg]:fill-icon_tertiary ring-offset-4 ring-offset-sidebar cursor-pointer"
            >
                <span class="flex items-center min-w-0">
                    ${getLauncherIconMarkup()}
                    <span class="whitespace-nowrap overflow-hidden text-ellipsis typo-text-sm_leading-none_medium">
                        프로필 박스
                    </span>
                </span>
            </div>
        `;
        const activate = (event) => toggleManagerFromLauncher(event, null);
        item.addEventListener('click', activate);
        item.addEventListener('keydown', (event) => {
            if (event.repeat || (event.key !== 'Enter' && event.key !== ' ')) {
                return;
            }
            activate(event);
        });
        return item;
    }
    function ensureLauncher() {
        if (!document.body) {
            return false;
        }
        if (state.launcherPlacement === 'floating') {
            qsa('#cpm-embedded-launcher').forEach((item) => item.remove());
            const buttons = qsa('#cpm-launcher');
            const button = buttons[0] || createFloatingLauncher();
            for (let index = 1; index < buttons.length; index += 1) {
                buttons[index].remove();
            }
            if (button.parentNode !== document.body) {
                document.body.appendChild(button);
            }
            requestViewportSync(false);
            return true;
        }
        qsa('#cpm-launcher').forEach((button) => button.remove());
        const menus = qsa('#cpm-embedded-launcher');
        if (!getCurrentChatId()) {
            menus.forEach((menu) => menu.remove());
            return false;
        }
        const anchor = findEmbeddedLauncherAnchor();
        if (!anchor?.parentNode) {
            menus.forEach((menu) => menu.remove());
            return false;
        }
        const menu = menus[0] || createEmbeddedLauncher();
        for (let index = 1; index < menus.length; index += 1) {
            menus[index].remove();
        }
        if (menu.parentNode !== anchor.parentNode || menu.previousElementSibling !== anchor) {
            anchor.parentNode.insertBefore(menu, anchor.nextSibling);
        }
        return true;
    }
    // =========================================================
    // 사이트 DOM 변경 감시
    // =========================================================
    function isOwnUiNode(node) {
        if (node?.nodeType !== 1) {
            return false;
        }
        const selector = '#cpm-root, #cpm-launcher, #cpm-embedded-launcher, .cpm-menu, .cpm-toast';
        return !!(node.matches?.(selector) || node.closest?.(selector));
    }
    function getProfilesSignature() {
        return state.profiles
            .map((profile) =>
                [
                    profile.id || '',
                    profile.groupId || '',
                    profile.name || '',
                    profile.information || '',
                    profile.isRepresentative ? '1' : '0',
                    profile.createdAt || '',
                    profile.updatedAt || ''
                ].join('\u0000')
            )
            .join('\u0001');
    }
    function startSiteObserver() {
        if (siteObserver || !document.body) {
            return;
        }
        siteObserver = new MutationObserver((mutations) => {
            // 확프로 UI 내부에서 발생한
            // 변화는 완전히 무시한다.
            const hasSiteChange = mutations.some((mutation) => {
                if (isOwnUiNode(mutation.target)) {
                    return false;
                }
                return [...mutation.addedNodes, ...mutation.removedNodes].some(
                    (node) => node.nodeType === 1 && !isOwnUiNode(node)
                );
            });
            if (!hasSiteChange) {
                return;
            }
            clearTimeout(observerTimer);
            observerTimer = setTimeout(() => {
                syncExternalProfileLaunchers();
                ensureLauncher();
                if (!state.managerOpen) {
                    return;
                }
                const beforeMerge = getProfilesSignature();
                mergeDOMIntoProfiles();
                if (beforeMerge !== getProfilesSignature()) {
                    render();
                }
            }, 180);
        });
        siteObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    // =========================================================
    // 초기화
    // =========================================================
    function init() {
        loadMeta();
        loadProfileGroupId();
        loadLauncherPlacement();
        installViewportSync();
        installExternalProfileLauncherBridge();
        // document-start에서는 <head>가 아직 없을 수 있으므로
        // 네트워크 감시는 먼저 설치하고 스타일은 DOM 준비 후 한 번 더 보장한다.
        installNetworkHooks();
        injectStyles();
        const start = async () => {
            injectStyles();
            syncExternalProfileLaunchers();
            ensureLauncher();
            startSiteObserver();
            await sleep(800);
            mergeDOMIntoProfiles();
            await refreshProfiles();
            mergeDOMIntoProfiles();
        };
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', start, { once: true });
        } else {
            start();
        }
    }
    init();
})();
