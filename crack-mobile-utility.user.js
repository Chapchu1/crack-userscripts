// ==UserScript==
// @name         📱 Crack Mobile Utility (모바일 유틸 합본)
// @namespace    crack-mobile-utility
// @version      4.5.0.4.13
// @description  모바일용 합본: 입력창 설정·초안 자동 저장·입력 글자수 카운터·우측 상단 펼치기 버튼, 상단바 접기, 빈 전송 방지, 엔딩 버튼 숨김, 와이드뷰, 글씨/이미지 크기, 썸네일 움짤 정지, 라디오존데 인라인, 대시보드 원본식 정보바/미니사이드바(게임 HUD·모바일 삽화·Wish RP Manager·AI 요약 바로가기 포함), 글자수·시간 배지·답변별 모델·실측 크래커, 메시지 길게 누르기 메뉴, 로그 캡처, 외부 테마 자동 공존
// @author       chu
// @homepageURL https://github.com/Chapchu1/crack-userscripts
// @downloadURL https://raw.githubusercontent.com/Chapchu1/crack-userscripts/main/crack-mobile-utility.user.js
// @updateURL   https://raw.githubusercontent.com/Chapchu1/crack-userscripts/main/crack-mobile-utility.user.js
// @match        *://crack.wrtn.ai/*
// @run-at       document-idle
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      old.rs.igx.kr
// @connect      rs.igx.kr
// @connect      radiosonde-api-striker.b-cdn.net
// @connect      b-cdn.net
// @connect      *.b-cdn.net
// @connect      claude-radiosonde.chyoyam.chatgpt.site
// @connect      crack-api.wrtn.ai
// @connect      contents-api.wrtn.ai
// @connect      cdn.jsdelivr.net
// @connect      wrtn-image-ai-character.static.wrtn.ai
// @connect      d394jeh9729epj.cloudfront.net
// @connect      cdn-image.static.wrtn.ai
// @connect      cdn-image.wrtn.ai
// @connect      crack.static.wrtn.ai
// @connect      wrtn-contents-gen-image.wow.wrtn.ai
// @connect      wrtn-image-ai-character.s3.ap-northeast-2.amazonaws.com
// @connect      wrtn-common-image.s3.ap-northeast-2.amazonaws.com
// @connect      d1k8apdmymvh8f.cloudfront.net
// @connect      p4m.uk
// ==/UserScript==

(() => {
    'use strict';
    const VERSION = '4.5.0.4.13';
    // Merge base: upstream 4.5.0.4 + retained custom compact model picker / integrations / mobile fixes.
    const CMU_RUNTIME_ATTR = 'data-cmu-runtime-version';
    const CMU_RUNTIME_KEY = '__CRACK_MOBILE_UTILITY_RUNTIME__';
    const runtimeRoot = document.documentElement;
    if (runtimeRoot?.getAttribute(CMU_RUNTIME_ATTR) === VERSION)
        return;
    let runtimeWindow = window;
    try {
        if (typeof unsafeWindow !== 'undefined' && unsafeWindow)
            runtimeWindow = unsafeWindow;
    }
    catch (_) { }
    try {
        const previousRuntime = runtimeWindow?.[CMU_RUNTIME_KEY];
        if (previousRuntime?.version === VERSION)
            return;
        previousRuntime?.dispose?.('upgrade');
    }
    catch (_) { }
    runtimeRoot?.setAttribute(CMU_RUNTIME_ATTR, VERSION);
    window.__CRACK_MOBILE_UTILITY_250_LOADED__ = true;
    const CMU_RUNTIME = { version: VERSION, disposed: false, cleanupVersion: 1, dispose: null };
    try {
        runtimeWindow[CMU_RUNTIME_KEY] = CMU_RUNTIME;
    }
    catch (_) { }
    const CMU_RESOURCES = {
        timeouts: new Set(), intervals: new Set(), frames: new Set(), observers: new Set(),
        listeners: new Set(), controllers: new Set(), styles: new Set(), cleanups: [],
    };
    const CMU_NATIVE = {
        setTimeout: window.setTimeout.bind(window), clearTimeout: window.clearTimeout.bind(window),
        setInterval: window.setInterval.bind(window), clearInterval: window.clearInterval.bind(window),
        requestAnimationFrame: window.requestAnimationFrame.bind(window), cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
    };
    function setTimeout(callback, delay = 0, ...args) {
        if (CMU_RUNTIME.disposed)
            return 0;
        const id = CMU_NATIVE.setTimeout(() => {
            CMU_RESOURCES.timeouts.delete(id);
            if (!CMU_RUNTIME.disposed)
                callback.apply(window, args);
        }, delay);
        CMU_RESOURCES.timeouts.add(id);
        return id;
    }
    function clearTimeout(id) {
        CMU_RESOURCES.timeouts.delete(id);
        CMU_NATIVE.clearTimeout(id);
    }
    function setInterval(callback, delay = 0, ...args) {
        if (CMU_RUNTIME.disposed)
            return 0;
        const id = CMU_NATIVE.setInterval(() => {
            if (!CMU_RUNTIME.disposed)
                callback.apply(window, args);
        }, delay);
        CMU_RESOURCES.intervals.add(id);
        return id;
    }
    function clearInterval(id) {
        CMU_RESOURCES.intervals.delete(id);
        CMU_NATIVE.clearInterval(id);
    }
    function requestAnimationFrame(callback) {
        if (CMU_RUNTIME.disposed)
            return 0;
        const id = CMU_NATIVE.requestAnimationFrame(time => {
            CMU_RESOURCES.frames.delete(id);
            if (!CMU_RUNTIME.disposed)
                callback(time);
        });
        CMU_RESOURCES.frames.add(id);
        return id;
    }
    function cancelAnimationFrame(id) {
        CMU_RESOURCES.frames.delete(id);
        CMU_NATIVE.cancelAnimationFrame(id);
    }
    function cmuTrackedObserver(NativeObserver) {
        if (typeof NativeObserver !== 'function')
            return undefined;
        return class extends NativeObserver {
            constructor(callback) {
                super((entries, observer) => {
                    if (!CMU_RUNTIME.disposed)
                        callback(entries, observer);
                });
            }
            observe(...args) {
                if (CMU_RUNTIME.disposed)
                    return;
                super.observe(...args);
                CMU_RESOURCES.observers.add(this);
            }
            disconnect() {
                CMU_RESOURCES.observers.delete(this);
                super.disconnect();
            }
        };
    }
    const MutationObserver = cmuTrackedObserver(window.MutationObserver);
    const ResizeObserver = cmuTrackedObserver(window.ResizeObserver);
    function cmuListen(target, type, listener, options = false) {
        if (CMU_RUNTIME.disposed || !target?.addEventListener)
            return;
        const capture = typeof options === 'boolean' ? options : !!options?.capture;
        for (const entry of CMU_RESOURCES.listeners) {
            if (entry.target === target && entry.type === type && entry.listener === listener && entry.capture === capture)
                return;
        }
        target.addEventListener(type, listener, options);
        CMU_RESOURCES.listeners.add({ target, type, listener, capture });
    }
    function cmuUnlisten(target, type, listener, options = false) {
        const capture = typeof options === 'boolean' ? options : !!options?.capture;
        target?.removeEventListener?.(type, listener, options);
        for (const entry of CMU_RESOURCES.listeners) {
            if (entry.target === target && entry.type === type && entry.listener === listener && entry.capture === capture)
                CMU_RESOURCES.listeners.delete(entry);
        }
    }
    function cmuOwnMethod(target, key, previous) {
        const owned = target[key];
        CMU_RESOURCES.cleanups.push(() => {
            // A later extension may wrap us; leave that wrapper intact.
            if (target[key] !== owned)
                return;
            if (previous === undefined)
                delete target[key];
            else
                target[key] = previous;
        });
    }
    function cmuDisposeResources() {
        cmuDisposeShared();
        for (const observer of CMU_RESOURCES.observers)
            try { observer.disconnect(); } catch (_) { }
        CMU_RESOURCES.observers.clear();
        for (const entry of CMU_RESOURCES.listeners)
            try { entry.target.removeEventListener(entry.type, entry.listener, entry.capture); } catch (_) { }
        CMU_RESOURCES.listeners.clear();
        for (const controller of CMU_RESOURCES.controllers)
            try { controller.abort(); } catch (_) { }
        CMU_RESOURCES.controllers.clear();
        for (const [key, cancel] of [['timeouts', CMU_NATIVE.clearTimeout], ['intervals', CMU_NATIVE.clearInterval], ['frames', CMU_NATIVE.cancelAnimationFrame]]) {
            for (const id of CMU_RESOURCES[key])
                cancel(id);
            CMU_RESOURCES[key].clear();
        }
        for (const cleanup of CMU_RESOURCES.cleanups.splice(0).reverse())
            try { cleanup(); } catch (_) { }
        for (const style of CMU_RESOURCES.styles)
            try { style.remove(); } catch (_) { }
        CMU_RESOURCES.styles.clear();
    }
    const LOG = '[CMU]';
    const ID = {
        topZone: 'cmu-top-reveal-zone',
        topHandle: 'cmu-top-reveal-handle',
        toolbarWrapper: 'cmu-toolbar-wrapper',
        settingsButton: 'cmu-settings-button',
        fullscreenButton: 'cmu-fullscreen-button',
        composerExpandButton: 'cmu-composer-expand-button',
        inputCounterWrap: 'cmu-input-counter-wrap',
        inputCounterCount: 'cmu-input-counter-count',
        logCaptureButton: 'cmu-log-capture-button',
        logCaptureBar: 'cmu-log-capture-bar',
        logCapturePreview: 'cmu-log-capture-preview',
        leftMenuZone: 'cmu-left-menu-zone',
        leftMenuHandle: 'cmu-left-menu-handle',
        rightMenuZone: 'cmu-right-menu-zone',
        rightMenuHandle: 'cmu-right-menu-handle',
        menuSwipeZone: 'cmu-menu-swipe-zone',
        panel: 'cmu-settings-panel',
        settingsScrim: 'cmu-settings-scrim',
        toast: 'cmu-toast',
        dashboard: 'chud-infobar',
        dashboardSidebar: 'chud-sidebar',
    };
    const LS = {
        settings: 'cmu_settings_v010_beta',
        settingsBackup: 'cmu_settings_v010_beta_backup',
        apiKeys: 'cmu_api_keys_v1',
        rsModels: 'cmu_rs_models_v3',
        rsVisibility: 'igx_rs_popup_vis_v3',
        dashboardCachePrefix: 'cmu_dash_cache_',
        sidebarVisible: 'chud_side_visible_parts',
        nativeModelVis: 'cmu_native_model_vis_v1',
        nativeModelSeen: 'cmu_native_model_seen_v1',
        outputModelHidden: 'cmu_output_model_hidden_v1',
        outputModelSeen: 'cmu_output_model_seen_v1',
        modelMeta: 'cmu_model_meta_v1',
    };
    const DEFAULTS = {
        enabled: true,
        autoHideHeader: true,
        emptySendGuard: true,
        hideEndingHint: true,
        wideView: true,
        fontScale: 100,
        imageScale: 100,
        pauseAnimatedThumbs: false,
        fullscreenButton: false,
        composerExpandButton: true,
        inputCharacterCounter: true,
        draftAutoSave: true,
        mobileLeftMenuButton: false,
        mobileRightMenuButton: false,
        mobileMenuSwipeZone: true,
        hideStatBar: false,
        messageLongPressMenu: true,
        messageLongPressEdit: true,
        messageLongPressDelete: true,
        messageLongPressBranch: true,
        messageLongPressCopy: true,
        messageLongPressSelectCopy: true,
        themeSkin: true,
        themeDialogue: true,
        themeThought: true,
        themeItalic: true,
        themeStrong: true,
        themeCode: true,
        themeMarkdown: true,
        radiosonde: true,
        radiosondeLatency: true,
        dashboard: true,
        dashboardSidebar: true,
        badgeChars: true,
        badgeTime: true,
        modelIcon: true,
        answerCost: true,
        nativeModelFilter: false,
        outputModelFilter: true,
        logCapture: false,
        logCaptureTheme: 'gwedo',
        logCaptureWebpQuality: 90,
        logCaptureIncludeImages: true,
        logCaptureIncludeCodeBlocks: true,
        logCaptureRules: [],
        settingsTabLabels: true,
    };
    const LOG_CAPTURE_THEME_META = Object.freeze({
        specsheet: { label: '스펙시트', bg: '#F5F5F1' },
        gwedo: { label: '궤도', bg: '#FAFAF8' },
        simya: { label: '심야', bg: '#161B24' },
        seongjwa: { label: '성좌', bg: '#0E1220' },
        heugyo: { label: '흑요', bg: '#131210' },
    });
    const CMU_EDGE_SYNC_STEPS = Object.freeze([0, 80, 250, 700]);
    const CMU_EDGE_HANDLE_COOLDOWN = Object.freeze({
        left: 360,
        right: 650,
    });
    const CMU_MENU_SWIPE = Object.freeze({
        MIN_DX: 42,
        MAX_DY: 52,
        RATIO: 1.55,
        MAX_MS: 750,
        COOLDOWN_MS: 600,
        TAP_MAX_MOVE: 14,
        TAP_MAX_MS: 650,
        TOP_OFFSET: 36,
        FEEDBACK_MS: 200,
        AXIS_LOCK_PX: 5,
        AXIS_LOCK_RATIO: 1.25,
    });
    let settings = loadSettings();
    let cmuSettingsTab = 'ui';
    let cmuSettingsQuery = '';
    let cmuSettingsSearchOpen = false;
    const CMU_PANEL_ANIM = { closeTimer: 0, pageTimer: 0, indTimer: 0, scrimTimer: 0, snapTimer: 0, onCloseEnd: null, openBound: false };
    let bootObserver = null;
    let observedScope = null;
    let injectTimer = 0;
    let cmuCachedChatInput = null;
    let cmuCachedComposerShell = null;
    let cmuCachedChatInputAt = 0;
    let cmuDomRouterRaf = 0;
    let cmuDomMessageTimer = 0;
    let cmuDomQuoteTimer = 0;
    let cmuDomQuoteRetryTimer = 0;
    const CMU_DOM_PENDING_GROUPS = new Set();
    const CMU_DOM_PENDING_MARKDOWNS = new Set();
    const CMU_DOM_PENDING_QUOTES = new Set();
    const CMU_DOM_ROUTER = {
        composerDirty: false,
        headerDirty: false,
        popupDirty: false,
        themeDirty: false,
        nativeModelDirty: false,
        sideDirty: false,
        statDirty: false,
        fullResume: false,

        messageGroups: new Set(),
        markdownNodes: new Set(),
    };
    const CMU_CHAT_INPUT_CACHE_TTL = 2500;
    const CMU_DOM_WATCH = {
        textObserver: null, textRoots: new Set(), themeObserver: null, themeSignature: '',
        attributeKey: '', ownedRecords: new WeakMap(), nativeModeTimer: 0,
        thumbNodes: new Set(), thumbFull: false, thumbEnabled: null,
        roomPanelMissUntil: 0, roomPanelSearchRoot: null,
    };
    let routeKey = location.href;
    let headerHideTimer = 0;
    const CMU_HEADER_SHELL = {
        element: null,
        paddingTop: '',
        paddingTopPriority: '',
    };
    let dashboardTimer = 0;
    let rsTimer = 0;
    let badgeScanTimer = 0;
    let themeDecorateTimer = 0;
    let cmuLcRuleSaveTimer = 0;
    let cmuExternalThemeProvider = '';
    let cmuExternalThemeCleanupDone = false;
    let lastCmuLeftMenuHandleAt = 0;
    let lastCmuRightMenuHandleAt = 0;
    let lastCmuMenuSwipeAt = 0;
    let cmuMenuSwipePositionRaf = 0;
    let animatedThumbRaf = 0;
    let animatedThumbUrlMap = null;
    let animatedThumbRouteRefreshTimer = 0;
    const animatedThumbStillStatus = new Map();
    const animatedThumbCandidateCache = new Map();
    const animatedThumbErrorBound = new WeakSet();
    const CMU_ANIMATED_THUMB_NO_ATTR = '__cmu_absent__';
    const COMPOSER_EXPAND = {
        input: null,
        target: null,
        expanded: false,
        raf: 0,
        animationRaf: 0,
        restoreTimer: 0,
        collapsedHeight: 0,
        originalScrollTop: 0,
        originalStyles: null,
        resizeObserver: null,
        contentObserver: null,
        buttonHost: null,
        buttonHostPosition: null,
    };
    const CMU_INPUT_COUNTER = {
        limit: 2000,
        yellowStart: 1400,
        orangeStart: 1750,
        hotStart: 1900,
        editor: null,
        editorObserver: null,
        editorHandlers: null,
        updateFrame: 0,
        delayedTimer: 0,
        alertTimer: 0,
        previousCount: null,
        renderedElement: null,
        host: null,
        hostPosition: null,
        hostPaddingTop: null,
        resizeObserver: null,
        disposed: false,
    };
    let cachedCmuMobileChatListToggle = null;
    let cachedCmuRoomMenuToggle = null;
    let cachedCmuRoomPanel = null;
    let cmuRoomPanelStateObserver = null;
    let cmuRoomPanelObservedRoot = null;
    let cmuRoomPanelStateTimers = [];
    let cmuLogCaptureLibPromise = null;
    const LOG_CAPTURE = {
        active: false,
        previewOpen: false,
        rendering: false,
        selectedIds: [],
        selectedModels: new Map(),
        selectionSeq: 0,
        previewState: null,
        undoStack: [],
        clickHandler: null,
        output: null,
        outputMode: false,
        outputReturnScroll: 0,
        barRetireTimer: 0,
    };
    const CMU_PANEL_INPUT = {
        press: null,
        fallbackTimer: 0,
        lastActionAt: 0,
        lastActionSig: '',
    };
    const CMU_USER_NOTE_STATE = {
        open: false,
        settleTimer: 0,
        observer: null,
        watchInstalled: false,
    };
    const CMU_GESTURE_HUB = {
        controller: null,
        generation: 0,
        suspended: false,
        installers: new Map(),
    };
    function cmuGestureListen(signal, target, type, listener, options = false) {
        if (!target?.addEventListener || typeof listener !== 'function')
            return;
        const capture = typeof options === 'boolean' ? options : !!options?.capture;
        const nativeOptions = typeof options === 'boolean'
            ? { capture, signal }
            : { ...(options || {}), signal };
        try {
            target.addEventListener(type, listener, nativeOptions);
        }
        catch (_) {
            target.addEventListener(type, listener, options);
        }
        try {
            signal?.addEventListener?.('abort', () => {
                try {
                    target.removeEventListener(type, listener, capture);
                }
                catch (_) { }
            }, { once: true });
        }
        catch (_) { }
    }
    function cmuInstallGestureRecord(record) {
        const controller = CMU_GESTURE_HUB.controller;
        if (!controller || controller.signal.aborted || CMU_GESTURE_HUB.suspended)
            return;
        if (record.generation === CMU_GESTURE_HUB.generation)
            return;
        record.generation = CMU_GESTURE_HUB.generation;
        try {
            record.install(controller.signal);
        }
        catch (error) {
            try {
                console.warn('[CMU] gesture install failed', record.name, error);
            }
            catch (_) { }
        }
    }
    function cmuRegisterGlobalGesture(name, install) {
        if (!name || typeof install !== 'function')
            return;
        let record = CMU_GESTURE_HUB.installers.get(name);
        if (!record) {
            record = { name, install, generation: 0 };
            CMU_GESTURE_HUB.installers.set(name, record);
        }
        else {
            record.install = install;
        }
        cmuInstallGestureRecord(record);
    }
    function cmuResumeGlobalGestures(reason = 'resume') {
        if (!shouldRun())
            return false;
        if (cmuUserNoteGuardActive()) {
            CMU_GESTURE_HUB.suspended = true;
            return false;
        }
        CMU_GESTURE_HUB.suspended = false;
        if (!CMU_GESTURE_HUB.controller || CMU_GESTURE_HUB.controller.signal.aborted) {
            CMU_GESTURE_HUB.controller = new AbortController();
            CMU_GESTURE_HUB.generation += 1;
        }
        CMU_GESTURE_HUB.installers.forEach(cmuInstallGestureRecord);
        return true;
    }
    function cmuSuspendGlobalGestures(reason = 'suspend') {
        CMU_GESTURE_HUB.suspended = true;
        try {
            CMU_GESTURE_HUB.controller?.abort?.(reason);
        }
        catch (_) { }
        CMU_GESTURE_HUB.controller = null;
        try {
            cmuMessageActionsClearGesture?.();
        }
        catch (_) { }
        return true;
    }
    function log(...args) {
        try {
            console.info(LOG, ...args);
        }
        catch (_) { }
    }
    function addStyle(css) {
        if (!shouldRun())
            return;
        if (typeof GM_addStyle === 'function') {
            const style = GM_addStyle(css);
            if (style?.remove)
                CMU_RESOURCES.styles.add(style);
            return;
        }
        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
        CMU_RESOURCES.styles.add(style);
    }
    function readLS(key, fallback = null) {
        try {
            const v = localStorage.getItem(key);
            return v == null ? fallback : v;
        }
        catch (_) {
            return fallback;
        }
    }
    function normalizeLogCaptureRules(value) {
        let source = value;
        if (typeof source === 'string') {
            source = source.split(/\r?\n/).map(row => {
                const trimmed = row.trim();
                if (!trimmed)
                    return null;
                const match = trimmed.match(/^(.*?)\s*(?:=>|->|→)\s*(.*)$/);
                if (!match)
                    return { from: trimmed, to: '' };
                return { from: String(match[1] || '').trim(), to: String(match[2] || '') };
            }).filter(Boolean);
        }
        if (!Array.isArray(source))
            return [];
        return source.slice(0, 60).map(item => {
            if (typeof item === 'string')
                return { from: item, to: '' };
            if (!item || typeof item !== 'object')
                return null;
            return {
                from: String(item.from ?? item.find ?? item.source ?? ''),
                to: String(item.to ?? item.replace ?? item.target ?? ''),
            };
        }).filter(Boolean);
    }
    function getLogCaptureThemeOptionsHtml(selected = 'gwedo') {
        const current = normalizeLogCaptureTheme(selected);
        return Object.entries(LOG_CAPTURE_THEME_META)
            .map(([key, meta]) => `<option value="${escapeHtml(key)}"${key === current ? ' selected' : ''}>${escapeHtml(meta.label)}</option>`)
            .join('');
    }
    function normalizeCmuSettings(raw = {}) {
        const source = raw && typeof raw === 'object' ? raw : {};
        const merged = { ...DEFAULTS, ...source };
        let captureRules = normalizeLogCaptureRules(source.logCaptureRules ?? merged.logCaptureRules);
        if (!captureRules.some(rule => String(rule.from || '').trim() || String(rule.to || '').trim())) {
            const migrated = [];
            String(source.logCaptureRulesRemove || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean).forEach(from => migrated.push({ from, to: '' }));
            normalizeLogCaptureRules(source.logCaptureRulesReplace || '').forEach(rule => migrated.push(rule));
            captureRules = migrated;
        }
        merged.logCaptureRules = captureRules;
        Reflect.deleteProperty(merged, 'logCaptureRulesRemove');
        Reflect.deleteProperty(merged, 'logCaptureRulesReplace');
        Reflect.deleteProperty(merged, 'logCaptureFontScale');
        Reflect.deleteProperty(merged, 'logCaptureSpeakerMode');
        Reflect.deleteProperty(merged, 'logCaptureUserStyle');
        Reflect.deleteProperty(merged, 'logCaptureMergeSpeaker');
        Reflect.deleteProperty(merged, 'logCaptureShowUserMessages');
        Reflect.deleteProperty(merged, 'logCaptureShowUserName');
        Reflect.deleteProperty(merged, 'logCaptureFormat');
        Reflect.deleteProperty(merged, 'logCaptureAutoSplit');
        const oldCaptureTheme = String(source.logCaptureTheme || merged.logCaptureTheme || '').trim();
        const captureThemeAliases = {
            yeobaek: 'gwedo',
            baekjimeok: 'heugyo',
            wongo: 'specsheet',
            cheongram: 'gwedo',
            cheongin: 'gwedo',
            yeonji: 'seongjwa',
            minimalLight: 'gwedo',
            minimalDark: 'heugyo',
            silentfilm: 'heugyo',
            tajeon: 'specsheet',
            paper: 'heugyo',
        };
        merged.logCaptureTheme = Object.prototype.hasOwnProperty.call(LOG_CAPTURE_THEME_META, oldCaptureTheme)
            ? oldCaptureTheme
            : (captureThemeAliases[oldCaptureTheme] || 'gwedo');
        Reflect.deleteProperty(merged, 'themeStyle');
        return merged;
    }
    function readSettingsFromKey(key) {
        try {
            const parsed = JSON.parse(localStorage.getItem(key) || '{}');
            return parsed && typeof parsed === 'object' ? parsed : {};
        }
        catch (_) {
            return {};
        }
    }
    function loadSettings() {
        const primary = readSettingsFromKey(LS.settings);
        if (Object.keys(primary).length)
            return normalizeCmuSettings(primary);
        const backup = readSettingsFromKey(LS.settingsBackup);
        if (Object.keys(backup).length)
            return normalizeCmuSettings(backup);
        return normalizeCmuSettings({});
    }
    function saveSettings() {
        try {
            const normalized = normalizeCmuSettings(settings);
            settings = normalized;
            const serialized = JSON.stringify(normalized);
            localStorage.setItem(LS.settings, serialized);
            localStorage.setItem(LS.settingsBackup, serialized);
        }
        catch (err) {
            try {
                console.warn(`${LOG} settings save failed`, err);
            }
            catch (_) { }
        }
    }
    const API_KEY_FIELDS = [
        { key: 'gemini', label: 'Gemini API' },
        { key: 'firebase', label: 'Firebase' },
        { key: 'deepseek', label: 'DeepSeek' },
    ];
    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"]/g, ch => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
        }[ch] || ch));
    }
    function loadApiKeys() {
        try {
            const parsed = JSON.parse(localStorage.getItem(LS.apiKeys) || '{}');
            return parsed && typeof parsed === 'object' ? parsed : {};
        }
        catch (_) {
            return {};
        }
    }
    function saveApiKey(provider, value) {
        if (!provider)
            return;
        const keys = loadApiKeys();
        keys[provider] = String(value ?? '');
        try {
            localStorage.setItem(LS.apiKeys, JSON.stringify(keys));
        }
        catch (_) { }
    }
    function getApiKeyValue(provider) {
        const keys = loadApiKeys();
        return String(keys?.[provider] ?? '');
    }
    async function copyTextToClipboard(text) {
        const value = String(text ?? '');
        if (!value)
            return false;
        try {
            if (navigator.clipboard?.writeText && window.isSecureContext) {
                await navigator.clipboard.writeText(value);
                return true;
            }
        }
        catch (_) { }
        try {
            const ta = document.createElement('textarea');
            ta.value = value;
            ta.setAttribute('readonly', 'readonly');
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            ta.style.top = '0';
            document.body.appendChild(ta);
            ta.focus();
            ta.select();
            const ok = document.execCommand('copy');
            ta.remove();
            return !!ok;
        }
        catch (_) {
            return false;
        }
    }
    function clamp(n, min, max) {
        n = Number(n);
        if (!Number.isFinite(n))
            return min;
        return Math.max(min, Math.min(max, n));
    }
    function setAttrIfMissing(el, name, value = '') {
        if (!(el instanceof HTMLElement))
            return;
        if (el.getAttribute(name) !== value)
            el.setAttribute(name, value);
    }
    function isMobileLike() {
        try {
            return window.matchMedia('(max-width: 768px), (pointer: coarse)').matches;
        }
        catch (_) {
            return window.innerWidth <= 768;
        }
    }
    function shouldRun() {
        return !CMU_RUNTIME.disposed;
    }
    function isEpisodePath() {
        return /^\/stories\/[^/?#]+\/episodes\/[^/?#]+/.test(location.pathname || '');
    }
    function isChatRoomPath() {
        const path = location.pathname || '';
        return /\/stories\/[^/?#]+\/episodes\/[^/?#]+/.test(path) || /\/episodes\/[^/?#]+/.test(path) || /\/chats?\/[^/?#]+/.test(path);
    }
    function getChatIdFromPath(path = '') {
        const clean = String(path || '').split(/[?#]/)[0];
        const patterns = [
            /\/stories\/[^/?#]+\/episodes\/([^/?#]+)/,
            /\/episodes\/([^/?#]+)/,
            /\/chats?\/([^/?#]+)/,
        ];
        for (const p of patterns) {
            const m = clean.match(p);
            if (m)
                return decodeURIComponent(m[1]);
        }
        return null;
    }
    function getChatId() {
        return getChatIdFromPath(location.pathname || '');
    }
    function getCookie(name) {
        const escaped = String(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const m = document.cookie.match(new RegExp('(?:^|; )' + escaped + '=([^;]*)'));
        return m ? decodeURIComponent(m[1]) : null;
    }
    function cmuCostCollectionWanted() {
        return shouldRun() && isChatRoomPath() && !!(settings.answerCost || settings.dashboard);
    }

    function cmuHistoryConfidence(record, job) {
        const room = String(record?.chatId || record?.chat_id || record?.metadata?.chatId || '');
        const message = String(record?.messageId || record?.message_id || record?.metadata?.messageId || '');
        if ((room && room !== job.chatId) || (message && message !== job.messageId)) return 'reject';
        return message && message === job.messageId ? 'confirmed' : 'estimated';
    }
    function apiHeaders() {
        const headers = {
            accept: 'application/json, text/plain, */*',
            'Content-Type': 'application/json',
            platform: 'web',
            'wrtn-locale': 'ko-KR',
        };
        const token = getCookie('access_token');
        if (token)
            headers.authorization = `Bearer ${token}`;
        const wrtnId = getCookie('__w_id');
        if (wrtnId)
            headers['x-wrtn-id'] = wrtnId;
        const mixpanelId = getCookie('Mixpanel-Distinct-Id');
        if (mixpanelId)
            headers['mixpanel-distinct-id'] = mixpanelId;
        return headers;
    }
    const CMU_API_TIMEOUT_MS = 18000;
    const CMU_API_INFLIGHT = new Map();
    // Shared data and observation services. No page polling or extra sockets.
    const CMU_SHARED = {
        rooms: new Map(), roomRequests: new Map(), composers: new Map(),
        resizeTargets: new Map(), resizeObserver: null,
    };
    function cmuRoomData(chatId) {
        let room = CMU_SHARED.rooms.get(chatId);
        if (!room) {
            room = { revision: 0, messages: new Map(), pages: new Map(), firstAt: 0, first: null, inflight: new Map() };
            CMU_SHARED.rooms.set(chatId, room);
        }
        CMU_SHARED.rooms.delete(chatId);
        CMU_SHARED.rooms.set(chatId, room);
        while (CMU_SHARED.rooms.size > 3)
            CMU_SHARED.rooms.delete(CMU_SHARED.rooms.keys().next().value);
        return room;
    }
    function cmuAssertPayload(json) {
        if (!json || typeof json !== 'object' || json.success === false ||
            (json.result !== undefined && json.result !== 'SUCCESS'))
            throw new Error('Unsuccessful API payload');
        return json;
    }
    function cmuRememberMessages(chatId, rows) {
        const room = cmuRoomData(chatId);
        for (const msg of rows || []) {
            const id = messageIdOf(msg);
            if (!id || (msg.chatId && String(msg.chatId) !== chatId)) continue;
            const previous = room.messages.get(id);
            room.messages.delete(id);
            room.messages.set(id, { ...previous, ...msg });
        }
        // Keep raw message text bounded independently of the site's growing DOM.
        while (room.messages.size > 1200)
            room.messages.delete(room.messages.keys().next().value);
        if (getChatId() === chatId) BADGE.apiCache = null;
        return room;
    }
    function cmuMessageChanged(chatId, messageId, message, deleted = false) {
        const room = cmuRoomData(chatId);
        room.revision++;
        room.pages.clear(); room.firstAt = 0; room.first = null;
        if (deleted) room.messages.delete(messageId);
        else if (message) cmuRememberMessages(chatId, [{ ...message, _id: messageId, chatId }]);
        else room.messages.delete(messageId);
        if (getChatId() !== chatId) return;
        const affected = new Set([messageId]);
        for (const [key, resolved] of BADGE.resultCache) {
            if (key.split(':')[0] === messageId || resolved?.messageId === messageId) {
                affected.add(key.split(':')[0]);
                BADGE.resultCache.delete(key);
            }
        }
        BADGE.missCache.delete(messageId);
        BADGE.apiCache = null;
        BADGE.apiPromise = null;
        BADGE.forcePromise = null;
        BADGE.generation = (BADGE.generation || 0) + 1;
        for (const id of affected) {
            if (!isObjectId(id)) continue;
            const group = document.querySelector(`[data-message-group-id="${id}"]`);
            if (group) { cmuRouterAddGroup(group); scheduleCmuDomRouterFlush(); }
        }
    }
    function cmuMessageRequest(method, value) {
        try {
            const url = new URL(String(value || ''), location.href);
            if (!['crack-api.wrtn.ai', 'contents-api.wrtn.ai'].includes(url.hostname)) return null;
            const match = url.pathname.match(/^\/(?:crack-gen|character-chat)\/v3\/chats\/([^/]+)\/messages(?:\/([^/]+))?\/?$/);
            if (!match) return null;
            method = String(method || 'GET').toUpperCase();
            if (!['GET', 'PATCH', 'DELETE'].includes(method)) return null;
            return { method, chatId: decodeURIComponent(match[1]), messageId: match[2] ? decodeURIComponent(match[2]) : '',
                cursor: url.searchParams.get('cursor') || '', limit: Number(url.searchParams.get('limit') || 20) };
        } catch (_) { return null; }
    }
    function cmuObserveMessageResponse(meta, json, body, revision) {
        if (!shouldRun() || !meta) return;
        cmuAssertPayload(json);
        if (meta.method === 'GET') {
            if (!Array.isArray(json.data?.messages) || cmuRoomData(meta.chatId).revision !== revision) return;
            cmuRememberMessages(meta.chatId, json.data.messages);
            // Render only newly available visible groups; no full badge pass.
            if (getChatId() === meta.chatId) {
                BADGE.apiCache = null;
                for (const msg of json.data.messages) {
                    const id = messageIdOf(msg);
                    if (!isObjectId(id)) continue;
                    BADGE.missCache.delete(id);
                    for (const key of BADGE.resultCache.keys())
                        if (key.split(':')[0] === id) BADGE.resultCache.delete(key);
                    const group = document.querySelector(`[data-message-group-id="${id}"]`);
                    if (group) cmuRouterAddGroup(group);
                }
                scheduleCmuDomRouterFlush();
            }
        } else if (meta.messageId) {
            if (meta.method === 'DELETE') {
                cmuMessageChanged(meta.chatId, meta.messageId, null, true);
                cmiRecordSuccessfulDeletion(meta.chatId, meta.messageId);
            } else {
                let request = null;
                try { request = typeof body === 'string' ? JSON.parse(body) : body; } catch (_) { }
                const data = json.data?.message || json.data;
                const msg = data && typeof data === 'object' && typeof data.content === 'string' ? data
                    : typeof request?.message === 'string' ? { content: request.message } : null;
                cmuMessageChanged(meta.chatId, meta.messageId, msg);
            }
        }
    }
    function cmuAbortOtherRooms() {
        const chatId = getChatId();
        for (const [controller, owner] of CMU_SHARED.roomRequests)
            if (owner !== chatId) controller.abort();
    }
    async function cmuSharedMessagePage(chatId, cursor = '', force = false) {
        if (!shouldRun() || getChatId() !== chatId) throw new Error('Room changed');
        const room = cmuRoomData(chatId);
        const revision = room.revision;
        const key = `${revision}:${cursor}`;
        const cached = room.pages.get(cursor);
        if (!force && cached && Date.now() - cached.at < (cursor ? 60000 : 1600)) return cached.page;
        if (room.inflight.has(key)) return room.inflight.get(key);
        const task = (async () => {
            const url = `https://crack-api.wrtn.ai/crack-gen/v3/chats/${encodeURIComponent(chatId)}/messages?limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
            // This layer deduplicates by revision; URL-only reuse could return a pre-edit response.
            const json = cmuAssertPayload(await apiGet(url, { roomId: chatId, dedupe: false }));
            if (!shouldRun() || getChatId() !== chatId) throw new Error('Room changed');
            if (room.revision !== revision) throw new Error('Message changed during request');
            if (!Array.isArray(json.data?.messages)) throw new Error('Invalid message page');
            const page = { arr: json.data.messages, cursor: json.data.nextCursor || '', hasNext: json.data.hasNext === true };
            cmuRememberMessages(chatId, page.arr);
            room.pages.set(cursor, { at: Date.now(), page });
            while (room.pages.size > 4) room.pages.delete(room.pages.keys().next().value);
            if (!cursor) { room.first = page; room.firstAt = Date.now(); }
            return page;
        })();
        room.inflight.set(key, task);
        try { return await task; }
        finally { if (room.inflight.get(key) === task) room.inflight.delete(key); }
    }
    function cmuComposerSubscribe(editor, listener) {
        if (!(editor instanceof HTMLElement)) return { disconnect() {} };
        let entry = CMU_SHARED.composers.get(editor);
        if (!entry) {
            entry = { listeners: new Set(), observer: null, notify: null };
            entry.notify = () => {
                for (const fn of [...entry.listeners]) {
                    try { fn(); } catch (error) { console.debug(LOG, 'composer subscriber', error); }
                }
            };
            entry.observer = new MutationObserver(entry.notify);
            entry.observer.observe(editor, { childList: true, subtree: true, characterData: true });
            for (const name of ['input', 'compositionend', 'focusin']) editor.addEventListener(name, entry.notify, true);
            CMU_SHARED.composers.set(editor, entry);
        }
        entry.listeners.add(listener);
        return { disconnect() {
            entry.listeners.delete(listener);
            if (entry.listeners.size) return;
            entry.observer.disconnect();
            for (const name of ['input', 'compositionend', 'focusin']) editor.removeEventListener(name, entry.notify, true);
            CMU_SHARED.composers.delete(editor);
        } };
    }
    async function cmuEnsureMessage(chatId, messageId) {
        const room = cmuRoomData(chatId);
        if (room.messages.has(messageId)) return room.messages.get(messageId);
        const cursors = new Set();
        let cursor = '';
        for (let page = 0; page < 120; page++) {
            if (!shouldRun() || getChatId() !== chatId) throw new Error('Room changed');
            const result = await cmuSharedMessagePage(chatId, cursor);
            if (room.messages.has(messageId)) return room.messages.get(messageId);
            if (!result.cursor || cursors.has(result.cursor)) break;
            cursors.add(result.cursor); cursor = result.cursor;
        }
        return null;
    }
    function cmuSharedResizeClient(callback) {
        if (!CMU_SHARED.resizeObserver) {
            CMU_SHARED.resizeObserver = new ResizeObserver(entries => {
                const callbacks = new Set();
                for (const entry of entries)
                    CMU_SHARED.resizeTargets.get(entry.target)?.forEach(fn => callbacks.add(fn));
                callbacks.forEach(fn => fn());
            });
        }
        const owned = new Set();
        const client = {
            observe(target) {
                if (owned.has(target)) return;
                owned.add(target);
                let clients = CMU_SHARED.resizeTargets.get(target);
                if (!clients) { clients = new Set(); CMU_SHARED.resizeTargets.set(target, clients); CMU_SHARED.resizeObserver.observe(target); }
                clients.add(callback);
            },
            unobserve(target) {
                owned.delete(target);
                const clients = CMU_SHARED.resizeTargets.get(target);
                clients?.delete(callback);
                if (clients && !clients.size) { CMU_SHARED.resizeTargets.delete(target); CMU_SHARED.resizeObserver.unobserve(target); }
            },
            disconnect() { for (const target of [...owned]) client.unobserve(target); },
        };
        return client;
    }
    function cmuDisposeShared() {
        for (const [editor, entry] of CMU_SHARED.composers) {
            entry.observer.disconnect();
            for (const name of ['input', 'compositionend', 'focusin']) editor.removeEventListener(name, entry.notify, true);
        }
        CMU_SHARED.composers.clear(); CMU_SHARED.resizeObserver?.disconnect();
        CMU_SHARED.resizeTargets.clear(); CMU_SHARED.rooms.clear();
        CMU_SHARED.roomRequests.forEach((_, controller) => controller.abort());
        CMU_SHARED.roomRequests.clear();
    }

    async function apiGet(url, { timeoutMs = CMU_API_TIMEOUT_MS, dedupe = true, roomId = null } = {}) {
        if (!shouldRun())
            throw new Error('runtime disposed');
        const requestUrl = String(url || '');
        const requestKey = `GET:${requestUrl}`;
        if (dedupe && CMU_API_INFLIGHT.has(requestKey))
            return CMU_API_INFLIGHT.get(requestKey);
        const task = (async () => {
            const controller = typeof AbortController === 'function' ? new AbortController() : null;
            if (controller)
                CMU_RESOURCES.controllers.add(controller);
            if (controller && roomId) CMU_SHARED.roomRequests.set(controller, roomId);
            const timeoutId = controller && timeoutMs > 0
                ? setTimeout(() => controller.abort(), timeoutMs)
                : 0;
            try {
                const res = await fetch(requestUrl, {
                    method: 'GET',
                    credentials: 'include',
                    headers: apiHeaders(),
                    signal: controller?.signal,
                });
                if (!res.ok)
                    throw new Error(`HTTP ${res.status}`);
                return cmuAssertPayload(await res.json());
            }
            catch (error) {
                if (error?.name === 'AbortError')
                    throw new Error(roomId && getChatId() !== roomId ? 'Room changed' : `timeout after ${timeoutMs}ms`);
                throw error;
            }
            finally {
                CMU_RESOURCES.controllers.delete(controller);
                CMU_SHARED.roomRequests.delete(controller);
                if (timeoutId)
                    clearTimeout(timeoutId);
            }
        })();
        if (dedupe)
            CMU_API_INFLIGHT.set(requestKey, task);
        try {
            return await task;
        }
        finally {
            if (dedupe && CMU_API_INFLIGHT.get(requestKey) === task)
                CMU_API_INFLIGHT.delete(requestKey);
        }
    }
    function messageIdOf(msg) {
        return String(msg?._id || msg?.id || msg?.messageId || msg?.messageID || msg?.uuid || '');
    }
    function gmGetJson(url, timeoutMs = 15000) {
        if (!shouldRun())
            return Promise.reject(new Error('runtime disposed'));
        return new Promise((resolve, reject) => {
            if (typeof GM_xmlhttpRequest !== 'function') {
                fetch(url, { headers: { accept: 'application/json' } })
                    .then(res => {
                    if (!res.ok)
                        throw new Error(`HTTP ${res.status}`);
                    return res.json();
                })
                    .then(resolve, reject);
                return;
            }
            GM_xmlhttpRequest({
                method: 'GET',
                url,
                timeout: timeoutMs,
                headers: { Accept: 'application/json' },
                onload: (res) => {
                    const status = Number(res.status) || 0;
                    if (status && (status < 200 || status >= 300)) {
                        reject(new Error(`HTTP ${status}`));
                        return;
                    }
                    try {
                        resolve(JSON.parse(res.responseText));
                    }
                    catch (err) {
                        reject(err);
                    }
                },
                onerror: () => reject(new Error('network error')),
                ontimeout: () => reject(new Error('timeout')),
            });
        });
    }
    function gmGetRsJson(url, timeoutMs = 10000) {
        if (!shouldRun())
            return Promise.reject(new Error('runtime disposed'));
        return new Promise((resolve, reject) => {
            const requestUrl = String(url || '');
            const parsePayload = (raw, fallback) => {
                if (fallback && typeof fallback === 'object')
                    return fallback;
                if (typeof raw !== 'string' || !raw.trim())
                    throw new Error('empty response');
                return JSON.parse(raw);
            };
            if (typeof GM_xmlhttpRequest !== 'function') {
                fetch(requestUrl, {
                    method: 'GET',
                    cache: 'no-store',
                    headers: { accept: 'application/json' },
                }).then(async res => {
                    if (!res.ok)
                        throw new Error(`HTTP ${res.status} @ ${res.url || requestUrl}`);
                    return await res.json();
                }).then(resolve, reject);
                return;
            }
            GM_xmlhttpRequest({
                method: 'GET',
                url: requestUrl,
                timeout: timeoutMs,
                anonymous: true,
                headers: {
                    Accept: 'application/json',
                    'Cache-Control': 'no-cache',
                    Pragma: 'no-cache',
                },
                onload: (res) => {
                    const status = Number(res.status) || 0;
                    const finalUrl = String(res.finalUrl || requestUrl);
                    if (status && (status < 200 || status >= 300)) {
                        reject(new Error(`HTTP ${status} @ ${finalUrl}`));
                        return;
                    }
                    try {
                        resolve(parsePayload(res.responseText, res.response));
                    }
                    catch (err) {
                        reject(new Error(`JSON parse failed @ ${finalUrl}: ${err?.message || err}`));
                    }
                },
                onerror: (res) => {
                    const status = Number(res?.status) || 0;
                    const finalUrl = String(res?.finalUrl || requestUrl);
                    reject(new Error(`network error${status ? ` ${status}` : ''} @ ${finalUrl}`));
                },
                ontimeout: (res) => {
                    const finalUrl = String(res?.finalUrl || requestUrl);
                    reject(new Error(`timeout @ ${finalUrl}`));
                },
            });
        });
    }
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    addStyle(`
    html.cmu-enabled {
      --cmu-font-scale: ${settings.fontScale / 100};
      --cmu-image-scale: ${settings.imageScale}%;
    }

    #${ID.topZone} {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 16px;
      z-index: 2147482997;
      pointer-events: none;
      background: transparent;
    }

    html.cmu-enabled.cmu-auto-hide #${ID.topZone} {
      pointer-events: auto;
    }

    #${ID.topHandle} { display: none; }

    @media (max-width: 767px), (hover: none), (pointer: coarse) {
      #${ID.topZone} {
        height: 30px;
        pointer-events: none !important;
      }

      html.cmu-enabled.cmu-auto-hide #${ID.topZone} {
        pointer-events: none !important;
      }

      html.cmu-enabled.cmu-auto-hide #${ID.topHandle} {
        display: block;
        position: absolute;
        top: max(4px, env(safe-area-inset-top));
        left: 50%;
        width: 52px;
        height: 18px;
        transform: translateX(-50%);
        pointer-events: auto !important;
        z-index: 2147483000;
        touch-action: none;
        -webkit-tap-highlight-color: transparent;
      }

      html.cmu-enabled.cmu-auto-hide #${ID.topHandle}::after {
        content: "";
        position: absolute;
        top: 7px;
        left: 50%;
        width: 36px;
        height: 4px;
        border-radius: 999px;
        background: rgba(255, 255, 255, .28);
        box-shadow: 0 1px 6px rgba(0, 0, 0, .22);
        transform: translateX(-50%);
      }

      html.cmu-enabled.cmu-auto-hide.cmu-header-reveal #${ID.topHandle},
      html.cmu-enabled.cmu-panel-open #${ID.topHandle} {
        pointer-events: none !important;
      }

      html.cmu-enabled.cmu-auto-hide.cmu-header-reveal #${ID.topHandle}::after,
      html.cmu-enabled.cmu-panel-open #${ID.topHandle}::after {
        opacity: 0;
      }
    }

    html.cmu-enabled.cmu-auto-hide [data-cmu-global-header="1"] {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      width: 100% !important;
      z-index: 2147482998 !important;
      transform: translateY(-112%) !important;
      transition: transform 180ms cubic-bezier(.2,.8,.2,1), box-shadow 180ms ease !important;
      will-change: transform !important;
    }

    /* 글로벌 56px 헤더의 실제 레이아웃 예약 공간.
       헤더 자체만 fixed/transform 하면 부모의 pt-[56px]가 남으므로 정확한 부모만 접는다. */
    html.cmu-enabled.cmu-auto-hide [data-cmu-global-header-shell="1"] {
      padding-top: 0 !important;
    }

    html.cmu-enabled.cmu-auto-hide.cmu-header-reveal [data-cmu-global-header="1"],
    html.cmu-enabled.cmu-panel-open [data-cmu-global-header="1"] {
      transform: translateY(0) !important;
      box-shadow: 0 12px 34px rgba(0,0,0,.24) !important;
    }

    html.cmu-enabled.cmu-auto-hide body {
      padding-top: 0 !important;
      margin-top: 0 !important;
    }

    html.cmu-enabled.cmu-auto-hide body div[height="100dvh"],
    html.cmu-enabled.cmu-auto-hide body div[height="100%"] {
      padding-top: 0 !important;
      margin-top: 0 !important;
    }

    html.cmu-enabled.cmu-auto-hide body [class*="pt-[56px]"],
    html.cmu-enabled.cmu-auto-hide body [class*="pt-[88px]"],
    html.cmu-enabled.cmu-auto-hide body [class*="pt-[120px]"],
    html.cmu-enabled.cmu-auto-hide body [class*="md:pt-[56px]"],
    html.cmu-enabled.cmu-auto-hide body [class*="h-[100dvh]"][class*="pt-[56px]"],
    html.cmu-enabled.cmu-auto-hide body [class*="min-h-[100dvh]"][class*="pt-[56px]"],
    html.cmu-enabled.cmu-auto-hide body [class*="h-[100dvh]"][class*="pt-[120px]"],
    html.cmu-enabled.cmu-auto-hide body [class*="min-h-[100dvh]"][class*="pt-[120px]"],
    html.cmu-enabled.cmu-auto-hide body .pt-\[88px\] {
      padding-top: 0 !important;
    }

    html.cmu-enabled.cmu-auto-hide body [class*="bg-bg_screen"][class*="h-[100dvh]"],
    html.cmu-enabled.cmu-auto-hide body [class*="bg-bg_screen"][class*="min-h-[100dvh]"] {
      padding-top: 0 !important;
    }

    html.cmu-enabled.cmu-auto-hide.cmu-phone-viewport [data-radix-popper-content-wrapper] [role="dialog"][data-state="open"].md\:hidden:has([role="tablist"]),
    html.cmu-enabled.cmu-auto-hide.cmu-phone-viewport [data-radix-popper-content-wrapper] [role="dialog"][data-state="open"].md\:hidden:has([data-testid="virtuoso-scroller"]),
    html.cmu-enabled.cmu-auto-hide.cmu-phone-viewport [data-radix-popper-content-wrapper] [role="dialog"][data-state="open"].md\:hidden:has([data-virtuoso-scroller="true"]) {
      height: 100dvh !important;
      max-height: 100dvh !important;
    }

    html.cmu-enabled.cmu-auto-hide body .css-swctim {
      flex-grow: 1 !important;
    }

    html.cmu-enabled.cmu-hide-ending button[aria-label="엔딩 힌트"],
    html.cmu-enabled.cmu-hide-ending span.absolute.top-0.right-0.size-2.rounded-full.bg-surface_brand_primary {
      display: none !important;
    }

    html.cmu-enabled.cmu-wide div[class*="bottom-0"]:not([role="dialog"]):not([aria-modal="true"]) > div,
    html.cmu-enabled.cmu-wide main div[class*="max-w-[768px]"],
    html.cmu-enabled.cmu-wide main div[class*="max-w-screen-md"],
    html.cmu-enabled.cmu-wide main div[class*="max-w-3xl"],
    html.cmu-enabled.cmu-wide main div[class*="max-w-4xl"],
    html.cmu-enabled.cmu-wide main div[class*="max-w-5xl"] {
      max-width: 95vw !important;
      width: 100% !important;
      margin-left: auto !important;
      margin-right: auto !important;
    }

    html.cmu-enabled.cmu-wide [data-cmu-wide-box="1"] {
      max-width: 95vw !important;
      width: 100% !important;
      margin-left: auto !important;
      margin-right: auto !important;
    }

    html.cmu-enabled.cmu-wide main div[class*="px-5"],
    html.cmu-enabled.cmu-wide main div[class*="sm:px-10"] {
      padding-left: 2vw !important;
      padding-right: 2vw !important;
    }

    html.cmu-enabled.cmu-wide main div[class*="max-w-[640px]"] {
      max-width: 100% !important;
    }

    html.cmu-enabled .wrtn-markdown img,
    html.cmu-enabled [class*="wrtn-markdown"] img,
    html.cmu-enabled .markdown-body img,
    html.cmu-enabled .prose img {
      max-width: min(800px, var(--cmu-image-scale, 100%)) !important;
      width: var(--cmu-image-scale, 100%) !important;
      height: auto !important;
      margin-left: auto !important;
      margin-right: auto !important;
      display: block !important;
      border-radius: 12px !important;
    }

    html.cmu-enabled main [data-message-group-id] .wrtn-markdown,
    html.cmu-enabled main [data-message-group-id] [class*="wrtn-markdown"],
    html.cmu-enabled main [data-message-group-id] .markdown-body,
    html.cmu-enabled main [data-message-group-id] .prose {
      font-size: calc(1em * var(--cmu-font-scale, 1)) !important;
    }

    html.cmu-enabled main [data-message-group-id] .wrtn-markdown :is(p, li, blockquote, h1, h2, h3, h4, h5, h6):not(:where(pre, pre *, code, .wrtn-codeblock, .wrtn-codeblock *)),
    html.cmu-enabled main [data-message-group-id] [class*="wrtn-markdown"] :is(p, li, blockquote, h1, h2, h3, h4, h5, h6):not(:where(pre, pre *, code, .wrtn-codeblock, .wrtn-codeblock *)),
    html.cmu-enabled main [data-message-group-id] .markdown-body :is(p, li, blockquote, h1, h2, h3, h4, h5, h6):not(:where(pre, pre *, code, .wrtn-codeblock, .wrtn-codeblock *)),
    html.cmu-enabled main [data-message-group-id] .prose :is(p, li, blockquote, h1, h2, h3, h4, h5, h6):not(:where(pre, pre *, code, .wrtn-codeblock, .wrtn-codeblock *)) {
      font-size: inherit !important;
      line-height: inherit !important;
    }

    html.cmu-enabled main [data-message-group-id] .wrtn-markdown :is(p, li, blockquote, h1, h2, h3, h4, h5, h6) :not(:where(pre, pre *, code, code *, .wrtn-codeblock, .wrtn-codeblock *)),
    html.cmu-enabled main [data-message-group-id] [class*="wrtn-markdown"] :is(p, li, blockquote, h1, h2, h3, h4, h5, h6) :not(:where(pre, pre *, code, code *, .wrtn-codeblock, .wrtn-codeblock *)),
    html.cmu-enabled main [data-message-group-id] .markdown-body :is(p, li, blockquote, h1, h2, h3, h4, h5, h6) :not(:where(pre, pre *, code, code *, .wrtn-codeblock, .wrtn-codeblock *)),
    html.cmu-enabled main [data-message-group-id] .prose :is(p, li, blockquote, h1, h2, h3, h4, h5, h6) :not(:where(pre, pre *, code, code *, .wrtn-codeblock, .wrtn-codeblock *)) {
      font-size: inherit !important;
    }

    html.cmu-theme-active {
      --cmu-theme-readable-text: #fafafa;
      --cmu-theme-muted-text: #85837d;
      --cmu-theme-strong-text: #ffffff;
      --cmu-theme-bubble-bg: rgba(24, 23, 28, .72);
      --cmu-theme-bubble-border: rgba(255,255,255,.14);
      --cmu-theme-dialogue-rgb: 185,165,180;
      --cmu-theme-dialogue-text: #fff2f7;
      --cmu-theme-thought-rgb: 172,162,182;
      --cmu-theme-thought-text: #f5eff3;
      --cmu-theme-italic-rgb: 132,132,140;
      --cmu-theme-strong-rgb: 164,164,172;
      --cmu-theme-code-rgb: 190,165,190;
    }
    html.cmu-theme-active[data-cmu-ui-style="borderless"] {
      --cmu-theme-bubble-bg: transparent;
      --cmu-theme-bubble-border: transparent;
    }

    html.cmu-theme-active[data-cmu-chat-borderless-only="1"] {
      --cmu-theme-readable-text: #f2f2f3;
      --cmu-theme-muted-text: #c5c5ca;
      --cmu-theme-strong-text: #ffffff;
      --cmu-theme-dialogue-rgb: 142,142,150;
      --cmu-theme-dialogue-text: #f4f4f5;
      --cmu-theme-thought-rgb: 116,116,124;
      --cmu-theme-thought-text: #e6e6e8;
      --cmu-theme-italic-rgb: 132,132,140;
      --cmu-theme-strong-rgb: 164,164,172;
      --cmu-theme-code-rgb: 122,122,130;
    }

    html.cmu-theme-active[data-cmu-theme="light"] {
      --cmu-theme-readable-text: #30323a;
      --cmu-theme-muted-text: #6d707a;
      --cmu-theme-strong-text: #191a1f;
      --cmu-theme-bubble-bg: rgba(255,255,255,.58);
      --cmu-theme-bubble-border: rgba(0,0,0,.10);
      --cmu-theme-dialogue-rgb: 148,96,121;
      --cmu-theme-dialogue-text: #70475c;
      --cmu-theme-thought-rgb: 104,112,143;
      --cmu-theme-thought-text: #56617e;
      --cmu-theme-italic-rgb: 126,128,138;
      --cmu-theme-strong-rgb: 166,121,143;
      --cmu-theme-code-rgb: 116,108,128;
    }

    html.cmu-theme-active main [data-cmu-theme-message-group] .wrtn-markdown :is(p, li, blockquote, h1, h2, h3, h4, h5, h6):not(:where(pre, pre *, code, code *, [data-cmu-theme-codeblock], [data-cmu-theme-codeblock] *, [data-sgb-codeblock], [data-sgb-codeblock] *, .wrtn-codeblock, .wrtn-codeblock *)) {
      color: var(--cmu-theme-readable-text) !important;
    }
    html.cmu-theme-active main [data-cmu-theme-message-group] .wrtn-markdown :is(em, i):not(:where(pre, pre *, code, code *, [data-cmu-theme-codeblock], [data-cmu-theme-codeblock] *, [data-sgb-codeblock], [data-sgb-codeblock] *, .wrtn-codeblock, .wrtn-codeblock *)) {
      color: var(--cmu-theme-muted-text) !important;
    }
    html.cmu-theme-active main [data-cmu-theme-message-group] .wrtn-markdown :is(strong, b):not(:where(pre, pre *, code, code *, [data-cmu-theme-codeblock], [data-cmu-theme-codeblock] *, [data-sgb-codeblock], [data-sgb-codeblock] *, .wrtn-codeblock, .wrtn-codeblock *)) {
      color: var(--cmu-theme-strong-text) !important;
    }

    html.cmu-theme-active [data-cmu-theme-bubble="chat"] {
      background: var(--cmu-theme-bubble-bg) !important;
      border: 1px solid var(--cmu-theme-bubble-border) !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.06), 0 8px 22px rgba(0,0,0,.12) !important;
    }
    html.cmu-theme-active[data-cmu-ui-style="borderless"] [data-cmu-theme-bubble="chat"] {
      box-shadow: none !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
    }
    html.cmu-theme-active {
      --cmu-novel-sep-box-height: 1px;
      --cmu-novel-sep-bg: linear-gradient(90deg, transparent, rgba(var(--cmu-theme-dialogue-rgb,185,165,180),.36), rgba(var(--cmu-theme-thought-rgb,172,162,182),.24), rgba(var(--cmu-theme-dialogue-rgb,185,165,180),.36), transparent);
      --cmu-novel-sep-border-top: 0;
      --cmu-novel-sep-border-bottom: 0;
      --cmu-novel-sep-shadow: none;
      --cmu-novel-sep-margin: 8px clamp(12px, 2.4vw, 28px);
      --cmu-novel-sep-content: "";
      --cmu-novel-sep-color: rgba(var(--cmu-theme-dialogue-rgb,185,165,180),.68);
      --cmu-novel-sep-font-size: 12px;
      --cmu-novel-sep-letter-spacing: .16em;
      --cmu-novel-sep-text-shadow: none;
      --cmu-novel-sep-font-family: ui-serif, Georgia, 'Times New Roman', serif;
      --cmu-novel-sep-font-weight: 600;
    }
    html.cmu-theme-active[data-cmu-ui-style="borderless"] {
      --cmu-novel-sep-box-height: 1px;
      --cmu-novel-sep-bg: linear-gradient(90deg, transparent, rgba(255,255,255,.08), rgba(var(--cmu-theme-dialogue-rgb,185,165,180),.18), rgba(255,255,255,.08), transparent);
      --cmu-novel-sep-content: "";
      --cmu-novel-sep-shadow: none;
    }
    html.cmu-theme-active[data-cmu-theme="light"][data-cmu-ui-style="borderless"] {
      --cmu-novel-sep-bg: linear-gradient(90deg, transparent, rgba(0,0,0,.07), rgba(var(--cmu-theme-dialogue-rgb,148,96,121),.20), rgba(0,0,0,.07), transparent);
    }


    html.cmu-theme-active main :is([data-cmu-theme-bubble="novel"], [data-sgb-bubble="novel"]),
    html.cmu-theme-active main :is([data-cmu-theme-bubble="novel"], [data-sgb-bubble="novel"]) > :is(.wrtn-markdown, [class*="wrtn-markdown"], .markdown-body, .prose),
    html.cmu-theme-active main :is([data-cmu-theme-bubble="novel"], [data-sgb-bubble="novel"]) :is(.wrtn-markdown, [class*="wrtn-markdown"], .markdown-body, .prose):first-child {
      background: transparent !important;
      background-color: transparent !important;
      background-image: none !important;
      border: 0 !important;
      outline: 0 !important;
      box-shadow: none !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
    }
    html.cmu-theme-active main :is([data-cmu-theme-bubble="novel"], [data-sgb-bubble="novel"])::before,
    html.cmu-theme-active main :is([data-cmu-theme-bubble="novel"], [data-sgb-bubble="novel"])::after,
    html.cmu-theme-active main :is([data-cmu-theme-bubble="novel"], [data-sgb-bubble="novel"]) > :is(.wrtn-markdown, [class*="wrtn-markdown"], .markdown-body, .prose)::before,
    html.cmu-theme-active main :is([data-cmu-theme-bubble="novel"], [data-sgb-bubble="novel"]) > :is(.wrtn-markdown, [class*="wrtn-markdown"], .markdown-body, .prose)::after {
      content: none !important;
      display: none !important;
    }
    html.cmu-theme-active main :is([data-cmu-theme-novel-group], [data-sgb-novel-group]) > .flex > .flex-row {
      border-top-color: transparent !important;
      border-bottom-color: transparent !important;
      box-shadow: none !important;
    }
    html.cmu-theme-active main .flex-col-reverse > [data-message-group-id]:is([data-cmu-theme-novel-group], [data-sgb-novel-group]):not(:last-child)::before,
    html.cmu-theme-active main :not(.flex-col-reverse) > [data-message-group-id]:is([data-cmu-theme-novel-group], [data-sgb-novel-group]):not(:first-child)::before {
      content: var(--cmu-novel-sep-content) !important;
      display: flex !important;
      box-sizing: border-box !important;
      align-items: center !important;
      justify-content: center !important;
      position: static !important;
      width: auto !important;
      min-height: var(--cmu-novel-sep-box-height) !important;
      height: var(--cmu-novel-sep-box-height) !important;
      margin: var(--cmu-novel-sep-margin) !important;
      padding: 0 !important;
      color: var(--cmu-novel-sep-color) !important;
      font-family: var(--cmu-novel-sep-font-family) !important;
      font-size: var(--cmu-novel-sep-font-size) !important;
      font-weight: var(--cmu-novel-sep-font-weight) !important;
      line-height: 1 !important;
      letter-spacing: var(--cmu-novel-sep-letter-spacing) !important;
      text-align: center !important;
      text-shadow: var(--cmu-novel-sep-text-shadow) !important;
      white-space: nowrap !important;
      background: var(--cmu-novel-sep-bg) !important;
      background-repeat: no-repeat !important;
      background-size: 100% 100% !important;
      background-position: center !important;
      border: 0 !important;
      border-top: var(--cmu-novel-sep-border-top) !important;
      border-bottom: var(--cmu-novel-sep-border-bottom) !important;
      box-shadow: var(--cmu-novel-sep-shadow) !important;
      pointer-events: none !important;
      flex: 0 0 auto !important;
    }

    html.cmu-theme-active[data-cmu-chat-borderless-only="1"] main [data-cmu-theme-message-group] .wrtn-markdown :is(p, li, blockquote, h1, h2, h3, h4, h5, h6):not(:where(pre, pre *, code, code *, [data-cmu-theme-codeblock], [data-cmu-theme-codeblock] *, [data-sgb-codeblock], [data-sgb-codeblock] *, .wrtn-codeblock, .wrtn-codeblock *)) {
      color: inherit !important;
    }

    html.cmu-theme-active main [data-cmu-theme-quote] {
      border-radius: .35em;
      padding: .02em .10em;
      box-decoration-break: clone;
      -webkit-box-decoration-break: clone;
    }
    html.cmu-theme-active[data-cmu-theme-dialogue="on"] main [data-cmu-theme-quote="double"] {
      color: var(--cmu-theme-dialogue-text) !important;
      background: linear-gradient(180deg, transparent 36%, rgba(var(--cmu-theme-dialogue-rgb), .34) 36%);
    }
    html.cmu-theme-active[data-cmu-theme-thought="on"] main [data-cmu-theme-quote="single"] {
      color: var(--cmu-theme-thought-text) !important;
      background: linear-gradient(180deg, transparent 36%, rgba(var(--cmu-theme-thought-rgb), .28) 36%);
    }
    html.cmu-theme-active[data-cmu-theme-italic="on"] main [data-cmu-theme-message-group] .wrtn-markdown :is(em, i):not(:where(pre, pre *, code, code *, [data-cmu-theme-codeblock], [data-cmu-theme-codeblock] *, [data-sgb-codeblock], [data-sgb-codeblock] *, .wrtn-codeblock, .wrtn-codeblock *)) {
      background: linear-gradient(180deg, transparent 48%, rgba(var(--cmu-theme-italic-rgb), .22) 48%) !important;
      border-radius: .30em;
      padding: 0 .06em;
      box-decoration-break: clone;
      -webkit-box-decoration-break: clone;
    }
    html.cmu-theme-active[data-cmu-theme-strong="on"] main [data-cmu-theme-message-group] .wrtn-markdown :is(strong, b):not(:where(pre, pre *, code, code *, [data-cmu-theme-codeblock], [data-cmu-theme-codeblock] *, [data-sgb-codeblock], [data-sgb-codeblock] *, .wrtn-codeblock, .wrtn-codeblock *)) {
      background: linear-gradient(180deg, transparent 46%, rgba(var(--cmu-theme-strong-rgb), .22) 46%) !important;
      border-radius: .30em;
      padding: 0 .06em;
      box-decoration-break: clone;
      -webkit-box-decoration-break: clone;
    }
    html.cmu-theme-active[data-cmu-theme-markdown="on"] main [data-cmu-theme-message-group] .wrtn-markdown :is(blockquote) {
      margin: .72em 0 !important;
      padding: .08em 0 .08em .78em !important;
      background: transparent !important;
      background-image: none !important;
      border: 0 !important;
      border-left: 3px solid rgba(var(--cmu-theme-dialogue-rgb), .42) !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      text-shadow: none !important;
    }
    html.cmu-theme-active[data-cmu-theme-markdown="on"] main [data-cmu-theme-message-group] .wrtn-markdown blockquote::before,
    html.cmu-theme-active[data-cmu-theme-markdown="on"] main [data-cmu-theme-message-group] .wrtn-markdown blockquote::after {
      content: none !important;
      display: none !important;
    }
    html.cmu-theme-active[data-cmu-theme-markdown="on"] main [data-cmu-theme-message-group] .wrtn-markdown blockquote blockquote {
      margin: .45em 0 .18em !important;
      padding-left: .68em !important;
      border-left-width: 2px !important;
      opacity: .92 !important;
    }
    html.cmu-theme-active[data-cmu-theme-markdown="on"] main [data-cmu-theme-message-group] .wrtn-markdown :is(a) {
      color: color-mix(in srgb, var(--cmu-theme-dialogue-text) 82%, var(--cmu-theme-readable-text)) !important;
      text-decoration-color: rgba(var(--cmu-theme-dialogue-rgb), .55) !important;
    }

    html.cmu-theme-active main :is([data-sgb-bubble="chat"], [data-cmu-theme-bubble="chat"], [data-cmu-theme-bubble-fallback="markdown"]) {
      background: var(--cmu-theme-bubble-bg) !important;
      border: 1px solid var(--cmu-theme-bubble-border) !important;
      border-radius: 14px !important;
    }
    html.cmu-theme-active[data-cmu-ui-style="borderless"] main :is([data-sgb-bubble="chat"], [data-cmu-theme-bubble="chat"], [data-cmu-theme-bubble-fallback="markdown"]) {
      background: transparent !important;
      border-color: transparent !important;
      box-shadow: none !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
    }

    html.cmu-theme-active :is([data-cmu-theme-input-host], [data-sgb-input-host]) {
      background: transparent !important;
    }
    html.cmu-theme-active :is([data-cmu-theme-input-box], [data-sgb-input-box]) {
      background: rgba(24, 23, 28, .74) !important;
      border: 1px solid rgba(255,255,255,.16) !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.06), 0 8px 20px rgba(0,0,0,.12) !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
    }
    html.cmu-theme-active[data-cmu-theme="light"] :is([data-cmu-theme-input-box], [data-sgb-input-box]) {
      background: rgba(255,255,255,.76) !important;
      border-color: rgba(0,0,0,.12) !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.82), 0 8px 20px rgba(44,46,54,.08) !important;
    }
    html.cmu-theme-active #igx-live-popup:is([data-cmu-theme-radiosonde-skin], [data-sgb-radiosonde-skin]) {
      background: rgba(24, 23, 28, .74) !important;
      border: 1px solid rgba(255,255,255,.16) !important;
      color: #fafafa !important;
      box-shadow: 0 8px 22px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.06) !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
    }
    html.cmu-theme-active #igx-live-popup.inline:is([data-cmu-theme-radiosonde-skin], [data-sgb-radiosonde-skin]) {
      background: rgba(24, 23, 28, .74) !important;
    }
    html.cmu-theme-active #igx-live-popup:is([data-cmu-theme-radiosonde-skin], [data-sgb-radiosonde-skin]) #igx-live-head,
    html.cmu-theme-active #igx-live-popup:is([data-cmu-theme-radiosonde-skin], [data-sgb-radiosonde-skin]) :is([data-cmu-theme-radiosonde-head], [data-sgb-radiosonde-head]) {
      background: rgba(255,255,255,.055) !important;
      border-color: rgba(255,255,255,.14) !important;
      color: #fafafa !important;
    }
    html.cmu-theme-active #igx-live-popup:is([data-cmu-theme-radiosonde-skin], [data-sgb-radiosonde-skin]) :is(.bitem, [data-cmu-theme-radiosonde-part], [data-sgb-radiosonde-part]) {
      color: #fafafa !important;
    }
    html.cmu-theme-active #igx-live-popup:is([data-cmu-theme-radiosonde-skin], [data-sgb-radiosonde-skin]) .igx-btn {
      background: rgba(255,255,255,.065) !important;
      border-color: rgba(255,255,255,.14) !important;
      color: #fafafa !important;
    }

    html.cmu-theme-active[data-cmu-theme="light"] #igx-live-popup:is([data-cmu-theme-radiosonde-skin], [data-sgb-radiosonde-skin]) {
      background: rgba(255,255,255,.82) !important;
      border-color: rgba(0,0,0,.12) !important;
      color: #30323a !important;
      box-shadow: 0 8px 22px rgba(44,46,54,.10), inset 0 1px 0 rgba(255,255,255,.82) !important;
    }
    html.cmu-theme-active[data-cmu-theme="light"] #igx-live-popup.inline:is([data-cmu-theme-radiosonde-skin], [data-sgb-radiosonde-skin]) {
      background: rgba(255,255,255,.82) !important;
    }
    html.cmu-theme-active[data-cmu-theme="light"] #igx-live-popup:is([data-cmu-theme-radiosonde-skin], [data-sgb-radiosonde-skin]) #igx-live-head,
    html.cmu-theme-active[data-cmu-theme="light"] #igx-live-popup:is([data-cmu-theme-radiosonde-skin], [data-sgb-radiosonde-skin]) :is([data-cmu-theme-radiosonde-head], [data-sgb-radiosonde-head]) {
      background: rgba(0,0,0,.035) !important;
      border-color: rgba(0,0,0,.09) !important;
      color: #30323a !important;
    }
    html.cmu-theme-active[data-cmu-theme="light"] #igx-live-popup:is([data-cmu-theme-radiosonde-skin], [data-sgb-radiosonde-skin]) :is(.bitem, [data-cmu-theme-radiosonde-part], [data-sgb-radiosonde-part]) {
      color: #30323a !important;
    }
    html.cmu-theme-active[data-cmu-theme="light"] #igx-live-popup:is([data-cmu-theme-radiosonde-skin], [data-sgb-radiosonde-skin]) .igx-btn {
      background: rgba(0,0,0,.045) !important;
      border-color: rgba(0,0,0,.10) !important;
      color: #30323a !important;
    }
    html.cmu-theme-active main :is([data-sgb-message-group], [data-cmu-theme-message-group]) :is(.wrtn-markdown, [class*="wrtn-markdown"], .markdown-body, .prose) :is(p, li, blockquote, h1, h2, h3, h4, h5, h6):not(:where(pre, pre *, code, code *, [data-cmu-theme-codeblock], [data-cmu-theme-codeblock] *, [data-sgb-codeblock], [data-sgb-codeblock] *, .wrtn-codeblock, .wrtn-codeblock *)) {
      color: var(--cmu-theme-readable-text) !important;
    }
    html.cmu-theme-active main :is([data-sgb-quote], [data-cmu-theme-quote]) {
      border-radius: .35em;
      padding: 0 .08em;
      box-decoration-break: clone;
      -webkit-box-decoration-break: clone;
    }
    html.cmu-theme-active[data-cmu-theme-dialogue="on"] main :is([data-sgb-quote="double"], [data-cmu-theme-quote="double"]) {
      color: var(--cmu-theme-dialogue-text) !important;
      background: linear-gradient(180deg, transparent 36%, rgba(var(--cmu-theme-dialogue-rgb), .34) 36%) !important;
    }
    html.cmu-theme-active[data-cmu-theme-thought="on"] main :is([data-sgb-quote="single"], [data-cmu-theme-quote="single"]) {
      color: var(--cmu-theme-thought-text) !important;
      background: linear-gradient(180deg, transparent 36%, rgba(var(--cmu-theme-thought-rgb), .28) 36%) !important;
    }

    html.cmu-theme-active[data-cmu-chat-borderless-only="1"] main :is([data-sgb-quote], [data-cmu-theme-quote]) {
      border-radius: .32em;
      padding: .01em .08em;
    }
    html.cmu-theme-active[data-cmu-chat-borderless-only="1"][data-cmu-theme-dialogue="on"] main :is([data-sgb-quote="double"], [data-cmu-theme-quote="double"]) {
      color: var(--cmu-theme-dialogue-text) !important;
      background: linear-gradient(180deg, transparent 42%, rgba(var(--cmu-theme-dialogue-rgb), .24) 42%) !important;
    }
    html.cmu-theme-active[data-cmu-chat-borderless-only="1"][data-cmu-theme-thought="on"] main :is([data-sgb-quote="single"], [data-cmu-theme-quote="single"]) {
      color: var(--cmu-theme-thought-text) !important;
      background: linear-gradient(180deg, transparent 42%, rgba(var(--cmu-theme-thought-rgb), .22) 42%) !important;
    }
    html.cmu-theme-active[data-cmu-chat-borderless-only="1"][data-cmu-theme-italic="on"] main :is([data-sgb-message-group], [data-cmu-theme-message-group]) .wrtn-markdown :is(em, i):not(:where(pre, pre *, code, code *, [data-cmu-theme-codeblock], [data-cmu-theme-codeblock] *, [data-sgb-codeblock], [data-sgb-codeblock] *, .wrtn-codeblock, .wrtn-codeblock *)) {
      color: var(--cmu-theme-muted-text) !important;
      background: linear-gradient(180deg, transparent 50%, rgba(var(--cmu-theme-italic-rgb), .16) 50%) !important;
    }
    html.cmu-theme-active[data-cmu-chat-borderless-only="1"][data-cmu-theme-strong="on"] main :is([data-sgb-message-group], [data-cmu-theme-message-group]) .wrtn-markdown :is(strong, b):not(:where(pre, pre *, code, code *, [data-cmu-theme-codeblock], [data-cmu-theme-codeblock] *, [data-sgb-codeblock], [data-sgb-codeblock] *, .wrtn-codeblock, .wrtn-codeblock *)) {
      color: var(--cmu-theme-strong-text) !important;
      background: linear-gradient(180deg, transparent 50%, rgba(var(--cmu-theme-strong-rgb), .18) 50%) !important;
    }
    html.cmu-theme-active[data-cmu-chat-borderless-only="1"][data-cmu-theme-markdown="on"] main :is([data-sgb-message-group], [data-cmu-theme-message-group]) .wrtn-markdown :is(blockquote) {
      border-left-color: rgba(var(--cmu-theme-dialogue-rgb), .34) !important;
      background: transparent !important;
      background-image: none !important;
    }
    html.cmu-theme-active[data-cmu-chat-borderless-only="1"][data-cmu-theme-markdown="on"] main :is([data-sgb-message-group], [data-cmu-theme-message-group]) .wrtn-markdown :is(a) {
      color: color-mix(in srgb, var(--cmu-theme-dialogue-text) 82%, var(--cmu-theme-readable-text)) !important;
      text-decoration-color: rgba(var(--cmu-theme-dialogue-rgb), .46) !important;
    }

    html.cmu-theme-active[data-cmu-theme-code="on"] main :is(pre[data-cmu-theme-codeblock], pre[data-sgb-codeblock], .wrtn-codeblock[data-cmu-theme-codeblock], .wrtn-codeblock[data-sgb-codeblock]) {
      border: 1px solid rgba(var(--cmu-theme-code-rgb), .38) !important;
      background: rgba(var(--cmu-theme-code-rgb), .10) !important;
      background-image: none !important;
      border-radius: 12px !important;
      overflow: auto !important;
      max-width: 100% !important;
      box-sizing: border-box !important;
    }

    html.cmu-theme-active[data-cmu-chat-borderless-only="1"][data-cmu-theme-code="on"] main :is(pre[data-cmu-theme-codeblock], pre[data-sgb-codeblock], .wrtn-codeblock[data-cmu-theme-codeblock], .wrtn-codeblock[data-sgb-codeblock]) {
      border-color: rgba(150,150,158,.26) !important;
      background: rgba(122,122,130,.075) !important;
    }

    html.cmu-theme-active[data-cmu-theme-code="on"] main :is(pre[data-cmu-theme-codeblock], pre[data-sgb-codeblock], .wrtn-codeblock[data-cmu-theme-codeblock], .wrtn-codeblock[data-sgb-codeblock]) :is(code, span, em, i, strong, b, a, .line, [class~="line"], span.line) {
      line-height: revert !important;
      letter-spacing: revert !important;
      word-spacing: revert !important;
      white-space: revert !important;
      overflow-wrap: revert !important;
      word-break: revert !important;
      display: revert !important;
      min-width: revert !important;
      width: revert !important;
      max-width: revert !important;
      padding: revert !important;
      margin: revert !important;
      border: revert !important;
      box-shadow: none !important;
      text-shadow: none !important;
      background: transparent !important;
      background-color: transparent !important;
      background-image: none !important;
    }

    html.cmu-theme-active[data-cmu-theme-code="on"] main :is(pre[data-cmu-theme-codeblock], pre[data-sgb-codeblock]) :is([data-cmu-theme-quote], [data-sgb-quote], [data-cmu-theme-codeblock-head], [data-sgb-codeblock-head], [data-cmu-theme-codeblock-body], [data-sgb-codeblock-body]) {
      background: transparent !important;
      background-color: transparent !important;
      background-image: none !important;
      border: revert !important;
      box-shadow: none !important;
      padding: revert !important;
    }

    @media (max-width: 768px) {
      html.cmu-theme-active[data-cmu-theme-code="on"] main .wrtn-codeblock[data-cmu-theme-codeblock],
      html.cmu-theme-active[data-cmu-theme-code="on"] main .wrtn-codeblock[data-sgb-codeblock] {
        padding-top: 0 !important;
        overflow: hidden !important;
      }
      html.cmu-theme-active[data-cmu-theme-code="on"] main .wrtn-codeblock:is([data-cmu-theme-codeblock], [data-sgb-codeblock]) > :first-child:not(pre):not(code) {
        min-height: 34px !important;
        height: 34px !important;
        padding: 0 10px !important;
        margin: 0 !important;
        display: flex !important;
        align-items: center !important;
        line-height: 1 !important;
      }
      html.cmu-theme-active[data-cmu-theme-code="on"] main .wrtn-codeblock:is([data-cmu-theme-codeblock], [data-sgb-codeblock]) > :first-child:not(pre):not(code) :is(svg, button, span) {
        max-height: 22px !important;
      }
      html.cmu-theme-active[data-cmu-theme-code="on"] main .wrtn-codeblock:is([data-cmu-theme-codeblock], [data-sgb-codeblock]) > pre,
      html.cmu-theme-active[data-cmu-theme-code="on"] main .wrtn-codeblock:is([data-cmu-theme-codeblock], [data-sgb-codeblock]) pre:first-of-type {
        margin-top: 0 !important;
        border-top-left-radius: 0 !important;
        border-top-right-radius: 0 !important;
        border-width: 0 !important;
        background: transparent !important;
      }
    }

        #${ID.toolbarWrapper} {
      display: inline-flex !important;
      align-items: center !important;
      gap: .35rem !important;
      flex-shrink: 0 !important;
      pointer-events: auto !important;
    }

    #${ID.toolbarWrapper}.cmu-fallback-toolbar {
      position: absolute !important;
      left: 8px !important;
      bottom: 8px !important;
      z-index: 20 !important;
    }

    #${ID.settingsButton}.cmu-native-toolbar-btn,
    #${ID.fullscreenButton}.cmu-native-toolbar-btn {
      pointer-events: auto !important;
      touch-action: manipulation !important;
    }
    #${ID.settingsButton}.cmu-native-toolbar-btn svg,
    #${ID.settingsButton}.cmu-native-toolbar-btn svg *,
    #${ID.fullscreenButton}.cmu-native-toolbar-btn svg,
    #${ID.fullscreenButton}.cmu-native-toolbar-btn svg * {
      fill: none !important;
      stroke: currentColor !important;
    }
    #${ID.settingsButton}.cmu-native-toolbar-btn svg {
      width: 16px !important;
      height: 16px !important;
      color: hsl(var(--line-gray-2, 0 0% 62%)) !important;
    }
    #${ID.fullscreenButton}.cmu-native-toolbar-btn .cmu-fullscreen-icon {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 16px !important;
      height: 16px !important;
      line-height: 1 !important;
      font-size: 15px !important;
      font-weight: 700 !important;
      color: hsl(var(--line-gray-2, 0 0% 62%)) !important;
      pointer-events: none !important;
      transform: translateY(-.5px);
    }

    #${ID.composerExpandButton}.cmu-composer-expand-overlay {
      all: unset !important;
      position: absolute !important;
      top: 6px !important;
      right: 7px !important;
      z-index: 35 !important;
      display: none !important;
      align-items: center !important;
      justify-content: center !important;
      box-sizing: border-box !important;
      width: 22px !important;
      min-width: 22px !important;
      height: 22px !important;
      min-height: 22px !important;
      margin: 0 !important;
      padding: 0 !important;
      border: 0 !important;
      border-radius: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
      color: rgba(255,255,255,.58) !important;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI Symbol", "Apple Symbols", sans-serif !important;
      font-size: 18px !important;
      font-style: normal !important;
      font-weight: 500 !important;
      line-height: 1 !important;
      text-align: center !important;
      opacity: .92 !important;
      cursor: pointer !important;
      pointer-events: auto !important;
      touch-action: manipulation !important;
      user-select: none !important;
      -webkit-user-select: none !important;
      -webkit-tap-highlight-color: transparent !important;
    }
    body[data-theme="light"] #${ID.composerExpandButton}.cmu-composer-expand-overlay,
    html[data-theme="light"] #${ID.composerExpandButton}.cmu-composer-expand-overlay {
      color: rgba(0,0,0,.56) !important;
    }
    body[data-theme="dark"] #${ID.composerExpandButton}.cmu-composer-expand-overlay,
    html[data-theme="dark"] #${ID.composerExpandButton}.cmu-composer-expand-overlay {
      color: rgba(255,255,255,.58) !important;
    }
    #${ID.composerExpandButton}.cmu-composer-expand-overlay.cmu-composer-expand-visible {
      display: inline-flex !important;
    }
    #${ID.composerExpandButton}.cmu-composer-expand-overlay:hover,
    #${ID.composerExpandButton}.cmu-composer-expand-overlay:focus-visible {
      background: transparent !important;
      opacity: 1 !important;
      outline: none !important;
    }
    #${ID.composerExpandButton}.cmu-composer-expand-overlay:active {
      background: transparent !important;
      transform: scale(.92) !important;
    }
    [data-cmu-composer-expand-animating="1"] {
      transition: height .2s ease, max-height .2s ease !important;
    }
    @media (prefers-reduced-motion: reduce) {
      [data-cmu-composer-expand-animating="1"] {
        transition: none !important;
      }
    }

    #${ID.inputCounterWrap} {
      position: absolute !important;
      z-index: 2 !important;
      top: var(--cmu-input-counter-top, 20px) !important;
      left: var(--cmu-input-counter-left, 100%) !important;
      right: auto !important;
      transform: translate(-50%, -100%) !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      min-width: 30px !important;
      height: 18px !important;
      margin: 0 !important;
      padding: 0 4px !important;
      box-sizing: border-box !important;
      pointer-events: none !important;
      user-select: none !important;
      -webkit-user-select: none !important;
    }
    #${ID.inputCounterCount} {
      display: inline-block !important;
      color: var(--cmu-input-counter-color, var(--text_tertiary, var(--icon_tertiary, rgba(128,128,128,.78)))) !important;
      font-family: inherit !important;
      font-size: 11px !important;
      font-weight: 650 !important;
      line-height: 1 !important;
      letter-spacing: -.02em !important;
      font-variant-numeric: tabular-nums !important;
      white-space: nowrap !important;
      opacity: .74 !important;
      text-shadow: none !important;
      transition: color 150ms ease, opacity 150ms ease, transform 150ms ease !important;
    }
    #${ID.inputCounterCount}[data-empty="true"] { opacity: .42 !important; }
    #${ID.inputCounterCount}[data-warning="true"] { opacity: .96 !important; }
    #${ID.inputCounterCount}[data-limit="true"] {
      opacity: 1 !important;
      font-weight: 750 !important;
    }
    #${ID.inputCounterCount}.cmu-input-counter-over-pulse {
      animation: cmu-input-counter-over-shake 520ms cubic-bezier(.36,.07,.19,.97) both !important;
    }
    @keyframes cmu-input-counter-over-shake {
      0%, 100% { transform: translateX(0) scale(1); }
      12% { transform: translateX(-3px) rotate(-4deg) scale(1.08); }
      24% { transform: translateX(3px) rotate(4deg) scale(1.08); }
      36% { transform: translateX(-3px) rotate(-3deg) scale(1.07); }
      48% { transform: translateX(3px) rotate(3deg) scale(1.07); }
      62% { transform: translateX(-2px) rotate(-2deg) scale(1.05); }
      76% { transform: translateX(2px) rotate(2deg) scale(1.03); }
    }
    @media (prefers-reduced-motion: reduce) {
      #${ID.inputCounterCount} { transition: color 150ms ease, opacity 150ms ease !important; }
      #${ID.inputCounterCount}.cmu-input-counter-over-pulse { animation: none !important; }
    }

    #${ID.leftMenuZone},
    #${ID.rightMenuZone} {
      position: fixed !important;
      top: 0 !important;
      bottom: 0 !important;
      width: 28px !important;
      z-index: 2147482998 !important;
      display: none !important;
      pointer-events: none !important;
      background: transparent !important;
    }
    #${ID.leftMenuZone} { left: 0 !important; width: 42px !important; }
    #${ID.rightMenuZone} { right: 0 !important; }

    html.cmu-phone-viewport.cmu-left-menu-enabled #${ID.leftMenuZone},
    html.cmu-phone-viewport.cmu-right-menu-enabled #${ID.rightMenuZone} {
      display: block !important;
      pointer-events: none !important;
    }
    #${ID.leftMenuHandle},
    #${ID.rightMenuHandle} {
      position: fixed !important;
      top: 50% !important;
      width: 24px !important;
      height: 68px !important;
      border: 0 !important;
      padding: 0 !important;
      margin: 0 !important;
      transform: translateY(-50%) !important;
      z-index: 2147483002 !important;
      background: transparent !important;
      box-shadow: none !important;
      outline: none !important;
      opacity: .72 !important;
      pointer-events: auto !important;
      touch-action: none !important;
      -webkit-tap-highlight-color: transparent !important;
      cursor: pointer !important;
    }
    #${ID.leftMenuHandle} {
      left: max(0px, env(safe-area-inset-left)) !important;
      width: 40px !important;
    }
    #${ID.rightMenuHandle} { right: max(0px, env(safe-area-inset-right)) !important; }
    #${ID.leftMenuHandle}::after,
    #${ID.rightMenuHandle}::after {
      content: "";
      position: absolute;
      top: 50%;
      width: 3px;
      height: 32px;
      border-radius: 999px;
      background: rgba(165,165,175,.38);
      transform: translateY(-50%);
      box-shadow: none;
    }
    #${ID.leftMenuHandle}::after { left: 6px; }
    #${ID.rightMenuHandle}::after { right: 6px; }
    #${ID.leftMenuHandle}:active::after,
    #${ID.rightMenuHandle}:active::after {
      background: rgba(254,69,50,.58);
    }
    html[data-theme="light"] #${ID.leftMenuHandle}::after,
    body[data-theme="light"] #${ID.leftMenuHandle}::after,
    html[data-theme="light"] #${ID.rightMenuHandle}::after,
    body[data-theme="light"] #${ID.rightMenuHandle}::after {
      background: rgba(120,120,128,.28);
    }

    html.cmu-mobile-chat-list-open #${ID.leftMenuZone},
    html.cmu-mobile-chat-list-open #${ID.leftMenuHandle},
    html.cmu-mobile-room-panel-open #${ID.rightMenuZone},
    html.cmu-mobile-room-panel-open #${ID.rightMenuHandle} {
      opacity: 0 !important;
      pointer-events: none !important;
    }

    #${ID.menuSwipeZone} {
      position: fixed !important;
      left: max(24px, env(safe-area-inset-left)) !important;
      right: max(24px, env(safe-area-inset-right)) !important;
      top: auto !important;
      bottom: calc(98px + env(safe-area-inset-bottom)) !important;
      height: 48px !important;
      z-index: 2147483000 !important;
      display: none !important;
      pointer-events: none !important;
      background: transparent !important;
      border: 0 !important;
      padding: 0 !important;
      margin: 0 !important;
      opacity: 1 !important;
      touch-action: pan-y !important;
      -webkit-tap-highlight-color: transparent !important;
      user-select: none !important;
    }
    html.cmu-phone-viewport.cmu-menu-swipe-zone-enabled #${ID.menuSwipeZone} {
      display: block !important;
      pointer-events: none !important;
    }
    /*
     * 좌우 메뉴 스와이프 중 루트 뷰포트가 손가락을 따라 옆으로 밀리는 현상 방지.
     * 평소에는 건드리지 않고, 실제 스와이프 존에서 손가락이 내려간 동안만 적용한다.
     * JS의 non-passive touchmove/pointermove 차단과 함께 iOS Safari / Android Firefox·Edge를 보완한다.
     */
    html.cmu-menu-swipe-tracking,
    html.cmu-menu-swipe-tracking body {
      overflow-x: hidden !important;
      overscroll-behavior-x: none !important;
    }
    html.cmu-mobile-chat-list-open #${ID.menuSwipeZone},
    html.cmu-mobile-room-panel-open #${ID.menuSwipeZone},
    html.cmu-panel-open #${ID.menuSwipeZone} {
      pointer-events: none !important;
    }
    #${ID.menuSwipeZone}::after {
      content: "";
      position: absolute;
      inset: 7px 18px;
      border-radius: 999px;
      background: rgba(165,165,175,.16);
      opacity: 0;
      transform: scaleX(.96);
      transition: opacity 180ms ease, transform 180ms ease;
      pointer-events: none;
    }
    #${ID.menuSwipeZone}.cmu-swipe-feedback::after {
      opacity: 1;
      transform: scaleX(1);
    }
    html[data-theme="light"] #${ID.menuSwipeZone}::after,
    body[data-theme="light"] #${ID.menuSwipeZone}::after {
      background: rgba(120,120,128,.13);
    }

    html.cmu-phone-viewport.cmu-hide-stat-bar [data-cmu-stat-bar="1"],
    html.cmu-phone-viewport.cmu-hide-stat-bar [data-cmu-room-stat-bar="1"],
    html.cmu-phone-viewport.cmu-hide-stat-bar [data-cmu-stat-carousel="1"],
    html.cmu-phone-viewport.cmu-hide-stat-bar [data-cmu-stat-button="1"],
    html.cmu-phone-viewport.cmu-hide-stat-bar [data-crack-ui-stat-bar="1"],
    html.cmu-phone-viewport.cmu-hide-stat-bar [data-crack-ui-room-stat-bar="1"] {
      display: none !important;
    }

    /* ───────── 설정창 (4.5.0 · A안 + 헤더 검색) ─────────
       효과는 열기·닫기·탭 이동·토글 순간에만 재생된다. 무한 반복 효과 없음.
       닫힘이 끝나면 JS가 내용을 비우므로 닫혀 있는 동안 그리거나 계산하는 것이 없다. */
    #cmu-settings-panel,
    #cmu-settings-scrim {
      --bg: rgb(241, 241, 243);
      --card: rgb(255, 255, 255);
      --cardh: rgb(246, 246, 248);
      --tx: rgb(28, 28, 31);
      --sub: rgb(108, 108, 114);
      --bd: rgba(0, 0, 0, .09);
      --icobg: rgba(0, 0, 0, .05);
      --ac: rgb(22, 163, 74);
      --acf: rgb(22, 163, 74);
      --acbg: rgba(22, 163, 74, .12);
      --chip: rgba(0, 0, 0, .05);
      --hbtn: rgba(0, 0, 0, .055);
      --hbtn2: rgba(0, 0, 0, .10);
      --pbg: rgba(248, 248, 250, .97);
      --pshadow: 0 18px 46px rgba(24, 24, 28, .20);
      --scrim: rgba(20, 20, 24, .16);
      --indbg: rgb(255, 255, 255);
      --indsh: 0 1px 3px rgba(0, 0, 0, .12);
      --cmu-spring: cubic-bezier(.3, 1.35, .5, 1);
      --cmu-sheet: cubic-bezier(.2, 1.08, .32, 1);
      --cmu-ease: cubic-bezier(.2, .8, .2, 1);
      --cmu-exit: cubic-bezier(.4, 0, 1, 1);
    }
    @media (prefers-color-scheme: dark) {
      #cmu-settings-panel,
      #cmu-settings-scrim {
        --bg: rgb(28, 28, 31); --card: rgb(39, 39, 43); --cardh: rgb(48, 48, 54); --tx: rgb(236, 236, 238); --sub: rgb(150, 150, 156);
        --bd: rgba(255, 255, 255, .09); --icobg: rgba(255, 255, 255, .06); --ac: rgb(34, 197, 94); --acf: rgb(74, 222, 128); --acbg: rgba(34, 197, 94, .16);
        --chip: rgba(255, 255, 255, .07); --hbtn: rgba(255, 255, 255, .08); --hbtn2: rgba(255, 255, 255, .15); --pbg: rgba(24, 24, 26, .96);
        --pshadow: 0 18px 46px rgba(0, 0, 0, .38); --scrim: rgba(0, 0, 0, .34); --indbg: rgba(34, 197, 94, .16); --indsh: none;
      }
    }
    html[data-theme="dark"] #cmu-settings-panel, body[data-theme="dark"] #cmu-settings-panel,
    html[data-theme="dark"] #cmu-settings-scrim, body[data-theme="dark"] #cmu-settings-scrim,
    html[data-cmu-theme="dark"] #cmu-settings-panel, html[data-cmu-theme="dark"] #cmu-settings-scrim {
      --bg: rgb(28, 28, 31); --card: rgb(39, 39, 43); --cardh: rgb(48, 48, 54); --tx: rgb(236, 236, 238); --sub: rgb(150, 150, 156);
      --bd: rgba(255, 255, 255, .09); --icobg: rgba(255, 255, 255, .06); --ac: rgb(34, 197, 94); --acf: rgb(74, 222, 128); --acbg: rgba(34, 197, 94, .16);
      --chip: rgba(255, 255, 255, .07); --hbtn: rgba(255, 255, 255, .08); --hbtn2: rgba(255, 255, 255, .15); --pbg: rgba(24, 24, 26, .96);
      --pshadow: 0 18px 46px rgba(0, 0, 0, .38); --scrim: rgba(0, 0, 0, .34); --indbg: rgba(34, 197, 94, .16); --indsh: none;
      color-scheme: dark;
    }
    html[data-theme="light"] #cmu-settings-panel, body[data-theme="light"] #cmu-settings-panel,
    html[data-theme="light"] #cmu-settings-scrim, body[data-theme="light"] #cmu-settings-scrim,
    html[data-cmu-theme="light"] #cmu-settings-panel, html[data-cmu-theme="light"] #cmu-settings-scrim {
      --bg: rgb(241, 241, 243); --card: rgb(255, 255, 255); --cardh: rgb(246, 246, 248); --tx: rgb(28, 28, 31); --sub: rgb(108, 108, 114);
      --bd: rgba(0, 0, 0, .09); --icobg: rgba(0, 0, 0, .05); --ac: rgb(22, 163, 74); --acf: rgb(22, 163, 74); --acbg: rgba(22, 163, 74, .12);
      --chip: rgba(0, 0, 0, .05); --hbtn: rgba(0, 0, 0, .055); --hbtn2: rgba(0, 0, 0, .10); --pbg: rgba(248, 248, 250, .97);
      --pshadow: 0 18px 46px rgba(24, 24, 28, .20); --scrim: rgba(20, 20, 24, .16); --indbg: rgb(255, 255, 255); --indsh: 0 1px 3px rgba(0, 0, 0, .12);
      color-scheme: light;
    }
    html[data-cmu-theme="dark"] #cmu-settings-panel, html[data-cmu-theme="dark"] #cmu-settings-scrim {
      --bg: rgb(28, 28, 31); --card: rgb(39, 39, 43); --cardh: rgb(48, 48, 54); --tx: rgb(236, 236, 238); --sub: rgb(150, 150, 156);
      --bd: rgba(255, 255, 255, .09); --icobg: rgba(255, 255, 255, .06); --ac: rgb(34, 197, 94); --acf: rgb(74, 222, 128); --acbg: rgba(34, 197, 94, .16);
      --chip: rgba(255, 255, 255, .07); --hbtn: rgba(255, 255, 255, .08); --hbtn2: rgba(255, 255, 255, .15); --pbg: rgba(24, 24, 26, .96);
      --pshadow: 0 18px 46px rgba(0, 0, 0, .38); --scrim: rgba(0, 0, 0, .34); --indbg: rgba(34, 197, 94, .16); --indsh: none;
      color-scheme: dark;
    }

    /* 뒤 배경 어둡게 — 클릭은 통과(pointer-events:none)라서 바깥 터치로 닫기 동작은 기존과 같다 */
    #cmu-settings-scrim {
      position: fixed;
      inset: 0;
      z-index: 2147483646;
      background: var(--scrim);
      pointer-events: none;
      animation: cmuScrimIn .3s var(--cmu-ease) both;
    }
    #cmu-settings-scrim.cmu-out { animation: cmuScrimOut .22s var(--cmu-exit) forwards; }
    html.cmu-user-note-open #cmu-settings-scrim { display: none !important; }
    @keyframes cmuScrimIn { from { opacity: 0; } }
    @keyframes cmuScrimOut { to { opacity: 0; } }

    /* 설정창 본체 — 아래에서 올라오는 시트 */
    #cmu-settings-panel {
      position: fixed;
      left: max(10px, env(safe-area-inset-left));
      right: max(10px, env(safe-area-inset-right));
      bottom: calc(10px + env(safe-area-inset-bottom));
      max-width: 560px;
      margin: 0 auto;
      height: min(86dvh, 760px);
      z-index: 2147483647;
      display: none;
      flex-direction: column;
      overflow: hidden;
      border: 0;
      border-radius: 18px;
      background: var(--pbg);
      color: var(--tx);
      box-shadow: var(--pshadow);
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans KR", sans-serif;
    }
    #cmu-settings-panel.open,
    #cmu-settings-panel.cmu-closing { display: flex; }
    #cmu-settings-panel.open { animation: cmuSheetIn .5s var(--cmu-sheet) backwards; }
    #cmu-settings-panel.cmu-closing { animation: cmuSheetOut .24s var(--cmu-exit) forwards; pointer-events: none; }
    #cmu-settings-panel.cmu-dragging { animation: none; transition: none; }
    #cmu-settings-panel.cmu-snap { transition: transform .38s var(--cmu-spring); }
    @keyframes cmuSheetIn { from { transform: translateY(calc(100% + 24px)); } }
    @keyframes cmuSheetOut { to { transform: translateY(calc(100% + 24px)); } }
    #cmu-settings-panel,
    #cmu-settings-panel * {
      box-sizing: border-box;
      -webkit-tap-highlight-color: transparent !important;
    }
    #cmu-settings-panel [data-action] {
      touch-action: manipulation !important;
      pointer-events: auto !important;
    }
    #cmu-settings-panel svg {
      display: block;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      pointer-events: none;
    }

    /* 손잡이 · 머리 */
    #cmu-settings-panel .cmu-panel-grab {
      flex: none;
      width: 38px;
      height: 5px;
      margin: 8px auto 0;
      border-radius: 3px;
      background: var(--bd);
      touch-action: none;
    }
    #cmu-settings-panel .cmu-panel-head {
      position: relative;
      flex: none;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 10px 8px 16px;
      touch-action: none;
      user-select: none;
      -webkit-user-select: none;
    }
    #cmu-settings-panel .cmu-panel-title {
      flex: 1 1 auto;
      min-width: 0;
      font-size: 15px;
      font-weight: 800;
      letter-spacing: -.2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      transition: opacity .2s, transform .28s var(--cmu-ease);
    }
    #cmu-settings-panel .cmu-panel-actions {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      flex: 0 0 auto;
    }
    #cmu-settings-panel .cmu-panel-icon-btn,
    #cmu-settings-panel .cmu-panel-close {
      flex: none;
      width: 38px;
      height: 38px;
      min-width: 38px;
      min-height: 38px;
      padding: 0;
      border: 0;
      border-radius: 11px;
      background: var(--hbtn);
      color: inherit;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-family: inherit;
      cursor: pointer;
      transition: background-color .15s, color .15s, opacity .18s, transform .2s var(--cmu-spring);
    }
    #cmu-settings-panel .cmu-panel-close { font-size: 19px; line-height: 1; }
    #cmu-settings-panel .cmu-panel-icon-btn svg { width: 17px; height: 17px; stroke-width: 2; }
    #cmu-settings-panel .cmu-panel-icon-btn:active,
    #cmu-settings-panel .cmu-panel-close:active { transform: scale(.9); background: var(--hbtn2); }
    #cmu-settings-panel .cmu-panel-icon-btn.on { background: var(--acbg); color: var(--acf); }

    /* 헤더 검색 — 돋보기를 누르면 제목 자리에서 오른쪽→왼쪽으로 펼쳐짐 */
    #cmu-settings-panel .cmu-search-box {
      position: absolute;
      left: 12px;
      right: 98px;
      top: 8px;
      z-index: 2;
      clip-path: inset(0 0 0 100% round 11px);
      visibility: hidden;
      pointer-events: none;
      transition: clip-path .32s var(--cmu-ease), visibility 0s linear .32s;
    }
    #cmu-settings-panel .cmu-panel-head.cmu-s-open .cmu-search-box {
      clip-path: inset(0 0 0 0 round 11px);
      visibility: visible;
      pointer-events: auto;
      transition: clip-path .32s var(--cmu-ease), visibility 0s;
    }
    #cmu-settings-panel .cmu-panel-head.cmu-s-open .cmu-panel-title { opacity: 0; transform: translateX(-10px); }
    #cmu-settings-panel .cmu-panel-head.cmu-s-open [data-action="tab-label-toggle"],
    #cmu-settings-panel .cmu-panel-head.cmu-s-open [data-action="api-open"] { opacity: 0; transform: scale(.8); pointer-events: none !important; }
    #cmu-settings-panel .cmu-search {
      display: flex;
      align-items: center;
      gap: 8px;
      height: 38px;
      padding: 0 6px 0 11px;
      border-radius: 11px;
      background: var(--card);
      box-shadow: inset 0 0 0 1px var(--bd);
      transition: box-shadow .2s;
    }
    #cmu-settings-panel .cmu-search:focus-within { box-shadow: inset 0 0 0 1px var(--ac), 0 0 0 3px var(--acbg); }
    #cmu-settings-panel .cmu-search > svg { width: 15px; height: 15px; flex: none; stroke-width: 1.9; color: var(--sub); }
    #cmu-settings-panel .cmu-search input {
      flex: 1;
      min-width: 0;
      border: 0;
      outline: 0;
      background: transparent;
      color: var(--tx);
      font-size: 13px;
      font-family: inherit;
      -webkit-appearance: none;
      appearance: none;
      touch-action: auto !important;
    }
    #cmu-settings-panel .cmu-search input::placeholder { color: var(--sub); }
    #cmu-settings-panel .cmu-search input::-webkit-search-cancel-button,
    #cmu-settings-panel .cmu-search input::-webkit-search-decoration { -webkit-appearance: none; display: none; }
    #cmu-settings-panel .cmu-search-clear {
      flex: none;
      width: 26px;
      height: 26px;
      padding: 0;
      border: 0;
      border-radius: 50%;
      background: transparent;
      color: var(--sub);
      font-size: 17px;
      line-height: 1;
      cursor: pointer;
      opacity: 0;
      transform: scale(0);
      transition: transform .25s var(--cmu-spring), opacity .15s;
    }
    #cmu-settings-panel .cmu-search.has .cmu-search-clear { opacity: 1; transform: scale(1); }

    /* API 키 보관함 — 높이가 부드럽게 펼쳐짐 */
    #cmu-settings-panel .cmu-key-popover {
      flex: none;
      display: grid;
      grid-template-rows: 0fr;
      margin: 0;
      padding: 0;
      border: 0;
      border-radius: 0;
      background: transparent;
      box-shadow: none;
      color: var(--tx);
      transition: grid-template-rows .32s var(--cmu-ease);
    }
    #cmu-settings-panel .cmu-key-popover.cmu-open { grid-template-rows: 1fr; }
    #cmu-settings-panel .cmu-key-inner { min-height: 0; overflow: hidden; }
    #cmu-settings-panel .cmu-key-pad {
      padding: 0 12px 10px;
      opacity: 0;
      transform: translateY(-6px);
      transition: opacity .18s, transform .28s var(--cmu-ease);
    }
    #cmu-settings-panel .cmu-key-popover.cmu-open .cmu-key-pad { opacity: 1; transform: none; transition-delay: .06s; }
    #cmu-settings-panel .cmu-key-popover .sec { margin: 2px 6px 7px; }
    #cmu-settings-panel .qputil .cmu-key-card {
      margin: 0;
      border: 0;
      border-radius: 13px;
      overflow: hidden;
      background: var(--card);
    }
    #cmu-settings-panel .qputil .cmu-key-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 0;
      padding: 9px 10px;
      min-height: 54px;
      border-top: 1px solid var(--bd);
    }
    #cmu-settings-panel .qputil .cmu-key-row:first-child { border-top: 0; }
    #cmu-settings-panel .qputil .cmu-key-row .lbl { flex: 0 0 92px; font-size: 13px; font-weight: 650; color: var(--tx); }
    #cmu-settings-panel .qputil .cmu-key-row .lbl label { display: block; }
    #cmu-settings-panel .qputil .cmu-key-row .note { font-size: 10.5px; color: var(--sub); margin-top: 2px; white-space: nowrap; }
    #cmu-settings-panel .qputil .cmu-key-line { flex: 1 1 auto; min-width: 0; display: flex; align-items: center; gap: 8px; }
    #cmu-settings-panel .qputil .cmu-key-input {
      flex: 1 1 auto;
      min-width: 0;
      height: 34px;
      padding: 0 10px;
      border-radius: 8px;
      border: 1px solid var(--bd);
      background: var(--chip);
      color: var(--tx);
      font-size: 12.5px;
      font-family: inherit;
      outline: 0;
      touch-action: auto !important;
      transition: border-color .15s, box-shadow .2s;
    }
    #cmu-settings-panel .qputil .cmu-key-input:focus { border-color: var(--ac); box-shadow: 0 0 0 3px var(--acbg); }
    #cmu-settings-panel .qputil .cmu-key-copy {
      all: unset;
      box-sizing: border-box;
      flex: 0 0 38px;
      width: 38px;
      height: 34px;
      border-radius: 8px;
      border: 1px solid var(--bd);
      background: transparent;
      color: var(--tx);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background-color .15s, transform .15s var(--cmu-spring);
    }
    #cmu-settings-panel .qputil .cmu-key-copy:active { background: var(--cardh); transform: scale(.92); }
    #cmu-settings-panel .qputil .cmu-key-copy svg { width: 16px; height: 16px; stroke-width: 2; }

    /* 탭 — 선택 표시가 미끄러지듯 따라감, 초록 점 = 그 탭의 기능이 켜져 있음 */
    #cmu-settings-panel .cmu-panel-nav {
      flex: 0 0 auto;
      padding: 2px 12px 10px;
      border-bottom: 1px solid var(--bd);
      transition: padding .28s var(--cmu-ease), border-color .2s;
    }
    #cmu-settings-panel .cmu-tabs-wrap {
      display: grid;
      grid-template-rows: 1fr;
      transition: grid-template-rows .28s var(--cmu-ease), opacity .2s;
    }
    #cmu-settings-panel .cmu-tabs-wrap > div { min-height: 0; overflow: hidden; }
    #cmu-settings-panel .cmu-tabs {
      position: relative;
      display: flex;
      gap: 2px;
      padding: 3px;
      border-radius: 12px;
      background: var(--chip);
      overflow-x: auto;
      scrollbar-width: none;
      -webkit-overflow-scrolling: touch;
    }
    #cmu-settings-panel .cmu-tabs::-webkit-scrollbar { display: none; }
    #cmu-settings-panel .cmu-tab-ind {
      position: absolute;
      top: 3px;
      left: 0;
      width: 0;
      height: 34px;
      border-radius: 9px;
      background: var(--indbg);
      box-shadow: var(--indsh);
      pointer-events: none;
      transition: transform .4s var(--cmu-spring), width .4s var(--cmu-spring);
    }
    #cmu-settings-panel .cmu-tab-ind.cmu-snap { transition: none; }
    #cmu-settings-panel .cmu-tab {
      position: relative;
      z-index: 1;
      flex: 0 0 auto;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 34px;
      padding: 0 11px;
      border: 0;
      border-radius: 9px;
      background: transparent;
      color: var(--sub);
      font-size: 12.5px;
      font-weight: 600;
      font-family: inherit;
      white-space: nowrap;
      cursor: pointer;
      transition: color .2s, padding .28s var(--cmu-ease), gap .28s var(--cmu-ease);
    }
    #cmu-settings-panel .cmu-tab svg { width: 16px; height: 16px; flex: none; stroke-width: 1.7; }
    #cmu-settings-panel .cmu-tab span {
      display: inline-block;
      max-width: 90px;
      overflow: hidden;
      pointer-events: none;
      transition: max-width .28s var(--cmu-ease), opacity .2s;
    }
    #cmu-settings-panel .cmu-tabs.icon-only .cmu-tab { gap: 0; padding: 0 12px; }
    #cmu-settings-panel .cmu-tabs.icon-only .cmu-tab span { max-width: 0; opacity: 0; }
    #cmu-settings-panel .cmu-tab.on { color: var(--acf); }
    #cmu-settings-panel .cmu-tab-dot {
      position: absolute;
      top: 5px;
      right: 5px;
      width: 5px;
      height: 5px;
      border-radius: 99px;
      background: var(--acf);
      opacity: .6;
      transform: scale(0);
      pointer-events: none;
      transition: transform .3s var(--cmu-spring);
    }
    #cmu-settings-panel .cmu-tab.act .cmu-tab-dot { transform: scale(1); }

    /* 본문 */
    #cmu-settings-panel .cmu-panel-body {
      flex: 1 1 auto;
      min-height: 0;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      overscroll-behavior: contain;
      padding: 6px 12px max(16px, env(safe-area-inset-bottom));
      scrollbar-width: none;
    }
    #cmu-settings-panel .cmu-panel-body::-webkit-scrollbar { display: none; }
    #cmu-settings-panel .cmu-menu-card.qputil {
      border: 0;
      border-radius: 0;
      overflow: visible;
      background: transparent;
    }
    #cmu-settings-panel .qputil { color: var(--tx); background: transparent; font-family: inherit; }
    #cmu-settings-panel .cmu-page { display: none; }
    #cmu-settings-panel .cmu-page.on { display: block; }
    #cmu-settings-panel .cmu-page.cmu-in-r > *,
    #cmu-settings-panel .cmu-page.cmu-in-l > * { animation: cmuPageInR .3s var(--cmu-ease) both; }
    #cmu-settings-panel .cmu-page.cmu-in-l > * { animation-name: cmuPageInL; }
    #cmu-settings-panel .cmu-page.cmu-in-r > *:nth-child(2), #cmu-settings-panel .cmu-page.cmu-in-l > *:nth-child(2) { animation-delay: .025s; }
    #cmu-settings-panel .cmu-page.cmu-in-r > *:nth-child(3), #cmu-settings-panel .cmu-page.cmu-in-l > *:nth-child(3) { animation-delay: .05s; }
    #cmu-settings-panel .cmu-page.cmu-in-r > *:nth-child(4), #cmu-settings-panel .cmu-page.cmu-in-l > *:nth-child(4) { animation-delay: .075s; }
    #cmu-settings-panel .cmu-page.cmu-in-r > *:nth-child(n+5), #cmu-settings-panel .cmu-page.cmu-in-l > *:nth-child(n+5) { animation-delay: .1s; }
    @keyframes cmuPageInR { from { opacity: 0; transform: translateX(16px); } }
    @keyframes cmuPageInL { from { opacity: 0; transform: translateX(-16px); } }
    #cmu-settings-panel .qputil .sec {
      margin: 16px 6px 7px;
      font-size: 11.5px;
      font-weight: 600;
      color: var(--sub);
    }
    #cmu-settings-panel .qputil .cmu-page > .sec:first-child,
    #cmu-settings-panel .qputil .cmu-page > .qcard:first-child { margin-top: 6px; }
    #cmu-settings-panel .qputil .qcard {
      margin-bottom: 2px;
      border-radius: 13px;
      overflow: hidden;
      background: var(--card);
    }
    #cmu-settings-panel .qputil .subrow {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0;
      padding: 11px 13px;
      min-height: 54px;
      border-top: 1px solid var(--bd);
      transition: background-color .15s;
    }
    #cmu-settings-panel .qputil .subrow:first-child { border-top: 0; }
    #cmu-settings-panel .qputil .subrow:has(> .sw:not(:disabled)):active { background: var(--cardh); }
    #cmu-settings-panel .qputil .lbl {
      flex: 1;
      min-width: 0;
      font-size: 13.5px;
      font-weight: 600;
      transition: opacity .2s;
    }
    #cmu-settings-panel .qputil .note {
      margin-top: 1px;
      font-size: 11px;
      font-weight: 400;
      line-height: 1.45;
      color: var(--sub);
    }
    #cmu-settings-panel .qputil .subrow.cmu-dep-off > .lbl,
    #cmu-settings-panel .qputil .subrow.cmu-dep-off .cmu-rs-setting-title { opacity: .45; }

    /* 스위치 — 누르면 손잡이가 늘어났다가 튕기듯 이동 */
    #cmu-settings-panel .qputil .sw {
      all: unset;
      box-sizing: border-box;
      position: relative;
      flex: 0 0 48px;
      width: 48px;
      height: 30px;
      border-radius: 999px;
      background: var(--bd);
      cursor: pointer;
      pointer-events: auto;
      touch-action: manipulation !important;
      transition: background-color .22s var(--cmu-ease), opacity .2s, filter .2s;
    }
    #cmu-settings-panel .qputil .sw::after {
      content: "";
      position: absolute;
      top: 4px;
      left: 4px;
      width: 22px;
      height: 22px;
      border-radius: 11px;
      background: rgb(255, 255, 255);
      box-shadow: 0 1px 3px rgba(0, 0, 0, .22);
      transition: transform .34s var(--cmu-spring), width .16s var(--cmu-ease);
    }
    #cmu-settings-panel .qputil .sw.on { background: var(--ac); }
    #cmu-settings-panel .qputil .sw.on::after { transform: translateX(18px); }
    #cmu-settings-panel .qputil .sw:not(:disabled):active::after { width: 27px; }
    #cmu-settings-panel .qputil .sw.on:not(:disabled):active::after { transform: translateX(13px); }
    #cmu-settings-panel .qputil .sw.disabled,
    #cmu-settings-panel .qputil .sw:disabled { opacity: .4; cursor: not-allowed; filter: grayscale(.35); }
    #cmu-settings-panel .qputil .sw:focus-visible { outline: 2px solid var(--ac); outline-offset: 2px; }

    /* 칩 — 체크 표시가 톡 튀어나옴 */
    #cmu-settings-panel .qputil .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      padding: 10px 12px 12px;
      transition: opacity .2s;
    }
    #cmu-settings-panel .qputil .chips.off { opacity: .35; pointer-events: none; }
    #cmu-settings-panel .qputil .chip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      min-height: 34px;
      padding: 7px 11px;
      border-radius: 9px;
      border: 1px solid var(--bd);
      background: var(--chip);
      color: var(--sub);
      font-size: 12.5px;
      font-family: inherit;
      cursor: pointer;
      user-select: none;
      touch-action: manipulation !important;
      transition: background-color .18s, border-color .18s, color .18s, opacity .2s, transform .15s var(--cmu-spring);
    }
    #cmu-settings-panel .qputil .chip:not(:disabled):active { transform: scale(.95); }
    #cmu-settings-panel .qputil .chip .ci {
      width: 14px;
      height: 14px;
      flex: none;
      opacity: .35;
      transform: scale(.6);
      transition: transform .32s var(--cmu-spring), opacity .2s;
    }
    #cmu-settings-panel .qputil .chip.ck { border-color: var(--ac); background: var(--acbg); color: var(--acf); }
    #cmu-settings-panel .qputil .chip.ck .ci { opacity: 1; transform: scale(1); }
    /* 모델 필터 칩은 체크 표시 자리 자체를 모델 아이콘으로 사용한다.
       선택 여부는 칩의 테두리/배경 + 아이콘 명도로 구분한다. */
    #cmu-settings-panel .qputil .chip .ci.cmu-model-filter-icon {
      width: 16px !important;
      height: 16px !important;
      flex: 0 0 16px !important;
      object-fit: contain;
      border-radius: 4px;
      opacity: .48;
      transform: none !important;
      filter: grayscale(.28);
      transition: opacity .18s, filter .18s, transform .15s var(--cmu-spring);
    }
    #cmu-settings-panel .qputil .chip.ck .ci.cmu-model-filter-icon {
      opacity: 1;
      filter: none;
      transform: none !important;
    }
    #cmu-settings-panel .qputil .chip:active .ci.cmu-model-filter-icon { transform: scale(.92) !important; }
    #cmu-settings-panel .qputil .chip .cmu-side-setting-icon {
      width: 15px !important;
      height: 15px !important;
      flex: 0 0 15px !important;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    #cmu-settings-panel .qputil .chip:disabled,
    #cmu-settings-panel .qputil .chip[aria-disabled="true"] { opacity: .38; cursor: not-allowed; filter: grayscale(.45); }

    /* 스테퍼 — 숫자가 위아래로 굴러가며 바뀜 */
    #cmu-settings-panel .qputil .step { display: inline-flex; align-items: center; gap: 10px; flex: none; }
    #cmu-settings-panel .qputil .step-btn {
      all: unset;
      box-sizing: border-box;
      width: 38px;
      height: 34px;
      min-width: 38px;
      border-radius: 9px;
      border: 1px solid var(--bd);
      color: var(--tx);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      line-height: 1;
      cursor: pointer;
      user-select: none;
      touch-action: manipulation !important;
      transition: background-color .15s, transform .15s var(--cmu-spring);
    }
    #cmu-settings-panel .qputil .step-btn:active { background: var(--cardh); transform: scale(.9); }
    #cmu-settings-panel .qputil .step-val {
      display: inline-block;
      min-width: 52px;
      height: 20px;
      overflow: hidden;
      text-align: center;
      font-size: 13px;
      font-weight: 700;
      line-height: 20px;
      color: var(--tx);
      font-variant-numeric: tabular-nums;
    }
    #cmu-settings-panel .qputil .step-val > span { display: inline-block; }
    #cmu-settings-panel .qputil .step-val.cmu-up > span { animation: cmuValUp .24s var(--cmu-ease); }
    #cmu-settings-panel .qputil .step-val.cmu-dn > span { animation: cmuValDn .24s var(--cmu-ease); }
    @keyframes cmuValUp { from { transform: translateY(12px); opacity: .2; } }
    @keyframes cmuValDn { from { transform: translateY(-12px); opacity: .2; } }

    /* 테마 배너 — 아이콘·기울기 효과 없음, 글자 + 스위치만 */
    #cmu-settings-panel .qputil .direct { margin: 0; border: 0; background: transparent; }
    #cmu-settings-panel .qputil .direct .row {
      display: flex;
      align-items: center;
      gap: 12px;
      min-height: 58px;
      padding: 12px 13px;
    }
    #cmu-settings-panel .qputil .direct .tx { flex: 1; min-width: 0; }
    #cmu-settings-panel .qputil .direct .tx b { display: block; font-size: 14px; font-weight: 650; }
    #cmu-settings-panel .qputil .direct .tx span {
      display: block;
      margin-top: 2px;
      font-size: 11.5px;
      color: var(--sub);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* 검색 중 */
    #cmu-settings-panel.cmu-searching .cmu-panel-nav { padding-bottom: 0; border-bottom-color: transparent; }
    #cmu-settings-panel.cmu-searching .cmu-tabs-wrap { grid-template-rows: 0fr; opacity: 0; }
    #cmu-settings-panel.cmu-searching .cmu-page { display: block !important; }
    #cmu-settings-panel.cmu-searching .cmu-page > * { animation: none !important; }
    #cmu-settings-panel.cmu-searching .sec,
    #cmu-settings-panel.cmu-searching .chips,
    #cmu-settings-panel.cmu-searching .direct { display: none !important; }
    #cmu-settings-panel.cmu-searching .subrow.cmu-hit-off { display: none !important; }
    #cmu-settings-panel.cmu-searching .qputil .qcard { margin-bottom: 8px; }
    #cmu-settings-panel.cmu-searching .qputil .qcard:not(:has(.subrow:not(.cmu-hit-off))) { display: none !important; }
    #cmu-settings-panel .cmu-search-empty {
      padding: 48px 16px;
      text-align: center;
      font-size: 13px;
      line-height: 1.7;
      color: var(--sub);
    }

    @media (prefers-reduced-motion: reduce) {
      #cmu-settings-panel,
      #cmu-settings-panel *,
      #cmu-settings-panel *::before,
      #cmu-settings-panel *::after,
      #cmu-settings-scrim {
        animation: none !important;
        transition: none !important;
      }
    }
    #${ID.toast} {
      position: fixed;
      left: 50%;
      bottom: calc(84px + env(safe-area-inset-bottom));
      transform: translateX(-50%) translateY(10px);
      opacity: 0;
      pointer-events: none;
      z-index: 2147483647;
      padding: 8px 12px;
      border-radius: 999px;
      background: rgba(30,30,34,.92);
      color: rgba(255,255,255,.90);
      font-size: 12px;
      box-shadow: 0 10px 28px rgba(0,0,0,.32);
      transition: opacity .16s ease, transform .16s ease;
    }
    #${ID.toast}.show {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }

    #chud-infobar {
      position: absolute;
      left: 0;
      right: 0;
      top: 1px;
      box-sizing: border-box;
      font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 13px;
      font-weight: 500;
      pointer-events: none;
      display: flex;
      align-items: center;
      border-radius: 8px 8px 0 0;
      padding-top: 2px;
      padding-bottom: 2px;
      padding-right: 12px;
      padding-left: var(--cmu-dashboard-pad-left, 12px);
      transform-origin: top left;
      will-change: transform, clip-path;
      z-index: 1;
      color: rgba(255,255,255,.58);
    }
    body[data-theme="light"] #chud-infobar,
    html[data-theme="light"] #chud-infobar { color: rgba(0,0,0,.56); }
    body[data-theme="dark"] #chud-infobar,
    html[data-theme="dark"] #chud-infobar { color: rgba(255,255,255,.58); }

    #chud-info-text {
      display: flex;
      align-items: center;
      gap: 0;
      flex: 1 1 auto;
      min-width: 0;
      overflow: hidden;
      white-space: nowrap;
    }
    .chud-part {
      all: unset;
      display: inline-flex;
      align-items: center;
      pointer-events: auto;
      border-radius: 4px;
      padding: 1px 2px;
      touch-action: manipulation;
      user-select: none;
      transition: background .15s;
      cursor: default;
      white-space: nowrap;
    }
    .chud-sep { opacity: .45; margin: 0 3px; pointer-events: none; user-select: none; }
    .chud-small-icon { margin-right: 5px; flex-shrink: 0; }
    .chud-cracker-icon { margin: 0 4px 0 0; flex-shrink: 0; }

    #chud-sidebar {
      position: absolute;
      left: 0;
      right: 0;
      top: 0;
      box-sizing: border-box;
      font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 13px;
      font-weight: 500;
      pointer-events: none;
      display: flex;
      align-items: center;
      border-radius: 8px 8px 0 0;
      padding-top: 3px;
      padding-bottom: 0;
      padding-right: 12px;
      padding-left: var(--cmu-dashboard-pad-left, 12px);
      transform-origin: top left;
      will-change: transform, clip-path;
      z-index: 2;
      color: rgba(255,255,255,.58);
    }
    body[data-theme="light"] #chud-sidebar,
    html[data-theme="light"] #chud-sidebar { color: rgba(0,0,0,.56); }
    body[data-theme="dark"] #chud-sidebar,
    html[data-theme="dark"] #chud-sidebar { color: rgba(255,255,255,.58); }

    #chud-side-content {
      display: flex;
      align-items: center;
      overflow: visible;
      white-space: nowrap;
      flex: 1 1 auto;
      min-width: 0;
      width: 100%;
      max-width: none;
    }
    .chud-action-btn {
      all: unset;
      position: relative;
      pointer-events: auto;
      cursor: pointer;
      margin-left: 7px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      width: 20px;
      height: 20px;
      min-width: 20px;
      min-height: 20px;
      flex: 0 0 20px;
      box-sizing: border-box;
      line-height: 0;
      font-weight: 700;
      transition: color .15s, opacity .15s, transform .15s;
      touch-action: manipulation;
      background: transparent !important;
      border: 0 !important;
      box-shadow: none !important;
      outline: 0;
      color: inherit;
    }
    #chud-model-btn { margin-left: 0; }
    .chud-action-btn:hover { background: transparent !important; opacity: .95; }
    .chud-action-btn.is-active { background: transparent !important; color: currentColor; }
    .chud-btn-icon { flex: 0 0 auto; display: block; width: 16.5px; height: 16.5px; pointer-events: none; }
    .chud-lore-icon { width: 17px; height: 17px; transform: scale(1.04); transform-origin: center; }

    /* 큐브 버튼용 소형 모델 선택기: 원본 메뉴는 실제 선택 동작만 담당한다. */
    html.cmu-compact-model-probing :is([data-radix-popper-content-wrapper], [data-radix-menu-content]),
    html.cmu-compact-model-selecting :is([data-radix-popper-content-wrapper], [data-radix-menu-content]),
    [data-cmu-compact-model-native="1"] {
      opacity: 0 !important;
      pointer-events: none !important;
    }
    #cmu-compact-model-menu {
      position: fixed !important;
      z-index: 2147483647 !important;
      opacity: 1 !important;
      pointer-events: auto !important;
      display: flex;
      flex-direction: column;
      gap: 2px;
      width: min(170px, calc(100vw - 20px));
      max-height: min(330px, calc(100vh - 24px));
      max-height: min(330px, calc(100dvh - 24px));
      overflow-x: hidden;
      overflow-y: auto;
      box-sizing: border-box;
      padding: 5px;
      border: 1px solid rgba(255,255,255,.18);
      border-radius: 11px;
      background: rgba(28,28,30,.97);
      color: rgba(255,255,255,.9);
      box-shadow: 0 12px 34px rgba(0,0,0,.48);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      overscroll-behavior: contain;
      font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif;
      scrollbar-width: thin;
    }
    #cmu-compact-model-menu button {
      all: unset;
      display: flex;
      align-items: center;
      gap: 7px;
      min-height: 34px;
      box-sizing: border-box;
      padding: 5px 7px;
      border-radius: 8px;
      color: inherit;
      cursor: pointer;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
    }
    #cmu-compact-model-menu button:active { transform: scale(.98); }
    #cmu-compact-model-menu button:disabled {
      opacity: .42;
      cursor: default;
      transform: none;
    }
    #cmu-compact-model-menu button.is-selected {
      background: rgba(255,255,255,.14);
      color: #fff;
    }
    #cmu-compact-model-menu .cmu-compact-model-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: 0 0 17px;
      width: 17px;
      height: 17px;
      color: rgba(255,255,255,.62);
    }
    #cmu-compact-model-menu .cmu-compact-model-icon img {
      display: block;
      width: 17px;
      height: 17px;
      object-fit: contain;
    }
    #cmu-compact-model-menu .cmu-compact-model-label {
      flex: 1 1 auto;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 12.5px;
      font-weight: 650;
      line-height: 1.15;
    }
    #cmu-compact-model-menu .cmu-compact-model-recommend {
      flex: 0 0 auto;
      max-width: none;
      white-space: nowrap;
      margin-left: 3px;
      padding: 2px 5px;
      border-radius: 5px;
      background: rgba(77, 190, 107, .16);
      color: #78d88d;
      font-size: 9px;
      font-weight: 850;
      line-height: 1.1;
      letter-spacing: -.1px;
    }
    #cmu-compact-model-menu .cmu-compact-model-check {
      flex: 0 0 12px;
      width: 12px;
      color: #8fd69c;
      font-size: 13px;
      font-weight: 900;
      text-align: center;
    }
    body[data-theme="light"] #cmu-compact-model-menu,
    html[data-theme="light"] #cmu-compact-model-menu {
      border-color: rgba(0,0,0,.16);
      background: rgba(255,255,255,.98);
      color: rgba(0,0,0,.76);
      box-shadow: 0 12px 34px rgba(0,0,0,.22);
    }
    body[data-theme="light"] #cmu-compact-model-menu button.is-selected,
    html[data-theme="light"] #cmu-compact-model-menu button.is-selected {
      background: rgba(0,0,0,.09);
      color: rgba(0,0,0,.9);
    }
    body[data-theme="light"] #cmu-compact-model-menu .cmu-compact-model-recommend,
    html[data-theme="light"] #cmu-compact-model-menu .cmu-compact-model-recommend {
      background: rgba(26, 145, 63, .11);
      color: #218a42;
    }


    /* 4.3.0.8: 원본 행 직접 선택은 유지하고, 모델 팝업만 더 작고 단일 박스로 정리. */
    [data-cmu-compact-native-live="1"] {
      opacity: 1 !important;
      visibility: visible !important;
      pointer-events: auto !important;
      position: fixed !important;
      right: auto !important;
      bottom: auto !important;
      transform: none !important;
      min-width: 0 !important;
      width: min(176px, calc(100vw - 18px)) !important;
      max-width: calc(100vw - 18px) !important;
      z-index: 2147483647 !important;
      filter: none !important;
      /* Radix 바깥 껍데기는 보이지 않게 해서 박스가 하나만 보이게 한다. */
      padding: 0 !important;
      margin: 0 !important;
      border: 0 !important;
      border-radius: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
      outline: 0 !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
    }
    [data-cmu-compact-native-live="1"] > :not([data-cmu-compact-native-live-root="1"]):has([data-cmu-compact-native-live-root="1"]) {
      padding: 0 !important;
      margin: 0 !important;
      border: 0 !important;
      border-radius: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
      outline: 0 !important;
    }
    [data-cmu-compact-native-live-branch="1"] {
      box-sizing: border-box !important;
      min-width: 0 !important;
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      border: 0 !important;
      border-radius: 0 !important;
      background: transparent !important;
      background-image: none !important;
      box-shadow: none !important;
      outline: 0 !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
    }
    [data-cmu-compact-native-live-root="1"] {
      box-sizing: border-box !important;
      display: block !important;
      min-width: 0 !important;
      width: 100% !important;
      max-width: 100% !important;
      max-height: var(--cmu-compact-native-max-h, calc(100dvh - 24px)) !important;
      overflow-x: hidden !important;
      overflow-y: auto !important;
      padding: 4px !important;
      border: 1px solid rgba(255,255,255,.13) !important;
      border-radius: 10px !important;
      background: rgba(28,28,30,.985) !important;
      box-shadow: 0 8px 22px rgba(0,0,0,.40), inset 0 1px 0 rgba(255,255,255,.03) !important;
      backdrop-filter: blur(14px) saturate(112%) !important;
      -webkit-backdrop-filter: blur(14px) saturate(112%) !important;
      overscroll-behavior: contain !important;
      scrollbar-width: none !important;
      font-size: 11.5px !important;
    }
    [data-cmu-compact-native-live-root="1"]::-webkit-scrollbar { display: none !important; }
    [data-cmu-compact-native-live-hide="1"],
    [data-cmu-compact-native-live-row="1"] [data-cmu-compact-native-live-desc="1"] {
      display: none !important;
    }
    [data-cmu-compact-native-live-row="1"] {
      box-sizing: border-box !important;
      position: relative !important;
      width: 100% !important;
      min-width: 0 !important;
      min-height: 31px !important;
      max-height: 34px !important;
      margin: 0 !important;
      padding: 0 !important;
      border: 0 !important;
      border-radius: 7px !important;
      overflow: hidden !important;
      pointer-events: auto !important;
      touch-action: manipulation !important;
      -webkit-tap-highlight-color: transparent !important;
    }
    [data-cmu-compact-native-live-row="1"] + [data-cmu-compact-native-live-row="1"] {
      margin-top: 1px !important;
    }
    [data-cmu-compact-native-live-action="1"] {
      box-sizing: border-box !important;
      display: flex !important;
      align-items: center !important;
      width: 100% !important;
      min-width: 0 !important;
      min-height: 31px !important;
      max-height: 34px !important;
      margin: 0 !important;
      padding: 4px 6px !important;
      gap: 5px !important;
      border: 0 !important;
      border-radius: 7px !important;
      overflow: hidden !important;
      pointer-events: auto !important;
      touch-action: manipulation !important;
      -webkit-tap-highlight-color: transparent !important;
      font-size: 11.5px !important;
    }
    [data-cmu-compact-native-live-action="1"] > *,
    [data-cmu-compact-native-live-action="1"] > * > * {
      min-width: 0 !important;
    }
    [data-cmu-compact-native-live-row="1"] :is(img[src*="model-icon"], img[srcset*="model-icon"]) {
      flex: 0 0 16px !important;
      width: 16px !important;
      height: 16px !important;
      object-fit: contain !important;
      margin: 0 !important;
    }
    [data-cmu-compact-native-live-title="1"] {
      flex: 0 1 auto !important;
      min-width: 0 !important;
      max-width: 86px !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      white-space: nowrap !important;
      font-size: 11.5px !important;
      font-weight: 700 !important;
      line-height: 1.1 !important;
      letter-spacing: -.015em !important;
    }
    [data-cmu-compact-native-live-badge="1"] {
      flex: 0 0 auto !important;
      white-space: nowrap !important;
      font-size: 9.5px !important;
      line-height: 1.05 !important;
      opacity: .9 !important;
    }
    [data-cmu-compact-native-live-recommend="1"] {
      flex: 0 0 auto !important;
      white-space: nowrap !important;
      max-width: none !important;
      /* 4.3.0.10: 수량 배지와 권장 딱지가 붙어 보이지 않게 한 칸 여백. */
      margin-left: 4px !important;
      padding: 1px 3px !important;
      border-radius: 4px !important;
      font-size: 8.5px !important;
      line-height: 1.1 !important;
      letter-spacing: -.02em !important;
    }
    [data-cmu-compact-native-live-row="1"]:has([data-cmu-compact-native-live-recommend="1"]) [data-cmu-compact-native-live-title="1"] {
      max-width: 68px !important;
    }
    [data-cmu-compact-native-live-row="1"] :is(span, p, div) {
      line-height: 1.1 !important;
    }
    [data-cmu-compact-native-live-row="1"]:is([aria-selected="true"], [aria-checked="true"], [data-state="checked"]),
    [data-cmu-compact-native-live-row="1"]:has(:is([aria-selected="true"], [aria-checked="true"], [data-state="checked"])) {
      background: rgba(255,255,255,.105) !important;
      box-shadow: inset 2px 0 0 rgba(255,255,255,.45) !important;
    }
    [data-cmu-compact-native-live-row="1"]:active {
      background: rgba(255,255,255,.08) !important;
    }
    body[data-theme="light"] [data-cmu-compact-native-live-root="1"],
    html[data-theme="light"] [data-cmu-compact-native-live-root="1"] {
      border-color: rgba(0,0,0,.10) !important;
      background: rgba(252,252,253,.985) !important;
      box-shadow: 0 8px 22px rgba(0,0,0,.16), inset 0 1px 0 rgba(255,255,255,.8) !important;
    }
    body[data-theme="light"] [data-cmu-compact-native-live-row="1"]:is([aria-selected="true"], [aria-checked="true"], [data-state="checked"]),
    html[data-theme="light"] [data-cmu-compact-native-live-row="1"]:is([aria-selected="true"], [aria-checked="true"], [data-state="checked"]),
    body[data-theme="light"] [data-cmu-compact-native-live-row="1"]:has(:is([aria-selected="true"], [aria-checked="true"], [data-state="checked"])),
    html[data-theme="light"] [data-cmu-compact-native-live-row="1"]:has(:is([aria-selected="true"], [aria-checked="true"], [data-state="checked"])) {
      background: rgba(0,0,0,.065) !important;
      box-shadow: inset 2px 0 0 rgba(0,0,0,.32) !important;
    }

@media (max-width: 520px) {
      #chud-infobar { font-size: 12px; }
      .chud-sep { margin: 0 2px; }
      .chud-part { padding: 1px; }
      /* 좁은 화면에서도 설치된 바로가기 아이콘을 한 줄에 최대한 유지한다. */
      #chud-sidebar { padding-right: 8px; }
      #chud-side-content { width: 100%; max-width: none; overflow: visible; }
      .chud-action-btn {
        margin-left: 3px;
        width: 18px;
        min-width: 18px;
        flex: 0 0 18px;
      }
      #chud-model-btn { margin-left: 0; }
      .chud-btn-icon { width: 15px; height: 15px; }
      .chud-lore-icon { width: 15.5px; height: 15.5px; }
    }

    .crack-ui-empty-send-blocked {
      opacity: .50 !important;
      cursor: not-allowed !important;
      filter: grayscale(.22) !important;
    }
    .crack-ui-empty-send-blocked svg { pointer-events: none !important; }

    .igx-inline-overlay-host { position: relative !important; }
    #igx-live-popup {
      --bg-main: rgba(20, 20, 20, .92);
      --border-main: rgba(255, 255, 255, .12);
      --text-title: rgba(255, 255, 255, .85);
      --btn-border: rgba(255, 255, 255, .14);
      --btn-bg: rgba(255, 255, 255, .06);
      --btn-bg-hover: rgba(255, 255, 255, .10);
      --text-unknown: rgba(255, 255, 255, .80);
      --text-name: rgba(255, 255, 255, .88);
      --bg-bitem: rgba(255, 255, 255, .04);
      --c-active: #3ddc84;
      --c-degraded: #ffd54a;
      --c-impacted: #ff5c5c;
      --c-unknown: #9aa0a6;
      font-family: system-ui, -apple-system, Segoe UI, Roboto, "Noto Sans KR", Arial;
      color: var(--text-title);
      box-sizing: border-box;
    }
    #igx-live-popup.igx-light {
      --bg-main: rgba(250, 250, 250, .92);
      --border-main: rgba(0, 0, 0, .12);
      --text-title: rgba(0, 0, 0, .85);
      --btn-border: rgba(0, 0, 0, .14);
      --btn-bg: rgba(0, 0, 0, .06);
      --btn-bg-hover: rgba(0, 0, 0, .10);
      --text-name: rgba(0, 0, 0, .88);
      --text-unknown: rgba(0, 0, 0, .60);
      --bg-bitem: rgba(0, 0, 0, .04);
      --c-active: #1da851;
      --c-degraded: #d49500;
      --c-impacted: #e03535;
      --c-unknown: #7b8086;
    }
    #igx-live-popup * { box-sizing: border-box; }
    #igx-live-popup.inline {
      position: absolute !important;
      top: 6px !important;
      left: 0 !important;
      right: 0 !important;
      width: auto !important;
      max-width: none !important;
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
      backdrop-filter: none !important;
      transform: none !important;
      cursor: default !important;
      margin: 0 !important;
      padding: 0 !important;
      border-radius: 0 !important;
      z-index: 3 !important;
      overflow: visible !important;
      pointer-events: none !important;
      display: block !important;
    }
    #igx-live-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      gap: 4px;
    }
    #igx-live-popup.inline #igx-live-head {
      background: transparent;
      border: none;
      padding: 0 4px !important;
      min-height: 0 !important;
      pointer-events: auto;
    }
    #igx-live-left {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      flex: 1;
      overflow: hidden;
    }
    #igx-live-actions { display: flex; gap: 2px; align-items: center; flex: 0 0 auto; }
    .inline-icon {
      width: 13px;
      height: 13px;
      flex: 0 0 auto;
      opacity: .72;
      color: var(--text-unknown);
    }
    #igx-live-popup.inline .igx-btn {
      width: 18px !important;
      height: 18px !important;
      min-width: 18px !important;
      padding: 0 !important;
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-title);
      opacity: .65;
      border-radius: 8px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      line-height: 1;
      pointer-events: auto;
    }
    #igx-live-popup.inline .igx-btn:hover { background: var(--btn-bg); opacity: 1; }
    #igx-live-barline {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
      flex: 1;
      white-space: nowrap;
      color: var(--text-unknown);
      font-size: 11px;
      overflow-x: auto;
      scrollbar-width: none;
      -ms-overflow-style: none;
      touch-action: pan-x !important;
      overscroll-behavior-x: contain;
    }
    #igx-live-barline::-webkit-scrollbar { display: none; }
    #igx-live-popup.inline .bitem { flex: 0 0 auto; }

    /* 라존데 모델 선택은 설정 패널 한 곳에서만 관리한다.
       인라인 본체에는 모델 계열/설정용 보조 UI를 만들지 않는다. */
    #cmu-settings-panel .qputil .qcard #g-rs .cmu-rs-setting-group {
      display: block !important;
      min-height: 0 !important;
      padding: 0 !important;
      margin: 0 !important;
      border-top: 1px solid var(--bd) !important;
    }
    #cmu-settings-panel .qputil .qcard #g-rs .cmu-rs-setting-group:first-child {
      border-top: 0 !important;
    }
    #g-rs .cmu-rs-setting-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      min-height: 50px;
      padding: 10px 13px;
      box-sizing: border-box;
    }
    #g-rs .cmu-rs-setting-title {
      display: flex !important;
      flex: 1 1 auto !important;
      min-width: 0 !important;
      flex-direction: column;
      align-items: flex-start;
      gap: 3px;
      line-height: 1.2;
    }
    #g-rs .cmu-rs-setting-title strong {
      display: block;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: var(--tx);
      font-size: 13px;
      font-weight: 700;
    }
    #g-rs .cmu-rs-setting-title small {
      color: var(--sub);
      font-size: 10.5px;
      font-weight: 500;
      white-space: nowrap;
    }
    #g-rs .cmu-rs-setting-head .sw {
      flex: 0 0 48px !important;
      margin-left: auto;
    }
    #g-rs .cmu-rs-setting-models {
      display: flex !important;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px;
      width: 100%;
      margin: 0 !important;
      padding: 0 13px 12px !important;
      box-sizing: border-box;
    }
    #g-rs .cmu-rs-setting-models .chip {
      min-height: 34px !important;
      max-width: 100%;
      padding: 7px 10px !important;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    #igx-live-popup.inline .bitem {
      --rs-score-color: var(--text-unknown);
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: transparent;
      border: none;
      padding: 1px 2px !important;
      min-height: 0 !important;
      border-radius: 999px;
      white-space: nowrap;
    }
    #igx-live-popup.inline .bitem:is(.s-active, .b-active) { --rs-score-color: var(--c-active); }
    #igx-live-popup.inline .bitem:is(.s-degraded, .b-degraded) { --rs-score-color: var(--c-degraded); }
    #igx-live-popup.inline .bitem:is(.s-impacted, .b-impacted) { --rs-score-color: var(--c-impacted); }
    #igx-live-popup.inline .bitem:is(.s-unknown, .b-unknown) { --rs-score-color: var(--text-unknown); }
    #igx-live-popup.inline .bname,
    #igx-live-popup.inline .bscore,
    #igx-live-popup.inline .blat { line-height: 1 !important; }
    #igx-live-popup.inline .bname { opacity: 1; font-weight: 700; color: var(--text-title) !important; }
    #igx-live-popup.inline .bscore {
      color: var(--rs-score-color) !important;
      font-weight: 900;
    }
    #igx-live-popup.inline .blat { color: var(--text-name) !important; opacity: .75; }
    #igx-live-popup.inline .bdot {
      width: 6px !important;
      height: 6px !important;
      border-radius: 999px;
      display: inline-block;
      color: var(--rs-score-color) !important;
      background: var(--rs-score-color) !important;
      background-color: var(--rs-score-color) !important;
      flex: 0 0 auto;
    }

    .cmu-message-badge {
      flex: 0 0 auto;
      width: fit-content;
      max-width: 100%;
      height: 1.5rem;
      min-height: 1.5rem;
      margin: 0;
      padding: .25rem .5rem;
      border: 0 !important;
      border-radius: 4px;
      background-color: transparent !important;
      background-image: none !important;
      color: hsl(var(--line-gray-2, 0 0% 65%)) !important;
      font-size: 12px;
      font-weight: 500;
      line-height: inherit;
      white-space: nowrap;
      user-select: none;
      pointer-events: none;
      box-sizing: border-box;
      opacity: .92;
    }
    .cmu-message-badge[data-placement="fallback"] { margin: 4px 10px 0 auto; }
    .cmu-user-badge-row {
      width: 100%;
      flex-basis: 100%;
      text-align: right;
      pointer-events: none;
      margin-top: 2px;
    }
    .cmu-user-badge-row .cmu-message-badge {
      display: inline-flex;
      height: 18px;
      min-height: 18px;
      align-items: center;
      justify-content: flex-end;
      font-size: 11px;
      opacity: .75;
    }
  `);
    addStyle(`
    /*
     * iOS 네이티브 텍스트 선택은 fixed/transform 레이어의 좌표가 바뀌면
     * 선택 손잡이의 표시 위치와 실제 터치 위치가 어긋날 수 있다.
     * 유저노트가 열린 동안에는 pointer-events만 끄지 않고 CMU의 고정 UI를
     * 합성 레이어에서 완전히 제외한다.
     */
    html.cmu-user-note-open #${ID.topZone},
    html.cmu-user-note-open #${ID.leftMenuZone},
    html.cmu-user-note-open #${ID.leftMenuHandle},
    html.cmu-user-note-open #${ID.rightMenuZone},
    html.cmu-user-note-open #${ID.rightMenuHandle},
    html.cmu-user-note-open #${ID.menuSwipeZone},
    html.cmu-user-note-open #${ID.toolbarWrapper},
    html.cmu-user-note-open #${ID.inputCounterWrap},
    html.cmu-user-note-open #${ID.dashboard},
    html.cmu-user-note-open #${ID.dashboardSidebar},
    html.cmu-user-note-open #${ID.logCaptureBar},
    html.cmu-user-note-open #${ID.panel} {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
    }
    /* 유저노트 편집영역은 브라우저의 네이티브 드래그 선택을 그대로 사용한다. */
    html.cmu-user-note-open :is([role="dialog"], [aria-modal="true"], [data-radix-dialog-content], [data-vaul-drawer]) textarea,
    html.cmu-user-note-open textarea[placeholder*="노트"],
    html.cmu-user-note-open textarea[aria-label*="노트"] {
      pointer-events: auto !important;
      touch-action: auto !important;
      user-select: text !important;
      -webkit-user-select: text !important;
    }
    `);
    function applyState() {
        const html = document.documentElement;
        const active = shouldRun();
        // 유저노트가 떠 있는 동안에는 CMU의 페이지 레이아웃/합성 레이어를
        // 통째로 휴면시켜 iOS 선택 손잡이가 순정 좌표계만 사용하게 한다.
        const userNoteOpen = syncCmuUserNoteDialogState();
        const layoutActive = active && !userNoteOpen;
        html.classList.toggle('cmu-enabled', layoutActive);
        html.classList.toggle('cmu-auto-hide', layoutActive && settings.autoHideHeader && isEpisodePath());
        if (!html.classList.contains('cmu-auto-hide'))
            restoreGlobalHeaderShellLayout();
        html.classList.toggle('cmu-hide-ending', active && settings.hideEndingHint);
        html.classList.toggle('cmu-wide', layoutActive && settings.wideView);
        const cmuTheme = detectCmuTheme();
        const externalThemeProvider = detectCmuExternalThemeProvider();
        const externalThemeLocked = !!externalThemeProvider;
        const themeActive = layoutActive && settings.themeSkin && isChatRoomPath() && !externalThemeLocked;
        const themeChatBorderlessOnly = themeActive && cmuThemeShouldUseChatBorderlessOnly();
        const themeFxActive = themeActive;
        html.classList.toggle('cmu-theme-active', themeActive);
        html.setAttribute('data-cmu-external-theme', externalThemeProvider || 'none');
        if (!externalThemeLocked) {
            html.classList.toggle('sgb-bg-room', themeActive);
            html.classList.toggle('sgb-bg-active', themeActive);
            html.classList.remove('sgb-bg-image-active');
        }
        html.classList.toggle('cmu-phone-viewport', isMobileLike());
        const mobileEdgeActive = layoutActive && isChatRoomPath() && isCmuEdgeMenuViewport();
        html.classList.toggle('cmu-left-menu-enabled', mobileEdgeActive && !!settings.mobileLeftMenuButton);
        html.classList.toggle('cmu-right-menu-enabled', mobileEdgeActive && !!settings.mobileRightMenuButton);
        html.classList.toggle('cmu-menu-swipe-zone-enabled', mobileEdgeActive && !!settings.mobileMenuSwipeZone);
        html.classList.toggle('cmu-hide-stat-bar', layoutActive && isChatRoomPath() && isMobileLike() && !!settings.hideStatBar);
        if (!userNoteOpen)
            scheduleCmuStatBarMark();
        html.setAttribute('data-cmu-theme', cmuTheme);
        html.setAttribute('data-cmu-ui-style', 'borderless');
        html.removeAttribute('data-cmu-selected-ui-style');
        html.setAttribute('data-cmu-chat-borderless-only', themeChatBorderlessOnly ? '1' : '0');
        html.setAttribute('data-cmu-native-ui-mode', cmuThemeUiModeForSettings() || 'unknown');
        html.setAttribute('data-cmu-theme-dialogue', themeFxActive && settings.themeDialogue !== false ? 'on' : 'off');
        html.setAttribute('data-cmu-theme-thought', themeFxActive && settings.themeThought !== false ? 'on' : 'off');
        html.setAttribute('data-cmu-theme-italic', themeFxActive && settings.themeItalic !== false ? 'on' : 'off');
        html.setAttribute('data-cmu-theme-strong', themeFxActive && settings.themeStrong !== false ? 'on' : 'off');
        html.setAttribute('data-cmu-theme-code', themeFxActive && settings.themeCode !== false ? 'on' : 'off');
        html.setAttribute('data-cmu-theme-markdown', themeFxActive && settings.themeMarkdown !== false ? 'on' : 'off');
        if (!externalThemeLocked) {
            html.setAttribute('data-sgb-theme', cmuTheme);
            html.setAttribute('data-sgb-ui-style', 'borderless');
            html.setAttribute('data-sgb-theme-colors', 'on');
            html.setAttribute('data-sgb-dialogue-bg', themeFxActive && settings.themeDialogue !== false ? 'on' : 'off');
            html.setAttribute('data-sgb-thought-bg', themeFxActive && settings.themeThought !== false ? 'on' : 'off');
            html.setAttribute('data-sgb-code-bg', themeFxActive && settings.themeCode !== false ? 'on' : 'off');
            html.setAttribute('data-sgb-italic-bg', themeFxActive && settings.themeItalic !== false ? 'on' : 'off');
            html.setAttribute('data-sgb-strong-bg', themeFxActive && settings.themeStrong !== false ? 'on' : 'off');
            html.setAttribute('data-sgb-text-shadow', themeActive ? 'on' : 'off');
            html.setAttribute('data-sgb-text-shadow-tone', cmuTheme);
        }
        if (externalThemeLocked) {
            if (!cmuExternalThemeCleanupDone) {
                cmuExternalThemeCleanupDone = true;
                try {
                    clearCmuOwnedThemeDecorations();
                }
                catch (_) { }
                setTimeout(() => {
                    const panel = document.getElementById(ID.panel);
                    if (panel?.classList.contains('open'))
                        renderSettingsPanel();
                }, 0);
            }
        }
        else {
            cmuExternalThemeCleanupDone = false;
        }
        html.style.setProperty('--cmu-font-scale', String(clamp(settings.fontScale, 80, 130) / 100));
        html.style.setProperty('--cmu-image-scale', `${clamp(settings.imageScale, 50, 100)}%`);
        html.classList.toggle('cmu-pause-animated-thumbs', active && !!settings.pauseAnimatedThumbs);
        const thumbEnabled = active && !!settings.pauseAnimatedThumbs;
        if (CMU_DOM_WATCH.thumbEnabled !== thumbEnabled) {
            CMU_DOM_WATCH.thumbEnabled = thumbEnabled;
            scheduleAnimatedThumbState();
        }
        syncCmuDomWatchOptions();
        scheduleCmuInputCounterSync();
    }
    function normalizeAnimatedThumbUrl(url) {
        try {
            return new URL(String(url || ''), location.href).href;
        }
        catch (_) {
            return String(url || '');
        }
    }
    function isAnimatedThumbUrl(url) {
        const value = String(url || '');
        return /_gif\d*(?=\.[a-z0-9]+(?:[?#]|$))/i.test(value) || /\.gif(?:[?#]|$)/i.test(value);
    }
    function findAnimatedThumbSrcsetUrl(srcset) {
        const entries = String(srcset || '').split(',');
        for (const entry of entries) {
            const url = entry.trim().split(/\s+/)[0] || '';
            if (isAnimatedThumbUrl(url))
                return url;
        }
        return '';
    }
    function addUniqueAnimatedThumbUrl(list, url) {
        if (!url || isAnimatedThumbUrl(url))
            return;
        const value = String(url);
        const key = normalizeAnimatedThumbUrl(value);
        if (!list.some(item => normalizeAnimatedThumbUrl(item) === key))
            list.push(value);
    }
    function collectAnimatedThumbUrlMap() {
        if (animatedThumbUrlMap)
            return animatedThumbUrlMap;
        const map = new Map();
        const addPair = (animatedUrl, stillUrl) => {
            if (!animatedUrl || !stillUrl || !isAnimatedThumbUrl(animatedUrl) || isAnimatedThumbUrl(stillUrl))
                return;
            map.set(String(animatedUrl), String(stillUrl));
            map.set(normalizeAnimatedThumbUrl(animatedUrl), normalizeAnimatedThumbUrl(stillUrl));
        };
        const walk = (value, depth = 0) => {
            if (!value || depth > 14)
                return;
            if (Array.isArray(value)) {
                value.forEach(item => walk(item, depth + 1));
                return;
            }
            if (typeof value !== 'object')
                return;
            if (typeof value.gif600 === 'string' && typeof value.w600 === 'string')
                addPair(value.gif600, value.w600);
            if (typeof value.gif === 'string' && typeof value.image === 'string')
                addPair(value.gif, value.image);
            if (typeof value.animated === 'string' && typeof value.thumbnail === 'string')
                addPair(value.animated, value.thumbnail);
            Object.values(value).forEach(item => walk(item, depth + 1));
        };
        const nextData = document.getElementById('__NEXT_DATA__');
        if (nextData?.textContent) {
            try {
                walk(JSON.parse(nextData.textContent));
            }
            catch (_) { }
        }
        animatedThumbUrlMap = map;
        return map;
    }
    function getAnimatedThumbLiveSource(img) {
        if (!(img instanceof HTMLImageElement))
            return '';
        const src = img.getAttribute('src') || '';
        if (isAnimatedThumbUrl(src))
            return src;
        const current = img.currentSrc || img.src || '';
        if (isAnimatedThumbUrl(current))
            return current;
        return findAnimatedThumbSrcsetUrl(img.getAttribute('srcset') || '');
    }
    function isAppliedAnimatedThumbStillCurrent(img) {
        const still = img?.dataset?.cmuAnimatedThumbStillSrc || '';
        const current = img?.getAttribute?.('src') || img?.currentSrc || img?.src || '';
        return !!still && !!current && normalizeAnimatedThumbUrl(still) === normalizeAnimatedThumbUrl(current);
    }
    function getAnimatedThumbSource(img) {
        const live = getAnimatedThumbLiveSource(img);
        if (live)
            return live;
        const saved = img?.dataset?.cmuAnimatedThumbSource || '';
        if (saved && isAnimatedThumbUrl(saved) && isAppliedAnimatedThumbStillCurrent(img))
            return saved;
        return '';
    }
    function getAnimatedThumbSiblingCandidates(img) {
        const result = [];
        const root = img?.parentElement;
        if (!root)
            return result;
        root.querySelectorAll(':scope > img, :scope > picture > img').forEach(other => {
            if (other === img || isAnimatedThumbExcluded(other))
                return;
            const src = other.getAttribute('src') || other.currentSrc || other.src || '';
            if (!src || isAnimatedThumbUrl(src) || !/\.(?:webp|png|jpe?g)(?:[?#]|$)/i.test(src))
                return;
            addUniqueAnimatedThumbUrl(result, src);
        });
        return result;
    }
    function getBaseAnimatedThumbCandidates(animatedUrl) {
        if (!animatedUrl)
            return [];
        const raw = String(animatedUrl);
        const cacheKey = normalizeAnimatedThumbUrl(raw);
        const cached = animatedThumbCandidateCache.get(cacheKey);
        if (cached)
            return cached.slice();
        const candidates = [];
        const map = collectAnimatedThumbUrlMap();
        addUniqueAnimatedThumbUrl(candidates, map.get(raw) || map.get(cacheKey));
        const suffix = raw.match(/_gif(\d*)(\.[a-z0-9]+)(?=([?#]|$))/i);
        if (suffix) {
            const size = suffix[1] || '600';
            const extension = suffix[2];
            addUniqueAnimatedThumbUrl(candidates, raw.replace(/(?:_q\d+)+_gif\d*\.[a-z0-9]+(?=([?#]|$))/i, `_w${size}${extension}`));
            addUniqueAnimatedThumbUrl(candidates, raw.replace(/_gif\d*\.[a-z0-9]+(?=([?#]|$))/i, `_w${size}${extension}`));
        }
        addUniqueAnimatedThumbUrl(candidates, raw.replace(/\.gif(?=([?#]|$))/i, '.webp'));
        addUniqueAnimatedThumbUrl(candidates, raw.replace(/\.gif(?=([?#]|$))/i, '.png'));
        addUniqueAnimatedThumbUrl(candidates, raw.replace(/\.gif(?=([?#]|$))/i, '.jpg'));
        if (!animatedThumbCandidateCache.has(cacheKey) && animatedThumbCandidateCache.size >= 400) {
            animatedThumbCandidateCache.clear();
        }
        animatedThumbCandidateCache.set(cacheKey, candidates.slice());
        return candidates;
    }
    function getAnimatedThumbCandidates(animatedUrl, img) {
        const candidates = [];
        getBaseAnimatedThumbCandidates(animatedUrl).forEach(url => addUniqueAnimatedThumbUrl(candidates, url));
        getAnimatedThumbSiblingCandidates(img).forEach(url => addUniqueAnimatedThumbUrl(candidates, url));
        return candidates;
    }
    function isAnimatedThumbExcluded(img) {
        if (!(img instanceof HTMLImageElement))
            return true;
        if (isOwnElement(img))
            return true;
        if (img.closest('#sgb-bg-root, #sgb-bg-settings-modal, #sgb-bg-panel, #eic-modal-content, #crack-ai-panel, [data-cmu-animated-thumb-ignore]'))
            return true;
        const alt = (img.getAttribute('alt') || '').trim().toLowerCase();
        const source = getAnimatedThumbLiveSource(img) || img.getAttribute('src') || img.currentSrc || img.src || '';
        if (alt === 'crack original')
            return true;
        if (/\/crack\/original\//i.test(source))
            return true;
        if (/\/asset\/badge\//i.test(source))
            return true;
        return false;
    }
    function clearAnimatedThumbTracking(img) {
        if (!img?.dataset)
            return;
        delete img.dataset.cmuAnimatedThumb;
        delete img.dataset.cmuAnimatedThumbSource;
        delete img.dataset.cmuAnimatedThumbStillSrc;
        delete img.dataset.cmuAnimatedThumbOriginalSrc;
        delete img.dataset.cmuAnimatedThumbOriginalSrcset;
        delete img.dataset.cmuAnimatedThumbNoStill;
    }
    function restoreAnimatedThumbImage(img) {
        if (!(img instanceof HTMLImageElement))
            return;
        const tracked = img.dataset.cmuAnimatedThumb === '1';
        if (!tracked) {
            delete img.dataset.cmuAnimatedThumbNoStill;
            return;
        }
        const ownsCurrent = isAppliedAnimatedThumbStillCurrent(img);
        const originalSrc = img.dataset.cmuAnimatedThumbOriginalSrc;
        const originalSrcset = img.dataset.cmuAnimatedThumbOriginalSrcset;
        const fallbackSource = img.dataset.cmuAnimatedThumbSource || '';
        if (ownsCurrent) {
            if (originalSrc === CMU_ANIMATED_THUMB_NO_ATTR)
                img.removeAttribute('src');
            else if (typeof originalSrc === 'string')
                img.setAttribute('src', originalSrc);
            else if (fallbackSource)
                img.setAttribute('src', fallbackSource);
            if (originalSrcset === CMU_ANIMATED_THUMB_NO_ATTR)
                img.removeAttribute('srcset');
            else if (typeof originalSrcset === 'string')
                img.setAttribute('srcset', originalSrcset);
        }
        clearAnimatedThumbTracking(img);
    }
    function setAnimatedThumbStatus(key, status) {
        if (!animatedThumbStillStatus.has(key) && animatedThumbStillStatus.size >= 600) {
            animatedThumbStillStatus.clear();
        }
        animatedThumbStillStatus.set(key, status);
    }
    function bindAnimatedThumbErrorFallback(img) {
        if (!(img instanceof HTMLImageElement) || animatedThumbErrorBound.has(img))
            return;
        animatedThumbErrorBound.add(img);
        img.addEventListener('error', () => {
            if (img.dataset.cmuAnimatedThumb !== '1' || !isAppliedAnimatedThumbStillCurrent(img))
                return;
            const failed = img.dataset.cmuAnimatedThumbStillSrc || img.getAttribute('src') || '';
            if (failed)
                setAnimatedThumbStatus(normalizeAnimatedThumbUrl(failed), 'bad');
            restoreAnimatedThumbImage(img);
            scheduleAnimatedThumbState();
        }, true);
    }
    function setStillAnimatedThumbImage(img, animatedSource, stillUrl) {
        if (!settings.pauseAnimatedThumbs || !(img instanceof HTMLImageElement) || !img.isConnected || !stillUrl)
            return;
        const savedSource = img.dataset.cmuAnimatedThumbSource || '';
        const liveSource = getAnimatedThumbLiveSource(img);
        if (savedSource && liveSource && normalizeAnimatedThumbUrl(savedSource) !== normalizeAnimatedThumbUrl(liveSource)) {
            clearAnimatedThumbTracking(img);
        }
        if (img.dataset.cmuAnimatedThumb !== '1') {
            img.dataset.cmuAnimatedThumbOriginalSrc = img.hasAttribute('src') ? (img.getAttribute('src') || '') : CMU_ANIMATED_THUMB_NO_ATTR;
            img.dataset.cmuAnimatedThumbOriginalSrcset = img.hasAttribute('srcset') ? (img.getAttribute('srcset') || '') : CMU_ANIMATED_THUMB_NO_ATTR;
        }
        img.dataset.cmuAnimatedThumb = '1';
        img.dataset.cmuAnimatedThumbSource = animatedSource;
        img.dataset.cmuAnimatedThumbStillSrc = stillUrl;
        delete img.dataset.cmuAnimatedThumbNoStill;
        bindAnimatedThumbErrorFallback(img);
        if (normalizeAnimatedThumbUrl(img.getAttribute('src') || '') !== normalizeAnimatedThumbUrl(stillUrl)) {
            img.setAttribute('src', stillUrl);
        }
        const srcset = img.getAttribute('srcset') || '';
        if (findAnimatedThumbSrcsetUrl(srcset))
            img.removeAttribute('srcset');
    }
    function applyFirstLoadableAnimatedThumb(img, animatedSource, candidates, index = 0) {
        if (!settings.pauseAnimatedThumbs || !img?.isConnected || !candidates?.length)
            return;
        if (index >= candidates.length) {
            img.dataset.cmuAnimatedThumbNoStill = normalizeAnimatedThumbUrl(animatedSource);
            return;
        }
        const stillUrl = candidates[index];
        const key = normalizeAnimatedThumbUrl(stillUrl);
        const status = animatedThumbStillStatus.get(key);
        if (status === 'ok') {
            setStillAnimatedThumbImage(img, animatedSource, stillUrl);
            return;
        }
        if (status === 'bad') {
            applyFirstLoadableAnimatedThumb(img, animatedSource, candidates, index + 1);
            return;
        }
        if (status === 'loading')
            return;
        setAnimatedThumbStatus(key, 'loading');
        const probe = new Image();
        probe.onload = () => {
            setAnimatedThumbStatus(key, 'ok');
            scheduleAnimatedThumbState();
        };
        probe.onerror = () => {
            setAnimatedThumbStatus(key, 'bad');
            scheduleAnimatedThumbState();
        };
        probe.src = stillUrl;
    }
    function pauseAnimatedThumbImage(img) {
        if (!(img instanceof HTMLImageElement))
            return;
        if (isAnimatedThumbExcluded(img)) {
            restoreAnimatedThumbImage(img);
            return;
        }
        const liveSource = getAnimatedThumbLiveSource(img);
        const savedSource = img.dataset.cmuAnimatedThumbSource || '';
        if (liveSource && savedSource && normalizeAnimatedThumbUrl(liveSource) !== normalizeAnimatedThumbUrl(savedSource)) {
            clearAnimatedThumbTracking(img);
        }
        const animatedSource = getAnimatedThumbSource(img);
        if (!animatedSource) {
            if (img.dataset.cmuAnimatedThumb === '1' && !isAppliedAnimatedThumbStillCurrent(img))
                clearAnimatedThumbTracking(img);
            return;
        }
        const normalizedSource = normalizeAnimatedThumbUrl(animatedSource);
        if (img.dataset.cmuAnimatedThumbNoStill === normalizedSource)
            return;
        const candidates = getAnimatedThumbCandidates(animatedSource, img);
        if (!candidates.length) {
            img.dataset.cmuAnimatedThumbNoStill = normalizedSource;
            return;
        }
        applyFirstLoadableAnimatedThumb(img, animatedSource, candidates);
    }
    function getAnimatedThumbSelector(enabled = !!settings.pauseAnimatedThumbs) {
        if (!enabled) {
            return 'img[data-cmu-animated-thumb="1"], img[data-cmu-animated-thumb-no-still]';
        }
        return [
            'img[src*="_gif"]',
            'img[srcset*="_gif"]',
            'img[src$=".gif"]',
            'img[src*=".gif?"]',
            'img[src*=".gif#"]',
            'img[data-cmu-animated-thumb="1"]',
            'img[data-cmu-animated-thumb-no-still]',
        ].join(',');
    }
    function hasRestorableAnimatedThumbs() {
        return !!document.querySelector('img[data-cmu-animated-thumb="1"], img[data-cmu-animated-thumb-no-still]');
    }
    function applyAnimatedThumbState(images = null) {
        const enabled = shouldRun() && !!settings.pauseAnimatedThumbs;
        (images || document.querySelectorAll(getAnimatedThumbSelector(enabled))).forEach(img => {
            if (enabled)
                pauseAnimatedThumbImage(img);
            else
                restoreAnimatedThumbImage(img);
        });
    }
    function scheduleAnimatedThumbState(root = null) {
        if (!shouldRun())
            return;
        if (root) {
            if (!settings.pauseAnimatedThumbs || !(root instanceof Element) || !root.isConnected)
                return;
            const selector = getAnimatedThumbSelector(true);
            if (root instanceof HTMLImageElement) {
                if (root.matches(selector))
                    CMU_DOM_WATCH.thumbNodes.add(root);
            }
            else {
                root.querySelectorAll(selector).forEach(img => CMU_DOM_WATCH.thumbNodes.add(img));
            }
            if (!CMU_DOM_WATCH.thumbFull && !CMU_DOM_WATCH.thumbNodes.size)
                return;
        }
        else {
            if (!settings.pauseAnimatedThumbs && !hasRestorableAnimatedThumbs())
                return;
            CMU_DOM_WATCH.thumbFull = true;
        }
        if (animatedThumbRaf)
            return;
        animatedThumbRaf = requestAnimationFrame(() => {
            animatedThumbRaf = 0;
            const full = CMU_DOM_WATCH.thumbFull;
            const images = Array.from(CMU_DOM_WATCH.thumbNodes).filter(img => img.isConnected);
            CMU_DOM_WATCH.thumbFull = false;
            CMU_DOM_WATCH.thumbNodes.clear();
            applyAnimatedThumbState(full ? null : images);
        });
    }
    function resetAnimatedThumbRouteState() {
        animatedThumbUrlMap = null;
        animatedThumbStillStatus.clear();
        animatedThumbCandidateCache.clear();
        document.querySelectorAll('img[data-cmu-animated-thumb-no-still]').forEach(img => delete img.dataset.cmuAnimatedThumbNoStill);
        scheduleAnimatedThumbState();
        clearTimeout(animatedThumbRouteRefreshTimer);
        animatedThumbRouteRefreshTimer = setTimeout(() => {
            animatedThumbUrlMap = null;
            document.querySelectorAll('img[data-cmu-animated-thumb-no-still]').forEach(img => delete img.dataset.cmuAnimatedThumbNoStill);
            scheduleAnimatedThumbState();
        }, 700);
    }
    function isMobileChatListPopover(dialog) {
        if (!(dialog instanceof HTMLElement))
            return false;
        if (dialog.getAttribute('role') !== 'dialog')
            return false;
        if (dialog.getAttribute('data-state') !== 'open')
            return false;
        if (!dialog.closest('[data-radix-popper-content-wrapper]'))
            return false;
        if (dialog.closest(`#${ID.panel}, #ctmPanel, #igx-live-popup, #chud-info-menu, #chud-side-menu`))
            return false;
        return !!(dialog.querySelector('[role="tablist"]') ||
            dialog.querySelector('[data-testid="virtuoso-scroller"]') ||
            dialog.querySelector('[data-virtuoso-scroller="true"]'));
    }
    function forceMobileChatListPopoverLayout() {
        const shouldFix = shouldRun() && settings.autoHideHeader && isEpisodePath() && isMobileLike();
        const dialogs = Array.from(document.querySelectorAll('[data-radix-popper-content-wrapper] [role="dialog"][data-state="open"]'))
            .filter(isMobileChatListPopover);
        for (const dialog of dialogs) {
            if (!shouldFix) {
                if (dialog.dataset.cmuChatListHeightFixed === '1') {
                    dialog.style.removeProperty('height');
                    dialog.style.removeProperty('max-height');
                    delete dialog.dataset.cmuChatListHeightFixed;
                }
                continue;
            }
            if (dialog.style.getPropertyValue('height') !== '100dvh') {
                dialog.style.setProperty('height', '100dvh', 'important');
            }
            if (dialog.style.getPropertyValue('max-height') !== '100dvh') {
                dialog.style.setProperty('max-height', '100dvh', 'important');
            }
            dialog.dataset.cmuChatListHeightFixed = '1';
        }
    }
    function scheduleMobileChatListPopoverLayoutSettle() {
        if (scheduleMobileChatListPopoverLayoutSettle._busy)
            return;
        scheduleMobileChatListPopoverLayoutSettle._busy = true;
        const steps = [0, 16, 48, 120, 260, 520];
        steps.forEach((ms, i) => setTimeout(() => {
            forceMobileChatListPopoverLayout();
            syncCmuEdgeMenuOpenState();
            if (i === steps.length - 1)
                scheduleMobileChatListPopoverLayoutSettle._busy = false;
        }, ms));
    }
    function getEditableTarget(target) {
        return target?.closest?.('textarea, input, [contenteditable="true"]') || target;
    }
    function cmuUserNoteHints(editable) {
        if (!(editable instanceof Element))
            return '';
        return [
            editable.getAttribute?.('placeholder'),
            editable.getAttribute?.('aria-label'),
            editable.getAttribute?.('name'),
            editable.getAttribute?.('data-placeholder'),
        ].filter(Boolean).join(' ');
    }
    function isCmuUserNoteEditor(target) {
        const editable = getEditableTarget(target);
        if (!(editable instanceof Element) || !editable.matches?.('textarea'))
            return false;
        if (/유저\s*노트|user\s*note|잊으면\s*안\s*되는\s*중요한\s*내용/i.test(cmuUserNoteHints(editable)))
            return true;
        const popup = editable.closest?.('[role="dialog"], [aria-modal="true"], [data-radix-dialog-content], [data-vaul-drawer]');
        const heading = popup?.querySelector?.('h1, h2, h3, [role="heading"]');
        return /유저\s*노트|user\s*note/i.test(heading?.textContent || '');
    }
    function getCmuFocusedUserNoteEditor() {
        const active = document.activeElement;
        return isCmuUserNoteEditor(active) ? active : null;
    }
    function cmuUserNoteInteractionActive() {
        // 판별만 한다. textarea에 이벤트를 추가하거나 DOM/CSS를 변경하지 않는다.
        return !!getCmuFocusedUserNoteEditor();
    }
    const CMU_USER_NOTE_HINT_RE = /유저\s*노트|user\s*note|잊으면\s*안\s*되는\s*중요한\s*내용|추가하고\s*싶은\s*설정/i;
    function isCmuUserNoteDialog(dialog) {
        // 네이티브 다이얼로그를 읽기만 한다. textarea/다이얼로그에는 리스너·속성·스타일을 추가하지 않는다.
        if (!(dialog instanceof HTMLElement) || !dialog.isConnected)
            return false;
        if (dialog.getAttribute('data-state') === 'closed' || dialog.hidden || dialog.getAttribute('aria-hidden') === 'true')
            return false;
        if (dialog.closest(`#${ID.panel}, #${ID.logCapturePreview}, #cmu-message-select-copy`))
            return false;
        const heading = dialog.querySelector('h1, h2, h3, [role="heading"]');
        if (/유저\s*노트|user\s*note/i.test(heading?.textContent || ''))
            return true;
        return Array.from(dialog.querySelectorAll('textarea')).some(editor => {
            return CMU_USER_NOTE_HINT_RE.test(cmuUserNoteHints(editor));
        });
    }
    function findCmuOpenUserNoteDialog() {
        try {
            return Array.from(document.querySelectorAll('[role="dialog"], [aria-modal="true"], [data-radix-dialog-content], [data-vaul-drawer]'))
                .find(isCmuUserNoteDialog) || null;
        }
        catch (_) {
            return null;
        }
    }
    function cmuUserNoteGuardActive() {
        // iOS 선택 핸들은 event.target이 textarea 밖으로 잡힐 수 있으므로
        // 포커스/타깃이 아니라 유저노트 다이얼로그의 열린 상태를 우선한다.
        return !!findCmuOpenUserNoteDialog() || cmuUserNoteInteractionActive();
    }
    function syncCmuUserNoteDialogState() {
        const open = !!findCmuOpenUserNoteDialog() || !!getCmuFocusedUserNoteEditor();
        const changed = CMU_USER_NOTE_STATE.open !== open;
        CMU_USER_NOTE_STATE.open = open;
        const html = document.documentElement;
        html.classList.toggle('cmu-user-note-open', open);
        if (open)
            cmuSuspendGlobalGestures('user-note-open');
        if (!changed)
            return open;
        clearTimeout(CMU_USER_NOTE_STATE.settleTimer);
        CMU_USER_NOTE_STATE.settleTimer = 0;
        if (open) {
            // CMU가 만든 레이아웃/합성 레이어를 즉시 해제한다. textarea나
            // 네이티브 선택 이벤트에는 리스너·속성·스타일을 추가하지 않는다.
            html.classList.remove(
                'cmu-enabled',
                'cmu-auto-hide',
                'cmu-wide',
                'cmu-theme-active',
                'cmu-header-reveal',
                'cmu-message-actions-enabled',
                'cmu-left-menu-enabled',
                'cmu-right-menu-enabled',
                'cmu-menu-swipe-zone-enabled',
                'cmu-mobile-chat-list-open',
                'cmu-mobile-room-panel-open',
                'cmu-chat-list-height-fixed'
            );
            if (!detectCmuExternalThemeProvider())
                html.classList.remove('sgb-bg-room', 'sgb-bg-active', 'sgb-bg-image-active');
            // 예약된 채팅창 초안 복구도 무효화한다.
            CMU_DRAFT.restoreToken += 1;
            cmuMessageActionsClearGesture();
            try {
                cmuLogCaptureExitMode?.(true);
            }
            catch (_) { }
            return true;
        }
        CMU_USER_NOTE_STATE.settleTimer = setTimeout(() => {
            CMU_USER_NOTE_STATE.settleTimer = 0;
            if (cmuUserNoteGuardActive())
                return;
            // 유저노트가 닫힌 뒤에만 미뤄 둔 채팅 composer 작업을 다시 붙인다.
            cmuResumeGlobalGestures('user-note-close');
            cmuMessageActionsSyncRootClass();
            cmuDraftSync();
            scheduleComposerExpandSync();
            scheduleCmuInputCounterSync();
            scheduleCmuMenuSwipeZonePosition();
            scheduleCmuEdgeMenuStateSync();
            scheduleInject('usernote-close');
        }, 100);
        return false;
    }
    function installCmuUserNoteStateWatch() {
        if (CMU_USER_NOTE_STATE.watchInstalled)
            return;
        CMU_USER_NOTE_STATE.watchInstalled = true;
        let queued = false;
        let earlyTimer = 0;
        let lateTimer = 0;
        const syncNow = () => { if (shouldRun()) syncCmuUserNoteDialogState(); };
        const syncSettled = () => {
            if (!queued) {
                queued = true;
                queueMicrotask(() => { queued = false; syncNow(); });
            }
            if (!earlyTimer)
                earlyTimer = setTimeout(() => { earlyTimer = 0; syncNow(); }, 40);
            clearTimeout(lateTimer);
            lateTimer = setTimeout(() => { lateTimer = 0; syncNow(); }, 140);
        };
        cmuListen(document, 'focusin', event => {
            if (isCmuUserNoteEditor(event.target) || findCmuOpenUserNoteDialog())
                syncNow();
        }, true);
        cmuListen(document, 'focusout', event => {
            if (isCmuUserNoteEditor(event.target) || CMU_USER_NOTE_STATE.open)
                syncSettled();
        }, true);
        // 텍스트 선택이 시작되는 첫 이벤트에서 전역 제스처보다 먼저 유저노트 상태를 확정한다.
        // 이 리스너는 상태만 갱신하며 preventDefault/stopPropagation은 절대 호출하지 않는다.
        const syncOnNativeSelectionStart = event => {
            if (isCmuUserNoteEditor(event.target) || findCmuOpenUserNoteDialog() || CMU_USER_NOTE_STATE.open)
                syncNow();
        };
        cmuListen(document, 'pointerdown', syncOnNativeSelectionStart, { capture: true, passive: true });
        cmuListen(document, 'touchstart', syncOnNativeSelectionStart, { capture: true, passive: true });
        if (document.body) {
            CMU_USER_NOTE_STATE.observer = new MutationObserver(mutations => {
                const relevant = mutations.some(mutation => {
                    if (mutation.type === 'attributes') {
                        const target = mutation.target;
                        return target instanceof Element &&
                            (target.matches?.('[role="dialog"], [aria-modal="true"], [data-radix-dialog-content], [data-vaul-drawer], textarea') ||
                                !!target.closest?.('[role="dialog"], [aria-modal="true"], [data-radix-dialog-content], [data-vaul-drawer]'));
                    }
                    return [...mutation.addedNodes, ...mutation.removedNodes].some(node => {
                        return node instanceof Element &&
                            (node.matches?.('[role="dialog"], [aria-modal="true"], [data-radix-dialog-content], [data-vaul-drawer], textarea') ||
                                !!node.querySelector?.('[role="dialog"], [aria-modal="true"], [data-radix-dialog-content], [data-vaul-drawer], textarea'));
                    });
                });
                if (relevant)
                    syncSettled();
            });
            CMU_USER_NOTE_STATE.observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['data-state', 'aria-hidden', 'hidden', 'placeholder', 'aria-label'],
            });
        }
        syncNow();
    }
    function isInsideKnownPopup(el) {
        if (!(el instanceof Element))
            return false;
        if (el.closest(`#${ID.panel}, #rpcm-overlay, #csp-v35-root, [role="dialog"], [aria-modal="true"], [data-radix-popper-content-wrapper], [data-radix-dialog-content], [data-radix-dialog-content-wrapper]`))
            return true;
        // React UI의 role/portal 구조가 바뀌어도 유저노트 같은 보조 편집창을
        // 채팅 composer로 오인하지 않도록 편집 목적을 뜻하는 힌트도 함께 본다.
        const editable = getEditableTarget(el);
        if (!(editable instanceof Element))
            return false;
        const hints = cmuUserNoteHints(editable);
        return /유저\s*노트|user\s*note|잊으면\s*안\s*되는\s*중요한\s*내용|추가하고\s*싶은\s*설정/i.test(hints);
    }
    function isCmuProtectedEditorTarget(target) {
        // 네이티브 선택 핸들은 event target이 textarea 밖으로 잡힐 수 있으므로,
        // 유저노트 다이얼로그가 열린 동안에는 CMU 전역 제스처를 모두 쉬게 한다.
        if (cmuUserNoteGuardActive())
            return true;
        const el = target instanceof Element ? target : target?.parentElement;
        const editable = getEditableTarget(el);
        if (editable instanceof Element && editable.matches?.('textarea, input, [contenteditable="true"]') && isInsideKnownPopup(editable))
            return true;
        const active = document.activeElement;
        if (!(active instanceof Element) || !active.matches?.('textarea, input, [contenteditable="true"]') || !isInsideKnownPopup(active))
            return false;
        const popup = active.closest?.('[role="dialog"], [aria-modal="true"], [data-radix-popper-content-wrapper], [data-radix-dialog-content], [data-radix-dialog-content-wrapper]');
        return !!(popup && el && popup.contains(el));
    }
    function isVisibleEditableCandidate(el) {
        if (!(el instanceof Element))
            return false;
        if (!el.isConnected)
            return false;
        if (isInsideKnownPopup(el))
            return false;
        try {
            const rect = el.getBoundingClientRect();
            if (rect.width <= 2 || rect.height <= 2)
                return false;
            const style = getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity || 1) === 0)
                return false;
        }
        catch (_) { }
        return true;
    }
    function hasMessagePlaceholder(el) {
        if (!(el instanceof Element))
            return false;
        const attrs = [
            el.getAttribute?.('placeholder'),
            el.getAttribute?.('aria-label'),
            el.getAttribute?.('data-placeholder'),
            el.querySelector?.('[data-placeholder]')?.getAttribute?.('data-placeholder'),
            el.querySelector?.('p[data-placeholder]')?.getAttribute?.('data-placeholder'),
        ].filter(Boolean).join(' ');
        return /메시지|message/i.test(attrs);
    }
    function isRawSendButton(btn) {
        if (!(btn instanceof HTMLButtonElement))
            return false;
        if (isInsideKnownPopup(btn))
            return false;
        const label = `${btn.getAttribute('aria-label') || ''} ${btn.title || ''} ${btn.textContent || ''}`;
        if (/전송|보내기|send/i.test(label))
            return true;
        return !!btn.querySelector('path[d^="M18.77 11.13"]');
    }
    function hasRawSendButtonNear(el) {
        if (!(el instanceof Element))
            return false;
        const scopes = [];
        let cur = el;
        for (let i = 0; i < 8 && cur && cur !== document.body && cur !== document.documentElement; i++, cur = cur.parentElement) {
            scopes.push(cur);
            if (cur.tagName === 'FORM')
                break;
        }
        return scopes.some(scope => Array.from(scope.querySelectorAll?.('button') || []).some(isRawSendButton));
    }
    function isLikelyChatInputCandidate(el, { strict = false } = {}) {
        if (!isVisibleEditableCandidate(el))
            return false;
        // 채팅 작성창은 main 안의 실제 composer만 허용한다. 별도 포털에 뜨는
        // 유저노트/설정/검색 textarea는 placeholder가 비슷해도 후보가 아니다.
        if (!el.closest('main'))
            return false;
        if (el.classList?.contains('__chat_input_textarea'))
            return true;
        if (hasMessagePlaceholder(el) && hasRawSendButtonNear(el))
            return true;
        if (!strict && hasRawSendButtonNear(el))
            return true;
        return false;
    }
    function invalidateCmuChatInputCache() {
        cmuCachedChatInput = null;
        cmuCachedComposerShell = null;
        cmuCachedChatInputAt = 0;
        cmuCachedSendButton = null;
        cmuCachedSendButtonAt = 0;
        cmuCachedSendPairBtn = null;
        cmuCachedSendPairInput = null;
    }
    function cmuCachedInputUsable(input) {
        if (!(input instanceof Element) || !input.isConnected)
            return false;
        if (Date.now() - cmuCachedChatInputAt > CMU_CHAT_INPUT_CACHE_TTL)
            return false;
        if (isInsideKnownPopup(input) || !input.closest('main'))
            return false;
        if (input.matches?.('textarea, input'))
            return !input.disabled && !input.readOnly;
        return input.isContentEditable || input.getAttribute?.('contenteditable') === 'true';
    }
    function findChatInput(force = false) {
        if (!force && cmuCachedInputUsable(cmuCachedChatInput))
            return cmuCachedChatInput;
        const prioritySelectors = [
            '.__chat_input_textarea',
            'p[data-placeholder*="메시지"], p[data-placeholder*="Message"], p[data-placeholder*="message"]',
            'textarea[placeholder*="메시지"], textarea[placeholder*="Message"], textarea[placeholder*="message"]',
            'div.ProseMirror[contenteditable="true"], div.tiptap[contenteditable="true"]',
        ];
        for (const selector of prioritySelectors) {
            const nodes = Array.from(document.querySelectorAll(selector));
            for (let i = nodes.length - 1; i >= 0; i--) {
                const node = nodes[i];
                const el = node.matches?.('p[data-placeholder]') ? node.closest('[contenteditable="true"]') : node;
                if (isLikelyChatInputCandidate(el, { strict: selector.includes('ProseMirror') || selector.includes('tiptap') })) {
                    cmuCachedChatInput = el;
                    cmuCachedComposerShell = null;
                    cmuCachedChatInputAt = Date.now();
                    return el;
                }
            }
        }
        invalidateCmuChatInputCache();
        return null;
    }
    function isChatInputElement(target) {
        const input = getEditableTarget(target);
        if (!(input instanceof Element) || isInsideKnownPopup(input) || !input.closest('main'))
            return false;
        const chatInput = findChatInput();
        return !!(input && chatInput && (input === chatInput || chatInput.contains?.(input) || input.contains?.(chatInput)));
    }
    function isButtonInsideChatComposer(btn) {
        if (!(btn instanceof HTMLElement))
            return false;
        const input = findChatInput();
        if (!input)
            return false;
        const form = input.closest('form');
        if (form && form.contains(btn))
            return true;
        const shell = findComposerShell(input);
        return !!(shell && shell.contains(btn));
    }
    function cmuIsVisibleSendButton(btn) {
        if (!(btn instanceof HTMLButtonElement) || !btn.isConnected)
            return false;
        if (btn.closest('[hidden], [aria-hidden="true"]'))
            return false;
        const rect = btn.getBoundingClientRect();
        if (rect.width < 8 || rect.height < 8 || rect.bottom <= 0 || rect.right <= 0)
            return false;
        if (rect.top >= (window.innerHeight || document.documentElement.clientHeight || 0))
            return false;
        const style = getComputedStyle(btn);
        return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0;
    }
    let cmuCachedSendButton = null;
    let cmuCachedSendButtonAt = 0;
    let cmuCachedSendPairBtn = null;
    let cmuCachedSendPairInput = null;
    function getSendButton() {
        const now = Date.now();
        if (cmuCachedSendButton &&
            cmuCachedSendButton.isConnected &&
            now - cmuCachedSendButtonAt < 2500 &&
            cmuIsVisibleSendButton(cmuCachedSendButton)) {
            return cmuCachedSendButton;
        }
        cmuCachedSendButton = null;
        const candidates = [];
        const seen = new Set();
        const add = btn => {
            if (!(btn instanceof HTMLButtonElement) || seen.has(btn))
                return;
            seen.add(btn);
            if (isSendButton(btn) && cmuIsVisibleSendButton(btn))
                candidates.push(btn);
        };
        document.querySelectorAll('button[aria-label]').forEach(add);
        document.querySelectorAll('path[d^="M18.77 11.13"]').forEach(path => add(path.closest('button')));
        if (!candidates.length) {
            cmuCachedSendButtonAt = now;
            return null;
        }
        const chatInput = findChatInput();
        const inputRect = chatInput?.getBoundingClientRect?.() || null;
        const shell = chatInput ? findComposerShell(chatInput) : null;
        const form = chatInput?.closest?.('form') || null;
        let best = null;
        let bestScore = -Infinity;
        candidates.forEach(btn => {
            const pairedInput = findChatInputForSendButton(btn);
            if (!pairedInput)
                return;
            const rect = btn.getBoundingClientRect();
            let score = 0;
            if (pairedInput === chatInput)
                score += 1000;
            if (form?.contains(btn))
                score += 500;
            if (shell?.contains(btn))
                score += 350;
            if (btn.getAttribute('aria-label'))
                score += 30;
            if (inputRect) {
                const dx = Math.abs(rect.left - inputRect.right);
                const dy = Math.abs((rect.top + rect.bottom) / 2 - (inputRect.top + inputRect.bottom) / 2);
                score -= Math.min(300, dx * .15 + dy * 2);
            }
            if (score > bestScore) {
                best = btn;
                bestScore = score;
            }
        });
        cmuCachedSendButton = best || candidates[0] || null;
        cmuCachedSendButtonAt = now;
        return cmuCachedSendButton;
    }
    function findToolbarInfo(chatInput) {
        if (!chatInput)
            return null;
        const shortcutBtn = document.querySelector('button[aria-label*="단축어"]');
        if (shortcutBtn?.parentElement && !shortcutBtn.closest(`#${ID.panel}`)) {
            return { toolbar: shortcutBtn.parentElement, scope: shortcutBtn.closest('form') || shortcutBtn.parentElement.parentElement || shortcutBtn.parentElement };
        }
        const captureBtn = document.getElementById('capture-action-button');
        if (captureBtn?.parentElement && !captureBtn.closest(`#${ID.panel}`)) {
            return { toolbar: captureBtn.parentElement, scope: captureBtn.closest('form') || captureBtn.parentElement.parentElement || captureBtn.parentElement };
        }
        const sendBtn = getSendButton();
        if (sendBtn?.parentElement && !sendBtn.closest(`#${ID.panel}`)) {
            return { toolbar: sendBtn.parentElement, scope: sendBtn.closest('form') || sendBtn.parentElement.parentElement || sendBtn.parentElement };
        }
        let current = chatInput;
        for (let i = 0; i < 10 && current; i++) {
            const candidate = current.querySelector?.('.flex.items-center.space-x-2') ||
                current.querySelector?.('.flex.items-center.gap-2') ||
                current.querySelector?.('[class*="items-center"]');
            if (candidate && !candidate.closest(`#${ID.panel}`)) {
                return { toolbar: candidate, scope: current };
            }
            current = current.parentElement;
        }
        return null;
    }
    const NATIVE_BUTTON_FALLBACK_CLASS = 'relative inline-flex items-center gap-1 rounded-full text-sm font-medium leading-none transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:fill-current min-w-7 border border-border bg-card text-line-gray-1 hover:bg-secondary p-0 size-7 justify-center';
    function stripReactTracking(root) {
        if (!(root instanceof HTMLElement))
            return;
        const clean = (el) => {
            ['data-state', 'aria-expanded', 'aria-controls', 'aria-haspopup', 'data-radix-collection-item'].forEach(name => el.removeAttribute(name));
            Array.from(el.attributes || []).forEach(attr => {
                if (/^data-radix/i.test(attr.name))
                    el.removeAttribute(attr.name);
            });
        };
        clean(root);
        root.querySelectorAll?.('*').forEach(el => clean(el));
    }
    function isNativeToolbarButton(btn) {
        if (!(btn instanceof HTMLButtonElement))
            return false;
        if (btn.id === ID.settingsButton || btn.id === ID.fullscreenButton || btn.id === ID.composerExpandButton || btn.id === ID.logCaptureButton ||
            btn.id === 'cwa-toolbar-btn' || btn.hasAttribute('data-cwa-toolbar-button') ||
            btn.closest(`#${ID.toolbarWrapper}, #${ID.panel}`))
            return false;
        const cls = String(btn.getAttribute('class') || '');
        const label = String(btn.getAttribute('aria-label') || '');
        return cls.includes('rounded-full') && (cls.includes('size-7') || cls.includes('min-w-7') || label.includes('단축어'));
    }
    function findNativeBaseButton(toolbar) {
        if (!toolbar)
            return null;
        const buttons = Array.from(toolbar.querySelectorAll('button')).filter(isNativeToolbarButton);
        const shortcut = toolbar.querySelector('button[aria-label*="단축어"]');
        const iconButton = buttons.find(btn => btn.querySelector('svg'));
        return iconButton || (shortcut && isNativeToolbarButton(shortcut) ? shortcut : null) || buttons[0] || null;
    }
    function placeCmuToolbarWrapper(toolbar, wrapper) {
        if (!(toolbar instanceof HTMLElement) || !(wrapper instanceof HTMLElement))
            return;
        const cwaButton = toolbar.querySelector('#cwa-toolbar-btn, [data-cwa-toolbar-button="assistant"]');
        if (cwaButton?.parentElement === toolbar) {
            if (cwaButton.nextSibling !== wrapper)
                toolbar.insertBefore(wrapper, cwaButton.nextSibling);
            return;
        }
        const addonAnchor = toolbar.querySelector('#ctmWrapper, #ctmFab, [data-ctm-toolbar-button]');
        if (addonAnchor?.parentElement === toolbar) {
            if (addonAnchor.nextSibling !== wrapper)
                toolbar.insertBefore(wrapper, addonAnchor.nextSibling);
            return;
        }
        const nativeBase = findNativeBaseButton(toolbar);
        if (nativeBase?.parentElement === toolbar) {
            if (nativeBase.previousSibling !== wrapper)
                toolbar.insertBefore(wrapper, nativeBase);
        }
        else if (wrapper.parentElement !== toolbar) {
            toolbar.appendChild(wrapper);
        }
    }
    function prepareNativeButton(btn, baseBtn) {
        if (!(btn instanceof HTMLButtonElement))
            return;
        btn.className = baseBtn instanceof HTMLButtonElement ? baseBtn.className : NATIVE_BUTTON_FALLBACK_CLASS;
        btn.removeAttribute('style');
        btn.type = 'button';
        btn.removeAttribute('disabled');
        stripReactTracking(btn);
        btn.style.pointerEvents = 'auto';
    }
    const SETTINGS_GEAR_SVG = `
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" style="fill:none!important;stroke:currentColor!important;">
      <circle cx="12" cy="12" r="3.25"></circle>
      <path d="M19.43 12.98c.04-.32.07-.65.07-.98s-.02-.66-.07-.98l2.02-1.58a.48.48 0 0 0 .11-.62l-1.91-3.31a.48.48 0 0 0-.59-.21l-2.38.96a7.45 7.45 0 0 0-1.7-.98L14.62 2.7A.49.49 0 0 0 14.14 2h-4.28a.49.49 0 0 0-.48.4l-.36 2.58c-.61.24-1.18.56-1.7.98L4.94 5a.48.48 0 0 0-.59.21L2.44 8.52a.48.48 0 0 0 .11.62l2.02 1.58c-.04.32-.07.65-.07.98s.02.66.07.98l-2.02 1.58a.48.48 0 0 0-.11.62l1.91 3.31c.13.22.39.31.59.21l2.38-.96c.52.41 1.09.74 1.7.98l.36 2.58c.04.23.24.4.48.4h4.28c.24 0 .44-.17.48-.4l.36-2.58c.61-.24 1.18-.56 1.7-.98l2.38.96c.2.1.46.01.59-.21l1.91-3.31a.48.48 0 0 0-.11-.62l-2.02-1.58Z"></path>
    </svg>
  `;
    function setSettingsButtonIcon(btn) {
        if (!(btn instanceof HTMLButtonElement))
            return;
        btn.innerHTML = SETTINGS_GEAR_SVG;
    }
    function createToolbarButton(baseBtn) {
        const btn = baseBtn ? baseBtn.cloneNode(true) : document.createElement('button');
        prepareNativeButton(btn, baseBtn);
        btn.id = ID.settingsButton;
        btn.classList.add('cmu-native-toolbar-btn');
        btn.setAttribute('data-cmu-toolbar-button', 'settings');
        btn.title = '모바일 유틸 설정';
        btn.setAttribute('aria-label', '모바일 유틸 설정');
        setSettingsButtonIcon(btn);
        btn.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); });
        btn.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();
            toggleSettingsPanel();
        });
        return btn;
    }
    function createFullscreenToolbarButton(baseBtn) {
        const btn = baseBtn ? baseBtn.cloneNode(true) : document.createElement('button');
        prepareNativeButton(btn, baseBtn);
        btn.id = ID.fullscreenButton;
        btn.classList.add('cmu-native-toolbar-btn');
        btn.setAttribute('data-cmu-toolbar-button', 'fullscreen');
        setCmuFullscreenToolbarIcon(btn);
        btn.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); });
        btn.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();
            toggleCmuFullscreen();
        });
        return btn;
    }
    const COMPOSER_EXPAND_STYLE_PROPS = ['height', 'max-height', 'overflow-y'];
    const COMPOSER_EXPAND_ICONS = Object.freeze({
        expand: '↗',
        collapse: '↙',
    });
    function snapshotComposerExpandStyles(target) {
        const snapshot = {};
        for (const prop of COMPOSER_EXPAND_STYLE_PROPS) {
            snapshot[prop] = {
                value: target.style.getPropertyValue(prop),
                priority: target.style.getPropertyPriority(prop),
            };
        }
        return snapshot;
    }
    function restoreComposerExpandStyles(target, snapshot) {
        if (!(target instanceof HTMLElement) || !snapshot)
            return;
        for (const prop of COMPOSER_EXPAND_STYLE_PROPS) {
            const saved = snapshot[prop];
            if (saved?.value)
                target.style.setProperty(prop, saved.value, saved.priority || '');
            else
                target.style.removeProperty(prop);
        }
    }
    function setComposerExpandStyle(target, prop, value) {
        if (!(target instanceof HTMLElement))
            return;
        if (target.style.getPropertyValue(prop) === value && target.style.getPropertyPriority(prop) === 'important')
            return;
        target.style.setProperty(prop, value, 'important');
    }
    function composerElementOverflows(el) {
        if (!(el instanceof HTMLElement))
            return false;
        return Number(el.scrollHeight || 0) > Number(el.clientHeight || 0) + 3;
    }
    function hasComposerExpandableContent(input) {
        if (!(input instanceof HTMLElement))
            return false;
        if (input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement) {
            return String(input.value || '').replace(/\u200b/g, '').trim().length > 0;
        }
        const text = String(input.textContent || '')
            .replace(/\u200b/g, '')
            .replace(/\u00a0/g, ' ')
            .trim();
        if (text.length > 0)
            return true;
        return input.querySelectorAll(':scope > p, :scope > div').length > 1;
    }
    function findComposerScrollTarget(input) {
        if (!(input instanceof HTMLElement))
            return null;
        const shell = findComposerShell(input);
        let current = input;
        for (let depth = 0; current && current !== shell && depth < 7; depth++, current = current.parentElement) {
            if (composerElementOverflows(current))
                return current;
        }
        return input;
    }
    function getComposerExpandMaxHeight() {
        const viewportHeight = Math.max(1, Number(window.visualViewport?.height) || Number(window.innerHeight) || 800);
        const ratio = isMobileLike() ? 0.78 : 0.82;
        return Math.max(160, Math.floor(viewportHeight * ratio));
    }
    function disconnectComposerExpandResizeObserver() {
        try {
            COMPOSER_EXPAND.resizeObserver?.disconnect?.();
        }
        catch (_) { }
        try {
            COMPOSER_EXPAND.contentObserver?.disconnect?.();
        }
        catch (_) { }
        COMPOSER_EXPAND.resizeObserver = null;
        COMPOSER_EXPAND.contentObserver = null;
    }
    function observeComposerExpandContext(input, target) {
        disconnectComposerExpandResizeObserver();
        if (!(input instanceof HTMLElement) || !(target instanceof HTMLElement))
            return;
        if (typeof ResizeObserver === 'function') {
            COMPOSER_EXPAND.resizeObserver = cmuSharedResizeClient(() => scheduleComposerExpandSync());
            try {
                COMPOSER_EXPAND.resizeObserver.observe(input);
            }
            catch (_) { }
            if (target !== input) {
                try {
                    COMPOSER_EXPAND.resizeObserver.observe(target);
                }
                catch (_) { }
            }
        }
        COMPOSER_EXPAND.contentObserver = cmuComposerSubscribe(input, () => {
            if (COMPOSER_EXPAND.expanded && !hasComposerExpandableContent(input)) {
                compactComposerAfterSend(target);
                return;
            }
            scheduleComposerExpandSync();
        });

    }
    function cancelComposerExpandTimers() {
        if (COMPOSER_EXPAND.animationRaf)
            cancelAnimationFrame(COMPOSER_EXPAND.animationRaf);
        if (COMPOSER_EXPAND.restoreTimer)
            clearTimeout(COMPOSER_EXPAND.restoreTimer);
        COMPOSER_EXPAND.animationRaf = 0;
        COMPOSER_EXPAND.restoreTimer = 0;
    }
    function finishComposerExpandRestore({ scrollToEnd = false } = {}) {
        const target = COMPOSER_EXPAND.target;
        cancelComposerExpandTimers();
        if (target instanceof HTMLElement) {
            restoreComposerExpandStyles(target, COMPOSER_EXPAND.originalStyles);
            delete target.dataset.cmuComposerExpanded;
            delete target.dataset.cmuComposerExpandAnimating;
            if (scrollToEnd && target.isConnected) {
                requestAnimationFrame(() => {
                    if (!target.isConnected)
                        return;
                    target.scrollTop = Math.max(0, Number(target.scrollHeight || 0) - Number(target.clientHeight || 0));
                    scheduleDashboardScrollSync();
                });
            }
        }
        COMPOSER_EXPAND.originalStyles = null;
        COMPOSER_EXPAND.collapsedHeight = 0;
        COMPOSER_EXPAND.originalScrollTop = 0;
        scheduleDashboardScrollSync();
    }
    function setComposerExpandButtonState(visible, expanded = COMPOSER_EXPAND.expanded) {
        const btn = document.getElementById(ID.composerExpandButton);
        if (!(btn instanceof HTMLButtonElement))
            return;
        btn.classList.toggle('cmu-composer-expand-visible', !!visible);
        const host = COMPOSER_EXPAND.buttonHost;
        if (host instanceof HTMLElement) {
            if (visible)
                host.setAttribute('data-cmu-composer-expand-visible', '1');
            else
                host.removeAttribute('data-cmu-composer-expand-visible');
        }
        btn.tabIndex = visible ? 0 : -1;
        btn.setAttribute('aria-hidden', visible ? 'false' : 'true');
        const nextState = expanded ? 'collapse' : 'expand';
        if (btn.dataset.cmuComposerExpandState !== nextState) {
            btn.dataset.cmuComposerExpandState = nextState;
            btn.textContent = COMPOSER_EXPAND_ICONS[nextState];
            const label = expanded ? '입력창 원래 크기로' : '입력창 펼치기';
            btn.title = label;
            btn.setAttribute('aria-label', label);
            btn.setAttribute('aria-pressed', expanded ? 'true' : 'false');
        }
    }
    function updateExpandedComposerHeight() {
        const target = COMPOSER_EXPAND.target;
        if (!COMPOSER_EXPAND.expanded || !(target instanceof HTMLElement) || !target.isConnected)
            return;
        const contentHeight = Math.max(COMPOSER_EXPAND.collapsedHeight, Math.ceil(Number(target.scrollHeight || 0)));
        const maxHeight = Math.max(COMPOSER_EXPAND.collapsedHeight, getComposerExpandMaxHeight());
        const desiredHeight = Math.max(COMPOSER_EXPAND.collapsedHeight, Math.min(contentHeight, maxHeight));
        setComposerExpandStyle(target, 'height', `${desiredHeight}px`);
        setComposerExpandStyle(target, 'max-height', `${desiredHeight}px`);
        setComposerExpandStyle(target, 'overflow-y', 'auto');
        if (contentHeight <= desiredHeight + 3)
            target.scrollTop = 0;
        scheduleDashboardScrollSync();
    }
    function collapseComposerInput({ immediate = false, scrollToEnd = true } = {}) {
        if (!COMPOSER_EXPAND.expanded && !COMPOSER_EXPAND.originalStyles)
            return;
        const target = COMPOSER_EXPAND.target;
        COMPOSER_EXPAND.expanded = false;
        setComposerExpandButtonState(true, false);
        if (!(target instanceof HTMLElement) || !target.isConnected || immediate) {
            finishComposerExpandRestore({ scrollToEnd: false });
            scheduleComposerExpandSync();
            return;
        }
        cancelComposerExpandTimers();
        const currentHeight = Math.max(COMPOSER_EXPAND.collapsedHeight, Math.round(target.getBoundingClientRect().height || target.clientHeight || 0));
        target.dataset.cmuComposerExpandAnimating = '1';
        setComposerExpandStyle(target, 'height', `${currentHeight}px`);
        setComposerExpandStyle(target, 'max-height', `${currentHeight}px`);
        void target.offsetHeight;
        COMPOSER_EXPAND.animationRaf = requestAnimationFrame(() => {
            COMPOSER_EXPAND.animationRaf = 0;
            if (!(target instanceof HTMLElement) || !target.isConnected) {
                finishComposerExpandRestore({ scrollToEnd: false });
                return;
            }
            const collapsedHeight = Math.max(1, COMPOSER_EXPAND.collapsedHeight || target.clientHeight || 1);
            setComposerExpandStyle(target, 'height', `${collapsedHeight}px`);
            setComposerExpandStyle(target, 'max-height', `${collapsedHeight}px`);
        });
        COMPOSER_EXPAND.restoreTimer = setTimeout(() => {
            COMPOSER_EXPAND.restoreTimer = 0;
            finishComposerExpandRestore({ scrollToEnd });
            scheduleComposerExpandSync();
        }, 220);
    }
    function expandComposerInput() {
        const input = COMPOSER_EXPAND.input;
        const target = COMPOSER_EXPAND.target;
        if (COMPOSER_EXPAND.expanded || !(input instanceof HTMLElement) || !(target instanceof HTMLElement))
            return;
        if (!hasComposerExpandableContent(input) || !composerElementOverflows(target))
            return;
        finishComposerExpandRestore({ scrollToEnd: false });
        COMPOSER_EXPAND.originalStyles = snapshotComposerExpandStyles(target);
        COMPOSER_EXPAND.collapsedHeight = Math.max(1, Math.round(target.getBoundingClientRect().height || target.clientHeight || 1));
        COMPOSER_EXPAND.originalScrollTop = Math.max(0, Number(target.scrollTop) || 0);
        COMPOSER_EXPAND.expanded = true;
        target.dataset.cmuComposerExpanded = '1';
        target.dataset.cmuComposerExpandAnimating = '1';
        setComposerExpandStyle(target, 'height', `${COMPOSER_EXPAND.collapsedHeight}px`);
        setComposerExpandStyle(target, 'max-height', `${COMPOSER_EXPAND.collapsedHeight}px`);
        setComposerExpandStyle(target, 'overflow-y', 'auto');
        void target.offsetHeight;
        COMPOSER_EXPAND.animationRaf = requestAnimationFrame(() => {
            COMPOSER_EXPAND.animationRaf = 0;
            updateExpandedComposerHeight();
        });
        setComposerExpandButtonState(true, true);
    }
    function setComposerExpandContext(input, target) {
        if (COMPOSER_EXPAND.input === input && COMPOSER_EXPAND.target === target)
            return;
        if (COMPOSER_EXPAND.expanded || COMPOSER_EXPAND.originalStyles)
            collapseComposerInput({ immediate: true, scrollToEnd: false });
        COMPOSER_EXPAND.input = input;
        COMPOSER_EXPAND.target = target;
        observeComposerExpandContext(input, target);
    }
    function syncComposerExpandState() {
        if (COMPOSER_EXPAND.raf)
            cancelAnimationFrame(COMPOSER_EXPAND.raf);
        COMPOSER_EXPAND.raf = 0;
        if (cmuUserNoteGuardActive())
            return;
        if (!settings.composerExpandButton) {
            if (COMPOSER_EXPAND.expanded || COMPOSER_EXPAND.originalStyles) {
                collapseComposerInput({ immediate: true, scrollToEnd: false });
            }
            disconnectComposerExpandResizeObserver();
            COMPOSER_EXPAND.input = null;
            COMPOSER_EXPAND.target = null;
            removeComposerExpandButton();
            return;
        }
        const input = findChatInput();
        if (!(input instanceof HTMLElement)) {
            collapseComposerInput({ immediate: true, scrollToEnd: false });
            disconnectComposerExpandResizeObserver();
            COMPOSER_EXPAND.input = null;
            COMPOSER_EXPAND.target = null;
            removeComposerExpandButton();
            return;
        }
        ensureComposerExpandButton(input);
        if (COMPOSER_EXPAND.expanded) {
            if (COMPOSER_EXPAND.input !== input || !COMPOSER_EXPAND.target?.isConnected) {
                collapseComposerInput({ immediate: true, scrollToEnd: false });
            }
            else if (!hasComposerExpandableContent(input)) {
                compactComposerAfterSend(COMPOSER_EXPAND.target);
                return;
            }
        }
        if (!COMPOSER_EXPAND.expanded) {
            const target = findComposerScrollTarget(input);
            setComposerExpandContext(input, target);
        }
        if (COMPOSER_EXPAND.expanded) {
            updateExpandedComposerHeight();
            setComposerExpandButtonState(true, true);
            return;
        }
        const target = COMPOSER_EXPAND.target;
        const visible = hasComposerExpandableContent(input) && composerElementOverflows(target);
        setComposerExpandButtonState(visible, false);
    }
    function scheduleComposerExpandSync() {
        if (COMPOSER_EXPAND.raf || cmuUserNoteGuardActive())
            return;
        COMPOSER_EXPAND.raf = requestAnimationFrame(syncComposerExpandState);
    }
    function toggleComposerExpand() {
        syncComposerExpandState();
        if (COMPOSER_EXPAND.expanded)
            collapseComposerInput();
        else
            expandComposerInput();
    }
    function findComposerExpandButtonHost(input) {
        if (!(input instanceof HTMLElement))
            return null;
        return input.closest('[data-cmu-theme-input-box], [data-sgb-input-box]')
            || input.closest('div[class*="rounded-lg"][class*="border"]')
            || input.closest('div[class*="rounded"][class*="border"]')
            || input.closest('div[class*="rounded"]')
            || input.parentElement;
    }
    function clearComposerExpandButtonHost() {
        const host = COMPOSER_EXPAND.buttonHost;
        if (host instanceof HTMLElement) {
            host.removeAttribute('data-cmu-composer-expand-host');
            host.removeAttribute('data-cmu-composer-expand-visible');
            const saved = COMPOSER_EXPAND.buttonHostPosition;
            if (saved && host.style.getPropertyValue('position') === 'relative') {
                if (saved.value)
                    host.style.setProperty('position', saved.value, saved.priority || '');
                else
                    host.style.removeProperty('position');
            }
        }
        COMPOSER_EXPAND.buttonHost = null;
        COMPOSER_EXPAND.buttonHostPosition = null;
    }
    function removeComposerExpandButton() {
        document.getElementById(ID.composerExpandButton)?.remove?.();
        clearComposerExpandButtonHost();
    }
    function createComposerExpandOverlayButton() {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.id = ID.composerExpandButton;
        btn.className = 'cmu-composer-expand-overlay';
        btn.setAttribute('data-cmu-composer-button', 'expand');
        btn.classList.remove('cmu-composer-expand-visible');
        btn.tabIndex = -1;
        btn.setAttribute('aria-hidden', 'true');
        btn.textContent = COMPOSER_EXPAND_ICONS.expand;
        btn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); });
        btn.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();
            toggleComposerExpand();
        });
        return btn;
    }
    function ensureComposerExpandButton(input = findChatInput()) {
        if (!settings.composerExpandButton || !(input instanceof HTMLElement)) {
            removeComposerExpandButton();
            return null;
        }
        const host = findComposerExpandButtonHost(input);
        if (!(host instanceof HTMLElement)) {
            removeComposerExpandButton();
            return null;
        }
        if (COMPOSER_EXPAND.buttonHost !== host) {
            clearComposerExpandButtonHost();
            COMPOSER_EXPAND.buttonHost = host;
            host.setAttribute('data-cmu-composer-expand-host', '1');
            try {
                if (getComputedStyle(host).position === 'static') {
                    COMPOSER_EXPAND.buttonHostPosition = {
                        value: host.style.getPropertyValue('position'),
                        priority: host.style.getPropertyPriority('position'),
                    };
                    host.style.setProperty('position', 'relative', 'important');
                }
            }
            catch (_) { }
        }
        let btn = document.getElementById(ID.composerExpandButton);
        if (!(btn instanceof HTMLButtonElement) || btn.parentElement !== host) {
            btn?.remove?.();
            btn = createComposerExpandOverlayButton();
            host.appendChild(btn);
            setComposerExpandButtonState(false, false);
        }
        return btn;
    }
    function bindComposerExpandFeature() {
        // The shared editor subscription handles input, programmatic edits and composition.
        // Context is attached by syncComposerExpandContext when the editor appears.
        document.documentElement.dataset.cmuComposerExpandBound = '1';
    }
    function cmuInputCounterRestoreHost() {
        const host = CMU_INPUT_COUNTER.host;
        const saved = CMU_INPUT_COUNTER.hostPosition;
        const savedPadding = CMU_INPUT_COUNTER.hostPaddingTop;
        CMU_INPUT_COUNTER.resizeObserver?.disconnect();
        CMU_INPUT_COUNTER.resizeObserver = null;
        if (host instanceof HTMLElement) {
            host.removeAttribute('data-cmu-input-counter-host');
            if (saved && host.style.getPropertyValue('position') === 'relative' && host.style.getPropertyPriority('position') === 'important') {
                if (saved.value)
                    host.style.setProperty('position', saved.value, saved.priority || '');
                else
                    host.style.removeProperty('position');
            }
            // 다른 테마가 이후에 바꾼 값은 덮어쓰지 않는다.
            if (savedPadding && host.style.getPropertyValue('padding-top') === savedPadding.applied && host.style.getPropertyPriority('padding-top') === 'important') {
                if (savedPadding.value)
                    host.style.setProperty('padding-top', savedPadding.value, savedPadding.priority || '');
                else
                    host.style.removeProperty('padding-top');
            }
        }
        CMU_INPUT_COUNTER.host = null;
        CMU_INPUT_COUNTER.hostPosition = null;
        CMU_INPUT_COUNTER.hostPaddingTop = null;
    }
    function cmuInputCounterUnbindEditor() {
        const editor = CMU_INPUT_COUNTER.editor;
        const handlers = CMU_INPUT_COUNTER.editorHandlers;
        clearTimeout(CMU_INPUT_COUNTER.delayedTimer);
        clearTimeout(CMU_INPUT_COUNTER.alertTimer);
        CMU_INPUT_COUNTER.delayedTimer = 0;
        CMU_INPUT_COUNTER.alertTimer = 0;
        CMU_INPUT_COUNTER.renderedElement?.classList.remove('cmu-input-counter-over-pulse');
        if (editor instanceof HTMLElement)
            CMU_INPUT_COUNTER.resizeObserver?.unobserve(editor);
        if (editor instanceof HTMLElement && handlers) {
            editor.removeEventListener('input', handlers.schedule, true);
            editor.removeEventListener('keyup', handlers.schedule, true);
            editor.removeEventListener('compositionend', handlers.schedule, true);
            editor.removeEventListener('cut', handlers.delayed, true);
            editor.removeEventListener('paste', handlers.delayed, true);
        }
        CMU_INPUT_COUNTER.editorObserver?.disconnect?.();
        CMU_INPUT_COUNTER.editor = null;
        CMU_INPUT_COUNTER.editorObserver = null;
        CMU_INPUT_COUNTER.editorHandlers = null;
        CMU_INPUT_COUNTER.previousCount = null;
        CMU_INPUT_COUNTER.renderedElement = null;
    }
    function cleanupCmuInputCounter() {
        if (CMU_INPUT_COUNTER.updateFrame) {
            cancelAnimationFrame(CMU_INPUT_COUNTER.updateFrame);
            CMU_INPUT_COUNTER.updateFrame = 0;
        }
        cmuInputCounterUnbindEditor();
        document.getElementById(ID.inputCounterWrap)?.remove?.();
        cmuInputCounterRestoreHost();
    }
    function cmuInputCounterText(editor) {
        if (!editor)
            return '';
        if (editor instanceof HTMLTextAreaElement || editor instanceof HTMLInputElement) {
            return String(editor.value || '')
                .replace(/\r\n?/g, '\n')
                .replace(/[\u200b\ufeff]/g, '');
        }
        let text = String(editor.innerText ?? editor.textContent ?? '')
            .replace(/\r\n?/g, '\n')
            .replace(/\u00a0/g, ' ')
            .replace(/[\u200b\ufeff]/g, '');
        const hasVisibleTextNode = String(editor.textContent || '').replace(/[\u200b\ufeff]/g, '').length > 0;
        const markedEmpty = !!editor.querySelector?.('.is-editor-empty');
        if (!hasVisibleTextNode && (markedEmpty || /^\n*$/.test(text)))
            text = '';
        return text;
    }
    function cmuInputCounterLength(text) {
        // 기존과 동일하게 유니코드 코드 포인트를 세되 중간 배열은 만들지 않는다.
        let count = 0;
        for (const character of String(text || ''))
            count += 1;
        return count;
    }
    function cmuInputCounterVisible(el) {
        if (!(el instanceof HTMLElement))
            return false;
        let rect;
        try {
            rect = el.getBoundingClientRect();
        }
        catch (_) {
            return false;
        }
        if (rect.width <= 0 || rect.height <= 0)
            return false;
        try {
            const css = getComputedStyle(el);
            return css.display !== 'none' && css.visibility !== 'hidden';
        }
        catch (_) {
            return true;
        }
    }
    function cmuInputCounterActionRowCandidate(row) {
        if (!(row instanceof HTMLElement) || !row.classList.contains('flex') || !row.classList.contains('items-center') || !row.classList.contains('justify-between'))
            return false;
        const visibleButtons = Array.from(row.querySelectorAll('button')).filter(button => {
            return !button.closest?.(`#${ID.inputCounterWrap}`) && cmuInputCounterVisible(button);
        });
        if (!visibleButtons.length)
            return false;
        const hasLeftButtonGroup = Array.from(row.children || []).some(child => {
            return child instanceof HTMLElement && (child.classList.contains('space-x-2') || !!child.querySelector?.('.space-x-2'));
        });
        return hasLeftButtonGroup || row.children.length >= 2;
    }
    function cmuInputCounterFindActionRow(editor) {
        if (!(editor instanceof HTMLElement))
            return null;
        const boundary = editor.closest('form') || editor.closest('main');
        const isCandidate = row => !isInsideKnownPopup(row) && cmuInputCounterActionRowCandidate(row);
        const cached = CMU_INPUT_COUNTER.host;
        if (cached?.isConnected && boundary?.contains(cached) && isCandidate(cached))
            return cached;
        let node = editor.parentElement;
        for (let depth = 0; depth < 10 && node && node !== document.body && node !== document.documentElement; depth += 1, node = node.parentElement) {
            if (!(node instanceof HTMLElement))
                continue;
            if (isCandidate(node))
                return node;
            const rows = Array.from(node.querySelectorAll?.('div.flex.items-center.justify-between') || [])
                .filter(isCandidate);
            if (rows.length)
                return rows[rows.length - 1];
            if (node === boundary)
                break;
        }
        return null;
    }
    function cmuInputCounterSetHost(host) {
        if (!(host instanceof HTMLElement))
            return;
        if (CMU_INPUT_COUNTER.host === host)
            return;
        cmuInputCounterRestoreHost();
        CMU_INPUT_COUNTER.host = host;
        host.setAttribute('data-cmu-input-counter-host', '1');
        try {
            const css = getComputedStyle(host);
            // 카운터 높이 18px + 버튼과의 간격 2px. 기존 여백이 더 크면 유지한다.
            const paddingTop = Math.max(20, parseFloat(css.paddingTop) || 0);
            if ((parseFloat(css.paddingTop) || 0) < paddingTop) {
                CMU_INPUT_COUNTER.hostPaddingTop = {
                    value: host.style.getPropertyValue('padding-top'),
                    priority: host.style.getPropertyPriority('padding-top'),
                    applied: `${paddingTop}px`,
                };
                host.style.setProperty('padding-top', `${paddingTop}px`, 'important');
            }
            if (css.position === 'static') {
                CMU_INPUT_COUNTER.hostPosition = {
                    value: host.style.getPropertyValue('position'),
                    priority: host.style.getPropertyPriority('position'),
                };
                host.style.setProperty('position', 'relative', 'important');
            }
        }
        catch (_) { }
        if (typeof ResizeObserver === 'function') {
            CMU_INPUT_COUNTER.resizeObserver = cmuSharedResizeClient(scheduleCmuInputCounterSync);
            CMU_INPUT_COUNTER.resizeObserver.observe(host);
            if (CMU_INPUT_COUNTER.editor instanceof HTMLElement)
                CMU_INPUT_COUNTER.resizeObserver.observe(CMU_INPUT_COUNTER.editor);
        }
    }
    function cmuInputCounterRemovePlacement() {
        document.getElementById(ID.inputCounterWrap)?.remove?.();
        CMU_INPUT_COUNTER.renderedElement = null;
        clearTimeout(CMU_INPUT_COUNTER.alertTimer);
        CMU_INPUT_COUNTER.alertTimer = 0;
        cmuInputCounterRestoreHost();
    }
    function ensureCmuInputCounterPlacement(editor) {
        const actionRow = cmuInputCounterFindActionRow(editor);
        if (!(actionRow instanceof HTMLElement)) {
            cmuInputCounterRemovePlacement();
            return null;
        }
        cmuInputCounterSetHost(actionRow);
        let wrap = document.getElementById(ID.inputCounterWrap);
        let countEl = document.getElementById(ID.inputCounterCount);
        if (!(wrap instanceof HTMLElement)) {
            wrap = document.createElement('div');
            wrap.id = ID.inputCounterWrap;
            wrap.setAttribute('aria-hidden', 'true');
        }
        if (!(countEl instanceof HTMLElement)) {
            countEl = document.createElement('span');
            countEl.id = ID.inputCounterCount;
            countEl.textContent = '0';
        }
        if (!wrap.contains(countEl))
            wrap.replaceChildren(countEl);
        if (wrap.parentElement !== actionRow)
            actionRow.prepend(wrap);
        const directChildren = Array.from(actionRow.children || []).filter(child => {
            return child instanceof HTMLElement && child.id !== ID.inputCounterWrap;
        });
        const leftToolbar = directChildren.find(child => {
            return child.classList.contains('space-x-2') || !!child.querySelector?.('.space-x-2');
        }) || null;
        // 버튼마다 크기를 한 번만 읽고 실제 전송 버튼을 우선 기준으로 삼는다.
        const rightButtons = [];
        for (const button of actionRow.querySelectorAll('button')) {
            if (!(button instanceof HTMLElement) || wrap.contains(button) || leftToolbar?.contains(button))
                continue;
            const rect = button.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0)
                continue;
            const css = getComputedStyle(button);
            if (css.display === 'none' || css.visibility === 'hidden')
                continue;
            rightButtons.push({ button, rect });
        }
        const sendButtons = rightButtons.filter(item => isRawSendButton(item.button));
        const candidates = sendButtons.length ? sendButtons : rightButtons;
        const anchor = candidates.reduce((best, item) => !best || item.rect.right > best.rect.right ? item : best, null);
        if (!anchor) {
            cmuInputCounterRemovePlacement();
            return null;
        }
        const rowRect = actionRow.getBoundingClientRect();
        // border/스크롤/테마의 배율을 반영해 화면 좌표를 호스트 내부 좌표로 환산한다.
        const scaleX = actionRow.offsetWidth > 0 ? rowRect.width / actionRow.offsetWidth : 1;
        const scaleY = actionRow.offsetHeight > 0 ? rowRect.height / actionRow.offsetHeight : 1;
        if (!(scaleX > 0) || !(scaleY > 0)) {
            cmuInputCounterRemovePlacement();
            return null;
        }
        const centerX = (anchor.rect.left + anchor.rect.width / 2 - rowRect.left) / scaleX - actionRow.clientLeft + actionRow.scrollLeft;
        const top = (anchor.rect.top - rowRect.top) / scaleY - actionRow.clientTop + actionRow.scrollTop - 2;
        if (!Number.isFinite(centerX) || !Number.isFinite(top)) {
            cmuInputCounterRemovePlacement();
            return null;
        }
        const positions = {
            '--cmu-input-counter-left': `${Math.max(0, centerX).toFixed(2)}px`,
            '--cmu-input-counter-top': `${Math.max(18, top).toFixed(2)}px`,
        };
        for (const [property, value] of Object.entries(positions)) {
            if (wrap.style.getPropertyValue(property) !== value)
                wrap.style.setProperty(property, value);
        }
        return countEl;
    }
    function cmuInputCounterLerp(a, b, t) {
        return a + (b - a) * Math.max(0, Math.min(1, t));
    }
    function cmuInputCounterWarningColor(count) {
        const { yellowStart, orangeStart, hotStart, limit } = CMU_INPUT_COUNTER;
        if (count < yellowStart)
            return '';
        if (count >= limit)
            return '#ef4444';
        if (count < orangeStart) {
            const t = (count - yellowStart) / (orangeStart - yellowStart);
            return `hsl(${cmuInputCounterLerp(47, 30, t).toFixed(1)} 92% ${cmuInputCounterLerp(48, 52, t).toFixed(1)}%)`;
        }
        const t = (count - orangeStart) / (limit - orangeStart);
        const hue = cmuInputCounterLerp(30, 0, t);
        const light = count >= hotStart ? cmuInputCounterLerp(52, 48, (count - hotStart) / (limit - hotStart)) : 52;
        return `hsl(${hue.toFixed(1)} 91% ${Math.max(48, light).toFixed(1)}%)`;
    }
    function cmuInputCounterAlert(countEl) {
        clearTimeout(CMU_INPUT_COUNTER.alertTimer);
        countEl.classList.remove('cmu-input-counter-over-pulse');
        void countEl.offsetWidth;
        countEl.classList.add('cmu-input-counter-over-pulse');
        CMU_INPUT_COUNTER.alertTimer = window.setTimeout(() => {
            CMU_INPUT_COUNTER.alertTimer = 0;
            countEl.classList.remove('cmu-input-counter-over-pulse');
        }, 560);
        try {
            navigator.vibrate?.([35, 30, 55]);
        }
        catch (_) { }
    }
    function bindCmuInputCounterEditor(editor) {
        if (!(editor instanceof HTMLElement) || editor === CMU_INPUT_COUNTER.editor) return;
        cmuInputCounterUnbindEditor();
        CMU_INPUT_COUNTER.editor = editor;
        CMU_INPUT_COUNTER.resizeObserver?.observe(editor);
        CMU_INPUT_COUNTER.editorObserver = cmuComposerSubscribe(editor, scheduleCmuInputCounterSync);
    }
    function renderCmuInputCounter() {
        CMU_INPUT_COUNTER.updateFrame = 0;
        if (CMU_INPUT_COUNTER.disposed || cmuUserNoteGuardActive())
            return;
        if (!shouldRun() || !settings.inputCharacterCounter || !isChatRoomPath()) {
            cleanupCmuInputCounter();
            return;
        }
        const editor = findChatInput();
        if (!(editor instanceof HTMLElement) || isInsideKnownPopup(editor)) {
            cleanupCmuInputCounter();
            return;
        }
        bindCmuInputCounterEditor(editor);
        const countEl = ensureCmuInputCounterPlacement(editor);
        if (!(countEl instanceof HTMLElement))
            return;
        const count = cmuInputCounterLength(cmuInputCounterText(editor));
        // 위치만 바뀐 프레임에서는 동일한 텍스트/속성을 다시 쓰지 않는다.
        if (CMU_INPUT_COUNTER.previousCount === count && CMU_INPUT_COUNTER.renderedElement === countEl)
            return;
        const formattedCount = count.toLocaleString('ko-KR');
        countEl.textContent = formattedCount;
        countEl.title = `현재 ${formattedCount}자 · 최대 ${CMU_INPUT_COUNTER.limit.toLocaleString('ko-KR')}자`;
        const color = cmuInputCounterWarningColor(count);
        if (color)
            countEl.style.setProperty('--cmu-input-counter-color', color);
        else
            countEl.style.removeProperty('--cmu-input-counter-color');
        countEl.dataset.empty = String(count === 0);
        countEl.dataset.warning = String(count >= CMU_INPUT_COUNTER.yellowStart);
        countEl.dataset.limit = String(count >= CMU_INPUT_COUNTER.limit);
        if (CMU_INPUT_COUNTER.previousCount !== null && CMU_INPUT_COUNTER.previousCount <= CMU_INPUT_COUNTER.limit && count > CMU_INPUT_COUNTER.limit)
            cmuInputCounterAlert(countEl);
        CMU_INPUT_COUNTER.previousCount = count;
        CMU_INPUT_COUNTER.renderedElement = countEl;
    }
    function scheduleCmuInputCounterSync() {
        if (CMU_INPUT_COUNTER.disposed || CMU_INPUT_COUNTER.updateFrame || cmuUserNoteGuardActive())
            return;
        CMU_INPUT_COUNTER.updateFrame = requestAnimationFrame(renderCmuInputCounter);
    }
    function findComposerFallbackHost(input) {
        if (!input)
            return null;
        const selectors = [
            'form',
            'div.flex.flex-col.rounded-lg.border',
            'div.rounded-lg.border.bg-background',
            'div[class*="rounded"][class*="border"]',
            'div[class*="bottom-0"]',
        ];
        for (const selector of selectors) {
            const host = input.closest?.(selector);
            if (host && !host.closest?.(`#${ID.panel}`))
                return host;
        }
        return input.parentElement || null;
    }
    function ensureToolbarButton({ syncInline = true } = {}) {
        if (!isChatRoomPath())
            return false;
        const input = findChatInput();
        if (!input)
            return false;
        const info = findToolbarInfo(input);
        const baseToolbar = info?.toolbar || null;
        const fallbackHost = !baseToolbar ? findComposerFallbackHost(input) : null;
        if (!baseToolbar && !fallbackHost)
            return false;
        let wrapper = document.getElementById(ID.toolbarWrapper);
        if (!wrapper) {
            wrapper = document.createElement('span');
            wrapper.id = ID.toolbarWrapper;
            wrapper.setAttribute('data-cmu-toolbar-addon', 'settings');
        }
        if (baseToolbar) {
            wrapper.classList.remove('cmu-fallback-toolbar');
            placeCmuToolbarWrapper(baseToolbar, wrapper);
        }
        else {
            wrapper.classList.add('cmu-fallback-toolbar');
            const host = fallbackHost;
            try {
                if (getComputedStyle(host).position === 'static')
                    host.style.position = 'relative';
            }
            catch (_) {
                host.style.position = 'relative';
            }
            if (wrapper.parentElement !== host)
                host.appendChild(wrapper);
        }
        const baseBtn = findNativeBaseButton(baseToolbar);
        let btn = document.getElementById(ID.settingsButton);
        if (!btn || btn.parentElement !== wrapper) {
            btn?.remove?.();
            btn = createToolbarButton(baseBtn);
            wrapper.insertBefore(btn, wrapper.firstChild || null);
        }
        let fullscreenBtn = document.getElementById(ID.fullscreenButton);
        if (settings.fullscreenButton && isCmuFullscreenSupported()) {
            if (!fullscreenBtn || fullscreenBtn.parentElement !== wrapper) {
                fullscreenBtn?.remove?.();
                fullscreenBtn = createFullscreenToolbarButton(baseBtn);
                const settingsBtn = document.getElementById(ID.settingsButton);
                if (settingsBtn?.parentElement === wrapper)
                    wrapper.insertBefore(fullscreenBtn, settingsBtn.nextSibling);
                else
                    wrapper.appendChild(fullscreenBtn);
            }
            else {
                setCmuFullscreenToolbarIcon(fullscreenBtn);
            }
        }
        else if (fullscreenBtn) {
            fullscreenBtn.remove();
        }
        let logCaptureBtn = document.getElementById(ID.logCaptureButton);
        if (settings.logCapture) {
            if (!logCaptureBtn || logCaptureBtn.parentElement !== wrapper) {
                logCaptureBtn?.remove?.();
                logCaptureBtn = createLogCaptureToolbarButton(baseBtn);
                const anchorBtn = document.getElementById(ID.fullscreenButton) || document.getElementById(ID.settingsButton);
                if (anchorBtn?.parentElement === wrapper)
                    wrapper.insertBefore(logCaptureBtn, anchorBtn.nextSibling);
                else
                    wrapper.appendChild(logCaptureBtn);
            }
            else {
                syncLogCaptureToolbarButton(logCaptureBtn);
            }
        }
        else if (logCaptureBtn) {
            logCaptureBtn.remove();
        }
        ensureComposerExpandButton(input);
        watchComposerScope(info?.scope || fallbackHost || input.closest?.('form') || input.parentElement);
        if (syncInline)
            ensureInlineBlocks(input);
        ensureCmuMenuSwipeZone(input);
        return true;
    }
    function watchComposerScope(scope) {
        if (!(scope instanceof Element))
            return;
        observedScope = scope;
    }

    const LOG_CAPTURE_CAMERA_SVG = `
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" style="fill:none!important;stroke:currentColor!important;">
      <path d="M4.5 8.5h4l1.25-2h4.5l1.25 2h4A1.5 1.5 0 0 1 21 10v7a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17v-7A1.5 1.5 0 0 1 4.5 8.5Z"></path>
      <circle cx="12" cy="13" r="3.2"></circle>
    </svg>`;
    addStyle(`
    #${ID.logCaptureButton}.cmu-native-toolbar-btn,
    #${ID.logCaptureButton}.cmu-native-toolbar-btn svg,
    #${ID.logCaptureButton}.cmu-native-toolbar-btn svg * {
      pointer-events:auto!important;
      touch-action:manipulation!important;
      fill:none!important;
      stroke:currentColor!important;
    }
    #${ID.logCaptureButton}.cmu-native-toolbar-btn svg {
      color:hsl(var(--line-gray-2, 0 0% 62%))!important;
      width:16px!important;
      height:16px!important;
    }
    #${ID.logCaptureButton}[data-cmu-logcap-on="1"] svg {
      color:hsl(var(--brand-primary, 336 90% 65%))!important;
    }
    html.cmu-logcap-mode main [data-message-group-id] {
      cursor:pointer!important;
      -webkit-tap-highlight-color:transparent!important;
      -webkit-user-select:none!important;
      user-select:none!important;
      -webkit-touch-callout:none!important;
    }
    html.cmu-logcap-mode main [data-message-group-id][data-cmu-logcap-selected="1"] {
      outline:2px solid rgba(255,178,94,.78)!important;
      outline-offset:3px!important;
      border-radius:12px!important;
    }
    #${ID.logCaptureBar}[hidden] { display:none!important; }
    #${ID.logCaptureBar} {
      position:fixed;
      left:50%;
      bottom:max(12px, env(safe-area-inset-bottom));
      transform:translateX(-50%);
      z-index:2147483200;
      width:min(94vw, 430px);
      max-width:94vw;
      box-sizing:border-box;
      padding:10px 11px;
      border-radius:14px;
      background:rgba(24,23,28,.94);
      border:1px solid rgba(255,255,255,.14);
      color:#fafafa;
      box-shadow:0 8px 24px rgba(0,0,0,.24);
      display:grid;
      grid-template-columns:minmax(0,1fr);
      gap:8px;
      touch-action:manipulation;
      pointer-events:auto;
    }
    #${ID.logCaptureBar} .cmu-lc-msg {
      min-width:0;
      font-size:13px;
      line-height:1.35;
      text-align:center;
    }
    #${ID.logCaptureBar} .cmu-lc-actions {
      display:grid;
      grid-template-columns:repeat(3,minmax(0,1fr));
      gap:7px;
    }
    #${ID.logCaptureBar} .cmu-lc-act {
      width:100%;
      min-width:0;
      min-height:39px;
      border:0;
      background:rgba(255,255,255,.08);
      color:#fff;
      border-radius:10px;
      padding:8px 7px;
      font-size:12px;
      white-space:nowrap;
      touch-action:manipulation;
      -webkit-tap-highlight-color:transparent;
    }
    #${ID.logCaptureBar} .cmu-lc-act.primary {
      background:rgba(255,178,94,.2);
      color:#ffd3a5;
    }
    #${ID.logCaptureBar} .cmu-lc-act:disabled {
      opacity:.35;
      pointer-events:none;
    }
    #${ID.logCapturePreview} {
      position:fixed;
      inset:0;
      z-index:2147483420;
      background:rgba(10,10,12,.7);
      backdrop-filter:blur(6px);
      display:none;
      touch-action:pan-y;
      -webkit-tap-highlight-color:transparent;
    }
    #${ID.logCapturePreview}.open {
      display:flex;
      align-items:stretch;
      justify-content:center;
    }
    #${ID.logCapturePreview} .cmu-lcp-panel {
      width:min(100vw, 980px);
      height:100%;
      height:100dvh;
      max-height:100%;
      background:#111214;
      color:#f4f4f5;
      display:flex;
      flex-direction:column;
      touch-action:pan-y;
    }
    #${ID.logCapturePreview} .cmu-lcp-head,
    #${ID.logCapturePreview} .cmu-lcp-foot {
      padding:10px 12px;
      border-bottom:1px solid rgba(255,255,255,.08);
      display:flex;
      gap:8px;
      align-items:center;
      flex-wrap:wrap;
    }
    #${ID.logCapturePreview} .cmu-lcp-head {
      padding-top:calc(10px + env(safe-area-inset-top));
    }
    #${ID.logCapturePreview} .cmu-lcp-foot {
      border-top:1px solid rgba(255,255,255,.08);
      border-bottom:0;
      padding-bottom:calc(10px + env(safe-area-inset-bottom));
    }
    #${ID.logCapturePreview} .cmu-lcp-title {
      font-size:13px;
      font-weight:700;
      margin-right:auto;
    }
    #${ID.logCapturePreview} .cmu-lcp-scroll {
      flex:1 1 auto;
      overflow:auto;
      padding:10px 6px;
      touch-action:pan-y;
      -webkit-overflow-scrolling:touch;
      overscroll-behavior:contain;
    }
    #${ID.logCapturePreview} .cmu-lcp-btn {
      border:1px solid rgba(255,255,255,.12);
      background:rgba(255,255,255,.06);
      color:#fff;
      border-radius:10px;
      padding:7px 10px;
      font-size:12px;
      line-height:1.2;
      touch-action:manipulation;
      -webkit-tap-highlight-color:transparent;
    }
    #${ID.logCapturePreview} .cmu-lcp-note {
      font-size:12px;
      color:#b8b8bf;
      line-height:1.45;
      margin-bottom:12px;
    }
    #${ID.logCapturePreview} .cmu-lcp-stage-wrap {
      display:flex;
      justify-content:center;
    }
    .cmu-lc-render-stage {
      --lc-bg:#FAFAF8;
      --lc-text:#201F1C;
      --lc-title:#161512;
      --lc-accent:#201F1C;
      --lc-dialogue:#77746C;
      --lc-line:#E4E2DC;
      --lc-em:#77746C;
      width:840px;
      max-width:100%;
      box-sizing:border-box;
      overflow:hidden;
      background:var(--lc-bg);
      color:var(--lc-text);
      font-family:'Pretendard Variable',Pretendard,'Noto Sans KR','Apple SD Gothic Neo','Malgun Gothic',sans-serif;
      font-size:15px;
      line-height:1.92;
      letter-spacing:.01em;
      word-break:keep-all;
      overflow-wrap:anywhere;
    }
    .cmu-lc-render-stage.theme-specsheet {
      --lc-bg:#F5F5F1;--lc-text:#161513;--lc-title:#161513;--lc-accent:#161513;--lc-dialogue:#57544D;--lc-line:#161513;--lc-em:#74716A;
      border:2px solid var(--lc-line);
      background-image:linear-gradient(rgba(22,21,19,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(22,21,19,.05) 1px,transparent 1px);
      background-size:20px 20px;
      box-shadow:6px 6px 0 rgba(22,21,19,.88);
    }
    .cmu-lc-render-stage.theme-gwedo {
      --lc-bg:#FAFAF8;--lc-text:#201F1C;--lc-title:#161512;--lc-accent:#201F1C;--lc-dialogue:#77746C;--lc-line:#E4E2DC;--lc-em:#77746C;
      border:1px solid var(--lc-line);
    }
    .cmu-lc-render-stage.theme-simya {
      --lc-bg:#161B24;--lc-text:#D6DAE2;--lc-title:#EEF0F4;--lc-accent:#C2A468;--lc-dialogue:#8FA4C4;--lc-line:#3A4152;--lc-em:#AFA58D;
      border:1px solid var(--lc-line);
      border-left:7px solid var(--lc-accent);
    }
    .cmu-lc-render-stage.theme-seongjwa {
      --lc-bg:#0E1220;--lc-text:#CFD6E6;--lc-title:#E9EEF8;--lc-accent:#7286AD;--lc-dialogue:#9DB1DD;--lc-line:#35405E;--lc-em:#9AA7C1;
      border:1px solid var(--lc-line);
      background-image:radial-gradient(circle at 18% 14%,rgba(157,177,221,.14) 0 1px,transparent 1.5px),radial-gradient(circle at 78% 22%,rgba(114,134,173,.14) 0 1px,transparent 1.5px),radial-gradient(circle at 48% 82%,rgba(157,177,221,.11) 0 1px,transparent 1.5px);
      background-size:92px 92px,133px 133px,161px 161px;
    }
    .cmu-lc-render-stage.theme-heugyo {
      --lc-bg:#131210;--lc-text:#DDD9CF;--lc-title:#F0EDE4;--lc-accent:#D8D3C6;--lc-dialogue:#C9B788;--lc-line:#2A2925;--lc-em:#B7A98C;
      border:1px solid var(--lc-line);
      font-family:'Noto Serif KR','Gowun Batang',Batang,'바탕',serif;
    }
    .cmu-lc-render-stage :is(em,i) {
      font-style:normal!important;
      color:var(--lc-em)!important;
    }
    .cmu-lc-render-stage :is(em,i) * {
      font-style:normal!important;
      color:inherit!important;
    }
    .cmu-lc-theme-head,
    .cmu-lc-theme-foot {
      box-sizing:border-box;
      color:var(--lc-accent);
    }
    .cmu-lc-content { box-sizing:border-box; }

    .theme-specsheet .cmu-lc-theme-head { padding:13px 16px 10px;border-bottom:2px solid var(--lc-line);background:rgba(230,229,224,.88); }
    .theme-specsheet .cmu-lc-theme-foot { padding:9px 16px 12px;border-top:2px solid var(--lc-line);background:rgba(230,229,224,.88); }
    .theme-specsheet .cmu-lc-content { padding:16px; }
    .cmu-lc-spec-mark { display:flex;align-items:center;gap:7px; }
    .cmu-lc-spec-mark span { display:block;height:7px;background:var(--lc-accent); }
    .cmu-lc-spec-mark span:nth-child(1){width:58px}.cmu-lc-spec-mark span:nth-child(2){width:12px}.cmu-lc-spec-mark span:nth-child(3){width:7px;opacity:.55}
    .cmu-lc-spec-end { display:flex;justify-content:flex-end;gap:4px; }
    .cmu-lc-spec-end i { display:block;width:4px;height:13px;background:var(--lc-accent); }

    .theme-gwedo .cmu-lc-theme-head { padding:24px 22px 16px; }
    .theme-gwedo .cmu-lc-theme-foot { padding:22px 22px 25px; }
    .theme-gwedo .cmu-lc-content { padding:0 22px; }
    .cmu-lc-orbit-rule { display:flex;align-items:center;justify-content:center;gap:10px;color:var(--lc-accent);font-size:9px;line-height:1; }
    .cmu-lc-orbit-rule::before,.cmu-lc-orbit-rule::after { content:'';width:82px;height:1px;background:var(--lc-line); }
    .cmu-lc-orbit-rule.small::before,.cmu-lc-orbit-rule.small::after { width:46px; }

    .theme-simya .cmu-lc-theme-head { padding:21px 22px 15px;border-bottom:1px solid var(--lc-line); }
    .theme-simya .cmu-lc-theme-foot { padding:18px 22px 22px; }
    .theme-simya .cmu-lc-content { padding:20px 22px 0; }
    .cmu-lc-night-mark { display:flex;gap:8px;align-items:center; }
    .cmu-lc-night-mark i { width:5px;height:5px;border:1px solid var(--lc-accent);transform:rotate(45deg);opacity:.95; }
    .cmu-lc-night-end { display:flex;justify-content:flex-end;align-items:center;gap:10px; }
    .cmu-lc-night-end::before { content:'';width:95px;height:1px;background:var(--lc-line); }
    .cmu-lc-night-end::after { content:'◆';font-size:8px;color:var(--lc-accent); }

    .theme-seongjwa .cmu-lc-theme-head { padding:22px 20px 16px;text-align:center; }
    .theme-seongjwa .cmu-lc-theme-foot { padding:20px 20px 24px;text-align:center; }
    .theme-seongjwa .cmu-lc-content { padding:0 22px; }
    .cmu-lc-star-mark { color:var(--lc-accent);font-size:12px;letter-spacing:.55em; }

    .theme-heugyo .cmu-lc-theme-head { padding:22px 22px 16px; }
    .theme-heugyo .cmu-lc-theme-foot { padding:22px 22px 28px; }
    .theme-heugyo .cmu-lc-content { padding:0 22px; }
    .cmu-lc-heugyo-mark { display:block;width:48px;height:48px; }

    .cmu-lc-card { position:relative;margin:0;box-sizing:border-box; }
    .cmu-lc-rolebar { display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:10px;margin:0 0 10px;min-height:25px; }
    .cmu-lc-role { justify-self:start;font-family:'IBM Plex Mono',Consolas,Menlo,monospace;font-size:10px;font-weight:700;letter-spacing:.24em;line-height:1;color:var(--lc-accent); }
    .cmu-lc-card.user .cmu-lc-role { justify-self:end;color:var(--lc-dialogue); }
    .cmu-lc-body { min-width:0; }
    .cmu-lc-render-stage.is-editing .cmu-lc-body { padding-top:4px; }
    .cmu-lc-render-stage.is-editing .cmu-lc-block:not(.is-image) {
      margin-left:-28px;
      padding-left:28px;
    }

    .theme-specsheet .cmu-lc-card { padding:17px 18px 18px;border:1.5px solid var(--lc-line);background:rgba(251,251,248,.94); }
    .theme-specsheet .cmu-lc-card + .cmu-lc-card { margin-top:17px; }
    .theme-specsheet .cmu-lc-rolebar { margin:-17px -18px 14px;padding:7px 12px;border-bottom:1.5px solid var(--lc-line);background:var(--lc-line); }
    .theme-specsheet .cmu-lc-role { color:var(--lc-bg); }.theme-specsheet .cmu-lc-card.user .cmu-lc-role { color:#E8E5DD; }

    .theme-gwedo .cmu-lc-card + .cmu-lc-card { margin-top:27px; }
    .theme-gwedo .cmu-lc-card.assistant { padding-left:15px;border-left:1px solid var(--lc-accent); }
    .theme-gwedo .cmu-lc-card.user { margin-left:3%;padding-right:14px;border-right:2px solid var(--lc-dialogue);color:#4D4B46; }

    .theme-simya .cmu-lc-card + .cmu-lc-card { margin-top:29px; }
    .theme-simya .cmu-lc-card.assistant { width:97%;padding-left:13px;border-left:2px solid var(--lc-accent); }
    .theme-simya .cmu-lc-card.user { width:97%;margin-left:auto;padding-right:13px;border-right:2px solid var(--lc-dialogue);color:#C6CAD2; }

    .theme-seongjwa .cmu-lc-card + .cmu-lc-card { margin-top:42px; }
    .theme-seongjwa .cmu-lc-card + .cmu-lc-card::before { content:'✦ ─── ✧ ─── ✦';position:absolute;top:-28px;left:0;right:0;text-align:center;color:var(--lc-line);font-size:10px;letter-spacing:.08em; }
    .theme-seongjwa .cmu-lc-role::before { content:'✦ '; }

    .theme-heugyo .cmu-lc-card + .cmu-lc-card { margin-top:27px; }
    .theme-heugyo .cmu-lc-card.assistant { padding-left:14px;border-left:1px solid var(--lc-accent); }
    .theme-heugyo .cmu-lc-card.user { margin-left:3%;padding-right:14px;border-right:2px solid var(--lc-dialogue);color:#CEC6B8; }

    .cmu-lc-block { position:relative;margin:0 0 .78em; }
    .cmu-lc-block:last-child { margin-bottom:0; }
    .cmu-lc-block p { margin:.62em 0; }
    .cmu-lc-block blockquote { margin:.7em 0;padding:.28em 0 .28em .9em;border-left:2px solid var(--lc-dialogue);color:var(--lc-em); }
    .cmu-lc-block ul,.cmu-lc-block ol { padding-left:1.3em;margin:.65em 0; }
    .cmu-lc-block pre { white-space:pre-wrap;overflow-wrap:anywhere;padding:.82em .95em;border-radius:8px;background:rgba(127,127,127,.09);font-size:.92em;line-height:1.6; }
    .cmu-lc-block img { display:block;max-width:100%;height:auto;margin:.75em auto;border-radius:8px; }
    #${ID.logCapturePreview} .cmu-lc-edit-message,
    #${ID.logCapturePreview} .cmu-lc-edit-block {
      z-index:2;
      display:flex;
      align-items:center;
      justify-content:center;
      border:1px solid rgba(0,0,0,.13);
      background:rgba(255,255,255,.94);
      color:#3a3834;
      box-shadow:0 2px 8px rgba(0,0,0,.08);
    }
    #${ID.logCapturePreview} .cmu-lc-edit-message {
      position:static;
      justify-self:end;
      width:25px;
      height:25px;
      padding:0;
      border-radius:999px;
      font-size:17px;
      line-height:1;
    }
    #${ID.logCapturePreview} .cmu-lc-edit-block {
      position:absolute;
      top:2px;
      left:1px;
      width:24px;
      height:23px;
      padding:0;
      border-radius:999px;
      font-size:13px;
      line-height:1;
    }
    #${ID.logCapturePreview} .cmu-lc-block.is-image .cmu-lc-edit-block {
      top:8px;
      right:8px;
      left:auto;
      width:auto;
      min-width:25px;
      padding:0 8px;
      border-radius:999px;
      font-size:11px;
    }
    #${ID.logCapturePreview} .cmu-lc-excluded {
      display:block;
      width:100%;
      box-sizing:border-box;
      border:1px dashed var(--lc-line);
      background:rgba(127,127,127,.14);
      color:var(--lc-em);
      border-radius:9px;
      padding:9px 11px;
      font-size:12px;
      line-height:1.35;
      text-align:center;
    }
    #${ID.logCapturePreview} .cmu-lc-excluded-message {
      margin:0;
      min-height:46px;
    }
    #${ID.logCapturePreview} .cmu-lc-empty {
      padding:34px 18px;
      text-align:center;
      color:#77736c;
      font-size:13px;
    }
    #${ID.logCapturePreview} .cmu-lcp-output-wrap {
      width:min(100%, 840px);
      margin:0 auto;
      background:#fff;
      box-shadow:0 6px 24px rgba(0,0,0,.28);
      overflow:visible;
    }
    #${ID.logCapturePreview} .cmu-lcp-output-img {
      display:block;
      width:100%;
      height:auto;
      margin:0;
      border:0;
      background:#fff;
      -webkit-user-select:auto!important;
      user-select:auto!important;
      -webkit-touch-callout:default!important;
      -webkit-tap-highlight-color:rgba(0,0,0,.08)!important;
      touch-action:auto!important;
      pointer-events:auto!important;
    }
    #${ID.logCapturePreview} .cmu-lcp-output-help {
      margin:12px auto 4px;
      max-width:840px;
      color:#b8b8bf;
      font-size:12px;
      line-height:1.5;
      text-align:center;
    }
    #${ID.logCapturePreview} .cmu-lcp-inline-status {
      min-height:18px;
      margin-right:auto;
      color:#b8b8bf;
      font-size:12px;
      line-height:1.35;
    }
    #cmu-settings-panel .qputil .subrow.cmu-choice-row,
    #cmu-settings-panel .qputil .subrow.cmu-rule-editor {
      display:block!important;
      min-height:0!important;
      align-items:stretch!important;
    }
    #cmu-settings-panel .qputil .subrow.cmu-choice-row > .lbl,
    #cmu-settings-panel .qputil .subrow.cmu-rule-editor > .lbl {
      display:block!important;
      width:100%!important;
      margin:0 0 8px!important;
      line-height:1.45!important;
    }
    #cmu-settings-panel .qputil .subrow.cmu-choice-row > .chips {
      display:flex!important;
      width:100%!important;
      padding:0!important;
      gap:7px!important;
      flex-wrap:wrap!important;
    }
    #${ID.logCapturePreview} .cmu-lcp-select {
      display:block;
      box-sizing:border-box;
      width:100%;
      min-width:0;
      border:1px solid rgba(255,255,255,.1);
      border-radius:11px;
      background:#17181b;
      color:#f5f5f6;
      padding:9px 34px 9px 11px;
      font:inherit;
      line-height:1.3;
      color-scheme:dark;
    }
    #${ID.logCapturePreview} .cmu-lcp-select {
      width:auto;
      min-width:126px;
      padding:7px 31px 7px 10px;
      font-size:12px;
    }
    .cmu-lc-rule-list { display:flex;flex-direction:column;gap:8px; }
    .cmu-lc-rule-row { display:grid;grid-template-columns:minmax(0,1fr) 18px minmax(0,1fr) 30px;gap:6px;align-items:center; }
    .cmu-lc-rule-input { box-sizing:border-box;width:100%;min-width:0;border:1px solid rgba(255,255,255,.09);border-radius:10px;background:#17181b;color:#f5f5f6;padding:9px 10px;font:inherit;line-height:1.35; }
    .cmu-lc-rule-arrow { text-align:center;color:#8c8e96;font-size:13px; }
    .cmu-lc-rule-delete { width:30px;height:30px;border:1px solid rgba(255,255,255,.09);border-radius:9px;background:rgba(255,255,255,.04);color:#bbbcc3;font-size:16px;line-height:1; }
    .cmu-lc-rule-add { margin-top:10px;width:100%;border:1px dashed rgba(255,255,255,.14);border-radius:10px;background:rgba(255,255,255,.035);color:#d3d4d9;padding:9px 10px;font:inherit;font-size:12px; }
    .cmu-lc-rule-empty { padding:12px;border:1px dashed rgba(255,255,255,.09);border-radius:10px;color:#8f9199;text-align:center;font-size:12px;line-height:1.4; }
    #${ID.logCapturePreview} .cmu-lcp-bulk-row { display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-width:0; }
    #${ID.logCapturePreview} .cmu-lcp-theme-row { display:flex;align-items:center;gap:7px;min-width:0; }
    #${ID.logCapturePreview} .cmu-lcp-theme-row span { font-size:12px;color:#b8b8bf;white-space:nowrap; }
    #${ID.logCapturePreview} .cmu-lc-edit-block.is-code { width:auto;min-width:25px;padding:0 8px;font-size:11px;left:1px; }
    .cmu-lc-rule-add,.cmu-lc-rule-delete { touch-action:manipulation; }
    `);
    function normalizeLogCaptureTheme(value) {
        const key = String(value || '').trim();
        return Object.prototype.hasOwnProperty.call(LOG_CAPTURE_THEME_META, key) ? key : 'gwedo';
    }
    function removeLogCaptureToolbarButton() {
        document.getElementById(ID.logCaptureButton)?.remove?.();
    }
    function syncLogCaptureToolbarButton(btn = document.getElementById(ID.logCaptureButton)) {
        if (!(btn instanceof HTMLButtonElement))
            return;
        const on = !!(LOG_CAPTURE.active || LOG_CAPTURE.previewOpen);
        btn.dataset.cmuLogcapOn = on ? '1' : '0';
        btn.title = on ? '로그 캡처 모드 종료' : '로그 캡처';
        btn.setAttribute('aria-label', btn.title);
    }
    function createLogCaptureToolbarButton(baseBtn) {
        const btn = baseBtn ? baseBtn.cloneNode(true) : document.createElement('button');
        prepareNativeButton(btn, baseBtn);
        btn.id = ID.logCaptureButton;
        btn.classList.add('cmu-native-toolbar-btn');
        btn.setAttribute('data-cmu-toolbar-button', 'log-capture');
        btn.innerHTML = LOG_CAPTURE_CAMERA_SVG;
        syncLogCaptureToolbarButton(btn);
        btn.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); });
        btn.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();
            toggleLogCaptureMode();
        });
        return btn;
    }
    function cmuLogCaptureRunBarAction(target, event = null) {
        const button = target?.closest?.('[data-lc-act]');
        if (!(button instanceof HTMLButtonElement) || button.disabled)
            return false;
        const act = button.dataset.lcAct || '';
        if (!act)
            return false;
        event?.preventDefault?.();
        event?.stopPropagation?.();
        event?.stopImmediatePropagation?.();
        if (act === 'cancel') {
            cmuLogCaptureExitMode(true, true);
        }
        else if (act === 'clear') {
            cmuLogCaptureClearSelected();
        }
        else if (act === 'preview') {
            cmuLogCaptureOpenPreview();
        }
        else {
            return false;
        }
        return true;
    }
    function cmuLogCaptureGetBar() {
        let bar = document.getElementById(ID.logCaptureBar);
        if (bar?.dataset.cmuRetiring === '1') {
            bar.remove();
            bar = null;
            if (LOG_CAPTURE.barRetireTimer) {
                clearTimeout(LOG_CAPTURE.barRetireTimer);
                LOG_CAPTURE.barRetireTimer = 0;
            }
        }
        if (!bar) {
            bar = document.createElement('div');
            bar.id = ID.logCaptureBar;
            bar.innerHTML = `<div class="cmu-lc-msg"></div><div class="cmu-lc-actions"><button type="button" class="cmu-lc-act" data-lc-act="cancel">취소</button><button type="button" class="cmu-lc-act" data-lc-act="clear">전체 해제</button><button type="button" class="cmu-lc-act primary" data-lc-act="preview">미리보기</button></div>`;
            const runPointer = (e) => cmuLogCaptureRunBarAction(e.target, e);
            const runClick = (e) => {
                // pointerup/touchend 직후 브라우저가 만드는 합성 click은 반드시 여기서 소비한다.
                // 취소 시 바가 사라진 자리의 사이트 버튼으로 클릭이 관통하는 것을 막는다.
                if (bar.dataset.cmuRetiring === '1' || e.detail !== 0) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation?.();
                    return;
                }
                cmuLogCaptureRunBarAction(e.target, e);
            };
            if ('PointerEvent' in window)
                bar.addEventListener('pointerup', runPointer, true);
            else
                bar.addEventListener('touchend', runPointer, { capture: true, passive: false });
            bar.addEventListener('click', runClick, true);
            document.body.appendChild(bar);
        }
        return bar;
    }
    function cmuLogCaptureRefreshBar() {
        const bar = cmuLogCaptureGetBar();
        const count = LOG_CAPTURE.selectedIds.length;
        const msg = bar.querySelector('.cmu-lc-msg');
        if (msg)
            msg.textContent = count ? `${count}개 선택됨 · 로그를 더 눌러 추가/해제` : '캡처할 로그를 하나씩 선택하세요';
        const clear = bar.querySelector('[data-lc-act="clear"]');
        const preview = bar.querySelector('[data-lc-act="preview"]');
        if (clear)
            clear.disabled = count < 1;
        if (preview)
            preview.disabled = count < 1;
        bar.hidden = false;
    }
    function cmuLogCaptureHideBar(guardClickThrough = false) {
        const bar = document.getElementById(ID.logCaptureBar);
        if (!bar)
            return;
        if (LOG_CAPTURE.barRetireTimer) {
            clearTimeout(LOG_CAPTURE.barRetireTimer);
            LOG_CAPTURE.barRetireTimer = 0;
        }
        if (!guardClickThrough) {
            bar.remove();
            return;
        }
        // 취소는 pointerup/touchend에서 실행된다. 이때 바를 즉시 제거하면 이어서 생성되는
        // 합성 click이 같은 좌표의 사이트 버튼으로 재타깃될 수 있다. 화면에서는 즉시 숨기되
        // 짧은 시간 투명한 히트 영역으로 남겨 그 click을 소비한 뒤 제거한다.
        bar.dataset.cmuRetiring = '1';
        bar.setAttribute('aria-hidden', 'true');
        bar.style.setProperty('opacity', '0', 'important');
        bar.style.setProperty('pointer-events', 'auto', 'important');
        bar.style.setProperty('transition', 'none', 'important');
        LOG_CAPTURE.barRetireTimer = window.setTimeout(() => {
            if (bar.isConnected)
                bar.remove();
            LOG_CAPTURE.barRetireTimer = 0;
        }, 450);
    }
    function cmuLogCaptureClearMarks() {
        document.querySelectorAll('[data-cmu-logcap-selected]').forEach(el => el.removeAttribute('data-cmu-logcap-selected'));
    }
    function cmuLogCaptureMarkSelection() {
        cmuLogCaptureClearMarks();
        LOG_CAPTURE.selectedIds.forEach(id => {
            const group = document.querySelector(`[data-message-group-id="${CSS.escape(id)}"]`);
            if (group instanceof HTMLElement)
                group.setAttribute('data-cmu-logcap-selected', '1');
        });
    }
    function lcMessageOrderKey(id = '', fallback = 0) {
        const clean = String(id || '').trim().toLowerCase();
        if (/^[0-9a-f]{24}$/.test(clean))
            return `0:${clean}`;
        return `1:${String(fallback).padStart(10, '0')}:${clean}`;
    }
    function cmuLogCaptureSyncSelectedIds() {
        LOG_CAPTURE.selectedIds = Array.from(LOG_CAPTURE.selectedModels.entries())
            .sort((a, b) => String(a[1]?.orderKey || '').localeCompare(String(b[1]?.orderKey || '')))
            .map(([id]) => id);
    }
    function cmuLogCaptureClearSelected() {
        LOG_CAPTURE.selectedModels.clear();
        LOG_CAPTURE.selectedIds = [];
        cmuLogCaptureMarkSelection();
        cmuLogCaptureRefreshBar();
    }
    function cmuLogCaptureStartSelection(options = {}) {
        const preserve = options.preserve === true;
        LOG_CAPTURE.active = true;
        LOG_CAPTURE.previewOpen = false;
        LOG_CAPTURE.rendering = false;
        if (!preserve) {
            LOG_CAPTURE.selectedModels.clear();
            LOG_CAPTURE.selectedIds = [];
            LOG_CAPTURE.selectionSeq = 0;
        }
        document.documentElement.classList.add('cmu-logcap-mode');
        syncLogCaptureToolbarButton();
        cmuLogCaptureMarkSelection();
        cmuLogCaptureRefreshBar();
    }
    function cmuLogCaptureExitMode(clear = false, guardClickThrough = false) {
        LOG_CAPTURE.active = false;
        document.documentElement.classList.remove('cmu-logcap-mode');
        cmuLogCaptureHideBar(guardClickThrough);
        cmuLogCaptureClearMarks();
        if (clear) {
            LOG_CAPTURE.selectedModels.clear();
            LOG_CAPTURE.selectedIds = [];
            LOG_CAPTURE.selectionSeq = 0;
        }
        syncLogCaptureToolbarButton();
    }
    function toggleLogCaptureMode() {
        if (!settings.logCapture || !isChatRoomPath()) {
            showToast('로그 캡처를 먼저 켜 주세요');
            return;
        }
        if (LOG_CAPTURE.active) {
            cmuLogCaptureExitMode(true);
        }
        else if (LOG_CAPTURE.previewOpen) {
            cmuLogCaptureClosePreview(true);
        }
        else {
            cmuLogCaptureStartSelection();
        }
    }
    function lcSanitizeClone(root) {
        if (!(root instanceof HTMLElement))
            return root;
        root.querySelectorAll('button, textarea, input, select, [contenteditable="true"], .cmu-message-badge, .cac-answer-cost, .cmi-model-slot, [data-cmu-toolbar-button], [data-action], [role="button"], [role="menu"], [aria-label="메시지 옵션"]').forEach(el => el.remove());
        root.querySelectorAll('script, style').forEach(el => el.remove());
        if (!settings.logCaptureIncludeImages)
            root.querySelectorAll('img, video').forEach(el => el.remove());
        if (!settings.logCaptureIncludeCodeBlocks)
            root.querySelectorAll('.wrtn-codeblock, pre').forEach(el => {
                if (el.matches?.('pre') && el.closest?.('.wrtn-codeblock'))
                    return;
                el.remove();
            });
        root.querySelectorAll('[data-cmu-theme-quote], [data-sgb-quote]').forEach(el => {
            const parent = el.parentNode;
            if (!parent)
                return;
            while (el.firstChild)
                parent.insertBefore(el.firstChild, el);
            el.remove();
        });
        root.querySelectorAll('*').forEach(el => {
            el.removeAttribute('style');
            el.removeAttribute('class');
        });
        root.removeAttribute('style');
        root.removeAttribute('class');
        return root;
    }
    function lcParseTextRules(raw = []) {
        return normalizeLogCaptureRules(raw).map(rule => ({
            from: String(rule.from || ''),
            to: String(rule.to || ''),
        })).filter(rule => !!rule.from);
    }
    function lcApplyTextRules(root) {
        if (!(root instanceof HTMLElement))
            return;
        const rules = lcParseTextRules(settings.logCaptureRules);
        if (!rules.length)
            return;
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
        const nodes = [];
        while (walker.nextNode())
            nodes.push(walker.currentNode);
        nodes.forEach(node => {
            let value = String(node.nodeValue || '');
            rules.forEach(rule => { value = value.split(rule.from).join(rule.to || ''); });
            node.nodeValue = value;
        });
    }
    function lcFindContentRoot(group) {
        if (!(group instanceof HTMLElement))
            return null;
        const preferredSelectors = [
            '.wrtn-markdown',
            '[class*="wrtn-markdown"]',
            '.markdown-body',
            '.prose',
            '[class*="prose"]',
            '[class*="whitespace-pre-wrap"]',
            '[class*="break-words"]',
            '[class*="break-all"]'
        ];
        for (const selector of preferredSelectors) {
            const candidates = Array.from(group.querySelectorAll(selector)).filter(el => {
                if (!(el instanceof HTMLElement))
                    return false;
                if (el.closest('button, [role="menu"], [data-radix-popper-content-wrapper]'))
                    return false;
                return !!String(el.textContent || '').trim() || !!el.querySelector('img');
            });
            if (candidates.length)
                return candidates.sort((a, b) => String(b.textContent || '').length - String(a.textContent || '').length)[0];
        }
        const leaves = Array.from(group.querySelectorAll('p, div, span')).filter(el => {
            if (!(el instanceof HTMLElement) || el.querySelector('button, [role="button"]'))
                return false;
            const value = String(el.textContent || '').trim();
            if (!value || value.length < 2)
                return false;
            const childText = Array.from(el.children).some(child => String(child.textContent || '').trim() === value);
            return !childText;
        });
        return leaves.sort((a, b) => String(b.textContent || '').length - String(a.textContent || '').length)[0] || null;
    }
    function lcNormalizeBlockNode(node) {
        if (!node)
            return null;
        if (node.nodeType === Node.TEXT_NODE) {
            const txt = String(node.textContent || '').replace(/\s+/g, ' ').trim();
            if (!txt)
                return null;
            const p = document.createElement('p');
            p.textContent = txt;
            return p;
        }
        if (!(node instanceof HTMLElement))
            return null;
        if (node.tagName === 'IMG') {
            const wrap = document.createElement('div');
            wrap.appendChild(node.cloneNode(true));
            return wrap;
        }
        return node.cloneNode(true);
    }
    function lcCaptureImageSource(img) {
        if (!(img instanceof HTMLImageElement))
            return '';
        return String(img.currentSrc || img.getAttribute('src') || img.getAttribute('data-src') || '').trim();
    }
    function lcIsMessageContentImage(img) {
        if (!(img instanceof HTMLImageElement))
            return false;
        if (img.closest('[role="menu"], [data-radix-popper-content-wrapper], .cmu-message-badge, .cac-answer-cost, .cmi-model-slot, [data-cmu-toolbar-button]'))
            return false;
        const src = lcCaptureImageSource(img);
        if (!src || /^data:image\/svg\+xml/i.test(src))
            return false;
        const rect = img.getBoundingClientRect?.();
        const renderedWidth = Number(rect?.width || img.getAttribute('width') || 0);
        const renderedHeight = Number(rect?.height || img.getAttribute('height') || 0);
        const naturalWidth = Number(img.naturalWidth || 0);
        const naturalHeight = Number(img.naturalHeight || 0);
        const knownContentHost = /wrtn-image-ai-character\.static\.wrtn\.ai|wrtn-image-ai-character\.s3\.ap-northeast-2\.amazonaws\.com|wrtn-common-image\.s3\.ap-northeast-2\.amazonaws\.com|d394jeh9729epj\.cloudfront\.net|d1k8apdmymvh8f\.cloudfront\.net|cdn-image(?:\.static)?\.wrtn\.ai|crack\.static\.wrtn\.ai|wrtn-contents-gen-image\.wow\.wrtn\.ai/i.test(src);
        const hint = `${img.getAttribute('alt') || ''} ${img.getAttribute('class') || ''} ${img.getAttribute('data-testid') || ''}`;
        if (/avatar|profile|icon|emoji|model/i.test(hint))
            return false;
        if (renderedWidth > 0 && renderedHeight > 0 && Math.max(renderedWidth, renderedHeight) < 96)
            return false;
        return knownContentHost || Math.max(renderedWidth, renderedHeight) >= 120 || Math.max(naturalWidth, naturalHeight) >= 240;
    }
    function lcAppendMissingMessageImages(group, clone) {
        if (!(group instanceof HTMLElement) || !(clone instanceof HTMLElement) || !settings.logCaptureIncludeImages)
            return;
        const existing = new Set(Array.from(clone.querySelectorAll('img')).map(lcCaptureImageSource).filter(Boolean));
        Array.from(group.querySelectorAll('img')).forEach(sourceImage => {
            if (!lcIsMessageContentImage(sourceImage))
                return;
            const src = lcCaptureImageSource(sourceImage);
            if (!src || existing.has(src))
                return;
            const img = sourceImage.cloneNode(true);
            img.setAttribute('src', src);
            img.removeAttribute('srcset');
            img.removeAttribute('sizes');
            img.removeAttribute('loading');
            img.removeAttribute('style');
            img.removeAttribute('class');
            const wrap = document.createElement('div');
            wrap.appendChild(img);
            clone.appendChild(wrap);
            existing.add(src);
        });
    }
    function lcBuildMessageModel(group) {
        const root = lcFindContentRoot(group);
        if (!(root instanceof HTMLElement))
            return null;
        const role = isUserGroupByDom(group) ? 'user' : 'assistant';
        const clone = lcSanitizeClone(root.cloneNode(true));
        lcAppendMissingMessageImages(group, clone);
        lcApplyTextRules(clone);
        const rawNodes = Array.from(clone.childNodes || []).map(lcNormalizeBlockNode).filter(Boolean);
        const nodes = rawNodes.length ? rawNodes : [clone];
        const blocks = nodes.map(node => {
            const wrap = document.createElement('div');
            wrap.appendChild(node.cloneNode(true));
            const html = wrap.innerHTML.trim();
            const plain = String(wrap.textContent || '').replace(/\s+/g, ' ').trim();
            const hasImage = /<img[\s>]/i.test(html);
            const hasCode = /<pre[\s>]/i.test(html) || /data-(?:cmu-theme|sgb)-codeblock/i.test(html);
            if (!plain && !hasImage)
                return null;
            return { html, type: hasImage ? 'image' : (hasCode ? 'code' : 'block'), off: false };
        }).filter(Boolean);
        if (!blocks.length)
            return null;
        return {
            id: groupMessageId(group),
            role,
            off: false,
            blocks,
        };
    }
    function lcCloneState(state) {
        return JSON.parse(JSON.stringify(state || null));
    }
    function lcPushUndoOps(ops) {
        if (!LOG_CAPTURE.previewState || !Array.isArray(ops) || !ops.length)
            return;
        LOG_CAPTURE.undoStack.push({ ops });
        if (LOG_CAPTURE.undoStack.length > 30)
            LOG_CAPTURE.undoStack.shift();
    }
    function lcUndo() {
        const rec = LOG_CAPTURE.undoStack.pop();
        if (!rec || !LOG_CAPTURE.previewState)
            return;
        (rec.ops || []).forEach(op => {
            const msg = LOG_CAPTURE.previewState.messages?.[op.m];
            if (!msg)
                return;
            if (op.b === null || op.b === undefined)
                msg.off = !!op.off;
            else if (msg.blocks?.[op.b])
                msg.blocks[op.b].off = !!op.off;
        });
        cmuLogCaptureRefreshStage(true);
    }
    function lcRestoreAll() {
        if (!LOG_CAPTURE.previewState)
            return;
        const ops = [];
        LOG_CAPTURE.previewState.messages.forEach((msg, mi) => {
            if (msg.off) {
                ops.push({ m: mi, b: null, off: true });
                msg.off = false;
            }
            (msg.blocks || []).forEach((block, bi) => {
                if (block.off) {
                    ops.push({ m: mi, b: bi, off: true });
                    block.off = false;
                }
            });
        });
        lcPushUndoOps(ops);
        cmuLogCaptureRefreshStage(true);
    }
    function lcCountBlocksByType(type, state = LOG_CAPTURE.previewState) {
        let total = 0;
        let off = 0;
        const messages = Array.isArray(state?.messages) ? state.messages : [];
        messages.forEach(msg => {
            (msg.blocks || []).forEach(block => {
                if (block?.type !== type)
                    return;
                total += 1;
                if (block.off)
                    off += 1;
            });
        });
        return { total, off };
    }
    function lcGetBulkToggleMeta(type, state = LOG_CAPTURE.previewState) {
        const { total, off } = lcCountBlocksByType(type, state);
        const noun = type === 'code' ? '코드블록' : '이미지';
        return {
            total,
            off,
            disabled: total < 1,
            allOff: total > 0 && off >= total,
            label: total < 1
                ? `${noun} 없음`
                : (off >= total ? `${noun} 일괄 포함` : `${noun} 일괄 제외`),
        };
    }
    function cmuLogCaptureSyncBulkButtons(root = document.getElementById(ID.logCapturePreview)) {
        if (!(root instanceof HTMLElement) || LOG_CAPTURE.outputMode)
            return;
        [['code', 'toggle-code-all'], ['image', 'toggle-image-all']].forEach(([type, action]) => {
            const btn = root.querySelector(`[data-lc-ui="${action}"]`);
            if (!(btn instanceof HTMLButtonElement))
                return;
            const meta = lcGetBulkToggleMeta(type);
            btn.textContent = meta.label;
            btn.disabled = !!meta.disabled;
            btn.setAttribute('aria-disabled', meta.disabled ? 'true' : 'false');
        });
    }
    function cmuLogCaptureToggleAllBlocks(type) {
        if (!LOG_CAPTURE.previewState)
            return;
        const meta = lcGetBulkToggleMeta(type);
        if (meta.disabled)
            return;
        const nextOff = !meta.allOff;
        const ops = [];
        LOG_CAPTURE.previewState.messages.forEach((msg, mi) => {
            (msg.blocks || []).forEach((block, bi) => {
                if (block?.type === type && block.off !== nextOff) {
                    ops.push({ m: mi, b: bi, off: block.off });
                    block.off = nextOff;
                }
            });
        });
        lcPushUndoOps(ops);
        cmuLogCaptureRefreshStage(true);
    }
    function lcRenderBlock(block, msgIndex, blockIndex, editing) {
        if (!block)
            return '';
        if (block.off) {
            if (!editing)
                return '';
            const label = block.type === 'image'
                ? '제외된 이미지 · 눌러서 복원'
                : (block.type === 'code' ? '제외된 코드블록 · 눌러서 복원' : '제외된 문단 · 눌러서 복원');
            return `<button type="button" class="cmu-lc-excluded" data-lc-edit="block" data-lc-msg="${msgIndex}" data-lc-block="${blockIndex}">${label}</button>`;
        }
        const editLabel = block.type === 'image' ? '이미지 제외' : (block.type === 'code' ? '코드 제외' : '문단 제외');
        const editText = block.type === 'image' ? '이미지 제외' : (block.type === 'code' ? '코드 제외' : '−');
        const editButton = editing
            ? `<button type="button" class="cmu-lc-edit-block${block.type === 'code' ? ' is-code' : ''}" data-lc-edit="block" data-lc-msg="${msgIndex}" data-lc-block="${blockIndex}" aria-label="${editLabel}">${editText}</button>`
            : '';
        return `<div class="cmu-lc-block${block.type === 'image' ? ' is-image' : ''}" data-lc-msg="${msgIndex}" data-lc-block="${blockIndex}">${block.html}${editButton}</div>`;
    }
    function lcRenderMessageCard(msg, msgIndex, editing = false) {
        if (!msg)
            return '';
        if (msg.off) {
            if (!editing)
                return '';
            return `<article class="cmu-lc-card ${msg.role === 'user' ? 'user' : 'assistant'}" data-lc-msg="${msgIndex}"><button type="button" class="cmu-lc-excluded cmu-lc-excluded-message" data-lc-edit="message" data-lc-msg="${msgIndex}">제외된 로그 · 눌러서 복원</button></article>`;
        }
        const blocks = (msg.blocks || []).map((block, blockIndex) => lcRenderBlock(block, msgIndex, blockIndex, editing)).join('');
        if (!editing && !blocks)
            return '';
        const editButton = editing
            ? `<button type="button" class="cmu-lc-edit-message" data-lc-edit="message" data-lc-msg="${msgIndex}" aria-label="로그 전체 제외">×</button>`
            : '';
        const roleLabel = msg.role === 'user' ? 'USER' : 'AI';
        return `<article class="cmu-lc-card ${msg.role === 'user' ? 'user' : 'assistant'}" data-lc-msg="${msgIndex}"><div class="cmu-lc-rolebar"><span class="cmu-lc-role">${roleLabel}</span>${editButton}</div><div class="cmu-lc-body">${blocks}</div></article>`;
    }
    function lcBuildStageHtml(state, editing = false) {
        const messages = Array.isArray(state?.messages) ? state.messages : [];
        if (!messages.length)
            return editing ? `<div class="cmu-lc-empty">선택한 로그가 없어요.</div>` : '';
        const html = messages.map((msg, idx) => lcRenderMessageCard(msg, idx, editing)).join('');
        return html || (editing ? `<div class="cmu-lc-empty">모든 로그가 제외되었어요.</div>` : '');
    }
    function lcHeugyoMarkSvg() {
        return `<svg class="cmu-lc-heugyo-mark" viewBox="0 0 100 100" aria-hidden="true"><path d="M10 92 L90 92 C66 80 58 54 54 14 C46 56 32 80 10 92 Z" fill="var(--lc-accent)"/><path d="M40 57 C39 70 33 73 23 74 C33 75 39 78 40 91 C41 78 47 75 57 74 C47 73 41 70 40 57 Z" fill="var(--lc-bg)"/><circle cx="63" cy="80" r="6.5" fill="var(--lc-bg)"/></svg>`;
    }
    function lcThemeDecoration(theme, position) {
        if (theme === 'specsheet')
            return position === 'head'
                ? `<div class="cmu-lc-spec-mark"><span></span><span></span><span></span></div>`
                : `<div class="cmu-lc-spec-end">${'<i></i>'.repeat(13)}</div>`;
        if (theme === 'gwedo')
            return `<div class="cmu-lc-orbit-rule${position === 'foot' ? ' small' : ''}"><span>◆</span></div>`;
        if (theme === 'simya')
            return position === 'head' ? `<div class="cmu-lc-night-mark"><i></i><i></i><i></i></div>` : `<div class="cmu-lc-night-end"></div>`;
        if (theme === 'seongjwa')
            return `<div class="cmu-lc-star-mark">✦ ✧ ✦</div>`;
        if (theme === 'heugyo')
            return position === 'head' ? lcHeugyoMarkSvg() : `<div class="cmu-lc-orbit-rule small"><span>◆</span></div>`;
        return `<div class="cmu-lc-orbit-rule${position === 'foot' ? ' small' : ''}"><span>◆</span></div>`;
    }
    function lcThemeFrameHtml(theme, bodyHtml, editing = false) {
        const cleanTheme = normalizeLogCaptureTheme(theme);
        return `<div class="cmu-lc-render-stage theme-${cleanTheme}${editing ? ' is-editing' : ''}"><div class="cmu-lc-theme-head">${lcThemeDecoration(cleanTheme, 'head')}</div><div class="cmu-lc-content">${bodyHtml}</div><div class="cmu-lc-theme-foot">${lcThemeDecoration(cleanTheme, 'foot')}</div></div>`;
    }
    function ensureLogCapturePreviewRoot() {
        let root = document.getElementById(ID.logCapturePreview);
        if (root)
            return root;
        root = document.createElement('div');
        root.id = ID.logCapturePreview;
        root.addEventListener('click', (e) => {
            if (e.target === root)
                cmuLogCaptureClosePreview();
        });
        document.body.appendChild(root);
        return root;
    }
    function cmuLogCaptureClearOutput(invalidate = true) {
        if (invalidate) {
            LOG_CAPTURE.renderSeq = (LOG_CAPTURE.renderSeq || 0) + 1;
            LOG_CAPTURE.rendering = false;
            LOG_CAPTURE.renderHost?.remove?.();
            LOG_CAPTURE.renderHost = null;
        }
        const output = LOG_CAPTURE.output;
        if (output?.url) {
            try { URL.revokeObjectURL(output.url); } catch (_) { }
        }
        LOG_CAPTURE.output = null;
        LOG_CAPTURE.outputMode = false;
    }
    function cmuLogCaptureSetInlineStatus(text = '') {
        const root = document.getElementById(ID.logCapturePreview);
        const status = root?.querySelector?.('.cmu-lcp-inline-status');
        if (status)
            status.textContent = String(text || '');
    }
    function cmuLogCaptureRestoreScroll(scroll, top) {
        if (!(scroll instanceof HTMLElement))
            return;
        const target = Math.max(0, Number(top) || 0);
        scroll.scrollTop = target;
        requestAnimationFrame(() => { if (scroll.isConnected) scroll.scrollTop = target; });
    }
    function cmuLogCaptureRefreshStage(preserveScroll = true) {
        if (!LOG_CAPTURE.previewState || !LOG_CAPTURE.previewOpen)
            return;
        const root = ensureLogCapturePreviewRoot();
        if (LOG_CAPTURE.outputMode) {
            const top = Number(LOG_CAPTURE.outputReturnScroll || 0);
            renderLogCapturePreview();
            const nextScroll = root.querySelector('.cmu-lcp-scroll');
            cmuLogCaptureRestoreScroll(nextScroll, top);
            return;
        }
        const scroll = root.querySelector('.cmu-lcp-scroll');
        const oldTop = preserveScroll && scroll instanceof HTMLElement ? scroll.scrollTop : 0;
        const wrap = root.querySelector('.cmu-lcp-stage-wrap');
        if (!(wrap instanceof HTMLElement)) {
            renderLogCapturePreview();
            return;
        }
        const theme = normalizeLogCaptureTheme(settings.logCaptureTheme);
        wrap.innerHTML = lcThemeFrameHtml(theme, lcBuildStageHtml(LOG_CAPTURE.previewState, true), true);
        cmuLogCaptureClearOutput();
        cmuLogCaptureRestoreScroll(scroll, oldTop);
        cmuLogCaptureUpdateSaveButtons();
        cmuLogCaptureSyncBulkButtons(root);
    }
    function cmuLogCapturePatchEditedNode(msgIndex, blockIndex = null) {
        const root = document.getElementById(ID.logCapturePreview);
        const scroll = root?.querySelector?.('.cmu-lcp-scroll');
        const msg = LOG_CAPTURE.previewState?.messages?.[msgIndex];
        if (!root || !msg)
            return;
        let target = null;
        let nextHtml = '';
        let replacementSelector = '';
        if (blockIndex === null) {
            target = root.querySelector(`.cmu-lc-card[data-lc-msg="${msgIndex}"]`);
            nextHtml = lcRenderMessageCard(msg, msgIndex, true);
            replacementSelector = `.cmu-lc-card[data-lc-msg="${msgIndex}"]`;
        }
        else {
            const edit = root.querySelector(`[data-lc-edit="block"][data-lc-msg="${msgIndex}"][data-lc-block="${blockIndex}"]`);
            target = edit?.closest?.('.cmu-lc-block') || edit;
            nextHtml = lcRenderBlock(msg.blocks?.[blockIndex], msgIndex, blockIndex, true);
            replacementSelector = `[data-lc-edit="block"][data-lc-msg="${msgIndex}"][data-lc-block="${blockIndex}"]`;
        }
        if (!(target instanceof HTMLElement)) {
            cmuLogCaptureRefreshStage(true);
            return;
        }
        const beforeTop = target.getBoundingClientRect().top;
        target.outerHTML = nextHtml;
        const replacement = blockIndex === null
            ? root.querySelector(replacementSelector)
            : (root.querySelector(replacementSelector)?.closest?.('.cmu-lc-block') || root.querySelector(replacementSelector));
        if (scroll instanceof HTMLElement && replacement instanceof HTMLElement) {
            const delta = replacement.getBoundingClientRect().top - beforeTop;
            scroll.scrollTop += delta;
        }
        cmuLogCaptureClearOutput();
        cmuLogCaptureUpdateSaveButtons();
        cmuLogCaptureSyncBulkButtons(root);
    }
    function cmuLogCapturePreviewActionTarget(target) {
        if (!(target instanceof Element))
            return null;
        return target.closest('button[data-lc-ui], button[data-lc-edit]');
    }
    function cmuLogCaptureBindPreviewEvents(root) {
        if (!(root instanceof HTMLElement))
            return;
        root.__cmuPreviewPointer = null;
        root.__cmuPreviewHandled = { at: 0, sig: '' };
        const signature = (node) => {
            if (!(node instanceof Element))
                return '';
            return [node.dataset.lcUi || '', node.dataset.lcEdit || '', node.dataset.lcMsg || '', node.dataset.lcBlock || '', node.dataset.format || ''].join('|');
        };
        root.onpointerdown = (event) => {
            if (event.isPrimary === false || (event.button !== undefined && event.button !== 0))
                return;
            const action = cmuLogCapturePreviewActionTarget(event.target);
            if (!action)
                return;
            root.__cmuPreviewPointer = {
                id: event.pointerId,
                x: event.clientX,
                y: event.clientY,
                at: Date.now(),
                action,
                sig: signature(action),
            };
        };
        root.onpointercancel = () => { root.__cmuPreviewPointer = null; };
        root.onpointerup = (event) => {
            const press = root.__cmuPreviewPointer;
            root.__cmuPreviewPointer = null;
            if (!press || (press.id && event.pointerId && press.id !== event.pointerId))
                return;
            const action = cmuLogCapturePreviewActionTarget(event.target);
            if (!action || action !== press.action)
                return;
            if (Math.hypot(event.clientX - press.x, event.clientY - press.y) > 14)
                return;
            if (Date.now() - press.at > 700)
                return;
            const sig = signature(action);
            root.__cmuPreviewHandled = { at: Date.now(), sig };
            cmuLogCapturePreviewClickHandler(event);
        };
        root.onclick = (event) => {
            const action = cmuLogCapturePreviewActionTarget(event.target);
            const sig = signature(action);
            const last = root.__cmuPreviewHandled || { at: 0, sig: '' };
            if (action && sig === last.sig && Date.now() - Number(last.at || 0) < 700) {
                event.preventDefault();
                event.stopPropagation();
                return;
            }
            cmuLogCapturePreviewClickHandler(event);
        };
        root.onchange = cmuLogCapturePreviewChangeHandler;
    }
    function renderLogCapturePreview() {
        cmuLogCaptureResetOutput();
        const state = LOG_CAPTURE.previewState;
        const root = ensureLogCapturePreviewRoot();
        if (!state) {
            root.classList.remove('open');
            root.innerHTML = '';
            LOG_CAPTURE.previewOpen = false;
            syncLogCaptureToolbarButton();
            return;
        }
        const theme = normalizeLogCaptureTheme(settings.logCaptureTheme);
        const codeMeta = lcGetBulkToggleMeta('code', state);
        const imageMeta = lcGetBulkToggleMeta('image', state);
        root.classList.add('open');
        LOG_CAPTURE.previewOpen = true;
        LOG_CAPTURE.outputMode = false;
        root.innerHTML = `
          <div class="cmu-lcp-panel">
            <div class="cmu-lcp-head">
              <div class="cmu-lcp-title">로그 캡처 미리보기</div>
              <button type="button" class="cmu-lcp-btn" data-lc-ui="undo">실행 취소</button>
              <button type="button" class="cmu-lcp-btn" data-lc-ui="restore">전체 복원</button>
              <button type="button" class="cmu-lcp-btn" data-lc-ui="reselect">선택 수정</button>
              <button type="button" class="cmu-lcp-btn" data-lc-ui="close">닫기</button>
            </div>
            <div class="cmu-lcp-scroll">
              <div class="cmu-lcp-note">×는 로그 전체, −는 문단, ‘이미지 제외’와 ‘코드 제외’는 해당 블록만 뺍니다.</div>
              <div class="cmu-lcp-stage-wrap">
                ${lcThemeFrameHtml(theme, lcBuildStageHtml(state, true), true)}
              </div>
            </div>
            <div class="cmu-lcp-foot">
              <div class="cmu-lcp-bulk-row">
                <button type="button" class="cmu-lcp-btn" data-lc-ui="toggle-code-all"${codeMeta.disabled ? ' disabled aria-disabled="true"' : ''}>${codeMeta.label}</button>
                <button type="button" class="cmu-lcp-btn" data-lc-ui="toggle-image-all"${imageMeta.disabled ? ' disabled aria-disabled="true"' : ''}>${imageMeta.label}</button>
              </div>
              <label class="cmu-lcp-theme-row"><span>테마</span><select class="cmu-lcp-select" data-lc-ui="theme-select">${getLogCaptureThemeOptionsHtml(theme)}</select></label>
              <div class="cmu-lcp-inline-status"></div>
              <button type="button" class="cmu-lcp-btn" data-lc-ui="save" data-format="png">PNG 이미지 만들기</button>
              <button type="button" class="cmu-lcp-btn" data-lc-ui="save" data-format="webp">WebP 이미지 만들기</button>
            </div>
          </div>`;
        cmuLogCaptureBindPreviewEvents(root);
        syncLogCaptureToolbarButton();
        cmuLogCaptureUpdateSaveButtons();
        cmuLogCaptureSyncBulkButtons(root);
    }
    function cmuLogCapturePreviewChangeHandler(e) {
        const select = e.target?.closest?.('[data-lc-ui="theme-select"]');
        if (!(select instanceof HTMLSelectElement))
            return;
        e.preventDefault();
        settings.logCaptureTheme = normalizeLogCaptureTheme(select.value);
        saveSettings();
        cmuLogCaptureRefreshStage(true);
    }
    function cmuLogCapturePreviewClickHandler(e) {
        const ui = e.target?.closest?.('[data-lc-ui]');
        if (ui) {
            const type = ui.dataset.lcUi || '';
            if (type === 'theme-select')
                return;
            e.preventDefault();
            e.stopPropagation();
            if (type === 'close') {
                cmuLogCaptureClosePreview();
                return;
            }
            if (type === 'undo') {
                lcUndo();
                return;
            }
            if (type === 'restore') {
                lcRestoreAll();
                return;
            }
            if (type === 'reselect') {
                cmuLogCaptureClosePreview(false);
                cmuLogCaptureStartSelection({ preserve: true });
                return;
            }
            if (type === 'back-output') {
                const top = Number(LOG_CAPTURE.outputReturnScroll || 0);
                renderLogCapturePreview();
                cmuLogCaptureRestoreScroll(document.querySelector(`#${ID.logCapturePreview} .cmu-lcp-scroll`), top);
                return;
            }
            if (type === 'toggle-code-all') {
                cmuLogCaptureToggleAllBlocks('code');
                return;
            }
            if (type === 'toggle-image-all') {
                cmuLogCaptureToggleAllBlocks('image');
                return;
            }
            if (type === 'save') {
                void cmuLogCaptureRenderLongImage(String(ui.dataset.format || 'png').toLowerCase());
                return;
            }
        }
        const edit = e.target?.closest?.('[data-lc-edit]');
        if (!edit || !LOG_CAPTURE.previewState || LOG_CAPTURE.outputMode)
            return;
        e.preventDefault();
        e.stopPropagation();
        const msgIndex = Number(edit.dataset.lcMsg || -1);
        const msg = LOG_CAPTURE.previewState.messages?.[msgIndex];
        if (!msg)
            return;
        if (edit.dataset.lcEdit === 'message') {
            lcPushUndoOps([{ m: msgIndex, b: null, off: msg.off }]);
            msg.off = !msg.off;
            cmuLogCapturePatchEditedNode(msgIndex, null);
        }
        else if (edit.dataset.lcEdit === 'block') {
            const blockIndex = Number(edit.dataset.lcBlock || -1);
            const block = msg.blocks?.[blockIndex];
            if (!block)
                return;
            lcPushUndoOps([{ m: msgIndex, b: blockIndex, off: block.off }]);
            block.off = !block.off;
            cmuLogCapturePatchEditedNode(msgIndex, blockIndex);
        }
    }
    function cmuLogCaptureClosePreview(clear = false) {
        cmuLogCaptureResetOutput();
        LOG_CAPTURE.previewOpen = false;
        LOG_CAPTURE.rendering = false;
        const root = document.getElementById(ID.logCapturePreview);
        if (root) {
            root.classList.remove('open');
            if (clear)
                root.innerHTML = '';
        }
        if (clear) {
            LOG_CAPTURE.previewState = null;
            LOG_CAPTURE.undoStack = [];
            LOG_CAPTURE.selectedModels.clear();
            LOG_CAPTURE.selectedIds = [];
            LOG_CAPTURE.selectionSeq = 0;
        }
        syncLogCaptureToolbarButton();
    }
    function cmuLogCaptureOpenPreview() {
        if (!LOG_CAPTURE.selectedIds.length) {
            showToast('캡처할 로그를 먼저 선택해 주세요');
            return;
        }
        const messages = LOG_CAPTURE.selectedIds.map(id => LOG_CAPTURE.selectedModels.get(id)?.model).filter(Boolean).map(model => lcCloneState(model));
        if (!messages.length) {
            showToast('캡처할 로그가 없어요');
            return;
        }
        LOG_CAPTURE.previewState = { messages };
        LOG_CAPTURE.undoStack = [];
        cmuLogCaptureExitMode(false);
        renderLogCapturePreview();
    }
    function cmuLogCaptureHandleGroupPick(group) {
        const id = groupMessageId(group);
        if (!id)
            return;
        if (LOG_CAPTURE.selectedModels.has(id)) {
            LOG_CAPTURE.selectedModels.delete(id);
        }
        else {
            const model = lcBuildMessageModel(group);
            if (!model) {
                showToast('이 로그의 본문을 찾지 못했어요');
                return;
            }
            const seq = ++LOG_CAPTURE.selectionSeq;
            LOG_CAPTURE.selectedModels.set(id, {
                model,
                orderKey: lcMessageOrderKey(id, seq),
            });
        }
        cmuLogCaptureSyncSelectedIds();
        cmuLogCaptureMarkSelection();
        cmuLogCaptureRefreshBar();
    }
    function cmuLogCaptureGetLoadedImageLib() {
        // 다른 스크립트가 이미 불러온 전역이 있으면 재사용하고, 없으면 캡처 시점에만 지연 로딩한다.
        try {
            if (typeof htmlToImage !== 'undefined' && htmlToImage?.toCanvas)
                return htmlToImage;
        }
        catch (_) { }
        try {
            if (globalThis?.htmlToImage?.toCanvas)
                return globalThis.htmlToImage;
        }
        catch (_) { }
        try {
            const page = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
            return window.htmlToImage || page?.htmlToImage || null;
        }
        catch (_) {
            return window.htmlToImage || null;
        }
    }
    function loadHtmlToImageLib() {
        const loaded = cmuLogCaptureGetLoadedImageLib();
        if (loaded?.toCanvas)
            return Promise.resolve(loaded);
        if (cmuLogCaptureLibPromise)
            return cmuLogCaptureLibPromise;
        const libraryUrl = 'https://cdn.jsdelivr.net/npm/html-to-image@1.11.13/dist/html-to-image.js';
        cmuLogCaptureLibPromise = new Promise((resolve, reject) => {
            const finish = (lib) => {
                if (!lib?.toCanvas)
                    throw new Error('html-to-image unavailable');
                try { window.htmlToImage = lib; } catch (_) { }
                resolve(lib);
            };
            if (typeof GM_xmlhttpRequest === 'function') {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: libraryUrl,
                    timeout: 18000,
                    onload: (response) => {
                        try {
                            if (Number(response.status) < 200 || Number(response.status) >= 300)
                                throw new Error(`library HTTP ${response.status}`);
                            const source = String(response.responseText || '');
                            const runner = new Function(`${source}\n;return (typeof htmlToImage !== 'undefined' && htmlToImage) || (typeof module !== 'undefined' && module.exports) || null;`);
                            finish(runner());
                        }
                        catch (error) {
                            reject(error);
                        }
                    },
                    ontimeout: () => reject(new Error('html-to-image load timeout')),
                    onerror: () => reject(new Error('html-to-image load failed')),
                });
                return;
            }
            const existing = document.querySelector('script[data-cmu-html-to-image="1"]');
            if (existing) {
                existing.addEventListener('load', () => {
                    try { finish(cmuLogCaptureGetLoadedImageLib()); } catch (error) { reject(error); }
                }, { once: true });
                existing.addEventListener('error', () => reject(new Error('html-to-image load failed')), { once: true });
                return;
            }
            const script = document.createElement('script');
            script.src = libraryUrl;
            script.async = true;
            script.dataset.cmuHtmlToImage = '1';
            script.onload = () => {
                try { finish(cmuLogCaptureGetLoadedImageLib()); } catch (error) { reject(error); }
            };
            script.onerror = () => reject(new Error('html-to-image load failed'));
            document.head.appendChild(script);
        }).finally(() => {
            if (!cmuLogCaptureGetLoadedImageLib()?.toCanvas)
                cmuLogCaptureLibPromise = null;
        });
        return cmuLogCaptureLibPromise;
    }
    function lcGetExportBackground(theme) {
        return LOG_CAPTURE_THEME_META[normalizeLogCaptureTheme(theme)]?.bg || '#FAFAF8';
    }
    function lcCreateExportShell(theme) {
        const cleanTheme = normalizeLogCaptureTheme(theme);
        const template = document.createElement('template');
        template.innerHTML = lcThemeFrameHtml(cleanTheme, '', false).trim();
        const root = template.content.firstElementChild;
        return {
            root,
            content: root?.querySelector('.cmu-lc-content') || null,
        };
    }
    function lcBuildExportMessageElements(state) {
        const tmp = document.createElement('div');
        tmp.innerHTML = lcBuildStageHtml(state, false);
        return Array.from(tmp.children || []);
    }
    function lcIsIOSDevice() {
        const ua = String(navigator.userAgent || '');
        return /iPad|iPhone|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && Number(navigator.maxTouchPoints) > 1);
    }
    function lcGetExportConfig() {
        const coarse = window.matchMedia?.('(pointer: coarse)')?.matches || window.innerWidth < 800;
        if (lcIsIOSDevice())
            return { width: 680, pixelRatio: 1.2, maxPixels: 14000000, maxDimension: 16000 };
        if (coarse)
            return { width: 720, pixelRatio: 1.35, maxPixels: 14000000, maxDimension: 20000 };
        return { width: 840, pixelRatio: 1.8, maxPixels: 60000000, maxDimension: 32000 };
    }
    function lcFitSingleImageConfig(base, node) {
        const width = Math.max(1, Number(base.width) || 700);
        const height = Math.max(1, Number(node?.scrollHeight || node?.offsetHeight || 1));
        const maxPixels = Math.max(1, Number(base.maxPixels) || 14000000);
        const maxDimension = Math.max(1, Number(base.maxDimension) || 16000);
        const pixelRatio = Math.min(Math.max(.5, Number(base.pixelRatio) || 1),
            Math.sqrt(maxPixels / (width * height)), maxDimension / width, maxDimension / height);
        // Keep readable output; reject oversized selections instead of violating the memory limit.
        if (!Number.isFinite(pixelRatio) || pixelRatio < .5)
            throw new Error('canvas size exceeds limit');
        return { ...base, pixelRatio: Math.floor(pixelRatio * 100) / 100 };
    }
    function lcCanvasToBlob(canvas, mime, quality) {
        return new Promise((resolve, reject) => {
            try {
                if (typeof canvas.toBlob === 'function') {
                    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('이미지 변환 실패')), mime, quality);
                    return;
                }
                const dataUrl = canvas.toDataURL(mime, quality);
                const parts = dataUrl.split(',');
                const binary = atob(parts[1] || '');
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i += 1)
                    bytes[i] = binary.charCodeAt(i);
                resolve(new Blob([bytes], { type: mime }));
            }
            catch (error) {
                reject(error);
            }
        });
    }
    function lcBlobAsDataUrl(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ''));
            reader.onerror = () => reject(new Error('이미지 data URL 변환 실패'));
            reader.readAsDataURL(blob);
        });
    }
    async function lcRequestImageBlob(url) {
        const source = String(url || '').trim();
        if (!source || /^data:/i.test(source))
            return null;

        // blob: URL도 캡처 직전에 data URL로 고정해 Safari/Firefox의 clone 시점 만료를 피한다.
        if (/^blob:/i.test(source)) {
            const response = await fetch(source);
            if (!response.ok)
                throw new Error(`이미지 요청 실패 ${response.status}`);
            return response.blob();
        }

        let gmError = null;
        if (typeof GM_xmlhttpRequest === 'function') {
            try {
                return await new Promise((resolve, reject) => {
                    GM_xmlhttpRequest({
                        method: 'GET',
                        url: source,
                        responseType: 'blob',
                        timeout: 15000,
                        onload: response => {
                            const blob = response?.response;
                            if (response.status >= 200 && response.status < 300 && blob instanceof Blob)
                                resolve(blob);
                            else
                                reject(new Error(`이미지 요청 실패 ${response.status || 0}`));
                        },
                        onerror: () => reject(new Error('이미지 요청 실패')),
                        ontimeout: () => reject(new Error('이미지 요청 시간 초과')),
                    });
                });
            }
            catch (error) {
                gmError = error;
            }
        }

        // 일부 모바일 userscript 엔진에서 GM 응답이 막힐 때 사이트 자체 CORS 허용 경로도 한 번 시도한다.
        for (const credentials of ['include', 'omit']) {
            try {
                const response = await fetch(source, { credentials, cache: 'force-cache' });
                if (!response.ok)
                    throw new Error(`이미지 요청 실패 ${response.status}`);
                return await response.blob();
            }
            catch (_) { }
        }
        throw gmError || new Error('이미지 요청 실패');
    }
    async function lcPrepareCaptureImages(root, isCurrent = () => true) {
        if (!(root instanceof HTMLElement))
            return;
        const images = Array.from(root.querySelectorAll('img'));
        const prepare = async img => {
            if (!isCurrent())
                return;
            const source = lcCaptureImageSource(img);
            if (!source)
                return;
            img.removeAttribute('srcset');
            img.removeAttribute('sizes');
            img.removeAttribute('loading');
            img.removeAttribute('crossorigin');
            delete img.dataset.cmuCaptureImageReady;
            delete img.dataset.cmuCaptureImageFailed;
            try {
                if (!/^data:/i.test(source)) {
                    const blob = await lcRequestImageBlob(source);
                    if (blob instanceof Blob && /^image\//i.test(blob.type || ''))
                        img.src = await lcBlobAsDataUrl(blob);
                }
                if (typeof img.decode === 'function')
                    await Promise.race([img.decode().catch(() => {}), new Promise(resolve => setTimeout(resolve, 3000))]);
                else if (!img.complete)
                    await Promise.race([new Promise(resolve => { img.onload = img.onerror = resolve; }), new Promise(resolve => setTimeout(resolve, 3000))]);
                img.dataset.cmuCaptureImageReady = '1';
            }
            catch (_) {
                // 원본 URL은 첫 렌더에서 한 번 더 시도하되, 실패 이미지만 식별해 전체 이미지가 빠지는 것을 막는다.
                img.src = source;
                img.dataset.cmuCaptureImageFailed = '1';
            }
        };
        let next = 0;
        await Promise.all(Array.from({ length: Math.min(4, images.length) }, async () => {
            while (isCurrent() && next < images.length)
                await prepare(images[next++]);
        }));
    }
    async function lcRenderCaptureCanvas(lib, page, config, theme) {
        const options = {
            pixelRatio: config.pixelRatio,
            backgroundColor: lcGetExportBackground(theme),
            cacheBust: false,
            includeQueryParams: false,
            skipAutoScale: false,
        };
        // Safari에서는 외부 웹폰트 인라인 과정이 실패 원인이 되기 쉬워 시스템 폰트 폴백을 사용한다.
        if (lcIsIOSDevice())
            options.fontEmbedCSS = '';
        try {
            return await lib.toCanvas(page, options);
        }
        catch (firstError) {
            const hasMedia = !!page.querySelector?.('img,video,canvas,svg image');
            if (!hasMedia)
                throw firstError;

            // 한 이미지가 실패해도 성공적으로 data URL화된 나머지 이미지까지 전부 버리지 않는다.
            const partialFallback = page.cloneNode(true);
            partialFallback.querySelectorAll?.('img[data-cmu-capture-image-failed="1"],video,canvas,svg image').forEach(el => el.remove());
            page.parentElement?.appendChild(partialFallback);
            try {
                const canvas = await lib.toCanvas(partialFallback, { ...options, fontEmbedCSS: '' });
                if (partialFallback.querySelector?.('[data-cmu-capture-image-failed="1"]') || page.querySelector?.('[data-cmu-capture-image-failed="1"]'))
                    canvas.cmuMediaOmitted = true;
                return canvas;
            }
            catch (_) {
                // 마지막 안전장치: 기존 동작처럼 미디어 전체를 제외하되, 이 단계까지 온 경우에만 사용한다.
                const fallback = page.cloneNode(true);
                fallback.querySelectorAll?.('img,video,canvas,svg image').forEach(el => el.remove());
                page.parentElement?.appendChild(fallback);
                try {
                    const canvas = await lib.toCanvas(fallback, { ...options, fontEmbedCSS: '' });
                    canvas.cmuMediaOmitted = true;
                    return canvas;
                }
                catch (_) {
                    throw firstError;
                }
                finally {
                    fallback.remove?.();
                }
            }
            finally {
                partialFallback.remove?.();
            }
        }
    }
    function cmuLogCaptureUpdateSaveButtons() {
        const root = document.getElementById(ID.logCapturePreview);
        if (!root)
            return;
        ['png', 'webp'].forEach(format => {
            const button = root.querySelector(`[data-lc-ui="save"][data-format="${format}"]`);
            if (!(button instanceof HTMLButtonElement))
                return;
            button.disabled = !!LOG_CAPTURE.rendering;
            button.textContent = LOG_CAPTURE.rendering ? '이미지 만드는 중…' : `${format.toUpperCase()} 이미지 만들기`;
        });
    }
    function cmuLogCaptureResetOutput() {
        cmuLogCaptureClearOutput();
        cmuLogCaptureUpdateSaveButtons();
    }
    function cmuLogCaptureMountOutputFrame(panel, output) {
        const wrap = panel?.querySelector?.('.cmu-lcp-output-wrap');
        if (!(wrap instanceof HTMLElement) || !output?.url)
            return;
        const img = document.createElement('img');
        img.className = 'cmu-lcp-output-img';
        img.alt = '완성된 로그 캡처 이미지';
        img.decoding = 'async';
        img.src = output.url;
        wrap.replaceChildren(img);
    }
    function cmuLogCaptureShowOutput() {
        const root = document.getElementById(ID.logCapturePreview);
        const output = LOG_CAPTURE.output;
        if (!root || !output?.url)
            return;
        const scroll = root.querySelector('.cmu-lcp-scroll');
        LOG_CAPTURE.outputReturnScroll = scroll instanceof HTMLElement ? scroll.scrollTop : 0;
        LOG_CAPTURE.outputMode = true;
        const panel = root.querySelector('.cmu-lcp-panel');
        if (!(panel instanceof HTMLElement))
            return;
        panel.innerHTML = `
          <div class="cmu-lcp-head">
            <div class="cmu-lcp-title">완성 이미지</div>
            <button type="button" class="cmu-lcp-btn" data-lc-ui="back-output">편집으로</button>
            <button type="button" class="cmu-lcp-btn" data-lc-ui="close">닫기</button>
          </div>
          <div class="cmu-lcp-scroll">
            <div class="cmu-lcp-output-wrap"></div>
            <div class="cmu-lcp-output-help">이미지를 길게 눌러 저장하세요.</div>
          </div>
          <div class="cmu-lcp-foot">
            <div class="cmu-lcp-inline-status">${output.width} × ${output.height}px${output.mediaOmitted ? ' · 일부 이미지 제외됨' : ''}</div>
          </div>`;
        cmuLogCaptureBindPreviewEvents(root);
        cmuLogCaptureMountOutputFrame(panel, output);
    }
    async function cmuLogCaptureRenderLongImage(format = 'png') {
        if (!LOG_CAPTURE.previewState || !LOG_CAPTURE.previewOpen || LOG_CAPTURE.rendering)
            return;
        const renderSeq = LOG_CAPTURE.renderSeq = (LOG_CAPTURE.renderSeq || 0) + 1;
        const isCurrent = () => shouldRun() && LOG_CAPTURE.previewOpen && LOG_CAPTURE.renderSeq === renderSeq;
        const cleanFormat = format === 'webp' ? 'webp' : 'png';
        const stateSnapshot = lcCloneState(LOG_CAPTURE.previewState);
        const theme = normalizeLogCaptureTheme(settings.logCaptureTheme);
        const baseConfig = lcGetExportConfig();
        LOG_CAPTURE.rendering = true;
        cmuLogCaptureSetInlineStatus('긴 이미지 만드는 중…');
        cmuLogCaptureUpdateSaveButtons();
        let host = null;
        let canvas = null;
        try {
            const lib = await loadHtmlToImageLib();
            if (!isCurrent())
                return;
            host = document.createElement('div');
            LOG_CAPTURE.renderHost = host;
            host.style.position = 'fixed';
            host.style.left = '0';
            host.style.top = '0';
            host.style.transform = 'translateX(-220vw)';
            host.style.pointerEvents = 'none';
            host.style.width = `${baseConfig.width}px`;
            host.style.zIndex = '-1';
            document.body.appendChild(host);
            const elements = lcBuildExportMessageElements(stateSnapshot);
            if (!elements.length)
                throw new Error('내보낼 로그가 없음');
            const shell = lcCreateExportShell(theme);
            if (!(shell.root instanceof HTMLElement) || !(shell.content instanceof HTMLElement))
                throw new Error('캡처 테마 생성 실패');
            shell.root.style.width = `${baseConfig.width}px`;
            elements.forEach(el => shell.content.appendChild(el));
            host.appendChild(shell.root);
            try {
                await Promise.race([
                    document.fonts?.ready || Promise.resolve(),
                    new Promise(resolve => setTimeout(resolve, 1200)),
                ]);
            }
            catch (_) { }
            if (!isCurrent())
                return;
            await lcPrepareCaptureImages(shell.root, isCurrent);
            if (!isCurrent())
                return;
            const config = lcFitSingleImageConfig(baseConfig, shell.root);
            canvas = await lcRenderCaptureCanvas(lib, shell.root, config, theme);
            if (!isCurrent())
                return;
            if (canvas.width > baseConfig.maxDimension || canvas.height > baseConfig.maxDimension || canvas.width * canvas.height > baseConfig.maxPixels)
                throw new Error('canvas size exceeds limit');
            const quality = clamp(Number(settings.logCaptureWebpQuality || 90) / 100, 0.1, 1);
            let mime = cleanFormat === 'webp' ? 'image/webp' : 'image/png';
            let blob = await lcCanvasToBlob(canvas, mime, cleanFormat === 'webp' ? quality : 1);
            if (cleanFormat === 'webp' && blob.type !== 'image/webp') {
                mime = 'image/png';
                blob = await lcCanvasToBlob(canvas, mime, 1);
            }
            if (!isCurrent())
                return;
            cmuLogCaptureClearOutput(false);
            const ext = mime === 'image/webp' ? 'webp' : 'png';
            const name = `crack_log_capture_${new Date().toISOString().slice(0,19).replace(/[-:T]/g, '')}.${ext}`;
            const url = URL.createObjectURL(blob);
            if (!isCurrent()) {
                try { URL.revokeObjectURL(url); } catch (_) { }
                canvas.width = 1;
                canvas.height = 1;
                return;
            }
            if (lcIsIOSDevice()) {
                const a = document.createElement('a');
                a.href = url;
                a.download = name;
                document.body.appendChild(a);
                a.click();
                cmuLogCaptureSetInlineStatus(canvas.cmuMediaOmitted ? '일부 이미지를 제외한 캡처를 저장했어요. 원본 이미지가 필요하면 선택을 줄여 다시 만들어 주세요.' : '이미지 저장을 시작했어요.');
                const releaseDownload = () => {
                    try { URL.revokeObjectURL(url); } catch (_) { }
                    a.remove();
                    const index = CMU_RESOURCES.cleanups.indexOf(releaseDownload);
                    if (index >= 0)
                        CMU_RESOURCES.cleanups.splice(index, 1);
                };
                CMU_RESOURCES.cleanups.push(releaseDownload);
                setTimeout(releaseDownload, 900);
                canvas.width = 1;
                canvas.height = 1;
                return;
            }
            LOG_CAPTURE.output = { url, width: canvas.width, height: canvas.height, mediaOmitted: !!canvas.cmuMediaOmitted };
            canvas.width = 1;
            canvas.height = 1;
            cmuLogCaptureShowOutput();
        }
        catch (err) {
            if (!isCurrent())
                return;
            try { console.warn(`${LOG} log capture render failed`, err); } catch (_) { }
            const message = String(err?.message || '');
            if (/load|library|html-to-image|unavailable/i.test(message))
                cmuLogCaptureSetInlineStatus('캡처 도구를 불러오지 못했어요.');
            else if (/fetch|cors|network|security/i.test(message))
                cmuLogCaptureSetInlineStatus('외부 이미지를 불러오지 못했어요. 이미지 포함을 꺼 보세요.');
            else if (/image|canvas|convert|변환|dataurl|size|memory/i.test(message))
                cmuLogCaptureSetInlineStatus('이미지가 너무 길거나 기기 메모리가 부족해요.');
            else
                cmuLogCaptureSetInlineStatus('이미지 생성에 실패했어요. 다시 눌러 주세요.');
        }
        finally {
            host?.remove?.();
            if (canvas) {
                canvas.width = 1;
                canvas.height = 1;
            }
            if (LOG_CAPTURE.renderHost === host)
                LOG_CAPTURE.renderHost = null;
            if (LOG_CAPTURE.renderSeq === renderSeq) {
                LOG_CAPTURE.rendering = false;
                cmuLogCaptureUpdateSaveButtons();
            }
        }
    }
    function installLogCaptureHandlers() {
        if (!settings.logCapture || LOG_CAPTURE.clickHandler)
            return;
        LOG_CAPTURE.clickHandler = (e) => {
            if (!LOG_CAPTURE.active)
                return;
            if (e.target?.closest?.(`#${ID.logCaptureBar}`))
                return;
            if (e.target?.closest?.(`#${ID.panel}, #${ID.logCapturePreview}, #${ID.toolbarWrapper}`))
                return;
            const group = e.target?.closest?.('[data-message-group-id]');
            if (!(group instanceof HTMLElement))
                return;
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation?.();
            cmuLogCaptureHandleGroupPick(group);
        };
        cmuListen(document, 'click', LOG_CAPTURE.clickHandler, true);
    }
    function uninstallLogCaptureHandlers() {
        if (LOG_CAPTURE.clickHandler)
            cmuUnlisten(document, 'click', LOG_CAPTURE.clickHandler, true);
        LOG_CAPTURE.clickHandler = null;
    }

    function ensureSettingsPanel() {
        let panel = document.getElementById(ID.panel);
        if (panel)
            return panel;
        panel = document.createElement('div');
        panel.id = ID.panel;
        document.body.appendChild(panel);
        renderSettingsPanel();
        return panel;
    }
    function toggleSettingsPanel(force) {
        const panel = ensureSettingsPanel();
        const wasOpen = panel.classList.contains('open');
        const open = typeof force === 'boolean' ? force : !wasOpen;
        if (open) {
            clearTimeout(CMU_PANEL_ANIM.closeTimer);
            CMU_PANEL_ANIM.closeTimer = 0;
            if (CMU_PANEL_ANIM.onCloseEnd) {
                panel.removeEventListener('animationend', CMU_PANEL_ANIM.onCloseEnd);
                CMU_PANEL_ANIM.onCloseEnd = null;
            }
            panel.classList.remove('cmu-closing', 'cmu-dragging', 'cmu-snap');
            panel.style.transform = '';
            panel.classList.add('open');
            document.documentElement.classList.add('cmu-panel-open');
            renderSettingsPanel();
            if (!wasOpen) {
                cmuSettingsScrim(true);
                cmuPanelBindOpenListeners(true);
            }
            return;
        }
        if (!wasOpen)
            return;
        panel.classList.remove('open', 'cmu-dragging', 'cmu-snap');
        document.documentElement.classList.remove('cmu-panel-open');
        cmuPanelBindOpenListeners(false);
        cmuSettingsScrim(false);
        panel.classList.add('cmu-closing');
        const finish = () => {
            clearTimeout(CMU_PANEL_ANIM.closeTimer);
            CMU_PANEL_ANIM.closeTimer = 0;
            if (CMU_PANEL_ANIM.onCloseEnd) {
                panel.removeEventListener('animationend', CMU_PANEL_ANIM.onCloseEnd);
                CMU_PANEL_ANIM.onCloseEnd = null;
            }
            if (panel.classList.contains('open'))
                return;
            panel.classList.remove('cmu-closing');
            panel.style.transform = '';
            clearTimeout(CMU_PANEL_ANIM.pageTimer);
            clearTimeout(CMU_PANEL_ANIM.indTimer);
            clearTimeout(CMU_PANEL_ANIM.snapTimer);
            CMU_PANEL_ANIM.pageTimer = CMU_PANEL_ANIM.indTimer = CMU_PANEL_ANIM.snapTimer = 0;
            panel.innerHTML = '';
        };
        CMU_PANEL_ANIM.onCloseEnd = (e) => {
            if (e.target === panel)
                finish();
        };
        panel.addEventListener('animationend', CMU_PANEL_ANIM.onCloseEnd);
        CMU_PANEL_ANIM.closeTimer = setTimeout(finish, 340);
    }
    function cmuSettingsScrim(show) {
        let scrim = document.getElementById(ID.settingsScrim);
        clearTimeout(CMU_PANEL_ANIM.scrimTimer);
        CMU_PANEL_ANIM.scrimTimer = 0;
        if (show) {
            if (!scrim && document.body) {
                scrim = document.createElement('div');
                scrim.id = ID.settingsScrim;
                scrim.setAttribute('aria-hidden', 'true');
                document.body.appendChild(scrim);
            }
            scrim?.classList.remove('cmu-out');
            return;
        }
        if (!scrim)
            return;
        scrim.classList.add('cmu-out');
        CMU_PANEL_ANIM.scrimTimer = setTimeout(() => {
            CMU_PANEL_ANIM.scrimTimer = 0;
            if (scrim.classList.contains('cmu-out'))
                scrim.remove();
        }, 260);
    }
    function cmuPanelOnResize() {
        const panel = document.getElementById(ID.panel);
        if (panel?.classList.contains('open'))
            cmuPanelPlaceTabIndicator(panel, true);
    }
    function cmuPanelOnKeydown(e) {
        if (e.key !== 'Escape')
            return;
        const panel = document.getElementById(ID.panel);
        if (!panel?.classList.contains('open'))
            return;
        if (cmuSettingsSearchOpen) {
            cmuSetSettingsSearchOpen(panel, false);
            return;
        }
        toggleSettingsPanel(false);
    }
    function cmuPanelBindOpenListeners(on) {
        if (on === CMU_PANEL_ANIM.openBound)
            return;
        CMU_PANEL_ANIM.openBound = on;
        if (on) {
            cmuListen(window, 'resize', cmuPanelOnResize, false);
            cmuListen(document, 'keydown', cmuPanelOnKeydown, false);
        }
        else {
            cmuUnlisten(window, 'resize', cmuPanelOnResize, false);
            cmuUnlisten(document, 'keydown', cmuPanelOnKeydown, false);
        }
    }
    function cmuPanelPlaceTabIndicator(panel, instant) {
        const tabs = panel?.querySelector?.('.cmu-tabs');
        const ind = tabs?.querySelector?.('.cmu-tab-ind');
        const on = tabs?.querySelector?.('.cmu-tab.on');
        if (!tabs || !ind || !on || !on.offsetWidth)
            return;
        if (instant)
            ind.classList.add('cmu-snap');
        ind.style.width = `${on.offsetWidth}px`;
        ind.style.transform = `translateX(${on.offsetLeft}px)`;
        if (instant) {
            void ind.offsetWidth;
            ind.classList.remove('cmu-snap');
        }
        const left = Math.max(0, on.offsetLeft - (tabs.clientWidth - on.offsetWidth) / 2);
        try {
            tabs.scrollTo({ left, behavior: instant ? 'auto' : 'smooth' });
        }
        catch (_) {
            tabs.scrollLeft = left;
        }
    }
    function cmuPanelShowPage(panel, id, dir) {
        clearTimeout(CMU_PANEL_ANIM.pageTimer);
        CMU_PANEL_ANIM.pageTimer = 0;
        panel.querySelectorAll('.cmu-page').forEach(p => {
            p.classList.toggle('on', p.dataset.page === id);
            p.classList.remove('cmu-in-r', 'cmu-in-l');
        });
        const page = panel.querySelector(`.cmu-page[data-page="${CSS.escape(id)}"]`);
        if (!page || !dir)
            return;
        void page.offsetWidth;
        page.classList.add(dir > 0 ? 'cmu-in-r' : 'cmu-in-l');
        CMU_PANEL_ANIM.pageTimer = setTimeout(() => {
            CMU_PANEL_ANIM.pageTimer = 0;
            page.classList.remove('cmu-in-r', 'cmu-in-l');
        }, 460);
    }
    function cmuSetSettingsSearchOpen(panel, open, focus = false) {
        cmuSettingsSearchOpen = !!open;
        const head = panel?.querySelector?.('.cmu-panel-head');
        head?.classList.toggle('cmu-s-open', cmuSettingsSearchOpen);
        const btn = panel?.querySelector?.('[data-action="search-toggle"]');
        if (btn) {
            btn.classList.toggle('on', cmuSettingsSearchOpen);
            btn.setAttribute('aria-expanded', cmuSettingsSearchOpen ? 'true' : 'false');
        }
        const input = panel?.querySelector?.('#cmu-settings-search');
        if (!cmuSettingsSearchOpen) {
            cmuSettingsQuery = '';
            if (input) {
                input.value = '';
                input.blur();
            }
            panel?.querySelector?.('.cmu-search')?.classList.remove('has');
            if (panel)
                cmuApplySettingsSearch(panel);
            return;
        }
        if (focus && input) {
            try {
                input.focus({ preventScroll: true });
            }
            catch (_) {
                input.focus();
            }
        }
    }
    function cmuDepOn(dep) {
        if (dep === 'themeSkin')
            return !!settings.themeSkin && !isCmuExternalThemeActive();
        return !!settings[dep];
    }
    function cmuSyncPanelDeps(panel) {
        if (!panel)
            return;
        panel.querySelectorAll('.sw[data-cmu-dep]').forEach(sw => {
            const depOn = cmuDepOn(sw.dataset.cmuDep);
            const key = sw.dataset.key || '';
            const locked = isCmuThemeSettingKey(key) && isCmuExternalThemeActive();
            const off = !depOn || locked;
            sw.disabled = off;
            sw.classList.toggle('disabled', off);
            sw.setAttribute('aria-disabled', off ? 'true' : 'false');
            sw.closest('.subrow')?.classList.toggle('cmu-dep-off', !depOn);
        });
        panel.querySelectorAll('[data-cmu-dep-box]').forEach(box => {
            const off = !cmuDepOn(box.dataset.cmuDepBox);
            box.querySelectorAll('.chip').forEach(chip => {
                chip.disabled = off;
                chip.setAttribute('aria-disabled', off ? 'true' : 'false');
            });
        });
    }
    function cmuTabKeyOn(key) {
        if (isCmuThemeSettingKey(key) && isCmuExternalThemeActive())
            return false;
        if (key === 'modelIcon' && cmuThemeUiModeForSettings() !== 'novel')
            return false;
        if (key === 'fullscreenButton' && !isCmuFullscreenSupported())
            return false;
        return !!settings[key];
    }
    function cmuTabActive(tab) {
        return !!tab?.keys?.some(cmuTabKeyOn);
    }
    function cmuSyncTabDots(panel) {
        if (!panel)
            return;
        CMU_TABS.forEach(t => {
            panel.querySelector(`.cmu-tab[data-tab="${t.id}"]`)?.classList.toggle('act', cmuTabActive(t));
        });
    }
    function cmuThemeBannerText() {
        const externalProvider = detectCmuExternalThemeProvider();
        return {
            title: externalProvider
                ? `${getCmuExternalThemeLabel(externalProvider)} 사용 중`
                : (settings.themeSkin ? '테마 켜짐 · 기본' : '순정 상태'),
            desc: externalProvider
                ? '합본 테마 자동 대기 · 저장된 설정은 그대로 유지'
                : (settings.themeSkin ? '기본 테마 사용 · 라이트/다크 자동 대응' : '끄면 크랙 순정 말풍선으로 표시'),
        };
    }
    function cmuSyncThemeBanner(panel) {
        const box = panel?.querySelector?.('[data-cmu-theme-banner]');
        if (!box)
            return;
        const text = cmuThemeBannerText();
        const title = box.querySelector('[data-cmu-theme-title]');
        const desc = box.querySelector('[data-cmu-theme-desc]');
        if (title)
            title.textContent = text.title;
        if (desc)
            desc.textContent = text.desc;
    }
    function cmuPanelDragStart(e, panel) {
        if (!panel?.classList.contains('open') || panel.classList.contains('cmu-closing'))
            return;
        if (e.isPrimary === false || (e.button !== undefined && e.button !== 0))
            return;
        const zone = e.target?.closest?.('.cmu-panel-grab, .cmu-panel-head');
        if (!zone || !panel.contains(zone) || e.target.closest('button, input, textarea, .cmu-search-box'))
            return;
        const startY = e.clientY;
        let dy = 0;
        let moving = false;
        const move = (ev) => {
            const d = ev.clientY - startY;
            if (!moving) {
                if (d < 6)
                    return;
                moving = true;
                panel.classList.add('cmu-dragging');
            }
            dy = Math.max(0, d);
            panel.style.transform = `translateY(${dy}px)`;
        };
        const end = () => {
            cmuUnlisten(window, 'pointermove', move, false);
            cmuUnlisten(window, 'pointerup', end, false);
            cmuUnlisten(window, 'pointercancel', end, false);
            if (!moving)
                return;
            panel.classList.remove('cmu-dragging');
            if (dy > 90) {
                toggleSettingsPanel(false);
                return;
            }
            panel.classList.add('cmu-snap');
            panel.style.transform = '';
            clearTimeout(CMU_PANEL_ANIM.snapTimer);
            CMU_PANEL_ANIM.snapTimer = setTimeout(() => {
                CMU_PANEL_ANIM.snapTimer = 0;
                panel.classList.remove('cmu-snap');
            }, 400);
        };
        cmuListen(window, 'pointermove', move, false);
        cmuListen(window, 'pointerup', end, false);
        cmuListen(window, 'pointercancel', end, false);
    }
    const Q_CHECK_ICON = `<svg class="ci" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4 10.5 8.2 14.5 16 5.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    const CMU_KEY_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="7.5" cy="12.5" r="3.5"/><path d="M11 12.5h8M16 12.5v2.7M19 12.5v3.7"/></svg>`;
    const CMU_COPY_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="10" height="10" rx="2"/><path d="M5 15V7a2 2 0 0 1 2-2h8"/></svg>`;
    function renderApiKeyPopover() {
        const keys = loadApiKeys();
        const rows = API_KEY_FIELDS.map(item => {
            const value = escapeHtml(keys[item.key] || '');
            const safeKey = escapeHtml(item.key);
            const safeLabel = escapeHtml(item.label);
            const inputId = `cmu-api-key-${safeKey}`;
            return `
        <div class="subrow cmu-key-row">
          <div class="lbl">
            <label for="${inputId}">${safeLabel}</label>
            <div class="note">입력하면 자동 저장</div>
          </div>
          <div class="cmu-key-line">
            <input id="${inputId}" class="cmu-key-input" data-cmu-api-provider="${safeKey}" value="${value}" placeholder="API 키 입력" autocomplete="off" autocapitalize="off" spellcheck="false" inputmode="text">
            <button class="step-btn cmu-key-copy" data-action="api-copy" data-provider="${safeKey}" type="button" aria-label="${safeLabel} 복사">${CMU_COPY_ICON}</button>
          </div>
        </div>`;
        }).join('');
        return `
      <div class="cmu-key-popover qputil" data-cmu-key-popover inert>
        <div class="cmu-key-inner"><div class="cmu-key-pad">
          <div class="sec">API 키 보관함</div>
          <div class="acc direct cmu-key-card">
            ${rows}
          </div>
        </div></div>
      </div>`;
    }
    const Q_ICONS = {
        ui: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="2"/><path d="M8 9h8M8 13h8M8 17h5"/></svg>`,
        message: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5.5h14v10H9l-4 3v-13Z"/><path d="M8 9h8M8 12h5"/></svg>`,
        theme: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 0 0 16 4.2 4.2 0 0 1 0-8 4.2 4.2 0 0 0 0-8Z"/></svg>`,
        radio: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="2"/><path d="M8.5 15.5a5 5 0 0 1 0-7M15.5 8.5a5 5 0 0 1 0 7M5.5 18.5a9 9 0 0 1 0-13M18.5 5.5a9 9 0 0 1 0 13"/></svg>`,
        dash: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 15v-3M12 15V9M16 15v-5"/></svg>`,
        badge: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="6" width="14" height="12" rx="2"/><path d="M8 10h8M8 14h5"/></svg>`,
        filter: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4"/></svg>`,
        capture: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 8.5h4l1.3-2h4.4l1.3 2h4a1.5 1.5 0 0 1 1.5 1.5v7A1.5 1.5 0 0 1 19.5 18.5h-15A1.5 1.5 0 0 1 3 17v-7A1.5 1.5 0 0 1 4.5 8.5Z"/><circle cx="12" cy="13" r="3.2"/></svg>`
    };
    const CMU_TAB_LABEL_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19 12 5l7 14M8.6 14.4h6.8"/></svg>`;
    const CMU_TAB_ICONONLY_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/></svg>`;
    const CMU_SEARCH_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/></svg>`;
    const CMU_TABS = Object.freeze([
        { id: 'ui', icon: Q_ICONS.ui, label: 'UI', keys: ['autoHideHeader', 'wideView', 'hideStatBar', 'fullscreenButton', 'composerExpandButton', 'inputCharacterCounter', 'mobileMenuSwipeZone', 'mobileLeftMenuButton', 'mobileRightMenuButton', 'emptySendGuard', 'draftAutoSave', 'hideEndingHint'] },
        { id: 'message', icon: Q_ICONS.message, label: '길게 누르기', keys: ['messageLongPressMenu'] },
        { id: 'theme', icon: Q_ICONS.theme, label: '테마', keys: ['themeSkin'] },
        { id: 'radiosonde', icon: Q_ICONS.radio, label: '라존데', keys: ['radiosonde'] },
        { id: 'dashboard', icon: Q_ICONS.dash, label: '대시보드', keys: ['dashboard', 'dashboardSidebar'] },
        { id: 'badge', icon: Q_ICONS.badge, label: '배지', keys: ['badgeChars', 'badgeTime', 'modelIcon', 'answerCost'] },
        { id: 'nativemodel', icon: Q_ICONS.filter, label: '모델', keys: ['nativeModelFilter', 'outputModelFilter'] },
        { id: 'capture', icon: Q_ICONS.capture, label: '로그 캡처', keys: ['logCapture'] }
    ]);
    function normalizeCmuSettingsTab(id) {
        return CMU_TABS.some(t => t.id === id) ? id : 'ui';
    }
    function renderCmuTabBar() {
        const showLabel = settings.settingsTabLabels !== false;
        const tabs = CMU_TABS.map(t => {
            const on = t.id === cmuSettingsTab;
            const act = cmuTabActive(t);
            return `<button type="button" class="cmu-tab ${on ? 'on' : ''} ${act ? 'act' : ''}" data-action="q-tab" data-tab="${t.id}" title="${t.label}" aria-label="${t.label}" aria-selected="${on ? 'true' : 'false'}">${t.icon}<span>${t.label}</span><i class="cmu-tab-dot"></i></button>`;
        }).join('');
        return `<div class="cmu-tabs-wrap"><div><div class="cmu-tabs${showLabel ? '' : ' icon-only'}"><span class="cmu-tab-ind" aria-hidden="true"></span>${tabs}</div></div></div>`;
    }
    function renderCmuSearchBar() {
        const v = escapeHtml(cmuSettingsQuery || '');
        return `
      <div class="cmu-search-box">
        <div class="cmu-search${v.trim() ? ' has' : ''}">
          ${CMU_SEARCH_ICON}
          <input id="cmu-settings-search" type="search" placeholder="설정 검색" value="${v}" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search" aria-label="설정 검색">
          <button type="button" class="cmu-search-clear" data-action="search-clear" aria-label="검색 지우기">×</button>
        </div>
      </div>`;
    }
    function qCard(inner) { return `<div class="qcard">${inner}</div>`; }
    function qPage(id, inner) { return `<div class="cmu-page ${id === cmuSettingsTab ? 'on' : ''}" data-page="${id}">${inner}</div>`; }
    function cmuIndexSettingsSearch(panel) {
        panel.querySelectorAll('.cmu-page .subrow').forEach(row => {
            if (row.dataset.search)
                return;
            const text = (row.querySelector('.lbl')?.textContent || '').replace(/\s+/g, ' ').trim();
            row.dataset.search = text.toLowerCase();
        });
    }
    function cmuApplySettingsSearch(panel) {
        const q = String(cmuSettingsQuery || '').trim().toLowerCase();
        panel.classList.toggle('cmu-searching', !!q);
        const empty = panel.querySelector('.cmu-search-empty');
        if (!q) {
            panel.querySelectorAll('.cmu-page .subrow').forEach(r => r.classList.remove('cmu-hit-off'));
            if (empty)
                empty.hidden = true;
            return;
        }
        let hit = 0;
        panel.querySelectorAll('.cmu-page .subrow').forEach(r => {
            const ok = (r.dataset.search || '').includes(q);
            r.classList.toggle('cmu-hit-off', !ok);
            if (ok)
                hit++;
        });
        if (empty)
            empty.hidden = hit > 0;
    }
    function qSwitch(key, title, note = '', opts = {}) {
        const externalProvider = isCmuThemeSettingKey(key) ? detectCmuExternalThemeProvider() : '';
        const externalLocked = !!externalProvider;
        const dep = opts.dep || '';
        const depOn = dep ? cmuDepOn(dep) : true;
        const disabled = !!opts.disabled || externalLocked || !depOn;
        const forceOff = !!opts.forceOffWhenDisabled || key === 'themeSkin';
        const checked = disabled && forceOff ? false : !!settings[key];
        const group = opts.group ? ` data-group="${opts.group}"` : '';
        const depAttr = dep ? ` data-cmu-dep="${dep}"` : '';
        const noteText = externalLocked
            ? `${getCmuExternalThemeLabel(externalProvider)} 사용 중 · 합본 설정 보존`
            : note;
        const action = key === 'themeSkin' ? 'theme-switch' : 'q-toggle';
        return `
      <div class="subrow${dep && !depOn ? ' cmu-dep-off' : ''}">
        <div class="lbl">${title}${noteText ? `<div class="note">${noteText}</div>` : ''}</div>
        <button
          type="button"
          class="sw ${checked ? 'on' : ''} ${disabled ? 'disabled' : ''}"
          data-action="${action}"
          data-key="${key}"
          ${group}${depAttr}
          role="switch"
          aria-checked="${checked ? 'true' : 'false'}"
          aria-disabled="${disabled ? 'true' : 'false'}"
          ${disabled ? 'disabled' : ''}
          tabindex="0"
        ></button>
      </div>`;
    }
    function qDirectSwitch(key, icon, title, desc = '') {
        // icon 인자는 호환용으로만 남김 — 배너에 아이콘을 그리지 않는다.
        const externalProvider = key === 'themeSkin' ? detectCmuExternalThemeProvider() : '';
        const locked = !!externalProvider;
        const checked = locked ? false : !!settings[key];
        return `
      <div class="direct"${key === 'themeSkin' ? ' data-cmu-theme-banner' : ''}>
        <div class="row">
          <div class="tx"><b data-cmu-theme-title>${title}</b><span data-cmu-theme-desc>${desc || ''}</span></div>
          <button
            type="button"
            class="sw ${checked ? 'on' : ''} ${locked ? 'disabled' : ''}"
            data-action="theme-switch"
            data-key="${key}"
            role="switch"
            aria-checked="${checked ? 'true' : 'false'}"
            aria-disabled="${locked ? 'true' : 'false'}"
            ${locked ? 'disabled' : ''}
            tabindex="0"
          ></button>
        </div>
      </div>`;
    }
    function qStepper(key, title, min, max, step = 1, suffix = '%') {
        const value = clamp(settings[key], min, max);
        return `
      <div class="subrow">
        <div class="lbl">${title}</div>
        <div class="step" data-key="${key}" data-min="${min}" data-max="${max}" data-step="${step}" data-suffix="${suffix}">
          <button type="button" class="step-btn" data-action="q-step" data-key="${key}" data-delta="-${step}" aria-label="${title} 줄이기">−</button>
          <span class="step-val" data-step-value="${key}">${value}${suffix}</span>
          <button type="button" class="step-btn" data-action="q-step" data-key="${key}" data-delta="${step}" aria-label="${title} 늘리기">+</button>
        </div>
      </div>`;
    }
    function qChip(action, key, label, checked, disabled = false, iconHtml = Q_CHECK_ICON) {
        return `<button type="button" class="chip ${checked ? 'ck' : ''}" data-action="${action}" data-key="${key}" ${disabled ? 'disabled aria-disabled="true"' : ''}>${iconHtml || Q_CHECK_ICON}${label}</button>`;
    }
    function qChipWrap(id, chips, enabled = true) {
        return `<div class="chips ${enabled ? '' : 'off'}" id="${id}">${chips || ''}</div>`;
    }
    function qChoice(action, key, title, options, current, note = '') {
        const chips = (options || []).map(opt => qChip(action, `${key}::${opt.value}`, opt.label, String(current) === String(opt.value))).join('');
        return `
      <div class="subrow cmu-choice-row">
        <div class="lbl">${title}${note ? `<div class="note">${note}</div>` : ''}</div>
        <div class="chips">${chips}</div>
      </div>`;
    }
    function renderLogCaptureRuleRows() {
        const rules = normalizeLogCaptureRules(settings.logCaptureRules);
        const rows = rules.map((rule, index) => `
          <div class="cmu-lc-rule-row" data-lc-rule-index="${index}">
            <input class="cmu-lc-rule-input" type="text" value="${escapeHtml(rule.from)}" placeholder="찾을 문구" data-lc-rule-field="from" data-lc-rule-index="${index}" autocomplete="off" spellcheck="false">
            <span class="cmu-lc-rule-arrow">→</span>
            <input class="cmu-lc-rule-input" type="text" value="${escapeHtml(rule.to)}" placeholder="비우면 삭제" data-lc-rule-field="to" data-lc-rule-index="${index}" autocomplete="off" spellcheck="false">
            <button type="button" class="cmu-lc-rule-delete" data-action="lc-rule-delete" data-index="${index}" aria-label="규칙 삭제">×</button>
          </div>`).join('');
        return `
      <div class="subrow cmu-rule-editor">
        <div class="lbl">텍스트 정리<div class="note">오른쪽을 비우면 제거 · 입력하면 치환 · 위에서 아래 순서로 적용</div></div>
        <div class="cmu-lc-rule-list">${rows || '<div class="cmu-lc-rule-empty">등록된 규칙이 없어요.</div>'}</div>
        <button type="button" class="cmu-lc-rule-add" data-action="lc-rule-add">+ 규칙 추가</button>
      </div>`;
    }
    function isCmuFullscreenActive() {
        return !!(document.fullscreenElement || document.webkitFullscreenElement);
    }
    function isCmuFullscreenSupported() {
        try {
            const root = document.documentElement;
            return !!(root &&
                (document.fullscreenEnabled !== false) &&
                (root.requestFullscreen || root.webkitRequestFullscreen) &&
                (document.exitFullscreen || document.webkitExitFullscreen));
        }
        catch (_) {
            return false;
        }
    }
    function cmuViewportWidth() {
        const values = [
            window.innerWidth,
            document.documentElement?.clientWidth,
            window.visualViewport?.width,
            window.screen?.width,
        ].map(Number).filter(v => Number.isFinite(v) && v > 0);
        return values.length ? Math.min(...values) : (window.innerWidth || 0);
    }
    function isCmuEdgeMenuViewport() {
        return isMobileLike() && cmuViewportWidth() <= 820;
    }
    function cmuEdgeRect(el) {
        if (!(el instanceof HTMLElement) || !el.isConnected)
            return null;
        try {
            const style = getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden' || style.pointerEvents === 'none')
                return null;
            const rect = el.getBoundingClientRect();
            if (!rect || rect.width <= 1 || rect.height <= 1)
                return null;
            return rect;
        }
        catch (_) {
            return null;
        }
    }
    function cmuEdgeText(el) {
        try {
            return String(el?.innerText || el?.textContent || '').replace(/\s+/g, ' ').trim();
        }
        catch (_) {
            return '';
        }
    }
    function cmuHasRoomMenuGlyph(button) {
        if (!(button instanceof Element))
            return false;
        const pathText = [...button.querySelectorAll('path')]
            .map(path => String(path.getAttribute('d') || ''))
            .join(' ')
            .replace(/\s+/g, ' ');
        return pathText.includes('M11 11h2v2h-2') &&
            (pathText.includes('M1.99 12') || pathText.includes('S22.01 17.52 22.01 12'));
    }
    function isCmuEdgeOwnElement(el) {
        return !!el?.closest?.(`#${ID.panel}, #${ID.toolbarWrapper}, #${ID.leftMenuZone}, #${ID.rightMenuZone}, #${ID.menuSwipeZone}, #${ID.toast}, #${ID.dashboard}, #${ID.dashboardSidebar}, #chud-info-menu, #chud-side-menu, #igx-live-popup`);
    }
    function scoreCmuMobileChatListToggle(button) {
        if (!(button instanceof HTMLElement) || !isCmuEdgeMenuViewport())
            return -1;
        if (isCmuEdgeOwnElement(button))
            return -1;
        if (button.closest?.('[role="dialog"], [data-radix-popper-content-wrapper]'))
            return -1;
        const rect = cmuEdgeRect(button);
        if (!rect)
            return -1;
        if (rect.width < 24 || rect.width > 64 || rect.height < 24 || rect.height > 64)
            return -1;
        if (rect.left > 150 || rect.top > 120)
            return -1;
        const svg = button.querySelector?.('svg');
        if (!svg)
            return -1;
        const classes = `${String(button.className || '')} ${String(button.parentElement?.className || '')}`;
        const text = cmuEdgeText(button);
        const pathText = [...button.querySelectorAll('path')]
            .map(path => String(path.getAttribute('d') || ''))
            .join(' ')
            .replace(/\s+/g, ' ');
        let score = 0;
        if (classes.includes('md:hidden'))
            score += 9;
        if (classes.includes('size-10'))
            score += 4;
        if (classes.includes('inline-flex') || classes.includes('items-center'))
            score += 2;
        if (!text)
            score += 1;
        if (rect.left <= 92 && rect.top <= 92)
            score += 7;
        if (rect.left <= 140)
            score += 2;
        if (pathText.includes('M21 6.4') || pathText.includes('M3 19.4h18') || pathText.includes('M4 6h16'))
            score += 14;
        if (/에피소드|보관함|채팅/.test(String(button.getAttribute('aria-label') || button.title || '')))
            score += 4;
        return score;
    }
    function findCmuMobileChatListToggle() {
        if (cachedCmuMobileChatListToggle?.isConnected && scoreCmuMobileChatListToggle(cachedCmuMobileChatListToggle) >= 12)
            return cachedCmuMobileChatListToggle;
        let best = null;
        let bestScore = -1;
        document.querySelectorAll('button, [role="button"]').forEach(button => {
            const score = scoreCmuMobileChatListToggle(button);
            if (score > bestScore) {
                best = button;
                bestScore = score;
            }
        });
        cachedCmuMobileChatListToggle = bestScore >= 12 ? best : null;
        return cachedCmuMobileChatListToggle;
    }
    function getCmuMobileChatListPopover() {
        if (!isCmuEdgeMenuViewport())
            return null;
        const candidates = document.querySelectorAll('[data-radix-popper-content-wrapper] [role="dialog"], [role="dialog"][data-state], [data-side][data-state]');
        for (const panel of candidates) {
            if (!(panel instanceof HTMLElement))
                continue;
            if (panel.closest?.(`#${ID.panel}, #${ID.toolbarWrapper}, #${ID.leftMenuZone}, #${ID.rightMenuZone}, #${ID.menuSwipeZone}`))
                continue;
            const state = String(panel.getAttribute('data-state') || '');
            const cls = String(panel.className || '');
            const text = cmuEdgeText(panel).slice(0, 600);
            const hasList = !!panel.querySelector?.('[data-testid="virtuoso-scroller"], [data-virtuoso-scroller="true"], [role="tablist"]');
            if (panel.getAttribute('role') === 'dialog' && state === 'open' && hasList && (cls.includes('md:hidden') || panel.closest('[data-radix-popper-content-wrapper]')) && /에피소드|보관함|파티챗/.test(text))
                return panel;
        }
        return null;
    }
    function releaseCmuMobileChatListStaleMarkers() {
        document.querySelectorAll('[data-crack-ui-mobile-chat-list-popover="1"], [data-crack-ui-chat-list-panel="1"][role="dialog"]').forEach(panel => {
            if (!(panel instanceof HTMLElement))
                return;
            try {
                delete panel.dataset.crackUiMobileChatListPopover;
                delete panel.dataset.crackUiChatListPanel;
                delete panel.dataset.crackUiChatListForced;
                ['width', 'min-width', 'max-width', 'flex-basis', 'overflow', 'pointer-events', 'touch-action'].forEach(prop => panel.style.removeProperty(prop));
            }
            catch (_) { }
        });
    }
    function cmuLeftMenuAssistEnabled() {
        return !!(settings.mobileLeftMenuButton || settings.mobileMenuSwipeZone);
    }
    function cmuRightMenuAssistEnabled() {
        return !!(settings.mobileRightMenuButton || settings.mobileMenuSwipeZone);
    }
    function syncCmuMobileChatListOpenState() {
        const active = shouldRun() && isChatRoomPath() && isCmuEdgeMenuViewport() && cmuLeftMenuAssistEnabled();
        const open = active && !!getCmuMobileChatListPopover();
        document.documentElement.classList.toggle('cmu-mobile-chat-list-open', open);
        if (!open)
            document.documentElement.classList.remove('cmu-chat-list-height-fixed');
        return open;
    }
    function clickCmuMobileChatListButton() {
        if (!isCmuEdgeMenuViewport())
            return false;
        const now = Date.now();
        if (now - lastCmuLeftMenuHandleAt < CMU_EDGE_HANDLE_COOLDOWN.left)
            return false;
        lastCmuLeftMenuHandleAt = now;
        releaseCmuMobileChatListStaleMarkers();
        syncCmuEdgeMenuOpenState();
        const toggle = findCmuMobileChatListToggle();
        if (!toggle) {
            showToast('채팅 목록 버튼 못 찾음');
            return false;
        }
        const ok = fireClickSequence(toggle);
        scheduleCmuEdgeMenuStateSync();
        scheduleMobileChatListPopoverLayoutSettle();
        return ok;
    }
    function scoreCmuRoomPanel(panel) {
        if (!(panel instanceof HTMLElement) || !isChatRoomPath())
            return -1;
        if (isCmuEdgeOwnElement(panel))
            return -1;
        const rect = cmuEdgeRect(panel);
        if (!rect)
            return -1;
        const vw = window.innerWidth || document.documentElement.clientWidth || 0;
        if (rect.height < 260 || rect.top < -20 || rect.top > 130)
            return -1;
        if (rect.right < vw - 16 && rect.left < vw - 340)
            return -1;
        const cls = String(panel.className || '');
        const text = cmuEdgeText(panel).slice(0, 800);
        let score = 0;
        if (cls.includes('border-l'))
            score += 4;
        if (cls.includes('right-0'))
            score += 3;
        if (cls.includes('w-[260px]') || cls.includes('w-\[260px\]'))
            score += 5;
        if (cls.includes('transition-all'))
            score += 2;
        if (text.includes('채팅방 설정'))
            score += 7;
        if (text.includes('유저 노트'))
            score += 5;
        if (text.includes('키보드 단축키'))
            score += 3;
        if (text.includes('이미지 보관함'))
            score += 3;
        if (rect.width > 80 && rect.width <= 320)
            score += 2;
        if (rect.right >= vw - 10)
            score += 2;
        return score;
    }
    function findCmuRoomPanel() {
        if (cachedCmuRoomPanel?.isConnected && scoreCmuRoomPanel(cachedCmuRoomPanel) >= 10) {
            observeCmuRoomPanelState(cachedCmuRoomPanel);
            return cachedCmuRoomPanel;
        }
        const root = document.querySelector('main') || document;
        if (CMU_DOM_WATCH.roomPanelSearchRoot === root && Date.now() < CMU_DOM_WATCH.roomPanelMissUntil)
            return null;
        CMU_DOM_WATCH.roomPanelSearchRoot = root;
        let best = null;
        let bestScore = -1;
        root.querySelectorAll('div').forEach(el => {
            const score = scoreCmuRoomPanel(el);
            if (score > bestScore) {
                best = el;
                bestScore = score;
            }
        });
        cachedCmuRoomPanel = bestScore >= 10 ? best : null;
        CMU_DOM_WATCH.roomPanelMissUntil = cachedCmuRoomPanel ? 0 : Date.now() + 250;
        observeCmuRoomPanelState(cachedCmuRoomPanel);
        return cachedCmuRoomPanel;
    }
    function isCmuRoomPanelOpen(panel = findCmuRoomPanel()) {
        const rect = cmuEdgeRect(panel);
        if (!rect)
            return false;
        const vw = window.innerWidth || document.documentElement.clientWidth || 0;
        return rect.width > 120 && rect.left < vw - 100;
    }
    function scoreCmuRoomMenuToggle(button) {
        if (!(button instanceof HTMLElement) || !isChatRoomPath())
            return -1;
        if (isCmuEdgeOwnElement(button))
            return -1;
        if (button.closest?.('[data-testid="virtuoso-scroller"], [role="dialog"], [data-radix-popper-content-wrapper]'))
            return -1;
        const rect = cmuEdgeRect(button);
        if (!rect)
            return -1;
        const vw = window.innerWidth || document.documentElement.clientWidth || 0;
        const hasRoomMenuGlyph = cmuHasRoomMenuGlyph(button);
        if (rect.width < 20 || rect.width > 64 || rect.height < 20 || rect.height > 64)
            return -1;
        if ((rect.top < -90 || rect.top > 140 || rect.right < vw - 160) && !hasRoomMenuGlyph)
            return -1;
        const classes = String(button.className || '');
        const text = cmuEdgeText(button);
        const label = `${button.getAttribute('aria-label') || ''} ${button.title || ''}`;
        const parentText = cmuEdgeText(button.parentElement || button).slice(0, 180);
        let score = 0;
        if (classes.includes('inline-flex') || classes.includes('items-center'))
            score += 2;
        if (classes.includes('justify-center'))
            score += 1;
        if (!text)
            score += 2;
        if (rect.right > vw - 16)
            score += 4;
        if (rect.right > vw - 70)
            score += 3;
        if (button.querySelector('svg'))
            score += 2;
        if (/채팅방|설정|메뉴|보관함/.test(label))
            score += 4;
        if (parentText.includes('채팅방 설정'))
            score += 5;
        if (parentText.includes('프로챗') || parentText.includes('하이퍼챗') || parentText.includes('슈퍼챗') || parentText.includes('파워챗') || parentText.includes('페이블챗'))
            score += 3;
        if (hasRoomMenuGlyph)
            score += 14;
        if (button.querySelector('img[src*="model-icon"]'))
            score -= 8;
        return score;
    }
    function findCmuRoomMenuToggle() {
        if (cachedCmuRoomMenuToggle?.isConnected && scoreCmuRoomMenuToggle(cachedCmuRoomMenuToggle) >= 6)
            return cachedCmuRoomMenuToggle;
        let best = null;
        let bestScore = -1;
        document.querySelectorAll('button, [role="button"]').forEach(button => {
            const score = scoreCmuRoomMenuToggle(button);
            if (score > bestScore) {
                best = button;
                bestScore = score;
            }
        });
        cachedCmuRoomMenuToggle = bestScore >= 6 ? best : null;
        return cachedCmuRoomMenuToggle;
    }
    function clickCmuRightRoomMenuButton() {
        if (!isCmuEdgeMenuViewport())
            return false;
        const now = Date.now();
        if (now - lastCmuRightMenuHandleAt < CMU_EDGE_HANDLE_COOLDOWN.right)
            return false;
        lastCmuRightMenuHandleAt = now;
        if (isCmuRoomPanelOpen()) {
            syncCmuEdgeMenuOpenState();
            return true;
        }
        const toggle = findCmuRoomMenuToggle();
        if (!toggle) {
            showToast('우측 메뉴 버튼 못 찾음');
            return false;
        }
        const ok = fireClickSequence(toggle);
        scheduleCmuEdgeMenuStateSync();
        return ok;
    }
    function syncCmuRightRoomMenuOpenState() {
        const active = shouldRun() && isChatRoomPath() && isCmuEdgeMenuViewport() && cmuRightMenuAssistEnabled();
        const open = active && !!isCmuRoomPanelOpen();
        document.documentElement.classList.toggle('cmu-mobile-room-panel-open', open);
        return open;
    }
    function scheduleCmuRoomPanelStateSync() {
        cmuRoomPanelStateTimers.forEach(timer => window.clearTimeout(timer));
        cmuRoomPanelStateTimers = [];
        const steps = [0, 80, 220, 480, 850, 1400];
        steps.forEach(ms => {
            const timer = window.setTimeout(() => {
                syncCmuRightRoomMenuOpenState();
                if (ms === steps[steps.length - 1])
                    cmuRoomPanelStateTimers = [];
            }, ms);
            cmuRoomPanelStateTimers.push(timer);
        });
    }
    function observeCmuRoomPanelState(panel) {
        const nextRoot = panel instanceof HTMLElement && panel.isConnected ? panel : null;
        if (nextRoot === cmuRoomPanelObservedRoot)
            return;
        try {
            cmuRoomPanelStateObserver?.disconnect?.();
        }
        catch (_) { }
        cmuRoomPanelStateObserver = null;
        cmuRoomPanelObservedRoot = nextRoot;
        if (!(nextRoot instanceof HTMLElement))
            return;
        cmuRoomPanelStateObserver = new MutationObserver(() => scheduleCmuRoomPanelStateSync());
        try {
            cmuRoomPanelStateObserver.observe(nextRoot, {
                attributes: true,
                attributeFilter: ['class', 'style', 'hidden', 'aria-hidden', 'data-state'],
            });
            if (nextRoot.parentElement) {
                cmuRoomPanelStateObserver.observe(nextRoot.parentElement, {
                    attributes: true,
                    childList: true,
                    attributeFilter: ['class', 'style', 'hidden', 'aria-hidden', 'data-state'],
                });
            }
        }
        catch (_) { }
    }
    function bindCmuRoomPanelReleaseWatch() {
        const root = document.documentElement;
        if (root.dataset.cmuRoomPanelReleaseBound === '1')
            return;
        root.dataset.cmuRoomPanelReleaseBound = '1';
        cmuRegisterGlobalGesture('room-panel-release', signal => {
            const settleIfOpen = () => {
                if (root.classList.contains('cmu-mobile-room-panel-open'))
                    scheduleCmuRoomPanelStateSync();
            };
            cmuGestureListen(signal, document, 'pointerup', settleIfOpen, true);
            cmuGestureListen(signal, document, 'touchend', settleIfOpen, { capture: true, passive: true });
            cmuGestureListen(signal, document, 'click', settleIfOpen, true);
            cmuGestureListen(signal, document, 'transitionend', event => {
                const panel = cachedCmuRoomPanel;
                const target = event.target;
                if (!(panel instanceof HTMLElement) || !(target instanceof Element))
                    return;
                if (target === panel || panel.contains(target) || target.contains(panel))
                    scheduleCmuRoomPanelStateSync();
            }, true);
            cmuGestureListen(signal, window, 'popstate', () => scheduleCmuRoomPanelStateSync());
        });
    }
    function syncCmuEdgeMenuOpenState() {
        try {
            if (syncCmuUserNoteDialogState())
                return;
            if (!(shouldRun() && isChatRoomPath() && isCmuEdgeMenuViewport())) {
                document.documentElement.classList.remove('cmu-mobile-chat-list-open', 'cmu-mobile-room-panel-open', 'cmu-chat-list-height-fixed');
                return;
            }
            releaseCmuMobileChatListStaleMarkers();
            syncCmuMobileChatListOpenState();
            syncCmuRightRoomMenuOpenState();
        }
        catch (_) { }
    }
    let cmuEdgeMenuStateTimers = [];
    function scheduleCmuEdgeMenuStateSync() {
        cmuEdgeMenuStateTimers.forEach((timer) => window.clearTimeout(timer));
        cmuEdgeMenuStateTimers = [];
        const steps = CMU_EDGE_SYNC_STEPS;
        steps.forEach((ms) => {
            const timer = window.setTimeout(() => {
                syncCmuEdgeMenuOpenState();
                if (ms === steps[steps.length - 1])
                    cmuEdgeMenuStateTimers = [];
            }, ms);
            cmuEdgeMenuStateTimers.push(timer);
        });
    }
    function cmuMenuSwipeZoneActive() {
        return !cmuUserNoteGuardActive() && shouldRun() && isChatRoomPath() && isCmuEdgeMenuViewport() && !!settings.mobileMenuSwipeZone;
    }
    function positionCmuMenuSwipeZone(input = findChatInput()) {
        if (cmuUserNoteGuardActive())
            return;
        const zone = document.getElementById(ID.menuSwipeZone);
        if (!(zone instanceof HTMLElement))
            return;
        if (!cmuMenuSwipeZoneActive())
            return;
        const shell = findComposerShell(input || findChatInput());
        let top = NaN;
        try {
            const rect = shell?.getBoundingClientRect?.();
            if (rect && rect.width > 40 && rect.height > 20 && rect.top > 0) {
                top = Math.max(54, Math.round(rect.top - CMU_MENU_SWIPE.TOP_OFFSET));
            }
        }
        catch (_) { }
        if (Number.isFinite(top)) {
            zone.style.setProperty('top', `${top}px`, 'important');
            zone.style.setProperty('bottom', 'auto', 'important');
        }
        else {
            zone.style.removeProperty('top');
            zone.style.setProperty('bottom', 'calc(98px + env(safe-area-inset-bottom))', 'important');
        }
    }
    function scheduleCmuMenuSwipeZonePosition() {
        if (cmuMenuSwipePositionRaf || cmuUserNoteGuardActive())
            return;
        cmuMenuSwipePositionRaf = requestAnimationFrame(() => {
            cmuMenuSwipePositionRaf = 0;
            positionCmuMenuSwipeZone();
        });
    }
    function flashCmuMenuSwipeZone() {
        const zone = document.getElementById(ID.menuSwipeZone);
        if (!(zone instanceof HTMLElement))
            return;
        zone.classList.add('cmu-swipe-feedback');
        window.setTimeout(() => zone.classList.remove('cmu-swipe-feedback'), CMU_MENU_SWIPE.FEEDBACK_MS);
    }
    function cmuPointInMenuSwipeZone(event) {
        if (!cmuMenuSwipeZoneActive())
            return false;
        const zone = document.getElementById(ID.menuSwipeZone);
        if (!(zone instanceof HTMLElement))
            return false;
        let rect = null;
        try {
            rect = zone.getBoundingClientRect();
        }
        catch (_) {
            rect = null;
        }
        if (!rect || rect.width < 20 || rect.height < 12)
            return false;
        const x = Number(event?.clientX);
        const y = Number(event?.clientY);
        if (!Number.isFinite(x) || !Number.isFinite(y))
            return false;
        return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    }
    function cmuSwipeEventTargetBlocked(target) {
        if (!(target instanceof Element))
            return false;
        if (isCmuProtectedEditorTarget(target))
            return true;
        return !!target.closest?.(`#${ID.panel}, #${ID.toolbarWrapper}, #${ID.leftMenuZone}, #${ID.rightMenuZone}, #${ID.toast}, #${ID.logCaptureBar}, #${ID.logCapturePreview}, #igx-live-popup, #igx-live-barline, input, textarea, select, [contenteditable="true"]`);
    }
    function bindCmuMenuSwipeZone(zone) {
        if (!(zone instanceof HTMLElement))
            return;
        const root = document.documentElement;
        if (root.dataset.cmuMenuSwipeDocBound === '1')
            return;
        root.dataset.cmuMenuSwipeDocBound = '1';
        cmuRegisterGlobalGesture('menu-swipe-zone', signal => {
            let tracking = null;
            let touchGuard = null;
            let suppressClickUntil = 0;
            let suppressClickX = 0;
            let suppressClickY = 0;

            const syncGestureLockClass = () => {
                root.classList.toggle('cmu-menu-swipe-tracking', !!tracking || !!touchGuard);
            };
            const clearTracking = () => {
                tracking = null;
                syncGestureLockClass();
            };
            const clearTouchGuard = () => {
                touchGuard = null;
                syncGestureLockClass();
            };
            const cancel = () => {
                tracking = null;
                touchGuard = null;
                root.classList.remove('cmu-menu-swipe-tracking');
            };
            const lockAxis = (current, dx, dy) => {
                if (current)
                    return current;
                const ax = Math.abs(dx);
                const ay = Math.abs(dy);
                if (Math.max(ax, ay) < CMU_MENU_SWIPE.AXIS_LOCK_PX)
                    return '';
                if (ax > ay * CMU_MENU_SWIPE.AXIS_LOCK_RATIO)
                    return 'x';
                if (ay > ax * CMU_MENU_SWIPE.AXIS_LOCK_RATIO)
                    return 'y';
                return '';
            };
            const keepRootAtStartX = data => {
                const scroller = document.scrollingElement;
                if (!scroller || !Number.isFinite(data?.scrollLeft))
                    return;
                if (Math.abs(scroller.scrollLeft - data.scrollLeft) > 0.5)
                    scroller.scrollLeft = data.scrollLeft;
            };
            const maybeSuppressClickAfterSwipe = (event) => {
                if (isCmuProtectedEditorTarget(event.target))
                    return;
                if (Date.now() > suppressClickUntil)
                    return;
                const x = Number(event.clientX || 0);
                const y = Number(event.clientY || 0);
                if (Math.abs(x - suppressClickX) > 18 || Math.abs(y - suppressClickY) > 18)
                    return;
                event.preventDefault?.();
                event.stopPropagation?.();
                event.stopImmediatePropagation?.();
            };
            const beginTracking = (event, x, y, id) => {
                if (cmuUserNoteGuardActive() || isCmuUserNoteEditor(event.target)) {
                    clearTracking();
                    return false;
                }
                if (!cmuMenuSwipeZoneActive())
                    return false;
                if (!cmuPointInMenuSwipeZone({ clientX: x, clientY: y }))
                    return false;
                if (cmuSwipeEventTargetBlocked(event.target))
                    return false;
                positionCmuMenuSwipeZone();
                tracking = {
                    id,
                    x,
                    y,
                    lastX: x,
                    lastY: y,
                    at: Date.now(),
                    axis: '',
                    scrollLeft: Number(document.scrollingElement?.scrollLeft || 0),
                };
                syncGestureLockClass();
                return true;
            };
            const finishSwipe = (data, endX, endY, event = null) => {
                if (!data || !cmuMenuSwipeZoneActive())
                    return;
                const dx = endX - data.x;
                const dy = endY - data.y;
                const ax = Math.abs(dx);
                const ay = Math.abs(dy);
                const elapsed = Date.now() - data.at;
                const isSwipe = !(elapsed > CMU_MENU_SWIPE.MAX_MS || ax < CMU_MENU_SWIPE.MIN_DX || ay > CMU_MENU_SWIPE.MAX_DY || ax <= ay * CMU_MENU_SWIPE.RATIO);
                if (!isSwipe)
                    return;
                if (event?.cancelable)
                    event.preventDefault();
                if (Date.now() - lastCmuMenuSwipeAt < CMU_MENU_SWIPE.COOLDOWN_MS)
                    return;
                suppressClickUntil = Date.now() + 450;
                suppressClickX = endX;
                suppressClickY = endY;
                if (dx > 0) {
                    if (syncCmuMobileChatListOpenState())
                        return;
                    lastCmuMenuSwipeAt = Date.now();
                    flashCmuMenuSwipeZone();
                    clickCmuMobileChatListButton();
                }
                else {
                    if (syncCmuRightRoomMenuOpenState())
                        return;
                    lastCmuMenuSwipeAt = Date.now();
                    flashCmuMenuSwipeZone();
                    clickCmuRightRoomMenuButton();
                }
            };
            const findTouch = (list, id) => {
                if (!list)
                    return null;
                for (let i = 0; i < list.length; i++) {
                    const touch = list[i];
                    if (id == null || touch.identifier === id)
                        return touch;
                }
                return null;
            };

            try {
                signal?.addEventListener?.('abort', cancel, { once: true });
            }
            catch (_) { }

            cmuGestureListen(signal, document, 'click', maybeSuppressClickAfterSwipe, true);

            /* Pointer Events 경로: Edge/Firefox/Safari의 주 제스처 판정. */
            cmuGestureListen(signal, document, 'pointerdown', event => {
                if (cmuUserNoteGuardActive() || isCmuUserNoteEditor(event.target)) {
                    clearTracking();
                    return;
                }
                if (!cmuMenuSwipeZoneActive())
                    return;
                if (event.pointerType === 'mouse' && event.button !== 0)
                    return;
                if (event.isPrimary === false)
                    return;
                if (tracking) {
                    clearTracking();
                    return;
                }
                beginTracking(event, event.clientX, event.clientY, event.pointerId);
            }, { capture: true, passive: true });

            cmuGestureListen(signal, document, 'pointermove', event => {
                if (!tracking || event.pointerId !== tracking.id)
                    return;
                if (cmuUserNoteGuardActive()) {
                    clearTracking();
                    return;
                }
                tracking.lastX = event.clientX;
                tracking.lastY = event.clientY;
                const dx = event.clientX - tracking.x;
                const dy = event.clientY - tracking.y;
                tracking.axis = lockAxis(tracking.axis, dx, dy);
                if (tracking.axis === 'x') {
                    if (event.cancelable)
                        event.preventDefault();
                    keepRootAtStartX(tracking);
                }
            }, { capture: true, passive: false });

            cmuGestureListen(signal, document, 'pointercancel', event => {
                if (!tracking || event.pointerId !== tracking.id)
                    return;
                clearTracking();
            }, { capture: true, passive: true });

            cmuGestureListen(signal, document, 'pointerup', event => {
                if (!tracking || event.pointerId !== tracking.id)
                    return;
                if (cmuUserNoteGuardActive()) {
                    clearTracking();
                    return;
                }
                const data = tracking;
                if (data.axis === 'x' && event.cancelable)
                    event.preventDefault();
                clearTracking();
                finishSwipe(data, event.clientX, event.clientY, event);
            }, { capture: true, passive: false });

            /*
             * iOS Safari는 PointerEvent가 있어도 실제 스크롤/러버밴딩 차단은
             * non-passive touchmove preventDefault가 더 확실하다.
             * Android Firefox/Edge에서도 같은 보호막으로 동작한다.
             * 메뉴 판정은 PointerEvent가 담당하고, 여기서는 화면의 가로 이동만 막는다.
             */
            cmuGestureListen(signal, document, 'touchstart', event => {
                if (cmuUserNoteGuardActive() || isCmuUserNoteEditor(event.target)) {
                    clearTouchGuard();
                    return;
                }
                if (!cmuMenuSwipeZoneActive() || event.touches?.length !== 1)
                    return;
                const touch = event.touches[0];
                if (!cmuPointInMenuSwipeZone(touch) || cmuSwipeEventTargetBlocked(event.target))
                    return;
                touchGuard = {
                    id: touch.identifier,
                    x: touch.clientX,
                    y: touch.clientY,
                    axis: '',
                    scrollLeft: Number(document.scrollingElement?.scrollLeft || 0),
                };
                syncGestureLockClass();
            }, { capture: true, passive: true });

            cmuGestureListen(signal, document, 'touchmove', event => {
                if (!touchGuard)
                    return;
                if (cmuUserNoteGuardActive()) {
                    clearTouchGuard();
                    return;
                }
                const touch = findTouch(event.touches, touchGuard.id);
                if (!touch) {
                    clearTouchGuard();
                    return;
                }
                const dx = touch.clientX - touchGuard.x;
                const dy = touch.clientY - touchGuard.y;
                touchGuard.axis = lockAxis(touchGuard.axis, dx, dy);
                if (touchGuard.axis === 'x') {
                    if (event.cancelable)
                        event.preventDefault();
                    keepRootAtStartX(touchGuard);
                }
            }, { capture: true, passive: false });

            const finishTouchGuard = event => {
                if (!touchGuard)
                    return;
                const touch = findTouch(event.changedTouches, touchGuard.id);
                if (!touch && event.type === 'touchend')
                    return;
                clearTouchGuard();
            };
            cmuGestureListen(signal, document, 'touchend', finishTouchGuard, { capture: true, passive: true });
            cmuGestureListen(signal, document, 'touchcancel', clearTouchGuard, { capture: true, passive: true });
        });
    }
    function ensureCmuMenuSwipeZone(input = findChatInput()) {
        let zone = document.getElementById(ID.menuSwipeZone);
        const active = cmuMenuSwipeZoneActive();
        if (!active) {
            zone?.remove?.();
            return;
        }
        if (!zone) {
            zone = document.createElement('div');
            zone.id = ID.menuSwipeZone;
            zone.setAttribute('aria-hidden', 'true');
            zone.setAttribute('data-cmu-swipe-zone', 'menu');
            document.body?.appendChild(zone);
        }
        bindCmuMenuSwipeZone(zone);
        positionCmuMenuSwipeZone(input);
    }
    function bindCmuEdgeHandle(handle, side) {
        if (!(handle instanceof HTMLElement) || handle.dataset.cmuEdgeBound === '1')
            return;
        handle.dataset.cmuEdgeBound = '1';
        const run = (event) => {
            if (cmuUserNoteGuardActive())
                return;
            event.preventDefault?.();
            event.stopPropagation?.();
            event.stopImmediatePropagation?.();
            if (side === 'left')
                clickCmuMobileChatListButton();
            else
                clickCmuRightRoomMenuButton();
        };
        handle.addEventListener('pointerdown', run, { passive: false });
        handle.addEventListener('touchstart', run, { passive: false });
        handle.addEventListener('click', run, { passive: false });
    }
    function ensureMobileEdgeMenuButtons() {
        bindCmuRoomPanelReleaseWatch();
        const active = shouldRun() && isChatRoomPath() && isCmuEdgeMenuViewport();
        let leftZone = document.getElementById(ID.leftMenuZone);
        if (active && settings.mobileLeftMenuButton) {
            if (!leftZone) {
                leftZone = document.createElement('div');
                leftZone.id = ID.leftMenuZone;
                leftZone.setAttribute('aria-hidden', 'true');
                document.body?.appendChild(leftZone);
            }
            let handle = document.getElementById(ID.leftMenuHandle);
            if (!handle || handle.parentElement !== leftZone) {
                handle?.remove?.();
                handle = document.createElement('button');
                handle.id = ID.leftMenuHandle;
                handle.type = 'button';
                handle.title = '채팅 목록 열기';
                handle.setAttribute('aria-label', '채팅 목록 열기');
                leftZone.appendChild(handle);
            }
            bindCmuEdgeHandle(handle, 'left');
        }
        else {
            leftZone?.remove?.();
        }
        let rightZone = document.getElementById(ID.rightMenuZone);
        if (active && settings.mobileRightMenuButton) {
            if (!rightZone) {
                rightZone = document.createElement('div');
                rightZone.id = ID.rightMenuZone;
                rightZone.setAttribute('aria-hidden', 'true');
                document.body?.appendChild(rightZone);
            }
            let handle = document.getElementById(ID.rightMenuHandle);
            if (!handle || handle.parentElement !== rightZone) {
                handle?.remove?.();
                handle = document.createElement('button');
                handle.id = ID.rightMenuHandle;
                handle.type = 'button';
                handle.title = '우측 메뉴 열기';
                handle.setAttribute('aria-label', '우측 메뉴 열기');
                rightZone.appendChild(handle);
            }
            bindCmuEdgeHandle(handle, 'right');
        }
        else {
            rightZone?.remove?.();
        }
        syncCmuEdgeMenuOpenState();
    }
    let cmuStatBarMarkTimer = 0;
    let cachedCmuRoomStatBar = null;
    function markCmuRoomStatBarElement(el) {
        if (!(el instanceof HTMLElement) || isCmuEdgeOwnElement(el))
            return null;
        el.setAttribute('data-cmu-stat-bar', '1');
        el.setAttribute('data-cmu-room-stat-bar', '1');
        const carousel = el.matches?.('[aria-roledescription="carousel"]')
            ? el
            : el.querySelector?.('[aria-roledescription="carousel"]');
        if (carousel instanceof HTMLElement)
            carousel.setAttribute('data-cmu-stat-carousel', '1');
        return el;
    }
    function findCmuRoomStatBarFromTopBar() {
        const topBar = findLoreRoomTopBar();
        const group = topBar?.parentElement;
        if (!group) {
            cachedCmuRoomStatBar = null;
            return null;
        }
        if (cachedCmuRoomStatBar?.isConnected && cachedCmuRoomStatBar.parentElement === group) {
            return markCmuRoomStatBarElement(cachedCmuRoomStatBar);
        }
        cachedCmuRoomStatBar = null;
        for (const child of Array.from(group.children)) {
            if (!(child instanceof HTMLElement) || child === topBar || isCmuEdgeOwnElement(child))
                continue;
            const cls = String(child.className || '');
            const hasCarousel = !!child.querySelector?.('[aria-roledescription="carousel"]');
            const hasStatIndex = !!child.querySelector?.('[data-stat-index]');
            if (!hasCarousel && !hasStatIndex)
                continue;
            let score = 0;
            if (cls.includes('transition-transform'))
                score += 5;
            if (cls.includes('mt-12') || cls.includes('mt-['))
                score += 5;
            if (hasCarousel)
                score += 5;
            if (hasStatIndex)
                score += 4;
            let rect = null;
            try {
                rect = child.getBoundingClientRect();
            }
            catch (_) { }
            if (rect && rect.width >= 80 && rect.height >= 18 && rect.height <= 180)
                score += 3;
            if (score >= 8) {
                cachedCmuRoomStatBar = child;
                return markCmuRoomStatBarElement(child);
            }
        }
        const carousel = group.querySelector('[aria-roledescription="carousel"]');
        const fallback = carousel?.closest?.('div');
        if (fallback instanceof HTMLElement && fallback !== topBar && !isCmuEdgeOwnElement(fallback)) {
            cachedCmuRoomStatBar = fallback;
            return markCmuRoomStatBarElement(fallback);
        }
        return null;
    }
    function findCmuStatBarRootFromButton(button) {
        if (!(button instanceof HTMLElement))
            return null;
        let node = button;
        for (let depth = 0; node && depth < 7; depth += 1, node = node.parentElement) {
            if (!(node instanceof HTMLElement))
                break;
            if (isCmuEdgeOwnElement(node))
                return null;
            const count = node.querySelectorAll?.('[data-stat-index]')?.length || 0;
            const hasCarousel = !!node.querySelector?.('[aria-roledescription="carousel"]');
            if (count < 2 && !hasCarousel)
                continue;
            const rect = cmuEdgeRect(node) || (() => {
                try {
                    return node.getBoundingClientRect();
                }
                catch (_) {
                    return null;
                }
            })();
            if (!rect)
                continue;
            if (rect.width >= 80 && rect.height >= 18 && rect.height <= 180)
                return node;
        }
        return button;
    }
    function markCmuStatBar() {
        try {
            document.querySelectorAll('[data-cmu-stat-bar="1"], [data-cmu-room-stat-bar="1"], [data-cmu-stat-carousel="1"], [data-cmu-stat-button="1"]').forEach(el => {
                if (!(el instanceof HTMLElement))
                    return;
                if (!el.querySelector?.('[data-stat-index], [aria-roledescription="carousel"]') &&
                    !el.matches?.('[data-stat-index], [aria-roledescription="carousel"]')) {
                    el.removeAttribute('data-cmu-stat-bar');
                    el.removeAttribute('data-cmu-room-stat-bar');
                    el.removeAttribute('data-cmu-stat-carousel');
                    el.removeAttribute('data-cmu-stat-button');
                }
            });
            if (!shouldRun() || !isChatRoomPath() || !isMobileLike())
                return;
            findCmuRoomStatBarFromTopBar();
            const statNodes = Array.from(document.querySelectorAll('[data-stat-index]'));
            statNodes.forEach(node => {
                if (!(node instanceof HTMLElement))
                    return;
                if (isCmuEdgeOwnElement(node))
                    return;
                const button = node.closest('div[role="button"], button, [role="button"]');
                if (button instanceof HTMLElement)
                    button.setAttribute('data-cmu-stat-button', '1');
                const root = findCmuStatBarRootFromButton(button instanceof HTMLElement ? button : node);
                if (root instanceof HTMLElement) {
                    root.setAttribute('data-cmu-stat-bar', '1');
                    if (root.querySelector?.('[aria-roledescription="carousel"]'))
                        root.setAttribute('data-cmu-room-stat-bar', '1');
                }
            });
        }
        catch (_) { }
    }
    function scheduleCmuStatBarMark(delay = 40) {
        clearTimeout(cmuStatBarMarkTimer);
        cmuStatBarMarkTimer = window.setTimeout(markCmuStatBar, Math.max(0, Number(delay) || 0));
    }
    function renderFullscreenRow() {
        const supported = isCmuFullscreenSupported();
        return qSwitch('fullscreenButton', '전체화면 버튼 표시', supported ? '톱니 옆 ⛶/✕ 빠른 전환 버튼 표시' : '현재 브라우저/기기에서 Fullscreen API 미지원', { disabled: !supported, forceOffWhenDisabled: true });
    }
    function setCmuFullscreenToolbarIcon(btn) {
        if (!(btn instanceof HTMLButtonElement))
            return;
        const active = isCmuFullscreenActive();
        const icon = active ? '✕' : '⛶';
        btn.innerHTML = `<span class="cmu-fullscreen-icon" aria-hidden="true">${icon}</span>`;
        btn.title = active ? '전체화면 해제' : '전체화면 전환';
        btn.setAttribute('aria-label', active ? '전체화면 해제' : '전체화면 전환');
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    }
    function syncCmuFullscreenControls(root) {
        root = root || document;
        try {
            const active = isCmuFullscreenActive();
            root.querySelectorAll?.('[data-action="fullscreen-toggle"]').forEach(btn => {
                if (!(btn instanceof HTMLElement))
                    return;
                btn.classList.toggle('on', active);
                btn.setAttribute('aria-checked', active ? 'true' : 'false');
            });
            const toolbarBtn = document.getElementById(ID.fullscreenButton);
            if (toolbarBtn instanceof HTMLButtonElement)
                setCmuFullscreenToolbarIcon(toolbarBtn);
        }
        catch (_) { }
    }
    function toggleCmuFullscreen() {
        try {
            if (!isCmuFullscreenSupported()) {
                settings.fullscreenButton = false;
                saveSettings();
                ensureToolbarButton();
                syncCmuFullscreenControls();
                return;
            }
            const active = isCmuFullscreenActive();
            let result;
            if (!active) {
                const root = document.documentElement;
                const request = root.requestFullscreen || root.webkitRequestFullscreen;
                if (!request)
                    return;
                result = request.call(root);
            }
            else {
                const exit = document.exitFullscreen || document.webkitExitFullscreen;
                if (!exit)
                    return;
                result = exit.call(document);
            }
            syncCmuFullscreenControls();
            Promise.resolve(result).then(() => {
                syncCmuFullscreenControls();
            }).catch(err => {
                try {
                    console.warn(`${LOG} fullscreen toggle failed`, err);
                }
                catch (_) { }
                syncCmuFullscreenControls();
            });
        }
        catch (err) {
            try {
                console.warn(`${LOG} fullscreen toggle failed`, err);
            }
            catch (_) { }
            syncCmuFullscreenControls();
        }
    }
    function setSettingFromQ(key, value) {
        settings[key] = value;
        if (key === 'answerCost' && !settings.answerCost) {
            document.querySelectorAll('.cac-answer-cost').forEach(el => el.remove());
            document.querySelectorAll('.cmi-model-slot:empty').forEach(el => el.remove());
        }
        saveSettings();
        applyState();
        if (key === 'enabled')
            scheduleInject('setting-enabled');
        if (key === 'emptySendGuard')
            scheduleEmptySendGuardUiUpdate();
        if (key === 'inputCharacterCounter') {
            if (settings.inputCharacterCounter)
                scheduleCmuInputCounterSync();
            else
                cleanupCmuInputCounter();
        }
        if (key === 'autoHideHeader') {
            ensureTopRevealZone();
            markGlobalHeader();
        }
        if (key === 'pauseAnimatedThumbs')
            scheduleAnimatedThumbState();
        if (key === 'dashboard' || key === 'dashboardSidebar') {
            if (key === 'dashboardSidebar')
                refreshSideAvailability(true);
            ensureInlineBlocks();
            if (settings.dashboard)
                scheduleDashboardUpdate(true);
        }
        if (key === 'radiosonde' || key === 'radiosondeLatency') {
            ensureInlineBlocks();
            if (settings.radiosonde)
                scheduleRadiosondeRefresh(true);
        }
        if (key === 'badgeChars' || key === 'badgeTime' || key === 'modelIcon' || key === 'answerCost')
            scheduleBadgeScan();
        if (key === 'themeSkin' || key === 'themeDialogue' || key === 'themeThought' || key === 'themeItalic' || key === 'themeStrong' || key === 'themeCode' || key === 'themeMarkdown') {
            scheduleThemeDecorate(true);
            if (key === 'themeSkin')
                scheduleThemeDecorateBurst('theme-setting');
        }
        if (key === 'fullscreenButton') {
            if (settings.fullscreenButton && !isCmuFullscreenSupported()) {
                settings.fullscreenButton = false;
                saveSettings();
            }
            ensureToolbarButton();
            syncCmuFullscreenControls(document);
        }
        if (key === 'composerExpandButton') {
            if (!settings.composerExpandButton) {
                collapseComposerInput({ immediate: true, scrollToEnd: false });
                disconnectComposerExpandResizeObserver();
                COMPOSER_EXPAND.input = null;
                COMPOSER_EXPAND.target = null;
                removeComposerExpandButton();
            }
            else {
                ensureComposerExpandButton(findChatInput());
                scheduleComposerExpandSync();
            }
        }
        if (key === 'mobileLeftMenuButton' || key === 'mobileRightMenuButton' || key === 'mobileMenuSwipeZone') {
            ensureMobileEdgeMenuButtons();
            ensureCmuMenuSwipeZone();
            scheduleCmuEdgeMenuStateSync();
        }
        if (key === 'hideStatBar')
            scheduleCmuStatBarMark(0);
        if (key === 'logCapture') {
            if (!settings.logCapture) {
                cmuLogCaptureExitMode(true);
                cmuLogCaptureClosePreview(true);
                uninstallLogCaptureHandlers();
                removeLogCaptureToolbarButton();
            }
            else {
                installLogCaptureHandlers();
                ensureToolbarButton();
            }
        }
        if (String(key || '').startsWith('logCapture') && key !== 'logCapture') {
            ensureToolbarButton();
        }
        cmuMessageMenuSettingsChanged(key);
        cmuDraftSettingsChanged(key);
        applyNativeModelFilterCss();
        if (key === 'nativeModelFilter') {
            if (settings.nativeModelFilter)
                scheduleNmfScan();
            else
                nmfResetMenuVisibilityRuntime();
        }
        if (key === 'outputModelFilter') {
            omfScanOpenDialogs();
        }
    }
    function syncQToggleElement(el, value) {
        if (!el)
            return;
        el.classList.toggle('on', !!value);
        el.setAttribute('aria-checked', value ? 'true' : 'false');
        const groupId = el.dataset.group;
        if (groupId) {
            const root = el.closest('.qputil') || document;
            const group = root.querySelector(`#${CSS.escape(groupId)}`);
            if (group)
                group.classList.toggle('off', !value);
        }
    }
    const DASH_PART_LABELS = [
        ['turn', '턴수'],
        ['cumulative', '누적 사용'],
        ['cracker', '잔여'],
        ['deducted', '차감']
    ];
    const SIDE_PART_LABELS = [
        ['modelButton', '모델'], ['guideButton', '가이드'], ['profileButton', '프로필'], ['profileBoxButton', '프로필 박스'], ['noteButton', '노트'],
        ['outputButton', '출력'], ['summaryButton', '요약'], ['imageButton', '이미지'], ['archiveButton', '보관함'],
        ['roomBackgroundButton', '이미지 테마'], ['scenePainterButton', '모바일 삽화'], ['wishManagerButton', 'Wish RP'], ['sceneBlurButton', 'CSP 테마'],
        ['startButton', '시작'], ['loreButton', '로어'], ['translatorButton', '번역'], ['aiSummaryButton', 'AI 요약'], ['gameHudButton', '게임 HUD']
    ];
    const SIDE_PART_ICON_KEYS = Object.freeze({
        modelButton: 'model',
        guideButton: 'guide',
        profileButton: 'profile',
        profileBoxButton: 'profileBox',
        noteButton: 'note',
        outputButton: 'output',
        summaryButton: 'summary',
        imageButton: 'image',
        archiveButton: 'archive',
        roomBackgroundButton: 'roomBackground',
        scenePainterButton: 'scenePainter',
        wishManagerButton: 'wishManager',
        sceneBlurButton: 'sceneBlur',
        startButton: 'start',
        loreButton: 'lore',
        translatorButton: 'translator',
        aiSummaryButton: 'aiSummary',
        gameHudButton: 'gameHud',
    });
    function sidePartSettingIcon(key) {
        const icon = SIDE_ICON[SIDE_PART_ICON_KEYS[key]];
        if (!icon)
            return Q_CHECK_ICON;
        return String(icon).replace(/class="[^"]*chud-btn-icon[^"]*"/, 'class="ci cmu-side-setting-icon"');
    }
    function renderDashboardPartRows() {
        const visible = getDashVisible();
        return DASH_PART_LABELS.map(([key, label]) => qChip('q-dash-chip', key, label, visible[key] !== false)).join('');
    }
    function getAvailableSideEntries() {
        const available = refreshSideAvailability();
        return SIDE_PART_LABELS.filter(([key]) => available[key] !== false);
    }
    function hasMiniSidebarButtons() {
        return getAvailableSideEntries().length > 0;
    }
    function renderSidebarPartRows() {
        const visible = sideLoadVisible();
        return getAvailableSideEntries().map(([key, label]) =>
            qChip('q-side-chip', key, label, visible[key] !== false, false, sidePartSettingIcon(key))
        ).join('');
    }
    function loadRsVisibility() {
        try {
            const parsed = JSON.parse(localStorage.getItem(LS.rsVisibility) || '{}');
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
            delete parsed['yame-opus5'];
            delete parsed['yame-opus48'];
            return parsed;
        }
        catch (_) {
            return {};
        }
    }
    function saveRsVisibility(v) {
        try {
            localStorage.setItem(LS.rsVisibility, JSON.stringify(v || {}));
        }
        catch (_) { }
    }
    function setRsModelVisible(slug, value) {
        const visibility = loadRsVisibility();
        visibility[slug] = !!value;
        saveRsVisibility(visibility);
        syncRsModelSettings();
        renderRsLine();
        scheduleRadiosondeRefresh(true);
    }
    function getRsVisibleModels() {
        const models = RS.models.length ? RS.models : DEFAULT_RS_MODELS;
        const visibility = loadRsVisibility();
        return models.filter(m => visibility[m.slug] !== false);
    }
    const RS_GROUPS = [
        ['fable', 'Fable'], ['opus', 'Opus'], ['gpt', 'GPT'], ['gemini', 'Gemini'],
        ['sonnet', 'Sonnet'], ['haiku', 'Haiku'], ['other', '기타'],
    ];
    function rsModelGroup(model) {
        const text = `${model.slug} ${model.label || ''}`.toLowerCase();
        return RS_GROUPS.find(([id]) => id !== 'other' && text.includes(id))?.[0]
            || (text.includes('openai') ? 'gpt' : 'other');
    }
    function renderRsModelRows() {
        const models = RS.models.length ? RS.models : DEFAULT_RS_MODELS;
        const visibility = loadRsVisibility();
        const disabled = !settings.radiosonde;
        return RS_GROUPS.map(([id, label]) => {
            const members = models.filter(m => rsModelGroup(m) === id);
            if (!members.length)
                return '';
            const count = members.filter(m => visibility[m.slug] !== false).length;
            const anyOn = count > 0;
            const allOn = count === members.length;
            const partialOn = anyOn && !allOn;
            const groupSwitch = `<button type="button" class="sw ${anyOn ? 'on' : ''} ${partialOn ? 'partial' : ''} ${disabled ? 'disabled' : ''}" data-action="q-rs-group" data-key="${id}" data-cmu-dep="radiosonde" role="switch" aria-checked="${anyOn ? 'true' : 'false'}" aria-disabled="${disabled ? 'true' : 'false'}" ${disabled ? 'disabled' : ''} title="${anyOn ? '이 그룹 전체 끄기' : '이 그룹 전체 켜기'}"></button>`;
            const chips = members.map(m => qChip('q-rs-chip', escapeHtml(m.slug), escapeHtml(m.label || m.short || m.slug), visibility[m.slug] !== false, disabled)).join('');
            return `<div class="subrow cmu-rs-setting-group" data-rs-group="${id}"><div class="cmu-rs-setting-head"><div class="lbl cmu-rs-setting-title"><strong>${label}</strong><small>${count}/${members.length}개 표시</small></div>${groupSwitch}</div><div class="cmu-rs-setting-models" data-cmu-dep-box="radiosonde">${chips}</div></div>`;
        }).join('');
    }
    function syncRsModelSettings() {
        const root = document.getElementById('g-rs');
        if (!root)
            return;
        root.innerHTML = renderRsModelRows();
        const panel = document.getElementById(ID.panel);
        if (panel) {
            cmuIndexSettingsSearch(panel);
            cmuApplySettingsSearch(panel);
        }
    }
    function setRsGroupVisible(group) {
        const models = (RS.models.length ? RS.models : DEFAULT_RS_MODELS).filter(m => rsModelGroup(m) === group);
        if (!models.length) return;
        const visibility = loadRsVisibility();
        // 4.5.0.4.7: 그룹 안에서 하나라도 켜져 있으면 그룹 스위치도 ON으로 본다.
        // 따라서 부분 선택 상태에서 그룹 스위치를 누르면 전체 OFF, 모두 꺼져 있을 때 누르면 전체 ON.
        const enabled = !models.some(m => visibility[m.slug] !== false);
        for (const model of models) visibility[model.slug] = enabled;
        saveRsVisibility(visibility);
        syncRsModelSettings();
        renderRsLine();
        scheduleRadiosondeRefresh(true);
    }
    function cmuThemeUiModeForSettings() {
        try {
            const native = cmiNativeUiModeCached();
            if (native === 'chat' || native === 'novel')
                return native;
        }
        catch (_) { }
        try {
            const groups = Array.from(document.querySelectorAll('main [data-message-group-id]')).slice(0, 8);
            let novel = 0, chat = 0;
            for (const group of groups) {
                if (!(group instanceof HTMLElement))
                    continue;
                const md = group.querySelector('.wrtn-markdown, [class*="wrtn-markdown"], .markdown-body, .prose');
                if (!md)
                    continue;
                const bubble = md.closest('div[class*="break-all"]') || md.closest('div[class*="rounded"]') || md;
                isProbablyThemeNovelBubble(bubble) ? novel++ : chat++;
            }
            if (chat > novel && chat > 0)
                return 'chat';
            if (novel > 0 && novel >= chat)
                return 'novel';
        }
        catch (_) { }
        return '';
    }
    function cmuThemeShouldUseChatBorderlessOnly() {
        return cmuThemeUiModeForSettings() === 'chat';
    }
    function renderSettingsUiPage() {
        return qPage('ui', `
      <div class="sec">화면</div>
      ${qCard(`
        ${qSwitch('autoHideHeader', '상단바 접기', '에피소드 페이지에서만 작동')}
        ${qSwitch('wideView', '와이드뷰', '모바일 채팅 폭을 넓게 사용')}
        ${qSwitch('hideStatBar', '스텟창 숨기기', '모바일에서만 순정 스텟바를 숨김')}
        ${renderFullscreenRow()}
      `)}

      <div class="sec">가독성</div>
      ${qCard(`
        ${qStepper('fontScale', '글씨 크기', 80, 130, 1)}
        ${qStepper('imageScale', '이미지 크기', 50, 100, 1)}
        ${qSwitch('pauseAnimatedThumbs', '썸네일 움짤 정지', '목록의 움직이는 이미지를 정적 썸네일로 표시')}
      `)}

      <div class="sec">제스처 · 입력</div>
      ${qCard(`
        ${qSwitch('mobileMenuSwipeZone', '좌우 메뉴 스와이프 존', '입력창 위 투명 영역: → 채팅목록 · ← 우측 메뉴')}
        ${qSwitch('mobileLeftMenuButton', '좌측 메뉴 버튼', '모바일 왼쪽 손잡이로 순정 채팅 목록 열기')}
        ${qSwitch('mobileRightMenuButton', '우측 메뉴 버튼', '모바일 오른쪽 손잡이로 방 설정 패널 열기')}
        ${qSwitch('composerExpandButton', '입력창 펼치기 버튼', '스크롤이 생기면 입력창 오른쪽 위에 표시')}
        ${qSwitch('inputCharacterCounter', '입력 글자수 표시', '전송 버튼 위쪽 · 2,000자 경고')}
        ${qSwitch('emptySendGuard', '빈 메시지 전송 막기')}
      `)}

      <div class="sec">채팅창 임시 저장</div>
      ${qCard(qSwitch('draftAutoSave', '입력창 초안 자동 저장', '채팅방별 저장 · 빈 입력창에만 복구 · 전송 확인 후 삭제'))}

      <div class="sec">알림</div>
      ${qCard(qSwitch('hideEndingHint', '엔딩 힌트/알림 점 숨기기'))}
    `);
    }
    function renderSettingsMessagePage() {
        return qPage('message', `
      <div class="sec">메시지 길게 누르기</div>
      ${qCard(qSwitch('messageLongPressMenu', '길게 누르기 메뉴', '말풍선을 약 0.4초 누르면 메시지 메뉴 표시'))}

      <div class="sec">메뉴 항목</div>
      ${qCard(`
        ${qSwitch('messageLongPressEdit', '수정', '순정 수정 메뉴 표시', { dep: 'messageLongPressMenu' })}
        ${qSwitch('messageLongPressDelete', '삭제', '순정 삭제 메뉴 표시', { dep: 'messageLongPressMenu' })}
        ${qSwitch('messageLongPressBranch', '분기', '순정 분기 메뉴 표시', { dep: 'messageLongPressMenu' })}
        ${qSwitch('messageLongPressCopy', '복사', '메시지 원문 전체 복사', { dep: 'messageLongPressMenu' })}
        ${qSwitch('messageLongPressSelectCopy', '선택 복사', '원문을 큰 창으로 열어 범위 선택', { dep: 'messageLongPressMenu' })}
      `)}
    `);
    }
    function renderSettingsThemePage() {
        const banner = cmuThemeBannerText();
        return qPage('theme', `
      ${qCard(qDirectSwitch('themeSkin', Q_ICONS.theme, banner.title, banner.desc))}

      <div class="sec">본문 강조 효과</div>
      ${qCard(`
        ${qSwitch('themeDialogue', '대사 강조', '큰따옴표/「」/❝❞', { group: 'g-theme-fx', dep: 'themeSkin' })}
        ${qSwitch('themeThought', '생각 강조', '작은따옴표', { group: 'g-theme-fx', dep: 'themeSkin' })}
        ${qSwitch('themeItalic', '이탤릭 강조', '*기울임*', { group: 'g-theme-fx', dep: 'themeSkin' })}
        ${qSwitch('themeStrong', '굵게 강조', '**굵게**', { group: 'g-theme-fx', dep: 'themeSkin' })}
        ${qSwitch('themeCode', '코드블록 꾸미기', '코드 박스 배경/테두리', { group: 'g-theme-fx', dep: 'themeSkin' })}
        ${qSwitch('themeMarkdown', '마크다운 꾸미기', '인용문/링크 등 가벼운 장식', { group: 'g-theme-fx', dep: 'themeSkin' })}
      `)}
    `);
    }
    function renderSettingsRadiosondePage() {
        return qPage('radiosonde', `
      <div class="sec">표시</div>
      ${qCard(`
        ${qSwitch('radiosonde', '라존데 표시', '채팅창 삽입형 · 내부 자동 갱신')}
        ${qSwitch('radiosondeLatency', '응답속도 표시', '모델 뒤의 2.11s 같은 응답 시간', { dep: 'radiosonde' })}
      `)}

      <div class="sec">표시할 모델</div>
      ${qCard(`<div id="g-rs">${renderRsModelRows()}</div>`)}
    `);
    }
    function renderSettingsDashboardPage() {
        const sideRows = renderSidebarPartRows();
        const sideSection = hasMiniSidebarButtons()
            ? `
        <div class="sec">미니 사이드바</div>
        ${qCard(`
          ${qSwitch('dashboardSidebar', '미니사이드바 표시', '모델 · 가이드 · 노트 · 로어 · 모바일 삽화 · Wish RP · 게임 HUD', { group: 'g-side' })}
          ${qChipWrap('g-side', sideRows, !!settings.dashboardSidebar)}
        `)}`
            : '';
        return qPage('dashboard', `
      <div class="sec">정보바</div>
      ${qCard(`
        ${qSwitch('dashboard', '정보바 표시', '턴수 · 누적 사용 · 잔여 · 차감', { group: 'g-info' })}
        ${qChipWrap('g-info', renderDashboardPartRows(), !!settings.dashboard)}
      `)}
      ${sideSection}
    `);
    }
    function renderSettingsBadgePage() {
        const uiMode = cmuThemeUiModeForSettings();
        const modelIconNovel = uiMode === 'novel';
        const modelIconNote = modelIconNovel
            ? '생성 당시 확인된 모델만 · AI 답변마다 표시'
            : (uiMode === 'chat' ? '채팅형 UI에서는 자동 비활성화' : '소설형 UI에서만 사용');
        return qPage('badge', `
      <div class="sec">메시지 하단 표시</div>
      ${qCard(`
        ${qSwitch('badgeChars', '글자수 표시')}
        ${qSwitch('badgeTime', '생성 시간 표시')}
        ${qSwitch('modelIcon', '모델 아이콘', modelIconNote, { disabled: !modelIconNovel, forceOffWhenDisabled: true })}
        ${qSwitch('answerCost', '답변별 크래커', '설치 후 실제 측정분만 · 리롤 답변마다 표시')}
      `)}
    `);
    }
    function renderSettingsNativeModelPage() {
        const outputRows = renderOutputModelRows();
        const outputModelList = outputRows
            ? qChipWrap('g-omf', outputRows, !!settings.outputModelFilter)
            : `<div class="subrow"><div class="lbl">아직 감지된 모델 없음<div class="note">답변 길이 · 생각 조절 창을 한 번 열면 자동으로 등록돼요.</div></div></div>`;
        return qPage('nativemodel', `
      <div class="sec">순정 모델 메뉴</div>
      ${qCard(qSwitch('nativeModelFilter', '안 쓰는 모델 숨기기', '체크 해제한 모델은 순정 메뉴에서 숨김', { group: 'g-nmf' }))}

      <div class="sec">사용할 모델</div>
      ${qCard(qChipWrap('g-nmf', renderNativeModelRows(), !!settings.nativeModelFilter))}

      <div class="sec">답변 길이 · 생각 조절</div>
      ${qCard(`
        ${qSwitch('outputModelFilter', '표시할 모델 필터', '체크 해제한 모델만 숨김 · 새 모델은 자동 표시', { group: 'g-omf' })}
        ${outputModelList}
      `)}
    `);
    }

    function renderSettingsCapturePage() {
        return qPage('capture', `
      <div class="sec">기본</div>
      ${qCard(`
        ${qSwitch('logCapture', '로그 캡처', '끄면 버튼·선택 이벤트·미리보기·내보내기를 전부 비활성화')}
      `)}

      <div class="sec">출력</div>
      ${qCard(`
        ${qSwitch('logCaptureIncludeImages', '메시지 이미지 포함', '채팅에 포함된 이미지를 캡처 결과에도 포함', { dep: 'logCapture' })}
        ${qSwitch('logCaptureIncludeCodeBlocks', '코드블록 포함', '끄면 코드블록은 선택·미리보기·캡처 결과에서 제외', { dep: 'logCapture' })}
        ${qChoice('q-lc-webp', 'logCaptureWebpQuality', 'WebP 품질', [
            { value: '82', label: '보통' },
            { value: '90', label: '높음' },
            { value: '96', label: '최고' }
        ], String(settings.logCaptureWebpQuality || 90))}
      `)}

      <div class="sec">텍스트 정리</div>
      ${qCard(renderLogCaptureRuleRows())}
    `);
    }

    function renderSettingsBody() {
        return `
      <div class="cmu-search-empty" hidden>검색 결과가 없어요.<br>다른 말로 검색해 보세요.</div>

      ${renderSettingsUiPage()}
      ${renderSettingsMessagePage()}
      ${renderSettingsThemePage()}
      ${renderSettingsRadiosondePage()}
      ${renderSettingsDashboardPage()}
      ${renderSettingsBadgePage()}
      ${renderSettingsNativeModelPage()}
      ${renderSettingsCapturePage()}
    `;
    }
    function renderSettingsPanel() {
        const panel = ensureSettingsPanelSilent();
        if (!panel)
            return;
        const previousBody = panel.querySelector?.('.cmu-panel-body');
        const previousScrollTop = previousBody ? previousBody.scrollTop : 0;
        cmuSettingsTab = normalizeCmuSettingsTab(cmuSettingsTab);
        const showLabel = settings.settingsTabLabels !== false;
        if (String(cmuSettingsQuery || '').trim())
            cmuSettingsSearchOpen = true;
        const searchOpen = !!cmuSettingsSearchOpen;
        panel.innerHTML = `
      <div class="cmu-panel-grab" aria-hidden="true"></div>
      <div class="cmu-panel-head${searchOpen ? ' cmu-s-open' : ''}">
        <div class="cmu-panel-title">모바일 유틸 설정</div>
        ${renderCmuSearchBar()}
        <div class="cmu-panel-actions">
          <button class="cmu-panel-icon-btn" data-action="tab-label-toggle" type="button" title="${showLabel ? '탭 이름 숨기기' : '탭 이름 보이기'}" aria-label="탭 표시 전환">${showLabel ? CMU_TAB_LABEL_ICON : CMU_TAB_ICONONLY_ICON}</button>
          <button class="cmu-panel-icon-btn" data-action="api-open" type="button" title="API 키 보관함" aria-label="API 키 보관함">${CMU_KEY_ICON}</button>
          <button class="cmu-panel-icon-btn${searchOpen ? ' on' : ''}" data-action="search-toggle" type="button" title="설정 검색" aria-label="설정 검색" aria-expanded="${searchOpen ? 'true' : 'false'}">${CMU_SEARCH_ICON}</button>
          <button class="cmu-panel-close" data-action="close" type="button" aria-label="닫기">×</button>
        </div>
      </div>
      ${renderApiKeyPopover()}
      <div class="cmu-panel-nav">
        ${renderCmuTabBar()}
      </div>
      <div class="cmu-panel-body">
        <div class="cmu-menu-card qputil">
          ${renderSettingsBody()}
        </div>
      </div>`;
        cmuIndexSettingsSearch(panel);
        cmuApplySettingsSearch(panel);
        cmuPanelPlaceTabIndicator(panel, true);
        requestAnimationFrame(() => {
            const body = panel.querySelector('.cmu-panel-body');
            if (body)
                body.scrollTop = previousScrollTop;
            cmuPanelPlaceTabIndicator(panel, true);
        });
        const runPanelAction = (e, source = 'click', forcedTarget = null) => {
            let target = forcedTarget || e.target?.closest?.('[data-action]');
            if (!target && source === 'click') {
                const row = e.target?.closest?.('.subrow');
                if (row && !e.target?.closest?.('input, .chip, .step, button')) {
                    target = row.querySelector('.sw[data-action]');
                }
            }
            if (!target || !panel.contains(target))
                return false;
            const action = target.dataset.action;
            const key = target.dataset.key;
            if (target.disabled || target.getAttribute?.('aria-disabled') === 'true') {
                e.preventDefault?.();
                e.stopPropagation?.();
                return true;
            }
            if (source !== 'keydown') {
                e.preventDefault?.();
                e.stopPropagation?.();
            }
            if (action === 'close') {
                toggleSettingsPanel(false);
                return true;
            }
            if (action === 'api-open') {
                const pop = panel.querySelector('[data-cmu-key-popover]');
                const nextOpen = !pop?.classList.contains('cmu-open');
                if (pop) {
                    pop.classList.toggle('cmu-open', nextOpen);
                    pop.inert = !nextOpen;
                }
                target.classList.toggle('on', nextOpen);
                return true;
            }
            if (action === 'api-copy') {
                const provider = target.dataset.provider || '';
                const input = provider ? panel.querySelector(`[data-cmu-api-provider="${CSS.escape(provider)}"]`) : null;
                const value = String(input?.value ?? getApiKeyValue(provider) ?? '');
                saveApiKey(provider, value);
                if (!value.trim()) {
                    showToast('복사할 API 키가 비어 있음');
                    return true;
                }
                copyTextToClipboard(value).then(ok => showToast(ok ? 'API 키 복사됨' : '복사 실패'));
                return true;
            }
            if (action === 'q-tab') {
                const prevIndex = CMU_TABS.findIndex(t => t.id === cmuSettingsTab);
                cmuSettingsTab = normalizeCmuSettingsTab(target.dataset.tab);
                const nextIndex = CMU_TABS.findIndex(t => t.id === cmuSettingsTab);
                panel.querySelectorAll('.cmu-tab').forEach(b => {
                    const on = b.dataset.tab === cmuSettingsTab;
                    b.classList.toggle('on', on);
                    b.setAttribute('aria-selected', on ? 'true' : 'false');
                });
                cmuPanelShowPage(panel, cmuSettingsTab, Math.sign(nextIndex - prevIndex));
                cmuPanelPlaceTabIndicator(panel, false);
                const body = panel.querySelector('.cmu-panel-body');
                if (body)
                    body.scrollTop = 0;
                return true;
            }
            if (action === 'tab-label-toggle') {
                settings.settingsTabLabels = settings.settingsTabLabels === false;
                saveSettings();
                const showLabelNow = settings.settingsTabLabels !== false;
                panel.querySelector('.cmu-tabs')?.classList.toggle('icon-only', !showLabelNow);
                target.innerHTML = showLabelNow ? CMU_TAB_LABEL_ICON : CMU_TAB_ICONONLY_ICON;
                target.title = showLabelNow ? '탭 이름 숨기기' : '탭 이름 보이기';
                clearTimeout(CMU_PANEL_ANIM.indTimer);
                CMU_PANEL_ANIM.indTimer = setTimeout(() => {
                    CMU_PANEL_ANIM.indTimer = 0;
                    cmuPanelPlaceTabIndicator(panel, false);
                }, 300);
                return true;
            }
            if (action === 'search-toggle') {
                cmuSetSettingsSearchOpen(panel, !cmuSettingsSearchOpen, true);
                return true;
            }
            if (action === 'search-clear') {
                cmuSettingsQuery = '';
                const input = panel.querySelector('#cmu-settings-search');
                if (input)
                    input.value = '';
                panel.querySelector('.cmu-search')?.classList.remove('has');
                cmuApplySettingsSearch(panel);
                return true;
            }
            if (action === 'fullscreen-toggle') {
                toggleCmuFullscreen();
                syncCmuFullscreenControls(panel);
                return true;
            }
            if (action === 'q-toggle' && key) {
                if (isCmuThemeSettingKey(key) && isCmuExternalThemeActive()) {
                    showToast(`${getCmuExternalThemeLabel()} 사용 중 · 합본 테마 자동 대기`);
                    return true;
                }
                const next = !target.classList.contains('on');
                setSettingFromQ(key, next);
                syncQToggleElement(target, next);
                cmuSyncPanelDeps(panel);
                cmuSyncTabDots(panel);
                return true;
            }
            if (action === 'theme-switch' && key) {
                if (isCmuExternalThemeActive()) {
                    renderSettingsPanel();
                    showToast(`${getCmuExternalThemeLabel()} 사용 중 · 합본 테마 자동 대기`);
                    return true;
                }
                const next = !target.classList.contains('on');
                setSettingFromQ(key, next);
                syncQToggleElement(target, next);
                cmuSyncThemeBanner(panel);
                cmuSyncPanelDeps(panel);
                cmuSyncTabDots(panel);
                return true;
            }
            if (action === 'q-dash-chip' && key) {
                const visible = getDashVisible();
                const next = !target.classList.contains('ck');
                visible[key] = next;
                target.classList.toggle('ck', next);
                dashSaveObj(DASH.visibleKey, visible);
                syncDashMenu();
                DASH.lastHtml = '';
                renderDashboardParts();
                return true;
            }
            if (action === 'q-side-chip' && key) {
                const visible = sideLoadVisible();
                const next = !target.classList.contains('ck');
                visible[key] = next;
                target.classList.toggle('ck', next);
                sideSaveVisible();
                applySideVisible();
                syncSideMenu();
                return true;
            }
            if (action === 'q-rs-group' && key) {
                if (settings.radiosonde) setRsGroupVisible(key);
                return true;
            }
            if (action === 'q-rs-chip' && key) {
                if (!settings.radiosonde) return true;
                const next = !target.classList.contains('ck');
                target.classList.toggle('ck', next);
                setRsModelVisible(key, next);
                return true;
            }
            if (action === 'q-nmf-chip' && key) {
                const vis = nmfLoadVis();
                const next = !target.classList.contains('ck');
                vis[key] = next;
                target.classList.toggle('ck', next);
                nmfSaveVis(vis);
                applyNativeModelFilterCss();
                nmfScanNativeModelMenu();
                return true;
            }
            if (action === 'q-omf-chip' && key) {
                let name = '';
                try { name = decodeURIComponent(key); } catch (_) { name = key; }
                if (!name) return true;
                const hidden = new Set(omfLoadHidden());
                const next = !target.classList.contains('ck');
                if (next) hidden.delete(name);
                else hidden.add(name);
                target.classList.toggle('ck', next);
                omfSaveHidden(Array.from(hidden));
                omfScanOpenDialogs();
                return true;
            }

            if (action === 'q-lc-webp' && key) {
                const value = Number(String(key).split('::').slice(1).join('::') || 90) || 90;
                settings.logCaptureWebpQuality = value;
                saveSettings();
                target.parentElement?.querySelectorAll?.('[data-action="q-lc-webp"]').forEach(el => el.classList.toggle('ck', el === target));
                return true;
            }
            if (action === 'lc-rule-add') {
                clearTimeout(cmuLcRuleSaveTimer);
                cmuLcRuleSaveTimer = 0;
                saveSettings();
                const rules = normalizeLogCaptureRules(settings.logCaptureRules);
                rules.push({ from: '', to: '' });
                settings.logCaptureRules = rules;
                renderSettingsPanel();
                requestAnimationFrame(() => {
                    const fields = panel.querySelectorAll('[data-lc-rule-field="from"]');
                    fields[fields.length - 1]?.focus?.();
                });
                return true;
            }
            if (action === 'lc-rule-delete') {
                const index = Number(target.dataset.index ?? -1);
                const rules = normalizeLogCaptureRules(settings.logCaptureRules);
                if (index >= 0 && index < rules.length) {
                    rules.splice(index, 1);
                    settings.logCaptureRules = rules;
                    saveSettings();
                    renderSettingsPanel();
                }
                return true;
            }
            if (action === 'q-step' && key) {
                const wrap = target.closest('.step');
                const min = Number(wrap?.dataset.min ?? 0);
                const max = Number(wrap?.dataset.max ?? 100);
                const suffix = wrap?.dataset.suffix ?? '%';
                const delta = Number(target.dataset.delta || 0);
                const base = Number(settings[key]);
                const next = clamp((Number.isFinite(base) ? base : 0) + delta, min, max);
                settings[key] = next;
                saveSettings();
                applyState();
                const val = wrap?.querySelector(`[data-step-value="${CSS.escape(key)}"]`);
                if (val) {
                    val.classList.remove('cmu-up', 'cmu-dn');
                    val.innerHTML = `<span>${next}${escapeHtml(suffix)}</span>`;
                    void val.offsetWidth;
                    if (next !== base)
                        val.classList.add(delta > 0 ? 'cmu-up' : 'cmu-dn');
                }
                return true;
            }
            return false;
        };
        CMU_PANEL_INPUT.press = null;
        clearTimeout(CMU_PANEL_INPUT.fallbackTimer);
        CMU_PANEL_INPUT.fallbackTimer = 0;
        const panelActionNode = (evtTarget) => {
            const node = evtTarget?.closest?.('[data-action]');
            return node && panel.contains(node) ? node : null;
        };
        const panelActionSig = (evtTarget) => {
            const node = panelActionNode(evtTarget);
            if (!node)
                return '';
            return `${node.dataset.action || ''}|${node.dataset.key || ''}|${node.dataset.index || ''}|${node.dataset.tab || ''}`;
        };
        panel.onpointerdown = (e) => {
            cmuPanelDragStart(e, panel);
            if (e.isPrimary === false || (e.button !== undefined && e.button !== 0)) {
                CMU_PANEL_INPUT.press = null;
                return;
            }
            CMU_PANEL_INPUT.lastActionAt = 0;
            CMU_PANEL_INPUT.lastActionSig = '';
            const node = panelActionNode(e.target);
            CMU_PANEL_INPUT.press = node
                ? { id: e.pointerId, x: e.clientX, y: e.clientY, at: Date.now(), node }
                : null;
        };
        panel.onpointercancel = () => {
            CMU_PANEL_INPUT.press = null;
            clearTimeout(CMU_PANEL_INPUT.fallbackTimer);
            CMU_PANEL_INPUT.fallbackTimer = 0;
        };
        panel.onpointerup = (e) => {
            const press = CMU_PANEL_INPUT.press;
            CMU_PANEL_INPUT.press = null;
            if (!press || (press.id && e.pointerId && press.id !== e.pointerId))
                return;
            const node = panelActionNode(e.target);
            if (!node || node !== press.node)
                return;
            if (Math.hypot(e.clientX - press.x, e.clientY - press.y) > 14)
                return;
            if (Date.now() - press.at > 700)
                return;
            const sig = panelActionSig(node);
            if (!sig)
                return;
            clearTimeout(CMU_PANEL_INPUT.fallbackTimer);
            CMU_PANEL_INPUT.fallbackTimer = window.setTimeout(() => {
                CMU_PANEL_INPUT.fallbackTimer = 0;
                if (!panel.isConnected || !panel.contains(node))
                    return;
                CMU_PANEL_INPUT.lastActionAt = Date.now();
                CMU_PANEL_INPUT.lastActionSig = sig;
                runPanelAction({
                    target: node,
                    preventDefault() {},
                    stopPropagation() {},
                }, 'pointer-fallback', node);
            }, 220);
        };
        panel.onclick = (e) => {
            const sig = panelActionSig(e.target);
            clearTimeout(CMU_PANEL_INPUT.fallbackTimer);
            CMU_PANEL_INPUT.fallbackTimer = 0;
            const now = Date.now();
            if (sig && CMU_PANEL_INPUT.lastActionSig === sig && now - CMU_PANEL_INPUT.lastActionAt < 700) {
                e.preventDefault?.();
                e.stopPropagation?.();
                return;
            }
            runPanelAction(e, 'click');
        };
        panel.oninput = (e) => {
            const search = e.target?.closest?.('#cmu-settings-search');
            if (search) {
                cmuSettingsQuery = search.value || '';
                panel.querySelector('.cmu-search')?.classList.toggle('has', !!cmuSettingsQuery.trim());
                cmuApplySettingsSearch(panel);
                return;
            }
            const ruleInput = e.target?.closest?.('[data-lc-rule-field]');
            if (ruleInput && panel.contains(ruleInput)) {
                const index = Number(ruleInput.dataset.lcRuleIndex ?? -1);
                const field = ruleInput.dataset.lcRuleField === 'to' ? 'to' : 'from';
                const rules = normalizeLogCaptureRules(settings.logCaptureRules);
                if (index >= 0 && index < rules.length) {
                    rules[index][field] = ruleInput.value || '';
                    settings.logCaptureRules = rules;
                    clearTimeout(cmuLcRuleSaveTimer);
                    cmuLcRuleSaveTimer = window.setTimeout(saveSettings, 300);
                }
                return;
            }
            const input = e.target?.closest?.('[data-cmu-api-provider]');
            if (!input || !panel.contains(input))
                return;
            saveApiKey(input.dataset.cmuApiProvider, input.value);
        };
        panel.onchange = panel.oninput;
        panel.onkeydown = (e) => {
            const target = e.target.closest('[data-action]');
            if (!target)
                return;
            if (e.key !== 'Enter' && e.key !== ' ')
                return;
            e.preventDefault();
            e.stopPropagation();
            runPanelAction(e, 'keydown');
        };
    }
    function ensureSettingsPanelSilent() {
        let panel = document.getElementById(ID.panel);
        if (!panel && document.body) {
            panel = document.createElement('div');
            panel.id = ID.panel;
            document.body.appendChild(panel);
        }
        return panel;
    }
    function showToast(text) {
        let toast = document.getElementById(ID.toast);
        if (!toast) {
            toast = document.createElement('div');
            toast.id = ID.toast;
            document.body.appendChild(toast);
        }
        toast.textContent = text;
        toast.classList.add('show');
        clearTimeout(showToast._timer);
        showToast._timer = setTimeout(() => toast.classList.remove('show'), 1400);
    }
    function findGlobalHeader() {
        const direct = document.getElementById('wrtn-custom-global-header') || document.querySelector('[data-crack-ui-header="1"], [data-cmu-global-header="1"]');
        if (direct instanceof HTMLElement)
            return direct;
        const byHeight = document.querySelector('div[height="56"][width="100%"]');
        if (byHeight instanceof HTMLElement)
            return byHeight;
        const found = Array.from(document.querySelectorAll('div, header')).find(el => {
            if (!(el instanceof HTMLElement))
                return false;
            if (el.closest?.(`#${ID.panel}, #${ID.toolbarWrapper}`))
                return false;
            const rect = el.getBoundingClientRect();
            if (rect.top > 90 || rect.bottom < 0)
                return false;
            if (rect.height < 44 || rect.height > 78)
                return false;
            if (rect.width < Math.min(320, window.innerWidth * .75))
                return false;
            const hasHome = !!el.querySelector('a[href="/"], a[href^="/"]');
            const hasSearch = !!el.querySelector('input[placeholder*="검색"], input[type="search"]');
            const hasButtons = el.querySelectorAll('button').length >= 2;
            const cls = String(el.className || '');
            const looksHeader = /justify-between|items-center|border-b|bg-bg_screen|h-12|z-\[/.test(cls);
            return (hasSearch && hasButtons) || (hasHome && hasButtons && looksHeader);
        });
        return found || null;
    }
    function restoreGlobalHeaderShellLayout() {
        const shell = CMU_HEADER_SHELL.element;
        if (shell instanceof HTMLElement) {
            try {
                if (shell.getAttribute('data-cmu-global-header-shell') === '1') {
                    if (CMU_HEADER_SHELL.paddingTop)
                        shell.style.setProperty('padding-top', CMU_HEADER_SHELL.paddingTop, CMU_HEADER_SHELL.paddingTopPriority || '');
                    else
                        shell.style.removeProperty('padding-top');
                    shell.removeAttribute('data-cmu-global-header-shell');
                }
            }
            catch (_) { }
        }
        CMU_HEADER_SHELL.element = null;
        CMU_HEADER_SHELL.paddingTop = '';
        CMU_HEADER_SHELL.paddingTopPriority = '';
    }
    function findGlobalHeaderShell(header) {
        if (!(header instanceof HTMLElement))
            return null;
        const shell = header.parentElement;
        if (!(shell instanceof HTMLElement) || shell === document.body || shell === document.documentElement)
            return null;
        const cls = String(shell.className || '');
        const hasKnownPaddingClass = cls.includes('pt-[56px]');
        let computedPadding = 0;
        try {
            computedPadding = parseFloat(getComputedStyle(shell).paddingTop) || 0;
        }
        catch (_) { }
        const looksViewportShell = /(?:^|\s)(?:h-screen|min-h-screen|h-dvh|min-h-dvh)(?:\s|$)/.test(cls) ||
            !!shell.querySelector?.(':scope > .relative.flex.h-full, :scope > main');
        if (!looksViewportShell)
            return null;
        if (!hasKnownPaddingClass && !(computedPadding >= 48 && computedPadding <= 64))
            return null;
        return shell;
    }
    function syncGlobalHeaderShellLayout(header = findGlobalHeader()) {
        const shouldCollapse = shouldRun() && settings.autoHideHeader && isEpisodePath() &&
            document.documentElement.classList.contains('cmu-auto-hide') && !cmuUserNoteGuardActive();
        if (!shouldCollapse) {
            restoreGlobalHeaderShellLayout();
            return null;
        }
        const shell = findGlobalHeaderShell(header);
        if (!(shell instanceof HTMLElement)) {
            restoreGlobalHeaderShellLayout();
            return null;
        }
        if (CMU_HEADER_SHELL.element !== shell) {
            restoreGlobalHeaderShellLayout();
            CMU_HEADER_SHELL.element = shell;
            CMU_HEADER_SHELL.paddingTop = shell.style.getPropertyValue('padding-top');
            CMU_HEADER_SHELL.paddingTopPriority = shell.style.getPropertyPriority('padding-top');
        }
        shell.setAttribute('data-cmu-global-header-shell', '1');
        shell.style.setProperty('padding-top', '0px', 'important');
        return shell;
    }
    function markGlobalHeader() {
        const header = findGlobalHeader();
        if (header && !header.closest(`#${ID.panel}`))
            header.setAttribute('data-cmu-global-header', '1');
        syncGlobalHeaderShellLayout(header);
    }
    function ensureTopRevealZone() {
        let zone = document.getElementById(ID.topZone);
        if (!zone) {
            zone = document.createElement('div');
            zone.id = ID.topZone;
            zone.addEventListener('mouseenter', () => {
                if (isMobileLike())
                    return;
                revealHeaderTemporarily();
            });
            zone.addEventListener('pointerdown', () => {
                if (!isMobileLike())
                    revealHeaderTemporarily();
            });
            (document.body || document.documentElement).appendChild(zone);
        }
        let handle = document.getElementById(ID.topHandle);
        if (!handle) {
            handle = document.createElement('div');
            handle.id = ID.topHandle;
            handle.setAttribute('role', 'button');
            handle.setAttribute('aria-label', '상단바 열기');
            zone.appendChild(handle);
            const open = (e) => {
                if (cmuUserNoteGuardActive())
                    return;
                if (e) {
                    e.preventDefault?.();
                    e.stopPropagation?.();
                }
                revealHeaderTemporarily();
            };
            handle.addEventListener('pointerdown', open, { passive: false });
            handle.addEventListener('touchstart', open, { passive: false });
            handle.addEventListener('click', open, { passive: false });
        }
        else if (handle.parentElement !== zone) {
            zone.appendChild(handle);
        }
    }
    function revealHeaderTemporarily() {
        if (!shouldRun() || !settings.autoHideHeader || !isEpisodePath())
            return;
        document.documentElement.classList.add('cmu-header-reveal');
        clearTimeout(headerHideTimer);
        headerHideTimer = setTimeout(() => {
            if (!document.getElementById(ID.panel)?.classList.contains('open')) {
                document.documentElement.classList.remove('cmu-header-reveal');
            }
        }, 2600);
    }
    function getInputText(input = findChatInput()) {
        if (!(input instanceof Element))
            return '';
        let raw = '';
        if (input.tagName === 'TEXTAREA' || input.tagName === 'INPUT') {
            raw = String(input.value || '');
        }
        else {
            raw = String(input.textContent || '');
        }
        return raw
            .replace(/\r\n?/g, '\n')
            .replace(/[\u200B\uFEFF]/g, '')
            .replace(/\u00a0/g, ' ')
            .trim();
    }
    function isEmptyComposer(input = findChatInput()) {
        return input instanceof Element && getInputText(input) === '';
    }
    function findChatInputInsideComposerRoot(root) {
        if (!(root instanceof Element))
            return null;
        const selectors = [
            '.__chat_input_textarea',
            'textarea[placeholder*="메시지"], textarea[placeholder*="Message"], textarea[placeholder*="message"]',
            '[contenteditable="true"].ProseMirror',
            '[contenteditable="true"].tiptap',
            '[contenteditable="true"][data-placeholder*="메시지"]',
            '[contenteditable="true"][aria-label*="메시지"]',
        ];
        for (const selector of selectors) {
            const candidates = Array.from(root.querySelectorAll(selector));
            for (let i = candidates.length - 1; i >= 0; i -= 1) {
                const candidate = candidates[i];
                if (isLikelyChatInputCandidate(candidate, { strict: true }))
                    return candidate;
            }
        }
        return null;
    }
    function findChatInputForSendButton(btn) {
        if (!(btn instanceof HTMLElement))
            return null;
        const form = btn.closest('form');
        const fromForm = findChatInputInsideComposerRoot(form);
        if (fromForm)
            return fromForm;
        let node = btn.parentElement;
        for (let depth = 0; node && depth < 9; depth += 1, node = node.parentElement) {
            if (node === document.body || node === document.documentElement)
                break;
            const found = findChatInputInsideComposerRoot(node);
            if (found)
                return found;
        }
        const global = findChatInput();
        return global && isButtonInsideChatComposer(btn) ? global : null;
    }
    function clearEmptySendGuardButton(btn) {
        if (!(btn instanceof HTMLElement))
            return;
        btn.classList.remove('crack-ui-empty-send-blocked');
        btn.dataset.crackUiEmptySendGuard = settings.emptySendGuard ? '1' : '0';
        btn.dataset.crackUiEmptySendBlocked = '0';
    }
    function updateEmptySendGuardState() {
        const btn = getSendButton();
        let input = null;
        if (btn) {
            if (cmuCachedSendPairBtn === btn && cmuCachedSendPairInput instanceof Element && cmuCachedSendPairInput.isConnected) {
                input = cmuCachedSendPairInput;
            }
            else {
                input = findChatInputForSendButton(btn);
                cmuCachedSendPairBtn = btn;
                cmuCachedSendPairInput = input;
            }
        }
        const blocked = !!(btn &&
            input &&
            shouldRun() &&
            settings.emptySendGuard &&
            isChatRoomPath() &&
            isEmptyComposer(input));
        document.querySelectorAll('.crack-ui-empty-send-blocked, button[data-crack-ui-empty-send-blocked="1"]').forEach(oldBtn => {
            if (oldBtn !== btn || !blocked)
                clearEmptySendGuardButton(oldBtn);
        });
        if (!btn)
            return;
        btn.dataset.crackUiEmptySendGuard = settings.emptySendGuard ? '1' : '0';
        btn.dataset.crackUiEmptySendBlocked = blocked ? '1' : '0';
        if (blocked) {
            btn.classList.add('crack-ui-empty-send-blocked');
        }
        else {
            clearEmptySendGuardButton(btn);
        }
    }
    function scheduleEmptySendGuardUiUpdate() {
        if (!scheduleEmptySendGuardUiUpdate._raf) {
            scheduleEmptySendGuardUiUpdate._raf = requestAnimationFrame(() => {
                scheduleEmptySendGuardUiUpdate._raf = 0;
                updateEmptySendGuardState();
            });
        }
        clearTimeout(scheduleEmptySendGuardUiUpdate._settleTimer);
        scheduleEmptySendGuardUiUpdate._settleTimer = setTimeout(updateEmptySendGuardState, 90);
    }
    function isSendButton(btn) {
        if (!(btn instanceof HTMLButtonElement))
            return false;
        if (btn.closest(`#${ID.panel}, [role="dialog"], [data-radix-popper-content-wrapper], [data-radix-dialog-content], [data-radix-dialog-content-wrapper]`))
            return false;
        if (!findChatInputForSendButton(btn))
            return false;
        const label = `${btn.getAttribute('aria-label') || ''} ${btn.title || ''}`;
        if (/전송|보내기|send/i.test(label))
            return true;
        return !!btn.querySelector('path[d^="M18.77 11.13"]');
    }
    function bindEmptySendGuard() {
        if (document.documentElement.dataset.cmuSendGuardBound === '1')
            return;
        document.documentElement.dataset.cmuSendGuardBound = '1';
        cmuListen(document, 'click', (e) => {
            if (!shouldRun() || !settings.emptySendGuard)
                return;
            const btn = e.target.closest?.('button');
            if (!isSendButton(btn))
                return;
            const input = findChatInputForSendButton(btn);
            if (!input || !isEmptyComposer(input))
                return;
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            updateEmptySendGuardState();
        }, true);
        cmuListen(document, 'keydown', (e) => {
            if (!shouldRun() || !settings.emptySendGuard)
                return;
            if (e.isComposing || e.keyCode === 229)
                return;
            const input = e.target.closest?.('textarea, [contenteditable="true"]');
            if (!input || !isChatInputElement(input))
                return;
            if (e.key !== 'Enter' || e.shiftKey || e.ctrlKey || e.altKey || e.metaKey)
                return;
            if (!isEmptyComposer(input))
                return;
            e.preventDefault();
            e.stopPropagation();
            updateEmptySendGuardState();
        }, true);
        cmuListen(document, 'beforeinput', (e) => {
            const input = e.target.closest?.('textarea, [contenteditable="true"]');
            if (!input || !isChatInputElement(input))
                return;
            scheduleEmptySendGuardUiUpdate();
        }, true);
        cmuListen(document, 'compositionstart', (e) => {
            if (!isChatInputElement(e.target))
                return;
            scheduleEmptySendGuardUiUpdate();
        }, true);
        cmuListen(document, 'compositionend', (e) => {
            if (!isChatInputElement(e.target))
                return;
            scheduleEmptySendGuardUiUpdate();
        }, true);
        cmuListen(document, 'input', (e) => {
            if (isChatInputElement(e.target))
                scheduleEmptySendGuardUiUpdate();
        }, true);
        cmuListen(document, 'keyup', (e) => {
            if (isChatInputElement(e.target))
                scheduleEmptySendGuardUiUpdate();
        }, true);
        cmuListen(document, 'focusin', (e) => {
            if (isChatInputElement(e.target))
                scheduleEmptySendGuardUiUpdate();
        }, true);
        cmuListen(document, 'focusout', (e) => {
            if (isChatInputElement(e.target))
                scheduleEmptySendGuardUiUpdate();
        }, true);
    }
    const CMU_DRAFT_PREFIX = 'cmu_chat_draft_v2:';
    const CMU_DRAFT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
    const CMU_DRAFT_SAVE_DELAY_MS = 420;
    const CMU_DRAFT_RESTORE_DELAYS = Object.freeze([80, 240, 620, 1200, 2200]);
    const CMU_DRAFT_VERIFY_DELAYS = Object.freeze([280, 700, 1400, 2600, 4400, 7000]);
    const CMU_DRAFT = {
        roomId: '',
        input: null,
        saveTimer: 0,
        syncTimer: 0,
        restoreToken: 0,
        restoredInput: null,
        restoreAttemptedInput: null,
        restoreBusy: false,
        restoring: false,
        composing: false,
        pending: null,
        verifyToken: 0,
        lastSavedHash: '',
        installed: false,
    };
    function cmuDraftEnabled() {
        return shouldRun() && !!settings.draftAutoSave && isChatRoomPath();
    }
    function cmuDraftRoomId() {
        return getChatId() || '';
    }
    function cmuDraftStorageKey(roomId) {
        return CMU_DRAFT_PREFIX + encodeURIComponent(String(roomId || ''));
    }
    function cmuDraftNormalizeText(text) {
        return String(text || '')
            .replace(/\r\n?/g, '\n')
            .replace(/\u00a0/g, ' ')
            .replace(/[\u200B\uFEFF]/g, '');
    }
    function cmuDraftIsBlank(text) {
        return cmuDraftNormalizeText(text).replace(/\s/g, '') === '';
    }
    function cmuDraftHash(text) {
        const value = cmuDraftNormalizeText(text);
        let hash = 2166136261;
        for (let i = 0; i < value.length; i += 1) {
            hash ^= value.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }
        return (hash >>> 0).toString(36);
    }
    function cmuDraftNodeText(node) {
        if (!node)
            return '';
        if (node.nodeType === Node.TEXT_NODE)
            return node.nodeValue || '';
        if (node.nodeType !== Node.ELEMENT_NODE)
            return '';
        const el = node;
        if (el.tagName === 'BR')
            return el.classList?.contains('ProseMirror-trailingBreak') ? '' : '\n';
        let out = '';
        el.childNodes.forEach(child => { out += cmuDraftNodeText(child); });
        return out;
    }
    function cmuDraftReadText(input = CMU_DRAFT.input || findChatInput()) {
        if (!(input instanceof Element))
            return '';
        if (input.tagName === 'TEXTAREA' || input.tagName === 'INPUT') {
            return cmuDraftNormalizeText(input.value || '');
        }
        const blocks = Array.from(input.children || []).filter(el => /^(P|DIV|LI|BLOCKQUOTE)$/.test(el.tagName));
        let text;
        if (blocks.length)
            text = blocks.map(cmuDraftNodeText).join('\n');
        else
            text = cmuDraftNodeText(input);
        text = cmuDraftNormalizeText(text);
        if (text.endsWith('\n'))
            text = text.slice(0, -1);
        return text;
    }
    function cmuDraftParse(raw) {
        if (!raw)
            return null;
        try {
            const draft = JSON.parse(raw);
            if (!draft || typeof draft.text !== 'string')
                return null;
            return draft;
        }
        catch (_) {
            return null;
        }
    }
    function cmuDraftLoad(roomId) {
        if (!roomId)
            return null;
        let draft = null;
        try {
            draft = cmuDraftParse(localStorage.getItem(cmuDraftStorageKey(roomId)));
        }
        catch (_) { }
        if (!draft)
            return null;
        if (!draft.updatedAt || Date.now() - Number(draft.updatedAt) > CMU_DRAFT_MAX_AGE_MS) {
            cmuDraftDelete(roomId, 'expired');
            return null;
        }
        return draft;
    }
    function cmuDraftDelete(roomId, reason = 'delete') {
        if (!roomId)
            return;
        try {
            localStorage.removeItem(cmuDraftStorageKey(roomId));
        }
        catch (_) { }
        if (CMU_DRAFT.roomId === roomId)
            CMU_DRAFT.lastSavedHash = '';
        try {
            console.debug(`${LOG} draft deleted`, reason, roomId);
        }
        catch (_) { }
    }
    function cmuDraftCleanupOld() {
        const cutoff = Date.now() - CMU_DRAFT_MAX_AGE_MS;
        try {
            for (let i = localStorage.length - 1; i >= 0; i -= 1) {
                const key = localStorage.key(i);
                if (!key || !key.startsWith(CMU_DRAFT_PREFIX))
                    continue;
                const draft = cmuDraftParse(localStorage.getItem(key));
                if (!draft || !draft.updatedAt || Number(draft.updatedAt) < cutoff)
                    localStorage.removeItem(key);
            }
        }
        catch (_) { }
    }
    function cmuDraftVisibleMessageIds() {
        return Array.from(document.querySelectorAll('[data-message-group-id]'))
            .map(el => String(el.getAttribute('data-message-group-id') || ''))
            .filter(Boolean)
            .slice(-160);
    }
    function cmuDraftWrite(roomId, text, reason = 'input', pending = null) {
        if (!roomId || cmuDraftIsBlank(text))
            return false;
        const normalized = cmuDraftNormalizeText(text);
        const textHash = cmuDraftHash(normalized);
        const pendingSend = !!pending;
        const current = cmuDraftLoad(roomId);
        if (current && current.textHash === textHash && !!current.pendingSend === pendingSend) {
            CMU_DRAFT.lastSavedHash = textHash;
            return true;
        }
        const payload = {
            v: 2,
            roomId,
            text: normalized,
            textHash,
            updatedAt: Date.now(),
            href: location.href,
            reason,
            pendingSend,
        };
        if (pending) {
            payload.pendingAt = pending.at;
            payload.baselineIds = Array.isArray(pending.baselineIds) ? pending.baselineIds.slice(-160) : [];
        }
        try {
            localStorage.setItem(cmuDraftStorageKey(roomId), JSON.stringify(payload));
            CMU_DRAFT.lastSavedHash = textHash;
            return true;
        }
        catch (err) {
            try {
                console.warn(`${LOG} draft save failed`, err);
            }
            catch (_) { }
            return false;
        }
    }
    function cmuDraftSaveNow(reason = 'auto', options = {}) {
        const roomId = options.roomId || CMU_DRAFT.roomId || cmuDraftRoomId();
        const input = options.input || CMU_DRAFT.input || findChatInput();
        if (!settings.draftAutoSave || !roomId || !(input instanceof Element) || !isChatInputElement(input))
            return false;
        const text = options.text == null ? cmuDraftReadText(input) : cmuDraftNormalizeText(options.text);
        if (cmuDraftIsBlank(text)) {
            if (!options.keepBlank && !CMU_DRAFT.pending)
                cmuDraftDelete(roomId, `blank:${reason}`);
            return false;
        }
        return cmuDraftWrite(roomId, text, reason, options.pending || null);
    }
    function cmuDraftScheduleSave(reason = 'input') {
        if (!cmuDraftEnabled() || CMU_DRAFT.composing || CMU_DRAFT.restoring)
            return;
        clearTimeout(CMU_DRAFT.saveTimer);
        CMU_DRAFT.saveTimer = setTimeout(() => cmuDraftSaveNow(reason), CMU_DRAFT_SAVE_DELAY_MS);
    }
    function cmuDraftFlush(reason = 'flush') {
        clearTimeout(CMU_DRAFT.saveTimer);
        if (!settings.draftAutoSave || !CMU_DRAFT.roomId || !(CMU_DRAFT.input instanceof Element) || !isChatInputElement(CMU_DRAFT.input))
            return;
        const text = cmuDraftReadText(CMU_DRAFT.input);
        if (!cmuDraftIsBlank(text)) {
            cmuDraftWrite(CMU_DRAFT.roomId, text, reason, CMU_DRAFT.pending);
        }
        else if (!CMU_DRAFT.pending) {
            cmuDraftDelete(CMU_DRAFT.roomId, `blank:${reason}`);
        }
    }
    function cmuDraftRestoreDomFallback(input, text) {
        input.replaceChildren();
        const fragment = document.createDocumentFragment();
        cmuDraftNormalizeText(text).split('\n').forEach(line => {
            const p = document.createElement('p');
            if (line)
                p.textContent = line;
            else
                p.appendChild(document.createElement('br'));
            fragment.appendChild(p);
        });
        input.appendChild(fragment);
    }
    function cmuDraftDispatchInput(input, text) {
        try {
            input.dispatchEvent(new InputEvent('input', {
                bubbles: true,
                cancelable: false,
                inputType: 'insertFromPaste',
                data: text,
            }));
        }
        catch (_) {
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }
    async function cmuDraftApplyText(input, text) {
        if (!(input instanceof Element) || !input.isConnected || !isChatInputElement(input) || !cmuDraftIsBlank(cmuDraftReadText(input)))
            return false;
        if (cmuUserNoteGuardActive())
            return false;
        const normalized = cmuDraftNormalizeText(text);
        const wantedHash = cmuDraftHash(normalized);
        const previousActive = document.activeElement;
        CMU_DRAFT.restoring = true;
        try {
            if (input.tagName === 'TEXTAREA' || input.tagName === 'INPUT') {
                const proto = input.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
                const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
                if (setter)
                    setter.call(input, normalized);
                else
                    input.value = normalized;
                cmuDraftDispatchInput(input, normalized);
            }
            else {
                let inserted = false;
                try {
                    if (cmuUserNoteGuardActive())
                        return false;
                    input.focus({ preventScroll: true });
                    const range = document.createRange();
                    range.selectNodeContents(input);
                    const selection = window.getSelection();
                    selection.removeAllRanges();
                    selection.addRange(range);
                    inserted = !!document.execCommand?.('insertText', false, normalized);
                }
                catch (_) { }
                if (!inserted || cmuDraftIsBlank(cmuDraftReadText(input))) {
                    cmuDraftRestoreDomFallback(input, normalized);
                    cmuDraftDispatchInput(input, normalized);
                }
            }
            await new Promise(resolve => setTimeout(resolve, 80));
            if (!input.isConnected || cmuDraftHash(cmuDraftReadText(input)) !== wantedHash)
                return false;
            await new Promise(resolve => setTimeout(resolve, 180));
            if (!input.isConnected || cmuDraftHash(cmuDraftReadText(input)) !== wantedHash)
                return false;
            if (cmuUserNoteGuardActive())
                return false;
            try {
                if (input.tagName === 'TEXTAREA' || input.tagName === 'INPUT') {
                    const len = input.value.length;
                    input.setSelectionRange?.(len, len);
                }
                else {
                    const range = document.createRange();
                    range.selectNodeContents(input);
                    range.collapse(false);
                    const selection = window.getSelection();
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
            }
            catch (_) { }
            return true;
        }
        finally {
            const userNoteOpen = cmuUserNoteGuardActive();
            if (!userNoteOpen && previousActive instanceof HTMLElement && previousActive !== input && previousActive.isConnected) {
                try {
                    previousActive.focus({ preventScroll: true });
                }
                catch (_) { }
            }
            else if (!userNoteOpen && previousActive !== input && input instanceof HTMLElement) {
                try {
                    input.blur();
                }
                catch (_) { }
            }
            setTimeout(() => { CMU_DRAFT.restoring = false; }, 120);
        }
    }
    function cmuDraftMessageTimeMs(msg) {
        const values = [msg?.createdAt, msg?.created_at, msg?.timestamp, msg?.sentAt, msg?.message?.createdAt];
        for (const value of values) {
            if (!value)
                continue;
            const time = new Date(value).getTime();
            if (Number.isFinite(time))
                return time;
        }
        const id = rawMessageIdOf(msg);
        const objectDate = objectIdToDate(id);
        return objectDate ? objectDate.getTime() : 0;
    }
    async function cmuDraftIsPendingConfirmed(pending) {
        if (!pending?.roomId || !pending?.textHash)
            return false;
        const page = await fetchRawMessagePage(pending.roomId, '');
        const rows = Array.isArray(page?.arr) ? page.arr.slice(0, 60) : [];
        const baseline = new Set(pending.baselineIds || []);
        const minTime = Number(pending.at || 0) - 8000;
        const maxTime = Date.now() + 60000;
        return rows.some(msg => {
            if (!isRawUserMessage(msg))
                return false;
            const content = messageContentOf(msg);
            if (cmuDraftHash(content) !== pending.textHash)
                return false;
            const id = rawMessageIdOf(msg);
            if (id && baseline.has(id))
                return false;
            const time = cmuDraftMessageTimeMs(msg);
            if (time)
                return time >= minTime && time <= maxTime;
            return !!id && !baseline.has(id);
        });
    }
    function cmuDraftClearPending(reason = 'clear') {
        CMU_DRAFT.pending = null;
        CMU_DRAFT.verifyToken += 1;
        try {
            console.debug(`${LOG} draft pending cleared`, reason);
        }
        catch (_) { }
    }
    function cmuDraftVerifyPending(pending, attempt = 0, onDone = null) {
        if (!pending || CMU_DRAFT.pending !== pending)
            return;
        const token = CMU_DRAFT.verifyToken;
        const delay = CMU_DRAFT_VERIFY_DELAYS[Math.min(attempt, CMU_DRAFT_VERIFY_DELAYS.length - 1)];
        setTimeout(async () => {
            if (token !== CMU_DRAFT.verifyToken || CMU_DRAFT.pending !== pending)
                return;
            let confirmed = false;
            try {
                confirmed = await cmuDraftIsPendingConfirmed(pending);
            }
            catch (_) { }
            if (token !== CMU_DRAFT.verifyToken || CMU_DRAFT.pending !== pending)
                return;
            if (confirmed) {
                cmuDraftDelete(pending.roomId, 'send-confirmed');
                cmuDraftClearPending('send-confirmed');
                onDone?.(true);
                return;
            }
            if (attempt + 1 < CMU_DRAFT_VERIFY_DELAYS.length) {
                cmuDraftVerifyPending(pending, attempt + 1, onDone);
                return;
            }
            const currentInput = CMU_DRAFT.roomId === pending.roomId ? CMU_DRAFT.input : null;
            const currentText = currentInput instanceof Element ? cmuDraftReadText(currentInput) : '';
            if (!cmuDraftIsBlank(currentText)) {
                cmuDraftWrite(pending.roomId, currentText, 'send-unconfirmed-with-text', null);
                cmuDraftClearPending('send-unconfirmed-with-text');
            }
            onDone?.(false);
        }, delay);
    }
    function cmuDraftStartPossibleSend(reason, input) {
        if (!cmuDraftEnabled() || CMU_DRAFT.restoring || !(input instanceof Element) || !isChatInputElement(input))
            return;
        const text = cmuDraftReadText(input);
        if (cmuDraftIsBlank(text))
            return;
        const pending = {
            roomId: CMU_DRAFT.roomId || cmuDraftRoomId(),
            text,
            textHash: cmuDraftHash(text),
            at: Date.now(),
            baselineIds: cmuDraftVisibleMessageIds(),
            sawComposerEmpty: false,
            reason,
        };
        if (!pending.roomId)
            return;
        CMU_DRAFT.pending = pending;
        CMU_DRAFT.verifyToken += 1;
        cmuDraftWrite(pending.roomId, text, `before-send:${reason}`, pending);
        cmuDraftVerifyPending(pending);
    }
    async function cmuDraftResolveStoredPending(draft, roomId, input, token) {
        const pending = {
            roomId,
            text: draft.text,
            textHash: draft.textHash || cmuDraftHash(draft.text),
            at: Number(draft.pendingAt || draft.updatedAt || Date.now()),
            baselineIds: Array.isArray(draft.baselineIds) ? draft.baselineIds : [],
            reason: 'restore-pending',
        };
        let confirmed = false;
        for (const wait of [0, 650]) {
            if (wait)
                await new Promise(resolve => setTimeout(resolve, wait));
            if (token !== CMU_DRAFT.restoreToken || CMU_DRAFT.roomId !== roomId || CMU_DRAFT.input !== input)
                return null;
            try {
                confirmed = await cmuDraftIsPendingConfirmed(pending);
                if (confirmed)
                    break;
            }
            catch (_) { }
        }
        if (token !== CMU_DRAFT.restoreToken || CMU_DRAFT.roomId !== roomId || CMU_DRAFT.input !== input)
            return null;
        if (confirmed) {
            cmuDraftDelete(roomId, 'stored-send-confirmed');
            return null;
        }
        cmuDraftWrite(roomId, draft.text, 'pending-unconfirmed-restore', null);
        return { ...draft, pendingSend: false };
    }
    async function cmuDraftTryRestore(token) {
        if (CMU_DRAFT.restoreBusy)
            return false;
        if (token !== CMU_DRAFT.restoreToken || !cmuDraftEnabled())
            return false;
        if (cmuUserNoteGuardActive())
            return false;
        CMU_DRAFT.restoreBusy = true;
        try {
            const roomId = CMU_DRAFT.roomId;
            const input = CMU_DRAFT.input;
            if (!roomId || !(input instanceof Element) || !input.isConnected || !isChatInputElement(input))
                return false;
            if (CMU_DRAFT.restoredInput === input)
                return true;
            if (!cmuDraftIsBlank(cmuDraftReadText(input))) {
                CMU_DRAFT.restoreAttemptedInput = input;
                return false;
            }
            let draft = cmuDraftLoad(roomId);
            if (!draft || cmuDraftIsBlank(draft.text)) {
                CMU_DRAFT.restoreAttemptedInput = input;
                return false;
            }
            if (draft.pendingSend) {
                draft = await cmuDraftResolveStoredPending(draft, roomId, input, token);
                if (!draft)
                    return true;
            }
            if (token !== CMU_DRAFT.restoreToken || !cmuDraftIsBlank(cmuDraftReadText(input)))
                return false;
            if (cmuUserNoteGuardActive())
                return false;
            const ok = await cmuDraftApplyText(input, draft.text);
            if (ok && token === CMU_DRAFT.restoreToken) {
                CMU_DRAFT.restoredInput = input;
                CMU_DRAFT.restoreAttemptedInput = input;
                CMU_DRAFT.lastSavedHash = draft.textHash || cmuDraftHash(draft.text);
                scheduleEmptySendGuardUiUpdate();
                return true;
            }
            return false;
        }
        finally {
            CMU_DRAFT.restoreBusy = false;
        }
    }
    function cmuDraftScheduleRestore() {
        if (CMU_DRAFT.restoreAttemptedInput === CMU_DRAFT.input)
            return;
        CMU_DRAFT.restoreToken += 1;
        const token = CMU_DRAFT.restoreToken;
        CMU_DRAFT_RESTORE_DELAYS.forEach((delay, index) => {
            setTimeout(async () => {
                if (token !== CMU_DRAFT.restoreToken || CMU_DRAFT.restoredInput === CMU_DRAFT.input)
                    return;
                const ok = await cmuDraftTryRestore(token);
                if (ok || index === CMU_DRAFT_RESTORE_DELAYS.length - 1)
                    return;
            }, delay);
        });
    }
    function cmuDraftSync() {
        clearTimeout(CMU_DRAFT.syncTimer);
        CMU_DRAFT.syncTimer = setTimeout(() => {
            const newRoomId = cmuDraftRoomId();
            if (CMU_DRAFT.roomId !== newRoomId) {
                cmuDraftFlush('route-change');
                cmuDraftClearPending('route-change');
                CMU_DRAFT.roomId = newRoomId;
                CMU_DRAFT.input = null;
                CMU_DRAFT.restoredInput = null;
                CMU_DRAFT.restoreAttemptedInput = null;
                CMU_DRAFT.restoreToken += 1;
                CMU_DRAFT.lastSavedHash = '';
            }
            if (!cmuDraftEnabled())
                return;
            const input = findChatInput();
            if (!(input instanceof Element))
                return;
            if (CMU_DRAFT.input !== input) {
                CMU_DRAFT.input = input;
                CMU_DRAFT.restoredInput = null;
                CMU_DRAFT.restoreAttemptedInput = null;
                cmuDraftScheduleRestore();
            }
            else if (!CMU_DRAFT.restoredInput && CMU_DRAFT.restoreAttemptedInput !== input) {
                cmuDraftScheduleRestore();
            }
        }, 40);
    }
    function cmuDraftSettingsChanged(key) {
        if (key !== 'draftAutoSave')
            return;
        if (!settings.draftAutoSave) {
            clearTimeout(CMU_DRAFT.saveTimer);
            CMU_DRAFT.restoreToken += 1;
            cmuDraftClearPending('disabled');
            return;
        }
        CMU_DRAFT.restoreAttemptedInput = null;
        cmuDraftSync();
    }
    function cmuDraftInstall() {
        if (CMU_DRAFT.installed)
            return;
        CMU_DRAFT.installed = true;
        cmuDraftCleanupOld();
        cmuListen(document, 'compositionstart', e => {
            if (isChatInputElement(e.target))
                CMU_DRAFT.composing = true;
        }, true);
        cmuListen(document, 'compositionend', e => {
            if (!isChatInputElement(e.target))
                return;
            CMU_DRAFT.composing = false;
            CMU_DRAFT.input = getEditableTarget(e.target);
            cmuDraftScheduleSave('composition-end');
        }, true);
        cmuListen(document, 'input', e => {
            const input = getEditableTarget(e.target);
            if (!(input instanceof Element) || !isChatInputElement(input))
                return;
            CMU_DRAFT.input = input;
            CMU_DRAFT.restoreAttemptedInput = input;
            if (!settings.draftAutoSave || CMU_DRAFT.restoring || CMU_DRAFT.composing)
                return;
            const text = cmuDraftReadText(input);
            if (CMU_DRAFT.pending) {
                if (cmuDraftIsBlank(text)) {
                    CMU_DRAFT.pending.sawComposerEmpty = true;
                    return;
                }
                if (CMU_DRAFT.pending.sawComposerEmpty || cmuDraftHash(text) !== CMU_DRAFT.pending.textHash) {
                    cmuDraftClearPending('edited-after-send');
                }
            }
            if (cmuDraftIsBlank(text)) {
                clearTimeout(CMU_DRAFT.saveTimer);
                if (!CMU_DRAFT.pending)
                    cmuDraftDelete(CMU_DRAFT.roomId, 'input-cleared');
            }
            else {
                cmuDraftScheduleSave('input');
            }
        }, true);
        cmuListen(document, 'keydown', e => {
            if (e.isComposing || e.keyCode === 229 || e.key !== 'Enter' || e.shiftKey || e.ctrlKey || e.altKey || e.metaKey)
                return;
            const input = getEditableTarget(e.target);
            if (input instanceof Element && isChatInputElement(input))
                cmuDraftStartPossibleSend('enter', input);
        }, true);
        cmuRegisterGlobalGesture('draft-pointerdown', signal => {
            cmuGestureListen(signal, document, 'pointerdown', e => {
                if (isCmuProtectedEditorTarget(e.target))
                    return;
                const target = e.target instanceof Element ? e.target : null;
                if (!target)
                    return;
                const link = target.closest('a[href]');
                if (link) {
                    try {
                        const url = new URL(link.href, location.href);
                        const nextId = getChatIdFromPath(url.pathname || '');
                        if (nextId && nextId !== CMU_DRAFT.roomId)
                            cmuDraftFlush('route-pointerdown');
                    }
                    catch (_) { }
                }
                const btn = target.closest('button');
                if (!isSendButton(btn))
                    return;
                const input = findChatInputForSendButton(btn);
                if (input)
                    cmuDraftStartPossibleSend('button', input);
            }, true);
        });
        cmuListen(document, 'submit', e => {
            const root = e.target instanceof Element ? e.target : null;
            const input = findChatInputInsideComposerRoot(root) || findChatInput();
            if (input)
                cmuDraftStartPossibleSend('submit', input);
        }, true);
        cmuListen(window, 'pagehide', () => cmuDraftFlush('pagehide'), true);
        cmuListen(window, 'beforeunload', () => cmuDraftFlush('beforeunload'), true);
        cmuListen(document, 'visibilitychange', () => {
            if (document.visibilityState === 'hidden')
                cmuDraftFlush('visibility-hidden');
            else
                cmuDraftSync();
        }, true);
        cmuListen(document, 'focusin', e => {
            if (isChatInputElement(e.target))
                cmuDraftSync();
        }, true);
        cmuDraftSync();
    }
    function findComposerShell(input = findChatInput()) {
        if (!input)
            return null;
        if (input === cmuCachedChatInput && cmuCachedComposerShell?.isConnected && cmuCachedComposerShell.contains(input))
            return cmuCachedComposerShell;
        const shell = input.closest('form') ||
            input.closest('div.flex.flex-col.rounded-lg.border, div.rounded-lg.border.bg-background') ||
            input.parentElement;
        if (input === cmuCachedChatInput && shell instanceof Element)
            cmuCachedComposerShell = shell;
        return shell;
    }
    function ensurePositioned(el) {
        if (!el)
            return;
        try {
            if (getComputedStyle(el).position === 'static')
                el.style.position = 'relative';
        }
        catch (_) {
            el.style.position = 'relative';
        }
    }
    function ensureInlineBlocks(input = findChatInput()) {
        if (!shouldRun() || !input)
            return;
        const shell = findComposerShell(input);
        if (!shell)
            return;
        ensurePositioned(shell);
        const useDashboardInfo = !!settings.dashboard;
        const useDashboardSidebar = !!settings.dashboardSidebar && hasMiniSidebarButtons();
        if (useDashboardSidebar)
            ensureDashboardSidebar(shell, input);
        else
            removeDashboardSidebar();
        if (useDashboardInfo)
            ensureDashboard(shell, input);
        else {
            document.getElementById(ID.dashboard)?.remove();
            document.getElementById('chud-info-menu')?.remove();
        }
        if (useDashboardInfo || useDashboardSidebar)
            applyDashboardLayout(shell, input);
        else
            resetDashboardLayout(input);
        if (settings.radiosonde)
            ensureRadiosonde();
        else {
            document.getElementById('igx-live-popup')?.remove();
            clearRsInlineHost();
        }
    }
    const DASH = {
        detailKey: 'chud_info_detail_parts',
        visibleKey: 'chud_info_visible_parts',
        cumPrefix: 'chud_cum_v3_',
        claimedHistory: 'chud_claimed_history_v1',
        tabId: 'chud_tab_id_v1',
        lastDiffPrefix: 'chud_last_diff_v2_',
        roomStatsPrefix: 'chud_room_stats_v2_',
        detail: null,
        visible: null,
        el: null,
        textSpan: null,
        menu: null,
        settingsBtn: null,
        lastHtml: '',
        activeSession: null,
        updateSeq: 0,
        state: { chatId: null, logs: null, balance: null, cumulative: 0, lastDiff: 0, cumBusy: false },
    };
    const DASH_CRACKER_PATH = "M21.17 12.01c.52-.59.83-1.36.83-2.21s-.31-1.62-.83-2.21l.17-.21q0-.01.02-.02l.14-.21q0-.02.03-.05.06-.1.1-.2l.05-.08.09-.2q.01-.05.04-.11l.06-.18q0-.08.04-.14.01-.07.04-.16l.03-.19q0-.06.02-.13v-.33a3.37 3.37 0 0 0-3.36-3.37l-.33.01q-.06 0-.12.02-.1 0-.2.03-.07 0-.15.04l-.14.04-.18.06-.11.04-.2.09-.07.04-.2.11q-.03 0-.05.03l-.21.14-.02.02-.21.17a3.4 3.4 0 0 0-4.42 0 3.3 3.3 0 0 0-2.21-.83c-.85 0-1.62.31-2.21.83l-.21-.17-.02-.02-.21-.14q-.02 0-.05-.03l-.2-.11-.08-.04-.2-.09-.11-.04-.18-.06-.14-.04-.16-.04-.2-.03-.12-.02-.33-.01a3.37 3.37 0 0 0-3.34 3.82q0 .1.03.19 0 .07.04.16 0 .08.04.14l.06.18q0 .05.04.11.03.1.09.19l.04.08.1.2q.01.02.04.05l.16.23q.07.1.17.21a3.3 3.3 0 0 0-.83 2.21c0 .85.3 1.62.83 2.21a3.3 3.3 0 0 0-.83 2.21c0 .85.3 1.62.83 2.21l-.17.21-.02.02-.14.21q0 .02-.03.05l-.11.2-.04.08-.1.2-.03.11-.06.18-.04.14-.04.16-.03.19-.02.13-.01.33A3.4 3.4 0 0 0 3.02 21c.6.61 1.45.99 2.38.99l.33-.01q.06 0 .12-.02.1 0 .19-.03.07 0 .16-.04l.14-.04.18-.06.1-.04.2-.09.08-.04.2-.11q.03 0 .05-.03l.2-.14.03-.02.2-.17a3.4 3.4 0 0 0 4.43 0 3.32 3.32 0 0 0 4.42 0 3 3 0 0 0 .44.33q.03 0 .05.03l.2.11.08.04.2.09.10.04.19.06.14.04.16.04.19.03.13.02.33.01c.92 0 1.75-.37 2.36-.97l.02-.02c.6-.61.99-1.45.99-2.38l-.01-.33q0-.06-.02-.12 0-.1-.03-.19 0-.07-.04-.16l-.04-.14-.06-.18-.04-.11-.1-.19-.03-.08-.11-.2q0-.02-.03-.05l-.14-.21-.02-.02-.17-.21c.52-.59.83-1.36.83-2.21s-.31-1.62-.83-2.21M7.5 13.5 6 12l1.5-1.5L9 12zM12 6l1.5 1.5L12 9l-1.5-1.5zm0 12-1.5-1.5L12 15l1.5 1.5zm4.5-4.5L15 12l1.5-1.5L18 12z";
    const DASH_ICON = {
        clock: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="chud-small-icon"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
        cracker: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" class="chud-cracker-icon"><path fill="currentColor" d="${DASH_CRACKER_PATH}"></path></svg>`,
    };
    DASH_ICON.bittenCracker = DASH_ICON.cracker;
    const DASH_SIDE_DEFAULT_VISIBLE = {
        modelButton: true,
        guideButton: true,
        profileButton: true,
        profileBoxButton: true,
        noteButton: true,
        outputButton: true,
        summaryButton: true,
        imageButton: true,
        archiveButton: true,
        externalArchiveButton: false,
        roomBackgroundButton: true,
        scenePainterButton: true,
        wishManagerButton: true,
        sceneBlurButton: true,
        startButton: true,
        loreButton: true,
        translatorButton: true,
        aiSummaryButton: true,
        gameHudButton: true,
    };
    const DASH_SIDE = {
        el: null,
        content: null,
        menu: null,
        settingsBtn: null,
        visible: null,
        available: null,
        btns: {},
    };
    // 외부 바로가기 3종 중 SPA 이동 중 DOM이 잠깐 사라질 수 있는 연동은 한 번 감지하면 유지한다.
    const CMU_INTEGRATION_SEEN = {
        wishManager: false,
        profileBox: false,
    };
    const COMPACT_MODEL = {
        menu: null,
        nativeShell: null,
        nativeButton: null,
        anchor: null,
        seq: 0,
        outsideHandler: null,
        keyHandler: null,
        resizeHandler: null,
        revealTimer: 0,
        closeTimer: 0,
        opening: false,
        toggleLockUntil: 0,
    };
    CMU_RESOURCES.cleanups.push(() => closeCompactModelPicker({ closeNative: true }));
    function sideLoadVisible() {
        if (DASH_SIDE.visible)
            return DASH_SIDE.visible;
        try {
            const saved = JSON.parse(localStorage.getItem(LS.sidebarVisible) || '{}');
            if (saved && typeof saved === 'object' && !Array.isArray(saved) &&
                !Object.prototype.hasOwnProperty.call(saved, 'wishManagerButton') &&
                Object.prototype.hasOwnProperty.call(saved, 'rpManagerButton')) {
                saved.wishManagerButton = saved.rpManagerButton;
            }
            DASH_SIDE.visible = { ...DASH_SIDE_DEFAULT_VISIBLE, ...(saved || {}) };
        }
        catch (_) {
            DASH_SIDE.visible = { ...DASH_SIDE_DEFAULT_VISIBLE };
        }
        return DASH_SIDE.visible;
    }
    function sideSaveVisible() {
        try {
            localStorage.setItem(LS.sidebarVisible, JSON.stringify(sideLoadVisible()));
        }
        catch (_) { }
    }
    const SIDE_ICON = {
        model: '<svg class="chud-btn-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 3.5 6.5v11L12 22l8.5-4.5v-11L12 2Zm0 2.2 5.9 3.1L12 10.4 6.1 7.3 12 4.2ZM5.5 9l5.5 2.9v7.2l-5.5-2.9V9Zm13 0v7.2L13 19.1v-7.2L18.5 9Z"/></svg>',
        guide: '<svg class="chud-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z"/></svg>',
        profile: '<svg class="chud-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 22c1.8-4 4.4-6 8-6s6.2 2 8 6"/></svg>',
        profileBox: '<svg class="chud-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2.25"/><path d="M5.8 16c.55-2.05 1.65-3.1 3.2-3.1s2.65 1.05 3.2 3.1"/><path d="M15 8h3"/><path d="M15 12h3"/><path d="M15 16h2"/></svg>',
        note: '<svg class="chud-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16v16H4z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
        output: '<svg class="chud-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M4 12h10M4 17h16"/></svg>',
        summary: '<svg class="chud-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 5h14v14H5z"/><path d="M8 9h8M8 13h5"/></svg>',
        image: '<svg class="chud-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8" cy="10" r="2"/><path d="M21 16l-5-5L5 19"/></svg>',
        archive: '<svg class="chud-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7h18v13H3z"/><path d="M3 7l2-4h14l2 4"/><path d="M10 12h4"/></svg>',
        external: '<svg class="chud-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 3h7v7"/><path d="M10 14 21 3"/><path d="M21 14v7H3V3h7"/></svg>',
        roomBackground: '<svg class="chud-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="8" cy="9" r="1.5"/><path d="m4.5 17 4.2-4.2 3.1 3.1 2.2-2.2 5.5 5.3"/></svg>',
        sceneBlur: '<svg class="chud-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8.5V6a2 2 0 0 1 2-2h5"/><path d="M19 13v5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-4.5"/><path d="m6 17 3.2-3.2 2.4 2.4 1.7-1.7 3.7 3.7"/><path d="m17 3 .65 1.85L19.5 5.5l-1.85.65L17 8l-.65-1.85-1.85-.65 1.85-.65L17 3Z"/><path d="m21 8 .38 1.12 1.12.38-1.12.38L21 11l-.38-1.12-1.12-.38 1.12-.38L21 8Z"/></svg>',
        start: '<svg class="chud-btn-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
        lore: '<svg class="chud-btn-icon chud-lore-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2 4 6v12l8 4 8-4V6l-8-4Z"/><path d="M8 9h8M8 13h5"/></svg>',
        translator: '<svg class="chud-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 5h10M9 5c0 5-2 8-5 10"/><path d="M6 10c1 2 3 4 6 5"/><path d="M14 19l4-9 4 9M15.5 16h5"/></svg>',
        aiSummary: '<svg class="chud-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3 4 7l8 4 8-4-8-4Z"/><path d="M4 12l8 4 8-4"/><path d="M4 17l8 4 8-4"/></svg>',
        gameHud: '<svg class="chud-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7.2 7.6h9.6c2.15 0 3.62 1.42 4.12 4l.7 3.62c.36 1.88-.54 3.18-1.9 3.18-.8 0-1.5-.38-2.08-1.06l-1.24-1.44H7.6l-1.24 1.44c-.58.68-1.28 1.06-2.08 1.06-1.36 0-2.26-1.3-1.9-3.18l.7-3.62c.5-2.58 1.97-4 4.12-4z"/><path d="M7.2 10.2v3.6M5.4 12h3.6"/><circle cx="16.25" cy="10.9" r=".82" fill="currentColor" stroke="none"/><circle cx="18.2" cy="13.05" r=".82" fill="currentColor" stroke="none"/></svg>',
        scenePainter: '<svg class="chud-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 4.2 19.8 9.3"/><path d="m13.5 5.4 5.1 5.1-8.35 8.35-5.95 1.2 1.2-5.95z"/><path d="m5.5 14.1 4.4 4.4"/><path d="M15.8 3.1c.74-.74 1.94-.74 2.68 0l2.42 2.42c.74.74.74 1.94 0 2.68l-2.3 2.3-5.1-5.1z"/></svg>',
        wishManager: '<svg class="chud-btn-icon chud-wish-heart-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21.35 10.55 20.03C5.4 15.36 2 12.27 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.77-3.4 6.86-8.55 11.54L12 21.35Z"/></svg>',
    };
    function isOwnElement(el) {
        return !!el?.closest?.(`#${ID.panel}, #${ID.toolbarWrapper}, #chud-infobar, #chud-sidebar, #chud-info-menu, #chud-side-menu, #igx-live-popup, #cmu-compact-model-menu, #rpcm-overlay, #csp-v35-root`);
    }
    function fireClickSequence(el) {
        if (!el)
            return false;
        try {
            el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        }
        catch (_) { }
        try {
            el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        }
        catch (_) { }
        try {
            el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        }
        catch (_) { }
        try {
            el.click();
            return true;
        }
        catch (_) {
            return false;
        }
    }
    function visibleClickable(el) {
        if (!(el instanceof HTMLElement) || isOwnElement(el))
            return false;
        if (el.closest('[role="dialog"]'))
            return false;
        const s = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return s.display !== 'none' && s.visibility !== 'hidden' && s.pointerEvents !== 'none' && r.width > 0 && r.height > 0;
    }
    function getPublicWindow() {
        try {
            if (typeof unsafeWindow !== 'undefined' && unsafeWindow)
                return unsafeWindow;
        }
        catch (_) { }
        return window;
    }
    function detectCmuExternalThemeProvider() {
        if (cmuExternalThemeProvider)
            return cmuExternalThemeProvider;
        const w = getPublicWindow();
        const hasFlag = (name) => {
            try {
                return !!(w?.[name] || window?.[name]);
            }
            catch (_) {
                return false;
            }
        };
        const hasApi = (name) => {
            try {
                const api = w?.[name] || window?.[name];
                return !!(api && (typeof api.refresh === 'function' || typeof api.openSettings === 'function'));
            }
            catch (_) {
                return false;
            }
        };
        const customRoomTheme = hasFlag('__SGB_CUSTOM_ROOM_BG_143_THEMES_LOADED__') ||
            hasFlag('__SGB_CUSTOM_ROOM_BG_110_THEMES_LOADED__') ||
            hasApi('CrackCustomRoomBackground') ||
            hasApi('SGBDirectBackground');
        const cspTheme = hasFlag('__SGB_BACKGROUND_LAYER_0950_BORDERLESS_LOADED__') ||
            hasFlag('__SGB_BACKGROUND_LAYER_0949_DIALOGUE_BRACKETS_QUOTES_LOADED__') ||
            hasApi('CSPGeneratedBackgroundBlur');
        if (customRoomTheme && cspTheme)
            cmuExternalThemeProvider = 'multiple';
        else if (customRoomTheme)
            cmuExternalThemeProvider = 'custom-room';
        else if (cspTheme)
            cmuExternalThemeProvider = 'csp';
        else if (document.getElementById('sgb-bg-style') || document.getElementById('sgb-bg-root')) {
            cmuExternalThemeProvider = 'sgb';
        }
        return cmuExternalThemeProvider;
    }
    function isCmuExternalThemeActive() {
        return !!detectCmuExternalThemeProvider();
    }
    function getCmuExternalThemeLabel(provider = detectCmuExternalThemeProvider()) {
        if (provider === 'custom-room')
            return '일반 이미지 테마';
        if (provider === 'csp')
            return 'CSP 테마';
        if (provider === 'multiple')
            return '외부 테마 2개';
        return provider ? '외부 테마' : '';
    }
    function isCmuThemeSettingKey(key) {
        return key === 'themeSkin' || key === 'themeDialogue' || key === 'themeThought' ||
            key === 'themeItalic' || key === 'themeStrong' || key === 'themeCode' ||
            key === 'themeMarkdown';
    }
    function findExternalClickable(patterns, visibleOnly = false) {
        const regs = patterns.map(p => p instanceof RegExp ? p : new RegExp(String(p).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
        for (const el of document.querySelectorAll('button, [role="button"], a')) {
            if (isOwnElement(el) || el.closest('[data-message-group-id], [contenteditable="true"]')) continue;
            const text = getClickableLabelLite(el);
            if (!text || text.length > 120 || !regs.some(re => re.test(text))) continue;
            if (!visibleOnly || visibleClickable(el)) return el;
        }
        return null;
    }
    function isTranslatorInstalledLite() {
        return !!(document.getElementById('trans-setting-panel') || document.getElementById('trans-menu-btn') || document.querySelector('.trans-bubble-btn'));
    }
    function isAiSummaryInstalledLite() {
        const root = document.documentElement;
        // AI 요약 확프는 새로고침 직후 우측 설정 메뉴가 닫혀 있으면 사이드바 런처를 아직 만들지 않을 수 있다.
        // 전용 준비 속성뿐 아니라 부팅 시 생성되는 스타일/오버레이도 설치 신호로 인정한다.
        return !!(root?.getAttribute('data-crack-ai-summary-ready') ||
            document.getElementById('crack-ext-ai-css') ||
            document.querySelector('.crack-ext-ai-overlay') ||
            document.getElementById('crack-ext-ai-sidebar-menu') ||
            document.querySelector('.crack-ext-header-ai-btn, [data-ce-ai-summary="true"]') ||
            findExternalClickable([/AI\s*요약(?:·메모리)?/], false));
    }
    function isLoreToolsInstalledLite() {
        const w = getPublicWindow();
        return !!(w.__LoreInj ||
            w.__LoreInjReady ||
            window.__LoreInj ||
            window.__LoreInjReady ||
            document.getElementById('lore-inj-entry-button') ||
            document.querySelector('[data-lore-inj-entry="true"]'));
    }
    function isCustomRoomBackgroundInstalledLite() {
        const w = getPublicWindow();
        const api = w.CrackCustomRoomBackground || w.SGBDirectBackground || window.CrackCustomRoomBackground || window.SGBDirectBackground;
        return !!((api && typeof api.openSettings === 'function') ||
            w.__SGB_CUSTOM_ROOM_BG_143_THEMES_LOADED__ ||
            window.__SGB_CUSTOM_ROOM_BG_143_THEMES_LOADED__ ||
            w.__SGB_CUSTOM_ROOM_BG_110_THEMES_LOADED__ ||
            window.__SGB_CUSTOM_ROOM_BG_110_THEMES_LOADED__);
    }
    function isScenePainterBackgroundInstalledLite() {
        const w = getPublicWindow();
        const api = w.CSPGeneratedBackgroundBlur || window.CSPGeneratedBackgroundBlur;
        return !!((api && typeof api.openSettings === 'function') ||
            w.__SGB_BACKGROUND_LAYER_0950_BORDERLESS_LOADED__ ||
            w.__SGB_BACKGROUND_LAYER_0949_DIALOGUE_BRACKETS_QUOTES_LOADED__ ||
            window.__SGB_BACKGROUND_LAYER_0950_BORDERLESS_LOADED__ ||
            window.__SGB_BACKGROUND_LAYER_0949_DIALOGUE_BRACKETS_QUOTES_LOADED__);
    }
    function isNativeSituationImageToggleLite(target) {
        if (!(target instanceof Element))
            return false;
        const switchButton = target.closest('button[role="switch"], [role="switch"]');
        const row = target.closest('[role="button"]');
        if (!(row instanceof HTMLElement))
            return false;
        if (isOwnElement(row) || row.closest('[role="dialog"], #eic-modal-content'))
            return false;
        const text = String(row.textContent || '').replace(/\s+/g, ' ').trim();
        if (!text.includes('상황 이미지 보기'))
            return false;
        return !!(switchButton || row.querySelector('button[role="switch"], [role="switch"]'));
    }
    function handleNativeSituationImageToggleLite(target) {
        if (!isNativeSituationImageToggleLite(target) || isCmuExternalThemeActive()) return false;
        const now = Date.now();
        if (now - Number(CMU_THEME_STATE.nativeHealAt || 0) < 90) return true;
        CMU_THEME_STATE.nativeHealAt = now;
        CMU_THEME_STATE.quoteHealUntil = now + 2400;
        restoreThemeQuotesForReact();
        scheduleThemeQuoteReapplyAfterReact(2400);
        clearTimeout(handleNativeSituationImageToggleLite._timer);
        handleNativeSituationImageToggleLite._timer = setTimeout(() => {
            if (shouldRun() && isChatRoomPath()) { scheduleThemeDecorate(true); scheduleBadgeScan(); }
        }, 2400);
        return true;
    }
    function getNativeSituationImageToggleLite(visibleOnly = true) {
        const roots = [];
        const roomPanel = findCmuRoomPanel();
        if (roomPanel instanceof HTMLElement)
            roots.push(roomPanel);
        const main = document.querySelector('main');
        if (main instanceof HTMLElement && main !== roomPanel)
            roots.push(main);
        if (!roots.length)
            roots.push(document.body || document.documentElement);
        const seen = new Set();
        for (const root of roots) {
            if (!(root instanceof Element))
                continue;
            const rows = [];
            if (root.matches?.('[role="button"]'))
                rows.push(root);
            root.querySelectorAll?.('[role="button"]').forEach(row => rows.push(row));
            for (const row of rows) {
                if (!(row instanceof HTMLElement) || seen.has(row))
                    continue;
                seen.add(row);
                if (!isNativeSituationImageToggleLite(row))
                    continue;
                const toggle = row.querySelector('button[role="switch"], [role="switch"]');
                const target = toggle instanceof HTMLElement ? toggle : row;
                if (!visibleOnly || visibleClickable(target) || visibleClickable(row))
                    return target;
            }
        }
        return null;
    }
    function openNativeSituationImageToggleLite() {
        const tryToggle = () => {
            const target = getNativeSituationImageToggleLite(true) || getNativeSituationImageToggleLite(false);
            return target ? fireClickSequence(target) : false;
        };
        if (tryToggle())
            return true;
        const openRoomMenu = () => {
            if (isCmuRoomPanelOpen())
                return true;
            const toggle = findCmuRoomMenuToggle();
            if (!toggle)
                return false;
            const ok = fireClickSequence(toggle);
            if (ok)
                scheduleCmuEdgeMenuStateSync();
            return ok;
        };
        openRoomMenu();
        let opened = false;
        const waits = [80, 180, 340, 600, 950, 1450];
        waits.forEach((ms, index) => setTimeout(() => {
            if (opened)
                return;
            if (index === 2 && !isCmuRoomPanelOpen())
                openRoomMenu();
            opened = tryToggle();
            if (!opened && index === waits.length - 1)
                showToast('상황 이미지 보기 버튼을 찾지 못함');
        }, ms));
        return true;
    }
    function getNativeImageArchiveTriggerLite() {
        return findExternalClickable([/이미지\s*보관함/], false);
    }
    function getGameHudTriggerLite() {
        const dock = document.getElementById('cigh-clean-dock-fab');
        if (dock?.isConnected)
            return { el: dock, mode: 'dock' };
        const fab = document.getElementById('cigh-clean-fab');
        if (fab?.isConnected)
            return { el: fab, mode: 'fab' };
        return null;
    }
    function isGameHudInstalledLite() {
        return !!(document.getElementById('cigh-clean-fab') ||
            document.getElementById('cigh-clean-dock-fab') ||
            document.getElementById('cigh-clean-panel'));
    }
    function fireGameHudFabPointerLite(el) {
        if (!(el instanceof HTMLElement))
            return false;
        const r = el.getBoundingClientRect();
        const init = {
            bubbles: true,
            cancelable: true,
            pointerId: 9876,
            pointerType: 'mouse',
            isPrimary: true,
            button: 0,
            clientX: r.left + Math.max(1, r.width / 2),
            clientY: r.top + Math.max(1, r.height / 2),
        };
        try {
            el.dispatchEvent(new PointerEvent('pointerdown', { ...init, buttons: 1 }));
            el.dispatchEvent(new PointerEvent('pointerup', { ...init, buttons: 0 }));
            return true;
        }
        catch (_) {
            try {
                el.dispatchEvent(new Event('pointerdown', { bubbles: true, cancelable: true }));
                el.dispatchEvent(new Event('pointerup', { bubbles: true, cancelable: true }));
                return true;
            }
            catch (_) {
                return false;
            }
        }
    }
    function tryOpenGameHudLite() {
        const target = getGameHudTriggerLite();
        if (!target)
            return false;
        if (target.mode === 'dock')
            return fireClickSequence(target.el);
        return fireGameHudFabPointerLite(target.el);
    }
    function openGameHudLite() {
        if (tryOpenGameHudLite())
            return true;
        let opened = false;
        [180, 500, 950, 1500].forEach((ms, index, all) => setTimeout(() => {
            if (opened)
                return;
            opened = tryOpenGameHudLite();
            if (!opened && index === all.length - 1)
                showToast('게임 HUD 버튼을 찾지 못함');
        }, ms));
        showToast('게임 HUD 준비 중 · 잠시 후 자동으로 열림');
        return true;
    }
    function getMobileScenePainterTriggerLite(visibleOnly = true) {
        const row = document.getElementById('csp-scene-painter-row');
        if (!row)
            return null;
        const trigger = row.querySelector('[role="button"]') || row;
        if (!(trigger instanceof HTMLElement))
            return null;
        if (visibleOnly && !visibleClickable(trigger))
            return null;
        return trigger;
    }
    function isMobileScenePainterInstalledLite() {
        // 모바일 Scene Painter는 시작 시 고유 스타일을 항상 주입하므로,
        // 우측 설정 메뉴가 닫혀 있어 row가 DOM에 없어도 설치 여부를 판별할 수 있다.
        return !!(document.getElementById('csp-scene-painter-style') ||
            document.getElementById('csp-scene-painter-row') ||
            document.getElementById('csp-v35-root'));
    }
    function tryOpenMobileScenePainterLite() {
        // 이미 Studio/설정 UI가 열려 있으면 중복으로 새 진입을 만들지 않는다.
        if (document.getElementById('csp-v35-root'))
            return true;
        const trigger = getMobileScenePainterTriggerLite(true) || getMobileScenePainterTriggerLite(false);
        return trigger ? fireClickSequence(trigger) : false;
    }
    function openMobileScenePainterLite() {
        if (tryOpenMobileScenePainterLite())
            return true;
        if (!isMobileScenePainterInstalledLite()) {
            showToast('모바일 삽화 확프를 찾지 못함');
            return false;
        }

        // 모바일판은 설정 메뉴가 열릴 때 #csp-scene-painter-row를 주입한다.
        // Scene Painter 원본에 브리지를 추가하지 않고 크랙 우측 메뉴를 잠깐 열어 기존 행을 호출한다.
        const openRoomMenu = () => {
            if (isCmuRoomPanelOpen())
                return true;
            const toggle = findCmuRoomMenuToggle();
            if (!toggle)
                return false;
            const ok = fireClickSequence(toggle);
            if (ok)
                scheduleCmuEdgeMenuStateSync();
            return ok;
        };
        openRoomMenu();

        let opened = false;
        const waits = [100, 220, 420, 700, 1050, 1500, 2200, 3200];
        waits.forEach((ms, index) => setTimeout(() => {
            if (opened)
                return;
            if (!document.getElementById('csp-scene-painter-row') && index === 2)
                openRoomMenu();
            opened = tryOpenMobileScenePainterLite();
            if (!opened && index === waits.length - 1)
                showToast('모바일 삽화 설정 진입점을 찾지 못함');
        }, ms));
        showToast('모바일 삽화 준비 중 · 설정창을 여는 중');
        return true;
    }
    function getWishRpManagerTriggerLite(visibleOnly = true) {
        const mobileHost = document.getElementById('rpcm-mobile-button-host');
        const trigger = document.getElementById('wish-rp-toolbar-launcher') ||
            document.querySelector('[data-rpcm-open-manager="1"]') ||
            document.getElementById('rpcm-fab') ||
            mobileHost?.shadowRoot?.querySelector('#rpcm-fab, button');
        if (!(trigger instanceof HTMLElement))
            return null;
        if (visibleOnly && !visibleClickable(trigger))
            return null;
        return trigger;
    }
    function dispatchWishRpManagerOpen() {
        if (!document.documentElement?.getAttribute('data-wish-rp-manager-ready'))
            return false;
        try {
            document.dispatchEvent(new Event('wish-rp-manager:open'));
            return true;
        }
        catch (_) {
            return false;
        }
    }
    function isProfileBoxInstalledLite() {
        const w = getPublicWindow();
        let hooked = false;
        try {
            hooked = !!(w?.__CPM_NETWORK_HOOKED__ || w?.__CPM_XHR_HOOKED__ || window?.__CPM_NETWORK_HOOKED__ || window?.__CPM_XHR_HOOKED__);
        }
        catch (_) { }
        const detected = !!(hooked ||
            document.getElementById('cpm-root') ||
            document.getElementById('cpm-launcher') ||
            document.getElementById('cpm-embedded-launcher') ||
            document.querySelector('[data-cpm-profile-fallback="true"]') ||
            document.querySelector('.cpm-external-profile-launcher:not(#chud-profile-box-btn)'));
        if (detected)
            CMU_INTEGRATION_SEEN.profileBox = true;
        return detected || CMU_INTEGRATION_SEEN.profileBox;
    }
    function getProfileBoxTriggerLite() {
        return document.getElementById('cpm-launcher') ||
            document.getElementById('cpm-embedded-launcher') ||
            document.querySelector('[data-cpm-profile-fallback="true"]') ||
            document.querySelector('.cpm-external-profile-launcher:not(#chud-profile-box-btn)');
    }
    function openProfileBoxLite() {
        if (document.getElementById('cpm-root'))
            return true;
        const tryOpen = () => {
            const trigger = getProfileBoxTriggerLite();
            return trigger ? fireClickSequence(trigger) : false;
        };
        if (tryOpen())
            return true;
        let opened = false;
        const waits = [160, 420, 800, 1300];
        waits.forEach((ms, index) => setTimeout(() => {
            if (opened)
                return;
            opened = !!document.getElementById('cpm-root') || tryOpen();
            if (!opened && index === waits.length - 1)
                showToast('프로필 박스 버튼을 찾지 못함');
        }, ms));
        return true;
    }
    function isWishRpManagerInstalledLite() {
        const detected = !!(document.documentElement?.getAttribute('data-wish-rp-manager-ready') ||
            document.getElementById('wish-rp-toolbar-launcher') ||
            document.querySelector('[data-rpcm-open-manager="1"]') ||
            document.getElementById('rpcm-fab') ||
            document.getElementById('rpcm-mobile-button-host') ||
            document.getElementById('rpcm-overlay'));
        if (detected)
            CMU_INTEGRATION_SEEN.wishManager = true;
        return detected || CMU_INTEGRATION_SEEN.wishManager;
    }
    function openWishRpManagerLite() {
        const tryOpen = () => {
            if (document.getElementById('rpcm-overlay'))
                return true;
            if (dispatchWishRpManagerOpen())
                return true;
            const trigger = getWishRpManagerTriggerLite(true) || getWishRpManagerTriggerLite(false);
            return trigger ? fireClickSequence(trigger) : false;
        };
        if (tryOpen())
            return true;
        let opened = false;
        const waits = [160, 420, 800, 1300, 2000];
        waits.forEach((ms, index) => setTimeout(() => {
            if (opened)
                return;
            opened = tryOpen();
            if (!opened && index === waits.length - 1)
                showToast('Wish RP Manager 버튼을 찾지 못함');
        }, ms));
        showToast('Wish RP Manager 준비 중 · 잠시 후 자동으로 열림');
        return true;
    }
    function refreshSideAvailability(force = false) {
        const now = Date.now();
        const age = now - Number(DASH_SIDE.availableAt || 0);
        if (DASH_SIDE.available && age < (force ? 1500 : 4000)) {
            return DASH_SIDE.available;
        }
        DASH_SIDE.availableAt = now;
        DASH_SIDE.available = {
            modelButton: true,
            guideButton: true,
            profileButton: true,
            profileBoxButton: isProfileBoxInstalledLite(),
            noteButton: true,
            outputButton: true,
            summaryButton: true,
            startButton: true,
            loreButton: isLoreToolsInstalledLite(),
            translatorButton: isTranslatorInstalledLite(),
            aiSummaryButton: isAiSummaryInstalledLite(),
            gameHudButton: isGameHudInstalledLite(),
            scenePainterButton: isMobileScenePainterInstalledLite(),
            wishManagerButton: isWishRpManagerInstalledLite(),
            roomBackgroundButton: isCustomRoomBackgroundInstalledLite(),
            sceneBlurButton: isScenePainterBackgroundInstalledLite(),
            imageButton: true,
            archiveButton: !!getNativeImageArchiveTriggerLite(),
            externalArchiveButton: false,
        };
        return DASH_SIDE.available;
    }
    function findClickableByTextOrLabel(patterns) {
        const regs = patterns.map(p => p instanceof RegExp ? p : new RegExp(String(p).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
        const candidates = Array.from(document.querySelectorAll('button, [role="button"], a'));
        for (const el of candidates) {
            if (!el || isOwnElement(el))
                continue;
            if (el.closest?.('#chud-sidebar, #chud-side-menu, #chud-side-dropdown, #chud-infobar, #cmu-settings-panel'))
                continue;
            const hay = [el.textContent, el.getAttribute('aria-label'), el.getAttribute('title'), el.getAttribute('data-tooltip'), el.getAttribute('data-label')].join(' ');
            if (!regs.some(re => re.test(hay)))
                continue;
            if (visibleClickable(el))
                return el;
        }
        for (const span of document.querySelectorAll('span')) {
            if (span.childElementCount > 0 || isOwnElement(span))
                continue;
            const hay = [span.textContent, span.getAttribute?.('aria-label'), span.getAttribute?.('title')].join(' ');
            if (!regs.some(re => re.test(hay)))
                continue;
            const btn = span.closest('button, [role="button"], a');
            if (visibleClickable(btn))
                return btn;
        }
        return null;
    }
    function clickFirst(patterns, failLabel = '') {
        const btn = findClickableByTextOrLabel(patterns);
        if (btn)
            return fireClickSequence(btn);
        if (failLabel)
            showToast(`${failLabel} 버튼 못 찾음`);
        return false;
    }
    function openTranslatorLite() {
        // 번역확프 v4.1.5+는 메뉴명이 바뀌어도 #trans-menu-btn / #trans-setting-panel ID를 유지한다.
        // 텍스트 검색보다 안정적인 ID 직접 호출을 우선하고, 구버전용 텍스트 검색은 마지막 fallback으로 둔다.
        const panel = document.getElementById('trans-setting-panel');
        const menu = document.getElementById('trans-menu-btn');
        if (menu) {
            try {
                // 실제 번역확프의 열기 핸들러가 #trans-menu-btn에 붙어 있으므로
                // 사이드바가 화면 밖/숨김 상태여도 네이티브 click으로 직접 호출한다.
                menu.click();
                if (panel && panel.style.display !== 'none')
                    return true;
            }
            catch (_) { }
            const trigger = menu.matches?.('button, [role="button"], a')
                ? menu
                : menu.querySelector?.('button, [role="button"], a');
            if (trigger && fireClickSequence(trigger))
                return true;
        }
        if (panel) {
            panel.style.display = 'block';
            return true;
        }
        return clickFirst([
            /초월\s*번역\s*설정/i,
            /초월\s*번역기/i,
            /번역\s*설정/i,
            /번역기/i,
            /translator/i,
        ], '번역기');
    }
    function getClickableLabelLite(el) {
        return [el?.textContent, el?.getAttribute?.('aria-label'), el?.getAttribute?.('title'),
            el?.getAttribute?.('data-tooltip'), el?.getAttribute?.('data-label')]
            .join(' ').replace(/\s+/g, ' ').trim();
    }
    function isAiSummaryTriggerLite(el) {
        if (!(el instanceof Element))
            return false;
        const clickable = el.closest?.('button, [role="button"], a') || el;
        if (clickable.matches?.('.crack-ext-header-ai-btn, [data-ce-ai-summary="true"], #crack-ext-ai-sidebar-menu, #crack-ext-ai-sidebar-menu [role="button"]'))
            return true;
        return /AI\s*요약(?:·메모리)?/i.test(getClickableLabelLite(clickable));
    }
    function findSummaryMemoryTriggerLite() {
        const regs = [
            /요약\s*메모리/i,
            /장기\s*기억/i,
            /장기기억/i,
            /메모리\s*(?:편집|관리)/i,
            /요약\s*(?:편집|관리)/i,
        ];
        const candidates = Array.from(document.querySelectorAll('button, [role="button"], a'));
        for (const el of candidates) {
            if (!visibleClickable(el) || isOwnElement(el) || isAiSummaryTriggerLite(el))
                continue;
            if (el.closest?.('#chud-sidebar, #chud-side-menu, #chud-side-dropdown, #chud-infobar, #cmu-settings-panel'))
                continue;
            if (regs.some(re => re.test(getClickableLabelLite(el))))
                return el;
        }
        return null;
    }
    function openSummaryMemoryLite() {
        const btn = findSummaryMemoryTriggerLite();
        if (btn)
            return fireClickSequence(btn);
        showToast('요약 메모리 버튼 못 찾음');
        return false;
    }
    function dispatchAiSummaryOpenLite() {
        if (!document.documentElement?.getAttribute('data-crack-ai-summary-ready'))
            return false;
        try {
            document.dispatchEvent(new Event('crack-ai-summary:open'));
            return true;
        }
        catch (_) {
            return false;
        }
    }
    function findAiSummaryTriggerLite() {
        return document.querySelector('.crack-ext-header-ai-btn, [data-ce-ai-summary="true"]') ||
            document.querySelector('#crack-ext-ai-sidebar-menu [role="button"], #crack-ext-ai-sidebar-menu button') ||
            document.getElementById('crack-ext-ai-sidebar-menu') ||
            findExternalClickable([/AI\s*요약(?:·메모리)?/i, /요약\s*및\s*장기기억\s*도구/i], false);
    }
    function openAiSummaryLite() {
        // 2.3.8+ 직접 브리지: 사이드바 DOM이 없어도 즉시 연다.
        if (dispatchAiSummaryOpenLite())
            return true;

        const btn = findAiSummaryTriggerLite();
        if (btn)
            return fireClickSequence(btn);

        const aiLoaded = isAiSummaryInstalledLite();
        if (!aiLoaded) {
            showToast('AI 요약 확장프로그램을 찾지 못함');
            return false;
        }

        /*
         * AI 요약 2.3.7 계열 호환:
         * 해당 확프는 원본 사이드바의 "키보드 단축키" 항목이 실제 DOM에 보일 때
         * #crack-ext-ai-sidebar-menu를 생성한다. 그래서 새로고침 직후 CMU 버튼만 누르면
         * CSS는 감지되지만 런처가 아직 없어 아무 반응이 없는 상태가 생길 수 있다.
         *
         * 원본 사이드바를 사용자에게 실제로 열어 보이지 않고, 4px짜리 임시 호환 앵커를
         * 잠깐 만들어 AI 요약 확프의 기존 MutationObserver가 런처를 스스로 생성하게 한다.
         * 생성된 런처를 클릭한 뒤 임시 앵커는 즉시 정리한다.
         */
        const compatId = 'cmu-ai-summary-compat-host';
        let compatHost = document.getElementById(compatId);

        const ensureCompatHost = () => {
            if (compatHost?.isConnected)
                return compatHost;
            compatHost = document.createElement('div');
            compatHost.id = compatId;
            compatHost.setAttribute('aria-hidden', 'true');
            compatHost.style.cssText = [
                'position:fixed',
                'left:1px',
                'top:1px',
                'width:4px',
                'height:4px',
                'overflow:hidden',
                'opacity:.01',
                'pointer-events:none',
                'z-index:-1'
            ].join(';');

            const anchor = document.createElement('div');
            // AI 요약 2.3.7의 findAiSummarySidebarAnchor()가 찾는 원본 클래스/문구.
            anchor.className = 'px-2.5';
            anchor.style.cssText = 'display:block;width:3px;height:3px;overflow:hidden;font-size:1px;line-height:1px';
            anchor.textContent = '키보드 단축키';
            compatHost.appendChild(anchor);
            (document.body || document.documentElement).appendChild(compatHost);
            return compatHost;
        };

        const cleanupCompatHost = () => {
            const host = document.getElementById(compatId);
            if (host)
                host.remove();
            compatHost = null;
        };

        ensureCompatHost();

        // 아주 구형/변형판에서 MutationObserver 재주입을 놓친 경우를 위한 보조 자극.
        // 사용자의 실제 사이드바를 화면에 띄우는 방식은 마지막 단계에서만 잠깐 사용한다.
        let openedRoomPanel = false;
        const tryWakeNativeSidebar = () => {
            if (findAiSummaryTriggerLite())
                return;
            if (isCmuRoomPanelOpen())
                return;
            const toggle = findCmuRoomMenuToggle();
            if (!toggle)
                return;
            openedRoomPanel = !!fireClickSequence(toggle);
            if (openedRoomPanel) {
                scheduleCmuEdgeMenuStateSync();
                DASH_SIDE.availableAt = 0;
            }
        };

        const restoreRoomPanel = () => {
            if (!openedRoomPanel)
                return;
            setTimeout(() => {
                if (!isCmuRoomPanelOpen())
                    return;
                const toggle = findCmuRoomMenuToggle();
                if (toggle)
                    fireClickSequence(toggle);
                scheduleCmuEdgeMenuStateSync();
            }, 180);
        };

        let opened = false;
        const waits = [0, 40, 90, 160, 260, 420, 650, 950, 1350, 1900, 2700, 3600];
        waits.forEach((ms, index) => setTimeout(() => {
            if (opened)
                return;

            // 2.3.8+가 늦게 준비된 경우 브리지 우선.
            opened = dispatchAiSummaryOpenLite();

            if (!opened) {
                const lateBtn = findAiSummaryTriggerLite();
                if (lateBtn)
                    opened = fireClickSequence(lateBtn);
            }

            // 임시 앵커 방식이 통하지 않는 변형판만 원본 채팅방 설정 패널을 한 번 깨운다.
            if (!opened && index === 7)
                tryWakeNativeSidebar();

            if (opened) {
                setTimeout(cleanupCompatHost, 320);
                restoreRoomPanel();
                refreshIntegratedSideButtonsLite();
                return;
            }

            if (index === waits.length - 1) {
                cleanupCompatHost();
                restoreRoomPanel();
                showToast('AI 요약 버튼을 불러오지 못함');
            }
        }, ms));

        // 0~수백 ms 안에 열리는 정상 케이스에서는 불필요한 "여는 중" 토스트를 띄우지 않는다.
        setTimeout(() => {
            if (!opened)
                showToast('AI 요약 준비 중…');
        }, 700);
        return true;
    }
    function refreshIntegratedSideButtonsLite() {
        try {
            DASH_SIDE.availableAt = 0;
            refreshSideAvailability(true);
            ensureInlineBlocks();
            applySideVisible();
        }
        catch (_) { }
    }
    cmuListen(document, 'crack-ai-summary:ready', refreshIntegratedSideButtonsLite);
    cmuListen(document, 'wish-rp-manager:ready', refreshIntegratedSideButtonsLite);
    function scheduleIntegratedSideButtonsRouteRefreshLite() {
        // Crack은 SPA라 새 채팅방 진입 시 외부 확장 버튼이 본문보다 늦게 재주입될 수 있다.
        // 새로고침 없이도 늦게 붙은 Wish RP/통합 버튼을 다시 감지해 사이드바에 복원한다.
        [0, 120, 320, 700, 1300, 2200, 3600, 6000, 9000].forEach(ms => setTimeout(() => {
            if (!isChatRoomPath())
                return;
            refreshIntegratedSideButtonsLite();
        }, ms));
    }
    function getOutputSettingsTriggerLite() {
        // 2026-09 Crack UI의 현재 명칭은 '답변 길이 및 생각 조절'.
        // 구버전 명칭(출력량/출력 설정)도 함께 남겨 호환한다.
        return findClickableByTextOrLabel([
            /답변\s*길이\s*및\s*생각\s*조절/,
            /답변\s*길이/,
            /출력량(?:\s*(?:조절|설정))?/,
            /출력\s*설정/,
        ]);
    }
    function tryOpenOutputSettingsLite() {
        const trigger = getOutputSettingsTriggerLite();
        return trigger ? fireClickSequence(trigger) : false;
    }
    function openOutputSettingsLite() {
        // 4.5.0.4 원작의 전용 네이티브 트리거를 먼저 사용한다.
        // 실패할 때만 기존 범용 탐색/우측 메뉴 폴백으로 내려간다.
        if (openNativeOutputSettings({ silent: true }))
            return true;
        if (tryOpenOutputSettingsLite())
            return true;

        // 이 항목은 우측 '채팅방 설정' 메뉴가 닫혀 있으면 DOM에 없거나 비표시 상태다.
        // 유틸 버튼에서 바로 누를 때 원본 메뉴를 잠깐 열고 원본 행을 그대로 클릭한다.
        const openRoomMenu = () => {
            if (isCmuRoomPanelOpen())
                return true;
            const toggle = findCmuRoomMenuToggle();
            if (!toggle)
                return false;
            const ok = fireClickSequence(toggle);
            if (ok)
                scheduleCmuEdgeMenuStateSync();
            return ok;
        };
        openRoomMenu();

        let opened = false;
        const waits = [80, 180, 340, 600, 950, 1450, 2100];
        waits.forEach((ms, index) => setTimeout(() => {
            if (opened)
                return;
            if (index === 2 && !isCmuRoomPanelOpen())
                openRoomMenu();
            opened = tryOpenOutputSettingsLite();
            if (!opened && index === waits.length - 1)
                showToast('답변 길이 및 생각 조절 버튼을 찾지 못함');
        }, ms));
        showToast('답변 길이 설정 준비 중 · 설정 메뉴를 여는 중');
        return true;
    }

    function getStartSettingTriggerLite() {
        const title = Array.from(document.querySelectorAll('p, span')).find((el) => {
            if (!(el instanceof HTMLElement))
                return false;
            if (isOwnElement(el) || el.closest('[role="dialog"], #eic-modal-content'))
                return false;
            return (el.textContent || '').replace(/\s+/g, '').trim() === '시작설정';
        });
        if (!title)
            return null;
        let next = title.nextElementSibling;
        for (let i = 0; next && i < 8; i += 1, next = next.nextElementSibling) {
            if (!(next instanceof HTMLElement))
                continue;
            const sectionText = (next.textContent || '').replace(/\s+/g, ' ').trim();
            if (sectionText.includes('채팅방 설정') || sectionText.includes('전체 설정') || sectionText.includes('나의 크래커'))
                break;
            const btn = next.matches('button, [role="button"]')
                ? next
                : next.querySelector('button, [role="button"]');
            if (btn && visibleClickable(btn) && !isOwnElement(btn))
                return btn;
        }
        return null;
    }
    function openStartSettingLite() {
        const btn = getStartSettingTriggerLite();
        if (btn) {
            fireClickSequence(btn);
            if (settings.dashboard)
                scheduleDashboardUpdate(true);
            return true;
        }
        showToast('시작 설정 버튼 못 찾음');
        return false;
    }
    function getNativeModelMenuButton() {
        const topBar = findLoreRoomTopBar();
        const topButton = topBar?.querySelector('button[aria-haspopup="menu"]') ||
            topBar?.querySelector('img[src*="model-icon"]')?.closest('button');
        if (topButton instanceof HTMLElement)
            return topButton;
        const iconButton = Array.from(document.querySelectorAll('img[src*="model-icon"]'))
            .map(icon => icon.closest('button'))
            .find(button => button instanceof HTMLElement &&
            !button.closest(nmfNativeModelRootSelector()) && visibleClickable(button));
        return iconButton || Array.from(document.querySelectorAll('button[aria-haspopup="menu"]')).find(visibleClickable) || null;
    }
    function compactModelImageSource(item, flatToken) {
        if (!(item instanceof Element))
            return '';
        const flat = String(flatToken || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const images = Array.from(item.querySelectorAll('img[src*="model-icon"], img[srcset*="model-icon"]'));
        const image = images.find(el => nmfFlatTokensFromElement(el).includes(flat)) || images[0];
        if (!image)
            return '';
        const raw = image.currentSrc || image.getAttribute('src') || image.getAttribute('srcset') || '';
        return String(raw).split(',')[0].trim().split(/\s+/)[0] || '';
    }
    function compactModelNativeActionTarget(item, token) {
        if (!(item instanceof HTMLElement))
            return null;
        const selector = 'button, [role^="menuitem"], [role="option"], [data-radix-collection-item], a, li';
        const expectedToken = String(token || '');
        const expectedFlat = nmfIconFlatToken(expectedToken);
        const icon = nmfNativeModelIconElements(item)
            .find(el => nmfFlatTokensFromElement(el).includes(expectedFlat)) || null;
        const candidates = [];
        const seen = new Set();
        const push = el => {
            if (!(el instanceof HTMLElement) || seen.has(el) || !item.contains(el) && el !== item)
                return;
            if (icon && el !== item && !el.contains(icon))
                return;
            const tokens = nmfFlatTokensFromElement(el)
                .map(flat => nmfTokenFromFlatIconToken(flat))
                .filter(Boolean);
            if (tokens.length && !tokens.includes(expectedToken))
                return;
            seen.add(el);
            candidates.push(el);
        };
        push(item);
        item.querySelectorAll(selector).forEach(push);
        let current = icon;
        while (current instanceof HTMLElement && item.contains(current)) {
            if (current.matches(selector))
                push(current);
            if (current === item)
                break;
            current = current.parentElement;
        }
        const depth = el => {
            let value = 0;
            let node = el;
            while (node && node !== item) {
                value += 1;
                node = node.parentElement;
            }
            return value;
        };
        const score = el => {
            let value = depth(el) * 12;
            if (el.matches('button'))
                value += 700;
            if (el.matches('[role^="menuitem"]'))
                value += 620;
            if (el.matches('[role="option"]'))
                value += 580;
            if (el.matches('[data-radix-collection-item]'))
                value += 520;
            if (el.hasAttribute('tabindex'))
                value += 180;
            if (icon && el.contains(icon))
                value += 80;
            return value;
        };
        return candidates.sort((a, b) => score(b) - score(a))[0] || item;
    }
    function compactModelRecommendedFromItem(item) {
        if (!(item instanceof Element))
            return false;
        const parts = [
            item.textContent,
            item.getAttribute?.('aria-label'),
            item.getAttribute?.('title'),
            item.getAttribute?.('data-tooltip'),
            item.getAttribute?.('data-label'),
        ].filter(Boolean);
        try {
            item.querySelectorAll?.('[aria-label], [title], [data-tooltip], [data-label]').forEach(el => {
                parts.push(
                    el.getAttribute('aria-label'),
                    el.getAttribute('title'),
                    el.getAttribute('data-tooltip'),
                    el.getAttribute('data-label')
                );
            });
        }
        catch (_) { }
        const hay = parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
        return /제작자\s*(?:권장|추천)|(?:권장|추천)\s*(?:모델)?|\brecommended\b/i.test(hay);
    }
    function compactModelSnapshot() {
        const roots = nmfNativeModelRoots().filter(root => {
            if (!root?.isConnected || root.getAttribute?.('data-state') === 'closed')
                return false;
            const shell = root.closest?.('[data-radix-popper-content-wrapper]') || root;
            if (shell?.getAttribute?.('data-state') === 'closed')
                return false;
            try {
                return getComputedStyle(shell).display !== 'none';
            }
            catch (_) {
                return true;
            }
        });
        const root = roots.find(el => el.matches?.('[data-radix-menu-content]')) || roots[0];
        if (!(root instanceof HTMLElement))
            return null;
        const shell = root.closest('[data-radix-popper-content-wrapper]') || root;
        const entries = [];
        const used = new Set();
        for (const item of nmfNativeModelItemCandidates()) {
            if (!(item instanceof HTMLElement) || !item.isConnected || !shell.contains(item))
                continue;
            const tokenPairs = new Map();
            for (const flat of nmfFlatTokensFromElement(item)) {
                const token = nmfTokenFromFlatIconToken(flat);
                if (token && !tokenPairs.has(token))
                    tokenPairs.set(token, flat);
            }
            if (tokenPairs.size !== 1)
                continue;
            const [[token, flat]] = tokenPairs.entries();
            if (used.has(token) || (settings.nativeModelFilter && !nmfIsVisible(token)))
                continue;
            try {
                if (getComputedStyle(item).display === 'none')
                    continue;
            }
            catch (_) { }
            used.add(token);
            const actionItem = compactModelNativeActionTarget(item, token) || item;
            const label = nmfNativeModelLabelFromItem(item, flat, token) || cmiAutoLabel(token) || token;
            const selected = item.matches('[aria-checked="true"], [aria-selected="true"], [data-state="checked"]') ||
                !!item.querySelector('[aria-checked="true"], [aria-selected="true"], [data-state="checked"]');
            const disabled = item.matches('[aria-disabled="true"], :disabled') || actionItem.matches('[aria-disabled="true"], :disabled') ||
                !!item.querySelector('[aria-disabled="true"], :disabled');
            entries.push({
                token,
                label,
                item: actionItem,
                iconSrc: compactModelImageSource(item, flat),
                selected,
                disabled,
                recommended: compactModelRecommendedFromItem(item),
            });
        }
        return entries.length ? { root, shell, entries } : null;
    }
    function compactModelCurrentToken(nativeButton, entries) {
        const marked = entries.find(entry => entry.selected);
        if (marked)
            return marked.token;
        for (const flat of nmfFlatTokensFromElement(nativeButton)) {
            const token = nmfTokenFromFlatIconToken(flat);
            if (token && entries.some(entry => entry.token === token))
                return token;
        }
        const normalize = value => String(value || '').toLowerCase().replace(/\s+/g, '');
        const currentText = normalize(getClickableLabelLite(nativeButton));
        return entries.find(entry => currentText.includes(normalize(entry.label)))?.token || '';
    }
    function compactModelClickOnce(el) {
        if (!(el instanceof HTMLElement) || !el.isConnected)
            return false;
        try {
            el.click();
            return true;
        }
        catch (_) {
            try {
                el.dispatchEvent(new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    composed: true,
                    view: window,
                }));
                return true;
            }
            catch (_) {
                return false;
            }
        }
    }
    function compactModelExactIcon(item, token) {
        if (!(item instanceof Element))
            return null;
        const expectedFlat = nmfIconFlatToken(token);
        return nmfNativeModelIconElements(item)
            .find(el => nmfFlatTokensFromElement(el).includes(expectedFlat)) || null;
    }
    async function compactModelActivateNativeItem(item, token) {
        /*
         * 중요: 원본 Radix 메뉴에 pointermove/mousemove를 인위적으로 보내면
         * hover 서브메뉴/강조행이 바뀌면서 다른 모델 행으로 대상이 이동할 수 있다.
         * 따라서 좌표/hover를 전혀 만들지 않고, 요청한 모델 아이콘의 실제 DOM에서
         * click을 버블링시켜 그 아이콘을 소유한 원본 행만 동작시킨다.
         */
        let sourceItem = item;
        if (!(sourceItem instanceof HTMLElement) || !sourceItem.isConnected) {
            sourceItem = compactModelSnapshot()?.entries?.find(entry => entry.token === token)?.item || null;
        }
        if (!(sourceItem instanceof HTMLElement) || !sourceItem.isConnected)
            return false;

        const expectedToken = String(token || '');
        const sourceTokens = Array.from(new Set(
            nmfFlatTokensFromElement(sourceItem)
                .map(flat => nmfTokenFromFlatIconToken(flat))
                .filter(Boolean)
        ));
        if (sourceTokens.length && !sourceTokens.includes(expectedToken))
            return false;

        const exactIcon = compactModelExactIcon(sourceItem, expectedToken);
        const target = exactIcon || compactModelNativeActionTarget(sourceItem, expectedToken) || sourceItem;
        if (!(target instanceof HTMLElement) || !target.isConnected)
            return false;

        try {
            target.click();
            return true;
        }
        catch (_) {
            try {
                target.dispatchEvent(new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    composed: true,
                    view: window,
                    button: 0,
                    buttons: 0,
                    detail: 1,
                }));
                return true;
            }
            catch (_) {
                return false;
            }
        }
    }
    function compactModelButtonToken(nativeButton) {
        for (const flat of nmfFlatTokensFromElement(nativeButton)) {
            const token = nmfTokenFromFlatIconToken(flat);
            if (token)
                return token;
        }
        return '';
    }
    function compactModelNormalizeLabel(value) {
        return String(value || '')
            .toLowerCase()
            .replace(/\s+/g, '')
            .replace(/[·|()[\]{}:]/g, '');
    }
    function compactModelSelectionMatches(nativeButton, entry) {
        const buttonToken = compactModelButtonToken(nativeButton);
        if (buttonToken)
            return buttonToken === entry.token;
        const currentLabel = compactModelNormalizeLabel(getClickableLabelLite(nativeButton));
        const wantedLabel = compactModelNormalizeLabel(entry.label);
        return wantedLabel.length >= 2 && currentLabel.includes(wantedLabel);
    }
    function compactModelNativeIsOpen(nativeButton, nativeShell) {
        const expanded = nativeButton?.getAttribute?.('aria-expanded');
        if (expanded === 'true')
            return true;
        if (expanded === 'false')
            return false;
        if (!(nativeShell instanceof HTMLElement) || !nativeShell.isConnected)
            return false;
        const root = nativeShell.matches?.('[data-radix-menu-content]')
            ? nativeShell
            : nativeShell.querySelector?.('[data-radix-menu-content]');
        if (nativeShell.getAttribute('data-state') === 'closed' || root?.getAttribute?.('data-state') === 'closed')
            return false;
        try {
            return getComputedStyle(nativeShell).display !== 'none';
        }
        catch (_) {
            return true;
        }
    }
    function compactModelDispatchEscape(nativeShell) {
        const root = nativeShell?.matches?.('[data-radix-menu-content]')
            ? nativeShell
            : nativeShell?.querySelector?.('[data-radix-menu-content]');
        const target = root || nativeShell || document;
        try {
            target.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'Escape',
                code: 'Escape',
                bubbles: true,
                cancelable: true,
                composed: true,
            }));
            return true;
        }
        catch (_) {
            return false;
        }
    }
    async function compactModelWaitForSelection(nativeButton, entry) {
        for (const delay of [0, 45, 90, 160, 260, 420, 650]) {
            if (delay)
                await new Promise(resolve => setTimeout(resolve, delay));
            if (compactModelSelectionMatches(nativeButton, entry))
                return true;
            const selected = compactModelSnapshot()?.entries?.find(candidate => candidate.selected);
            if (selected?.token === entry.token)
                return true;
        }
        return false;
    }
    async function compactModelDismissNativeMenu(nativeButton, initialShell) {
        const markedShells = new Set();
        const mark = shell => {
            if (!(shell instanceof HTMLElement))
                return shell;
            shell.setAttribute('data-cmu-compact-model-native', '1');
            markedShells.add(shell);
            return shell;
        };
        let nativeShell = mark(initialShell);
        const refreshShell = () => {
            try {
                const fresh = compactModelSnapshot()?.shell;
                if (fresh)
                    nativeShell = mark(fresh);
            }
            catch (_) { }
            return nativeShell;
        };
        await new Promise(resolve => setTimeout(resolve, 55));
        refreshShell();
        if (compactModelNativeIsOpen(nativeButton, nativeShell))
            compactModelDispatchEscape(nativeShell);
        await new Promise(resolve => setTimeout(resolve, 95));
        refreshShell();
        if (compactModelNativeIsOpen(nativeButton, nativeShell) &&
            nativeButton?.getAttribute?.('aria-expanded') === 'true') {
            compactModelClickOnce(nativeButton);
        }
        await new Promise(resolve => setTimeout(resolve, 180));
        refreshShell();
        if (compactModelNativeIsOpen(nativeButton, nativeShell)) {
            compactModelDispatchEscape(nativeShell);
            await new Promise(resolve => setTimeout(resolve, 140));
            refreshShell();
        }
        const stillOpen = compactModelNativeIsOpen(nativeButton, nativeShell);
        const reveal = () => {
            document.documentElement.classList.remove('cmu-compact-model-selecting');
            markedShells.forEach(shell => {
                try { shell.removeAttribute('data-cmu-compact-model-native'); } catch (_) { }
            });
            document.querySelectorAll('[data-cmu-compact-model-native="1"]').forEach(shell => {
                try { shell.removeAttribute('data-cmu-compact-model-native'); } catch (_) { }
            });
        };
        if (!stillOpen) {
            reveal();
            return true;
        }
        setTimeout(() => {
            const shell = refreshShell();
            if (compactModelNativeIsOpen(nativeButton, shell)) {
                compactModelDispatchEscape(shell);
                if (nativeButton?.getAttribute?.('aria-expanded') === 'true')
                    setTimeout(() => compactModelClickOnce(nativeButton), 80);
            }
            setTimeout(reveal, 260);
        }, 420);
        return false;
    }
    function positionCompactModelPicker() {
        const menu = COMPACT_MODEL.menu;
        const anchor = COMPACT_MODEL.anchor;
        if (!(menu instanceof HTMLElement) || !(anchor instanceof HTMLElement) || !anchor.isConnected)
            return;
        const vv = window.visualViewport;
        const viewportLeft = Number(vv?.offsetLeft || 0);
        const viewportTop = Number(vv?.offsetTop || 0);
        const viewportWidth = Math.max(1, Number(vv?.width || window.innerWidth || 1));
        const viewportHeight = Math.max(1, Number(vv?.height || window.innerHeight || 1));
        const rect = anchor.getBoundingClientRect();
        const width = Math.min(170, Math.max(132, viewportWidth - 20));
        const spaceAbove = Math.max(0, rect.top - viewportTop - 8);
        const spaceBelow = Math.max(0, viewportTop + viewportHeight - rect.bottom - 8);
        const placeAbove = spaceAbove >= 112 || spaceAbove >= spaceBelow;
        const available = Math.max(92, Math.min(340, placeAbove ? spaceAbove : spaceBelow));
        menu.style.width = `${Math.round(width)}px`;
        menu.style.maxHeight = `${Math.round(available)}px`;
        const measuredHeight = Math.min(menu.scrollHeight || available, available);
        let top = placeAbove ? rect.top - measuredHeight - 8 : rect.bottom + 8;
        top = Math.max(viewportTop + 8, Math.min(top, viewportTop + viewportHeight - measuredHeight - 8));
        let left = rect.left;
        left = Math.max(viewportLeft + 8, Math.min(left, viewportLeft + viewportWidth - width - 8));
        menu.style.left = `${Math.round(left)}px`;
        menu.style.top = `${Math.round(top)}px`;
        menu.style.visibility = 'visible';
    }
    function unbindCompactModelPickerEvents() {
        if (COMPACT_MODEL.outsideHandler)
            document.removeEventListener('pointerdown', COMPACT_MODEL.outsideHandler, true);
        if (COMPACT_MODEL.keyHandler)
            document.removeEventListener('keydown', COMPACT_MODEL.keyHandler, true);
        if (COMPACT_MODEL.resizeHandler) {
            window.removeEventListener('resize', COMPACT_MODEL.resizeHandler);
            window.visualViewport?.removeEventListener?.('resize', COMPACT_MODEL.resizeHandler);
        }
        COMPACT_MODEL.outsideHandler = COMPACT_MODEL.keyHandler = COMPACT_MODEL.resizeHandler = null;
    }
    function compactModelClearNativeLiveMarks(shell = null) {
        const scope = shell instanceof HTMLElement ? shell : document;
        const marked = [];
        if (scope instanceof HTMLElement && (
            scope.hasAttribute('data-cmu-compact-native-live') ||
            scope.hasAttribute('data-cmu-compact-native-live-root') ||
            scope.hasAttribute('data-cmu-compact-native-live-row') ||
            scope.hasAttribute('data-cmu-compact-native-live-hide')
        )) marked.push(scope);
        scope.querySelectorAll?.('[data-cmu-compact-native-live], [data-cmu-compact-native-live-root], [data-cmu-compact-native-live-branch], [data-cmu-compact-native-live-row], [data-cmu-compact-native-live-hide], [data-cmu-compact-native-live-action], [data-cmu-compact-native-live-title], [data-cmu-compact-native-live-desc], [data-cmu-compact-native-live-badge], [data-cmu-compact-native-live-recommend]')
            .forEach(el => marked.push(el));
        marked.forEach(el => {
            try {
                el.removeAttribute('data-cmu-compact-native-live');
                el.removeAttribute('data-cmu-compact-native-live-root');
                el.removeAttribute('data-cmu-compact-native-live-branch');
                el.removeAttribute('data-cmu-compact-native-live-row');
                el.removeAttribute('data-cmu-compact-native-live-hide');
                el.removeAttribute('data-cmu-compact-native-live-action');
                el.removeAttribute('data-cmu-compact-native-live-title');
                el.removeAttribute('data-cmu-compact-native-live-desc');
                el.removeAttribute('data-cmu-compact-native-live-badge');
                el.removeAttribute('data-cmu-compact-native-live-recommend');
                el.style?.removeProperty?.('--cmu-compact-native-max-h');
            }
            catch (_) { }
        });
        if (shell instanceof HTMLElement) {
            for (const prop of ['left', 'top', 'right', 'bottom', 'width', 'max-width', 'position', 'transform', 'z-index']) {
                try { shell.style.removeProperty(prop); } catch (_) { }
            }
        }
    }
    function closeCompactModelPicker(options = {}) {
        const closeNative = options.closeNative !== false;
        const deferNativeReveal = options.deferNativeReveal === true;
        const preserveNativeHidden = options.preserveNativeHidden === true;
        COMPACT_MODEL.seq += 1;
        COMPACT_MODEL.opening = false;
        COMPACT_MODEL.toggleLockUntil = Math.max(COMPACT_MODEL.toggleLockUntil || 0, Date.now() + 180);
        document.documentElement.classList.remove('cmu-compact-model-probing');
        if (!preserveNativeHidden)
            document.documentElement.classList.remove('cmu-compact-model-selecting');
        COMPACT_MODEL.menu?.remove();
        COMPACT_MODEL.menu = null;
        unbindCompactModelPickerEvents();
        if (COMPACT_MODEL.revealTimer) {
            clearTimeout(COMPACT_MODEL.revealTimer);
            COMPACT_MODEL.revealTimer = 0;
        }
        if (COMPACT_MODEL.closeTimer) {
            clearTimeout(COMPACT_MODEL.closeTimer);
            COMPACT_MODEL.closeTimer = 0;
        }
        let nativeShell = COMPACT_MODEL.nativeShell;
        const nativeButton = COMPACT_MODEL.nativeButton;
        const isLiveNative = nativeShell?.hasAttribute?.('data-cmu-compact-native-live');
        if (!nativeShell?.isConnected) {
            try {
                nativeShell = compactModelSnapshot()?.shell || nativeShell;
            }
            catch (_) { }
        }
        if (isLiveNative || nativeShell?.hasAttribute?.('data-cmu-compact-native-live')) {
            const wasOpen = compactModelNativeIsOpen(nativeButton, nativeShell);

            /* 4.3.0.10:
             * 두 번째 탭으로 닫을 때 compact CSS를 먼저 벗기면, Radix 원본 메뉴가
             * 닫히기 전 1~수 프레임 동안 큰 메뉴로 그대로 노출된다. 기기에 따라
             * 그 상태가 남기도 했다. 닫힘 요청이 끝날 때까지 원본 shell을 숨긴 뒤
             * 마지막에만 compact 표식을 정리한다. */
            if (closeNative && wasOpen && nativeButton?.isConnected) {
                document.documentElement.classList.add('cmu-compact-model-selecting');
                try { nativeShell?.setAttribute?.('data-cmu-compact-model-native', '1'); } catch (_) { }
                compactModelDispatchEscape(nativeShell);
                setTimeout(() => {
                    try {
                        if (compactModelNativeIsOpen(nativeButton, nativeShell) &&
                            nativeButton.getAttribute('aria-expanded') === 'true') {
                            compactModelClickOnce(nativeButton);
                        }
                    }
                    catch (_) { }
                }, 70);
                COMPACT_MODEL.closeTimer = setTimeout(() => {
                    compactModelClearNativeLiveMarks(nativeShell);
                    try { nativeShell?.removeAttribute?.('data-cmu-compact-model-native'); } catch (_) { }
                    document.documentElement.classList.remove('cmu-compact-model-selecting');
                    COMPACT_MODEL.closeTimer = 0;
                }, 280);
            }
            else {
                compactModelClearNativeLiveMarks(nativeShell);
                try { nativeShell?.removeAttribute?.('data-cmu-compact-model-native'); } catch (_) { }
            }
            COMPACT_MODEL.nativeShell = null;
            COMPACT_MODEL.nativeButton = null;
            COMPACT_MODEL.anchor = null;
            return;
        }
        const revealNative = () => {
            try { nativeShell?.removeAttribute('data-cmu-compact-model-native'); } catch (_) { }
        };
        if (closeNative && nativeButton?.isConnected &&
            (nativeShell?.isConnected || nativeButton.getAttribute('aria-expanded') === 'true')) {
            /* 닫는 동안 원본 메뉴가 순간적으로 커져 보이지 않게 계속 숨긴다. */
            try { nativeShell?.setAttribute?.('data-cmu-compact-model-native', '1'); } catch (_) { }
            document.documentElement.classList.add('cmu-compact-model-selecting');
            compactModelDispatchEscape(nativeShell);
            setTimeout(() => {
                try {
                    if (nativeButton.getAttribute('aria-expanded') === 'true')
                        compactModelClickOnce(nativeButton);
                }
                catch (_) { }
            }, 70);
            COMPACT_MODEL.revealTimer = setTimeout(() => {
                revealNative();
                document.documentElement.classList.remove('cmu-compact-model-selecting');
                COMPACT_MODEL.revealTimer = 0;
            }, 280);
        }
        else if (deferNativeReveal) {
            COMPACT_MODEL.revealTimer = setTimeout(() => {
                revealNative();
                COMPACT_MODEL.revealTimer = 0;
            }, 320);
        }
        else if (!preserveNativeHidden) {
            revealNative();
        }
        COMPACT_MODEL.nativeShell = null;
        COMPACT_MODEL.nativeButton = null;
        COMPACT_MODEL.anchor = null;
    }
    function compactModelFreezeNativeButton(nativeButton) {
        if (!(nativeButton instanceof HTMLElement) || !nativeButton.isConnected)
            return () => {};

        const rect = nativeButton.getBoundingClientRect();
        if (!rect.width || !rect.height)
            return () => {};

        const originalStyle = nativeButton.getAttribute('style');
        const originalFrozen = nativeButton.getAttribute('data-cmu-model-button-frozen');
        let placeholder = null;

        try {
            const computed = getComputedStyle(nativeButton);
            if (!/^(?:absolute|fixed)$/.test(computed.position || '')) {
                placeholder = document.createElement('span');
                placeholder.setAttribute('data-cmu-model-button-placeholder', '1');
                placeholder.setAttribute('aria-hidden', 'true');
                placeholder.style.setProperty('display', 'block', 'important');
                placeholder.style.setProperty('box-sizing', 'border-box', 'important');
                placeholder.style.setProperty('flex', `0 0 ${rect.width}px`, 'important');
                placeholder.style.setProperty('width', `${rect.width}px`, 'important');
                placeholder.style.setProperty('min-width', `${rect.width}px`, 'important');
                placeholder.style.setProperty('max-width', `${rect.width}px`, 'important');
                placeholder.style.setProperty('height', `${rect.height}px`, 'important');
                placeholder.style.setProperty('margin', computed.margin || '0', 'important');
                placeholder.style.setProperty('padding', '0', 'important');
                placeholder.style.setProperty('border', '0', 'important');
                placeholder.style.setProperty('visibility', 'hidden', 'important');
                placeholder.style.setProperty('pointer-events', 'none', 'important');
                nativeButton.parentNode?.insertBefore?.(placeholder, nativeButton);
            }
        }
        catch (_) { }

        nativeButton.setAttribute('data-cmu-model-button-frozen', '1');
        nativeButton.style.setProperty('position', 'fixed', 'important');
        nativeButton.style.setProperty('left', `${Math.round(rect.left)}px`, 'important');
        nativeButton.style.setProperty('top', `${Math.round(rect.top)}px`, 'important');
        nativeButton.style.setProperty('right', 'auto', 'important');
        nativeButton.style.setProperty('bottom', 'auto', 'important');
        nativeButton.style.setProperty('width', `${Math.round(rect.width)}px`, 'important');
        nativeButton.style.setProperty('min-width', `${Math.round(rect.width)}px`, 'important');
        nativeButton.style.setProperty('max-width', `${Math.round(rect.width)}px`, 'important');
        nativeButton.style.setProperty('height', `${Math.round(rect.height)}px`, 'important');
        nativeButton.style.setProperty('margin', '0', 'important');
        nativeButton.style.setProperty('transform', 'none', 'important');
        nativeButton.style.setProperty('transition', 'none', 'important');
        nativeButton.style.setProperty('z-index', '2147483001', 'important');

        let released = false;
        return () => {
            if (released)
                return;
            released = true;
            try {
                placeholder?.remove?.();
            }
            catch (_) { }
            try {
                if (originalStyle == null)
                    nativeButton.removeAttribute('style');
                else
                    nativeButton.setAttribute('style', originalStyle);
                if (originalFrozen == null)
                    nativeButton.removeAttribute('data-cmu-model-button-frozen');
                else
                    nativeButton.setAttribute('data-cmu-model-button-frozen', originalFrozen);
            }
            catch (_) { }
        };
    }
    async function compactModelHiddenSnapshotForSelection(nativeButton) {
        if (!(nativeButton instanceof HTMLElement) || !nativeButton.isConnected)
            return null;
        document.documentElement.classList.add('cmu-compact-model-selecting');

        let snapshot = compactModelSnapshot();
        if (!snapshot?.entries?.length) {
            if (nativeButton.getAttribute('aria-expanded') !== 'true')
                compactModelClickOnce(nativeButton);
            snapshot = await waitForCompactModelSnapshot(COMPACT_MODEL.seq, nativeButton);
        }

        if (snapshot?.shell instanceof HTMLElement)
            snapshot.shell.setAttribute('data-cmu-compact-model-native', '1');
        return snapshot;
    }
    function compactModelParkNativeMenu(nativeButton, shell) {
        if (!(nativeButton instanceof HTMLElement))
            return;
        try { shell?.setAttribute?.('data-cmu-compact-model-native', '1'); } catch (_) { }
        // Crack 상단 모델 버튼은 원본 메뉴 open 상태에서 위치/폭이 바뀔 수 있다.
        // 스냅샷만 얻은 즉시 원본 메뉴를 닫아서 상단 배치를 원래대로 돌린다.
        compactModelDispatchEscape(shell);
        setTimeout(() => {
            try {
                if (nativeButton.getAttribute('aria-expanded') === 'true')
                    compactModelClickOnce(nativeButton);
            }
            catch (_) { }
        }, 70);
        setTimeout(() => {
            try {
                if (nativeButton.getAttribute('aria-expanded') !== 'true')
                    shell?.removeAttribute?.('data-cmu-compact-model-native');
            }
            catch (_) { }
        }, 260);
    }
    function bindCompactModelPickerEvents() {
        COMPACT_MODEL.outsideHandler = event => {
            if (!event.isTrusted)
                return;
            const target = event.target;
            if (target instanceof Node &&
                (COMPACT_MODEL.menu?.contains(target) || COMPACT_MODEL.anchor?.contains(target)))
                return;
            closeCompactModelPicker({ closeNative: true });
        };
        COMPACT_MODEL.keyHandler = event => {
            if (event.key !== 'Escape')
                return;
            // 4.5.0.4.10:
            // 원본 Crack 모델 메뉴를 뒤에서 닫기 위해 코드가 만든 synthetic Escape는
            // 소형 모델 팝업을 닫으면 안 된다. 실제 사용자가 누른 Escape만 처리한다.
            if (!event.isTrusted)
                return;
            event.preventDefault();
            closeCompactModelPicker({ closeNative: true });
        };
        COMPACT_MODEL.resizeHandler = () => closeCompactModelPicker({ closeNative: true });
        document.addEventListener('pointerdown', COMPACT_MODEL.outsideHandler, true);
        document.addEventListener('keydown', COMPACT_MODEL.keyHandler, true);
        window.addEventListener('resize', COMPACT_MODEL.resizeHandler, { passive: true });
        window.visualViewport?.addEventListener?.('resize', COMPACT_MODEL.resizeHandler, { passive: true });
    }
    function renderCompactModelPicker(snapshot, anchor, nativeButton) {
        const menu = document.createElement('div');
        menu.id = 'cmu-compact-model-menu';
        menu.setAttribute('role', 'listbox');
        menu.setAttribute('aria-label', '모델 빠른 선택');
        menu.style.visibility = 'hidden';
        const currentToken = compactModelCurrentToken(nativeButton, snapshot.entries);
        for (const entry of snapshot.entries) {
            const option = document.createElement('button');
            option.type = 'button';
            option.setAttribute('role', 'option');
            option.setAttribute('aria-selected', entry.token === currentToken ? 'true' : 'false');
            option.dataset.modelToken = entry.token;
            option.classList.toggle('is-selected', entry.token === currentToken);
            option.disabled = !!entry.disabled;
            const icon = document.createElement('span');
            icon.className = 'cmu-compact-model-icon';
            if (entry.iconSrc) {
                const image = document.createElement('img');
                image.src = entry.iconSrc;
                image.alt = '';
                image.decoding = 'async';
                icon.appendChild(image);
            }
            else {
                icon.textContent = '◆';
            }
            const label = document.createElement('span');
            label.className = 'cmu-compact-model-label';
            label.textContent = entry.label;
            const recommend = document.createElement('span');
            recommend.className = 'cmu-compact-model-recommend';
            recommend.textContent = '권장';
            recommend.title = '제작자 권장 모델';
            recommend.hidden = !entry.recommended;

            const check = document.createElement('span');
            check.className = 'cmu-compact-model-check';
            check.textContent = entry.token === currentToken ? '✓' : '';
            option.append(icon, label, recommend, check);
            option.addEventListener('pointerdown', event => event.stopPropagation());
            option.addEventListener('click', async event => {
                event.preventDefault();
                event.stopPropagation();
                if (option.dataset.selecting === '1')
                    return;
                option.dataset.selecting = '1';
                menu.querySelectorAll('button').forEach(button => button.disabled = true);

                // 4.5.0.4.11:
                // 실제 모델 선택을 위해 숨겨진 원본 메뉴를 잠깐 다시 여는 동안
                // Crack 상단 모델 버튼이 좌우로 재배치되지 않도록 현재 화면 좌표에 잠깐 고정한다.
                const releaseNativeButtonFreeze = compactModelFreezeNativeButton(nativeButton);
                try {
                    const freshSnapshot = await compactModelHiddenSnapshotForSelection(nativeButton);
                    const nativeShell = freshSnapshot?.shell || snapshot.shell;
                    const target = freshSnapshot?.entries?.find(candidate => candidate.token === entry.token)?.item ||
                        (entry.item?.isConnected ? entry.item : null);

                    const changed = await compactModelActivateNativeItem(target, entry.token);
                    closeCompactModelPicker({ closeNative: false, preserveNativeHidden: true });
                    if (!changed) {
                        await compactModelDismissNativeMenu(nativeButton, nativeShell);
                        showToast('모델 항목이 갱신됨 · 다시 눌러 주세요');
                        return;
                    }
                    const confirmed = await compactModelWaitForSelection(nativeButton, entry);
                    await compactModelDismissNativeMenu(nativeButton, nativeShell);
                    if (!confirmed) {
                        const actualToken = compactModelButtonToken(nativeButton);
                        showToast(actualToken && actualToken !== entry.token
                            ? '선택 모델 불일치 · 다시 눌러 주세요'
                            : '모델 선택 확인이 늦어짐 · 상단 모델명을 확인해 주세요');
                    }
                    scheduleNmfScan([120, 320, 700]);
                    setTimeout(() => {
                        scheduleDashboardUpdate(true);
                        ensureInlineBlocks();
                    }, 180);
                }
                finally {
                    // 원본 메뉴가 완전히 닫힌 뒤 한 프레임 여유를 두고 원래 레이아웃으로 복귀.
                    setTimeout(releaseNativeButtonFreeze, 90);
                }
            });
            menu.appendChild(option);
        }
        (document.body || document.documentElement).appendChild(menu);
        COMPACT_MODEL.menu = menu;
        COMPACT_MODEL.anchor = anchor;
        bindCompactModelPickerEvents();
        positionCompactModelPicker();
        requestAnimationFrame(positionCompactModelPicker);
    }
    function compactModelTokenSetOf(el) {
        return Array.from(new Set(
            nmfFlatTokensFromElement(el)
                .map(flat => nmfTokenFromFlatIconToken(flat))
                .filter(Boolean)
        ));
    }
    function compactModelLiveRowFor(item, root, token) {
        if (!(item instanceof HTMLElement) || !(root instanceof HTMLElement))
            return null;
        const wanted = String(token || '');
        let node = item;
        let best = item;
        while (node instanceof HTMLElement && node !== root && root.contains(node)) {
            const tokens = compactModelTokenSetOf(node);
            if (tokens.length === 1 && tokens[0] === wanted)
                best = node;
            else if (tokens.length > 1 || (tokens.length === 1 && tokens[0] !== wanted))
                break;
            const parent = node.parentElement;
            if (!(parent instanceof HTMLElement) || parent === root)
                break;
            const parentTokens = compactModelTokenSetOf(parent);
            if (parentTokens.length !== 1 || parentTokens[0] !== wanted)
                break;
            node = parent;
        }
        return best;
    }
    function compactModelPolishNativeLiveRow(row, entry) {
        if (!(row instanceof HTMLElement))
            return;
        const selector = 'button, [role^="menuitem"], [role="option"], [data-radix-collection-item]';
        const action = row.matches(selector) ? row : (row.querySelector(selector) || row);
        action.setAttribute('data-cmu-compact-native-live-action', '1');

        const textNodes = Array.from(row.querySelectorAll('p, span, div')).filter(el => {
            if (!(el instanceof HTMLElement))
                return false;
            const text = String(el.textContent || '').replace(/\s+/g, ' ').trim();
            if (!text)
                return false;
            return !Array.from(el.children).some(child => String(child.textContent || '').replace(/\s+/g, ' ').trim());
        });
        const wanted = compactModelNormalizeLabel(entry?.label || '');
        let title = null;
        if (wanted) {
            title = textNodes
                .map(el => ({ el, text: compactModelNormalizeLabel(el.textContent || '') }))
                .filter(item => item.text === wanted || item.text.includes(wanted) || wanted.includes(item.text))
                .sort((a, b) => Math.abs(a.text.length - wanted.length) - Math.abs(b.text.length - wanted.length))[0]?.el || null;
        }
        if (!title) {
            title = textNodes.find(el => {
                const t = String(el.textContent || '').replace(/\s+/g, ' ').trim();
                return t.length >= 3 && t.length <= 24 && !/[0-9][0-9,]*\s*개\s*$/.test(t);
            }) || null;
        }
        title?.setAttribute('data-cmu-compact-native-live-title', '1');

        textNodes.forEach(el => {
            if (el === title)
                return;
            const text = String(el.textContent || '').replace(/\s+/g, ' ').trim();
            const compact = text.replace(/\s+/g, '');
            if (!compact)
                return;
            if (/[0-9][0-9,]*개$/.test(compact) || /^\d+(?:[.,]\d+)?%$/.test(compact)) {
                el.setAttribute('data-cmu-compact-native-live-badge', '1');
                return;
            }
            if (/^(권장|추천|recommended)$/i.test(compact)) {
                el.setAttribute('data-cmu-compact-native-live-recommend', '1');
                return;
            }
            const normalized = compactModelNormalizeLabel(text);
            if (wanted && (normalized === wanted || normalized.includes(wanted) || wanted.includes(normalized)))
                return;
            if (compact.length >= 11)
                el.setAttribute('data-cmu-compact-native-live-desc', '1');
        });
    }
    function compactModelPruneNativeTree(root, rows) {
        if (!(root instanceof HTMLElement))
            return;
        const rowSet = new Set(rows.filter(row => row instanceof HTMLElement));
        const branchContainsRow = node => {
            if (!(node instanceof Element))
                return false;
            if (rowSet.has(node))
                return true;
            for (const row of rowSet) {
                if (node.contains(row))
                    return true;
            }
            return false;
        };
        const walk = node => {
            if (!(node instanceof HTMLElement) || rowSet.has(node))
                return;
            Array.from(node.children).forEach(child => {
                if (!(child instanceof HTMLElement))
                    return;
                if (!branchContainsRow(child)) {
                    child.setAttribute('data-cmu-compact-native-live-hide', '1');
                    return;
                }
                if (!rowSet.has(child))
                    child.setAttribute('data-cmu-compact-native-live-branch', '1');
                walk(child);
            });
        };
        walk(root);
    }
    function positionCompactNativeLiveMenu() {
        const shell = COMPACT_MODEL.nativeShell;
        const anchor = COMPACT_MODEL.anchor;
        if (!(shell instanceof HTMLElement) || !(anchor instanceof HTMLElement) || !shell.isConnected || !anchor.isConnected)
            return;
        const vv = window.visualViewport;
        const viewportLeft = Number(vv?.offsetLeft || 0);
        const viewportTop = Number(vv?.offsetTop || 0);
        const viewportWidth = Math.max(1, Number(vv?.width || window.innerWidth || 1));
        const viewportHeight = Math.max(1, Number(vv?.height || window.innerHeight || 1));
        const rect = anchor.getBoundingClientRect();
        const width = Math.min(176, Math.max(142, viewportWidth - 18));
        const root = shell.matches?.('[data-radix-menu-content]') ? shell : shell.querySelector?.('[data-radix-menu-content]');
        const spaceAbove = Math.max(0, rect.top - viewportTop - 8);
        const spaceBelow = Math.max(0, viewportTop + viewportHeight - rect.bottom - 8);

        /* 4.3.0.9: 켜진 모델 수가 많아도 286px로 잘라 버리지 않는다.
           실제 목록의 전체 높이를 먼저 구한 뒤, 위/아래 중 전체 목록이 들어가는 쪽을 우선한다.
           어느 쪽에도 전부 안 들어갈 때만 더 넓은 쪽을 사용하고 그때만 내부 스크롤한다. */
        const naturalHeight = Math.max(40, Number(root?.scrollHeight || shell.scrollHeight || 0));
        let placeAbove;
        if (spaceAbove >= naturalHeight)
            placeAbove = true;
        else if (spaceBelow >= naturalHeight)
            placeAbove = false;
        else
            placeAbove = spaceAbove >= spaceBelow;
        const sideSpace = placeAbove ? spaceAbove : spaceBelow;
        const available = Math.max(88, Math.min(naturalHeight, sideSpace));
        root?.style?.setProperty?.('--cmu-compact-native-max-h', `${Math.round(available)}px`);
        shell.style.setProperty('position', 'fixed', 'important');
        shell.style.setProperty('width', `${Math.round(width)}px`, 'important');
        shell.style.setProperty('max-width', `${Math.round(width)}px`, 'important');
        shell.style.setProperty('right', 'auto', 'important');
        shell.style.setProperty('bottom', 'auto', 'important');
        shell.style.setProperty('transform', 'none', 'important');
        shell.style.setProperty('z-index', '2147483647', 'important');
        const measuredHeight = Math.min(naturalHeight, available);
        let top = placeAbove ? rect.top - measuredHeight - 8 : rect.bottom + 8;
        top = Math.max(viewportTop + 8, Math.min(top, viewportTop + viewportHeight - measuredHeight - 8));
        let left = rect.left;
        left = Math.max(viewportLeft + 8, Math.min(left, viewportLeft + viewportWidth - width - 8));
        shell.style.setProperty('left', `${Math.round(left)}px`, 'important');
        shell.style.setProperty('top', `${Math.round(top)}px`, 'important');
    }
    function compactModelUseNativeRows(snapshot, anchor, nativeButton) {
        if (!snapshot?.entries?.length || !(snapshot.root instanceof HTMLElement) || !(snapshot.shell instanceof HTMLElement))
            return false;
        const { root, shell } = snapshot;
        compactModelClearNativeLiveMarks();
        shell.removeAttribute('data-cmu-compact-model-native');
        shell.setAttribute('data-cmu-compact-native-live', '1');
        root.setAttribute('data-cmu-compact-native-live-root', '1');
        const rows = [];
        const rowSeen = new Set();
        snapshot.entries.forEach(entry => {
            const row = compactModelLiveRowFor(entry.item, root, entry.token);
            if (!(row instanceof HTMLElement) || rowSeen.has(row))
                return;
            rowSeen.add(row);
            row.setAttribute('data-cmu-compact-native-live-row', '1');
            row.dataset.cmuCompactModelToken = entry.token;
            compactModelPolishNativeLiveRow(row, entry);
            rows.push(row);
        });
        if (!rows.length) {
            compactModelClearNativeLiveMarks(shell);
            return false;
        }
        compactModelPruneNativeTree(root, rows);
        COMPACT_MODEL.nativeShell = shell;
        COMPACT_MODEL.nativeButton = nativeButton;
        COMPACT_MODEL.anchor = anchor;
        positionCompactNativeLiveMenu();
        requestAnimationFrame(positionCompactNativeLiveMenu);
        setTimeout(positionCompactNativeLiveMenu, 60);
        setTimeout(positionCompactNativeLiveMenu, 180);

        const onActualNativeChoice = event => {
            const row = event.target?.closest?.('[data-cmu-compact-native-live-row="1"]');
            if (!row || !root.contains(row))
                return;
            setTimeout(() => {
                compactModelClearNativeLiveMarks(shell);
                if (COMPACT_MODEL.nativeShell === shell) {
                    COMPACT_MODEL.nativeShell = null;
                    COMPACT_MODEL.nativeButton = null;
                    COMPACT_MODEL.anchor = null;
                }
                scheduleNmfScan([80, 220, 520]);
                scheduleDashboardUpdate(true);
                ensureInlineBlocks();
            }, 80);
        };
        root.addEventListener('click', onActualNativeChoice, { capture: true, once: true });
        return true;
    }
    function compactModelSnapshotFromKnownLabels() {
        /*
         * 4.3.0.17: 원본 모델 아이콘 이미지가 늦게 붙어도 텍스트 행은 먼저 생기는 경우가 있다.
         * 기존 스냅샷은 model-icon URL이 생길 때까지 기다렸기 때문에 모바일에서 체감 지연이 컸다.
         * 이전에 한 번이라도 확인한 모델 라벨을 이용해 텍스트 행만으로도 즉시 스냅샷을 만든다.
         */
        const knownMap = new Map();
        const seen = nmfLoadSeen();
        const registry = cmiLoadRegistry();
        const tokens = new Set([...Object.keys(seen || {}), ...Object.keys(registry || {})]);
        for (const token of tokens) {
            const label = nmfSeenLabelOf(seen, token) || registry?.[token]?.label || cmiAutoLabel(token) || token;
            const normalized = compactModelNormalizeLabel(label);
            if (normalized.length >= 2)
                knownMap.set(token, { token, label, normalized });
        }
        if (!knownMap.size)
            return null;

        const roots = Array.from(document.querySelectorAll('[data-radix-menu-content]')).filter(root => {
            if (!(root instanceof HTMLElement) || !root.isConnected || root.getAttribute('data-state') === 'closed')
                return false;
            const shell = root.closest('[data-radix-popper-content-wrapper]') || root;
            if (shell?.getAttribute?.('data-state') === 'closed')
                return false;
            try {
                const style = getComputedStyle(shell);
                return style.display !== 'none' && style.visibility !== 'hidden';
            }
            catch (_) {
                return true;
            }
        });
        let best = null;
        for (const root of roots) {
            const shell = root.closest('[data-radix-popper-content-wrapper]') || root;
            const entries = [];
            const used = new Set();
            const rows = Array.from(root.querySelectorAll('[role^="menuitem"], [data-radix-collection-item], [role="option"], button, li, a'));
            for (const row of rows) {
                if (!(row instanceof HTMLElement) || !row.isConnected)
                    continue;
                let rowText = '';
                try {
                    rowText = compactModelNormalizeLabel(getClickableLabelLite(row));
                }
                catch (_) { }
                if (!rowText)
                    continue;
                const matches = Array.from(knownMap.values())
                    .filter(item => !used.has(item.token) && rowText.includes(item.normalized))
                    .sort((a, b) => b.normalized.length - a.normalized.length);
                if (!matches.length)
                    continue;
                const match = matches[0];
                const actionItem = compactModelNativeActionTarget(row, match.token) || row;
                const selected = row.matches('[aria-checked="true"], [aria-selected="true"], [data-state="checked"]') ||
                    !!row.querySelector('[aria-checked="true"], [aria-selected="true"], [data-state="checked"]');
                const disabled = row.matches('[aria-disabled="true"], :disabled') || actionItem.matches('[aria-disabled="true"], :disabled') ||
                    !!row.querySelector('[aria-disabled="true"], :disabled');
                entries.push({
                    token: match.token,
                    label: match.label,
                    item: actionItem,
                    iconSrc: compactModelImageSource(row, nmfIconFlatToken(match.token)) || cmiIconUrl(match.token),
                    selected,
                    disabled,
                    recommended: compactModelRecommendedFromItem(row),
                });
                used.add(match.token);
            }
            if (entries.length && (!best || entries.length > best.entries.length))
                best = { root, shell, entries };
        }
        return best?.entries?.length >= 2 ? best : null;
    }
    function compactModelFastSnapshot() {
        return compactModelSnapshot() || compactModelSnapshotFromKnownLabels();
    }
    async function waitForCompactModelSnapshot(seq, nativeButton = null) {
        /*
         * 4.3.0.17: 고정 sleep 누적 대신 DOM Mutation + 짧은 rAF 폴링으로
         * 모델 행이 생기는 바로 그 프레임에 잡는다. 보통 수십 ms 안에 완료된다.
         * 원본 메뉴를 사용자에게 폴백으로 노출하지 않기 때문에 오래 기다리지 않는다.
         */
        const immediate = compactModelFastSnapshot();
        if (immediate?.entries?.length)
            return immediate;
        return await new Promise(resolve => {
            let finished = false;
            let observer = null;
            let raf = 0;
            let timeout = 0;
            const startedAt = performance.now();
            const finish = value => {
                if (finished)
                    return;
                finished = true;
                try { observer?.disconnect?.(); } catch (_) { }
                if (raf)
                    cancelAnimationFrame(raf);
                if (timeout)
                    clearTimeout(timeout);
                resolve(value || null);
            };
            const check = () => {
                if (finished)
                    return;
                if (seq !== COMPACT_MODEL.seq) {
                    finish(null);
                    return;
                }
                const snapshot = compactModelFastSnapshot();
                if (snapshot?.entries?.length) {
                    finish(snapshot);
                    return;
                }
                if (performance.now() - startedAt >= 1250) {
                    finish(null);
                    return;
                }
                raf = requestAnimationFrame(check);
            };
            try {
                observer = new MutationObserver(check);
                observer.observe(document.body || document.documentElement, {
                    childList: true,
                    subtree: true,
                    attributes: true,
                    attributeFilter: ['src', 'srcset', 'style', 'data-state', 'aria-expanded', 'aria-selected', 'aria-checked']
                });
            }
            catch (_) { }
            raf = requestAnimationFrame(check);
            timeout = setTimeout(() => finish(null), 1300);
        });
    }
    async function openCompactModelPicker() {
        const anchor = document.getElementById('chud-model-btn');
        const nativeButton = getNativeModelMenuButton();
        if (!(anchor instanceof HTMLElement) || !(nativeButton instanceof HTMLElement)) {
            showToast('모델 버튼을 찾지 못함');
            return false;
        }

        /* 4.3.0.10: 빠른 연속 탭이 비동기 open 과정을 두 번 시작하면
           원본 Radix 버튼이 open→close→open으로 다시 토글되며 큰 원본 메뉴가
           새어 나올 수 있다. 열기 진행 중/직후의 중복 탭은 무시한다. */
        const now = Date.now();
        if (COMPACT_MODEL.opening || now < Number(COMPACT_MODEL.toggleLockUntil || 0))
            return true;

        // 4.5.0.4.8: Crack 모델 메뉴 DOM/UI 변경 대응.
        // 사이트 원본 팝업을 직접 축소해서 쓰면 원본 min-height/viewport 스타일이 섞여
        // 긴 빈 박스가 생길 수 있으므로, 화면에는 독립 소형 선택기만 사용한다.
        if (COMPACT_MODEL.menu?.isConnected) {
            COMPACT_MODEL.toggleLockUntil = now + 220;
            closeCompactModelPicker({ closeNative: true });
            return true;
        }
        const liveShell = COMPACT_MODEL.nativeShell;
        if (liveShell?.isConnected && liveShell.hasAttribute('data-cmu-compact-native-live') &&
            compactModelNativeIsOpen(nativeButton, liveShell)) {
            COMPACT_MODEL.toggleLockUntil = now + 220;
            closeCompactModelPicker({ closeNative: true });
            return true;
        }

        COMPACT_MODEL.opening = true;
        COMPACT_MODEL.toggleLockUntil = now + 180;
        let releaseOpenButtonFreeze = null;
        try {
            compactModelClearNativeLiveMarks(liveShell?.isConnected ? liveShell : null);
            COMPACT_MODEL.nativeShell = null;
            COMPACT_MODEL.nativeButton = null;
            COMPACT_MODEL.anchor = null;

            const seq = ++COMPACT_MODEL.seq;
            COMPACT_MODEL.anchor = anchor;
            COMPACT_MODEL.nativeButton = nativeButton;
            let snapshot = compactModelSnapshot();
            if (!snapshot) {
                document.documentElement.classList.add('cmu-compact-model-probing');
                releaseOpenButtonFreeze = compactModelFreezeNativeButton(nativeButton);
                if (!compactModelClickOnce(nativeButton)) {
                    document.documentElement.classList.remove('cmu-compact-model-probing');
                    COMPACT_MODEL.nativeButton = COMPACT_MODEL.anchor = null;
                    showToast('모델 메뉴를 열지 못함');
                    return false;
                }
                scheduleNmfScan([40, 100, 220, 450, 900]);
                snapshot = await waitForCompactModelSnapshot(seq, nativeButton);
            }
            if (seq !== COMPACT_MODEL.seq)
                return true;
            document.documentElement.classList.remove('cmu-compact-model-probing');
            if (!snapshot?.entries?.length) {
                /* 4.3.0.17: 원본 모델 메뉴는 폴백으로 노출하지 않는다.
                 * probing 상태를 유지한 채 원본 Radix 메뉴를 닫고 빠른 선택기만 유지한다. */
                try {
                    await compactModelDismissNativeMenu(nativeButton, null);
                }
                catch (_) { }
                document.documentElement.classList.remove('cmu-compact-model-probing');
                COMPACT_MODEL.nativeButton = COMPACT_MODEL.anchor = null;
                COMPACT_MODEL.toggleLockUntil = Date.now() + 220;
                showToast('모델 목록 로딩이 늦어짐 · 다시 눌러 주세요');
                return true;
            }
            nmfScanNativeModelMenu();

            /* 4.5.0.4.8
             * Crack 사이트의 원본 모델 메뉴 레이아웃이 바뀌면서 native shell/root에
             * 큰 고정 높이·viewport 영역이 붙는 경우가 생겼다.
             * 원본 행을 화면에 직접 재사용하지 않고, 원본 메뉴는 투명하게 숨긴 채
             * 독립 소형 선택기(#cmu-compact-model-menu)만 표시한다.
             * 실제 모델 변경은 기존처럼 snapshot의 원본 행을 클릭하므로 기능은 유지된다. */
            try {
                compactModelClearNativeLiveMarks(snapshot.shell);
                snapshot.shell?.setAttribute?.('data-cmu-compact-model-native', '1');
                renderCompactModelPicker(snapshot, anchor, nativeButton);
                COMPACT_MODEL.nativeShell = snapshot.shell;
                COMPACT_MODEL.nativeButton = nativeButton;
                COMPACT_MODEL.anchor = anchor;
                COMPACT_MODEL.toggleLockUntil = Date.now() + 160;

                // 원본 모델 메뉴는 목록 정보만 읽고 즉시 닫는다.
                // 이렇게 해야 Crack 업데이트 후 상단 모델 버튼 위치가 열림 상태 스타일에 끌려가지 않는다.
                compactModelParkNativeMenu(nativeButton, snapshot.shell);
                if (releaseOpenButtonFreeze) {
                    const release = releaseOpenButtonFreeze;
                    releaseOpenButtonFreeze = null;
                    setTimeout(release, 320);
                }
            }
            catch (_) {
                try { await compactModelDismissNativeMenu(nativeButton, snapshot.shell); } catch (_) { }
                COMPACT_MODEL.nativeShell = COMPACT_MODEL.nativeButton = COMPACT_MODEL.anchor = null;
                showToast('모델 목록을 불러오지 못함 · 다시 눌러 주세요');
            }
            return true;
        }
        finally {
            COMPACT_MODEL.opening = false;
            if (releaseOpenButtonFreeze) {
                const release = releaseOpenButtonFreeze;
                releaseOpenButtonFreeze = null;
                setTimeout(release, 320);
            }
        }
    }
    function openNativeOutputSettings({ silent = false } = {}) {
        if (!shouldRun() || !isChatRoomPath())
            return false;
        // The native room panel remains mounted while hidden on mobile.
        // Its dedicated trigger opens the same modal without expanding the panel.
        const direct = document.getElementById('max-output-modal-menu-button');
        const usable = el => el instanceof HTMLElement && el.isConnected &&
            !el.matches(':disabled, [aria-disabled="true"]') && !isOwnElement(el) &&
            !el.closest('[data-message-group-id]');
        let trigger = usable(direct) ? direct : null;
        if (!trigger) {
            const labels = /^(?:답변\s*길이\s*및\s*생각\s*조절|출력량(?:\s*조절)?)$/;
            trigger = Array.from(document.querySelectorAll('main button, main [role="button"]')).find(el =>
                usable(el) && visibleClickable(el) &&
                [el.textContent, el.getAttribute('aria-label'), el.getAttribute('title')]
                    .some(value => labels.test(String(value || '').replace(/\s+/g, ' ').trim()))
            ) || null;
        }
        if (!trigger) {
            if (!silent)
                showToast('답변 길이 및 생각 조절 버튼을 찾지 못했어요');
            return false;
        }
        trigger.click();
        return true;
    }
    function openNativeModelMenu() {
        const btn = getNativeModelMenuButton();
        if (btn) {
            const ok = fireClickSequence(btn);
            scheduleNmfScan([120, 300, 700, 1100]);
            return ok;
        }
        showToast('모델 버튼 못 찾음');
        return false;
    }
    function openLoreToolsDirectly() {
        try {
            const w = typeof unsafeWindow !== 'undefined' && unsafeWindow ? unsafeWindow : window;
            const mm = w.ModalManager || window.ModalManager;
            if (mm && typeof mm.getOrCreateManager === 'function') {
                const modal = mm.getOrCreateManager('c2');
                if (modal && typeof modal.display === 'function') {
                    modal.display(document.body.getAttribute('data-theme') !== 'light');
                    return true;
                }
            }
        }
        catch (_) { }
        return false;
    }
    function tryOpenLoreToolsLite() {
        const exactEntry = document.getElementById('lore-inj-entry-button') || document.querySelector('[data-lore-inj-entry="true"]');
        if (exactEntry)
            return fireClickSequence(exactEntry);
        const w = getPublicWindow();
        if ((w.__LoreInj?.__uiLoaded || window.__LoreInj?.__uiLoaded) && openLoreToolsDirectly())
            return true;
        const burner = Array.from(document.querySelectorAll('.burner-button, [class*="burner-button"], button, [role="button"], a'))
            .find(el => {
            if (!el || isOwnElement(el))
                return false;
            const hay = [el.textContent, el.getAttribute?.('aria-label'), el.getAttribute?.('title'), el.getAttribute?.('data-tooltip'), el.getAttribute?.('data-label')].join(' ');
            return /Chasm Tools|결정화 캐즘|로어|\bLore\b/i.test(hay) && visibleClickable(el.closest?.('button, [role="button"], a') || el);
        });
        if (burner)
            return fireClickSequence(burner.closest?.('button, [role="button"], a') || burner);
        return false;
    }
    function openLoreToolsLite() {
        if (tryOpenLoreToolsLite())
            return true;
        let opened = false;
        [220, 650, 1300, 2200].forEach((ms, index, all) => setTimeout(() => {
            if (opened)
                return;
            opened = tryOpenLoreToolsLite();
            if (!opened && index === all.length - 1)
                showToast('에리 로어가 아직 준비되지 않음');
        }, ms));
        showToast('에리 로어 준비 중 · 잠시 후 자동으로 열림');
        return true;
    }
    function tryOpenExternalThemeSettingsLite(kind) {
        const w = getPublicWindow();
        const names = kind === 'csp'
            ? ['CSPGeneratedBackgroundBlur']
            : ['CrackCustomRoomBackground', 'SGBDirectBackground'];
        for (const name of names) {
            try {
                const api = w?.[name] || window?.[name];
                if (api && typeof api.openSettings === 'function') {
                    api.openSettings.call(api);
                    return true;
                }
            }
            catch (_) { }
        }
        return false;
    }
    function openExternalThemeSettingsLite(kind) {
        if (tryOpenExternalThemeSettingsLite(kind))
            return true;
        const label = kind === 'csp' ? 'CSP 테마' : '일반 이미지 테마';
        let opened = false;
        [180, 500, 950, 1500].forEach((ms, index, all) => setTimeout(() => {
            if (opened)
                return;
            opened = tryOpenExternalThemeSettingsLite(kind);
            if (!opened && index === all.length - 1)
                showToast(`${label} 설정창을 열지 못함`);
        }, ms));
        showToast(`${label} 준비 중 · 잠시 후 자동으로 열림`);
        return true;
    }
    function makeSideButton(key, id, title, icon, onclick) {
        const b = document.createElement('button');
        b.id = id;
        b.className = 'chud-action-btn';
        b.type = 'button';
        b.tabIndex = -1;
        b.title = title;
        b.setAttribute('aria-label', title);
        b.dataset.sideKey = key;
        b.innerHTML = icon;
        b.addEventListener('pointerdown', e => e.preventDefault());
        b.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();
            onclick();
        });
        return b;
    }
    function ensureDashboardSidebar(shell, input = findChatInput()) {
        if (!isChatRoomPath() || !shell || !hasMiniSidebarButtons()) {
            removeDashboardSidebar();
            return;
        }
        let bar = document.getElementById(ID.dashboardSidebar);
        if (!bar) {
            bar = document.createElement('div');
            bar.id = ID.dashboardSidebar;
            const content = document.createElement('div');
            content.id = 'chud-side-content';
            DASH_SIDE.content = content;
            const buttons = {
                modelButton: makeSideButton('modelButton', 'chud-model-btn', '모델 빠른 선택', SIDE_ICON.model, openCompactModelPicker),
                guideButton: makeSideButton('guideButton', 'chud-guide-btn', '플레이 가이드', SIDE_ICON.guide, () => clickFirst([/플레이\s*가이드/, /가이드/], '플레이 가이드')),
                profileButton: makeSideButton('profileButton', 'chud-native-profile-btn', '크랙 기본 프로필', SIDE_ICON.profile, () => clickFirst([/대화\s*프로필/, /프로필/], '대화 프로필')),
                profileBoxButton: makeSideButton('profileBoxButton', 'chud-profile-box-btn', '프로필 박스', SIDE_ICON.profileBox, openProfileBoxLite),
                noteButton: makeSideButton('noteButton', 'chud-note-btn', '유저 노트', SIDE_ICON.note, () => clickFirst([/유저\s*노트/, /노트/], '유저 노트')),
                outputButton: makeSideButton('outputButton', 'chud-output-btn', '답변 길이 및 생각 조절', SIDE_ICON.output, openOutputSettingsLite),
                summaryButton: makeSideButton('summaryButton', 'chud-summary-btn', '요약 메모리', SIDE_ICON.summary, openSummaryMemoryLite),
                imageButton: makeSideButton('imageButton', 'chud-image-btn', '이미지 ON/OFF', SIDE_ICON.image, openNativeSituationImageToggleLite),
                archiveButton: makeSideButton('archiveButton', 'chud-archive-btn', '이미지 보관함', SIDE_ICON.archive, () => clickFirst([/이미지\s*보관함/], '이미지 보관함')),
                roomBackgroundButton: makeSideButton('roomBackgroundButton', 'chud-room-bg-btn', '일반 이미지 테마 설정', SIDE_ICON.roomBackground, () => openExternalThemeSettingsLite('custom-room')),
                scenePainterButton: makeSideButton('scenePainterButton', 'chud-scene-painter-btn', 'AI 삽화 생성 · 모바일 Scene Painter', SIDE_ICON.scenePainter, openMobileScenePainterLite),
                wishManagerButton: makeSideButton('wishManagerButton', 'chud-wish-manager-btn', 'Wish RP Manager', SIDE_ICON.wishManager, openWishRpManagerLite),
                sceneBlurButton: makeSideButton('sceneBlurButton', 'chud-scene-blur-btn', 'CSP 테마 설정', SIDE_ICON.sceneBlur, () => openExternalThemeSettingsLite('csp')),
                startButton: makeSideButton('startButton', 'chud-start-btn', '시작 설정', SIDE_ICON.start, openStartSettingLite),
                loreButton: makeSideButton('loreButton', 'chud-lore-btn', '에리 로어', SIDE_ICON.lore, openLoreToolsLite),
                translatorButton: makeSideButton('translatorButton', 'chud-translator-btn', '초월 번역기', SIDE_ICON.translator, openTranslatorLite),
                aiSummaryButton: makeSideButton('aiSummaryButton', 'chud-ai-summary-btn', 'AI 요약', SIDE_ICON.aiSummary, openAiSummaryLite),
                gameHudButton: makeSideButton('gameHudButton', 'chud-game-hud-btn', '게임 HUD', SIDE_ICON.gameHud, openGameHudLite),
            };
            // Profile Box 1.2.x는 기존 프로필 버튼을 외부 런처로 가로채므로,
            // 크랙 기본 프로필은 해당 선택자에서 분리하고 전용 프로필 박스 버튼만 연동한다.
            buttons.profileButton.dataset.sideKey = 'nativeProfileButton';
            buttons.profileBoxButton.dataset.cpmExternalProfileLauncher = 'true';
            DASH_SIDE.btns = buttons;
            content.append(buttons.modelButton, buttons.guideButton, buttons.profileButton, buttons.profileBoxButton, buttons.noteButton, buttons.outputButton, buttons.summaryButton, buttons.imageButton, buttons.archiveButton, buttons.roomBackgroundButton, buttons.scenePainterButton, buttons.wishManagerButton, buttons.sceneBlurButton, buttons.startButton, buttons.loreButton, buttons.translatorButton, buttons.aiSummaryButton, buttons.gameHudButton);
            bar.append(content);
        }
        if (bar.parentElement !== shell)
            shell.insertBefore(bar, shell.firstChild || null);
        DASH_SIDE.el = bar;
        refreshSideAvailability();
        applySideVisible();
        applyDashboardLayout(shell, input);
    }
    function removeDashboardSidebar() {
        closeCompactModelPicker({ closeNative: true });
        document.getElementById(ID.dashboardSidebar)?.remove();
        document.getElementById('chud-side-menu')?.remove();
        DASH_SIDE.el = DASH_SIDE.content = DASH_SIDE.menu = DASH_SIDE.settingsBtn = null;
        DASH_SIDE.btns = {};
    }
    function applySideVisible() {
        const visible = sideLoadVisible();
        const available = DASH_SIDE.available || refreshSideAvailability();
        Object.entries(DASH_SIDE.btns || {}).forEach(([key, btn]) => {
            if (!btn)
                return;
            const isAvailable = available[key] !== false;
            const isUserVisible = visible[key] !== false;
            btn.style.display = (isAvailable && isUserVisible) ? 'inline-flex' : 'none';
        });
        DASH_SIDE.menu?.querySelectorAll('.chud-menu-row[data-part], .chud-menu-row').forEach(row => {
            const input = row.querySelector?.('input[data-part]');
            const key = input?.dataset?.part || row.dataset?.part;
            if (!key)
                return;
            row.style.display = available[key] !== false ? 'flex' : 'none';
        });
    }
    function syncSideMenu() {
        const visible = sideLoadVisible();
        DASH_SIDE.menu?.querySelectorAll('input[data-part]').forEach(i => { i.checked = visible[i.dataset.part] !== false; });
    }
    function dashLoadObj(key, fallback) {
        try {
            return { ...fallback, ...JSON.parse(localStorage.getItem(key) || '{}') };
        }
        catch (_) {
            return { ...fallback };
        }
    }
    function dashSaveObj(key, value) { try {
        localStorage.setItem(key, JSON.stringify(value));
    }
    catch (_) { } }
    function dashFmt(n) { return Number(n || 0).toLocaleString('ko-KR'); }
    function getDashDetail() {
        if (!DASH.detail)
            DASH.detail = dashLoadObj(DASH.detailKey, { turn: false, cumulative: false, deducted: false, cracker: false });
        return DASH.detail;
    }
    function getDashVisible() {
        if (!DASH.visible)
            DASH.visible = dashLoadObj(DASH.visibleKey, { turn: true, cumulative: true, deducted: true, cracker: true });
        return DASH.visible;
    }
    const DASH_SCROLL = {
        input: null,
        shell: null,
        raf: 0,
    };
    function resetDashboardBarMotion() {
        for (const bar of [
            document.getElementById(ID.dashboardSidebar),
            document.getElementById(ID.dashboard),
        ]) {
            if (!bar)
                continue;
            bar.style.removeProperty('transform');
            bar.style.removeProperty('clip-path');
            bar.style.removeProperty('visibility');
        }
    }
    function applyDashboardBarScroll(bar, scrollTop) {
        if (!bar || !DASH_SCROLL.shell || bar.parentElement !== DASH_SCROLL.shell)
            return;
        const baseTop = parseFloat(bar.style.top) || 0;
        const height = Math.max(1, bar.offsetHeight || 1);
        const clippedTop = Math.max(0, scrollTop - baseTop);
        bar.style.transform = `translate3d(0, ${-scrollTop}px, 0)`;
        if (clippedTop <= 0) {
            bar.style.clipPath = 'none';
            bar.style.visibility = '';
        }
        else if (clippedTop >= height) {
            bar.style.clipPath = 'inset(100% 0 0 0)';
            bar.style.visibility = 'hidden';
        }
        else {
            bar.style.clipPath = `inset(${clippedTop}px 0 0 0)`;
            bar.style.visibility = '';
        }
    }
    function syncDashboardBarsToInputScroll() {
        DASH_SCROLL.raf = 0;
        const { input, shell } = DASH_SCROLL;
        if (!input || !shell || !input.isConnected || !shell.isConnected) {
            resetDashboardBarMotion();
            return;
        }
        const scrollTop = Math.max(0, Number(input.scrollTop) || 0);
        applyDashboardBarScroll(document.getElementById(ID.dashboardSidebar), scrollTop);
        applyDashboardBarScroll(document.getElementById(ID.dashboard), scrollTop);
    }
    function scheduleDashboardScrollSync() {
        if (DASH_SCROLL.raf)
            return;
        DASH_SCROLL.raf = requestAnimationFrame(syncDashboardBarsToInputScroll);
    }
    function stopDashboardScrollSync() {
        if (DASH_SCROLL.input) {
            DASH_SCROLL.input.removeEventListener('scroll', scheduleDashboardScrollSync);
        }
        if (DASH_SCROLL.raf)
            cancelAnimationFrame(DASH_SCROLL.raf);
        DASH_SCROLL.input = null;
        DASH_SCROLL.shell = null;
        DASH_SCROLL.raf = 0;
        resetDashboardBarMotion();
    }
    function startDashboardScrollSync(input, shell) {
        if (!input || !shell)
            return;
        if (DASH_SCROLL.input !== input || DASH_SCROLL.shell !== shell) {
            stopDashboardScrollSync();
            DASH_SCROLL.input = input;
            DASH_SCROLL.shell = shell;
            DASH_SCROLL.input.addEventListener('scroll', scheduleDashboardScrollSync, { passive: true });
        }
        scheduleDashboardScrollSync();
    }
    const DASH_LAYOUT = { input: null, styles: new Map() };
    function resetDashboardLayout(input = DASH_LAYOUT.input || findChatInput()) {
        stopDashboardScrollSync();
        if (!input || DASH_LAYOUT.input !== input)
            return;
        for (const [prop, snapshot] of DASH_LAYOUT.styles) {
            if (input.style.getPropertyValue(prop) !== snapshot.applied || input.style.getPropertyPriority(prop) !== 'important')
                continue;
            if (snapshot.value)
                input.style.setProperty(prop, snapshot.value, snapshot.priority);
            else
                input.style.removeProperty(prop);
        }
        delete input.dataset.cmuDashboardAdjusted;
        DASH_LAYOUT.input = null;
        DASH_LAYOUT.styles.clear();
    }
    function setStyleIfChanged(el, prop, value, important = false) {
        if (!el || (el.style.getPropertyValue(prop) === value && el.style.getPropertyPriority(prop) === (important ? 'important' : '')))
            return;
        el.style.setProperty(prop, value, important ? 'important' : '');
    }
    function applyDashboardLayout(shell, input = findChatInput()) {
        if (!shell || !input)
            return;
        const bar = document.getElementById(ID.dashboard);
        const sidebar = document.getElementById(ID.dashboardSidebar);
        const hasBar = !!(bar && bar.parentElement === shell);
        const hasSidebar = !!(sidebar && sidebar.parentElement === shell);
        if (!hasBar && !hasSidebar) {
            resetDashboardLayout(input);
            return;
        }
        let padL = 12;
        try {
            padL = parseFloat(getComputedStyle(input).paddingLeft) || 12;
        }
        catch (_) { }
        if (sidebar) {
            setStyleIfChanged(sidebar, '--cmu-dashboard-pad-left', `${padL}px`);
            setStyleIfChanged(sidebar, 'top', '0px');
            setStyleIfChanged(sidebar, 'padding-left', `${padL}px`);
        }
        if (bar) {
            setStyleIfChanged(bar, '--cmu-dashboard-pad-left', `${padL}px`);
            setStyleIfChanged(bar, 'top', hasSidebar ? '24px' : '1px');
            setStyleIfChanged(bar, 'padding-left', `${padL}px`);
        }
        let pad = 6;
        if (hasSidebar)
            pad += 24;
        if (hasBar)
            pad += 22;
        if (DASH_LAYOUT.input !== input) {
            resetDashboardLayout();
            DASH_LAYOUT.input = input;
        }
        for (const [prop, value] of [['padding-top', `${pad}px`], ['min-height', `${pad + 40}px`]]) {
            const previous = DASH_LAYOUT.styles.get(prop);
            if (!previous || input.style.getPropertyValue(prop) !== previous.applied || input.style.getPropertyPriority(prop) !== 'important')
                DASH_LAYOUT.styles.set(prop, { value: input.style.getPropertyValue(prop), priority: input.style.getPropertyPriority(prop), applied: value });
            DASH_LAYOUT.styles.get(prop).applied = value;
            setStyleIfChanged(input, prop, value, true);
        }
        input.dataset.cmuDashboardAdjusted = '1';
        startDashboardScrollSync(input, shell);
    }
    function ensureDashboard(shell, input = findChatInput()) {
        if (!isChatRoomPath()) {
            document.getElementById(ID.dashboard)?.remove();
            document.getElementById('chud-info-menu')?.remove();
            resetDashboardLayout(input);
            return;
        }
        let bar = document.getElementById(ID.dashboard);
        if (!bar) {
            bar = document.createElement('div');
            bar.id = ID.dashboard;
            bar.addEventListener('pointerdown', () => { DASH.touchHold = true; }, true);
            const releaseHold = () => {
                if (!DASH.touchHold)
                    return;
                DASH.touchHold = false;
                if (DASH.renderPending) {
                    DASH.renderPending = false;
                    setTimeout(() => { DASH.lastHtml = ''; renderDashboardParts(); }, 60);
                }
            };
            bar.addEventListener('pointerup', releaseHold, true);
            bar.addEventListener('pointercancel', releaseHold, true);
            bar.addEventListener('pointerleave', releaseHold, true);
            DASH.textSpan = document.createElement('span');
            DASH.textSpan.id = 'chud-info-text';
            DASH.textSpan.addEventListener('click', (e) => {
                const part = e.target.closest('.chud-part');
                if (!part || part.dataset.part === 'deducted')
                    return;
                const detail = getDashDetail();
                detail[part.dataset.part] = !detail[part.dataset.part];
                dashSaveObj(DASH.detailKey, detail);
                DASH.lastHtml = '';
                renderDashboardParts();
            });
            bar.append(DASH.textSpan);
        }
        else {
            DASH.textSpan = bar.querySelector('#chud-info-text');
        }
        if (bar.parentElement !== shell)
            shell.insertBefore(bar, shell.firstChild || null);
        DASH.el = bar;
        const currentChatId = getChatId();
        if (currentChatId && DASH.state.chatId && DASH.state.chatId !== currentChatId)
            clearDashboardForRoom(currentChatId);
        applyDashboardLayout(shell, input);
        scheduleDashboardUpdate(true);
    }
    function syncDashMenu() {
        const visible = getDashVisible();
        DASH.menu?.querySelectorAll('input[data-part]').forEach(i => { i.checked = visible[i.dataset.part] !== false; });
    }
    const ROOM_STATS_TTL = 90 * 1000;
    const RAW_DASH_MAX_PAGES = 120;
    const DASH_LOGS_INFLIGHT = new Map();
    function rawMessageIdOf(msg) {
        return String(msg?._id || msg?.id || msg?.messageId || msg?.messageID || msg?.uuid ||
            msg?.originalMessageId || msg?.message?.id || msg?.message?._id || '');
    }
    function rawRoleOf(msg) {
        return String(msg?.role || msg?.senderType || msg?.speaker || msg?.author?.role ||
            msg?.sender?.role || msg?.message?.role || '').toLowerCase();
    }
    function isRawUserMessage(msg) {
        const role = rawRoleOf(msg);
        return role === 'user' || role === 'human' || role === 'member';
    }
    function isRawAssistantMessage(msg) {
        const role = rawRoleOf(msg);
        return role === 'assistant' || role === 'char' || role === 'character' || role === 'bot' || role === 'ai';
    }
    function isRawPrologueMessage(msg) {
        return /prologue|opening|intro/i.test(String(msg?.type || msg?.messageType || msg?.source || msg?.subType || msg?.message?.type || ''));
    }
    function pickRawMessageArray(json) {
        const candidates = [
            json?.data?.messages,
            json?.messages,
            json?.data?.items,
            json?.items,
            json?.data?.list,
            json?.list,
            json?.data,
        ];
        for (const v of candidates) {
            if (Array.isArray(v))
                return v;
        }
        return [];
    }
    function pickRawMessageCursor(json) {
        const data = json?.data && typeof json.data === 'object' ? json.data : json;
        return data?.nextCursor
            || data?.next_cursor
            || data?.next
            || data?.cursor
            || json?.nextCursor
            || json?.next_cursor
            || '';
    }
    async function fetchRawMessagePage(chatId, cursor = '') {
        return cmuSharedMessagePage(chatId, cursor);
    }
    function newestRawMessageId(rows) {
        const ids = (rows || []).map(rawMessageIdOf).filter(Boolean);
        if (!ids.length)
            return '';
        const objectIds = ids.filter(id => /^[a-f0-9]{24}$/i.test(id));
        if (objectIds.length) {
            objectIds.sort();
            return objectIds[objectIds.length - 1] || '';
        }
        return ids[0];
    }
    async function fetchRawMessagesUntilAnchor(chatId, anchorId = '', initialPage = null) {
        const rows = [];
        const seenIds = new Set();
        const seenCursors = new Set();
        let cursor = '';
        let page = 0;
        let prefetched = initialPage;
        let foundAnchor = false;
        let complete = false;
        while (page < RAW_DASH_MAX_PAGES) {
            if (!shouldRun() || getChatId() !== chatId || !settings.dashboard) throw new Error('Room scan cancelled');
            const pageData = prefetched || await fetchRawMessagePage(chatId, cursor);
            if (!shouldRun() || getChatId() !== chatId) throw new Error('Room scan cancelled');
            prefetched = null;
            const arr = Array.isArray(pageData?.arr) ? pageData.arr : [];
            const anchorIndex = anchorId ? arr.findIndex(msg => rawMessageIdOf(msg) === anchorId) : -1;
            const pageRows = anchorIndex < 0
                ? arr
                : (isObjectId(anchorId)
                    ? arr.filter(msg => {
                        const id = rawMessageIdOf(msg);
                        return isObjectId(id) && String(id).toLowerCase() > String(anchorId).toLowerCase();
                    })
                    : arr.slice(0, anchorIndex));
            if (anchorIndex >= 0)
                foundAnchor = true;
            for (const msg of pageRows) {
                const id = rawMessageIdOf(msg);
                if (id) {
                    if (seenIds.has(id))
                        continue;
                    seenIds.add(id);
                }
                rows.push(msg);
            }
            cursor = String(pageData?.cursor || '');
            page += 1;
            if (foundAnchor)
                break;
            if (!cursor || !arr.length) {
                complete = !cursor;
                break;
            }
            if (seenCursors.has(cursor))
                break;
            seenCursors.add(cursor);
            await sleep(20);
        }
        return { rows, foundAnchor, complete: complete || !cursor, pages: page };
    }
    function normalizeRoomStatsCache(raw, chatId, domCount = 0) {
        if (!raw || typeof raw !== 'object' || raw.statsVersion !== 2)
            return null;
        const officialTurnCount = Math.max(0, Math.floor(Number(raw.officialTurnCount || raw.userTurnCount || 0)));
        const totalMessages = Math.max(0, Math.floor(Number(raw.totalMessages || 0)));
        const generationCount = Math.max(0, Math.floor(Number(raw.generationCount ?? raw.persistentAi ?? raw.currentAssistantCount ?? 0)));
        return {
            chatId,
            domCount: Math.max(0, Math.floor(Number(domCount || raw.domCount || 0))),
            chatCounts: Math.max(0, Math.floor(Number(raw.chatCounts ?? (officialTurnCount + 1)) || 0)),
            totalMessages,
            persistentAi: generationCount,
            generationCount,
            officialTurnCount,
            currentAssistantCount: Math.max(0, Math.floor(Number(raw.currentAssistantCount ?? 0))),
            currentPrologueCount: Math.max(0, Math.floor(Number(raw.currentPrologueCount ?? 0))),
            userTurnCount: Math.max(0, Math.floor(Number(raw.userTurnCount ?? officialTurnCount))),
            statsVersion: 2,
            complete: raw.complete === true,
            computed: raw.complete === true,
            cachedAt: Math.max(0, Number(raw.cachedAt || 0)),
            newestMessageId: String(raw.newestMessageId || ''),
            fullFetchedAt: Math.max(0, Number(raw.fullFetchedAt || 0)),
            source: raw.source || 'rawMessagesCache',
        };
    }
    function roomStatsKey(chatId) {
        return chatId ? `${DASH.roomStatsPrefix}${chatId}` : '';
    }
    function expireDashboardRoomStats(chatId) {
        if (!chatId)
            return;
        try {
            const key = roomStatsKey(chatId);
            const raw = JSON.parse(localStorage.getItem(key) || 'null');
            if (raw && typeof raw === 'object') {
                raw.cachedAt = 0;
                localStorage.setItem(key, JSON.stringify(raw));
            }
        }
        catch (_) { }
    }
    function invalidateDashboardRoomStats(chatId) {
        if (!chatId)
            return;
        try { localStorage.removeItem(roomStatsKey(chatId)); } catch (_) { }
        try { localStorage.removeItem(dashSnapshotKey(chatId)); } catch (_) { }
        if (getChatId() === chatId && DASH.state.chatId === chatId) {
            DASH.state.logs = null;
            DASH.lastHtml = '';
        }
    }
    function loadRoomStatsCache(chatId, domCount = 0) {
        if (!chatId)
            return null;
        try {
            const raw = JSON.parse(localStorage.getItem(roomStatsKey(chatId)) || 'null');
            const normalized = normalizeRoomStatsCache(raw, chatId, domCount);
            if (!normalized)
                return null;
            if (Date.now() - Number(normalized.cachedAt || 0) > ROOM_STATS_TTL)
                return null;
            return normalized;
        }
        catch (_) {
            return null;
        }
    }
    function loadRoomStatsCacheAnyAge(chatId, domCount = 0) {
        if (!chatId)
            return null;
        try {
            const raw = JSON.parse(localStorage.getItem(roomStatsKey(chatId)) || 'null');
            return normalizeRoomStatsCache(raw, chatId, domCount);
        }
        catch (_) {
            return null;
        }
    }
    function saveRoomStatsCache(chatId, result) {
        if (!shouldRun() || !chatId || !result)
            return;
        try {
            localStorage.setItem(roomStatsKey(chatId), JSON.stringify({
                statsVersion: 2,
                complete: result.complete === true,
                cachedAt: Date.now(),
                domCount: Math.max(0, Math.floor(Number(result.domCount || 0))),
                chatCounts: Math.max(0, Math.floor(Number(result.chatCounts || 0))),
                totalMessages: Math.max(0, Math.floor(Number(result.totalMessages || 0))),
                persistentAi: Math.max(0, Math.floor(Number(result.generationCount ?? result.persistentAi ?? 0))),
                generationCount: Math.max(0, Math.floor(Number(result.generationCount ?? result.persistentAi ?? 0))),
                officialTurnCount: Math.max(0, Math.floor(Number(result.officialTurnCount || 0))),
                currentAssistantCount: Math.max(0, Math.floor(Number(result.currentAssistantCount ?? 0))),
                currentPrologueCount: Math.max(0, Math.floor(Number(result.currentPrologueCount ?? 0))),
                userTurnCount: Math.max(0, Math.floor(Number(result.userTurnCount ?? result.officialTurnCount ?? 0))),
                newestMessageId: String(result.newestMessageId || ''),
                fullFetchedAt: Math.max(0, Number(result.fullFetchedAt || 0)),
                source: result.source || 'rawMessages',
            }));
        }
        catch (_) { }
    }
    function buildRawMessageStats(chatId, domCount, rows, { complete = true } = {}) {
        const userRows = rows.filter(isRawUserMessage);
        const userIds = new Set(userRows.map(rawMessageIdOf).filter(Boolean));
        const userIdlessRows = userRows.filter(msg => !rawMessageIdOf(msg)).length;
        const assistantRows = rows.filter(isRawAssistantMessage);
        const currentPrologueCount = assistantRows.filter(isRawPrologueMessage).length;
        const nonPrologueAssistants = assistantRows.filter(msg => !isRawPrologueMessage(msg));
        const userTurnCount = userIds.size + userIdlessRows;
        const officialTurnCount = userTurnCount;
        const currentAssistantCount = nonPrologueAssistants.length;
        const generationCount = currentAssistantCount;
        const result = {
            chatId,
            domCount,
            chatCounts: officialTurnCount + 1,
            totalMessages: rows.length,
            persistentAi: generationCount,
            generationCount,
            officialTurnCount,
            userTurnCount,
            currentAssistantCount,
            currentPrologueCount,
            statsVersion: 2,
            complete,
            computed: complete,
            cachedAt: Date.now(),
            newestMessageId: newestRawMessageId(rows),
            fullFetchedAt: complete ? Date.now() : 0,
            source: 'rawMessages:userUniqueTurn',
        };
        saveRoomStatsCache(chatId, result);
        return result;
    }
    function applyRawMessageDelta(chatId, domCount, stale, rows) {
        const userRows = rows.filter(isRawUserMessage);
        const userIds = new Set(userRows.map(rawMessageIdOf).filter(Boolean));
        const userIdlessRows = userRows.filter(msg => !rawMessageIdOf(msg)).length;
        const assistantRows = rows.filter(isRawAssistantMessage);
        const prologueDelta = assistantRows.filter(isRawPrologueMessage).length;
        const assistantDelta = assistantRows.length - prologueDelta;
        const userDelta = userIds.size + userIdlessRows;
        const userTurnCount = Math.max(0, Number(stale.userTurnCount ?? stale.officialTurnCount) || 0) + userDelta;
        const currentAssistantCount = Math.max(0, Number(stale.currentAssistantCount ?? stale.generationCount) || 0) + assistantDelta;
        const currentPrologueCount = Math.max(0, Number(stale.currentPrologueCount) || 0) + prologueDelta;
        const result = {
            ...stale,
            chatId,
            domCount,
            chatCounts: userTurnCount + 1,
            totalMessages: Math.max(0, Number(stale.totalMessages) || 0) + rows.length,
            persistentAi: currentAssistantCount,
            generationCount: currentAssistantCount,
            officialTurnCount: userTurnCount,
            userTurnCount,
            currentAssistantCount,
            currentPrologueCount,
            statsVersion: 2,
            complete: stale.complete === true,
            computed: stale.complete === true,
            cachedAt: Date.now(),
            newestMessageId: newestRawMessageId(rows) || stale.newestMessageId,
            fullFetchedAt: Math.max(0, Number(stale.fullFetchedAt || 0)),
            source: 'rawMessages:incremental',
        };
        saveRoomStatsCache(chatId, result);
        return result;
    }
    async function fetchDashboardLogsInternal(chatId) {
        const domCount = document.querySelectorAll('div[data-message-group-id]').length;
        const cached = loadRoomStatsCache(chatId, domCount);
        if (cached)
            return cached;
        const stale = loadRoomStatsCacheAnyAge(chatId, domCount);
        const firstPage = await fetchRawMessagePage(chatId);
        if (stale?.newestMessageId) {
            const firstNewestId = newestRawMessageId(firstPage.arr);
            if (firstNewestId && firstNewestId === stale.newestMessageId) {
                const reused = { ...stale, domCount, cachedAt: Date.now() };
                saveRoomStatsCache(chatId, reused);
                return reused;
            }
            const incremental = await fetchRawMessagesUntilAnchor(chatId, stale.newestMessageId, firstPage);
            if (incremental.foundAnchor)
                return applyRawMessageDelta(chatId, domCount, stale, incremental.rows);
            if (incremental.rows.length)
                return buildRawMessageStats(chatId, domCount, incremental.rows, { complete: incremental.complete });
        }
        const full = await fetchRawMessagesUntilAnchor(chatId, '', firstPage);
        if (!full.rows.length)
            throw new Error('raw messages empty');
        return buildRawMessageStats(chatId, domCount, full.rows, { complete: full.complete });
    }
    function fetchDashboardLogs(chatId) {
        if (DASH_LOGS_INFLIGHT.has(chatId))
            return DASH_LOGS_INFLIGHT.get(chatId);
        const task = fetchDashboardLogsInternal(chatId)
            .finally(() => {
            if (DASH_LOGS_INFLIGHT.get(chatId) === task)
                DASH_LOGS_INFLIGHT.delete(chatId);
        });
        DASH_LOGS_INFLIGHT.set(chatId, task);
        return task;
    }
    async function fetchBalance() {
        try {
            const json = await apiGet('https://crack-api.wrtn.ai/crack-cash/crackers');
            const q = json?.data?.quantity;
            return typeof q === 'number' ? q : null;
        }
        catch (_) {
            return null;
        }
    }
    function loadCumCache(chatId) {
        if (!chatId)
            return { sum: 0, counted: {} };
        try {
            const raw = JSON.parse(localStorage.getItem(DASH.cumPrefix + chatId) || 'null');
            if (raw && typeof raw.sum === 'number')
                return { sum: raw.sum, counted: raw.counted || {} };
        }
        catch (_) { }
        return { sum: 0, counted: {} };
    }
    function saveCumCache(chatId, v) { try {
        if (chatId)
            localStorage.setItem(DASH.cumPrefix + chatId, JSON.stringify(v));
    }
    catch (_) { } }
    function dashSnapshotKey(chatId) { return chatId ? LS.dashboardCachePrefix + chatId : ''; }
    function loadDashboardSnapshot(chatId) {
        try {
            const raw = JSON.parse(localStorage.getItem(dashSnapshotKey(chatId)) || 'null');
            if (!raw || typeof raw !== 'object')
                return null;
            if (raw.chatId && raw.chatId !== chatId)
                return null;
            if (Date.now() - Number(raw.cachedAt || 0) > 5 * 60 * 1000)
                return null;
            if (raw.logs && raw.logs.statsVersion !== 2)
                raw.logs = null;
            return raw;
        }
        catch (_) {
            return null;
        }
    }
    function saveDashboardSnapshot(chatId) {
        if (!chatId || DASH.state.chatId !== chatId)
            return;
        try {
            localStorage.setItem(dashSnapshotKey(chatId), JSON.stringify({
                chatId,
                cachedAt: Date.now(),
                logs: DASH.state.logs || null,
                balance: DASH.state.balance,
                cumulative: Number(DASH.state.cumulative) || 0,
                lastDiff: Number(DASH.state.lastDiff) || 0,
            }));
        }
        catch (_) { }
    }
    function lastDiffKey(chatId) { return chatId ? DASH.lastDiffPrefix + chatId : ''; }
    function loadLastDeductedAmount(chatId) {
        try {
            const v = parseInt(localStorage.getItem(lastDiffKey(chatId)), 10);
            return Number.isFinite(v) && v > 0 ? v : 0;
        }
        catch (_) {
            return 0;
        }
    }
    function saveLastDeductedAmount(chatId, amount) { try {
        if (chatId && amount > 0)
            localStorage.setItem(lastDiffKey(chatId), String(amount));
    }
    catch (_) { } }
    function renderDashboardPlaceholder(label = '…') {
        const textEl = DASH.textSpan || document.querySelector('#chud-info-text');
        if (!textEl)
            return;
        textEl.innerHTML = `<span class="chud-part">${label}</span>`;
        DASH.lastHtml = `__placeholder:${label}`;
    }
    function clearDashboardForRoom(chatId) {
        DASH.state.chatId = chatId || '';
        DASH.state.logs = null;
        DASH.state.balance = null;
        DASH.state.cumulative = 0;
        DASH.state.lastDiff = 0;
        DASH.state.roomChangedAt = Date.now();
        DASH.lastHtml = '';
        renderDashboardPlaceholder('…');
    }
    function scheduleDashboardUpdate(force = false) {
        clearTimeout(dashboardTimer);
        dashboardTimer = setTimeout(updateDashboard, force ? 0 : 450);
    }
    async function updateDashboard() {
        if (!shouldRun() || !settings.dashboard || !isChatRoomPath())
            return;
        const chatId = getChatId();
        if (!chatId)
            return;
        const updateSeq = ++DASH.updateSeq;
        const prevChatId = DASH.state.chatId || '';
        const changedRoom = prevChatId !== chatId;
        if (changedRoom)
            clearDashboardForRoom(chatId);
        else
            DASH.state.chatId = chatId;
        DASH.state.cumulative = loadCumCache(chatId).sum || 0;
        DASH.state.lastDiff = loadLastDeductedAmount(chatId);
        const snap = loadDashboardSnapshot(chatId);
        if (snap) {
            DASH.state.logs = snap.logs || null;
            if (snap.balance != null)
                DASH.state.balance = snap.balance;
            if (snap.cumulative != null)
                DASH.state.cumulative = Number(snap.cumulative) || 0;
            if (snap.lastDiff != null)
                DASH.state.lastDiff = Number(snap.lastDiff) || 0;
            DASH.lastHtml = '';
            renderDashboardParts();
        }
        else if (!changedRoom) {
            DASH.lastHtml = '';
            renderDashboardParts();
        }
        try {
            const requestChatId = chatId;
            const [logs, balance] = await Promise.allSettled([fetchDashboardLogs(requestChatId), fetchBalance()]);
            if (!shouldRun() || updateSeq !== DASH.updateSeq || getChatId() !== requestChatId || DASH.state.chatId !== requestChatId)
                return;
            if (logs.status === 'fulfilled')
                DASH.state.logs = logs.value;
            if (balance.status === 'fulfilled')
                DASH.state.balance = balance.value;
            if (!shouldRun() || updateSeq !== DASH.updateSeq || getChatId() !== requestChatId || DASH.state.chatId !== requestChatId)
                return;
            saveDashboardSnapshot(requestChatId);
            DASH.lastHtml = '';
            renderDashboardParts();
        }
        catch (err) {
            console.warn(LOG, 'dashboard failed', err);
            if (getChatId() === chatId && DASH.state.chatId === chatId) {
                DASH.lastHtml = '';
                renderDashboardParts();
            }
        }
    }
    function renderDashboardParts() {
        if (DASH.touchHold) {
            DASH.renderPending = true;
            return;
        }
        const textSpan = DASH.textSpan || document.querySelector('#chud-info-text');
        if (!textSpan)
            return;
        const chatId = getChatId();
        if (!chatId)
            return;
        if (DASH.state.chatId && DASH.state.chatId !== chatId) {
            clearDashboardForRoom(chatId);
            return;
        }
        DASH.state.chatId = chatId;
        const visible = getDashVisible();
        const detail = getDashDetail();
        const logs = DASH.state.logs;
        const justMoved = !logs && DASH.state.roomChangedAt && Date.now() - DASH.state.roomChangedAt < 900;
        const domGroups = justMoved ? 0 : document.querySelectorAll('div[data-message-group-id]').length;
        const turns = logs ? Math.max(0, Number(logs.officialTurnCount ?? logs.userTurnCount) || 0) : (justMoved ? null : Math.max(0, Math.floor(domGroups / 2) - 1));
        const parts = [];
        const turnText = turns == null ? '—' : `${dashFmt(turns)}${logs?.complete === false ? '+' : ''}`;
        const turnSummary = `${DASH_ICON.clock}<span style="font-weight:700;">${turnText}</span>턴`;
        let turnDetail = `${DASH_ICON.clock}<span style="opacity:.75;margin-right:2px;">진행</span><span style="font-weight:700;">${turnText}</span>턴`;
        const hints = logs?.complete === false ? ['일부 집계'] : [];
        if (logs?.userTurnCount > 0)
            hints.push(`유저 ${dashFmt(logs.userTurnCount)}개`);
        if (logs?.currentAssistantCount > 0)
            hints.push(`현재 답변 ${dashFmt(logs.currentAssistantCount)}개`);
        if (logs?.currentPrologueCount > 0)
            hints.push(`프롤로그 ${dashFmt(logs.currentPrologueCount)}개`);
        if (logs?.totalMessages > 0)
            hints.push(`총 ${dashFmt(logs.totalMessages)}개`);
        if (hints.length)
            turnDetail += `&nbsp;<span style="opacity:.75;">(${hints.join(' · ')})</span>`;
        parts.push({ key: 'turn', summaryHtml: turnSummary, detailHtml: turnDetail });
        const cum = DASH.state.cumulative;
        const cumSummary = `${DASH_ICON.bittenCracker}<span style="font-weight:700;">${dashFmt(cum)}</span>개`;
        const cumDetail = `${DASH_ICON.bittenCracker}<span style="opacity:.75;margin-right:2px;">누적 사용 크래커 · 추정 포함</span><span style="font-weight:700;">${dashFmt(cum)}</span>개`;
        parts.push({ key: 'cumulative', summaryHtml: cumSummary, detailHtml: cumDetail });
        const bal = DASH.state.balance;
        if (bal !== null && bal !== undefined) {
            const b = Number(bal) || 0;
            const balSummary = `${DASH_ICON.cracker}<span style="font-weight:700;">${dashFmt(b)}</span>개`;
            const balDetail = `${DASH_ICON.cracker}<span style="opacity:.75;margin-right:2px;">잔여</span><span style="font-weight:700;">${dashFmt(b)}</span>개`;
            parts.push({ key: 'cracker', summaryHtml: balSummary, detailHtml: balDetail });
        }
        else {
            parts.push({ key: 'cracker', summaryHtml: `${DASH_ICON.cracker}<span style="font-weight:700;">—</span>개`, detailHtml: `${DASH_ICON.cracker}<span style="opacity:.75;margin-right:2px;">잔여</span><span style="font-weight:700;">—</span>개` });
        }
        const diff = DASH.state.lastDiff || 0;
        if (diff > 0) {
            const html = `<span style="display:inline-flex;align-items:center;"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="margin-right:2px;flex-shrink:0;"><polygon points="4,8 20,8 12,18"></polygon></svg><span style="font-weight:700;">${dashFmt(diff)}</span>개</span>`;
            parts.push({ key: 'deducted', summaryHtml: html, detailHtml: html });
        }
        const vis = parts.filter(p => visible[p.key] !== false);
        const html = vis.map((p, i) => `${i ? '<span class="chud-sep">|</span>' : ''}<button class="chud-part" data-part="${p.key}" ${p.key === 'deducted' ? 'style="cursor:default;"' : ''}>${detail[p.key] ? p.detailHtml : p.summaryHtml}</button>`).join('');
        if (html === DASH.lastHtml)
            return;
        textSpan.innerHTML = html || '<span class="chud-part">대시보드 대기중…</span>';
        DASH.lastHtml = html;
    }
    function getOrCreateDashTabId() {
        try {
            let id = sessionStorage.getItem(DASH.tabId);
            if (!id) {
                id = `tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
                sessionStorage.setItem(DASH.tabId, id);
            }
            return id;
        }
        catch (_) {
            return `tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
        }
    }
    const DASH_TAB_ID = getOrCreateDashTabId();
    function startDashboardGenerationSession() {
        const chatId = getChatId();
        if (!chatId || !isChatRoomPath())
            return;
        DASH.activeSession = { tabId: DASH_TAB_ID, chatId, startedAt: Date.now() };
    }
    function getConsumedCrackerAmount(item) {
        const candidates = [
            item?.balance?.total,
            item?.balance?.paid,
            item?.balance?.free,
            item?.balance?.amount,
            item?.balance?.quantity,
            item?.amount?.total,
            item?.amount?.paid,
            item?.amount?.free,
            item?.amount?.value,
            item?.cracker?.quantity,
            item?.crackerQuantity,
            item?.quantity,
            item?.amount,
            item?.value,
            item?.total,
            item?.usedQuantity,
            item?.consumedQuantity,
            item?.discountedCrackerQuantity,
        ];
        for (let v of candidates) {
            if (typeof v === 'string')
                v = Number(v.replace(/[^0-9.-]/g, ''));
            if (typeof v === 'number' && Number.isFinite(v) && v !== 0)
                return Math.abs(v);
        }
        return 0;
    }
    function objectIdTime(id) {
        if (!/^[a-f0-9]{24}$/i.test(String(id || '')))
            return 0;
        const sec = parseInt(String(id).slice(0, 8), 16);
        return Number.isFinite(sec) && sec > 0 ? sec * 1000 : 0;
    }
    function getHistoryRecordTime(rec) {
        const raw = rec?.date || rec?.createdAt || rec?.created_at || rec?.updatedAt || rec?.timestamp || rec?.time || '';
        const t = new Date(raw).getTime();
        if (Number.isFinite(t) && t > 0)
            return t;
        return objectIdTime(rec?._id || rec?.id || rec?.historyId || rec?.transactionId || '');
    }
    function makeHistoryKey(rec) {
        const id = rec?._id || rec?.id || rec?.historyId || rec?.transactionId || '';
        if (id)
            return `id:${id}`;
        return ['hist', rec?.date || '', rec?.title || '', getConsumedCrackerAmount(rec), rec?.consumedType || '', rec?.product || ''].join('|');
    }
    function loadClaimedHistory() {
        let claimed;
        try {
            claimed = JSON.parse(localStorage.getItem(DASH.claimedHistory) || '{}') || {};
        }
        catch (_) {
            return {};
        }
        const cutoff = Date.now() - (14 * 24 * 60 * 60 * 1000);
        let changed = false;
        for (const [key, value] of Object.entries(claimed)) {
            const timestamp = typeof value === 'number' ? value : Number(value?.claimedAt || 0);
            if (!timestamp || timestamp < cutoff) {
                delete claimed[key];
                changed = true;
            }
        }
        if (changed)
            saveClaimedHistory(claimed);
        return claimed;
    }
    function saveClaimedHistory(v) { try {
        localStorage.setItem(DASH.claimedHistory, JSON.stringify(v || {}));
    }
    catch (_) { } }
    const HISTORY_FETCH_TTL_MS = 450;
    const HISTORY_FETCH_STATE = { limit: 0, at: 0, items: null, promise: null, promiseLimit: 0 };
    async function fetchRecentHistoryItems(limit = 20) {
        const safeLimit = Math.max(1, Math.floor(Number(limit) || 20));
        if (HISTORY_FETCH_STATE.items && HISTORY_FETCH_STATE.limit === safeLimit && Date.now() - HISTORY_FETCH_STATE.at < HISTORY_FETCH_TTL_MS)
            return HISTORY_FETCH_STATE.items;
        if (HISTORY_FETCH_STATE.promise && HISTORY_FETCH_STATE.promiseLimit === safeLimit)
            return HISTORY_FETCH_STATE.promise;
        const task = (async () => {
            const json = await apiGet(`https://crack-api.wrtn.ai/crack-cash/crackers/history?limit=${safeLimit}&type=all&page=1`);
            const data = json?.data;
            let items = [];
            if (Array.isArray(data))
                items = data;
            else if (Array.isArray(data?.items))
                items = data.items;
            else if (Array.isArray(data?.histories))
                items = data.histories;
            else if (Array.isArray(data?.list))
                items = data.list;
            else if (Array.isArray(json?.items))
                items = json.items;
            HISTORY_FETCH_STATE.limit = safeLimit;
            HISTORY_FETCH_STATE.at = Date.now();
            HISTORY_FETCH_STATE.items = items;
            return items;
        })();
        HISTORY_FETCH_STATE.promise = task;
        HISTORY_FETCH_STATE.promiseLimit = safeLimit;
        try {
            return await task;
        }
        catch (_) {
            return [];
        }
        finally {
            if (HISTORY_FETCH_STATE.promise === task) {
                HISTORY_FETCH_STATE.promise = null;
                HISTORY_FETCH_STATE.promiseLimit = 0;
            }
        }
    }

    async function claimConsumption(rec, chatId) {
        const amount = getConsumedCrackerAmount(rec);
        if (!shouldRun() || !chatId || amount <= 0)
            return 0;
        const key = makeHistoryKey(rec);
        const claimed = loadClaimedHistory();
        if (claimed[key])
            return 0;
        claimed[key] = { claimedAt: Date.now(), chatId, amount };
        saveClaimedHistory(claimed);
        const cache = loadCumCache(chatId);
        const next = { sum: (Number(cache.sum) || 0) + amount, counted: { ...(cache.counted || {}), [`history:${key}`]: true } };
        saveCumCache(chatId, next);
        saveLastDeductedAmount(chatId, amount);
        if (getChatId() === chatId && DASH.state.chatId === chatId) {
            DASH.state.cumulative = next.sum;
            DASH.state.lastDiff = amount;
            saveDashboardSnapshot(chatId);
            DASH.lastHtml = '';
            renderDashboardParts();
        }
        return amount;
    }

    function finishDashboardGenerationSession({ chatId = '', forceFull = false } = {}) {
        if (!shouldRun())
            return;
        chatId = chatId || DASH.activeSession?.chatId || '';
        if (!chatId)
            return;
        const now = Date.now();
        const session = DASH.activeSession && DASH.activeSession.chatId === chatId && now - DASH.activeSession.startedAt <= 10 * 60 * 1000
            ? { ...DASH.activeSession, doneAt: now }
            : (chatId ? { chatId, startedAt: now - 60000, doneAt: now } : null);
        if (DASH.activeSession?.chatId === chatId)
            DASH.activeSession = null;
        if (chatId) {
            if (forceFull)
                invalidateDashboardRoomStats(chatId);
            else
                expireDashboardRoomStats(chatId);
        }
        if (getChatId() === chatId)
            scheduleDashboardUpdate(true);

    }
    let composerEnterSendProbeId = 0;
    let composerSendWatchCleanup = null;
    function stopComposerSendWatch() {
        try {
            composerSendWatchCleanup?.();
        }
        catch (_) { }
        composerSendWatchCleanup = null;
    }
    function compactComposerAfterSend(previousTarget = COMPOSER_EXPAND.target) {
        const chatId = getChatId();
        collapseComposerInput({ immediate: true, scrollToEnd: false });
        const compactOnce = (force = false) => {
            if (!shouldRun() || getChatId() !== chatId)
                return;
            const currentInput = findChatInput();
            if (!force && currentInput instanceof HTMLElement && !isEmptyComposer())
                return;
            const candidates = new Set();
            if (previousTarget instanceof HTMLElement && previousTarget.isConnected)
                candidates.add(previousTarget);
            if (COMPOSER_EXPAND.target instanceof HTMLElement && COMPOSER_EXPAND.target.isConnected)
                candidates.add(COMPOSER_EXPAND.target);
            if (currentInput instanceof HTMLElement) {
                candidates.add(currentInput);
                const currentTarget = findComposerScrollTarget(currentInput);
                if (currentTarget instanceof HTMLElement)
                    candidates.add(currentTarget);
            }
            for (const el of candidates) {
                if (!(el instanceof HTMLElement))
                    continue;
                el.style.removeProperty('height');
                el.style.removeProperty('max-height');
                el.style.removeProperty('overflow-y');
                delete el.dataset.cmuComposerExpanded;
                delete el.dataset.cmuComposerExpandAnimating;
            }
            COMPOSER_EXPAND.expanded = false;
            COMPOSER_EXPAND.originalStyles = null;
            COMPOSER_EXPAND.collapsedHeight = 0;
            COMPOSER_EXPAND.originalScrollTop = 0;
            setComposerExpandButtonState(false, false);
            scheduleComposerExpandSync();
            scheduleDashboardScrollSync();
        };
        compactOnce(true);
        requestAnimationFrame(() => compactOnce());
        for (const delay of [45, 140, 300, 650, 1200])
            setTimeout(compactOnce, delay);
    }
    function watchComposerSendCompletion(sourceInput = findChatInput()) {
        if (!(sourceInput instanceof HTMLElement) || !getInputText(sourceInput)) return;
        stopComposerSendWatch();
        const chatId = getChatId(), previousTarget = COMPOSER_EXPAND.target;
        const probeId = ++composerEnterSendProbeId;
        let subscription = null, expiry = 0, done = false;
        const cleanup = () => {
            if (done) return;
            done = true; subscription?.disconnect(); clearTimeout(expiry);
            if (composerSendWatchCleanup === cleanup) composerSendWatchCleanup = null;
        };
        const check = () => {
            if (done) return;
            if (!shouldRun() || getChatId() !== chatId || probeId !== composerEnterSendProbeId) { cleanup(); return; }
            const input = findChatInput();
            if (input instanceof HTMLElement && !getInputText(input)) {
                cleanup(); compactComposerAfterSend(previousTarget); startDashboardGenerationSession();
            }
        };
        subscription = cmuComposerSubscribe(sourceInput, check);
        expiry = setTimeout(() => { check(); cleanup(); }, 12500);
        composerSendWatchCleanup = cleanup;
        check();
    }
    cmuListen(document, 'click', (e) => {
        if (isCmuProtectedEditorTarget(e.target))
            return;
        const btn = e.target.closest?.('button');
        if (!btn || !isChatRoomPath())
            return;
        const label = String(btn.getAttribute('aria-label') || '');
        if (/전송|보내기|send/i.test(label) || isSendButton(btn)) {
            watchComposerSendCompletion();
            startDashboardGenerationSession();
        }
    }, true);
    cmuListen(document, 'keydown', (e) => {
        if (isCmuProtectedEditorTarget(e.target))
            return;
        if (!isChatRoomPath())
            return;
        if (e.key !== 'Enter' || e.shiftKey || e.ctrlKey || e.altKey || e.metaKey || e.isComposing)
            return;
        const input = e.target?.closest?.('textarea, [contenteditable="true"]');
        if (!input || !isChatInputElement(input) || isEmptyComposer())
            return;
        watchComposerSendCompletion(input);
    }, true);
    function getGenerateDoneWindow() {
        try {
            if (typeof unsafeWindow !== 'undefined' && unsafeWindow?.document === document)
                return unsafeWindow;
        }
        catch (_) { }
        return window;
    }
    function getGenerateEventName(entry) {
        if (!entry)
            return '';
        if ((Array.isArray(entry) || typeof entry.length === 'number') && entry[0] === 'event')
            return String(entry[1] || '');
        return String(entry?.event || '');
    }
    function isGenerateDoneEntry(entry) {
        return /^generate_done$/i.test(getGenerateEventName(entry));
    }
    function getGenerateDoneEntryKey(entry) {
        try {
            const meta = ((Array.isArray(entry) || typeof entry.length === 'number') && entry[0] === 'event') ? entry[2] : entry;
            const msgId = meta?.msg_id || meta?.fe_msg_id || meta?.message_id || meta?.id || '';
            const chatId = meta?.chat_id || meta?.episode_id || '';
            if (msgId)
                return `${chatId}::${msgId}`;
        }
        catch (_) { }
        return `time::${Math.floor(Date.now() / 1500)}`;
    }
    function isGenerateDoneReroll(entry) {
        try {
            const meta = ((Array.isArray(entry) || typeof entry?.length === 'number') && entry[0] === 'event')
                ? (entry[2] || {})
                : (entry || {});
            return meta?.is_regenerate === true || meta?.isRegenerate === true || meta?.is_reroll === true || meta?.isReroll === true;
        }
        catch (_) {
            return false;
        }
    }
    function handleGenerateDoneEntry(entry) {
        if (!shouldRun() || !isGenerateDoneEntry(entry))
            return false;
        const w = getGenerateDoneWindow();
        const key = getGenerateDoneEntryKey(entry);
        if (w.__cmuLastGenerateDoneKey === key)
            return true;
        w.__cmuLastGenerateDoneKey = key;
        const meta = ((Array.isArray(entry) || typeof entry?.length === 'number') && entry[0] === 'event') ? (entry[2] || {}) : (entry || {});
        const eventChatId = String(meta.chat_id || meta.episode_id || '');
        finishDashboardGenerationSession({ chatId: eventChatId, forceFull: isGenerateDoneReroll(entry) });
        try {
            cmiRecordGenerateDone(entry);
        }
        catch (_) { }
        return true;
    }
    function watchDashboardGenerateDone() {
        const w = getGenerateDoneWindow();
        if (w.__CMU_DASH_GENERATE_DONE_HOOKED__)
            return;
        w.__CMU_DASH_GENERATE_DONE_HOOKED__ = true;
        CMU_RESOURCES.cleanups.push(() => { delete w.__CMU_DASH_GENERATE_DONE_HOOKED__; });
        const dl = w.dataLayer = w.dataLayer || [];
        if (!Array.isArray(dl))
            return;
        const scanEntries = (entries, collectAnswerCost = false) => {
            if (!shouldRun())
                return;
            if (collectAnswerCost) {
                for (const entry of entries) {
                    try {
                        cacHandleDataLayerEntry(entry);
                    }
                    catch (_) { }
                }
            }
            for (const entry of entries) {
                if (handleGenerateDoneEntry(entry))
                    break;
            }
        };
        const seen = Number(w.__cmuDataLayerSeenLen || 0);
        if (dl.length > seen) {
            scanEntries(dl.slice(seen));
            w.__cmuDataLayerSeenLen = dl.length;
        }
        else {
            w.__cmuDataLayerSeenLen = dl.length;
        }
        if (dl.__cmuDashPushWrapped)
            return;
        const orig = dl.push;
        dl.push = function (...items) {
            const ret = orig.apply(this, items);
            if (!shouldRun())
                return ret;
            try {
                scanEntries(items, true);
                w.__cmuDataLayerSeenLen = this.length;
            }
            catch (_) { }
            return ret;
        };
        cmuOwnMethod(dl, 'push', orig);
        CMU_RESOURCES.cleanups.push(() => { delete dl.__cmuDashPushWrapped; });
        try {
            Object.defineProperty(dl, '__cmuDashPushWrapped', { value: true, configurable: true });
        }
        catch (_) {
            dl.__cmuDashPushWrapped = true;
        }
    }
    const RS = {
        // 4.5.0.4.12: IGX 공지 기준 모든 라디오존데 API의 정식 경로가 BunnyCDN으로 제공된다.
        // BunnyCDN(radiosonde-api-striker.b-cdn.net)을 항상 1순위로 직접 호출하고,
        // 기존 rs/old 주소는 장애 대응용 폴백으로만 유지한다.
        apiBases: [
            'https://radiosonde-api-striker.b-cdn.net/api/v2/simple/',
            'https://rs.igx.kr/api/v2/simple/',
            'https://old.rs.igx.kr/api/v2/simple/',
            'https://rs.igx.kr/api/simple/',
            'https://old.rs.igx.kr/api/simple/',
        ],
        modelsUrls: [
            'https://radiosonde-api-striker.b-cdn.net/api/v2/models',
            'https://rs.igx.kr/api/v2/models',
            'https://old.rs.igx.kr/api/v2/models',
            'https://rs.igx.kr/api/models',
            'https://old.rs.igx.kr/api/models',
        ],
        statisticsUrls: [
            'https://radiosonde-api-striker.b-cdn.net/api/v2/statistics',
            'https://rs.igx.kr/api/v2/statistics',
            'https://old.rs.igx.kr/api/v2/statistics',
            'https://rs.igx.kr/api/statistics',
            'https://old.rs.igx.kr/api/statistics',
        ],
        preferredApiBase: '',
        yameStatus: 'https://claude-radiosonde.chyoyam.chatgpt.site/api/v1/status',
        activeWindowMs: 72 * 60 * 60 * 1000,
        validStatuses: new Set(['active', 'degraded', 'impacted']),
        models: [],
        last: new Map(),
        busy: false,
        pendingRefresh: false,
        discovered: false,
        discoveryAt: 0,
        discoveryPromise: null,
    };
    const YAME_MODELS = [
        { slug: 'yame-fable5', apiId: 'fable5', source: 'yame', label: 'Fable 5.0', short: 'F5' },
    ];
    const FALLBACK_MODELS = [
        {
                "slug": "claude-fable-5.1",
                "apiId": "claude-fable-5.1",
                "source": "igx",
                "label": "Claude Fable 5.1",
                "short": "F5.1"
        },
        {
                "slug": "claude-opus-5",
                "apiId": "claude-opus-5",
                "source": "igx",
                "label": "Claude Opus 5",
                "short": "O5"
        },
        {
                "slug": "claude-opus-4.8",
                "apiId": "claude-opus-4.8",
                "source": "igx",
                "label": "Claude Opus 4.8",
                "short": "O4.8"
        },
        {
                "slug": "claude-opus-4.7",
                "apiId": "claude-opus-4.7",
                "source": "igx",
                "label": "Claude Opus 4.7",
                "short": "O4.7"
        },
        {
                "slug": "claude-opus-4.6",
                "apiId": "claude-opus-4.6",
                "source": "igx",
                "label": "Claude Opus 4.6",
                "short": "O4.6"
        },
        {
                "slug": "claude-sonnet-5",
                "apiId": "claude-sonnet-5",
                "source": "igx",
                "label": "Claude Sonnet 5",
                "short": "S5"
        },
        {
                "slug": "gemini-3.1-pro-preview",
                "apiId": "gemini-3.1-pro-preview",
                "source": "igx",
                "label": "Gemini 3.1 Pro (Preview)",
                "short": "G3.1P"
        },
        {
                "slug": "gemini-2.5-pro",
                "apiId": "gemini-2.5-pro",
                "source": "igx",
                "label": "Gemini 2.5 Pro",
                "short": "G2.5P"
        },
        {
                "slug": "gemini-3.8-flash",
                "apiId": "gemini-3.8-flash",
                "source": "igx",
                "label": "Gemini 3.8 Flash",
                "short": "G3.8F"
        },
        {
                "slug": "gemini-3.7-flash",
                "apiId": "gemini-3.7-flash",
                "source": "igx",
                "label": "Gemini 3.7 Flash",
                "short": "G3.7F"
        },
        {
                "slug": "gemini-3.6-flash",
                "apiId": "gemini-3.6-flash",
                "source": "igx",
                "label": "Gemini 3.6 Flash",
                "short": "G3.6F"
        },
        {
                "slug": "gemini-3.5-flash",
                "apiId": "gemini-3.5-flash",
                "source": "igx",
                "label": "Gemini 3.5 Flash",
                "short": "G3.5F"
        },
        {
                "slug": "gemini-3.5-flash-lite",
                "apiId": "gemini-3.5-flash-lite",
                "source": "igx",
                "label": "Gemini 3.5 Flash Lite",
                "short": "G3.5FL"
        },
        {
                "slug": "gpt-6-sol",
                "apiId": "gpt-6-sol",
                "source": "igx",
                "label": "ChatGPT 6 Sol",
                "short": "G6S"
        },
        {
                "slug": "gpt-6-luna",
                "apiId": "gpt-6-luna",
                "source": "igx",
                "label": "ChatGPT 6 Luna",
                "short": "G6L"
        },
        {
                "slug": "gpt-5.6-sol",
                "apiId": "gpt-5.6-sol",
                "source": "igx",
                "label": "ChatGPT 5.6 Sol",
                "short": "G5.6S"
        },
        {
                "slug": "gpt-5.6-terra",
                "apiId": "gpt-5.6-terra",
                "source": "igx",
                "label": "ChatGPT 5.6 Terra",
                "short": "G5.6T"
        },
        {
                "slug": "gpt-5.6-luna",
                "apiId": "gpt-5.6-luna",
                "source": "igx",
                "label": "ChatGPT 5.6 Luna",
                "short": "G5.6L"
        }
];
    const DEFAULT_RS_MODELS = [...YAME_MODELS, ...FALLBACK_MODELS];
    const EXCLUDED_MODELS = new Set(['gemini-3-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite']);
    const MODEL_OVERRIDES = new Map(FALLBACK_MODELS.map(m => [m.slug, m]));
    // 4.5.0.4.13:
    // IGX가 공식 지원을 공지한 모델은 /models CDN 캐시가 잠시 이전 목록을 반환하더라도
    // 설정 목록과 실제 조회 대상에서 빠지지 않게 강제로 합친다.
    const REQUIRED_RS_SLUGS = [
        'gpt-6-sol',
        'gpt-6-luna',
        'gemini-3.8-flash',
        'gemini-3.7-flash',
    ];
    function mergeRequiredRsModels(models) {
        const map = new Map();
        for (const model of Array.isArray(models) ? models : []) {
            if (model?.slug)
                map.set(model.slug, { ...model });
        }
        for (const slug of REQUIRED_RS_SLUGS) {
            const fallback = MODEL_OVERRIDES.get(slug);
            if (!fallback)
                continue;
            const current = map.get(slug);
            map.set(slug, {
                ...fallback,
                ...(current || {}),
                slug,
                apiId: slug,
                source: 'igx',
                // 공지 모델은 사람이 읽기 쉬운 고정 라벨/축약명을 우선한다.
                label: fallback.label,
                short: fallback.short,
            });
        }
        return ensureUniqueShorts([...map.values()]);
    }
    function titleWord(word) {
        const known = { api: 'API', ai: 'AI', opus: 'Opus', sonnet: 'Sonnet', haiku: 'Haiku', pro: 'Pro', flash: 'Flash', lite: 'Lite', mini: 'Mini', preview: 'Preview', thinking: 'Thinking' };
        return known[word] || (word ? word.charAt(0).toUpperCase() + word.slice(1) : '');
    }
    function parseSlug(slug) {
        const tokens = String(slug || '').toLowerCase().split('-').map(v => v.trim()).filter(Boolean);
        const brand = tokens[0] || 'model';
        const isNum = t => /^\d+(?:\.\d+)*$/.test(t);
        const nIdx = tokens.findIndex((t, i) => i > 0 && isNum(t));
        let version = '';
        if (nIdx !== -1) {
            const parts = [];
            for (let i = nIdx; i < tokens.length && isNum(tokens[i]); i++)
                parts.push(tokens[i]);
            version = parts.join('.');
        }
        const descriptors = tokens.slice(1).filter(t => !isNum(t));
        return { brand, version, descriptors };
    }
    function autoLabel(slug) {
        const override = MODEL_OVERRIDES.get(slug);
        if (override)
            return override.label;
        const { brand, version, descriptors } = parseSlug(slug);
        const brandName = titleWord(brand);
        const desc = descriptors.map(titleWord).join(' ');
        if (version && desc)
            return `${brandName} ${version} ${desc}`;
        if (version)
            return `${brandName} ${version}`;
        if (desc)
            return `${brandName} ${desc}`;
        return brandName;
    }
    function autoShort(slug) {
        const override = MODEL_OVERRIDES.get(slug);
        if (override)
            return override.short;
        const { brand, version, descriptors } = parseSlug(slug);
        if (brand === 'claude') {
            const family = descriptors.find(v => ['opus', 'sonnet', 'haiku'].includes(v));
            return `${family ? family.charAt(0).toUpperCase() : 'C'}${version || ''}`.slice(0, 8);
        }
        if (brand === 'gemini')
            return `G${version || ''}`.slice(0, 8);
        return `${brand.charAt(0).toUpperCase()}${version || ''}`.slice(0, 8) || 'M';
    }
    function isRsModelSlug(slug) {
        return typeof slug === 'string' && /^[a-z0-9][a-z0-9.-]*$/i.test(slug) &&
            slug.includes('-') && /\d/.test(slug) && !EXCLUDED_MODELS.has(slug) && !slug.startsWith('yame-');
    }
    function rsModelMeta(slug) {
        return { slug, apiId: slug, source: 'igx', label: autoLabel(slug), short: autoShort(slug) };
    }
    function modelsFromList(payload) {
        if (payload?.success !== true || !Array.isArray(payload.data))
            return mergeRequiredRsModels([]);
        const discovered = [...new Set(payload.data.filter(isRsModelSlug))].map(rsModelMeta);
        return mergeRequiredRsModels(discovered);
    }
    function latestRecordMs(records) {
        const times = Array.isArray(records) ? records.map(r => Date.parse(r?.time)).filter(Number.isFinite) : [];
        return times.length ? Math.max(...times) : null;
    }
    function modelsFromStatistics(payload) {
        if (payload?.success !== true || !Array.isArray(payload.data)) return [];
        const models = new Map();
        for (const provider of payload.data) {
            for (const model of Array.isArray(provider?.models) ? provider.models : []) {
                if (!isRsModelSlug(model?.model)) continue;
                const latest = latestRecordMs(model.statistics);
                if (latest === null || Date.now() - latest > RS.activeWindowMs) continue;
                models.set(model.model, rsModelMeta(model.model));
            }
        }
        return mergeRequiredRsModels([...models.values()]);
    }
    function ensureUniqueShorts(models) {
        const used = new Set();
        return models.map(model => {
            const original = String(model.short || 'M').slice(0, 8) || 'M';
            let candidate = original;
            let suffix = 2;
            while (used.has(candidate)) {
                const s = String(suffix++);
                candidate = `${original.slice(0, Math.max(1, 8 - s.length))}${s}`;
            }
            used.add(candidate);
            return { ...model, short: candidate };
        });
    }
    function loadRsModelCache() {
        try {
            const parsed = JSON.parse(readLS(LS.rsModels, 'null'));
            const arr = Array.isArray(parsed) ? parsed : parsed?.models;
            if (!Array.isArray(arr))
                return null;
            const models = arr
                .filter(m => m && typeof m.slug === 'string' && typeof m.short === 'string' && typeof m.label === 'string' && isRsModelSlug(m.slug))
                .map(m => ({ ...m, apiId: m.slug, source: 'igx' }));
            return models.length ? mergeRequiredRsModels(models) : mergeRequiredRsModels([]);
        }
        catch (_) {
            return null;
        }
    }
    function saveRsModelCache(models) {
        try {
            const merged = mergeRequiredRsModels(models);
            localStorage.setItem(LS.rsModels, JSON.stringify({ ts: Date.now(), models: merged }));
        }
        catch (_) { }
    }
    async function discoverRsModels() {
        if (RS.discoveryPromise)
            return RS.discoveryPromise;
        RS.discoveryPromise = (async () => {
            const cache = loadRsModelCache();
            const previous = JSON.stringify(RS.models);
            try {
                let models = [];
                let lastDiscoveryError = null;

                // 4.5.0.4.6: 실제 브라우저에서 정상 확인된 공개 API URL 그대로 요청한다.
                // Bunny CDN 앞에서 임의 query string이 캐시/라우팅을 다르게 처리하는 경우를 피한다.
                for (const url of RS.modelsUrls) {
                    try {
                        models = modelsFromList(await gmGetRsJson(url, 9000));
                        if (models.length)
                            break;
                    }
                    catch (error) {
                        lastDiscoveryError = error;
                    }
                }

                // 목록 API가 없는 배포라면 통계 API에서 모델을 추출한다.
                if (!models.length) {
                    for (const url of RS.statisticsUrls) {
                        try {
                            models = modelsFromStatistics(await gmGetRsJson(url, 10000));
                            if (models.length)
                                break;
                        }
                        catch (error) {
                            lastDiscoveryError = error;
                        }
                    }
                }

                if (!models.length)
                    throw lastDiscoveryError || new Error('empty model list');
                RS.models = [...YAME_MODELS, ...mergeRequiredRsModels(models)];
                saveRsModelCache(models);
            }
            catch (_) {
                if (!RS.models.length) RS.models = [...YAME_MODELS, ...mergeRequiredRsModels(cache?.length ? cache : FALLBACK_MODELS)];
            }
            RS.discoveryAt = Date.now();
            if (previous !== JSON.stringify(RS.models)) {
                const active = new Set(RS.models.map(m => m.slug));
                for (const slug of RS.last.keys()) if (!active.has(slug)) RS.last.delete(slug);
                syncRsModelSettings();
                if (RS.busy) RS.pendingRefresh = true;
                else scheduleRadiosondeRefresh(true);
            }
            return RS.models;
        })();
        try {
            return await RS.discoveryPromise;
        }
        finally {
            RS.discoveryPromise = null;
        }
    }
    function normalizeStatus(status) {
        const v = String(status || 'unknown').toLowerCase();
        if (v === 'operational') return 'active';
        if (v === 'unstable') return 'degraded';
        if (v === 'critical' || v === 'inactive') return 'impacted';
        return RS.validStatuses.has(v) ? v : 'unknown';
    }
    function fmt2(v) {
        if (v === null || v === undefined || v === '')
            return null;
        const n = Number(v);
        return Number.isFinite(n) ? n.toFixed(2) : null;
    }
    function fmt0(v) {
        if (v === null || v === undefined || v === '')
            return null;
        const n = Number(v);
        return Number.isFinite(n) ? Math.round(n).toString() : null;
    }
    function latencySeconds(latencyInt) {
        if (latencyInt === null || latencyInt === undefined || latencyInt === '')
            return null;
        const n = Number(latencyInt);
        if (!Number.isFinite(n))
            return null;
        return n >= 0 ? (n / 1000).toFixed(2) : null;
    }
    async function fetchRsModel(slug) {
        const encoded = encodeURIComponent(slug);
        const bases = [...new Set([
            RS.preferredApiBase,
            ...RS.apiBases,
        ].filter(Boolean))];

        let lastError = null;
        const errors = [];
        for (const base of bases) {
            // 4.5.0.4.6: 브라우저에서 직접 열어 정상 확인한 URL 형식을 그대로 사용.
            // `_cmu=timestamp` 같은 임의 query string은 붙이지 않는다.
            const url = `${base}${encoded}`;
            try {
                const payload = await gmGetRsJson(url, 9000);
                if (!payload || payload.success !== true || !payload.data)
                    throw new Error(`invalid payload @ ${url}`);
                RS.preferredApiBase = base;
                return payload;
            }
            catch (error) {
                lastError = error;
                errors.push(String(error?.message || error));
            }
        }

        const detail = errors.filter(Boolean).slice(0, 3).join(' | ');
        throw new Error(detail || String(lastError?.message || 'radiosonde endpoint unavailable'));
    }
    async function fetchYameStatus() {
        const url = `${RS.yameStatus}?t=${Date.now()}`;
        try {
            return await gmGetJson(url, 20000);
        }
        catch (_) {
            await sleep(1200);
            return await gmGetJson(`${RS.yameStatus}?t=${Date.now()}`, 20000);
        }
    }
    function yameStatusFromScore(score, state, hasError = false) {
        if (hasError)
            return 'impacted';
        const n = Number(score);
        if (Number.isFinite(n)) {
            if (n >= 80)
                return 'active';
            if (n >= 50)
                return 'degraded';
            return 'impacted';
        }
        return state === 'slow' ? 'degraded' : 'unknown';
    }
    function normalizeYamePayload(payload) {
        const normalized = new Map();
        if (!payload || !Array.isArray(payload.models))
            return normalized;
        for (const model of payload.models) {
            if (!model || typeof model.id !== 'string')
                continue;
            const metrics = model.metrics || {};
            const scoreInfo = model.experience_score || {};
            const hasError = Boolean(model.error);
            const score = scoreInfo.value;
            const status = yameStatusFromScore(score, model.state, hasError);
            normalized.set(model.id, {
                success: true,
                data: {
                    status,
                    latency: metrics.ttft_ms,
                    tps: metrics.tps,
                    score,
                    failureCount: hasError ? 1 : 0,
                },
            });
        }
        return normalized;
    }
    function scheduleRadiosondeRefresh(force = false) {
        clearTimeout(scheduleRadiosondeRefresh._timer);
        scheduleRadiosondeRefresh._timer = setTimeout(() => {
            scheduleRadiosondeRefresh._timer = 0;
            void refreshRadiosonde();
        }, force ? 0 : 400);
    }
    function requestRadiosondeManualRefresh() {
        if (!shouldRun() || !settings.radiosonde || !isChatRoomPath())
            return;
        // 수동 갱신은 클릭 즉시 피드백을 준다. 기존 점수가 있어도 '갱신중…'을 강제로 표시한다.
        renderRsLine('갱신중…', true);
        const button = document.querySelector('#igx-live-popup .btn-refresh');
        if (button) {
            button.disabled = false;
            button.setAttribute('aria-label', '라디오존데 갱신중');
        }
        if (RS.busy) {
            // 진행 중 요청에 수동 클릭이 묻히지 않도록, 종료 직후 딱 한 번 다시 갱신한다.
            RS.pendingRefresh = true;
            return;
        }
        void refreshRadiosonde({ manual: true });
    }
    async function refreshRadiosonde({ manual = false } = {}) {
        if (!shouldRun() || !settings.radiosonde || !isChatRoomPath())
            return;
        const modelKey = getRsVisibleModels().map(model => model.slug).sort().join('|');
        if (!manual && RS.lastModelKey === modelKey && Date.now() - Number(RS.lastAttemptAt || 0) < 30000) { renderRsLine(); return; }
        if (RS.busy) {
            if (manual) {
                RS.pendingRefresh = true;
                renderRsLine('갱신중…', true);
            }
            return;
        }
        RS.busy = true;
        RS.lastAttemptAt = Date.now();
        RS.lastModelKey = modelKey;
        renderRsLine('갱신중…', manual);
        try {
            // 모델 목록 탐색은 점수 조회를 막지 않는다. 캐시/기본 목록으로 즉시 조회하고
            // v2 모델 목록은 뒤에서 조회하고 변경되면 즉시 한 번 더 갱신한다.
            if (!RS.models.length) {
                const cache = loadRsModelCache();
                RS.models = [...YAME_MODELS, ...mergeRequiredRsModels(cache?.length ? cache : FALLBACK_MODELS)];
            }
            if (Date.now() - RS.discoveryAt >= 5 * 60 * 1000 && !RS.discoveryPromise)
                void discoverRsModels().catch(() => {});
            if (!shouldRun() || !settings.radiosonde || !isChatRoomPath()) return;
            const models = getRsVisibleModels();
            const yameModels = models.filter(model => model.source === 'yame');
            const igxModels = models.filter(model => model.source !== 'yame');
            const yameTask = yameModels.length
                ? fetchYameStatus().then(value => ({ status: 'fulfilled', value }), reason => ({ status: 'rejected', reason }))
                : Promise.resolve(null);
            // 화면에서 켜 둔 IGX 모델만 예전 방식처럼 전부 병렬 조회한다.
            const igxTask = Promise.allSettled(
                igxModels.map(model => fetchRsModel(model.apiId || model.slug))
            );
            // IGX 결과는 YAME(Fable) 응답을 기다리지 않고 먼저 반영한다.
            // Fable 쪽이 느리거나 죽어 있어도 나머지 점수 갱신이 같이 막히지 않는다.
            const igxResults = await igxTask;
            if (!shouldRun())
                return;
            const igxFailureDetails = [];
            for (let i = 0; i < igxModels.length; i++) {
                const model = igxModels[i];
                const result = igxResults[i];
                if (!result || result.status !== 'fulfilled' || result.value?.success !== true || !result.value?.data) {
                    const reason = result?.status === 'rejected'
                        ? String(result.reason?.message || result.reason || 'request rejected')
                        : 'invalid response';
                    igxFailureDetails.push(`${model.short}: ${reason}`);
                    const prev = RS.last.get(model.slug);
                    RS.last.set(model.slug, { ...(prev || { status: 'unknown', score: '—', lat: '—', tps: '—' }), stale: true });
                    continue;
                }
                const d = result.value.data;
                RS.last.set(model.slug, {
                    stale: false,
                    fetchedAt: Date.now(),
                    status: normalizeStatus(d.status),
                    score: fmt0(d.score) ?? '—',
                    lat: latencySeconds(d.latency) ?? '—',
                    tps: fmt2(d.tps) ?? '—',
                });
            }
            renderRsLine();
            if (manual && igxModels.length && igxFailureDetails.length === igxModels.length) {
                const first = igxFailureDetails[0] || '알 수 없는 오류';
                showToast(`IGX 요청 실패 · ${first}`.slice(0, 140));
                console.warn(LOG, 'radiosonde IGX all failed', igxFailureDetails);
            }

            const yameResult = await yameTask;
            if (!shouldRun())
                return;
            if (yameResult?.status === 'fulfilled') {
                const normalizedYame = normalizeYamePayload(yameResult.value);
                for (const model of yameModels) {
                    const value = normalizedYame.get(model.apiId);
                    if (!value?.data) {
                        const prev = RS.last.get(model.slug);
                        RS.last.set(model.slug, { ...(prev || { status: 'unknown', score: '—', lat: '—', tps: '—' }), stale: true });
                        continue;
                    }
                    const d = value.data;
                    RS.last.set(model.slug, {
                        stale: false,
                        fetchedAt: Date.now(),
                        status: normalizeStatus(d.status),
                        score: fmt0(d.score) ?? '—',
                        lat: latencySeconds(d.latency) ?? '—',
                        tps: fmt2(d.tps) ?? '—',
                    });
                }
            }
            else {
                for (const model of yameModels) {
                    const prev = RS.last.get(model.slug);
                    RS.last.set(model.slug, { ...(prev || { status: 'unknown', score: '—', lat: '—', tps: '—' }), stale: true });
                }
            }
            renderRsLine();
        }
        catch (err) {
            console.warn(LOG, 'radiosonde failed', err);
            renderRsLine('라존데 갱신 실패', true);
        }
        finally {
            RS.busy = false;
            const rerun = RS.pendingRefresh && shouldRun() && settings.radiosonde && isChatRoomPath();
            RS.pendingRefresh = false;
            const button = document.querySelector('#igx-live-popup .btn-refresh');
            if (button && !rerun) {
                button.disabled = false;
                button.setAttribute('aria-label', '라디오존데 갱신');
            }
            restartRsAutoTimer();
            if (rerun)
                setTimeout(() => void refreshRadiosonde({ manual: true }), 0);
        }
    }
    function restartRsAutoTimer() {
        if (!shouldRun() || !settings.radiosonde || !isChatRoomPath()) {
            clearInterval(rsTimer);
            rsTimer = 0;
            return;
        }
        if (rsTimer)
            return;
        rsTimer = setInterval(() => {
            if (!document.hidden)
                scheduleRadiosondeRefresh(true);
        }, 60 * 1000);
    }
    cmuListen(document, 'visibilitychange', () => {
        if (!document.hidden) {
            scheduleDashboardUpdate(false);
            if (settings.radiosonde)
                scheduleRadiosondeRefresh(true);
            if (CMU_DOM_ROUTER.fullResume) {
                CMU_DOM_ROUTER.fullResume = false;
                invalidateCmuChatInputCache();
                scheduleInject('visible-resume');
            }
        }
    });
    const BADGE = {
        selector: 'div[data-message-group-id]',
        apiBase: 'https://crack-api.wrtn.ai/crack-gen/v3',
        messageLimit: 200,
        cacheKey: '',
        apiCache: null,
        apiPromise: null,
        resultCache: new Map(),
        missCache: new Map(),
    };
    function resetBadgeCacheIfNeeded() {
        const key = location.origin + location.pathname + location.search;
        if (BADGE.cacheKey === key)
            return;
        BADGE.cacheKey = key;
        BADGE.generation = (BADGE.generation || 0) + 1;
        BADGE.forcePromise = null;
        BADGE.lastForceAt = 0;
        BADGE.apiCache = null;
        BADGE.apiPromise = null;
        BADGE.resultCache.clear();
        BADGE.missCache.clear();
    }
    function anyBadgeEnabled() {
        return !!(settings.badgeChars || settings.badgeTime);
    }
    function isObjectId(value = '') {
        return /^[a-f0-9]{24}$/i.test(String(value || ''));
    }
    function objectIdToDate(objectId = '') {
        if (!isObjectId(objectId))
            return null;
        const seconds = parseInt(String(objectId).slice(0, 8), 16);
        if (!Number.isFinite(seconds) || seconds <= 0)
            return null;
        const date = new Date(seconds * 1000);
        return Number.isNaN(date.getTime()) ? null : date;
    }
    function countChars(text = '') {
        return cmuInputCounterLength(text);
    }
    function formatNumber(value) {
        return Number(value).toLocaleString('ko-KR');
    }
    function pad2(n) { return String(n).padStart(2, '0'); }
    function formatBadgeDate(date) {
        if (!date)
            return '';
        return `${date.getFullYear()}.${pad2(date.getMonth() + 1)}.${pad2(date.getDate())}. ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
    }
    function messageContentOf(msg) {
        if (!msg)
            return '';
        const direct = msg.content ?? msg.text ?? msg.message ?? msg.answer ?? msg.response ?? '';
        if (typeof direct === 'string')
            return direct;
        if (Array.isArray(direct))
            return direct.map(item => typeof item === 'string' ? item : (item?.text || item?.content || item?.value || '')).join('');
        if (direct && typeof direct === 'object')
            return direct.text || direct.content || direct.value || '';
        return '';
    }
    async function fetchBadgeMessagesOnce(force = false) {
        if (!shouldRun()) throw new Error('runtime disposed');
        resetBadgeCacheIfNeeded();
        const chatId = getChatId();
        if (!chatId) throw new Error('chatId not found');
        const generation = BADGE.generation;
        const room = cmuRoomData(chatId);
        if (!force && BADGE.apiCache && BADGE.apiCache.revision === room.revision) return BADGE.apiCache;
        if (BADGE.apiPromise) return BADGE.apiPromise;
        const task = Promise.resolve().then(async () => {
            // The same first page serves statistics, badges, draft confirmation and copy.
            if (force || !room.first || Date.now() - room.firstAt > 1600)
                await cmuSharedMessagePage(chatId, '', force);
            const messages = [...room.messages.values()].sort((a, b) => messageIdOf(b).localeCompare(messageIdOf(a)));
            const idMap = new Map(messages.map((msg, index) => [messageIdOf(msg), { msg, index }]));
            const ids = [...idMap.keys()].filter(isObjectId).sort();
            const cache = { messages, idMap, revision: room.revision,
                oldestObjectId: ids[0] || '', newestObjectId: ids[ids.length - 1] || '',
                windowFull: room.first?.hasNext === true || !!room.first?.cursor };
            if (shouldRun() && getChatId() === chatId && generation === BADGE.generation && BADGE.apiPromise === task)
                BADGE.apiCache = cache;
            return cache;
        }).finally(() => { if (BADGE.apiPromise === task) BADGE.apiPromise = null; });
        BADGE.apiPromise = task;
        return task;
    }
    function groupMessageId(group) {
        return group?.getAttribute?.('data-message-group-id') || '';
    }
    function normalizeText(text = '') {
        return String(text || '').replace(/\s+/g, ' ').trim();
    }
    const COMPARE_RE = /답변\s*비교\s*(\d+)\s*\/\s*(\d+)/;
    function findCompareButton(group) {
        return Array.from(group.querySelectorAll('button')).find(btn => COMPARE_RE.test(normalizeText(btn.textContent || ''))) || null;
    }
    function parseCompare(group) {
        const btn = findCompareButton(group);
        const m = normalizeText(btn?.textContent || '').match(COMPARE_RE);
        return m ? { current: Number(m[1]), total: Number(m[2]) } : null;
    }
    function makeBadgeCacheKey(group) {
        const id = groupMessageId(group);
        const c = parseCompare(group);
        return c ? `${id}:${c.current}/${c.total}` : id;
    }
    function resolveByDomId(group) {
        const id = groupMessageId(group);
        return { messageId: id, date: objectIdToDate(id), charCount: null, role: null, source: 'dom' };
    }
    function isBadgeOutsideApiWindow(messageId, cache = BADGE.apiCache) {
        if (!isObjectId(messageId) || !cache?.windowFull || !isObjectId(cache.oldestObjectId))
            return false;
        return String(messageId).toLowerCase() < String(cache.oldestObjectId).toLowerCase();
    }
    function makeBadgeFinalMiss(base, source = 'api-window-miss') {
        const messageId = String(base?.messageId || '');
        if (messageId)
            BADGE.missCache.set(messageId, source);
        return { ...base, apiFinalMiss: true, source };
    }
    function enrichWithMsg(base, msg, source = 'api-message') {
        if (!msg)
            return base;
        const id = messageIdOf(msg) || base.messageId;
        const content = messageContentOf(msg);
        return {
            ...base,
            messageId: id,
            date: objectIdToDate(id) || base.date,
            role: String(msg?.role || base.role || '').toLowerCase() || null,
            charCount: content ? countChars(content) : null,
            crackerToken: cmiTokenOf(msg) || base.crackerToken || null,
            rawModel: msg?.model || base.rawModel || null,
            source,
        };
    }
    function isAssistantMessage(msg) {
        return String(msg?.role || '').toLowerCase() === 'assistant';
    }
    async function resolveCurrentMessageInfo(group, force = false) {
        resetBadgeCacheIfNeeded();
        const generation = BADGE.generation;
        const chatId = getChatId();
        const key = makeBadgeCacheKey(group);
        const fallback = resolveByDomId(group);
        if (!fallback.messageId || !isObjectId(fallback.messageId) || (!anyBadgeEnabled() && !cmiWanted() && !cacWanted()))
            return fallback;
        const knownMiss = BADGE.missCache.get(fallback.messageId);
        if (knownMiss)
            return makeBadgeFinalMiss(fallback, knownMiss);
        try {
            const { messages, idMap } = await fetchBadgeMessagesOnce(force);
            if (!shouldRun() || generation !== BADGE.generation || getChatId() !== chatId || makeBadgeCacheKey(group) !== key)
                return fallback;
            const entry = idMap.get(fallback.messageId);
            const anchor = entry?.msg;
            if (!anchor && isBadgeOutsideApiWindow(fallback.messageId))
                return makeBadgeFinalMiss(fallback);
            const compare = parseCompare(group);
            if (compare && compare.total > 1 && anchor && isAssistantMessage(anchor) && anchor.parentTurnId) {
                const variants = messages.filter(msg => isAssistantMessage(msg) && msg.parentTurnId === anchor.parentTurnId && messageIdOf(msg));
                if (variants.length === compare.total) {
                    const ordered = variants.sort((a, b) => (idMap.get(messageIdOf(b))?.index ?? 0) - (idMap.get(messageIdOf(a))?.index ?? 0));
                    return enrichWithMsg(fallback, ordered[compare.current - 1], 'api-current-reroll');
                }
            }
            return enrichWithMsg(fallback, anchor, 'api-message');
        }
        catch (_) {
            return fallback;
        }
    }
    function buildBadgeParts(resolved) {
        const parts = [];
        if (settings.badgeChars && typeof resolved?.charCount === 'number' && Number.isFinite(resolved.charCount)) {
            parts.push(`${formatNumber(resolved.charCount)}자`);
        }
        if (settings.badgeTime && resolved?.date)
            parts.push(formatBadgeDate(resolved.date));
        return parts;
    }
    function findMessageOptionAnchor(group) {
        const option = group.querySelector('button[aria-label="메시지 옵션"]');
        return option?.closest('.dropdown-button') || option || null;
    }
    function findRerollButtonAnchor(group) {
        const buttons = Array.from(group.querySelectorAll('button'));
        const compare = findCompareButton(group);
        const option = group.querySelector('button[aria-label="메시지 옵션"]');
        return buttons.find(btn => {
            if (!btn || btn === compare || btn === option)
                return false;
            if (btn.closest('.dropdown-button'))
                return false;
            const text = normalizeText(btn.textContent || '');
            if (COMPARE_RE.test(text))
                return false;
            const html = btn.innerHTML || '';
            return html.includes('M3.8 12') || html.includes('A9.8 9.8') || /viewBox="0 0 24 24"[\s\S]*?M3\.8\s+12/.test(html);
        }) || null;
    }
    function findSmartAnchor(group) {
        const compare = findCompareButton(group);
        if (compare)
            return { anchor: compare, placement: 'compare-left' };
        const reroll = findRerollButtonAnchor(group);
        if (reroll)
            return { anchor: reroll, placement: 'reroll-left' };
        const option = findMessageOptionAnchor(group);
        if (option)
            return { anchor: option, placement: 'option-left' };
        return { anchor: null, placement: 'fallback' };
    }
    function isUserGroupByDom(group) {
        if (!group)
            return false;
        return !!group.querySelector('div.relative.mb-5.w-full.items-end, div.relative.mb-5.items-end, div[class*="border-y"][class*="py-5"]');
    }
    function ensureUserBadgeRow(group, badge) {
        const wrap = group.querySelector('div.relative.mb-5.w-full.items-end, div.relative.mb-5.items-end') || group;
        let row = wrap.querySelector?.(':scope > .cmu-user-badge-row');
        if (!row) {
            row = document.createElement('div');
            row.className = 'cmu-user-badge-row';
            wrap.appendChild(row);
        }
        if (badge.parentElement !== row)
            row.appendChild(badge);
        badge.dataset.placement = 'user-flow';
        return badge;
    }
    function ensureBadge(group, resolved) {
        let badge = group.querySelector('.cmu-message-badge');
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'cmu-message-badge';
            badge.setAttribute('aria-label', '메시지 정보');
        }
        const role = resolved?.role || (isUserGroupByDom(group) ? 'user' : '');
        if (role === 'user')
            return ensureUserBadgeRow(group, badge);
        const { anchor, placement } = findSmartAnchor(group);
        if (anchor?.parentElement) {
            if (badge.parentElement !== anchor.parentElement || badge.nextElementSibling !== anchor) {
                anchor.parentElement.insertBefore(badge, anchor);
            }
            badge.dataset.placement = placement;
        }
        else if (badge.parentElement !== group) {
            group.appendChild(badge);
            badge.dataset.placement = 'fallback';
        }
        return badge;
    }
    function setBadge(group, resolved) {
        const parts = buildBadgeParts(resolved);
        const charsPending = !!settings.badgeChars &&
            !(typeof resolved?.charCount === 'number' && Number.isFinite(resolved.charCount)) &&
            (resolved?.role !== 'user') && !resolved?.apiFinalMiss;
        let badge = group.querySelector('.cmu-message-badge');
        if (!parts.length && !charsPending) {
            badge?.remove();
            return;
        }
        badge = ensureBadge(group, resolved);
        const label = parts.length ? parts.join(' · ') : '…';
        const hasCharsNow = /\d[\d,]*자/.test(badge.textContent || '');
        const hasCharsNew = typeof resolved?.charCount === 'number' && Number.isFinite(resolved.charCount);
        if (settings.badgeChars && hasCharsNow && !hasCharsNew)
            return;
        if (badge.textContent !== label)
            badge.textContent = label;
        badge.title = [label, resolved?.source || '', resolved?.messageId || ''].filter(Boolean).join('\n');
        badge.dataset.source = resolved?.source || 'dom';
    }
    function refreshBadgeApiCacheThrottled() {
        resetBadgeCacheIfNeeded();
        const generation = BADGE.generation;
        const chatId = getChatId();
        if (BADGE.forcePromise)
            return BADGE.forcePromise;
        const task = (async () => {
            const elapsed = Date.now() - (BADGE.lastForceAt || 0);
            const wait = Math.max(0, 1600 - elapsed);
            if (wait > 0)
                await sleep(wait);
            if (!shouldRun() || generation !== BADGE.generation || getChatId() !== chatId)
                return null;
            BADGE.lastForceAt = Date.now();
            BADGE.apiCache = null;
            return fetchBadgeMessagesOnce(true);
        })().finally(() => {
            if (BADGE.forcePromise === task)
                BADGE.forcePromise = null;
        });
        BADGE.forcePromise = task;
        return task;
    }
    function processBadgeGroup(group) {
        if (!group || !group.matches?.(BADGE.selector))
            return;
        if (!shouldRun() || (!anyBadgeEnabled() && !cmiWanted() && !cacWanted()) || !isChatRoomPath()) {
            group.querySelector('.cmu-message-badge')?.remove();
            group.querySelectorAll('.cmi-model-badge').forEach(el => el.remove());
            group.querySelectorAll('.cac-answer-cost').forEach(el => el.remove());
            return;
        }
        resetBadgeCacheIfNeeded();
        const generation = BADGE.generation;
        const chatId = getChatId();
        const key = makeBadgeCacheKey(group);
        const isCurrent = () => shouldRun() && group.isConnected && generation === BADGE.generation && getChatId() === chatId && makeBadgeCacheKey(group) === key;
        if (!key)
            return;
        const cached = BADGE.resultCache.get(key);
        if (cached) {
            setBadge(group, cached);
            setModelIcon(group, cached);
            cacSetAnswerCost(group, cached);
            return;
        }
        const fallback = resolveByDomId(group);
        if (fallback.date && settings.badgeTime)
            setBadge(group, fallback);
        setModelIcon(group, fallback);
        cacSetAnswerCost(group, fallback);
        resolveCurrentMessageInfo(group).then(resolved => {
            if (!isCurrent())
                return;
            const gotChars = typeof resolved?.charCount === 'number' && Number.isFinite(resolved.charCount);
            if (!settings.badgeChars || gotChars || resolved?.apiFinalMiss)
                BADGE.resultCache.set(key, resolved);
            setBadge(group, resolved);
            setModelIcon(group, resolved);
            cacSetAnswerCost(group, resolved);
            if (settings.badgeChars && !gotChars && !resolved?.apiFinalMiss && group.isConnected) {
                refreshBadgeApiCacheThrottled()
                    .then(() => {
                    if (!isCurrent() || BADGE.resultCache.has(key))
                        return null;
                    return resolveCurrentMessageInfo(group, false);
                })
                    .then(retryResolved => {
                    if (!retryResolved || !isCurrent())
                        return;
                    const retryGotChars = typeof retryResolved?.charCount === 'number' && Number.isFinite(retryResolved.charCount);
                    if (!settings.badgeChars || retryGotChars || retryResolved?.apiFinalMiss)
                        BADGE.resultCache.set(key, retryResolved);
                    setBadge(group, retryResolved);
                    setModelIcon(group, retryResolved);
                    cacSetAnswerCost(group, retryResolved);
                })
                    .catch(() => { });
            }
        }).catch(() => { });
    }
    function scanBadges() {
        resetBadgeCacheIfNeeded();
        if (!shouldRun() || (!anyBadgeEnabled() && !cmiWanted() && !cacWanted()) || !isChatRoomPath()) {
            document.querySelectorAll('.cmu-message-badge').forEach(el => el.remove());
            document.querySelectorAll('.cmi-model-badge').forEach(el => el.remove());
            document.querySelectorAll('.cac-answer-cost').forEach(el => el.remove());
            return;
        }
        document.querySelectorAll(BADGE.selector).forEach(processBadgeGroup);
    }
    function scheduleBadgeScan() {
        clearTimeout(badgeScanTimer);
        badgeScanTimer = setTimeout(scanBadges, 160);
    }
    function scanBadgeGroups(groups) {
        resetBadgeCacheIfNeeded();
        if (!shouldRun() || (!anyBadgeEnabled() && !cmiWanted() && !cacWanted()) || !isChatRoomPath())
            return;
        for (const group of groups || []) {
            if (group?.isConnected)
                processBadgeGroup(group);
        }
    }

    const CAC = {
        costsPrefix: 'cac:measured-costs:v1:',
        deletedPrefix: 'cac:deleted-messages:v1:',
        claimedHistory: 'cac:claimed-history:v1',
        claimLock: 'cac:claim-lock:v1',
        tabIdKey: 'cac:tab-id:v1',
        claimedKeepMs: 14 * 24 * 60 * 60 * 1000,
        deletedKeepMs: 7 * 24 * 60 * 60 * 1000,
        pendingStarts: new Map(),
        pendingJobs: new Map(),
        seenDoneEvents: new Set(),
        tabId: '',
        costsCacheChatId: '',
        costsCache: null,
    };
    const CAC_ICON_HTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true" focusable="false" style="pointer-events:none;display:inline-block;vertical-align:-2px"><path fill-rule="evenodd" clip-rule="evenodd" d="M6.2 4.2A4.5 4.5 0 0 1 12 4.2A4.5 4.5 0 0 1 13.5 3.36A7 7 0 0 0 20.17 11.5A4.5 4.5 0 0 1 19.8 12A4.5 4.5 0 0 1 19.8 17.8A2 2 0 0 1 17.8 19.8A4.5 4.5 0 0 1 12 19.8A4.5 4.5 0 0 1 6.2 19.8A2 2 0 0 1 4.2 17.8A4.5 4.5 0 0 1 4.2 12A4.5 4.5 0 0 1 4.2 6.2A2 2 0 0 1 6.2 4.2ZM8 6.6L9.4 8L8 9.4L6.6 8ZM8 14.6L9.4 16L8 17.4L6.6 16ZM16 14.6L17.4 16L16 17.4L14.6 16ZM12 10.6L13.4 12L12 13.4L10.6 12Z"/></svg>';
    addStyle(`
    .cac-answer-cost {
      display: inline-flex; align-items: center; flex: 0 0 auto; gap: 3px;
      margin-right: 6px; color: var(--icon_tertiary, var(--text-tertiary, #888));
      font-family: Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 12px; font-weight: 600; line-height: 1; letter-spacing: -.01em;
      opacity: .86; pointer-events: none; user-select: none; white-space: nowrap;
    }
    .cac-answer-cost svg { flex: 0 0 auto; }
    .cac-answer-cost-amount { line-height: 14px; }
  `);
    function cacWanted() {
        return shouldRun() && !!settings.answerCost && isChatRoomPath();
    }
    function cacExternalCollectorActive() {
        try {
            const w = getGenerateDoneWindow();
            return !!w?.dataLayer?.__cacAnswerCostPushWrapped;
        }
        catch (_) {
            return false;
        }
    }
    function cacNormalizeId(value) {
        return String(value || '').trim();
    }
    function cacParseObject(value) {
        try {
            const parsed = JSON.parse(value || '{}');
            return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
        }
        catch (_) {
            return {};
        }
    }
    function cacLoadCosts(chatId) {
        if (!chatId)
            return {};
        if (chatId === CAC.costsCacheChatId && CAC.costsCache !== null)
            return CAC.costsCache;
        CAC.costsCacheChatId = chatId;
        CAC.costsCache = cacParseObject(localStorage.getItem(CAC.costsPrefix + chatId));
        return CAC.costsCache;
    }
    function cacSaveCosts(chatId, costs) {
        if (!chatId)
            return;
        CAC.costsCacheChatId = chatId;
        CAC.costsCache = costs || {};
        try {
            localStorage.setItem(CAC.costsPrefix + chatId, JSON.stringify(costs || {}));
        }
        catch (err) {
            try {
                console.debug(`${LOG} answer cost save failed`, err);
            }
            catch (_) { }
        }
    }
    function cacLoadDeleted(chatId) {
        if (!chatId)
            return {};
        const deleted = cacParseObject(localStorage.getItem(CAC.deletedPrefix + chatId));
        const cutoff = Date.now() - CAC.deletedKeepMs;
        let changed = false;
        for (const [messageId, timestamp] of Object.entries(deleted)) {
            if (!Number(timestamp) || Number(timestamp) < cutoff) {
                delete deleted[messageId];
                changed = true;
            }
        }
        if (changed)
            cacSaveDeleted(chatId, deleted);
        return deleted;
    }
    function cacSaveDeleted(chatId, deleted) {
        if (!chatId)
            return;
        try {
            localStorage.setItem(CAC.deletedPrefix + chatId, JSON.stringify(deleted || {}));
        }
        catch (_) { }
    }
    function cacIsDeleted(chatId, messageId) {
        return !!cacLoadDeleted(chatId)[cacNormalizeId(messageId)];
    }
    function cacLoadClaimedHistory() {
        const claimed = cacParseObject(localStorage.getItem(CAC.claimedHistory));
        const cutoff = Date.now() - CAC.claimedKeepMs;
        let changed = false;
        for (const [key, value] of Object.entries(claimed)) {
            const timestamp = typeof value === 'number' ? value : Number(value?.claimedAt || 0);
            if (!timestamp || timestamp < cutoff) {
                delete claimed[key];
                changed = true;
            }
        }
        if (changed)
            cacSaveClaimedHistory(claimed);
        return claimed;
    }
    function cacSaveClaimedHistory(claimed) {
        try {
            localStorage.setItem(CAC.claimedHistory, JSON.stringify(claimed || {}));
        }
        catch (_) { }
    }
    function cacGetTabId() {
        if (CAC.tabId)
            return CAC.tabId;
        try {
            let value = sessionStorage.getItem(CAC.tabIdKey);
            if (!value) {
                value = `tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
                sessionStorage.setItem(CAC.tabIdKey, value);
            }
            CAC.tabId = value;
        }
        catch (_) {
            CAC.tabId = `tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
        }
        return CAC.tabId;
    }
    async function cacWithLocalStorageLock(callback) {
        const owner = `${cacGetTabId()}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
        const deadline = Date.now() + 3500;
        while (Date.now() < deadline) {
            try {
                const current = JSON.parse(localStorage.getItem(CAC.claimLock) || 'null');
                if (!current || !current.ts || Date.now() - Number(current.ts) > 5000) {
                    localStorage.setItem(CAC.claimLock, JSON.stringify({ owner, ts: Date.now() }));
                    await sleep(25);
                    const confirmed = JSON.parse(localStorage.getItem(CAC.claimLock) || 'null');
                    if (confirmed?.owner === owner) {
                        try {
                            return await callback();
                        }
                        finally {
                            try {
                                const latest = JSON.parse(localStorage.getItem(CAC.claimLock) || 'null');
                                if (latest?.owner === owner)
                                    localStorage.removeItem(CAC.claimLock);
                            }
                            catch (_) { }
                        }
                    }
                }
            }
            catch (_) { }
            await sleep(60 + Math.floor(Math.random() * 80));
        }
        throw new Error('Cost claim lock unavailable');
    }
    async function cacWithClaimLock(callback) {
        const guardedCallback = () => shouldRun() ? callback() : undefined;
        try {
            if (navigator?.locks?.request) {
                return navigator.locks.request('cac-answer-cost-claim', { mode: 'exclusive' }, guardedCallback);
            }
        }
        catch (_) { }
        return cacWithLocalStorageLock(guardedCallback);
    }
    function cacRefreshCurrentRoom(chatId = '') {
        if (!chatId || getChatId() === chatId) {
            BADGE.apiCache = null;
            BADGE.resultCache.clear();
            scheduleBadgeScan();
        }
    }
    function cacGetConsumedAmount(record) {
        let value = record?.balance?.total;
        if (typeof value === 'string')
            value = Number(value.replace(/[^0-9.-]/g, ''));
        if (typeof value !== 'number' || !Number.isFinite(value))
            return 0;
        return Math.abs(value);
    }
    function cacGetHistoryTime(record) {
        const value = record?.date || record?.createdAt || record?.created_at || '';
        const timestamp = new Date(value).getTime();
        return Number.isFinite(timestamp) ? timestamp : 0;
    }
    function cacMakeHistoryKey(record) {
        const id = record?._id || record?.id || record?.historyId || record?.transactionId || '';
        if (id)
            return `id:${id}`;
        return [
            'history',
            record?.date || record?.createdAt || record?.created_at || '',
            record?.title || '',
            cacGetConsumedAmount(record),
            record?.balance?.paid ?? '',
            record?.balance?.free ?? '',
            record?.consumedType || '',
            record?.product || '',
        ].join('|');
    }
    function cacFindHistoryCandidates(items, job) {
        const minTime = Math.max(0, Number(job?.startedAt || 0) - 30000);
        const maxTime = Number(job?.doneAt || Date.now()) + 45000;
        const candidates = (items || []).filter(record => {
            const product = String(record?.product || '').toLowerCase();
            const time = cacGetHistoryTime(record);
            return time >= minTime && time <= maxTime && time > 0 &&
                String(record?.isConsumed) === 'true' && (!product || product.includes('cracker')) &&
                cacGetConsumedAmount(record) > 0 && cmuHistoryConfidence(record, job) !== 'reject';
        });
        const exact = candidates.filter(record => cmuHistoryConfidence(record, job) === 'confirmed');
        // No nearest-time guess when multiple account-wide transactions overlap.
        if (exact.length === 1) return exact;
        return !exact.length && candidates.length === 1 ? candidates : [];
    }
    async function cacClaimMeasuredCost(record, job) {
        const amount = cacGetConsumedAmount(record);
        const confidence = cmuHistoryConfidence(record, job);
        if (!job?.chatId || !job?.messageId || amount <= 0 || confidence === 'reject') return null;
        const historyKey = cacMakeHistoryKey(record);
        let measured = null;
        await cacWithClaimLock(async () => {
            if (!cmuCostCollectionWanted() || cacIsDeleted(job.chatId, job.messageId)) return;
            const costs = cacLoadCosts(job.chatId);
            const existing = costs[job.messageId];
            if (existing && Number(existing.amount) > 0) { measured = existing; return; }
            const claimed = cacLoadClaimedHistory();
            if (claimed[historyKey]) return;
            measured = { amount, confidence, historyKey, measuredAt: Date.now(), isReroll: !!job.isReroll };
            claimed[historyKey] = { claimedAt: Date.now(), chatId: job.chatId, messageId: job.messageId, amount, confidence };
            costs[job.messageId] = measured;
            cacSaveClaimedHistory(claimed);
            cacSaveCosts(job.chatId, costs);
            // One successful match supplies both displays; no second history polling loop.
            if (settings.dashboard) await claimConsumption(record, job.chatId);
        });
        if (measured && getChatId() === job.chatId) {
            const group = isObjectId(job.messageId) && document.querySelector(`[data-message-group-id="${job.messageId}"]`);
            if (group) { cmuRouterAddGroup(group); scheduleCmuDomRouterFlush(); }
        }
        return measured;
    }
    async function cacPollAndMeasure(job) {
        for (const delay of [0, 700, 1200, 2000, 3500, 5500]) {
            if (delay) await sleep(delay);
            if (!cmuCostCollectionWanted() || cacIsDeleted(job.chatId, job.messageId)) return;
            try {
                const candidates = cacFindHistoryCandidates(await fetchRecentHistoryItems(20), job);
                if (!cmuCostCollectionWanted()) return;
                for (const record of candidates) {
                    if (await cacClaimMeasuredCost(record, job)) return;
                }
            } catch (error) { console.debug(LOG, 'answer cost retry', error); }
        }
    }
    function cacEventParts(entry) {
        if (!entry)
            return { name: '', meta: {} };
        const arrayLike = (Array.isArray(entry) || typeof entry.length === 'number') && typeof entry !== 'string';
        if (arrayLike && String(entry[0] || '') === 'event') {
            const rawMeta = entry[2] || {};
            return {
                name: String(entry[1] || ''),
                meta: rawMeta?.eventProperties || rawMeta?.properties || rawMeta || {},
            };
        }
        const rawMeta = entry?.eventProperties || entry?.properties || entry;
        return { name: String(entry?.event || entry?.eventName || ''), meta: rawMeta || {} };
    }
    function cacFirstMessageId(meta) {
        const values = [meta?.msg_id, meta?.message_id, meta?.messageId, meta?.id, meta?.fe_msg_id];
        for (const value of values) {
            const id = cacNormalizeId(value);
            if (isObjectId(id))
                return id;
        }
        return '';
    }
    function cacReadDurationMs(meta) {
        for (const value of [meta?.generate_time, meta?.generateTime, meta?.duration_ms, meta?.durationMs]) {
            const duration = Number(value);
            if (Number.isFinite(duration) && duration > 0 && duration <= 10 * 60 * 1000)
                return duration;
        }
        return 0;
    }
    function cacRememberGenerationStart(meta = {}) {
        if (!cmuCostCollectionWanted() || (cacExternalCollectorActive() && !settings.dashboard))
            return;
        const chatId = cacNormalizeId(meta?.chat_id || meta?.chatId || meta?.episode_id || getChatId());
        if (!chatId)
            return;
        CAC.pendingStarts.set(chatId, {
            startedAt: Date.now(),
            isReroll: meta?.is_regenerate === true || meta?.isRegenerate === true,
        });
    }
    function cacHandleGenerateDone(meta = {}) {
        if (!cmuCostCollectionWanted() || (cacExternalCollectorActive() && !settings.dashboard))
            return;
        const chatId = cacNormalizeId(meta?.chat_id || meta?.chatId || meta?.episode_id || getChatId());
        const messageId = cacFirstMessageId(meta);
        if (!chatId || !messageId)
            return;
        const eventKey = `${chatId}:${messageId}`;
        if (CAC.seenDoneEvents.has(eventKey) || CAC.pendingJobs.has(eventKey))
            return;
        CAC.seenDoneEvents.add(eventKey);
        if (CAC.seenDoneEvents.size > 1000) CAC.seenDoneEvents.delete(CAC.seenDoneEvents.values().next().value);
        if (cacIsDeleted(chatId, messageId))
            return;
        const existing = cacLoadCosts(chatId)[messageId];
        if (existing && Number(existing.amount) > 0) {
            cacRefreshCurrentRoom(chatId);
            return;
        }
        const doneAt = Date.now();
        const duration = cacReadDurationMs(meta);
        const remembered = CAC.pendingStarts.get(chatId);
        const fallbackStartedAt = remembered?.startedAt && doneAt - remembered.startedAt <= 10 * 60 * 1000
            ? remembered.startedAt
            : doneAt - 3 * 60 * 1000;
        const job = {
            chatId,
            messageId,
            startedAt: duration ? doneAt - duration : fallbackStartedAt,
            doneAt,
            isReroll: meta?.is_regenerate === true || meta?.isRegenerate === true || remembered?.isReroll === true,
        };
        CAC.pendingStarts.delete(chatId);
        cacRefreshCurrentRoom(chatId);
        const promise = cacPollAndMeasure(job)
            .catch(err => { try {
            console.debug(`${LOG} answer cost measure failed`, err);
        }
        catch (_) { } })
            .finally(() => CAC.pendingJobs.delete(eventKey));
        CAC.pendingJobs.set(eventKey, promise);
    }
    function cacHandleDataLayerEntry(entry) {
        const { name, meta } = cacEventParts(entry);
        if (/^(generate_open|generate_start)$/i.test(name)) {
            cacRememberGenerationStart(meta);
            return;
        }
        if (/^generate_done$/i.test(name))
            cacHandleGenerateDone(meta);
    }
    function cacRemoveBadge(group) {
        if (!group)
            return;
        group.querySelectorAll('.cac-answer-cost').forEach(el => el.remove());
        group.querySelectorAll('.cmi-model-slot:empty').forEach(el => el.remove());
    }
    function cacCreateBadge() {
        const badge = document.createElement('span');
        badge.className = 'cac-answer-cost';
        badge.setAttribute('aria-label', '답변별 크래커 소모량');
        badge.innerHTML = `${CAC_ICON_HTML}<span class="cac-answer-cost-amount"></span>`;
        return badge;
    }
    function cacSetAnswerCost(group, resolved) {
        if (!group)
            return;
        if (!cacWanted()) {
            cacRemoveBadge(group);
            return;
        }
        const role = resolved?.role || (isUserGroupByDom(group) ? 'user' : '');
        if (role === 'user') {
            cacRemoveBadge(group);
            return;
        }
        const compare = parseCompare(group);
        if (compare?.total > 1 && resolved?.source !== 'api-current-reroll') {
            cacRemoveBadge(group);
            return;
        }
        const messageId = cacNormalizeId(resolved?.messageId);
        const record = isObjectId(messageId) ? cacLoadCosts(getChatId())[messageId] : null;
        const amount = Number(record?.amount || 0);
        if (!(amount > 0)) {
            cacRemoveBadge(group);
            return;
        }
        const slot = cmiModelSlot(group);
        if (!(slot instanceof HTMLElement)) {
            cacRemoveBadge(group);
            return;
        }
        let badge = group.querySelector('.cac-answer-cost');
        if (!(badge instanceof HTMLElement))
            badge = cacCreateBadge();
        if (badge.parentElement !== slot)
            slot.appendChild(badge);
        badge.dataset.messageId = messageId;
        badge.dataset.amount = String(amount);
        const estimated = record.confidence !== 'confirmed';
        badge.title = `${estimated ? '사용 내역 시각을 기준으로 추정한' : '메시지 ID로 확인한'} 크래커 소모량: ${formatNumber(amount)}개`;
        badge.dataset.confidence = estimated ? 'estimated' : 'confirmed';
        const amountEl = badge.querySelector('.cac-answer-cost-amount');
        if (amountEl)
            amountEl.textContent = `${formatNumber(amount)}개`;
    }
    async function cacRecordSuccessfulDeletion(chatId, messageId) {
        chatId = cacNormalizeId(chatId);
        messageId = cacNormalizeId(messageId);
        if (!chatId || !messageId)
            return;
        await cacWithClaimLock(async () => {
            const deleted = cacLoadDeleted(chatId);
            deleted[messageId] = Date.now();
            cacSaveDeleted(chatId, deleted);
            const costs = cacLoadCosts(chatId);
            if (Object.prototype.hasOwnProperty.call(costs, messageId)) {
                delete costs[messageId];
                cacSaveCosts(chatId, costs);
            }
        });
        document.querySelectorAll('.cac-answer-cost').forEach(badge => {
            if (badge.dataset.messageId === messageId)
                badge.remove();
        });
        cacRefreshCurrentRoom(chatId);
    }
    function cacBindFallbackStartListeners() {
        if (document.documentElement.dataset.cmuAnswerCostBound === '1')
            return;
        document.documentElement.dataset.cmuAnswerCostBound = '1';
        cmuListen(document, 'keydown', event => {
            if (isCmuProtectedEditorTarget(event.target))
                return;
            if (event.key !== 'Enter' || event.shiftKey || event.ctrlKey || event.altKey || event.metaKey || event.isComposing)
                return;
            const input = event.target?.closest?.('textarea[placeholder*="메시지"], textarea[aria-label*="메시지"], [contenteditable="true"]');
            if (input && isChatInputElement(input))
                cacRememberGenerationStart({ is_regenerate: false });
        }, true);
        cmuRegisterGlobalGesture('answer-cost-pointerdown', signal => {
            cmuGestureListen(signal, document, 'pointerdown', event => {
                if (isCmuProtectedEditorTarget(event.target))
                    return;
                const button = event.target?.closest?.('button, [role="button"]');
                if (!button || !isChatRoomPath())
                    return;
                const text = `${button.textContent || ''} ${button.getAttribute('aria-label') || ''}`.trim();
                const isReroll = button.id === 'exp-reroll-btn' || /리롤|다시\s*생성|재생성/.test(text);
                const isSend = button.type === 'submit' || /메시지\s*보내기|전송/.test(text) || isSendButton(button);
                if (isReroll || isSend)
                    cacRememberGenerationStart({ is_regenerate: isReroll });
            }, true);
        });
    }
    function cacBindStorageListener() {
        cmuListen(window, 'storage', event => {
            const chatId = getChatId();
            if (!chatId)
                return;
            if (event.key === CAC.costsPrefix + chatId || event.key === CAC.deletedPrefix + chatId) {
                CAC.costsCache = null;
                CAC.costsCacheChatId = '';
                cacRefreshCurrentRoom(chatId);
            }
        });
    }
    // 모델 메타데이터는 사이트가 원래 요청한 v3 모델 API 응답을 수동 관찰해 저장한다.
    // 별도 모델 API 요청/폴링은 만들지 않는다. 새 모델/삭제 모델/아이콘 URL을 같은 응답에서 동기화한다.
    function cmuNormalizeModelToken(value) {
        const token = String(value || '').trim().toLowerCase().replace(/[\s.\-]+/g, '_');
        return /^[a-z][a-z0-9]*(?:_\d+)*$/.test(token) ? token : '';
    }
    function cmuLoadModelMeta() {
        try {
            const parsed = JSON.parse(localStorage.getItem(LS.modelMeta) || '{}');
            return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
        }
        catch (_) {
            return {};
        }
    }
    function cmuSaveModelMeta(meta) {
        try {
            localStorage.setItem(LS.modelMeta, JSON.stringify(meta && typeof meta === 'object' ? meta : {}));
        }
        catch (_) { }
    }
    function cmuCleanModelIconUrl(value) {
        const raw = String(value || '').trim();
        if (!raw)
            return '';
        try {
            const url = new URL(raw, location.href);
            return /^https?:$/.test(url.protocol) ? url.href : '';
        }
        catch (_) {
            return '';
        }
    }
    function cmuModelMetaByLabel(label) {
        const wanted = omfNormalizeText(label).toLocaleLowerCase();
        if (!wanted)
            return null;
        for (const [token, meta] of Object.entries(cmuLoadModelMeta())) {
            if (omfNormalizeText(meta?.label).toLocaleLowerCase() === wanted)
                return { token, ...(meta || {}) };
        }
        return null;
    }
    function cmuModelMetaByToken(token) {
        token = cmuNormalizeModelToken(token);
        if (!token)
            return null;
        const meta = cmuLoadModelMeta()[token];
        return meta && typeof meta === 'object' ? { token, ...meta } : null;
    }
    function cmuModelIconHtml(token = '', label = '') {
        token = cmuNormalizeModelToken(token);
        const meta = token ? cmuModelMetaByToken(token) : cmuModelMetaByLabel(label);
        const resolvedToken = cmuNormalizeModelToken(meta?.token || token);
        const apiIcon = cmuCleanModelIconUrl(meta?.icon);
        const fallbackIcon = resolvedToken ? cmiIconUrl(resolvedToken) : '';
        const src = apiIcon || fallbackIcon;
        if (!src)
            return Q_CHECK_ICON;
        return `<img class="ci cmu-model-filter-icon" src="${escapeHtml(src)}" alt="" aria-hidden="true" loading="lazy" decoding="async">`;
    }
    function cmuRememberModelMetaFromUi(label, iconUrl, tokenHint = '') {
        const cleanLabel = omfNormalizeText(label);
        const icon = cmuCleanModelIconUrl(iconUrl);
        let token = cmuNormalizeModelToken(tokenHint);
        if (!token && icon) {
            const flat = nmfIconFlatTokensFromText(icon)[0] || '';
            token = cmuNormalizeModelToken(nmfTokenFromFlatIconToken(flat));
        }
        if (!token && cleanLabel) {
            const byLabel = cmuModelMetaByLabel(cleanLabel);
            token = cmuNormalizeModelToken(byLabel?.token);
        }
        if (!token)
            return false;
        const all = cmuLoadModelMeta();
        const prev = all[token] && typeof all[token] === 'object' ? all[token] : {};
        const next = {
            ...prev,
            label: cleanLabel || prev.label || cmiAutoLabel(token) || token,
            icon: icon || prev.icon || '',
        };
        if (JSON.stringify(prev) === JSON.stringify(next))
            return false;
        all[token] = next;
        cmuSaveModelMeta(all);
        return true;
    }
    function cmuModelCatalogRequest(method, value) {
        if (String(method || 'GET').toUpperCase() !== 'GET')
            return null;
        try {
            const url = new URL(String(value || ''), location.href);
            if (url.hostname !== 'crack-api.wrtn.ai' || url.pathname !== '/crack-gen/v3/chat-models')
                return null;
            const serviceType = String(url.searchParams.get('serviceType') || '').toLowerCase();
            const storyId = url.searchParams.get('storyId') || '';
            // 다른 제품의 모델 목록으로 스토리 필터를 덮어쓰지 않는다.
            if (!isChatRoomPath() && !storyId && serviceType !== 'story')
                return null;
            if (serviceType && serviceType !== 'story')
                return null;
            return { url: url.href, storyId, serviceType };
        }
        catch (_) {
            return null;
        }
    }
    function cmuObserveModelCatalogResponse(meta, json) {
        if (!meta || !shouldRun())
            return false;
        const rows = json?.data?.models;
        if (!Array.isArray(rows) || !rows.length)
            return false;
        const nextMeta = {};
        const nextSeen = {};
        const nextNames = [];
        for (const model of rows) {
            const token = cmuNormalizeModelToken(model?.crackerModel);
            if (!token)
                continue;
            // API 응답에는 삭제된 과거 모델도 섞일 수 있으므로 현재 사용 가능 항목만 반영한다.
            if (model?.deletedAt || model?.isBlock === true)
                continue;
            const label = omfNormalizeText(model?.name) || cmiAutoLabel(token) || token;
            const icon = cmuCleanModelIconUrl(model?.assets?.icon?.default);
            nextMeta[token] = {
                label,
                icon,
                id: String(model?._id || ''),
                serviceType: String(model?.serviceType || ''),
            };
            nextSeen[token] = label;
            if (!nextNames.includes(label))
                nextNames.push(label);
        }
        if (!Object.keys(nextMeta).length)
            return false;

        const beforeMeta = cmuLoadModelMeta();
        const metaChanged = JSON.stringify(beforeMeta) !== JSON.stringify(nextMeta);
        if (metaChanged)
            cmuSaveModelMeta(nextMeta);

        const beforeSeen = nmfLoadSeen();
        const seenChanged = JSON.stringify(beforeSeen) !== JSON.stringify(nextSeen);
        if (seenChanged)
            nmfSaveSeen(nextSeen);
        const storesChanged = nmfSyncModelStoresToSeen(nextSeen, { prune: true });

        const beforeOutputSeen = omfLoadSeen();
        const outputChanged = JSON.stringify(beforeOutputSeen) !== JSON.stringify(nextNames);
        if (outputChanged)
            omfSaveSeen(nextNames);
        const hidden = new Set(omfLoadHidden());
        const nextNameSet = new Set(nextNames);
        const nextHidden = Array.from(hidden).filter(name => nextNameSet.has(name));
        if (nextHidden.length !== hidden.size)
            omfSaveHidden(nextHidden);

        if (metaChanged || seenChanged || storesChanged || outputChanged) {
            const panel = document.getElementById(ID.panel);
            if (panel?.classList.contains('open'))
                renderSettingsPanel();
            applyNativeModelFilterCss();
            omfScanOpenDialogs();
        }
        return true;
    }
    // 답변 길이 · 생각 조절 창 모델 필터
    // 별도 톱니/팝업/Observer를 만들지 않고 합본 설정창과 기존 DOM 라우터를 재사용한다.
    const OMF_HIDDEN_CLASS = 'cmu-output-model-hidden';
    addStyle(`.${OMF_HIDDEN_CLASS}{display:none!important;}`);
    function omfNormalizeText(value) {
        return String(value || '').replace(/\s+/g, ' ').trim();
    }
    function omfLoadHidden() {
        try {
            const parsed = JSON.parse(localStorage.getItem(LS.outputModelHidden) || '[]');
            return Array.isArray(parsed) ? parsed.filter(v => typeof v === 'string' && v.trim()) : [];
        }
        catch (_) {
            return [];
        }
    }
    function omfSaveHidden(values) {
        try {
            localStorage.setItem(LS.outputModelHidden, JSON.stringify(Array.from(new Set(values || [])).filter(Boolean)));
        }
        catch (_) { }
    }
    function omfLoadSeen() {
        try {
            const parsed = JSON.parse(localStorage.getItem(LS.outputModelSeen) || '[]');
            return Array.isArray(parsed) ? parsed.filter(v => typeof v === 'string' && v.trim()) : [];
        }
        catch (_) {
            return [];
        }
    }
    function omfSaveSeen(values) {
        try {
            localStorage.setItem(LS.outputModelSeen, JSON.stringify(Array.from(new Set(values || [])).filter(Boolean)));
        }
        catch (_) { }
    }
    function omfDirectChildByTag(parent, tagName) {
        if (!(parent instanceof Element))
            return null;
        return Array.from(parent.children).find(el => el.tagName === tagName) || null;
    }
    function omfGetEntryTrigger(item) {
        if (!(item instanceof HTMLElement))
            return null;
        const heading = omfDirectChildByTag(item, 'H3');
        if (!heading)
            return null;
        return Array.from(heading.children).find(el =>
            el.tagName === 'BUTTON' &&
            el.hasAttribute('aria-expanded') &&
            el.getAttribute('data-orientation') === 'vertical'
        ) || null;
    }
    function omfReadModelName(trigger) {
        if (!(trigger instanceof HTMLElement))
            return '';
        const directSpans = Array.from(trigger.children).filter(el => el.tagName === 'SPAN');
        const preferred = directSpans.find(el => el.classList.contains('flex-1'));
        return omfNormalizeText((preferred || directSpans[0])?.textContent);
    }
    function omfAccordionCandidate(dialog) {
        if (!(dialog instanceof HTMLElement))
            return null;
        let best = null;
        for (const root of dialog.querySelectorAll('div[data-orientation="vertical"]')) {
            const children = Array.from(root.children).filter(el => el instanceof HTMLElement);
            if (children.length < 3)
                continue;
            const entries = [];
            let iconCount = 0;
            let collectionTriggerCount = 0;
            for (const item of children) {
                const trigger = omfGetEntryTrigger(item);
                if (!trigger)
                    continue;
                const name = omfReadModelName(trigger);
                if (!name)
                    continue;
                if (Array.from(trigger.children).some(el => el.tagName === 'IMG'))
                    iconCount += 1;
                if (trigger.hasAttribute('data-radix-collection-item'))
                    collectionTriggerCount += 1;
                entries.push({ item, trigger, name });
            }
            if (entries.length < 3)
                continue;
            if (iconCount / entries.length < 0.6 || collectionTriggerCount / entries.length < 0.6)
                continue;
            if (!best || entries.length > best.entries.length)
                best = { root, entries };
        }
        return best;
    }
    function omfFindHelpButton(header) {
        if (!(header instanceof HTMLElement))
            return null;
        const buttons = Array.from(header.querySelectorAll('button'));
        return buttons.find(button =>
            button.getAttribute('aria-label') === '도움말' &&
            button.getAttribute('aria-haspopup') === 'dialog'
        ) || buttons.find(button =>
            button.getAttribute('aria-haspopup') === 'dialog' &&
            button.getAttribute('type') === 'button'
        ) || null;
    }
    function omfContextFromDialog(dialog) {
        if (!(dialog instanceof HTMLElement) || dialog.getAttribute('role') !== 'dialog' || dialog.getAttribute('data-state') === 'closed' || !dialog.isConnected)
            return null;
        const accordion = omfAccordionCandidate(dialog);
        if (!accordion)
            return null;
        const header = Array.from(dialog.children).find(child =>
            child instanceof HTMLElement && child.querySelector('h2') && omfFindHelpButton(child)
        );
        if (!(header instanceof HTMLElement))
            return null;
        return { dialog, header, ...accordion };
    }
    function omfApplyContext(context) {
        if (!context?.entries?.length)
            return false;
        const names = context.entries.map(entry => entry.name);
        for (const entry of context.entries) {
            const img = entry.trigger?.querySelector?.('img');
            const iconUrl = img?.currentSrc || img?.getAttribute?.('src') || '';
            if (iconUrl)
                cmuRememberModelMetaFromUi(entry.name, iconUrl);
        }
        const previousSeen = omfLoadSeen();
        if (names.length !== previousSeen.length || names.some((name, index) => name !== previousSeen[index]))
            omfSaveSeen(names);
        const hidden = new Set(omfLoadHidden());
        for (const entry of context.entries) {
            entry.item.classList.toggle(OMF_HIDDEN_CLASS, !!settings.outputModelFilter && hidden.has(entry.name));
        }
        return true;
    }
    function omfScanOpenDialogs(root = document) {
        const dialogs = new Set();
        if (root instanceof Element) {
            if (root.matches?.('[role="dialog"]')) dialogs.add(root);
            root.closest?.('[role="dialog"]') && dialogs.add(root.closest('[role="dialog"]'));
        }
        root?.querySelectorAll?.('[role="dialog"]').forEach(dialog => dialogs.add(dialog));
        let found = false;
        for (const dialog of dialogs) {
            const context = omfContextFromDialog(dialog);
            if (context && omfApplyContext(context))
                found = true;
        }
        if (!settings.outputModelFilter) {
            document.querySelectorAll(`.${OMF_HIDDEN_CLASS}`).forEach(el => el.classList.remove(OMF_HIDDEN_CLASS));
        }
        return found;
    }
    function renderOutputModelRows() {
        const hidden = new Set(omfLoadHidden());
        return omfLoadSeen().map(name => {
            const meta = cmuModelMetaByLabel(name);
            return qChip(
                'q-omf-chip',
                encodeURIComponent(name),
                escapeHtml(name),
                !hidden.has(name),
                false,
                cmuModelIconHtml(meta?.token || '', name)
            );
        }).join('');
    }

    function nmfLoadVis() {
        try {
            const parsed = JSON.parse(localStorage.getItem(LS.nativeModelVis) || '{}');
            return parsed && typeof parsed === 'object' ? parsed : {};
        }
        catch (_) {
            return {};
        }
    }
    function nmfSaveVis(v) {
        try {
            localStorage.setItem(LS.nativeModelVis, JSON.stringify(v || {}));
        }
        catch (_) { }
    }
    function nmfLoadSeen() {
        try {
            const parsed = JSON.parse(localStorage.getItem(LS.nativeModelSeen) || '{}');
            if (Array.isArray(parsed)) {
                return parsed.reduce((acc, token) => {
                    token = String(token || '').trim();
                    if (token)
                        acc[token] = true;
                    return acc;
                }, {});
            }
            return parsed && typeof parsed === 'object' ? parsed : {};
        }
        catch (_) {
            return {};
        }
    }
    function nmfSaveSeen(v) {
        try {
            localStorage.setItem(LS.nativeModelSeen, JSON.stringify(v || {}));
        }
        catch (_) { }
    }
    function nmfSyncModelStoresToSeen(nextSeen, opts = {}) {
        const prune = opts.prune !== false;
        const allow = new Set(Object.keys(nextSeen || {}));
        const vis = nmfLoadVis();
        let visChanged = false;
        if (prune) {
            for (const token of Object.keys(vis)) {
                if (!allow.has(token)) {
                    delete vis[token];
                    visChanged = true;
                }
            }
        }
        if (visChanged)
            nmfSaveVis(vis);
        const reg = cmiLoadRegistry();
        let regChanged = false;
        if (prune) {
            for (const token of Object.keys(reg)) {
                if (!allow.has(token)) {
                    delete reg[token];
                    regChanged = true;
                }
            }
        }
        for (const [token, label] of Object.entries(nextSeen || {})) {
            if (!reg[token]) {
                reg[token] = { label: label || cmiAutoLabel(token), engine: '' };
                regChanged = true;
            }
            else if (label && reg[token].label !== label) {
                reg[token].label = label;
                regChanged = true;
            }
        }
        if (regChanged)
            cmiSaveRegistry();
        if (regChanged)
            CMI.registry = reg;
        return visChanged || regChanged;
    }
    function nmfSeenLabelOf(seen, token) {
        const v = seen?.[token];
        return typeof v === 'string' ? v.trim() : '';
    }
    function nmfModelEntries() {
        const seen = nmfLoadSeen();
        return Object.keys(seen)
            .filter(token => seen[token] && /^[a-z][a-z0-9]*(?:_\d+)*$/.test(token))
            .map(token => ({
            token,
            label: nmfSeenLabelOf(seen, token) || cmiAutoLabel(token) || token,
        }));
    }
    function nmfIconFlatToken(token) {
        return String(token || '').replace(/_/g, '');
    }
    function nmfIconUrlToken(token) {
        return String(token || '').replace(/^([a-z][a-z0-9]*)_(?=\d)/i, '$1');
    }
    function nmfDecodeLoose(value) {
        let text = String(value || '');
        for (let i = 0; i < 2; i += 1) {
            try {
                const next = decodeURIComponent(text);
                if (next === text)
                    break;
                text = next;
            }
            catch (_) {
                break;
            }
        }
        return text;
    }
    function nmfIconFlatTokensFromText(value) {
        const text = nmfDecodeLoose(value);
        const out = [];
        const re = /model-icon\/([a-z0-9_-]+)\.(?:webp|png|svg|avif)/ig;
        let m;
        while ((m = re.exec(text))) {
            const flat = String(m[1] || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            if (flat && !out.includes(flat))
                out.push(flat);
        }
        return out;
    }
    function nmfTokenFromFlatIconToken(flatToken) {
        const flat = String(flatToken || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!flat)
            return null;
        try {
            const known = cmiModelOrder().find(token => nmfIconFlatToken(token) === flat);
            if (known)
                return known;
        }
        catch (_) { }
        const parsed = flat.match(/^([a-z]+chat)(\d+)$/);
        if (parsed) {
            const brand = parsed[1];
            const digits = parsed[2];
            return `${brand}_${digits.split('').join('_')}`;
        }
        return /^[a-z][a-z0-9]*$/.test(flat) ? flat : null;
    }
    function nmfNativeModelRootSelector() {
        return '[data-radix-menu-content], [data-radix-popper-content-wrapper]';
    }
    function nmfNativeModelIconSelector() {
        return [
            `:is(${nmfNativeModelRootSelector()}) img[src*="model-icon"]`,
            `:is(${nmfNativeModelRootSelector()}) img[srcset*="model-icon"]`,
            `:is(${nmfNativeModelRootSelector()}) source[srcset*="model-icon"]`,
            `:is(${nmfNativeModelRootSelector()}) [style*="model-icon"]`,
            `:is(${nmfNativeModelRootSelector()}) [src*="model-icon"]`,
            `:is(${nmfNativeModelRootSelector()}) [srcset*="model-icon"]`
        ].join(',');
    }
    function nmfElementSearchText(el) {
        if (!(el instanceof Element))
            return '';
        const chunks = [];
        try {
            for (const name of el.getAttributeNames?.() || []) {
                chunks.push(name, el.getAttribute(name) || '');
            }
        }
        catch (_) { }
        try {
            if (el.matches?.('img, source, [src], [srcset], [style]'))
                chunks.push(el.outerHTML || '');
        }
        catch (_) { }
        return chunks.join(' ');
    }
    function nmfFlatTokensFromElement(el) {
        if (!(el instanceof Element))
            return [];
        const out = [];
        const pushText = (text) => {
            nmfIconFlatTokensFromText(text).forEach(flat => {
                if (flat && !out.includes(flat))
                    out.push(flat);
            });
        };
        pushText(nmfElementSearchText(el));
        el.querySelectorAll?.('[src], [srcset], [style], source, img').forEach(child => pushText(nmfElementSearchText(child)));
        return out;
    }
    function nmfNativeModelRoots() {
        return Array.from(document.querySelectorAll(nmfNativeModelRootSelector()))
            .filter(root => nmfFlatTokensFromElement(root).length);
    }
    function nmfFindNativeModelItem(el) {
        if (!(el instanceof Element))
            return null;
        const direct = el.closest('[role^="menuitem"], [data-radix-collection-item], [role="option"], button, li, a');
        if (direct instanceof HTMLElement)
            return direct;
        let cur = el;
        while (cur?.parentElement) {
            const parent = cur.parentElement;
            if (parent.matches?.(nmfNativeModelRootSelector())) {
                return cur instanceof HTMLElement ? cur : null;
            }
            cur = parent;
        }
        return el.parentElement instanceof HTMLElement ? el.parentElement : null;
    }
    function nmfNativeModelItemCandidates() {
        const roots = nmfNativeModelRoots();
        const seen = new Set();
        const out = [];
        const push = (el) => {
            if (!(el instanceof HTMLElement))
                return;
            if (seen.has(el))
                return;
            if (!nmfFlatTokensFromElement(el).length)
                return;
            seen.add(el);
            out.push(el);
        };
        roots.forEach(root => {
            root.querySelectorAll('[role^="menuitem"], [data-radix-collection-item], [role="option"], button, li, a').forEach(push);
        });
        document.querySelectorAll(nmfNativeModelIconSelector()).forEach(el => push(nmfFindNativeModelItem(el)));
        return out;
    }
    function nmfCleanNativeModelLabel(value) {
        const label = String(value || '')
            .replace(/\s+/g, ' ')
            .replace(/\bNEW\b/gi, '')
            .replace(/변경\s*예정|권장/g, '')
            .trim();
        if (!label)
            return '';
        if (/\d+\s*개/.test(label))
            return '';
        if (label.length > 24)
            return '';
        return label;
    }
    function nmfNativeModelIconElements(item) {
        if (!(item instanceof Element))
            return [];
        return Array.from(item.querySelectorAll('img[src*="model-icon"], img[srcset*="model-icon"], source[srcset*="model-icon"], [style*="model-icon"]'));
    }
    function nmfNativeModelLabelFromItem(item, flatToken, token) {
        const flat = String(flatToken || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const icons = nmfNativeModelIconElements(item);
        const matchIcon = icons.find(el => nmfFlatTokensFromElement(el).includes(flat)) || icons[0] || null;
        const alt = nmfCleanNativeModelLabel(matchIcon?.getAttribute?.('alt'));
        if (alt)
            return alt;
        const row = matchIcon?.closest?.('.flex.items-center, .flex, div') || item;
        const spans = Array.from(row?.querySelectorAll?.('span') || []);
        for (const span of spans) {
            const label = nmfCleanNativeModelLabel(span.textContent);
            if (label)
                return label;
        }
        return cmiAutoLabel(token) || token;
    }
    function nmfResetMenuVisibilityRuntime() {
        document.documentElement.removeAttribute('data-cmu-nmf-soft');
        document.documentElement.removeAttribute('data-cmu-nmf-ready');
    }
    function nmfScanNativeModelMenu() {
        const items = nmfNativeModelItemCandidates();
        if (!items.length)
            return;
        const prevSeen = nmfLoadSeen();
        const nextSeen = {};
        items.forEach(item => {
            nmfFlatTokensFromElement(item).forEach(flat => {
                const token = nmfTokenFromFlatIconToken(flat);
                if (!token)
                    return;
                const label = nmfNativeModelLabelFromItem(item, flat, token);
                const finalLabel = label || cmiAutoLabel(token) || token;
                nextSeen[token] = finalLabel;
                const iconEl = nmfNativeModelIconElements(item).find(el => nmfFlatTokensFromElement(el).includes(flat)) || nmfNativeModelIconElements(item)[0];
                const iconUrl = iconEl?.currentSrc || iconEl?.getAttribute?.('src') || iconEl?.getAttribute?.('srcset')?.split?.(',')?.[0]?.trim?.()?.split?.(/\s+/)?.[0] || '';
                if (iconUrl)
                    cmuRememberModelMetaFromUi(finalLabel, iconUrl, token);
            });
        });
        const mergedSeen = { ...prevSeen, ...nextSeen };
        const seenChanged = JSON.stringify(prevSeen) !== JSON.stringify(mergedSeen);
        if (seenChanged)
            nmfSaveSeen(mergedSeen);
        const storesChanged = nmfSyncModelStoresToSeen(mergedSeen, { prune: false });
        if (seenChanged || storesChanged) {
            const panel = document.getElementById(ID.panel);
            if (panel?.classList.contains('open'))
                renderSettingsPanel();
        }
    }
    function scheduleNmfScan(steps = [80]) {
        const normalizedSteps = Array.isArray(steps) && steps.length
            ? steps.map(ms => Math.max(0, Number(ms) || 0))
            : [80];
        if (scheduleNmfScan._busy) {
            scheduleNmfScan._pending = true;
            scheduleNmfScan._pendingSteps = normalizedSteps;
            return;
        }
        scheduleNmfScan._busy = true;
        normalizedSteps.forEach((ms, index) => setTimeout(() => {
            nmfScanNativeModelMenu();
            if (index !== normalizedSteps.length - 1)
                return;
            scheduleNmfScan._busy = false;
            if (!scheduleNmfScan._pending)
                return;
            const pendingSteps = scheduleNmfScan._pendingSteps || [80];
            scheduleNmfScan._pending = false;
            scheduleNmfScan._pendingSteps = null;
            scheduleNmfScan(pendingSteps);
        }, ms));
    }
    function nmfIsVisible(token) {
        return nmfLoadVis()[token] !== false;
    }
    function applyNativeModelFilterCss() {
        let el = document.getElementById('cmu-native-model-filter-style');
        if (!el) {
            el = document.createElement('style');
            el.id = 'cmu-native-model-filter-style';
            document.head.appendChild(el);
        }
        CMU_RESOURCES.styles.add(el);
        if (!shouldRun() || !settings.nativeModelFilter) {
            if (el.textContent)
                el.textContent = '';
            nmfResetMenuVisibilityRuntime();
            return;
        }
        const vis = nmfLoadVis();
        const hiddenEntries = nmfModelEntries().filter(m => vis[m.token] === false);
        const buildSelectors = (urlToken) => [
            `[data-radix-menu-content] [role^="menuitem"]:has(img[src*="model-icon/${urlToken}.webp"])`,
            `[data-radix-menu-content] [role^="menuitem"]:has(img[srcset*="model-icon/${urlToken}.webp"])`,
            `[data-radix-menu-content] [data-radix-collection-item]:has(img[src*="model-icon/${urlToken}.webp"])`,
            `[data-radix-menu-content] [data-radix-collection-item]:has(img[srcset*="model-icon/${urlToken}.webp"])`,
            `[data-radix-menu-content] button:has(img[src*="model-icon/${urlToken}.webp"])`,
            `[data-radix-popper-content-wrapper] [role^="menuitem"]:has(img[src*="model-icon/${urlToken}.webp"])`,
            `[data-radix-popper-content-wrapper] [role^="menuitem"]:has(img[srcset*="model-icon/${urlToken}.webp"])`,
            `[data-radix-popper-content-wrapper] [data-radix-collection-item]:has(img[src*="model-icon/${urlToken}.webp"])`,
            `[data-radix-popper-content-wrapper] [data-radix-collection-item]:has(img[srcset*="model-icon/${urlToken}.webp"])`,
            `[data-radix-popper-content-wrapper] button:has(img[src*="model-icon/${urlToken}.webp"])`
        ].join(',\n');
        const css = hiddenEntries.map(m => {
            const urlTokens = Array.from(new Set([
                nmfIconUrlToken(m.token),
                nmfIconFlatToken(m.token)
            ].filter(Boolean)));
            return urlTokens.map(urlToken => `${buildSelectors(urlToken)} { display: none !important; }`).join('\n');
        }).join('\n');
        if (el.textContent !== css)
            el.textContent = css;
        nmfResetMenuVisibilityRuntime();
    }
    function renderNativeModelRows() {
        return nmfModelEntries().map(m =>
            qChip('q-nmf-chip', m.token, m.label, nmfIsVisible(m.token), false, cmuModelIconHtml(m.token, m.label))
        ).join('');
    }
    const CMI = {
        registryKey: 'cmu_model_registry_v1',
        registry: null,
        uiModeAt: 0,
        uiMode: '',
    };
    addStyle(`
    .cmi-model-badge {
      display: inline-flex; align-items: center; justify-content: center;
      width: 22px; height: 22px; border: 0; border-radius: 999px;
      background: transparent; line-height: 1; user-select: none;
      cursor: default; padding: 0; color: #9ca3af;
      font-size: 13px; font-weight: 800;
      pointer-events: none; touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
    }
    .cmi-model-slot {
      display: inline-flex; align-items: center; justify-content: center;
      flex: 0 0 auto; min-width: 22px; min-height: 22px;
    }
    .cmi-model-img {
      display: block; width: 16px; height: 16px; object-fit: contain;
      pointer-events: none; user-select: none; flex: 0 0 16px;
    }
    .cmi-model-fallback {
      display: inline-flex; align-items: center; justify-content: center;
      width: 16px; height: 16px; color: #9ca3af; font-size: 13px; font-weight: 800; line-height: 1;
    }
  `);
    function cmiIconUrl(token) {
        return `https://cdn-image.wrtn.ai/crack/graphics/model-icon/${nmfIconUrlToken(token)}.webp`;
    }
    function cmiAutoLabel(token) {
        const m = String(token).match(/^([a-z][a-z0-9]*?)(?:_(\d+)(?:_(\d+))?)?$/);
        if (!m)
            return String(token);
        const brand = m[1].charAt(0).toUpperCase() + m[1].slice(1);
        if (!m[2])
            return brand;
        return `${brand} ${m[2]}${m[3] != null ? `.${m[3]}` : ''}`;
    }
    function cmiPrettyEngine(raw) {
        return String(raw || '').replace(/[\s_-]+/g, ' ').trim();
    }
    function cmiLoadRegistry() {
        if (CMI.registry)
            return CMI.registry;
        let stored = {};
        try {
            const parsed = JSON.parse(localStorage.getItem(CMI.registryKey) || '{}');
            if (parsed && typeof parsed === 'object')
                stored = parsed;
        }
        catch (_) { }
        CMI.registry = {};
        for (const [k, v] of Object.entries(stored)) {
            if (v && typeof v === 'object')
                CMI.registry[k] = { label: v.label || cmiAutoLabel(k), engine: v.engine || '' };
        }
        return CMI.registry;
    }
    function cmiSaveRegistry() {
        const stored = {};
        for (const [k, v] of Object.entries(CMI.registry || {})) {
            stored[k] = { label: v.label, engine: v.engine };
        }
        try {
            localStorage.setItem(CMI.registryKey, JSON.stringify(stored));
        }
        catch (_) { }
    }
    function cmiTokenOf(msg) {
        const t = String(msg?.crackerModel || '').trim().toLowerCase().replace(/[\s.\-]+/g, '_');
        return /^[a-z][a-z0-9]*(?:_\d+)*$/.test(t) ? t : null;
    }
    function cmiEnsureModel(token, rawEngine) {
        if (!token)
            return null;
        const reg = cmiLoadRegistry();
        if (!reg[token]) {
            reg[token] = { label: cmiAutoLabel(token), engine: cmiPrettyEngine(rawEngine) };
            cmiSaveRegistry();
        }
        else if (rawEngine && !reg[token].engine) {
            reg[token].engine = cmiPrettyEngine(rawEngine);
            cmiSaveRegistry();
        }
        return reg[token];
    }
    function cmiModelOrder() {
        return Object.keys(cmiLoadRegistry()).sort();
    }
    function cmiCompactUiText(value) {
        return String(value || '').replace(/\s+/g, '').trim();
    }
    function cmiNativeUiModeRowFor(el) {
        let node = el instanceof Element ? el : null;
        for (let i = 0; node && i < 6; i += 1, node = node.parentElement) {
            const text = cmiCompactUiText(node.textContent || '');
            if ((text.includes('소설형UI') || text.includes('채팅형UI')) && node.querySelector?.('button[role="checkbox"]'))
                return node;
        }
        return null;
    }
    function cmiNativeUiModeFromControls() {
        let novelChecked = null;
        let chatChecked = null;
        document.querySelectorAll('button[role="checkbox"][aria-checked], button[role="checkbox"][data-state]').forEach(btn => {
            const row = cmiNativeUiModeRowFor(btn);
            if (!row)
                return;
            const text = cmiCompactUiText(row.textContent || '');
            const checked = btn.getAttribute('aria-checked') === 'true' || btn.getAttribute('data-state') === 'checked';
            if (text.includes('소설형UI'))
                novelChecked = checked;
            if (text.includes('채팅형UI'))
                chatChecked = checked;
        });
        if (chatChecked === true)
            return 'chat';
        if (novelChecked === true)
            return 'novel';
        return '';
    }
    function cmiNativeUiModeCached() {
        const now = Date.now();
        if (now - Number(CMI.uiModeAt || 0) < 350)
            return CMI.uiMode || '';
        const mode = cmiNativeUiModeFromControls();
        if (mode) {
            CMI.uiMode = mode;
            CMI.uiModeAt = now;
        }
        else {
            CMI.uiModeAt = now;
        }
        return CMI.uiMode || '';
    }
    function cmiIsNativeUiModeControl(el) {
        return !!cmiNativeUiModeRowFor(el);
    }
    function cmiHandleNativeUiModeChange() {
        CMI.uiModeAt = 0;
        applyState();
        scheduleThemeDecorate(true);
        scheduleThemeDecorateBurst('ui-mode-change');
        scheduleBadgeScan();
        const panel = document.getElementById(ID.panel);
        if (panel?.classList.contains('open'))
            renderSettingsPanel();
    }
    function cmiWanted() {
        return shouldRun() && !!settings.modelIcon && isChatRoomPath() &&
            document.documentElement.getAttribute('data-cmu-native-ui-mode') === 'novel';
    }
    function cmiCreateImg(token) {
        const meta = cmiLoadRegistry()[token];
        const img = document.createElement('img');
        img.src = cmiIconUrl(token);
        img.alt = meta?.label || token;
        img.className = 'cmi-model-img';
        img.width = 16;
        img.height = 16;
        img.decoding = 'async';
        img.draggable = false;
        img.addEventListener('error', () => {
            const fb = document.createElement('span');
            fb.className = 'cmi-model-fallback';
            fb.textContent = '?';
            fb.title = '아이콘 로드 실패';
            img.replaceWith(fb);
        }, { once: true });
        return img;
    }
    function cmiLabel(token) {
        const meta = cmiLoadRegistry()[token];
        if (!meta)
            return '모델 선택';
        return meta.engine ? `${meta.label} / ${meta.engine}` : meta.label;
    }
    function cmiCreateBadge(token) {
        const badge = document.createElement('span');
        badge.className = 'cmi-model-badge';
        badge.dataset.token = token || '';
        badge.dataset.source = 'measured';
        const meta = token ? cmiLoadRegistry()[token] : null;
        if (meta) {
            badge.appendChild(cmiCreateImg(token));
            badge.title = `${cmiLabel(token)} · 생성 당시 모델`;
        }
        else {
            badge.textContent = '?';
            badge.title = '확인된 모델';
        }
        return badge;
    }
    function cmiFooterLeftSlot(group) {
        const footers = group.querySelectorAll('.flex.items-center.justify-between.mt-2');
        for (const footer of footers) {
            const children = [...footer.children];
            const left = children.find(el => el.classList.contains('flex') && el.classList.contains('items-center') && el.classList.contains('space-x-3'));
            const right = children.find(el => el.classList.contains('flex') && el.classList.contains('flex-row') &&
                el.classList.contains('gap-2') && el.classList.contains('items-center'));
            if (left && right)
                return left;
        }
        return null;
    }
    function cmiFallbackFooterSlot(group) {
        const { anchor } = findSmartAnchor(group);
        const parent = anchor?.parentElement;
        if (!parent)
            return null;
        let slot = Array.from(parent.children).find(el => el.classList?.contains('cmi-model-slot')) || null;
        if (!slot) {
            slot = document.createElement('span');
            slot.className = 'cmi-model-slot';
            parent.insertBefore(slot, anchor);
        }
        return slot;
    }
    function cmiModelSlot(group) {
        return cmiFooterLeftSlot(group) || cmiFallbackFooterSlot(group);
    }
    function cmiClearModelIcon(group) {
        if (!group)
            return;
        group.querySelectorAll('.cmi-model-badge').forEach(el => el.remove());
        group.querySelectorAll('.cmi-model-slot:empty').forEach(el => el.remove());
    }
    function setModelIcon(group, resolved) {
        if (!cmiWanted()) {
            cmiClearModelIcon(group);
            return;
        }
        const role = resolved?.role || (isUserGroupByDom(group) ? 'user' : '');
        if (role === 'user') {
            cmiClearModelIcon(group);
            return;
        }
        const compare = parseCompare(group);
        if (compare?.total > 1 && resolved?.source !== 'api-current-reroll') {
            cmiClearModelIcon(group);
            return;
        }
        const apiToken = resolved?.crackerToken || null;
        if (apiToken)
            cmiEnsureModel(apiToken, resolved?.rawModel);
        const gdToken = apiToken ? null : cmiGdTokenFor(resolved?.messageId || '');
        const token = apiToken || gdToken || null;
        if (!token) {
            cmiClearModelIcon(group);
            return;
        }
        const slot = cmiModelSlot(group);
        if (!slot) {
            cmiClearModelIcon(group);
            return;
        }
        const messageId = String(resolved?.messageId || '');
        const old = group.querySelector('.cmi-model-badge');
        if (old && old.parentElement === slot && old.dataset.token === token && old.dataset.messageId === messageId)
            return;
        group.querySelectorAll('.cmi-model-badge').forEach(el => el.remove());
        group.querySelectorAll('.cmi-model-slot:empty').forEach(el => {
            if (el !== slot)
                el.remove();
        });
        const badge = cmiCreateBadge(token);
        badge.dataset.messageId = messageId;
        badge.dataset.source = apiToken ? 'api' : 'generate_done';
        slot.appendChild(badge);
    }
    const CMI_GD = { mapKey: 'cmu_model_bymsg_exact_v2', map: null };
    function cmiGdLoadMap() {
        if (CMI_GD.map)
            return CMI_GD.map;
        try {
            const parsed = JSON.parse(localStorage.getItem(CMI_GD.mapKey) || '{}');
            CMI_GD.map = parsed && typeof parsed === 'object' ? parsed : {};
        }
        catch (_) {
            CMI_GD.map = {};
        }
        return CMI_GD.map;
    }
    function cmiGdSaveMap() {
        const map = cmiGdLoadMap();
        const keys = Object.keys(map);
        if (keys.length > 1200) {
            for (const k of keys.slice(0, keys.length - 1000))
                delete map[k];
        }
        try {
            localStorage.setItem(CMI_GD.mapKey, JSON.stringify(map));
        }
        catch (_) { }
    }
    function cmiEngineIndex() {
        const idx = {};
        for (const [token, meta] of Object.entries(cmiLoadRegistry())) {
            const eng = String(meta.engine || '').toLowerCase().replace(/[\s.\-]+/g, '_');
            if (eng)
                idx[eng] = token;
        }
        return idx;
    }
    function cmiExtractGdMeta(entry) {
        const meta = ((Array.isArray(entry) || typeof entry?.length === 'number') && entry[0] === 'event')
            ? (entry[2] || {})
            : (entry || {});
        return {
            msgId: String(meta?.msg_id || meta?.fe_msg_id || meta?.message_id || meta?.messageId || meta?.id || ''),
            chatMode: meta?.chat_mode || meta?.chatMode || '',
            modelName: meta?.model_name || meta?.modelName || '',
        };
    }
    function cmiTokenFromGdMeta(meta) {
        const direct = cmiTokenOf({ crackerModel: meta.chatMode });
        if (direct)
            return direct;
        const eng = String(meta.modelName || '').toLowerCase().replace(/[\s.\-]+/g, '_');
        return eng ? (cmiEngineIndex()[eng] || null) : null;
    }
    function cmiRecordGenerateDone(entry) {
        try {
            const meta = cmiExtractGdMeta(entry);
            if (!isObjectId(meta.msgId))
                return;
            const token = cmiTokenFromGdMeta(meta);
            if (!token)
                return;
            cmiEnsureModel(token, meta.modelName);
            cmiGdLoadMap()[meta.msgId] = token;
            cmiGdSaveMap();
            setTimeout(() => {
                BADGE.apiCache = null;
                BADGE.resultCache.clear();
                scheduleBadgeScan();
            }, 700);
        }
        catch (_) { }
    }
    function cmiGdTokenFor(messageId) {
        if (!isObjectId(messageId))
            return null;
        const map = cmiGdLoadMap();
        return map[messageId] || null;
    }
    const CMI_DELETE_API_RE = /\/crack-gen\/v\d+\/chats\/([^/?#]+)\/messages\/([^/?#]+)/i;
    const CMI_DELETE_META = Symbol('cmuModelDeleteMeta');
    function cmiParseDeleteRequest(method, url) {
        if (String(method || '').toUpperCase() !== 'DELETE')
            return null;
        const match = String(url || '').match(CMI_DELETE_API_RE);
        if (!match)
            return null;
        try {
            return { chatId: decodeURIComponent(match[1]), messageId: decodeURIComponent(match[2]) };
        }
        catch (_) {
            return { chatId: match[1], messageId: match[2] };
        }
    }
    function cmiRecordSuccessfulDeletion(chatId, messageId) {
        chatId = String(chatId || '').trim();
        messageId = String(messageId || '').trim();
        if (!isObjectId(messageId))
            return;
        if (chatId) {
            invalidateDashboardRoomStats(chatId);
            if (getChatId() === chatId)
                scheduleDashboardUpdate(true);
        }
        cacRecordSuccessfulDeletion(chatId, messageId)
            .catch(err => { try {
            console.debug(`${LOG} answer cost delete cleanup failed`, err);
        }
        catch (_) { } });
        const map = cmiGdLoadMap();
        if (Object.prototype.hasOwnProperty.call(map, messageId)) {
            delete map[messageId];
            cmiGdSaveMap();
        }
        document.querySelectorAll('.cmi-model-badge').forEach(badge => {
            if (badge.dataset.messageId === messageId) {
                const group = badge.closest(BADGE.selector);
                badge.remove();
                group?.querySelectorAll('.cmi-model-slot:empty').forEach(el => el.remove());
            }
        });
        BADGE.apiCache = null;
        BADGE.resultCache.clear();
        BADGE.lastForceAt = 0;
        [80, 450, 1200].forEach(ms => setTimeout(scheduleBadgeScan, ms));
    }
    function cmiInstallDeleteHooks() {
        const w = getPublicWindow();
        if (w.__CMU_MODEL_DELETE_HOOKED__) return;
        w.__CMU_MODEL_DELETE_HOOKED__ = true;
        CMU_RESOURCES.cleanups.push(() => { delete w.__CMU_MODEL_DELETE_HOOKED__; });
        const consume = (messageMeta, modelMeta, response, body, revision) => {
            if ((!messageMeta && !modelMeta) || !response?.ok || !shouldRun()) return;
            const parsed = response.status === 204 ? Promise.resolve({ result: 'SUCCESS' }) : response.clone().json();
            Promise.all([parsed, body]).then(([json, payload]) => {
                if (messageMeta)
                    cmuObserveMessageResponse(messageMeta, json, payload, revision);
                if (modelMeta)
                    cmuObserveModelCatalogResponse(modelMeta, json);
            }).catch(() => {});
        };
        try {
            const original = w.fetch;
            if (typeof original === 'function') {
                w.fetch = function(input, init) {
                    const method = init?.method || input?.method || 'GET';
                    const url = typeof input === 'string' ? input : (input?.url || input?.href || String(input || ''));
                    const messageMeta = shouldRun() ? cmuMessageRequest(method, url) : null;
                    const modelMeta = shouldRun() ? cmuModelCatalogRequest(method, url) : null;
                    const revision = messageMeta ? cmuRoomData(messageMeta.chatId).revision : 0;
                    let body = init?.body;
                    if (messageMeta?.method === 'PATCH' && body === undefined && typeof input?.clone === 'function') {
                        try { body = input.clone().text().catch(() => null); } catch (_) { }
                    }
                    const result = original.apply(this, arguments);
                    if (messageMeta || modelMeta)
                        Promise.resolve(result).then(response => consume(messageMeta, modelMeta, response, body, revision)).catch(() => {});
                    return result;
                };
                cmuOwnMethod(w, 'fetch', original);
            }
            const XHR = w.XMLHttpRequest;
            const originalOpen = XHR?.prototype?.open, originalSend = XHR?.prototype?.send;
            if (typeof originalOpen === 'function' && typeof originalSend === 'function') {
                XHR.prototype.open = function(method, url) {
                    this[CMI_DELETE_META] = shouldRun() ? {
                        messageMeta: cmuMessageRequest(method, url),
                        modelMeta: cmuModelCatalogRequest(method, url),
                    } : null;
                    return originalOpen.apply(this, arguments);
                };
                XHR.prototype.send = function(body) {
                    const hookMeta = this[CMI_DELETE_META];
                    const messageMeta = hookMeta?.messageMeta || null;
                    const modelMeta = hookMeta?.modelMeta || null;
                    const revision = messageMeta ? cmuRoomData(messageMeta.chatId).revision : 0;
                    if (messageMeta || modelMeta) this.addEventListener('loadend', () => {
                        if (!shouldRun() || this.status < 200 || this.status >= 300) return;
                        try {
                            const json = this.status === 204 ? { result: 'SUCCESS' }
                                : this.responseType === 'json' ? this.response : JSON.parse(this.responseText);
                            if (messageMeta)
                                cmuObserveMessageResponse(messageMeta, json, body, revision);
                            if (modelMeta)
                                cmuObserveModelCatalogResponse(modelMeta, json);
                        } catch (_) { }
                    }, { once: true });
                    return originalSend.apply(this, arguments);
                };
                cmuOwnMethod(XHR.prototype, 'open', originalOpen);
                cmuOwnMethod(XHR.prototype, 'send', originalSend);
            }
        } catch (error) { console.debug(LOG, 'message response adapter unavailable', error); }
    }
    const cmuPreviousModelProbe = getPublicWindow().__cmuModelProbe;
    getPublicWindow().__cmuModelProbe = async () => {
        const { messages } = await fetchBadgeMessagesOnce(true);
        const a = (messages || []).find(m => String(m?.role || '').toLowerCase() === 'assistant');
        if (!a)
            return 'assistant 메시지 없음 (방에 답변이 있어야 함)';
        return { crackerModel: a.crackerModel ?? '(없음)', model: a.model ?? '(없음)', keys: Object.keys(a) };
    };
    cmuOwnMethod(getPublicWindow(), '__cmuModelProbe', cmuPreviousModelProbe);
    const CMU_MESSAGE_ACTIONS = {
        holdDelay: 400,
        travelLimit: 13,
        gesture: null,
        menuWrapper: null,
        ignoreClickUntil: 0,
        opening: false,
        installed: false,
        sheetScrollY: 0,
    };
    addStyle(`
    html.cmu-message-actions-enabled main [data-message-group-id] :is(
      .wrtn-markdown,
      [class*="wrtn-markdown"],
      .markdown-body,
      .prose
    ),
    html.cmu-message-actions-enabled main [data-message-group-id] :is(
      .wrtn-markdown,
      [class*="wrtn-markdown"],
      .markdown-body,
      .prose
    ) * {
      -webkit-user-select: none !important;
      user-select: none !important;
      -webkit-touch-callout: none !important;
    }

    body[data-cmu-opening-message-menu="1"] [data-radix-popper-content-wrapper] {
      opacity: 0 !important;
      pointer-events: none !important;
      animation: none !important;
      transition: none !important;
    }

    [data-radix-popper-content-wrapper][data-cmu-message-actions-menu="1"] {
      position: fixed !important;
      inset: 0 auto auto 0 !important;
      z-index: 2147483300 !important;
      max-width: calc(100vw - 24px) !important;
      max-height: calc(100dvh - 24px) !important;
      overflow: visible !important;
      will-change: auto !important;
      --radix-dropdown-menu-content-available-height: calc(100dvh - 24px) !important;
      --radix-popper-available-height: calc(100dvh - 24px) !important;
    }

    [data-radix-popper-content-wrapper][data-cmu-message-actions-menu="1"] [role="menu"] {
      width: min(280px, calc(100vw - 28px)) !important;
      min-width: min(280px, calc(100vw - 28px)) !important;
      max-width: calc(100vw - 28px) !important;
      height: auto !important;
      min-height: 0 !important;
      max-height: calc(100dvh - 24px) !important;
      padding: 5px !important;
      overflow-x: hidden !important;
      overflow-y: auto !important;
      overscroll-behavior: contain !important;
      touch-action: pan-y !important;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
      border-radius: 16px !important;
    }

    [data-radix-popper-content-wrapper][data-cmu-message-actions-menu="1"] [role="menu"]::-webkit-scrollbar {
      display: none;
    }

    [data-radix-popper-content-wrapper][data-cmu-message-actions-menu="1"] [role="menuitem"] {
      min-height: 48px !important;
      padding: 0 18px !important;
      display: flex !important;
      align-items: center !important;
      border-radius: 10px !important;
      font-size: 16px !important;
      line-height: 1.2 !important;
    }

    [data-radix-popper-content-wrapper][data-cmu-message-actions-menu="1"] [role="menuitem"][data-cmu-action-hidden="1"] {
      display: none !important;
    }

    [data-radix-popper-content-wrapper][data-cmu-message-actions-menu="1"] [role="menuitem"][data-cmu-native-action] {
      gap: 0 !important;
      column-gap: 0 !important;
    }

    [data-radix-popper-content-wrapper][data-cmu-message-actions-menu="1"] [role="menuitem"][data-cmu-native-action] svg,
    [data-radix-popper-content-wrapper][data-cmu-message-actions-menu="1"] [role="menuitem"][data-cmu-native-action] img,
    [data-radix-popper-content-wrapper][data-cmu-message-actions-menu="1"] [role="menuitem"][data-cmu-native-action] > :first-child:has(svg),
    [data-radix-popper-content-wrapper][data-cmu-message-actions-menu="1"] [role="menuitem"][data-cmu-native-action] > :first-child:has(img) {
      display: none !important;
    }

    .cmu-message-action-extra {
      cursor: pointer !important;
      -webkit-user-select: none !important;
      user-select: none !important;
    }

    .cmu-message-action-extra:active {
      background: rgba(127,127,127,.18) !important;
    }

    #cmu-message-select-copy {
      position: fixed;
      inset: 0;
      z-index: 2147483500;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      background: rgba(0,0,0,.58);
      touch-action: pan-y;
    }

    #cmu-message-select-copy .cmu-select-sheet {
      width: 100%;
      height: 92vh;
      height: calc(100dvh - max(8px, env(safe-area-inset-top)));
      max-height: 920px;
      min-height: 0;
      display: grid;
      grid-template-rows: auto auto minmax(0, 1fr);
      overflow: hidden;
      border-radius: 28px 28px 0 0;
      background: #191919;
      color: #f5f5f7;
      box-shadow: 0 -16px 48px rgba(0,0,0,.34);
      padding-bottom: env(safe-area-inset-bottom);
      touch-action: pan-y;
    }

    #cmu-message-select-copy .cmu-select-head {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 28px 22px 12px;
    }

    #cmu-message-select-copy .cmu-select-head::before {
      content: "";
      position: absolute;
      top: 10px;
      left: 50%;
      width: 44px;
      height: 5px;
      border-radius: 999px;
      background: rgba(255,255,255,.30);
      transform: translateX(-50%);
    }

    #cmu-message-select-copy .cmu-select-title {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -.03em;
    }

    #cmu-message-select-copy .cmu-select-close {
      width: 38px;
      height: 38px;
      border: 0;
      border-radius: 999px;
      background: rgba(255,255,255,.10);
      color: inherit;
      font-size: 24px;
      line-height: 1;
    }

    #cmu-message-select-copy .cmu-select-tools {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 22px 12px;
    }

    #cmu-message-select-copy .cmu-select-mode {
      display: flex;
      flex: 1 1 auto;
      min-width: 0;
      padding: 3px;
      border-radius: 12px;
      background: rgba(255,255,255,.08);
    }

    #cmu-message-select-copy .cmu-select-mode button,
    #cmu-message-select-copy .cmu-select-copy-all {
      min-height: 36px;
      border: 0;
      border-radius: 9px;
      background: transparent;
      color: inherit;
      font-size: 14px;
      font-weight: 750;
    }

    #cmu-message-select-copy .cmu-select-mode button {
      flex: 1 1 0;
    }

    #cmu-message-select-copy .cmu-select-mode button[aria-pressed="true"] {
      background: rgba(255,255,255,.14);
      box-shadow: 0 1px 4px rgba(0,0,0,.16);
    }

    #cmu-message-select-copy .cmu-select-copy-all {
      flex: 0 0 auto;
      padding: 0 12px;
      background: rgba(255,255,255,.10);
    }

    #cmu-message-select-copy .cmu-select-viewport {
      min-height: 0;
      overflow-x: hidden;
      overflow-y: auto;
      overscroll-behavior: contain;
      -webkit-overflow-scrolling: touch;
      touch-action: pan-y;
      scrollbar-gutter: stable;
    }

    #cmu-message-select-copy .cmu-select-document {
      min-height: 100%;
      padding: 8px 24px calc(110px + env(safe-area-inset-bottom));
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      word-break: break-word;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans KR", sans-serif;
      font-size: 16px;
      line-height: 1.72;
    }

    #cmu-message-select-copy[data-mode="scroll"] .cmu-select-document,
    #cmu-message-select-copy[data-mode="scroll"] .cmu-select-document * {
      -webkit-user-select: none !important;
      user-select: none !important;
      -webkit-touch-callout: none !important;
      cursor: default;
    }

    #cmu-message-select-copy[data-mode="select"] .cmu-select-document,
    #cmu-message-select-copy[data-mode="select"] .cmu-select-document * {
      -webkit-user-select: text !important;
      user-select: text !important;
      -webkit-touch-callout: default !important;
      cursor: text;
    }

    html.cmu-light #cmu-message-select-copy .cmu-select-sheet,
    body[data-theme="light"] #cmu-message-select-copy .cmu-select-sheet {
      background: #f7f7f8;
      color: #171719;
    }

    html.cmu-light #cmu-message-select-copy .cmu-select-head::before,
    body[data-theme="light"] #cmu-message-select-copy .cmu-select-head::before {
      background: rgba(0,0,0,.24);
    }

    html.cmu-light #cmu-message-select-copy .cmu-select-close,
    html.cmu-light #cmu-message-select-copy .cmu-select-mode,
    html.cmu-light #cmu-message-select-copy .cmu-select-copy-all,
    body[data-theme="light"] #cmu-message-select-copy .cmu-select-close,
    body[data-theme="light"] #cmu-message-select-copy .cmu-select-mode,
    body[data-theme="light"] #cmu-message-select-copy .cmu-select-copy-all {
      background: rgba(0,0,0,.07);
    }

    html.cmu-light #cmu-message-select-copy .cmu-select-mode button[aria-pressed="true"],
    body[data-theme="light"] #cmu-message-select-copy .cmu-select-mode button[aria-pressed="true"] {
      background: rgba(0,0,0,.10);
    }

    @media (min-width: 769px) {
      #cmu-message-select-copy {
        align-items: center;
        padding: 24px;
      }
      #cmu-message-select-copy .cmu-select-sheet {
        width: min(720px, 92vw);
        height: min(84vh, 900px);
        border-radius: 24px;
        padding-bottom: 0;
      }
    }
  `);
    function cmuMessageActionsSyncRootClass() {
        document.documentElement.classList.toggle('cmu-message-actions-enabled', !!settings.messageLongPressMenu);
    }
    function cmuMessageActionsOptionCount() {
        return [
            'messageLongPressEdit',
            'messageLongPressDelete',
            'messageLongPressBranch',
            'messageLongPressCopy',
            'messageLongPressSelectCopy',
        ].reduce((sum, key) => sum + (settings[key] ? 1 : 0), 0);
    }
    function cmuMessageActionsText(value = '') {
        return String(value || '').replace(/\s+/g, ' ').trim();
    }
    function cmuMessageActionsVisible(el) {
        if (!(el instanceof HTMLElement) || !el.isConnected)
            return false;
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    }
    function cmuMessageActionsRootFromTarget(target) {
        if (!(target instanceof Element))
            return null;
        if (LOG_CAPTURE.active || LOG_CAPTURE.previewOpen)
            return null;
        if (target.closest(`#${ID.panel}, #${ID.toolbarWrapper}, #cmu-message-select-copy, ` +
            'input, textarea, select, [contenteditable="true"], button, a, ' +
            '[role="button"], [role="menuitem"], [role="menu"], [role="dialog"], ' +
            '[data-radix-popper-content-wrapper], pre, code'))
            return null;
        const body = target.closest('.wrtn-markdown, [class*="wrtn-markdown"], .markdown-body, .prose');
        const root = body?.closest?.('[data-message-group-id]');
        return root instanceof HTMLElement ? root : null;
    }
    function cmuMessageActionsTriggerScore(el) {
        if (!(el instanceof HTMLElement) || !cmuMessageActionsVisible(el))
            return -1;
        const label = cmuMessageActionsText(el.getAttribute('aria-label') ||
            el.querySelector?.('[aria-label]')?.getAttribute?.('aria-label') || '');
        const text = cmuMessageActionsText(el.textContent || '');
        if (/답변\s*비교/.test(text))
            return -1;
        let score = 0;
        if (el.matches('button[aria-label="메시지 옵션"], button[aria-label*="메시지 메뉴"]'))
            score += 20;
        if (label.includes('메시지 옵션') || label.includes('메시지 메뉴'))
            score += 14;
        if (el.getAttribute('aria-haspopup') === 'menu')
            score += 4;
        const path = el.querySelector?.('svg path')?.getAttribute?.('d') || '';
        if (path.includes('M7.04 10.73H4.5v2.54'))
            score += 8;
        return score;
    }
    function cmuMessageActionsFindTrigger(root) {
        if (!(root instanceof HTMLElement))
            return null;
        return Array.from(root.querySelectorAll('button, [aria-haspopup="menu"]'))
            .map(el => ({ el, score: cmuMessageActionsTriggerScore(el) }))
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score)[0]?.el || null;
    }
    function cmuMessageActionsFindOpenMenu(trigger) {
        const triggerId = trigger?.id || trigger?.querySelector?.('[id]')?.id || '';
        const menus = Array.from(document.querySelectorAll('[role="menu"][data-radix-menu-content], [data-radix-popper-content-wrapper] [role="menu"]'));
        for (let i = menus.length - 1; i >= 0; i--) {
            const menu = menus[i];
            if (!cmuMessageActionsVisible(menu))
                continue;
            const labelledBy = menu.getAttribute('aria-labelledby') || '';
            const text = cmuMessageActionsText(menu.textContent || '');
            if (triggerId && labelledBy === triggerId)
                return menu;
            if (text.includes('수정') || text.includes('삭제') || text.includes('분기'))
                return menu;
        }
        return null;
    }
    function cmuMessageActionsWaitForMenu(trigger, timeoutMs = 1000) {
        const immediate = cmuMessageActionsFindOpenMenu(trigger);
        if (immediate)
            return Promise.resolve(immediate);
        return new Promise(resolve => {
            let done = false;
            const finish = value => {
                if (done)
                    return;
                done = true;
                observer.disconnect();
                clearTimeout(timer);
                resolve(value || null);
            };
            const observer = new MutationObserver(() => {
                const menu = cmuMessageActionsFindOpenMenu(trigger);
                if (menu)
                    finish(menu);
            });
            observer.observe(document.body || document.documentElement, { childList: true, subtree: true, attributes: true });
            const timer = setTimeout(() => finish(cmuMessageActionsFindOpenMenu(trigger)), timeoutMs);
        });
    }
    function cmuMessageActionsActivate(el, clientX, clientY) {
        if (!(el instanceof HTMLElement))
            return;
        const target = el.matches('button') ? el : (el.querySelector('button') || el);
        const rect = target.getBoundingClientRect();
        const x = Number.isFinite(clientX) ? clientX : rect.left + rect.width / 2;
        const y = Number.isFinite(clientY) ? clientY : rect.top + rect.height / 2;
        const common = {
            bubbles: true,
            cancelable: true,
            composed: true,
            view: window,
            button: 0,
            buttons: 1,
            clientX: x,
            clientY: y,
            screenX: x,
            screenY: y,
        };
        try {
            target.focus({ preventScroll: true });
        }
        catch (_) { }
        try {
            target.dispatchEvent(new PointerEvent('pointerdown', { ...common, pointerId: 741, pointerType: 'touch', isPrimary: true }));
        }
        catch (_) { }
        try {
            target.dispatchEvent(new MouseEvent('mousedown', common));
        }
        catch (_) { }
        try {
            target.dispatchEvent(new PointerEvent('pointerup', { ...common, buttons: 0, pointerId: 741, pointerType: 'touch', isPrimary: true }));
        }
        catch (_) { }
        try {
            target.dispatchEvent(new MouseEvent('mouseup', { ...common, buttons: 0 }));
        }
        catch (_) { }
        try {
            target.click();
        }
        catch (_) { }
    }
    function cmuMessageActionsPositionMenu(menu, clientX, clientY) {
        const wrapper = menu?.closest?.('[data-radix-popper-content-wrapper]');
        if (!(wrapper instanceof HTMLElement))
            return;
        wrapper.dataset.cmuMessageActionsMenu = '1';
        wrapper.style.setProperty('position', 'fixed', 'important');
        wrapper.style.setProperty('left', '0px', 'important');
        wrapper.style.setProperty('top', '0px', 'important');
        wrapper.style.setProperty('right', 'auto', 'important');
        wrapper.style.setProperty('bottom', 'auto', 'important');
        wrapper.style.setProperty('transform', 'translate(0px, 0px)', 'important');
        const visual = window.visualViewport;
        const viewportLeft = Number(visual?.offsetLeft) || 0;
        const viewportTop = Number(visual?.offsetTop) || 0;
        const vw = Number(visual?.width) || window.innerWidth || document.documentElement.clientWidth || 0;
        const vh = Number(visual?.height) || window.innerHeight || document.documentElement.clientHeight || 0;
        const margin = 12;
        const maxMenuHeight = Math.max(120, vh - margin * 2);
        menu.style.setProperty('max-height', `${Math.floor(maxMenuHeight)}px`, 'important');
        const rect = wrapper.getBoundingClientRect();
        const rightEdge = viewportLeft + vw;
        const bottomEdge = viewportTop + vh;
        const x = Math.max(viewportLeft + margin, Math.min(clientX - rect.width / 2, rightEdge - rect.width - margin));
        const y = Math.max(viewportTop + margin, Math.min(clientY - Math.min(36, rect.height * .18), bottomEdge - rect.height - margin));
        wrapper.style.setProperty('transform', `translate(${Math.round(x)}px, ${Math.round(y)}px)`, 'important');
        CMU_MESSAGE_ACTIONS.menuWrapper = wrapper;
    }
    function cmuMessageActionsCloseMenu() {
        const wrapper = CMU_MESSAGE_ACTIONS.menuWrapper;
        const menu = wrapper?.querySelector?.('[role="menu"]');
        if (!(wrapper instanceof HTMLElement) && !(menu instanceof HTMLElement))
            return;
        const rect = menu?.getBoundingClientRect?.() || wrapper.getBoundingClientRect();
        const x = rect.left > 12 ? Math.max(2, rect.left - 8) : Math.min(window.innerWidth - 2, rect.right + 8);
        const y = Math.max(2, Math.min(window.innerHeight - 2, rect.top + 6));
        const outside = document.elementFromPoint(x, y) || document.body;
        try {
            outside.dispatchEvent(new PointerEvent('pointerdown', {
                bubbles: true, cancelable: true, composed: true,
                pointerId: 742, pointerType: 'touch', isPrimary: true,
                button: 0, buttons: 0, clientX: x, clientY: y,
            }));
        }
        catch (_) { }
        try {
            outside.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: x, clientY: y }));
        }
        catch (_) { }
        if (wrapper instanceof HTMLElement)
            delete wrapper.dataset.cmuMessageActionsMenu;
        CMU_MESSAGE_ACTIONS.menuWrapper = null;
    }
    async function cmuMessageActionsResolveMessage(root) {
        const domId = groupMessageId(root);
        if (!domId)
            return null;
        try {
            await cmuEnsureMessage(getChatId(), domId);
            const { messages, idMap } = await fetchBadgeMessagesOnce(false);
            const anchor = idMap.get(domId)?.msg || null;
            const compare = parseCompare(root);
            if (compare && compare.total > 1 && anchor && isAssistantMessage(anchor) && anchor.parentTurnId) {
                const variants = messages.filter(msg => isAssistantMessage(msg) && msg.parentTurnId === anchor.parentTurnId && messageIdOf(msg));
                if (variants.length === compare.total) {
                    const ordered = variants.sort((a, b) => (idMap.get(messageIdOf(b))?.index ?? 0) - (idMap.get(messageIdOf(a))?.index ?? 0));
                    return ordered[compare.current - 1] || anchor;
                }
            }
            return anchor;
        }
        catch (_) {
            return null;
        }
    }
    async function cmuMessageActionsOriginalText(root) {
        const message = await cmuMessageActionsResolveMessage(root);
        const apiText = messageContentOf(message);
        if (String(apiText || '').trim())
            return String(apiText);
        const body = root?.querySelector?.('.wrtn-markdown, [class*="wrtn-markdown"], .markdown-body, .prose');
        const fallback = body?.innerText || body?.textContent || '';
        if (!String(fallback).trim())
            throw new Error('메시지 원문을 찾지 못함');
        showToast('원문을 확인하지 못해 화면에 보이는 글을 복사합니다');
        return String(fallback).trim();
    }
    function cmuCloseMessageSelectSheet() {
        document.getElementById('cmu-message-select-copy')?.remove();
        CMU_MESSAGE_ACTIONS.sheetScrollY = 0;
    }
    function cmuMessageSelectSetMode(overlay, mode) {
        const next = mode === 'select' ? 'select' : 'scroll';
        overlay.dataset.mode = next;
        overlay.querySelectorAll('[data-cmu-select-mode]').forEach(button => {
            button.setAttribute('aria-pressed', button.dataset.cmuSelectMode === next ? 'true' : 'false');
        });
        if (next === 'scroll') {
            try {
                window.getSelection?.()?.removeAllRanges?.();
            }
            catch (_) { }
        }
    }
    function cmuOpenMessageSelectSheet(text) {
        cmuCloseMessageSelectSheet();
        cmuLogCaptureExitMode(true);
        cmuLogCaptureClosePreview(true);
        const overlay = document.createElement('div');
        overlay.id = 'cmu-message-select-copy';
        overlay.dataset.mode = 'scroll';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-label', '선택 복사하기');
        overlay.innerHTML = `
      <section class="cmu-select-sheet">
        <header class="cmu-select-head">
          <div class="cmu-select-title">선택 복사하기</div>
          <button type="button" class="cmu-select-close" aria-label="닫기">×</button>
        </header>
        <div class="cmu-select-tools">
          <div class="cmu-select-mode" role="group" aria-label="선택 복사 모드">
            <button type="button" data-cmu-select-mode="scroll" aria-pressed="true">스크롤</button>
            <button type="button" data-cmu-select-mode="select" aria-pressed="false">선택</button>
          </div>
          <button type="button" class="cmu-select-copy-all">전체 복사</button>
        </div>
        <div class="cmu-select-viewport">
          <div class="cmu-select-document" role="document"></div>
        </div>
      </section>`;
        const viewport = overlay.querySelector('.cmu-select-viewport');
        const documentEl = overlay.querySelector('.cmu-select-document');
        if (documentEl)
            documentEl.textContent = String(text || '');
        overlay.querySelector('.cmu-select-close')?.addEventListener('click', cmuCloseMessageSelectSheet);
        overlay.querySelectorAll('[data-cmu-select-mode]').forEach(button => {
            button.addEventListener('click', () => cmuMessageSelectSetMode(overlay, button.dataset.cmuSelectMode));
        });
        overlay.querySelector('.cmu-select-copy-all')?.addEventListener('click', async (event) => {
            const button = event.currentTarget;
            const ok = await copyTextToClipboard(String(text || ''));
            button.textContent = ok ? '복사됨' : '복사 실패';
            setTimeout(() => { if (button.isConnected)
                button.textContent = '전체 복사'; }, 900);
        });
        viewport?.addEventListener('scroll', () => {
            CMU_MESSAGE_ACTIONS.sheetScrollY = viewport.scrollTop;
        }, { passive: true });
        overlay.addEventListener('touchmove', event => {
            if (!event.target?.closest?.('.cmu-select-viewport'))
                event.preventDefault();
        }, { passive: false });
        overlay.addEventListener('click', event => {
            if (event.target === overlay)
                cmuCloseMessageSelectSheet();
        });
        document.body.appendChild(overlay);
    }
    function cmuMessageActionsExtraItem(menu, label, className, onActivate) {
        const nativeTemplate = Array.from(menu.querySelectorAll('[role="menuitem"]')).find(el => el.dataset.cmuActionHidden !== '1');
        const item = document.createElement('div');
        item.className = `${nativeTemplate?.className || ''} cmu-message-action-extra ${className}`.trim();
        item.setAttribute('role', 'menuitem');
        item.setAttribute('tabindex', '-1');
        item.innerHTML = `<span>${label}</span>`;
        const run = event => {
            event.preventDefault();
            event.stopPropagation();
            onActivate(item);
        };
        item.addEventListener('pointerdown', event => event.stopPropagation(), true);
        item.addEventListener('click', run, true);
        return item;
    }
    function cmuMessageActionsConfigureMenu(menu, root) {
        menu.querySelectorAll('.cmu-message-action-extra').forEach(el => el.remove());
        const nativeRules = [
            { pattern: /수정/, key: 'messageLongPressEdit', action: 'edit' },
            { pattern: /삭제/, key: 'messageLongPressDelete', action: 'delete' },
            { pattern: /분기/, key: 'messageLongPressBranch', action: 'branch' },
        ];
        menu.querySelectorAll('[role="menuitem"]').forEach(item => {
            const text = cmuMessageActionsText(item.textContent || '');
            const rule = nativeRules.find(entry => entry.pattern.test(text));
            if (!rule)
                return;
            item.dataset.cmuNativeAction = rule.action;
            item.dataset.cmuActionHidden = settings[rule.key] ? '0' : '1';
            item.setAttribute('aria-hidden', settings[rule.key] ? 'false' : 'true');
        });
        if (settings.messageLongPressCopy) {
            menu.appendChild(cmuMessageActionsExtraItem(menu, '복사', 'cmu-message-action-copy', async (item) => {
                const label = item.querySelector('span');
                try {
                    const text = await cmuMessageActionsOriginalText(root);
                    const ok = await copyTextToClipboard(text);
                    if (!ok)
                        throw new Error('clipboard');
                    if (label)
                        label.textContent = '복사됨';
                    showToast('메시지 원문 복사됨');
                    setTimeout(cmuMessageActionsCloseMenu, 160);
                }
                catch (_) {
                    if (label)
                        label.textContent = '복사 실패';
                    setTimeout(() => { if (label?.isConnected)
                        label.textContent = '복사'; }, 900);
                }
            }));
        }
        if (settings.messageLongPressSelectCopy) {
            menu.appendChild(cmuMessageActionsExtraItem(menu, '선택 복사', 'cmu-message-action-select-copy', async (item) => {
                const label = item.querySelector('span');
                try {
                    if (label)
                        label.textContent = '불러오는 중…';
                    const text = await cmuMessageActionsOriginalText(root);
                    cmuMessageActionsCloseMenu();
                    setTimeout(() => cmuOpenMessageSelectSheet(text), 70);
                }
                catch (_) {
                    if (label)
                        label.textContent = '불러오기 실패';
                    setTimeout(() => { if (label?.isConnected)
                        label.textContent = '선택 복사'; }, 900);
                }
            }));
        }
    }
    async function cmuMessageActionsOpen(root, clientX, clientY) {
        if (!settings.messageLongPressMenu || !isChatRoomPath() || CMU_MESSAGE_ACTIONS.opening)
            return false;
        if (!cmuMessageActionsOptionCount()) {
            showToast('길게 누르기 메뉴 항목이 모두 꺼져 있음');
            return false;
        }
        const trigger = cmuMessageActionsFindTrigger(root);
        if (!trigger) {
            showToast('이 메시지에서는 메뉴를 열 수 없음');
            return false;
        }
        CMU_MESSAGE_ACTIONS.opening = true;
        document.body.dataset.cmuOpeningMessageMenu = '1';
        try {
            cmuMessageActionsActivate(trigger, clientX, clientY);
            let menu = await cmuMessageActionsWaitForMenu(trigger, 850);
            if (!menu) {
                try {
                    trigger.dispatchEvent(new KeyboardEvent('keydown', {
                        key: 'Enter', code: 'Enter', bubbles: true, cancelable: true, composed: true,
                    }));
                }
                catch (_) { }
                menu = await cmuMessageActionsWaitForMenu(trigger, 500);
            }
            if (!menu)
                return false;
            cmuMessageActionsConfigureMenu(menu, root);
            cmuMessageActionsPositionMenu(menu, clientX, clientY);
            requestAnimationFrame(() => {
                cmuMessageActionsPositionMenu(menu, clientX, clientY);
                delete document.body.dataset.cmuOpeningMessageMenu;
            });
            return true;
        }
        finally {
            setTimeout(() => {
                delete document.body.dataset.cmuOpeningMessageMenu;
                CMU_MESSAGE_ACTIONS.opening = false;
            }, 140);
        }
    }
    function cmuMessageActionsClearGesture() {
        const gesture = CMU_MESSAGE_ACTIONS.gesture;
        if (gesture?.timer)
            clearTimeout(gesture.timer);
        CMU_MESSAGE_ACTIONS.gesture = null;
    }
    function cmuMessageActionsBegin(event, x, y, pointerId = 0) {
        if (!settings.messageLongPressMenu || !isChatRoomPath())
            return;
        if (Date.now() < CMU_MESSAGE_ACTIONS.ignoreClickUntil)
            return;
        const root = cmuMessageActionsRootFromTarget(event.target);
        if (!root || !cmuMessageActionsFindTrigger(root))
            return;
        cmuMessageActionsClearGesture();
        const gesture = {
            root,
            pointerId,
            x,
            y,
            moved: false,
            fired: false,
            timer: 0,
        };
        gesture.timer = setTimeout(() => {
            if (CMU_MESSAGE_ACTIONS.gesture !== gesture || gesture.moved)
                return;
            gesture.fired = true;
            CMU_MESSAGE_ACTIONS.ignoreClickUntil = Date.now() + 750;
            try {
                window.getSelection?.()?.removeAllRanges?.();
            }
            catch (_) { }
            cmuMessageActionsOpen(root, x, y).catch(error => {
                try {
                    console.warn(`${LOG} message actions open failed`, error);
                }
                catch (_) { }
            });
        }, CMU_MESSAGE_ACTIONS.holdDelay);
        CMU_MESSAGE_ACTIONS.gesture = gesture;
    }
    function cmuMessageActionsMove(x, y, pointerId = 0) {
        const gesture = CMU_MESSAGE_ACTIONS.gesture;
        if (!gesture || (gesture.pointerId && pointerId && gesture.pointerId !== pointerId))
            return;
        const distance = Math.hypot(x - gesture.x, y - gesture.y);
        if (distance <= CMU_MESSAGE_ACTIONS.travelLimit)
            return;
        gesture.moved = true;
        cmuMessageActionsClearGesture();
    }
    function cmuMessageMenuSettingsChanged(key) {
        if (!String(key || '').startsWith('messageLongPress'))
            return;
        cmuMessageActionsSyncRootClass();
        cmuMessageActionsClearGesture();
        cmuMessageActionsCloseMenu();
        if (!settings.messageLongPressMenu)
            cmuCloseMessageSelectSheet();
    }
    function installCmuMessageLongPressMenu() {
        if (CMU_MESSAGE_ACTIONS.installed)
            return;
        CMU_MESSAGE_ACTIONS.installed = true;
        cmuMessageActionsSyncRootClass();
        cmuRegisterGlobalGesture('message-long-press', signal => {
            if (window.PointerEvent) {
                cmuGestureListen(signal, document, 'pointerdown', event => {
                    if (isCmuProtectedEditorTarget(event.target)) {
                        cmuMessageActionsClearGesture();
                        return;
                    }
                    if (!event.isPrimary || (event.button !== undefined && event.button !== 0))
                        return;
                    if (event.pointerType !== 'touch' && event.pointerType !== 'pen')
                        return;
                    if (event.target?.closest?.('#cmu-message-select-copy'))
                        return;
                    cmuMessageActionsBegin(event, event.clientX, event.clientY, event.pointerId || 0);
                }, { capture: true, passive: true });
                cmuGestureListen(signal, document, 'pointermove', event => {
                    if (!CMU_MESSAGE_ACTIONS.gesture)
                        return;
                    if (cmuUserNoteGuardActive()) {
                        cmuMessageActionsClearGesture();
                        return;
                    }
                    cmuMessageActionsMove(event.clientX, event.clientY, event.pointerId || 0);
                }, { capture: true, passive: true });
                cmuGestureListen(signal, document, 'pointerup', cmuMessageActionsClearGesture, true);
                cmuGestureListen(signal, document, 'pointercancel', cmuMessageActionsClearGesture, true);
            }
            else {
                cmuGestureListen(signal, document, 'touchstart', event => {
                    if (isCmuProtectedEditorTarget(event.target)) {
                        cmuMessageActionsClearGesture();
                        return;
                    }
                    if (event.target?.closest?.('#cmu-message-select-copy'))
                        return;
                    const touch = event.touches?.[0];
                    if (touch)
                        cmuMessageActionsBegin(event, touch.clientX, touch.clientY, touch.identifier || 0);
                }, { capture: true, passive: true });
                cmuGestureListen(signal, document, 'touchmove', event => {
                    if (!CMU_MESSAGE_ACTIONS.gesture)
                        return;
                    if (cmuUserNoteGuardActive()) {
                        cmuMessageActionsClearGesture();
                        return;
                    }
                    const touch = event.touches?.[0];
                    if (touch)
                        cmuMessageActionsMove(touch.clientX, touch.clientY, touch.identifier || 0);
                }, { capture: true, passive: true });
                cmuGestureListen(signal, document, 'touchend', cmuMessageActionsClearGesture, true);
                cmuGestureListen(signal, document, 'touchcancel', cmuMessageActionsClearGesture, true);
            }
            cmuGestureListen(signal, document, 'contextmenu', event => {
                if (isCmuProtectedEditorTarget(event.target))
                    return;
                if (!settings.messageLongPressMenu || !isChatRoomPath())
                    return;
                if (event.target?.closest?.('#cmu-message-select-copy'))
                    return;
                const root = cmuMessageActionsRootFromTarget(event.target);
                if (!root)
                    return;
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                const gesture = CMU_MESSAGE_ACTIONS.gesture;
                const x = Number(event.clientX || gesture?.x || window.innerWidth / 2);
                const y = Number(event.clientY || gesture?.y || window.innerHeight / 2);
                cmuMessageActionsClearGesture();
                CMU_MESSAGE_ACTIONS.ignoreClickUntil = Date.now() + 750;
                cmuMessageActionsOpen(root, x, y).catch(() => { });
            }, true);
            cmuGestureListen(signal, document, 'click', event => {
                if (isCmuProtectedEditorTarget(event.target))
                    return;
                if (Date.now() >= CMU_MESSAGE_ACTIONS.ignoreClickUntil)
                    return;
                if (event.target?.closest?.('#cmu-message-select-copy, [data-radix-popper-content-wrapper]'))
                    return;
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
            }, true);
            cmuGestureListen(signal, document, 'keydown', event => {
                if (event.key !== 'Escape')
                    return;
                cmuCloseMessageSelectSheet();
                cmuMessageActionsClearGesture();
            }, true);
            cmuGestureListen(signal, document, 'scroll', event => {
                if (event.target?.closest?.('#cmu-message-select-copy'))
                    return;
                cmuMessageActionsClearGesture();
            }, true);
            cmuGestureListen(signal, window, 'blur', cmuMessageActionsClearGesture);
            cmuGestureListen(signal, document, 'visibilitychange', () => {
                if (document.hidden)
                    cmuMessageActionsClearGesture();
            });
        });
    }
    function scheduleInject(reason = 'schedule') {
        clearTimeout(injectTimer);
        injectTimer = setTimeout(() => {
            injectTimer = 0;
            boot(reason);
        }, 140);
    }
    function findLoreEntryButton() {
        return document.getElementById('lore-inj-entry-button');
    }
    function findLoreRoomTopBar() {
        let seed = document.querySelector('svg path[d^="M11 11h2v2h-2"]')?.closest('button') || null;
        if (!seed) {
            for (const img of document.querySelectorAll('img[src*="model-icon"]')) {
                if (img.closest(`#${ID.panel}, #${ID.toolbarWrapper}, #chud-sidebar, #chud-infobar`))
                    continue;
                seed = img.closest('button');
                if (seed)
                    break;
            }
        }
        if (!seed)
            return null;
        let node = seed.parentElement;
        for (let i = 0; node && i < 7; i += 1) {
            const cls = String(node.className || '');
            if (cls.includes('h-12') && cls.includes('justify-between') && (cls.includes('bg-bg_screen') || cls.includes('border-b')))
                return node;
            node = node.parentElement;
        }
        return null;
    }
    function getLoreStableSiblingState(loreButton) {
        if (!loreButton?.parentElement)
            return 'found-unplaced';
        const next = loreButton.nextElementSibling;
        if (next?.getAttribute?.('aria-haspopup') === 'menu')
            return 'before-model';
        return loreButton.dataset.cmuLorePlaced || 'found-unplaced';
    }
    function ensureLoreEntryButtonInRoomTopBar() {
        const loreButton = findLoreEntryButton();
        if (!loreButton)
            return;
        const state = getLoreStableSiblingState(loreButton);
        if (state === 'before-model')
            return;
        const topBar = findLoreRoomTopBar();
        if (!topBar)
            return;
        const modelButton = topBar.querySelector('button[aria-haspopup="menu"]') || topBar.querySelector('img[src*="model-icon"]')?.closest('button');
        if (!modelButton?.parentElement)
            return;
        if (modelButton.previousElementSibling !== loreButton)
            modelButton.parentElement.insertBefore(loreButton, modelButton);
        loreButton.dataset.cmuLorePlaced = 'before-model';
    }
    function boot(reason = 'boot') {
        syncCmuMessageTextRoots(reason === 'route' || reason === 'visible-resume' || !CMU_DOM_WATCH.textRoots.size ? null : []);
        const late = /^late-/.test(String(reason || ''));
        applyState();
        if (cmuUserNoteGuardActive())
            return;
        if (!late)
            scheduleMobileChatListPopoverLayoutSettle();
        bindEmptySendGuard();
        cmuDraftSync();
        bindComposerExpandFeature();
        scheduleCmuInputCounterSync();
        ensureSettingsPanelSilent();
        ensureTopRevealZone();
        markGlobalHeader();
        ensureLoreEntryButtonInRoomTopBar();
        ensureToolbarButton({ syncInline: false });
        ensureMobileEdgeMenuButtons();
        ensureCmuMenuSwipeZone();
        scheduleCmuEdgeMenuStateSync();
        scheduleCmuStatBarMark(0);
        applyRadiosondeTheme();
        applyNativeModelFilterCss();
        omfScanOpenDialogs();
        if (settings.nativeModelFilter && cmuHasNativeModelMenu(document))
            nmfScanNativeModelMenu();
        if (settings.wideView)
            document.querySelectorAll('main [data-message-group-id]').forEach(markCmuWideContainer);
        if (!late) scheduleThemeDecorate(true);
        if (reason === 'initial' || reason === 'route' || reason === 'visible-resume' || reason === 'setting-enabled')
            scheduleThemeDecorateBurst(reason);
        if (!shouldRun())
            return;
        if (!isChatRoomPath()) {
            resetDashboardLayout(DASH_SCROLL.input || findChatInput());
            removeDashboardSidebar();
            document.getElementById(ID.dashboard)?.remove();
            document.getElementById('chud-info-menu')?.remove();
            document.getElementById('igx-live-popup')?.remove();
        }
        if (settings.dashboardSidebar)
            refreshSideAvailability(late);
        ensureInlineBlocks();
        if (!late)
            scheduleBadgeScan();
    }
    const CMU_SELF_SELECTOR = `#${ID.panel}, #${ID.toolbarWrapper}, #${ID.topZone}, #${ID.leftMenuZone}, #${ID.rightMenuZone}, #${ID.menuSwipeZone}, #${ID.toast}, #${ID.dashboard}, #${ID.dashboardSidebar}, #${ID.logCaptureBar}, #${ID.logCapturePreview}, #${ID.inputCounterWrap}, #chud-info-menu, #chud-side-menu, #igx-live-popup, #cmu-compact-model-menu, .cmi-model-badge, .cmi-model-slot, .cac-answer-cost, #cmu-message-select-copy, .cmu-message-badge, .cmu-user-badge-row`;
    function isSelfMutation(m) {
        const el = m.target instanceof Element ? m.target : m.target?.parentElement;
        return !!el?.closest?.(CMU_SELF_SELECTOR);
    }

    const CMU_ROUTER_OWNED_SELECTOR = `${CMU_SELF_SELECTOR}, .cmu-user-badge-row`;
    const CMU_ROUTER_COMPOSER_SELECTOR = '.__chat_input_textarea, textarea[placeholder*="메시지"], textarea[placeholder*="Message"], div.ProseMirror[contenteditable="true"], div.tiptap[contenteditable="true"], p[data-placeholder*="메시지"], p[data-placeholder*="Message"]';
    const CMU_ROUTER_POPUP_SELECTOR = '#rpcm-overlay, #csp-v35-root, [data-radix-popper-content-wrapper], [data-radix-menu-content], [role="dialog"], [aria-modal="true"]';
    const CMU_ROUTER_MARKDOWN_SELECTOR = '.wrtn-markdown, [class*="wrtn-markdown"], .markdown-body, .prose, [class*="prose"]';
    function cmuRouterOwnedElement(el) {
        return el instanceof Element && !!(el.matches?.(CMU_ROUTER_OWNED_SELECTOR) || el.closest?.(CMU_ROUTER_OWNED_SELECTOR));
    }
    function cmuMutationOwnedOnly(mutation) {
        const nodes = [...mutation.addedNodes, ...mutation.removedNodes];
        return nodes.length > 0 && nodes.every(node => node instanceof Element && cmuRouterOwnedElement(node));
    }
    function cmuRouterAddMarkdown(markdown) {
        if (!(markdown instanceof HTMLElement) || !markdown.isConnected)
            return;
        if (!markdown.closest('[data-message-group-id]'))
            return;
        CMU_DOM_ROUTER.markdownNodes.add(markdown);
    }
    function markCmuWideContainer(group) {
        if (!(group instanceof HTMLElement))
            return;
        const p1 = group.parentElement;
        if (p1 instanceof HTMLElement && p1.tagName === 'DIV')
            setAttrIfMissing(p1, 'data-cmu-wide-box', '1');
        const p2 = (p1 && p1.tagName === 'DIV') ? p1.parentElement : null;
        if (p2 instanceof HTMLElement && p2.tagName === 'DIV')
            setAttrIfMissing(p2, 'data-cmu-wide-box', '1');
    }
    function cmuRouterAddGroup(group) {
        if (!(group instanceof HTMLElement) || !group.isConnected)
            return;
        if (!cmuMessageDomWorkWanted() || CMU_DOM_ROUTER.messageGroups.has(group))
            return;
        if (settings.wideView)
            markCmuWideContainer(group);
        CMU_DOM_ROUTER.messageGroups.add(group);
        if (!themeSkinEnabled())
            return;
        if (group.matches?.(CMU_ROUTER_MARKDOWN_SELECTOR))
            cmuRouterAddMarkdown(group);
        group.querySelectorAll?.(CMU_ROUTER_MARKDOWN_SELECTOR).forEach(cmuRouterAddMarkdown);
    }
    function cmuRouterCollectMessageNode(node) {
        if (!cmuMessageDomWorkWanted() || !(node instanceof Element) || cmuRouterOwnedElement(node))
            return;
        const directGroup = node.matches?.('[data-message-group-id]') ? node : node.closest?.('[data-message-group-id]');
        if (directGroup) {
            cmuRouterAddGroup(directGroup);
            return;
        }
        node.querySelectorAll?.('[data-message-group-id]').forEach(cmuRouterAddGroup);
        if (node.matches?.(CMU_ROUTER_MARKDOWN_SELECTOR))
            cmuRouterAddMarkdown(node);
        node.querySelectorAll?.(CMU_ROUTER_MARKDOWN_SELECTOR).forEach(cmuRouterAddMarkdown);
    }
    function cmuNodeTouchesComposer(node) {
        if (!(node instanceof Element))
            return false;
        if (cmuCachedChatInput && (node === cmuCachedChatInput || node.contains?.(cmuCachedChatInput)))
            return true;
        if (observedScope && (node === observedScope || node.contains?.(observedScope)))
            return true;
        if (observedScope?.contains?.(node) && node.matches?.('button, form, textarea, [contenteditable="true"]'))
            return true;
        return !!(node.matches?.(CMU_ROUTER_COMPOSER_SELECTOR) || node.querySelector?.(CMU_ROUTER_COMPOSER_SELECTOR));
    }
    function cmuNodeTouchesPopup(node) {
        return node instanceof Element && !!(node.matches?.(CMU_ROUTER_POPUP_SELECTOR) || node.closest?.(CMU_ROUTER_POPUP_SELECTOR) || node.querySelector?.(CMU_ROUTER_POPUP_SELECTOR));
    }
    function cmuNodeTouchesHeader(node) {
        const selector = 'header, [data-cmu-global-header="1"], [data-cmu-global-header-shell="1"], div[height="56"][width="100%"]';
        return node instanceof Element && !!(node.matches?.(selector) || node.querySelector?.(selector));
    }
    function cmuNodeTouchesExternalThemeMarker(node) {
        return node instanceof Element && !!(node.matches?.('#sgb-bg-root, #sgb-bg-style') || node.querySelector?.('#sgb-bg-root, #sgb-bg-style'));
    }
    function cmuNodeMayAffectSideAvailability(node) {
        if (!settings.dashboardSidebar || !(node instanceof Element) || node.closest?.('[data-message-group-id], ' + CMU_ROUTER_POPUP_SELECTOR))
            return false;
        if (observedScope?.contains?.(node) || cmuCachedChatInput?.contains?.(node))
            return false;
        return !!(node.matches?.('button, [role="button"], a[href]') || node.querySelector?.('button, [role="button"], a[href]'));
    }
    function scheduleCmuDomRouterFlush() {
        if (document.hidden) {
            CMU_DOM_ROUTER.fullResume = true;
            CMU_DOM_ROUTER.messageGroups.clear();
            CMU_DOM_ROUTER.markdownNodes.clear();
            return;
        }
        if (cmuDomRouterRaf)
            return;
        cmuDomRouterRaf = requestAnimationFrame(() => {
            cmuDomRouterRaf = 0;
            flushCmuDomRouter();
        });
    }
    function queueCmuIncrementalMessageWork(groups, markdowns) {
        groups.forEach(group => {
            if (group?.isConnected)
                CMU_DOM_PENDING_GROUPS.add(group);
        });
        markdowns.forEach(markdown => {
            if (markdown?.isConnected)
                CMU_DOM_PENDING_MARKDOWNS.add(markdown);
        });
        clearTimeout(cmuDomMessageTimer);
        cmuDomMessageTimer = setTimeout(flushCmuIncrementalMessageWork, 180);
    }
    function flushCmuIncrementalMessageWork() {
        cmuDomMessageTimer = 0;
        if (document.hidden) {
            CMU_DOM_ROUTER.fullResume = true;
            CMU_DOM_PENDING_GROUPS.clear();
            CMU_DOM_PENDING_MARKDOWNS.clear();
            return;
        }
        const groups = Array.from(CMU_DOM_PENDING_GROUPS).filter(group => group?.isConnected);
        const markdowns = Array.from(CMU_DOM_PENDING_MARKDOWNS).filter(markdown => markdown?.isConnected);
        CMU_DOM_PENDING_GROUPS.clear();
        CMU_DOM_PENDING_MARKDOWNS.clear();
        if (groups.length)
            scanBadgeGroups(groups);
        if (groups.length && themeSkinEnabled())
            decorateThemeSubset(groups);
        if (!themeSkinEnabled()) {
            clearTimeout(cmuDomQuoteTimer);
            clearTimeout(cmuDomQuoteRetryTimer);
            CMU_DOM_PENDING_QUOTES.clear();
            return;
        }
        markdowns.forEach(markdown => CMU_DOM_PENDING_QUOTES.add(markdown));
        clearTimeout(cmuDomQuoteTimer);
        clearTimeout(cmuDomQuoteRetryTimer);
        cmuDomQuoteTimer = setTimeout(() => {
            const targets = Array.from(CMU_DOM_PENDING_QUOTES).filter(markdown => markdown?.isConnected);
            decorateThemeQuotesSubset(targets);
            cmuDomQuoteRetryTimer = setTimeout(() => {
                const retryTargets = Array.from(CMU_DOM_PENDING_QUOTES).filter(markdown => markdown?.isConnected);
                CMU_DOM_PENDING_QUOTES.clear();
                decorateThemeQuotesSubset(retryTargets);
            }, 560);
        }, 260);
    }
    function flushCmuDomRouter() {
        const composerDirty = CMU_DOM_ROUTER.composerDirty;
        const headerDirty = CMU_DOM_ROUTER.headerDirty;
        const popupDirty = CMU_DOM_ROUTER.popupDirty;
        const themeDirty = CMU_DOM_ROUTER.themeDirty;
        const nativeModelDirty = CMU_DOM_ROUTER.nativeModelDirty;
        const sideDirty = CMU_DOM_ROUTER.sideDirty && settings.dashboardSidebar;
        const statDirty = CMU_DOM_ROUTER.statDirty;
        const groups = Array.from(CMU_DOM_ROUTER.messageGroups);
        const markdowns = Array.from(CMU_DOM_ROUTER.markdownNodes);
        for (const key of ['composerDirty', 'headerDirty', 'popupDirty', 'themeDirty', 'nativeModelDirty', 'sideDirty', 'statDirty'])
            CMU_DOM_ROUTER[key] = false;
        CMU_DOM_ROUTER.messageGroups.clear();
        CMU_DOM_ROUTER.markdownNodes.clear();
        syncCmuMessageTextRoots(groups);
        let inlineDirty = sideDirty;
        let input = null;
        if (sideDirty)
            refreshSideAvailability(true);
        if (composerDirty) {
            for (const entry of CMU_SHARED.composers.values()) entry.notify();
            const cachedOk = cmuCachedChatInput instanceof Element && cmuCachedChatInput.isConnected && !isInsideKnownPopup(cmuCachedChatInput);
            const now = Date.now();
            if (!cachedOk || now - Number(flushCmuDomRouter._composerHealAt || 0) >= 900) {
                flushCmuDomRouter._composerHealAt = now;
                if (!cachedOk)
                    invalidateCmuChatInputCache();
                input = findChatInput(!cachedOk);
                cmuDraftSync();
                ensureToolbarButton({ syncInline: false });
                inlineDirty = true;
            }
            scheduleComposerExpandSync();
            scheduleCmuInputCounterSync();
            scheduleEmptySendGuardUiUpdate();
        }
        if (inlineDirty)
            ensureInlineBlocks(input || findChatInput());
        if (headerDirty) {
            markGlobalHeader();
            ensureLoreEntryButtonInRoomTopBar();
            ensureMobileEdgeMenuButtons();
        }
        if (popupDirty) {
            const userNoteOpen = syncCmuUserNoteDialogState();
            omfScanOpenDialogs();
            if (!userNoteOpen) {
                scheduleMobileChatListPopoverLayoutSettle();
                scheduleCmuEdgeMenuStateSync();
            }
        }
        if (nativeModelDirty && settings.nativeModelFilter)
            scheduleNmfScan();
        if (statDirty)
            scheduleCmuStatBarMark();
        if (themeDirty) {
            applyRadiosondeTheme();
            scheduleThemeDecorate(true);
        }
        if (groups.length || markdowns.length)
            queueCmuIncrementalMessageWork(groups, markdowns);
    }
    function cmuMessageDomWorkWanted() {
        return shouldRun() && isChatRoomPath() && !!(settings.wideView || settings.themeSkin || settings.badgeChars || settings.badgeTime || settings.modelIcon || settings.answerCost);
    }
    function cmuMessageTextWorkWanted() {
        // Time, model and API-based character/cost badges do not consume streaming text.
        return themeSkinEnabled();
    }
    function cmuExpectChildChange(target, added, removed) {
        if (!bootObserver || !target?.isConnected)
            return;
        let records = CMU_DOM_WATCH.ownedRecords.get(target);
        if (!records) {
            records = [];
            CMU_DOM_WATCH.ownedRecords.set(target, records);
        }
        records.push({ added: Array.from(added), removed: Array.from(removed) });
    }
    function cmuConsumeOwnedChange(mutation) {
        if (mutation.type !== 'childList')
            return false;
        const records = CMU_DOM_WATCH.ownedRecords.get(mutation.target);
        if (!records?.length)
            return false;
        const same = (expected, actual) => expected.length === actual.length && expected.every((node, i) => node === actual[i]);
        const index = records.findIndex(record => same(record.added, mutation.addedNodes) && same(record.removed, mutation.removedNodes));
        if (index < 0)
            return false;
        records.splice(index, 1);
        if (!records.length)
            CMU_DOM_WATCH.ownedRecords.delete(mutation.target);
        return true;
    }
    function cmuUnwrapQuoteNode(node) {
        const text = document.createTextNode(node.textContent || '');
        cmuExpectChildChange(node.parentNode, [text], [node]);
        node.replaceWith(text);
    }
    function cmuHasNativeModelMenu(node) {
        if (!settings.nativeModelFilter || !node?.querySelectorAll)
            return false;
        const rootSelector = nmfNativeModelRootSelector();
        const roots = new Set();
        if (node instanceof Element) {
            const closest = node.closest(rootSelector);
            if (closest)
                roots.add(closest);
        }
        node.querySelectorAll(rootSelector).forEach(root => roots.add(root));
        for (const root of roots) {
            if (root.isConnected && root.getAttribute('data-state') !== 'closed' && root.querySelector('img[src*="model-icon"], img[srcset*="model-icon"], source[srcset*="model-icon"], [style*="model-icon"]'))
                return true;
        }
        return false;
    }
    function cmuQueueNativeUiModeChange() {
        if (CMU_DOM_WATCH.nativeModeTimer)
            return;
        CMU_DOM_WATCH.nativeModeTimer = setTimeout(() => {
            CMU_DOM_WATCH.nativeModeTimer = 0;
            cmiHandleNativeUiModeChange();
        }, 60);
    }
    function syncCmuMessageTextRoots(groups = null) {
        if (!cmuMessageTextWorkWanted()) {
            CMU_DOM_WATCH.textObserver?.disconnect();
            CMU_DOM_WATCH.textRoots.clear();
            return;
        }
        if (!CMU_DOM_WATCH.textObserver) {
            CMU_DOM_WATCH.textObserver = new MutationObserver(mutations => {
                if (document.hidden) {
                    CMU_DOM_ROUTER.fullResume = true;
                    return;
                }
                for (const mutation of mutations) {
                    if (isSelfMutation(mutation))
                        continue;
                    const group = mutation.target.parentElement?.closest('[data-message-group-id]');
                    if (group) {
                        const markdown = mutation.target.parentElement?.closest(CMU_ROUTER_MARKDOWN_SELECTOR);
                        if (markdown && themeSkinEnabled()) {
                            delete markdown.dataset.cmuThemeQuotedLen;
                            markdown.dataset.cmuThemeLenAt = String(Date.now());
                        }
                        cmuRouterAddGroup(group);
                    }
                }
                if (CMU_DOM_ROUTER.messageGroups.size)
                    scheduleCmuDomRouterFlush();
            });
        }
        const roots = CMU_DOM_WATCH.textRoots;
        const observer = CMU_DOM_WATCH.textObserver;
        let rebuild = false;
        for (const root of roots) {
            if (!root.isConnected) {
                roots.delete(root);
                rebuild = true;
            }
        }
        for (const group of groups || document.querySelectorAll('main [data-message-group-id]')) {
            if (!(group instanceof Element) || !group.isConnected)
                continue;
            const parent = group.parentElement;
            const root = parent && !parent.matches('main, body, html') && !(cmuCachedChatInput && parent.contains(cmuCachedChatInput)) ? parent : group;
            if (Array.from(roots).some(existing => existing === root || existing.contains(root)))
                continue;
            for (const existing of roots) {
                if (root.contains(existing)) {
                    roots.delete(existing);
                    rebuild = true;
                }
            }
            roots.add(root);
            if (!rebuild)
                observer.observe(root, { characterData: true, subtree: true });
        }
        if (rebuild) {
            observer.disconnect();
            roots.forEach(root => observer.observe(root, { characterData: true, subtree: true }));
        }
    }
    function syncCmuDomWatchOptions() {
        if (!bootObserver || !shouldRun() || !document.body)
            return;
        const attributeFilter = ['aria-checked', 'data-state', 'aria-hidden', 'hidden', 'placeholder', 'aria-label'];
        if (settings.pauseAnimatedThumbs || settings.nativeModelFilter)
            attributeFilter.push('src', 'srcset');
        const key = attributeFilter.join(',') + ':' + String(cmuMessageTextWorkWanted());
        if (CMU_DOM_WATCH.attributeKey === key)
            return;
        CMU_DOM_WATCH.attributeKey = key;
        bootObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter });
        syncCmuMessageTextRoots();
    }
    function installCmuThemeRootWatch() {
        CMU_DOM_WATCH.themeObserver?.disconnect();
        const signature = () => `${detectCmuTheme()}:${isCmuLightTheme()}`;
        CMU_DOM_WATCH.themeSignature = signature();
        CMU_DOM_WATCH.themeObserver = new MutationObserver(() => {
            const next = signature();
            if (next === CMU_DOM_WATCH.themeSignature)
                return;
            CMU_DOM_WATCH.themeSignature = next;
            CMU_DOM_ROUTER.themeDirty = true;
            scheduleCmuDomRouterFlush();
        });
        for (const root of [document.documentElement, document.body]) {
            if (root)
                CMU_DOM_WATCH.themeObserver.observe(root, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] });
        }
    }
    function startBootObserver() {
        bootObserver?.disconnect();
        if (!document.body)
            return;
        bootObserver = new MutationObserver(mutations => {
            if (document.hidden) {
                CMU_DOM_ROUTER.fullResume = true;
                CMU_DOM_WATCH.ownedRecords = new WeakMap();
                return;
            }
            let dirty = false;
            const structureNodes = new Set();
            for (const mutation of mutations) {
                if (cmuConsumeOwnedChange(mutation) || isSelfMutation(mutation))
                    continue;
                const target = mutation.target instanceof Element ? mutation.target : mutation.target.parentElement;
                if (mutation.type === 'attributes') {
                    if (target?.matches('[role="dialog"], [aria-modal="true"], textarea') || target?.closest('[role="dialog"], [aria-modal="true"]')) {
                        CMU_DOM_ROUTER.popupDirty = true; dirty = true;
                    }
                    if ((mutation.attributeName === 'src' || mutation.attributeName === 'srcset')) {
                        if (target instanceof HTMLImageElement)
                            scheduleAnimatedThumbState(target);
                        if (cmuHasNativeModelMenu(target)) {
                            CMU_DOM_ROUTER.nativeModelDirty = true;
                            dirty = true;
                        }
                        continue;
                    }
                    if (mutation.attributeName === 'data-state' && target?.matches(CMU_ROUTER_POPUP_SELECTOR)) {
                        CMU_DOM_ROUTER.popupDirty = true;
                        dirty = true;
                        if (cmuHasNativeModelMenu(target))
                            CMU_DOM_ROUTER.nativeModelDirty = true;
                    }
                    if (cmiIsNativeUiModeControl(target))
                        cmuQueueNativeUiModeChange();
                    continue;
                }
                if (cmuMutationOwnedOnly(mutation))
                    continue;
                const group = target?.closest('[data-message-group-id]');
                if (group) {
                    const markdown = target?.closest(CMU_ROUTER_MARKDOWN_SELECTOR);
                    if (markdown && themeSkinEnabled()) {
                        delete markdown.dataset.cmuThemeQuotedLen;
                        markdown.dataset.cmuThemeLenAt = String(Date.now());
                    }
                    cmuRouterAddGroup(group);
                }
                // Text replacements within messages never trigger composer/header/sidebar discovery.
                for (const node of [...mutation.addedNodes, ...mutation.removedNodes]) {
                    if (!(node instanceof Element) || cmuRouterOwnedElement(node))
                        continue;
                    if (group) {
                        scheduleAnimatedThumbState(node);
                        if (!cmuNodeTouchesPopup(node))
                            continue;
                    }
                    structureNodes.add(node);
                }
            }
            // React can report both an ancestor and its descendants in the same batch.
            const roots = Array.from(structureNodes).filter(node => {
                for (let parent = node.parentElement; parent; parent = parent.parentElement) {
                    if (structureNodes.has(parent))
                        return false;
                }
                return true;
            });
            for (const node of roots) {
                if (cmuNodeTouchesExternalThemeMarker(node)) {
                    cmuExternalThemeProvider = '';
                    CMU_DOM_ROUTER.themeDirty = true;
                    dirty = true;
                }
                scheduleAnimatedThumbState(node);
                cmuRouterCollectMessageNode(node);
                if (cmuNodeTouchesComposer(node)) {
                    CMU_DOM_ROUTER.composerDirty = true;
                    dirty = true;
                }
                if (cmuNodeTouchesPopup(node)) {
                    CMU_DOM_ROUTER.popupDirty = true;
                    dirty = true;
                    if (cmuHasNativeModelMenu(node))
                        CMU_DOM_ROUTER.nativeModelDirty = true;
                }
                if (cmuNodeTouchesHeader(node)) {
                    CMU_DOM_ROUTER.headerDirty = true;
                    dirty = true;
                }
                if (cmuNodeMayAffectSideAvailability(node)) {
                    CMU_DOM_ROUTER.sideDirty = true;
                    dirty = true;
                }
                if (settings.hideStatBar && (node.matches('[data-stat-index]') || node.querySelector('[data-stat-index]'))) {
                    CMU_DOM_ROUTER.statDirty = true;
                    dirty = true;
                }
            }
            CMU_DOM_WATCH.ownedRecords = new WeakMap();
            if (Array.from(CMU_DOM_WATCH.textRoots).some(root => !root.isConnected))
                dirty = true;
            if (cmuCachedChatInput && !cmuCachedChatInput.isConnected) {
                CMU_DOM_ROUTER.composerDirty = true;
                dirty = true;
            }
            if (dirty || CMU_DOM_ROUTER.messageGroups.size || CMU_DOM_ROUTER.markdownNodes.size)
                scheduleCmuDomRouterFlush();
        });
        CMU_DOM_WATCH.attributeKey = '';
        syncCmuDomWatchOptions();
        installCmuThemeRootWatch();
    }
    const CMU_DOUBLE_OPEN = new Set(['"', '“', '「', '❝']);
    const CMU_DOUBLE_CLOSE = new Set(['"', '”', '」', '❞']);
    const CMU_SINGLE_OPEN = new Set(["'", '‘']);
    const CMU_SINGLE_CLOSE = new Set(["'", '’']);
    const CMU_QUOTE_CHAR_RE = /["'“”‘’「」❝❞]/;
    const CMU_THEME_STATE = { quoteSeq: 0, quoteHealTimer: 0, quoteHealUntil: 0, nativeHealAt: 0, quoteWraps: new Map() };
    function detectCmuTheme() {
        const hints = [
            document.documentElement.getAttribute('data-theme'),
            document.body?.getAttribute('data-theme'),
            document.documentElement.className,
            document.body?.className,
            document.documentElement.style.colorScheme,
            document.body?.style?.colorScheme,
        ].join(' ').toLowerCase();
        if (/\bdark\b|theme-dark|dark-mode|color-scheme-dark/.test(hints))
            return 'dark';
        if (/\blight\b|theme-light|light-mode|color-scheme-light/.test(hints))
            return 'light';
        return 'dark';
    }
    function isCmuLightTheme() {
        return detectCmuTheme() === 'light';
    }
    function themeSkinEnabled() {
        return shouldRun() && !!settings.themeSkin && isChatRoomPath() && !isCmuExternalThemeActive();
    }
    function clearCmuOwnedThemeDecorations() {
        clearTimeout(themeDecorateTimer);
        clearTimeout(CMU_THEME_STATE.quoteHealTimer);
        CMU_THEME_STATE.quoteHealTimer = 0;
        CMU_THEME_STATE.quoteHealUntil = 0;
        // 외부 테마가 같은 텍스트를 이미 다시 감쌌을 수 있으므로, 예전 원문
        // 노드를 재삽입하지 않는다. 현재 남아 있는 CMU 래퍼만 제자리에서 푼다.
        restoreLooseCmuThemeQuoteSpans?.();
        const names = [
            'data-cmu-theme-message-group', 'data-cmu-theme-novel-group', 'data-cmu-theme-bubble', 'data-cmu-theme-bubble-fallback',
            'data-cmu-theme-input-host', 'data-cmu-theme-input-box', 'data-cmu-theme-codeblock', 'data-cmu-theme-codeblock-head',
            'data-cmu-theme-codeblock-body', 'data-cmu-theme-radiosonde-skin', 'data-cmu-theme-radiosonde-head', 'data-cmu-theme-radiosonde-part'
        ];
        try {
            document.querySelectorAll(names.map(n => `[${n}]`).join(',')).forEach(el => {
                if (!(el instanceof HTMLElement))
                    return;
                names.forEach(name => el.removeAttribute(name));
                if (el.dataset?.cmuCbCleaned)
                    delete el.dataset.cmuCbCleaned;
            });
        }
        catch (_) { }
        resetThemeQuoteDecorateCache(document);
        if (CMU_THEME_STATE.quoteWraps instanceof Map)
            CMU_THEME_STATE.quoteWraps.clear();
    }
    function clearThemeDecorations() {
        if (isCmuExternalThemeActive()) {
            clearCmuOwnedThemeDecorations();
            return;
        }
        const names = [
            'data-cmu-theme-message-group', 'data-cmu-theme-novel-group', 'data-cmu-theme-bubble', 'data-cmu-theme-bubble-fallback', 'data-cmu-theme-input-host', 'data-cmu-theme-input-box', 'data-cmu-theme-codeblock', 'data-cmu-theme-codeblock-head', 'data-cmu-theme-codeblock-body', 'data-cmu-theme-radiosonde-skin', 'data-cmu-theme-radiosonde-head', 'data-cmu-theme-radiosonde-part',
            'data-sgb-message-group', 'data-sgb-novel-group', 'data-sgb-bubble-parent', 'data-sgb-bubble', 'data-sgb-bubble-fallback', 'data-sgb-edit-bubble', 'data-sgb-edit-box', 'data-sgb-input-host', 'data-sgb-input-box', 'data-sgb-codeblock', 'data-sgb-codeblock-head', 'data-sgb-codeblock-body', 'data-sgb-radiosonde-skin', 'data-sgb-radiosonde-head', 'data-sgb-radiosonde-barline', 'data-sgb-radiosonde-part'
        ];
        document.querySelectorAll(names.map(n => `[${n}]`).join(',')).forEach(el => {
            if (!(el instanceof HTMLElement))
                return;
            names.forEach(name => el.removeAttribute(name));
        });
        restoreTrackedThemeQuoteWraps?.();
        restoreLooseThemeQuoteSpans?.();
        if (CMU_THEME_STATE.quoteWraps instanceof Map)
            CMU_THEME_STATE.quoteWraps.clear();
    }
    function isProbablyThemeNovelBubble(el) {
        const cls = String(el?.className || '');
        const style = String(el?.getAttribute?.('style') || '').replace(/\s+/g, '').toLowerCase();
        return cls.includes('rounded-none') || cls.includes('bg-transparent') || cls.includes('border-y') ||
            (cls.includes('px-0') && cls.includes('py-0')) || style.includes('background-color:transparent') || style.includes('border-radius:0');
    }
    function decorateThemeBubbles() {
        decorateThemeSubset(document.querySelectorAll('main [data-message-group-id]'));
    }
    function decorateThemeInputAndRadiosondeBorderless() {
        document.querySelectorAll('main .__chat_input_textarea, main .tiptap.ProseMirror[contenteditable="true"], main .ProseMirror[contenteditable="true"], main [contenteditable="true"][translate="no"], main textarea').forEach(input => {
            if (!(input instanceof HTMLElement))
                return;
            if (input.closest(`#${ID.panel}`) || isInsideKnownPopup(input))
                return;
            const box = input.closest('div[class*="rounded-lg"][class*="border"]')
                || input.closest('div[class*="rounded"][class*="border"]')
                || input.closest('div[class*="rounded"]')
                || input.parentElement;
            if (box instanceof HTMLElement) {
                setAttrIfMissing(box, 'data-cmu-theme-input-box');
                setAttrIfMissing(box, 'data-sgb-input-box');
            }
            const host = input.closest('div[class*="bg-bg_screen"]') || input.closest('div[class*="pointer-events-auto"]') || input.closest('form');
            if (host instanceof HTMLElement) {
                setAttrIfMissing(host, 'data-cmu-theme-input-host');
                setAttrIfMissing(host, 'data-sgb-input-host');
            }
        });
        const livePopup = document.querySelector('#igx-live-popup');
        if (livePopup instanceof HTMLElement) {
            setAttrIfMissing(livePopup, 'data-cmu-theme-radiosonde-skin');
            setAttrIfMissing(livePopup, 'data-sgb-radiosonde-skin');
            const head = livePopup.querySelector('#igx-live-head');
            if (head instanceof HTMLElement) {
                setAttrIfMissing(head, 'data-cmu-theme-radiosonde-head');
                setAttrIfMissing(head, 'data-sgb-radiosonde-head');
            }
            const barline = livePopup.querySelector('#igx-live-barline');
            if (barline instanceof HTMLElement)
                setAttrIfMissing(barline, 'data-sgb-radiosonde-barline');
            livePopup.querySelectorAll('.bitem, .igx-btn').forEach(el => {
                if (el instanceof HTMLElement) {
                    setAttrIfMissing(el, 'data-cmu-theme-radiosonde-part');
                    setAttrIfMissing(el, 'data-sgb-radiosonde-part');
                }
            });
        }
    }
    function splitCmuQuotes(text, openSet, closeSet, type) {
        const out = [];
        const n = text.length;
        let i = 0;
        while (i < n) {
            const ch = text[i];
            if (openSet.has(ch)) {
                let j = i + 1;
                while (j < n && !closeSet.has(text[j]))
                    j++;
                if (j < n) {
                    out.push({ type, text: text.slice(i, j + 1) });
                    i = j + 1;
                    continue;
                }
                out.push({ type: 'text', text: text.slice(i) });
                break;
            }
            let j = i;
            while (j < n && !openSet.has(text[j]))
                j++;
            out.push({ type: 'text', text: text.slice(i, j) });
            i = j;
        }
        return out;
    }
    function isCmuEnglishApostropheWordChar(ch) {
        return typeof ch === 'string' && ch.length === 1 && /[A-Za-z0-9]/.test(ch);
    }
    function isCmuSingleQuoteOpening(prev, ch, next) {
        if (!CMU_SINGLE_OPEN.has(ch) || !next || /\s/.test(next))
            return false;
        // I've, don't, That's, Codi's처럼 영문 단어 안의 '는 인용부호가 아니다.
        if (isCmuEnglishApostropheWordChar(prev) && isCmuEnglishApostropheWordChar(next))
            return false;
        return !prev || /[\s([{<（［｛〈《「『【〔〖〘〚“‘\"—–-]/.test(prev);
    }
    function isCmuSingleQuoteClosing(prev, ch, next) {
        if (!CMU_SINGLE_CLOSE.has(ch) || !prev || /\s/.test(prev))
            return false;
        if (isCmuEnglishApostropheWordChar(prev) && isCmuEnglishApostropheWordChar(next))
            return false;
        if (!next || /[\s)\]}>）］｝〉》」』】〕〗〙〛.,!?;:…，。！？；：”’\"]/.test(next))
            return true;
        // '런던'은처럼 닫는 작은따옴표 뒤에 한글 조사가 붙는 표기는 허용한다.
        return /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(next);
    }
    function splitCmuSingleQuotes(text) {
        const out = [];
        let cursor = 0;
        let start = -1;
        for (let i = 0; i < text.length; i += 1) {
            const ch = text[i];
            const prev = i > 0 ? text[i - 1] : '';
            const next = i + 1 < text.length ? text[i + 1] : '';
            if (start < 0) {
                if (isCmuSingleQuoteOpening(prev, ch, next))
                    start = i;
                continue;
            }
            if (!isCmuSingleQuoteClosing(prev, ch, next))
                continue;
            if (start > cursor)
                out.push({ type: 'text', text: text.slice(cursor, start) });
            out.push({ type: 'single', text: text.slice(start, i + 1) });
            cursor = i + 1;
            start = -1;
        }
        if (cursor < text.length)
            out.push({ type: 'text', text: text.slice(cursor) });
        return out;
    }
    function splitCmuSingleQuotesByLine(text) {
        const out = [];
        const lineBreakRe = /\r?\n/g;
        let cursor = 0;
        let match;
        while ((match = lineBreakRe.exec(text))) {
            const line = text.slice(cursor, match.index);
            if (line)
                out.push(...splitCmuSingleQuotes(line));
            out.push({ type: 'text', text: match[0] });
            cursor = match.index + match[0].length;
        }
        const tail = text.slice(cursor);
        if (tail)
            out.push(...splitCmuSingleQuotes(tail));
        return out;
    }
    function buildCmuQuoteSegments(text) {
        const doubles = splitCmuQuotes(text, CMU_DOUBLE_OPEN, CMU_DOUBLE_CLOSE, 'double');
        const segs = [];
        doubles.forEach(seg => {
            if (seg.type === 'double')
                segs.push(seg);
            else
                splitCmuSingleQuotesByLine(seg.text).forEach(s => segs.push(s));
        });
        return segs;
    }
    function wrapCmuQuoteTextNode(textNode) {
        const value = textNode.nodeValue || '';
        if (!CMU_QUOTE_CHAR_RE.test(value))
            return;
        const segs = buildCmuQuoteSegments(value);
        if (!segs.some(seg => seg.type !== 'text'))
            return;
        const parent = textNode.parentNode;
        if (!parent)
            return;
        const frag = document.createDocumentFragment();
        const insertedNodes = [];
        const groupId = `cmu-q${++CMU_THEME_STATE.quoteSeq}`;
        segs.forEach(seg => {
            if (!seg.text)
                return;
            let node;
            if (seg.type === 'text') {
                node = document.createTextNode(seg.text);
            }
            else {
                node = document.createElement('span');
                node.setAttribute('data-cmu-theme-quote', seg.type);
                node.setAttribute('data-cmu-theme-quote-group', groupId);
                node.setAttribute('data-sgb-quote', seg.type);
                node.setAttribute('data-sgb-quote-group', groupId);
                node.textContent = seg.text;
            }
            insertedNodes.push(node);
            frag.appendChild(node);
        });
        CMU_THEME_STATE.quoteWraps.set(groupId, {
            originalNode: textNode,
            insertedNodes
        });
        cmuExpectChildChange(parent, insertedNodes, [textNode]);
        parent.replaceChild(frag, textNode);
    }
    function unwrapThemeQuotesInsideCodeblocks() {
        document.querySelectorAll('main :is([data-cmu-theme-codeblock], [data-sgb-codeblock], [data-cmu-theme-codeblock-body], [data-sgb-codeblock-body], .wrtn-codeblock, pre, code) :is([data-cmu-theme-quote], [data-sgb-quote])').forEach(el => {
            if (!(el instanceof HTMLElement))
                return;
            try {
                cmuUnwrapQuoteNode(el);
            }
            catch (_) { }
        });
    }
    function resetThemeQuoteDecorateCache(root = document) {
        try {
            root.querySelectorAll?.('main [data-message-group-id] .wrtn-markdown, main [data-message-group-id] [class*="wrtn-markdown"], main [data-message-group-id] .markdown-body, main [data-message-group-id] .prose').forEach(md => {
                if (!(md instanceof HTMLElement))
                    return;
                delete md.dataset.cmuThemeLen;
                delete md.dataset.cmuThemeLenAt;
                delete md.dataset.cmuThemeQuotedLen;
            });
        }
        catch (_) { }
    }
    function cmuPruneStaleQuoteWraps() {
        const wraps = CMU_THEME_STATE.quoteWraps;
        if (!(wraps instanceof Map) || wraps.size < 400)
            return;
        for (const [groupId, record] of Array.from(wraps.entries())) {
            const nodes = Array.isArray(record?.insertedNodes) ? record.insertedNodes : [];
            const alive = record?.originalNode?.isConnected || nodes.some(n => n?.isConnected);
            if (!alive)
                wraps.delete(groupId);
        }
    }
    function restoreTrackedThemeQuoteWraps() {
        const wraps = CMU_THEME_STATE.quoteWraps;
        if (!(wraps instanceof Map) || wraps.size <= 0)
            return;
        for (const [groupId, record] of Array.from(wraps.entries())) {
            try {
                const originalNode = record?.originalNode;
                const insertedNodes = Array.isArray(record?.insertedNodes) ? record.insertedNodes : [];
                if (!(originalNode instanceof Text)) {
                    wraps.delete(groupId);
                    continue;
                }
                const firstConnected = insertedNodes.find(node => node?.isConnected && node.parentNode);
                const parent = firstConnected?.parentNode || originalNode.parentNode;
                if (parent && !originalNode.isConnected) {
                    cmuExpectChildChange(parent, [originalNode], []);
                    parent.insertBefore(originalNode, firstConnected || null);
                }
                insertedNodes.forEach(node => {
                    if (node && node !== originalNode && node.parentNode) {
                        try {
                            cmuExpectChildChange(node.parentNode, [], [node]);
                            node.parentNode.removeChild(node);
                        }
                        catch (_) { }
                    }
                });
                wraps.delete(groupId);
            }
            catch (err) {
                console.warn(`${LOG} tracked quote restore failed`, err);
            }
        }
    }
    function restoreLooseThemeQuoteSpans() {
        if (isCmuExternalThemeActive()) {
            restoreLooseCmuThemeQuoteSpans();
            return;
        }
        document.querySelectorAll('[data-cmu-theme-quote], [data-sgb-quote]').forEach(span => {
            try {
                if (!(span instanceof HTMLElement))
                    return;
                cmuUnwrapQuoteNode(span);
            }
            catch (err) {
                console.warn(`${LOG} loose quote unwrap failed`, err);
            }
        });
    }
    function restoreLooseCmuThemeQuoteSpans() {
        document.querySelectorAll('[data-cmu-theme-quote]').forEach(span => {
            try {
                if (!(span instanceof HTMLElement))
                    return;
                cmuUnwrapQuoteNode(span);
            }
            catch (err) {
                console.warn(`${LOG} CMU quote unwrap failed`, err);
            }
        });
    }
    function restoreThemeQuotesForReact() {
        try {
            restoreTrackedThemeQuoteWraps();
            restoreLooseThemeQuoteSpans();
            resetThemeQuoteDecorateCache(document);
        }
        catch (err) {
            console.warn(`${LOG} quote self-heal restore failed`, err);
        }
    }
    function scheduleThemeQuoteReapplyAfterReact(delay = 1500) {
        if (isCmuExternalThemeActive())
            return;
        clearTimeout(CMU_THEME_STATE.quoteHealTimer);
        CMU_THEME_STATE.quoteHealTimer = setTimeout(() => {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    try {
                        CMU_THEME_STATE.quoteHealUntil = 0;
                        if (!themeSkinEnabled())
                            return;
                        resetThemeQuoteDecorateCache(document);
                        decorateThemeQuotes();
                    }
                    catch (err) {
                        console.warn(`${LOG} quote self-heal reapply failed`, err);
                    }
                });
            });
        }, Math.max(0, Number(delay) || 0));
    }
    function decorateThemeQuotes() {
        if (!themeSkinEnabled() || Date.now() < Number(CMU_THEME_STATE.quoteHealUntil || 0)) return;
        unwrapThemeQuotesInsideCodeblocks();
        decorateThemeQuotesSubset(document.querySelectorAll('main [data-message-group-id] .wrtn-markdown, main [data-message-group-id] .markdown-body, main [data-message-group-id] .prose'));
    }
    function decorateThemeCodeblock(cb) {
        if (!(cb instanceof HTMLElement))
            return;
        if (cb.closest('#chud-sidebar, #chud-infobar, #igx-live-popup'))
            return;
        if (cb.matches('pre') && cb.closest('.wrtn-codeblock')) {
            ['data-cmu-theme-codeblock', 'data-sgb-codeblock', 'data-cmu-theme-codeblock-head', 'data-sgb-codeblock-head', 'data-cmu-theme-codeblock-body', 'data-sgb-codeblock-body'].forEach(name => cb.removeAttribute(name));
            if (cb.dataset?.cmuCbCleaned)
                delete cb.dataset.cmuCbCleaned;
            return;
        }
        setAttrIfMissing(cb, 'data-cmu-theme-codeblock');
        setAttrIfMissing(cb, 'data-sgb-codeblock');
        if (cb.dataset.cmuCbCleaned === '1')
            return;
        cb.dataset.cmuCbCleaned = '1';
        cb.querySelectorAll('[data-cmu-theme-codeblock-head], [data-sgb-codeblock-head], [data-cmu-theme-codeblock-body], [data-sgb-codeblock-body], [data-cmu-theme-quote], [data-sgb-quote]').forEach(el => {
            if (!(el instanceof HTMLElement))
                return;
            el.removeAttribute('data-cmu-theme-codeblock-head');
            el.removeAttribute('data-sgb-codeblock-head');
            el.removeAttribute('data-cmu-theme-codeblock-body');
            el.removeAttribute('data-sgb-codeblock-body');
            el.removeAttribute('data-cmu-theme-quote');
            el.removeAttribute('data-sgb-quote');
            ['background', 'background-color', 'background-image', 'width', 'min-width', 'max-width', 'white-space', 'overflow-wrap', 'word-break', 'display'].forEach(prop => {
                el.style.removeProperty(prop);
            });
        });
    }
    function decorateThemeCodeblocks() {
        document.querySelectorAll('main .wrtn-codeblock, main pre').forEach(decorateThemeCodeblock);
    }
    function decorateThemeSkin() {
        applyState();
        if (!themeSkinEnabled()) {
            clearThemeDecorations();
            return;
        }
        decorateThemeBubbles();
        decorateThemeInputAndRadiosondeBorderless();
        decorateThemeQuotes();
    }
    function decorateThemeSubset(groups) {
        if (!themeSkinEnabled())
            return;
        for (const group of groups || []) {
            if (!(group instanceof HTMLElement) || !group.isConnected)
                continue;
            setAttrIfMissing(group, 'data-cmu-theme-message-group');
            setAttrIfMissing(group, 'data-sgb-message-group');
            const markdowns = Array.from(group.querySelectorAll(CMU_ROUTER_MARKDOWN_SELECTOR));
            markdowns.forEach(markdown => {
                if (!(markdown instanceof HTMLElement) || markdown.closest('.not-wrtn-markdown, #chud-sidebar, #chud-infobar, #igx-live-popup'))
                    return;
                const bubble = markdown.closest('div[class*="break-all"]') || markdown.closest('div[class*="rounded"][class*="px"]') || markdown.closest('div[class*="rounded"]') || markdown.closest('div[class*="bg-surface_chat"]') || markdown.closest('div[class*="bg-card"]');
                const target = bubble instanceof HTMLElement && bubble.closest('[data-message-group-id]') ? bubble : markdown;
                const type = isProbablyThemeNovelBubble(target) ? 'novel' : 'chat';
                target.setAttribute('data-cmu-theme-bubble', type);
                target.setAttribute('data-sgb-bubble', type);
                if (target === markdown) {
                    setAttrIfMissing(target, 'data-cmu-theme-bubble-fallback', 'markdown');
                    setAttrIfMissing(target, 'data-sgb-bubble-fallback', 'markdown');
                }
                if (target.parentElement instanceof HTMLElement)
                    setAttrIfMissing(target.parentElement, 'data-sgb-bubble-parent');
            });
            if (!group.querySelector('[data-cmu-theme-bubble], [data-sgb-bubble]')) {
                const candidates = Array.from(group.querySelectorAll('div')).filter(el => {
                    if (!(el instanceof HTMLElement) || el.closest('#chud-sidebar, #chud-infobar, #igx-live-popup'))
                        return false;
                    const txt = (el.textContent || '').trim();
                    const rect = el.getBoundingClientRect();
                    return txt.length >= 2 && rect.width > 80 && rect.height > 20 && rect.height < 1200;
                });
                const target = candidates.find(el => String(el.className || '').includes('break-all')) || candidates[candidates.length - 1];
                if (target instanceof HTMLElement) {
                    target.setAttribute('data-cmu-theme-bubble', 'chat');
                    target.setAttribute('data-sgb-bubble', 'chat');
                    if (target.parentElement instanceof HTMLElement)
                        setAttrIfMissing(target.parentElement, 'data-sgb-bubble-parent');
                }
            }
            const hasNovel = !!group.querySelector('[data-cmu-theme-bubble="novel"], [data-sgb-bubble="novel"]');
            group.toggleAttribute('data-cmu-theme-novel-group', hasNovel);
            group.toggleAttribute('data-sgb-novel-group', hasNovel);
            group.querySelectorAll('.wrtn-codeblock, pre').forEach(decorateThemeCodeblock);
        }
    }
    function decorateThemeQuotesSubset(markdowns) {
        if (!themeSkinEnabled() || Date.now() < Number(CMU_THEME_STATE.quoteHealUntil || 0))
            return;
        cmuPruneStaleQuoteWraps();
        for (const md of markdowns || []) {
            if (!(md instanceof HTMLElement) || !md.isConnected || md.closest('.not-wrtn-markdown, #igx-live-popup, #chud-sidebar, #chud-infobar'))
                continue;
            const len = md.textContent?.length || 0;
            const prevLen = Number(md.dataset.cmuThemeLen || -1);
            const quotedLen = Number(md.dataset.cmuThemeQuotedLen || -2);
            const now = Date.now();
            if (len !== prevLen) {
                md.dataset.cmuThemeLen = String(len);
                md.dataset.cmuThemeLenAt = String(now);
                continue;
            }
            if (quotedLen === len || now - Number(md.dataset.cmuThemeLenAt || now) < 450)
                continue;
            const walker = document.createTreeWalker(md, NodeFilter.SHOW_TEXT, {
                acceptNode(node) {
                    if (!node.nodeValue || !CMU_QUOTE_CHAR_RE.test(node.nodeValue))
                        return NodeFilter.FILTER_REJECT;
                    const parent = node.parentElement;
                    if (!parent || parent.closest('[data-cmu-theme-quote], [data-sgb-quote], [data-cmu-theme-codeblock], [data-sgb-codeblock], [data-cmu-theme-codeblock-body], [data-sgb-codeblock-body], .wrtn-codeblock, [class*="codeblock"], code, pre, .not-wrtn-markdown'))
                        return NodeFilter.FILTER_REJECT;
                    return NodeFilter.FILTER_ACCEPT;
                }
            });
            const targets = [];
            let node;
            while ((node = walker.nextNode()))
                targets.push(node);
            targets.forEach(wrapCmuQuoteTextNode);
            md.dataset.cmuThemeQuotedLen = String(len);
        }
    }

    function scheduleThemeDecorate(force = false) {
        clearTimeout(themeDecorateTimer);
        themeDecorateTimer = setTimeout(decorateThemeSkin, force ? 0 : 160);
    }
    function scheduleThemeDecorateBurst(reason = 'theme-burst') {
        clearTimeout(scheduleThemeDecorateBurst._timer);
        scheduleThemeDecorateBurst._timer = setTimeout(() => {
            if (!shouldRun() || document.hidden) return;
            try { decorateThemeQuotes(); } catch (error) { console.debug(LOG, reason, error); }
        }, 560);
    }
    function rsIsVisibleEnough(el) {
        if (!(el instanceof HTMLElement))
            return false;
        const rect = el.getBoundingClientRect();
        if (rect.width < 120 || rect.height < 18)
            return false;
        if (rect.bottom < 0 || rect.top > window.innerHeight)
            return false;
        if (rect.right < 0 || rect.left > window.innerWidth)
            return false;
        return true;
    }
    function findRsComposerElement() {
        const input = findChatInput();
        if (!(input instanceof HTMLElement) || !input.isConnected)
            return null;
        return rsIsVisibleEnough(input) ? input : null;
    }
    function rsHostIsNearComposer(host, wrapper) {
        if (!(host instanceof HTMLElement) || !(wrapper instanceof HTMLElement))
            return false;
        if (!host.isConnected || !wrapper.isConnected)
            return false;
        if (host === document.body || host === document.documentElement)
            return false;
        if (host === COMPOSER_EXPAND.buttonHost)
            return false;
        if (host !== wrapper && !host.contains(wrapper))
            return false;
        const hostRect = host.getBoundingClientRect();
        const wrapperRect = wrapper.getBoundingClientRect();
        const vw = window.innerWidth || 1;
        if (hostRect.width < 180 || hostRect.height < 28)
            return false;
        if (hostRect.width > vw * 0.995)
            return false;
        const topGap = wrapperRect.top - hostRect.top;
        const bottomGap = hostRect.bottom - wrapperRect.bottom;
        if (topGap < -12 || topGap > 96)
            return false;
        if (bottomGap < -12 || bottomGap > 96)
            return false;
        return true;
    }
    function findRsInlineHost() {
        const composer = findRsComposerElement();
        if (!composer)
            return null;
        const wrapper = findComposerShell(composer) || composer.parentElement;
        if (!(wrapper instanceof HTMLElement))
            return null;
        if (rsHostIsNearComposer(rsInlineHost, wrapper))
            return rsInlineHost;
        const candidates = [wrapper.parentElement, wrapper];
        for (const candidate of candidates) {
            if (rsHostIsNearComposer(candidate, wrapper))
                return candidate;
        }
        if (wrapper !== document.body &&
            wrapper !== document.documentElement &&
            wrapper !== COMPOSER_EXPAND.buttonHost) {
            return wrapper;
        }
        return null;
    }
    let rsInlineHost = null;
    function clearRsInlineHost() {
        if (rsInlineHost?.isConnected)
            rsInlineHost.classList.remove('igx-inline-overlay-host');
        rsInlineHost = null;
    }
    function applyRadiosondeTheme() {
        const popup = document.getElementById('igx-live-popup');
        if (!popup)
            return;
        const bodyTheme = document.body?.getAttribute('data-theme');
        const htmlTheme = document.documentElement?.getAttribute('data-theme');
        const isDark = bodyTheme === 'dark' || htmlTheme === 'dark' || document.documentElement.classList.contains('dark');
        popup.classList.toggle('igx-light', !isDark);
    }
    function bindRadiosondeRefreshButton(popup = document.getElementById('igx-live-popup')) {
        const button = popup?.querySelector?.('.btn-refresh');
        if (!(button instanceof HTMLButtonElement))
            return;
        // popup이 기존 DOM을 재사용하더라도 현재 런타임의 핸들러를 항상 다시 연결한다.
        button.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            requestRadiosondeManualRefresh();
        };
        button.dataset.cmuRsRefreshRuntime = VERSION;
    }
    function ensureRadiosonde() {
        if (!shouldRun() || !settings.radiosonde || !isChatRoomPath()) {
            document.getElementById('igx-live-popup')?.remove();
            clearRsInlineHost();
            restartRsAutoTimer();
            return;
        }
        const host = findRsInlineHost();
        if (!host)
            return;
        if (rsInlineHost !== host) {
            clearRsInlineHost();
            rsInlineHost = host;
            rsInlineHost.classList.add('igx-inline-overlay-host');
        }
        let popup = document.getElementById('igx-live-popup');
        if (!popup) {
            popup = document.createElement('div');
            popup.id = 'igx-live-popup';
            popup.className = 'inline';
            popup.innerHTML = `
        <div id="igx-live-head">
          <div id="igx-live-left">
            <div class="inline-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:100%;height:100%;"><path d="M2 12h4l2.25-11.25a.5.5 0 0 1 .98 0l4.54 22.5a.5.5 0 0 0 .98 0L17 12h5"/></svg></div>
            <div id="igx-live-barline">불러오는 중…</div>
          </div>
          <div id="igx-live-actions">
            <button class="igx-btn btn-refresh" type="button" title="갱신" aria-label="라디오존데 갱신">↻</button>
          </div>
        </div>`;
        }
        popup.classList.add('inline');
        bindRadiosondeRefreshButton(popup);
        applyRadiosondeTheme();
        if (popup.parentNode !== host) {
            host.appendChild(popup);
            renderRsLine();
        }
        if (!RS.discovered) {
            RS.discovered = true;
            scheduleRadiosondeRefresh(true);
        }
        restartRsAutoTimer();
    }
    function renderRsLine(text = '', forceText = false) {
        if (!shouldRun() || !settings.radiosonde)
            return;
        const line = document.getElementById('igx-live-barline');
        if (!line)
            return;
        const refresh = document.querySelector('#igx-live-popup .btn-refresh');
        if (refresh) {
            // 자동 갱신이 길어져도 수동 ↻ 클릭은 계속 받을 수 있어야 한다.
            refresh.disabled = false;
            refresh.toggleAttribute('data-cmu-rs-busy', text === '갱신중…');
            refresh.setAttribute('aria-label', text || '라디오존데 갱신');
        }
        if (text && (forceText || !RS.last.size)) {
            line.textContent = text;
            return;
        }
        const frag = document.createDocumentFragment();
        const models = getRsVisibleModels();
        if (!models.length) {
            line.textContent = '표시할 모델 없음 · 설정에서 선택';
            return;
        }
        const scrollLeft = line.scrollLeft;
        for (const model of models) {
            const data = RS.last.get(model.slug) || { status: 'unknown', score: '—', lat: '—' };
            const item = document.createElement('span');
            item.className = `bitem s-${data.stale ? 'unknown' : normalizeStatus(data.status)}`;
            const lastSuccess = data.fetchedAt ? new Date(data.fetchedAt).toLocaleTimeString('ko-KR') : '';
            item.title = [model.label, data.stale ? '갱신 실패 · 이전 값' : '', lastSuccess ? `마지막 조회 ${lastSuccess}` : ''].filter(Boolean).join(' · ');
            const latency = settings.radiosondeLatency !== false
                ? `<span class="blat">${data.lat ?? '—'}s</span>`
                : '';
            item.innerHTML = `<span class="bdot"></span><span class="bname">${escapeHtml(model.short)}</span><b class="bscore">${data.score ?? '—'}${data.stale ? ' (이전)' : ''}</b>${latency}`;
            frag.appendChild(item);
        }
        line.replaceChildren(frag);
        line.scrollLeft = scrollLeft;
    }
    function handleSameChatSelfClick(event) {
        if (!event || event.defaultPrevented)
            return false;
        if (isCmuProtectedEditorTarget(event.target))
            return false;
        if (event.button !== undefined && event.button !== 0)
            return false;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
            return false;
        const target = event.target;
        if (!(target instanceof Element))
            return false;
        if (target.closest?.(`#${ID.panel}, #${ID.toolbarWrapper}, #chud-info-menu, #chud-side-menu, #chud-side-dropdown, #igx-live-popup`))
            return false;
        if (target.closest?.('button[aria-haspopup="menu"], ' +
            'button[aria-label="채팅방 메뉴"], ' +
            '[data-radix-popper-content-wrapper], ' +
            '[role="menu"], ' +
            '[role="menuitem"]'))
            return false;
        const link = target.closest('a[href]');
        if (!(link instanceof HTMLAnchorElement))
            return false;
        let url;
        try {
            url = new URL(link.href, location.href);
        }
        catch (_) {
            return false;
        }
        if (url.origin !== location.origin)
            return false;
        const clickedId = getChatIdFromPath(url.pathname || '');
        const currentId = getChatId();
        const sameId = clickedId && currentId && clickedId === currentId;
        const samePath = url.pathname.replace(/\/+$/, '') === location.pathname.replace(/\/+$/, '');
        if (!sameId || !samePath || url.search !== location.search || url.hash !== location.hash || target.closest('[data-message-group-id]'))
            return false;
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();
        scheduleMobileChatListPopoverLayoutSettle();
        scheduleCmuEdgeMenuStateSync();
        scheduleCmuStatBarMark();
        const input = findChatInput();
        if (input)
            ensureInlineBlocks(input);
        return true;
    }
    function hookHistory() {
        if (window.__CMU_HISTORY_HOOKED__)
            return;
        window.__CMU_HISTORY_HOOKED__ = true;
        CMU_RESOURCES.cleanups.push(() => { delete window.__CMU_HISTORY_HOOKED__; });
        const fire = () => setTimeout(checkRouteChange, 80);
        const origPush = history.pushState;
        const origReplace = history.replaceState;
        history.pushState = function (...args) {
            if (!shouldRun())
                return origPush.apply(this, args);
            cmuDraftFlush('history-pushState');
            const ret = origPush.apply(this, args);
            fire();
            return ret;
        };
        history.replaceState = function (...args) {
            if (!shouldRun())
                return origReplace.apply(this, args);
            cmuDraftFlush('history-replaceState');
            const ret = origReplace.apply(this, args);
            fire();
            return ret;
        };
        cmuOwnMethod(history, 'pushState', origPush);
        cmuOwnMethod(history, 'replaceState', origReplace);
        cmuListen(window, 'popstate', fire);
    }
    function checkRouteChange() {
        if (routeKey === location.href)
            return;
        routeKey = location.href;
        cmuAbortOtherRooms();
        CMU_DOM_WATCH.roomPanelMissUntil = 0;
        CMU_DOM_WATCH.roomPanelSearchRoot = null;
        CMU_DOM_WATCH.textObserver?.disconnect();
        CMU_DOM_WATCH.textRoots.clear();
        stopComposerSendWatch();
        cleanupCmuInputCounter();
        invalidateCmuChatInputCache();
        cmuDraftSync();
        collapseComposerInput({ immediate: true, scrollToEnd: false });
        cmuMessageActionsClearGesture();
        cmuMessageActionsCloseMenu();
        cmuCloseMessageSelectSheet();
        cmuLogCaptureExitMode(true);
        cmuLogCaptureClosePreview(true);
        restoreGlobalHeaderShellLayout();
        if (!isEpisodePath()) {
            document.documentElement.classList.remove('cmu-header-reveal');
        }
        BADGE.cacheKey = '';
        resetBadgeCacheIfNeeded();
        RS.discovered = false;
        CMI.uiModeAt = 0;
        CMI.uiMode = '';
        DASH_SIDE.available = null;
        DASH_SIDE.availableAt = 0;
        resetAnimatedThumbRouteState();
        scheduleInject('route');
        scheduleIntegratedSideButtonsRouteRefreshLite();
        scheduleMobileChatListPopoverLayoutSettle();
        scheduleCmuEdgeMenuStateSync();
        if (settings.dashboard) {
            clearDashboardForRoom(getChatId() || '');
            scheduleDashboardUpdate(true);
            setTimeout(() => scheduleDashboardUpdate(true), 700);
        }
        scheduleRadiosondeRefresh(true);
    }
    let cmuViewportFrame = 0;
    cmuListen(window, 'resize', () => {
        if (cmuViewportFrame) return;
        cmuViewportFrame = requestAnimationFrame(() => {
        cmuViewportFrame = 0;
        applyState();
        if (cmuUserNoteGuardActive())
            return;
        ensureMobileEdgeMenuButtons();
        scheduleCmuMenuSwipeZonePosition();
        scheduleMobileChatListPopoverLayoutSettle();
        scheduleCmuEdgeMenuStateSync();
        scheduleCmuStatBarMark();
        scheduleComposerExpandSync();
        scheduleCmuInputCounterSync();
        const input = findChatInput();
        if (input)
            ensureInlineBlocks(input);
        });
    }, { passive: true });
    try {
        cmuListen(window.visualViewport, 'resize', scheduleCmuMenuSwipeZonePosition, { passive: true });
        cmuListen(window.visualViewport, 'scroll', scheduleCmuMenuSwipeZonePosition, { passive: true });
        cmuListen(window.visualViewport, 'resize', scheduleComposerExpandSync, { passive: true });
        cmuListen(window.visualViewport, 'resize', scheduleCmuInputCounterSync, { passive: true });
    }
    catch (_) { }
    ['fullscreenchange', 'webkitfullscreenchange'].forEach(type => {
        cmuListen(document, type, () => syncCmuFullscreenControls(document), true);
    });
    cmuRegisterGlobalGesture('native-situation-image', signal => {
        ['pointerdown', 'mousedown', 'touchstart'].forEach(type => {
            cmuGestureListen(signal, document, type, e => {
                if (isCmuProtectedEditorTarget(e.target))
                    return;
                handleNativeSituationImageToggleLite(e.target);
            }, true);
        });
        cmuGestureListen(signal, document, 'click', e => {
            if (isCmuProtectedEditorTarget(e.target))
                return;
            if (handleSameChatSelfClick(e))
                return;
            handleNativeSituationImageToggleLite(e.target);
        }, true);
    });
    cmuListen(document, 'click', (e) => {
        if (isCmuProtectedEditorTarget(e.target))
            return;
        const panel = document.getElementById(ID.panel);
        if (!panel?.classList.contains('open'))
            return;
        const path = typeof e.composedPath === 'function' ? e.composedPath() : [];
        const insidePanel = path.includes(panel) || !!e.target?.closest?.(`#${ID.panel}`);
        const toolbar = document.getElementById(ID.toolbarWrapper);
        const insideButton = (toolbar && path.includes(toolbar)) || !!e.target?.closest?.(`#${ID.toolbarWrapper}`);
        const actionNode = e.target?.closest?.('[data-action]');
        const actionSig = actionNode
            ? `${actionNode.dataset.action || ''}|${actionNode.dataset.key || ''}|${actionNode.dataset.index || ''}|${actionNode.dataset.tab || ''}`
            : '';
        const recentPanelAction = !!actionSig &&
            CMU_PANEL_INPUT.lastActionSig === actionSig &&
            Date.now() - CMU_PANEL_INPUT.lastActionAt < 800;
        if (!insidePanel && !insideButton && !recentPanelAction)
            toggleSettingsPanel(false);
    }, true);
    if (settings.logCapture)
        installLogCaptureHandlers();
    hookHistory();
    installCmuMessageLongPressMenu();
    cmuDraftInstall();
    cacBindFallbackStartListeners();
    cacBindStorageListener();
    watchDashboardGenerateDone();
    cmiInstallDeleteHooks();
    applyState();
    installCmuUserNoteStateWatch();
    cmuResumeGlobalGestures('initial');
    bindEmptySendGuard();
    ensureSettingsPanelSilent();
    startBootObserver();
    boot('initial');
    // 최초 새로고침에서도 외부 확장(AI 요약/Wish RP 등)의 늦은 부팅을 다시 감지한다.
    // 기존에는 SPA 방 이동 때만 재감지해 AI 요약 버튼이 새로고침 후 사라질 수 있었다.
    scheduleIntegratedSideButtonsRouteRefreshLite();
    setTimeout(() => boot('late-1'), 600);
    setTimeout(() => boot('late-2'), 1800);
    CMU_RUNTIME.dispose = () => {
        if (CMU_RUNTIME.disposed)
            return;
        // Flush user input before disabling scheduling and detaching the UI.
        try { cmuDraftFlush('dispose'); } catch (_) { }
        CMU_RUNTIME.disposed = true;
        CMU_DRAFT.restoreToken += 1;
        CMU_DRAFT.verifyToken += 1;
        const safely = fn => { try { fn(); } catch (_) { } };
        safely(restoreGlobalHeaderShellLayout);
        safely(cmuDisposeResources);
        CMU_INPUT_COUNTER.disposed = true;
        safely(cleanupCmuInputCounter);
        safely(stopComposerSendWatch);
        safely(() => cmuSuspendGlobalGestures('dispose'));
        safely(disconnectComposerExpandResizeObserver);
        safely(() => collapseComposerInput({ immediate: true, scrollToEnd: false }));
        safely(resetDashboardLayout);
        safely(clearRsInlineHost);
        safely(clearComposerExpandButtonHost);
        safely(cmuMessageActionsClearGesture);
        safely(cmuMessageActionsCloseMenu);
        safely(cmuCloseMessageSelectSheet);
        safely(() => cmuLogCaptureExitMode(true));
        safely(() => cmuLogCaptureClosePreview(true));
        safely(clearThemeDecorations);
        safely(() => document.querySelectorAll('[data-cmu-animated-thumb]').forEach(restoreAnimatedThumbImage));
        safely(() => document.querySelectorAll('.crack-ui-empty-send-blocked, button[data-crack-ui-empty-send-guard]').forEach(clearEmptySendGuardButton));
        safely(() => {
            for (const key of ['cmuComposerExpandBound', 'cmuRoomPanelReleaseBound', 'cmuMenuSwipeDocBound', 'cmuSendGuardBound', 'cmuAnswerCostBound'])
                delete document.documentElement.dataset[key];
            for (const name of [...document.documentElement.classList]) {
                if (name.startsWith('cmu-'))
                    document.documentElement.classList.remove(name);
            }
            nmfResetMenuVisibilityRuntime();
        });
        safely(() => {
            for (const id of [...Object.values(ID), 'igx-live-popup', 'chud-info-menu', 'chud-side-menu', 'chud-side-dropdown'])
                document.getElementById(id)?.remove();
            document.querySelectorAll('.cmu-message-badge, .cmu-user-badge-row, .cmi-model-badge, .cmi-model-slot, .cac-answer-cost').forEach(el => el.remove());
        });
        CMU_USER_NOTE_STATE.observer = null;
        CMU_DOM_PENDING_GROUPS.clear();
        CMU_DOM_PENDING_MARKDOWNS.clear();
        CMU_DOM_PENDING_QUOTES.clear();
        CMU_DOM_WATCH.textRoots.clear();
        CMU_DOM_WATCH.thumbNodes.clear();
        CMU_DOM_WATCH.ownedRecords = new WeakMap();
        if (document.documentElement?.getAttribute(CMU_RUNTIME_ATTR) === VERSION)
            document.documentElement.removeAttribute(CMU_RUNTIME_ATTR);
        try {
            if (runtimeWindow?.[CMU_RUNTIME_KEY] === CMU_RUNTIME)
                delete runtimeWindow[CMU_RUNTIME_KEY];
        }
        catch (_) { }
    };
    log(`loaded ${VERSION}`);
})();
