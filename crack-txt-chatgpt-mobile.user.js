// ==UserScript==
// @name         Crack TXT → ChatGPT 전송기 (모바일)
// @namespace    crack-txt-chatgpt-mobile
// @version      1.3.3
// @description  Crack 채팅 전체/이어서 TXT 저장, 작품×프리셋별 ChatGPT 대화 연결, 다중 TXT 첨부, ChatGPT 앱 열기를 지원합니다.
// @author       chu
// @license      MIT
// @homepageURL https://github.com/mo1om1994-del/crack-userscripts
// @downloadURL https://raw.githubusercontent.com/mo1om1994-del/crack-userscripts/main/crack-txt-chatgpt-mobile.user.js
// @updateURL   https://raw.githubusercontent.com/mo1om1994-del/crack-userscripts/main/crack-txt-chatgpt-mobile.user.js
// @connect      crack-api.wrtn.ai
// @match        https://crack.wrtn.ai/*
// @match        https://chatgpt.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @grant        GM_openInTab
// @grant        GM_xmlhttpRequest
// @run-at       document-idle
// @noframes
// ==/UserScript==

(() => {
  'use strict';

  const PREFIX = 'crack-mobile-txt:';
  const CURRENT = PREFIX + 'current';
  const CHUNK = 96 * 1024;
  const MAX_FILE_BYTES = 15 * 1024 * 1024;
  const LONG_PROMPT = 6000;
  const INSTRUCTION_FILE = 'Crack-GPT-Instructions.txt';
  const PENDING_TTL_MS = 10 * 60 * 1000; // 전송 대기 데이터는 최대 10분만 로컬 보관
  const RESUME_CURSORS_KEY = PREFIX + 'resume-cursors:v1';
  const CRACKSAFE_CURSORS_KEY = 'HCD_saveCursors';
  const LEGACY_CHATGPT_LINKS_KEY = PREFIX + 'chatgpt-links:v1';
  const CHATGPT_LINKS_KEY = PREFIX + 'chatgpt-links:v2';
  const CHATGPT_LINKS_MIGRATED_KEY = PREFIX + 'chatgpt-links:v2-migrated';
  const SELECTED_PRESET_KEY = PREFIX + 'selected-preset:v1';
  const CHATGPT_HOME = 'https://chatgpt.com/';

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const id = () => globalThis.crypto?.randomUUID?.() ||
    `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;

  const key = (kind, jobId, n = '') => `${PREFIX}${kind}:${jobId}${n === '' ? '' : ':' + n}`;

  function getMeta(jobId) {
    return GM_getValue(key('meta', jobId), null);
  }

  function getStatus(jobId) {
    return GM_getValue(key('status', jobId), null);
  }

  function setStatus(jobId, patch) {
    const old = getStatus(jobId) || {};
    GM_setValue(key('status', jobId), { ...old, ...patch, updatedAt: Date.now() });
  }

  function cleanupJob(jobId) {
    if (!jobId) return;
    const meta = getMeta(jobId);

    if (Array.isArray(meta?.files)) {
      meta.files.forEach((fileMeta, fileIndex) => {
        const count = Number(fileMeta?.chunkCount) || 0;
        for (let i = 0; i < count; i++) {
          GM_deleteValue(key('chunk', jobId, `${fileIndex}-${i}`));
        }
      });
    }

    GM_deleteValue(key('meta', jobId));
    GM_deleteValue(key('status', jobId));
    GM_deleteValue(key('claim', jobId));
    if (GM_getValue(CURRENT, null) === jobId) GM_deleteValue(CURRENT);
  }

  function cleanupExpired() {
    const now = Date.now();
    for (const name of GM_listValues()) {
      if (!name.startsWith(PREFIX + 'meta:')) continue;
      const meta = GM_getValue(name, null);
      if (meta?.createdAt && now - meta.createdAt > PENDING_TTL_MS) {
        const jobId = name.slice((PREFIX + 'meta:').length);
        cleanupJob(jobId);
      }
    }
  }

  function normalizeResumeCursor(value, source) {
    if (!value || typeof value !== 'object' || !value.lastMessageId) return null;
    const parsedSavedAt = typeof value.savedAt === 'number'
      ? value.savedAt
      : new Date(value.savedAt || 0).getTime();
    return {
      lastMessageId: String(value.lastMessageId),
      totalSaved: Math.max(0, Number(value.totalSaved) || 0),
      savedAt: Number.isFinite(parsedSavedAt) && parsedSavedAt > 0 ? parsedSavedAt : null,
      charName: String(value.charName || 'Unknown'),
      source
    };
  }

  function loadOwnResumeCursors() {
    const stored = GM_getValue(RESUME_CURSORS_KEY, {});
    return stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {};
  }

  function getResumeCursor(chatroomId) {
    if (!chatroomId) return null;

    const own = normalizeResumeCursor(loadOwnResumeCursors()[chatroomId], '이 전송기');
    if (own) return own;

    // CrackSafe가 이미 만든 저장 기준은 읽기 전용으로 이어받습니다.
    // 이 스크립트의 저장 기록이 생기면 그 값을 우선하며 CrackSafe 데이터는 수정하지 않습니다.
    try {
      const crackSafe = JSON.parse(localStorage.getItem(CRACKSAFE_CURSORS_KEY) || '{}');
      return normalizeResumeCursor(crackSafe?.[chatroomId], 'CrackSafe');
    } catch {
      return null;
    }
  }

  function commitResumeCursor(checkpoint) {
    if (!checkpoint?.chatroomId || !checkpoint?.lastMessageId) {
      throw new Error('이어서 저장 기준으로 사용할 메시지 정보를 찾지 못했습니다.');
    }
    const savedAt = Date.now();
    const record = {
      lastMessageId: String(checkpoint.lastMessageId),
      totalSaved: Math.max(0, Number(checkpoint.totalSaved) || 0),
      savedAt,
      charName: String(checkpoint.charName || 'Unknown')
    };
    const cursors = loadOwnResumeCursors();
    cursors[checkpoint.chatroomId] = record;
    GM_setValue(RESUME_CURSORS_KEY, cursors);
    return { ...record, chatroomId: checkpoint.chatroomId, source: '이 전송기' };
  }

  function normalizeChatGPTConversationUrl(value) {
    try {
      const url = new URL(String(value || ''), CHATGPT_HOME);
      if (url.protocol !== 'https:' || url.hostname !== 'chatgpt.com') return null;
      if (!/(?:^|\/)c\/[a-z0-9_-]+\/?$/i.test(url.pathname)) return null;
      return `${url.origin}${url.pathname.replace(/\/$/, '')}`;
    } catch {
      return null;
    }
  }

  function loadChatGPTLinks() {
    const stored = GM_getValue(CHATGPT_LINKS_KEY, {});
    return stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {};
  }

  function chatGPTLinkKey(chatroomId, presetId) {
    if (!chatroomId || !presetId) return '';
    return JSON.stringify([String(chatroomId), String(presetId)]);
  }

  // 1.2.x까지는 작품당 방 1개만 기억했습니다. 업데이트 시 그 기존 방은
  // "업데이트 당시 선택되어 있던 프리셋"에 한 번만 귀속시켜 기존 연속성을 최대한 보존합니다.
  function migrateLegacyChatGPTLinksOnce() {
    if (GM_getValue(CHATGPT_LINKS_MIGRATED_KEY, false)) return;

    const presetId = String(GM_getValue(SELECTED_PRESET_KEY, '') || '');
    if (!presetId) return; // Crack에서 프리셋 선택 정보가 생긴 뒤 다시 마이그레이션

    const legacy = GM_getValue(LEGACY_CHATGPT_LINKS_KEY, {});
    const links = loadChatGPTLinks();

    if (legacy && typeof legacy === 'object' && !Array.isArray(legacy)) {
      for (const [chatroomId, value] of Object.entries(legacy)) {
        const url = normalizeChatGPTConversationUrl(typeof value === 'string' ? value : value?.url);
        const scopeKey = chatGPTLinkKey(chatroomId, presetId);
        if (!url || !scopeKey || links[scopeKey]) continue;
        links[scopeKey] = {
          url,
          linkedAt: Number(value?.linkedAt) || Date.now(),
          lastUsedAt: Number(value?.lastUsedAt) || null
        };
      }
      GM_setValue(CHATGPT_LINKS_KEY, links);
    }

    GM_setValue(CHATGPT_LINKS_MIGRATED_KEY, true);
  }

  function getChatGPTLink(chatroomId, presetId) {
    const scopeKey = chatGPTLinkKey(chatroomId, presetId);
    if (!scopeKey) return null;
    const value = loadChatGPTLinks()[scopeKey];
    const url = normalizeChatGPTConversationUrl(typeof value === 'string' ? value : value?.url);
    if (!url) return null;
    return {
      url,
      linkedAt: Number(value?.linkedAt) || null,
      lastUsedAt: Number(value?.lastUsedAt) || null
    };
  }

  function commitChatGPTLink(chatroomId, presetId, conversationUrl) {
    const scopeKey = chatGPTLinkKey(chatroomId, presetId);
    if (!scopeKey) return null;
    const url = normalizeChatGPTConversationUrl(conversationUrl);
    if (!url) return null;
    const now = Date.now();
    const links = loadChatGPTLinks();
    const previous = links[scopeKey];
    links[scopeKey] = {
      url,
      linkedAt: Number(previous?.linkedAt) || now,
      lastUsedAt: now
    };
    GM_setValue(CHATGPT_LINKS_KEY, links);
    return links[scopeKey];
  }

  migrateLegacyChatGPTLinksOnce();

  function validateTxtFile(file) {
    if (!file) throw new Error('TXT 파일을 선택해 주세요.');
    if (!/\.txt$/i.test(file.name) && file.type && !/^text\/plain/i.test(file.type))
      throw new Error(`${file.name || '선택한 파일'}: TXT 파일만 사용할 수 있습니다.`);
    if (file.size > MAX_FILE_BYTES)
      throw new Error(`${file.name || '선택한 파일'}: 파일 하나당 15MB까지 사용할 수 있습니다.`);
  }

  async function createJob(files, prompt, presetName = '', context = {}) {
    if (!Array.isArray(files) || !files.length)
      throw new Error('TXT 파일을 하나 이상 추가해 주세요.');
    if (!prompt.trim()) throw new Error('요약 지침을 입력해 주세요.');

    const prepared = [];
    for (const file of files) {
      validateTxtFile(file);
      const fileText = await file.text();
      if (!fileText.trim()) throw new Error(`${file.name}: TXT 파일이 비어 있습니다.`);
      prepared.push({ file, text: fileText });
    }

    const oldId = GM_getValue(CURRENT, null);
    if (oldId) {
      const oldStatus = getStatus(oldId);
      if (oldStatus?.state === 'processing')
        throw new Error('ChatGPT에서 이전 파일을 전송 중입니다.');
      cleanupJob(oldId);
    }

    const jobId = id();
    const fileMetas = [];

    prepared.forEach(({ file, text: fileText }, fileIndex) => {
      const chunkCount = Math.ceil(fileText.length / CHUNK);
      for (let i = 0; i < chunkCount; i++) {
        GM_setValue(
          key('chunk', jobId, `${fileIndex}-${i}`),
          fileText.slice(i * CHUNK, (i + 1) * CHUNK)
        );
      }
      fileMetas.push({
        fileName: file.name || `Crack-RP-Log-${fileIndex + 1}.txt`,
        fileType: 'text/plain;charset=utf-8',
        charLength: fileText.length,
        chunkCount
      });
    });

    GM_setValue(key('meta', jobId), {
      id: jobId,
      createdAt: Date.now(),
      files: fileMetas,
      prompt,
      presetName: String(presetName || ''),
      presetId: String(context.presetId || ''),
      sourceChatroomId: String(context.sourceChatroomId || ''),
      targetWasLinked: !!context.targetWasLinked,
      resumeCheckpoint: context.resumeCheckpoint || null
    });
    setStatus(jobId, {
      state: 'pending',
      message: `전송 대기 중 · TXT ${fileMetas.length.toLocaleString()}개 · ChatGPT 웹에서 원하는 채팅을 선택하세요.`
    });
    GM_setValue(CURRENT, jobId);
    return { jobId };
  }

  function readJobFiles(meta) {
    if (!Array.isArray(meta?.files) || !meta.files.length) {
      throw new Error('전송할 TXT 파일 정보가 없습니다.');
    }

    return meta.files.map((fileMeta, fileIndex) => {
      const parts = [];
      for (let i = 0; i < fileMeta.chunkCount; i++) {
        const part = GM_getValue(key('chunk', meta.id, `${fileIndex}-${i}`), null);
        if (typeof part !== 'string') {
          throw new Error(`${fileMeta.fileName}: TXT 데이터 ${i + 1}/${fileMeta.chunkCount} 조각을 찾지 못했습니다.`);
        }
        parts.push(part);
      }

      const fileText = parts.join('');
      if (fileText.length !== fileMeta.charLength) {
        throw new Error(`${fileMeta.fileName}: 저장된 TXT 데이터 길이가 맞지 않습니다.`);
      }
      return { info: fileMeta, text: fileText };
    });
  }

  function makePrompt(prompt) {
    if (prompt.length > LONG_PROMPT) {
      return `첨부한 ${INSTRUCTION_FILE}의 지침 전체를 빠짐없이 적용해서 함께 첨부된 RP 로그 TXT 파일들을 처리해줘. 지침 파일을 축약하거나 일부만 적용하지 말 것.`;
    }
    return `첨부한 RP 로그 TXT 파일 전체를 아래 지침에 따라 요약해줘.\n\n${prompt}`;
  }


  // ---------- Crack TXT extractor (full + incremental) ----------
  // TXT 추출/정리 로직 일부는 CrackSafe with EPUB (MIT; zxklkj12 & eun033) 기반입니다.
  const CRACK_API = {
    base: 'https://crack-api.wrtn.ai/crack-gen/v3',
    retryCount: 3,
    retryBaseDelay: 1500,
    chunkSize: 300,
    incrementalChunkSize: 50,
    incrementalMaxRequests: 40,
    hardLimit: 20000
  };

  function crackCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    return parts.length === 2 ? decodeURIComponent(parts.pop().split(';').shift()) : null;
  }

  function crackUrlInfo() {
    const m = location.pathname.match(/\/stories\/[a-f0-9]+\/episodes\/([a-f0-9]+)/i);
    return m ? { chatroomId: m[1] } : null;
  }

  function isCrackChatRoute() {
    return location.hostname === 'crack.wrtn.ai' && !!crackUrlInfo();
  }

  function crackRawRequest(endpoint) {
    const token = crackCookie('access_token');
    if (!token) throw new Error('Crack 로그인이 필요합니다. 페이지를 새로고침해 주세요.');
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'GET',
        url: `${CRACK_API.base}${endpoint}`,
        headers: { 'Authorization': `Bearer ${token}`, 'platform': 'web' },
        onload: res => {
          if (res.status >= 200 && res.status < 300) {
            try { resolve(JSON.parse(res.responseText)); }
            catch { reject(new Error('Crack API 응답을 읽지 못했습니다.')); }
          } else if (res.status === 429) reject(new Error('RATE_LIMITED'));
          else reject(new Error(`Crack API 오류: ${res.status}`));
        },
        onerror: () => reject(new Error('Crack API 네트워크 오류')),
        ontimeout: () => reject(new Error('Crack API 요청 시간 초과')),
        timeout: 30000
      });
    });
  }

  async function crackRequest(endpoint) {
    let lastError;
    for (let attempt = 0; attempt < CRACK_API.retryCount; attempt++) {
      try { return await crackRawRequest(endpoint); }
      catch (e) {
        lastError = e;
        if (e?.message === 'RATE_LIMITED') throw e;
        if (attempt < CRACK_API.retryCount - 1) {
          await sleep(CRACK_API.retryBaseDelay * Math.pow(2, attempt));
        }
      }
    }
    throw lastError;
  }

  async function fetchCrackDetail(chatroomId) {
    return (await crackRequest(`/chats/${chatroomId}`)).data;
  }

  async function fetchAllCrackMessages(chatroomId, onProgress) {
    const collected = [];
    const seen = new Set();
    let cursor = null;
    let requestCount = 0;

    while (true) {
      const endpoint = `/chats/${chatroomId}/messages?limit=${CRACK_API.chunkSize}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
      const data = await crackRequest(endpoint);
      const messages = data.data?.messages || [];
      requestCount++;
      if (!messages.length) break;

      for (const message of messages) {
        const messageId = message?._id;
        if (messageId && seen.has(messageId)) continue;
        if (messageId) seen.add(messageId);
        collected.push(message);
      }
      onProgress?.(collected.length, requestCount);

      if (collected.length >= CRACK_API.hardLimit) break;
      cursor = data.data?.nextCursor;
      if (!cursor) break;
      await sleep(300);
    }
    return collected.reverse();
  }

  async function fetchCrackMessagesAfterId(chatroomId, targetId, onProgress) {
    if (!targetId) throw new Error('이어서 저장 기준 메시지가 없습니다.');

    const collected = [];
    const seen = new Set();
    let cursor = null;
    let requestCount = 0;
    let foundTarget = false;

    while (true) {
      const endpoint = `/chats/${chatroomId}/messages?limit=${CRACK_API.incrementalChunkSize}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
      const data = await crackRequest(endpoint);
      const messages = data.data?.messages || [];
      requestCount++;
      if (!messages.length) break;

      for (const message of messages) {
        const messageId = message?._id;
        if (messageId === targetId) {
          foundTarget = true;
          break;
        }
        if (messageId && seen.has(messageId)) continue;
        if (messageId) seen.add(messageId);
        collected.push(message);
      }

      onProgress?.(collected.length, requestCount);
      if (foundTarget) break;
      if (requestCount >= CRACK_API.incrementalMaxRequests) {
        throw new Error('저장 이후 메시지가 너무 많아 안전 탐색 범위를 넘었습니다. 전체 로그를 다시 추출해 저장해 주세요.');
      }

      cursor = data.data?.nextCursor;
      if (!cursor) break;
      await sleep(300);
    }

    if (!foundTarget) {
      throw new Error('이전 저장 기준 메시지를 찾지 못했습니다. 전체 로그를 다시 추출한 뒤 파일의 “저장”을 눌러 기준을 갱신해 주세요.');
    }
    return collected.reverse();
  }

  function cleanCrackText(text) {
    let out = String(text ?? '');
    out = out.replace(/!\[[^\]\r\n]*\]\([^)]+?\)/g, '');
    out = out.replace(/^[ \t]*https?:\/\/\S+\.(?:png|jpe?g|gif|webp|bmp|svg)(?:[?#]\S*)?[ \t]*$/gmi, '');
    out = out.replace(/<!--[\s\S]*?-->/g, '');
    out = out.replace(/^[ \t]*\[\/\/\]:\s*#\s*\([^\r\n]*\)[ \t]*$/gmi, '');
    return out.replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n').trim();
  }

  function buildCrackTxt(messages, charName) {
    return (messages || []).map(message => {
      const role = message?.role === 'user' ? 'User' : charName;
      const content = cleanCrackText(message?.content || '');
      return `[${role}]\n${content}\n`;
    }).join('\n===\n\n');
  }

  function localDateSuffix() {
    const d = new Date();
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
  }

  async function extractCurrentCrackTxt(onProgress) {
    const info = crackUrlInfo();
    if (!info) throw new Error('현재 페이지에서 Crack 채팅방 정보를 찾지 못했습니다. 채팅방 안에서 실행해 주세요.');

    onProgress?.('채팅방 정보 확인 중…');
    const detail = await fetchCrackDetail(info.chatroomId);
    const charName = detail?.story?.name || detail?.character?.name || 'Unknown';

    onProgress?.(`${charName} 로그 수집 시작…`);
    const messages = await fetchAllCrackMessages(info.chatroomId, (count, requests) => {
      onProgress?.(`${charName} · ${count.toLocaleString()}개 수집 중 (${requests}회 요청)`);
    });
    if (!messages.length) throw new Error('대화 내용이 없습니다.');

    onProgress?.(`${messages.length.toLocaleString()}개 메시지 TXT 생성 중…`);
    const text = buildCrackTxt(messages, charName);
    if (!text.trim()) throw new Error('TXT 생성 결과가 비어 있습니다.');
    const fileName = `${charName}_${localDateSuffix()}.txt`;
    const file = new File([text], fileName, { type: 'text/plain;charset=utf-8' });
    const lastMessageId = messages[messages.length - 1]?._id;
    if (!lastMessageId) throw new Error('마지막 메시지 정보를 찾지 못해 이어서 저장 기준을 만들 수 없습니다.');
    return {
      file,
      messageCount: messages.length,
      checkpoint: {
        chatroomId: info.chatroomId,
        lastMessageId,
        totalSaved: messages.length,
        charName
      }
    };
  }

  async function extractCrackTxtSinceSaved(onProgress) {
    const info = crackUrlInfo();
    if (!info) throw new Error('현재 페이지에서 Crack 채팅방 정보를 찾지 못했습니다. 채팅방 안에서 실행해 주세요.');

    const baseline = getResumeCursor(info.chatroomId);
    if (!baseline) {
      throw new Error('이 채팅의 이전 저장 기록이 없습니다. 전체 로그를 추출한 뒤 파일 행의 “저장”을 먼저 눌러 주세요.');
    }

    onProgress?.('저장 지점 이후의 새 메시지 확인 중…');
    const messages = await fetchCrackMessagesAfterId(info.chatroomId, baseline.lastMessageId, (count, requests) => {
      onProgress?.(`새 메시지 ${count.toLocaleString()}개 발견 · ${requests}회 확인 중…`);
    });
    if (!messages.length) return { file: null, messageCount: 0, baseline };

    onProgress?.('채팅방 정보 확인 중…');
    const detail = await fetchCrackDetail(info.chatroomId);
    const charName = detail?.story?.name || detail?.character?.name || baseline.charName || 'Unknown';
    const text = buildCrackTxt(messages, charName);
    if (!text.trim()) throw new Error('이어서 TXT 생성 결과가 비어 있습니다.');

    const fileName = `${charName}_이어서_${localDateSuffix()}.txt`;
    const file = new File([text], fileName, { type: 'text/plain;charset=utf-8' });
    const lastMessageId = messages[messages.length - 1]?._id;
    if (!lastMessageId) throw new Error('새 마지막 메시지 정보를 찾지 못해 저장 기준을 갱신할 수 없습니다.');

    return {
      file,
      messageCount: messages.length,
      baseline,
      checkpoint: {
        chatroomId: info.chatroomId,
        lastMessageId,
        totalSaved: baseline.totalSaved + messages.length,
        charName
      }
    };
  }

  function downloadLocalFile(file) {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name || 'Crack-RP-Log.txt';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      a.remove();
      URL.revokeObjectURL(url);
    }, 1000);
  }

  // ---------- Crack UI ----------
  function initCrack() {
    cleanupExpired();
    if (document.getElementById('crack-mobile-txt-host')) return;

    const PRESETS_KEY = PREFIX + 'presets:v1';
    const FAB_POS_KEY = PREFIX + 'fab-position:v1';
    const CMU_SIDE_BUTTON_ID = 'crack-gpt-bridge-side-btn';
    const CMU_SIDE_STYLE_ID = 'crack-gpt-bridge-side-scroll-style';

    function newPresetId() {
      return 'p-' + id();
    }

    function loadPresets() {
      let list = GM_getValue(PRESETS_KEY, null);
      if (!Array.isArray(list) || !list.length) {
        list = [{ id: newPresetId(), name: '기본', prompt: '' }];
        GM_setValue(PRESETS_KEY, list);
      }
      list = list.filter(x => x && typeof x.id === 'string' && typeof x.name === 'string')
        .map(x => ({ id: x.id, name: x.name.slice(0, 60) || '이름 없음', prompt: String(x.prompt || '') }));
      if (!list.length) {
        list = [{ id: newPresetId(), name: '기본', prompt: '' }];
        GM_setValue(PRESETS_KEY, list);
      }
      return list;
    }

    let presets = loadPresets();
    let selectedPresetId = GM_getValue(SELECTED_PRESET_KEY, presets[0].id);
    if (!presets.some(p => p.id === selectedPresetId)) selectedPresetId = presets[0].id;
    GM_setValue(SELECTED_PRESET_KEY, selectedPresetId);

    const host = document.createElement('div');
    host.id = 'crack-mobile-txt-host';
    host.style.cssText = 'all:initial;position:fixed;inset:0;z-index:2147483647;pointer-events:none';
    const root = host.attachShadow({ mode: 'open' });

    root.innerHTML = `
      <style>
        :host{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#f6f7fb}
        *{box-sizing:border-box}
        button,input,textarea,select{font-family:inherit}
        #fab{
          pointer-events:auto;position:fixed;left:calc(100vw - 72px);top:calc(100dvh - 140px);
          width:58px;height:58px;border:1px solid #ffffff24;border-radius:18px;
          background:#17191f;color:#fff;font-size:25px;
          box-shadow:0 8px 30px #0008;touch-action:none;user-select:none;-webkit-user-select:none;
          display:flex;align-items:center;justify-content:center;padding:0;cursor:grab
        }
        #fab.dragging{cursor:grabbing;transform:scale(1.04)}
        #badge{
          display:none;position:absolute;right:-4px;top:-4px;min-width:20px;height:20px;padding:0 5px;
          border-radius:999px;background:#22c55e;color:#fff;border:2px solid #17191f;
          font-size:10px;font-weight:900;align-items:center;justify-content:center
        }
        #badge.on{display:flex}
        #backdrop{
          pointer-events:auto;position:fixed;inset:0;display:none;align-items:flex-end;justify-content:center;
          padding:10px 10px calc(10px + env(safe-area-inset-bottom,0px));background:#0008
        }
        #backdrop.open{display:flex}
        #panel{
          width:min(100%,440px);max-height:calc(100dvh - 20px - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px));
          overflow:auto;padding:16px;border:1px solid #ffffff24;border-radius:22px;
          background:#15171df8;box-shadow:0 14px 50px #000a;color:#f6f7fb;
          -webkit-overflow-scrolling:touch
        }
        .head{display:flex;align-items:flex-start;gap:10px;margin-bottom:12px}
        .headText{flex:1;min-width:0}
        .title{font-size:18px;font-weight:850;margin-bottom:3px}
        .sub{font-size:12px;color:#aeb4c2;line-height:1.45}
        #close{
          width:40px;height:40px;flex:0 0 40px;border:1px solid #ffffff1c;border-radius:12px;
          background:#20232a;color:#fff;font-size:20px;touch-action:manipulation
        }
        label{display:block;font-size:12px;color:#c8cdd8;margin:13px 0 6px;font-weight:750}
        input[type="text"],textarea,select{
          display:block;width:100%;border:1px solid #ffffff24;border-radius:12px;
          background:#22252d;color:#fff;padding:11px 12px;font-size:14px;line-height:1.45;outline:none
        }
        textarea{min-height:150px;resize:vertical}
        select{min-height:46px}
        #file{display:none}
        #logCard{
          padding:12px;border:1px solid #ffffff1f;border-radius:14px;background:#1c1f26
        }
        #fileSummary{font-size:12px;color:#d8dce5;line-height:1.45;font-weight:750}
        #fileList{display:flex;flex-direction:column;gap:7px;margin-top:8px}
        .fileEmpty{
          padding:11px;border:1px dashed #ffffff20;border-radius:10px;
          color:#8793a6;font-size:11px;text-align:center
        }
        .fileRow{
          display:flex;align-items:center;gap:7px;padding:8px 8px 8px 10px;
          border:1px solid #ffffff18;border-radius:11px;background:#171a20
        }
        .fileMain{flex:1;min-width:0}
        .fileName{font-size:12px;color:#edf0f5;font-weight:750;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .fileMeta{font-size:10px;color:#8793a6;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .fileRowActions{display:flex;gap:4px;flex:0 0 auto}
        .fileMini{
          min-width:34px;height:34px;border:1px solid #ffffff20;border-radius:9px;
          background:#252932;color:#fff;padding:0 7px;font-size:10px;font-weight:750;touch-action:manipulation
        }
        .fileMini.remove{color:#f3b8b8;font-size:15px;padding:0;width:34px}
        .extractActions{display:grid;grid-template-columns:1fr;gap:7px;margin-top:10px}
        #extract,#extractSince{
          width:100%;min-height:48px;border:0;border-radius:12px;
          background:#e8ebf1;color:#15171d;padding:10px 12px;font-weight:900;font-size:14px;touch-action:manipulation
        }
        #extractSince{background:#27446f;color:#f4f7ff;border:1px solid #7aa2de66}
        #extract:disabled,#extractSince:disabled{opacity:.45}
        #resumeInfo{
          margin-top:8px;padding:9px 10px;border:1px solid #ffffff17;border-radius:10px;
          background:#14171d;color:#8e99aa;font-size:10px;line-height:1.55;white-space:pre-line
        }
        #resumeInfo.ready{border-color:#4c78a944;background:#172131;color:#b9cbea}
        .fileActions{display:grid;grid-template-columns:1fr auto;gap:7px;margin-top:8px}
        #pick,#clearAllTxt{
          min-height:42px;border:1px solid #ffffff2b;border-radius:11px;
          background:#252932;color:#fff;padding:8px 10px;font-weight:750;font-size:12px;touch-action:manipulation
        }
        #pick{border-style:dashed}
        #clearAllTxt{color:#f3b8b8}
        #clearAllTxt:disabled{opacity:.4}
        #status{
          min-height:36px;margin-top:8px;padding:8px 10px;border-radius:11px;
          background:#0e1015;color:#b9c1d0;font-size:12px;line-height:1.45;
          white-space:pre-wrap;word-break:break-word
        }
        .presetTop{display:grid;grid-template-columns:minmax(0,1fr) auto auto auto;gap:6px;align-items:stretch}
        .presetTop select{min-width:0}
        .smallBtn{
          min-width:44px;min-height:44px;border:1px solid #ffffff20;border-radius:11px;
          background:#252932;color:#fff;padding:7px 9px;font-size:12px;font-weight:750;touch-action:manipulation
        }
        #presetDelete{color:#f3b8b8}
        #presetNameWrap{display:none;margin-top:9px}
        #presetNameWrap.on{display:block}
        .fieldCaption{font-size:11px;color:#aeb4c2;font-weight:750;margin:0 0 5px}
        #prompt{margin-top:9px}
        #prompt[readonly]{color:#d8dce5;background:#1d2027}
        #promptCount{
          margin-top:3px;padding-right:3px;text-align:right;
          font-size:9px;line-height:1.2;color:#778297;user-select:none
        }
        #presetEditActions{display:none;gap:7px;margin-top:8px}
        #presetEditActions.on{display:flex}
        #presetEditActions .smallBtn{flex:1}
        #presetSave{background:#eceff4;color:#14161b}
        #presetState{font-size:11px;color:#90a0b7;margin-top:6px;min-height:16px}
        #send{
          width:100%;min-height:52px;margin-top:15px;border:0;border-radius:14px;
          background:#f1f3f7;color:#121318;font-size:15px;font-weight:900;touch-action:manipulation
        }
        #send:disabled{opacity:.5}
        #previewOverlay{
          pointer-events:auto;position:fixed;inset:0;display:none;align-items:center;justify-content:center;
          padding:14px;background:#000b;z-index:3
        }
        #previewOverlay.on{display:flex}
        #previewBox{
          width:min(100%,520px);max-height:calc(100dvh - 28px);display:flex;flex-direction:column;
          padding:14px;border:1px solid #ffffff24;border-radius:18px;background:#15171d;color:#fff;box-shadow:0 14px 50px #000b
        }
        .previewHead{display:flex;align-items:center;gap:8px;margin-bottom:8px}
        #previewTitle{flex:1;min-width:0;font-size:14px;font-weight:850;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        #previewClose{width:38px;height:38px;border:1px solid #ffffff20;border-radius:10px;background:#252932;color:#fff;font-size:18px}
        #previewMeta{font-size:11px;color:#9ca7b8;margin-bottom:7px}
        #previewText{min-height:55vh;max-height:70vh;resize:none;font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace}

        @media(min-width:700px){
          #backdrop{align-items:center;padding:24px}
          #panel{max-height:min(760px,calc(100vh - 48px))}
        }
      </style>
      <button id="fab" type="button" aria-label="Crack GPT 전송기"><span>🤖</span><span id="badge">1</span></button>
      <div id="backdrop">
        <section id="panel" role="dialog" aria-modal="true" aria-label="Crack GPT 전송기">
          <div class="head">
            <div class="headText">
              <div class="title">Crack → GPT</div>
              <div class="sub">TXT 파일과 프리셋 지침을 ChatGPT로 전송합니다.</div>
            </div>
            <button id="close" type="button" aria-label="닫기">×</button>
          </div>

          <label>로그 TXT</label>
          <div id="logCard">
            <div id="fileSummary">TXT 파일을 추가해 주세요.</div>
            <div id="fileList">
              <div class="fileEmpty">현재 채팅을 추출하거나 기존 TXT를 추가할 수 있습니다.</div>
            </div>
            <div class="extractActions">
              <button id="extract" type="button">＋ 현재 채팅 전체 로그 추출</button>
              <button id="extractSince" type="button" disabled>↪ 저장 지점 이후 TXT 저장</button>
            </div>
            <div id="resumeInfo">이어갈 저장 기준을 확인하는 중…</div>
            <div class="fileActions">
              <input id="file" type="file" accept=".txt,text/plain" multiple>
              <button id="pick" type="button">＋ 기존 TXT 파일 추가</button>
              <button id="clearAllTxt" type="button" disabled>전체 제거</button>
            </div>
          </div>
          <div id="status">TXT 파일을 하나 이상 추가해 주세요.</div>

          <label for="preset">지침 프리셋</label>
          <div class="presetTop">
            <select id="preset"></select>
            <button id="presetAdd" class="smallBtn" type="button" title="새 프리셋">＋</button>
            <button id="presetEdit" class="smallBtn" type="button">편집</button>
            <button id="presetDelete" class="smallBtn" type="button">삭제</button>
          </div>
          <div id="presetNameWrap">
            <div class="fieldCaption">프리셋 제목</div>
            <input id="presetName" type="text" maxlength="60" placeholder="프리셋 제목">
          </div>
          <textarea id="prompt" readonly placeholder="이 RP 로그를 다음 기준으로 요약해줘…"></textarea>
          <div id="promptCount">0자</div>
          <div id="presetEditActions">
            <button id="presetSave" class="smallBtn" type="button">저장</button>
            <button id="presetCancel" class="smallBtn" type="button">취소</button>
          </div>
          <div id="presetState">프리셋을 선택했습니다. 수정하려면 편집을 누르세요.</div>

          <button id="send" type="button">ChatGPT 웹으로 보내기</button>
        </section>
      </div>
      <div id="previewOverlay">
        <section id="previewBox" role="dialog" aria-modal="true" aria-label="TXT 내용 확인">
          <div class="previewHead">
            <div id="previewTitle">TXT 내용 확인</div>
            <button id="previewClose" type="button" aria-label="미리보기 닫기">×</button>
          </div>
          <div id="previewMeta"></div>
          <textarea id="previewText" readonly></textarea>
        </section>
      </div>
    `;

    document.documentElement.appendChild(host);

    const $ = s => root.querySelector(s);
    const fab = $('#fab'), badge = $('#badge'), backdrop = $('#backdrop'), close = $('#close');
    const picker = $('#file'), pick = $('#pick'), extract = $('#extract'), extractSince = $('#extractSince');
    const clearAllTxt = $('#clearAllTxt'), fileSummary = $('#fileSummary'), fileList = $('#fileList');
    const resumeInfo = $('#resumeInfo');
    const presetSelect = $('#preset'), presetAdd = $('#presetAdd'), presetEdit = $('#presetEdit');
    const presetDelete = $('#presetDelete'), presetNameWrap = $('#presetNameWrap'), presetName = $('#presetName');
    const presetEditActions = $('#presetEditActions'), presetSave = $('#presetSave'), presetCancel = $('#presetCancel');
    const presetState = $('#presetState'), prompt = $('#prompt'), promptCount = $('#promptCount'), send = $('#send'), status = $('#status');
    const previewOverlay = $('#previewOverlay'), previewTitle = $('#previewTitle');
    const previewMeta = $('#previewMeta'), previewText = $('#previewText'), previewClose = $('#previewClose');

    let selectedFiles = []; // { id, file, source }
    let busy = false;
    let presetEditMode = null; // null | { kind: 'edit', id } | { kind: 'new' }

    function formatSize(bytes) {
      if (!Number.isFinite(bytes)) return '';
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    }

    function formatLocalDateTime(value) {
      const d = new Date(value);
      if (!Number.isFinite(d.getTime())) return '시간 정보 없음';
      const p = n => String(n).padStart(2, '0');
      return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
    }

    function formatElapsed(value) {
      const savedAt = new Date(value).getTime();
      if (!Number.isFinite(savedAt)) return '경과 시간 확인 불가';
      const minutes = Math.max(0, Math.floor((Date.now() - savedAt) / 60000));
      if (minutes < 1) return '경과 방금';
      if (minutes < 60) return `경과 ${minutes}분`;
      const hours = Math.floor(minutes / 60);
      const restMinutes = minutes % 60;
      if (hours < 24) return `경과 ${hours}시간${restMinutes ? ` ${restMinutes}분` : ''}`;
      const days = Math.floor(hours / 24);
      const restHours = hours % 24;
      return `경과 ${days}일${restHours ? ` ${restHours}시간` : ''}`;
    }

    function renderResumeState() {
      const info = crackUrlInfo();
      const cursor = info ? getResumeCursor(info.chatroomId) : null;
      extractSince.disabled = busy || !cursor;

      if (!info) {
        resumeInfo.classList.remove('ready');
        resumeInfo.textContent = 'Crack 채팅방 안에서 이어서 저장을 사용할 수 있습니다.';
        return;
      }
      if (!cursor) {
        resumeInfo.classList.remove('ready');
        resumeInfo.textContent = '저장 기준 없음 · 전체 로그를 추출한 뒤 파일 행의 “저장”을 누르면 이어서 저장이 활성화됩니다.';
        return;
      }

      resumeInfo.classList.add('ready');
      const timeText = cursor.savedAt
        ? `${formatLocalDateTime(cursor.savedAt)} · ${formatElapsed(cursor.savedAt)}`
        : '저장 시각 정보 없음';
      resumeInfo.textContent = `기준 저장 ${timeText}\n누적 ${cursor.totalSaved.toLocaleString()}개 메시지 · 기준 출처 ${cursor.source}`;
    }

    function uniqueFileName(name) {
      const original = String(name || 'Crack-RP-Log.txt');
      const used = new Set(selectedFiles.map(x => x.file.name.toLowerCase()));
      if (!used.has(original.toLowerCase())) return original;

      const dot = original.lastIndexOf('.');
      const base = dot > 0 ? original.slice(0, dot) : original;
      const ext = dot > 0 ? original.slice(dot) : '';
      let n = 2;
      while (used.has(`${base} (${n})${ext}`.toLowerCase())) n++;
      return `${base} (${n})${ext}`;
    }

    function normalizeAddedFile(file) {
      validateTxtFile(file);
      const uniqueName = uniqueFileName(file.name);
      if (uniqueName === file.name) return file;
      return new File([file], uniqueName, {
        type: file.type || 'text/plain;charset=utf-8',
        lastModified: file.lastModified || Date.now()
      });
    }

    function renderFileList(message = '') {
      fileList.textContent = '';

      if (!selectedFiles.length) {
        const empty = document.createElement('div');
        empty.className = 'fileEmpty';
        empty.textContent = '현재 채팅을 추출하거나 기존 TXT를 추가할 수 있습니다.';
        fileList.appendChild(empty);
        fileSummary.textContent = 'TXT 파일을 추가해 주세요.';
        clearAllTxt.disabled = true;
        badge.classList.remove('on');
        badge.textContent = '0';
        updateEntryIndicators();
        if (message) status.textContent = message;
        return;
      }

      const totalBytes = selectedFiles.reduce((sum, item) => sum + (item.file.size || 0), 0);
      fileSummary.textContent = `${selectedFiles.length.toLocaleString()}개 파일 · 총 ${formatSize(totalBytes)}`;
      clearAllTxt.disabled = false;
      badge.textContent = selectedFiles.length > 99 ? '99+' : String(selectedFiles.length);
      badge.classList.add('on');

      selectedFiles.forEach(item => {
        const row = document.createElement('div');
        row.className = 'fileRow';
        row.dataset.fileId = item.id;

        const main = document.createElement('div');
        main.className = 'fileMain';

        const name = document.createElement('div');
        name.className = 'fileName';
        name.textContent = item.file.name;

        const meta = document.createElement('div');
        meta.className = 'fileMeta';
        const checkpointText = item.checkpoint
          ? (item.checkpointCommitted ? ' · 이어서 기준 저장됨' : ' · 저장 시 이어서 기준 갱신')
          : '';
        meta.textContent = `${formatSize(item.file.size)} · ${item.source}${checkpointText}`;

        main.append(name, meta);

        const actions = document.createElement('div');
        actions.className = 'fileRowActions';

        const preview = document.createElement('button');
        preview.type = 'button';
        preview.className = 'fileMini';
        preview.dataset.action = 'preview';
        preview.textContent = '확인';

        const save = document.createElement('button');
        save.type = 'button';
        save.className = 'fileMini';
        save.dataset.action = 'save';
        save.textContent = '저장';

        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'fileMini remove';
        remove.dataset.action = 'remove';
        remove.setAttribute('aria-label', `${item.file.name} 제거`);
        remove.textContent = '×';

        actions.append(preview, save, remove);
        row.append(main, actions);
        fileList.appendChild(row);
      });

      updateEntryIndicators();
      if (message) status.textContent = message;
    }

    function addFiles(files, source, options = {}) {
      const input = [...files].filter(Boolean);
      if (!input.length) return 0;

      let added = 0;
      const errors = [];
      for (const rawFile of input) {
        try {
          const file = normalizeAddedFile(rawFile);
          selectedFiles.push({
            id: id(),
            file,
            source: source || '기존 TXT 직접 선택',
            checkpoint: input.length === 1 ? (options.checkpoint || null) : null,
            checkpointCommitted: input.length === 1 && !!options.checkpointCommitted
          });
          added++;
        } catch (e) {
          errors.push(e?.message || String(e));
        }
      }

      const parts = [];
      if (added) parts.push(`${added.toLocaleString()}개 TXT를 추가했습니다.`);
      if (errors.length) parts.push(errors.join('\n'));
      renderFileList(parts.join('\n'));
      return added;
    }

    function removeFileById(fileId) {
      const index = selectedFiles.findIndex(item => item.id === fileId);
      if (index < 0) return;
      const [removed] = selectedFiles.splice(index, 1);
      renderFileList(`${removed.file.name}을(를) 패널에서 제거했습니다.`);
    }


    function currentPreset() {
      return presets.find(p => p.id === selectedPresetId) || presets[0];
    }

    function persistPresets(message = '저장됨') {
      GM_setValue(PRESETS_KEY, presets);
      presetState.textContent = message;
    }

    function updatePromptCount() {
      promptCount.textContent = `${prompt.value.length.toLocaleString()}자`;
    }

    function renderPresets(loadPrompt = true) {
      presetSelect.innerHTML = '';
      for (const p of presets) {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name;
        presetSelect.appendChild(opt);
      }
      presetSelect.value = selectedPresetId;
      if (loadPrompt) prompt.value = currentPreset()?.prompt || '';
      updatePromptCount();
      presetState.textContent = '프리셋을 선택했습니다. 수정하려면 편집을 누르세요.';
    }

    function setPresetEditing(on) {
      presetSelect.disabled = on;
      presetAdd.disabled = on;
      presetEdit.disabled = on;
      presetDelete.disabled = on;
      prompt.readOnly = !on;
      presetNameWrap.classList.toggle('on', on);
      presetEditActions.classList.toggle('on', on);
    }

    function beginPresetEdit(kind) {
      if (presetEditMode) return;
      if (kind === 'new') {
        presetEditMode = { kind: 'new' };
        presetName.value = '새 프리셋';
        prompt.value = '';
        presetState.textContent = '새 프리셋 작성 중 · 저장을 눌러야 반영됩니다.';
      } else {
        const p = currentPreset();
        if (!p) return;
        presetEditMode = { kind: 'edit', id: p.id };
        presetName.value = p.name;
        prompt.value = p.prompt;
        presetState.textContent = '프리셋 편집 중 · 저장을 눌러야 반영됩니다.';
      }
      updatePromptCount();
      setPresetEditing(true);
      presetName.focus();
      presetName.select?.();
    }

    function finishPresetEdit(cancelled = false) {
      if (!presetEditMode) return;
      if (cancelled) {
        presetEditMode = null;
        setPresetEditing(false);
        renderPresets(true);
        presetState.textContent = '편집을 취소했습니다.';
        return;
      }

      const name = presetName.value.trim().slice(0, 60);
      if (!name) {
        presetState.textContent = '프리셋 제목을 입력해 주세요.';
        presetName.focus();
        return;
      }
      const draftPrompt = prompt.value;

      if (presetEditMode.kind === 'new') {
        const p = { id: newPresetId(), name, prompt: draftPrompt };
        presets.push(p);
        selectedPresetId = p.id;
        GM_setValue(SELECTED_PRESET_KEY, selectedPresetId);
      } else {
        const p = presets.find(x => x.id === presetEditMode.id);
        if (!p) {
          presetState.textContent = '편집할 프리셋을 찾지 못했습니다.';
          return;
        }
        p.name = name;
        p.prompt = draftPrompt;
      }

      persistPresets('프리셋을 저장했습니다.');
      presetEditMode = null;
      setPresetEditing(false);
      renderPresets(true);
      presetState.textContent = '프리셋을 저장했습니다.';
    }

    renderPresets(true);
    updatePromptCount();
    setPresetEditing(false);
    renderFileList();
    renderResumeState();

    presetSelect.addEventListener('change', () => {
      if (presetEditMode) return;
      selectedPresetId = presetSelect.value;
      GM_setValue(SELECTED_PRESET_KEY, selectedPresetId);
      prompt.value = currentPreset()?.prompt || '';
      updatePromptCount();
      presetState.textContent = '프리셋을 선택했습니다. 수정하려면 편집을 누르세요.';
    });

    prompt.addEventListener('input', updatePromptCount);

    presetAdd.addEventListener('click', () => beginPresetEdit('new'));
    presetEdit.addEventListener('click', () => beginPresetEdit('edit'));
    presetSave.addEventListener('click', () => finishPresetEdit(false));
    presetCancel.addEventListener('click', () => finishPresetEdit(true));

    presetDelete.addEventListener('click', () => {
      if (presetEditMode) return;
      if (presets.length <= 1) {
        presetState.textContent = '프리셋은 최소 1개 필요합니다.';
        return;
      }
      const p = currentPreset();
      if (!p || !window.confirm(`“${p.name}” 프리셋을 삭제할까요?`)) return;
      presets = presets.filter(x => x.id !== p.id);
      selectedPresetId = presets[0].id;
      GM_setValue(SELECTED_PRESET_KEY, selectedPresetId);
      persistPresets('프리셋을 삭제했습니다.');
      renderPresets(true);
      presetState.textContent = '프리셋을 삭제했습니다.';
    });

    extract.addEventListener('click', async () => {
      if (busy) return;
      busy = true;
      extract.disabled = true;
      extractSince.disabled = true;
      extract.textContent = '로그 추출 중…';
      try {
        const result = await extractCurrentCrackTxt(message => {
          status.textContent = message;
        });
        const added = addFiles(
          [result.file],
          `현재 채팅 전체 추출 · ${result.messageCount.toLocaleString()}개 메시지`,
          { checkpoint: result.checkpoint }
        );
        if (added) {
          status.textContent = `${result.messageCount.toLocaleString()}개 메시지를 새 TXT로 추가했습니다.\n파일 행의 “저장”을 누르면 이 시점이 이어서 저장 기준이 됩니다.`;
        }
      } catch (e) {
        const message = e?.message === 'RATE_LIMITED'
          ? 'Crack 서버 요청 제한에 걸렸습니다. 잠시 후 다시 시도해 주세요.'
          : (e?.message || String(e));
        status.textContent = '⚠️ ' + message;
      } finally {
        busy = false;
        extract.disabled = false;
        extract.textContent = '＋ 현재 채팅 전체 로그 추출';
        renderResumeState();
      }
    });

    extractSince.addEventListener('click', async () => {
      if (busy) return;
      busy = true;
      extract.disabled = true;
      extractSince.disabled = true;
      extractSince.textContent = '새 메시지 확인 중…';
      try {
        const result = await extractCrackTxtSinceSaved(message => {
          status.textContent = message;
        });
        if (!result.file || !result.messageCount) {
          status.textContent = '저장 지점 이후 새로운 메시지가 없습니다.';
          return;
        }

        downloadLocalFile(result.file);
        const committed = commitResumeCursor(result.checkpoint);
        const added = addFiles(
          [result.file],
          `이어서 저장 · 새 메시지 ${result.messageCount.toLocaleString()}개`,
          { checkpoint: committed, checkpointCommitted: true }
        );
        renderResumeState();
        status.textContent = added
          ? `새 메시지 ${result.messageCount.toLocaleString()}개 TXT 저장을 요청하고 전송 목록에도 추가했습니다.\n이어서 저장 기준을 새 파일의 마지막 메시지로 갱신했습니다.`
          : `새 메시지 ${result.messageCount.toLocaleString()}개 TXT 저장을 요청했습니다.`;
      } catch (e) {
        const message = e?.message === 'RATE_LIMITED'
          ? 'Crack 서버 요청 제한에 걸렸습니다. 잠시 후 다시 시도해 주세요.'
          : (e?.message || String(e));
        status.textContent = '⚠️ 이어서 저장 실패 · ' + message;
      } finally {
        busy = false;
        extract.disabled = false;
        extractSince.textContent = '↪ 저장 지점 이후 TXT 저장';
        renderResumeState();
      }
    });

    pick.addEventListener('click', () => picker.click());
    picker.addEventListener('change', () => {
      const files = [...(picker.files || [])];
      if (files.length) addFiles(files, '기존 TXT 직접 선택');
      picker.value = '';
    });

    fileList.addEventListener('click', async e => {
      const button = e.target.closest('button[data-action]');
      if (!button) return;
      const row = button.closest('.fileRow');
      const item = selectedFiles.find(x => x.id === row?.dataset.fileId);
      if (!item) return;

      const action = button.dataset.action;

      if (action === 'remove') {
        if (!window.confirm(`“${item.file.name}”을(를) 패널에서 제거할까요?\n(기기에 저장된 원본 파일은 삭제되지 않습니다.)`)) return;
        previewOverlay.classList.remove('on');
        removeFileById(item.id);
        return;
      }

      if (action === 'save') {
        try {
          downloadLocalFile(item.file);
          if (item.checkpoint) {
            item.checkpoint = commitResumeCursor(item.checkpoint);
            item.checkpointCommitted = true;
            renderFileList();
            renderResumeState();
            status.textContent = `${item.file.name} 다운로드를 요청했습니다.\n이 파일의 마지막 메시지를 이어서 저장 기준으로 기록했습니다.`;
          } else {
            status.textContent = `${item.file.name} 다운로드를 요청했습니다.`;
          }
        } catch (err) {
          status.textContent = 'TXT 저장에 실패했습니다: ' + (err?.message || String(err));
        }
        return;
      }

      if (action === 'preview') {
        button.disabled = true;
        try {
          const fileText = await item.file.text();
          const LIMIT = 100000;
          const clipped = fileText.length > LIMIT;
          previewTitle.textContent = item.file.name || 'TXT 내용 확인';
          previewMeta.textContent = clipped
            ? `전체 ${fileText.length.toLocaleString()}자 · 앞 ${LIMIT.toLocaleString()}자 미리보기`
            : `전체 ${fileText.length.toLocaleString()}자 · 전체 내용 표시`;
          previewText.value = clipped
            ? fileText.slice(0, LIMIT) + `\n\n--- 미리보기는 앞 ${LIMIT.toLocaleString()}자까지만 표시됩니다 ---`
            : fileText;
          previewText.scrollTop = 0;
          previewOverlay.classList.add('on');
        } catch (err) {
          status.textContent = 'TXT 내용을 읽지 못했습니다: ' + (err?.message || String(err));
        } finally {
          button.disabled = false;
        }
      }
    });

    previewClose.addEventListener('click', () => previewOverlay.classList.remove('on'));
    previewOverlay.addEventListener('click', e => {
      if (e.target === previewOverlay) previewOverlay.classList.remove('on');
    });

    clearAllTxt.addEventListener('click', () => {
      if (!selectedFiles.length) return;
      if (!window.confirm(`현재 패널에 추가된 TXT ${selectedFiles.length.toLocaleString()}개를 모두 제거할까요?\n(기기에 저장된 원본 파일은 삭제되지 않습니다.)`)) return;
      previewOverlay.classList.remove('on');
      selectedFiles = [];
      picker.value = '';
      renderFileList('패널의 TXT 파일을 모두 제거했습니다.');
    });


    function openPanel() {
      backdrop.classList.add('open');
      renderResumeState();
      refreshStatus();
    }
    function closePanel() { backdrop.classList.remove('open'); }
    close.addEventListener('click', closePanel);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) closePanel(); });

    // Crack Mobile Utility 미니사이드바가 있으면 끝에 아이콘을 추가하고,
    // 없으면 드래그 가능한 플로팅 버튼을 사용합니다.
    function ensureCmuSidebarScrollStyle() {
      if (document.getElementById(CMU_SIDE_STYLE_ID)) return;
      const style = document.createElement('style');
      style.id = CMU_SIDE_STYLE_ID;
      style.textContent = `
        #chud-side-content.crack-gpt-horizontal-scroll {
          overflow-x: auto !important;
          overflow-y: hidden !important;
          pointer-events: auto !important;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          overscroll-behavior-x: contain;
          touch-action: pan-x pan-y;
        }
        #chud-side-content.crack-gpt-horizontal-scroll::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
      `;
      (document.head || document.documentElement).appendChild(style);
    }

    function createCmuSideButton() {
      const button = document.createElement('button');
      button.id = CMU_SIDE_BUTTON_ID;
      button.className = 'chud-action-btn';
      button.type = 'button';
      button.tabIndex = -1;
      button.title = 'ChatGPT 로그';
      button.setAttribute('aria-label', 'ChatGPT 로그');
      button.dataset.crackGptBridge = 'true';
      button.innerHTML = `
        <svg class="chud-btn-icon" viewBox="0 0 24 24" width="16.5" height="16.5"
             fill="none" stroke="currentColor" stroke-width="1.9"
             stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M7 3.5h7l4 4V20.5H7z"/>
          <path d="M14 3.5v4h4"/>
          <path d="M9.5 15.5h5"/>
          <path d="m12.5 12.5 2.5 3-2.5 3"/>
        </svg>
        <span data-cgb-dot="1" aria-hidden="true"
          style="display:none;position:absolute;right:1px;bottom:1px;width:5px;height:5px;border-radius:999px;background:#22c55e;box-shadow:0 0 0 1px rgba(0,0,0,.35)"></span>
      `;
      button.addEventListener('pointerdown', e => e.preventDefault());
      button.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        openPanel();
      });
      return button;
    }

    function updateEntryIndicators() {
      const sideButton = document.getElementById(CMU_SIDE_BUTTON_ID);
      const dot = sideButton?.querySelector('[data-cgb-dot="1"]');
      if (dot) dot.style.display = selectedFiles.length ? 'block' : 'none';
    }

    let cmuSyncRaf = 0;
    function syncCmuSidebarEntry() {
      cmuSyncRaf = 0;

      if (!isCrackChatRoute()) {
        document.getElementById(CMU_SIDE_BUTTON_ID)?.remove();
        fab.style.display = 'none';
        closePanel();
        return;
      }

      const content = document.getElementById('chud-side-content');

      if (!content) {
        document.getElementById(CMU_SIDE_BUTTON_ID)?.remove();
        fab.style.display = 'flex';
        return;
      }

      ensureCmuSidebarScrollStyle();
      content.classList.add('crack-gpt-horizontal-scroll');

      let button = document.getElementById(CMU_SIDE_BUTTON_ID);
      if (!button || button.parentElement !== content) {
        button?.remove();
        button = createCmuSideButton();
        content.appendChild(button);
      } else if (content.lastElementChild !== button) {
        content.appendChild(button);
      }

      fab.style.display = 'none';
      updateEntryIndicators();
    }

    function scheduleCmuSidebarSync() {
      if (cmuSyncRaf) return;
      cmuSyncRaf = requestAnimationFrame(syncCmuSidebarEntry);
    }

    function mutationTouchesCmuSidebar(mutation) {
      if (mutation.target instanceof Element &&
          (mutation.target.id === 'chud-sidebar' || mutation.target.id === 'chud-side-content')) {
        return true;
      }
      for (const node of [...mutation.addedNodes, ...mutation.removedNodes]) {
        if (!(node instanceof Element)) continue;
        if (node.id === 'chud-sidebar' || node.id === 'chud-side-content' ||
            node.id === CMU_SIDE_BUTTON_ID ||
            node.querySelector?.('#chud-sidebar, #chud-side-content, #' + CMU_SIDE_BUTTON_ID)) {
          return true;
        }
      }
      return false;
    }

    const cmuSidebarObserver = new MutationObserver(mutations => {
      if (mutations.some(mutationTouchesCmuSidebar)) scheduleCmuSidebarSync();
    });
    cmuSidebarObserver.observe(document.documentElement, { childList: true, subtree: true });

    // 미니사이드바가 늦게 생성되는 경우를 대비해 짧게 재확인합니다.
    ensureCmuSidebarScrollStyle();
    scheduleCmuSidebarSync();
    [250, 700, 1500, 3000].forEach(ms => setTimeout(scheduleCmuSidebarSync, ms));

    // Crack은 새로고침 없이 화면이 바뀌는 SPA이므로 URL 변경도 감지합니다.
    let lastCrackRouteHref = location.href;
    const syncRouteVisibility = () => {
      if (location.href === lastCrackRouteHref) return;
      lastCrackRouteHref = location.href;
      renderResumeState();
      scheduleCmuSidebarSync();
    };
    window.addEventListener('popstate', syncRouteVisibility);
    window.addEventListener('hashchange', syncRouteVisibility);
    setInterval(syncRouteVisibility, 600);

    // 드래그 가능한 FAB. 짧은 탭은 열기, 10px 이상 움직이면 드래그.
    let drag = null;
    function clampFab(x, y) {
      const size = 58, pad = 6;
      const vv = window.visualViewport;
      const w = vv?.width || window.innerWidth;
      const h = vv?.height || window.innerHeight;
      return {
        x: Math.max(pad, Math.min(x, w - size - pad)),
        y: Math.max(pad, Math.min(y, h - size - pad))
      };
    }
    function applyFabPosition() {
      const stored = GM_getValue(FAB_POS_KEY, null);
      let pos = stored && Number.isFinite(stored.x) && Number.isFinite(stored.y)
        ? clampFab(stored.x, stored.y)
        : clampFab((window.visualViewport?.width || innerWidth) - 72,
                   (window.visualViewport?.height || innerHeight) - 140);
      fab.style.left = `${pos.x}px`;
      fab.style.top = `${pos.y}px`;
      fab.style.right = 'auto';
      fab.style.bottom = 'auto';
      if (stored) GM_setValue(FAB_POS_KEY, pos);
    }
    fab.addEventListener('pointerdown', e => {
      if (e.button != null && e.button !== 0) return;
      const r = fab.getBoundingClientRect();
      drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, x: r.left, y: r.top, moved: false };
      fab.setPointerCapture?.(e.pointerId);
      e.preventDefault();
    });
    fab.addEventListener('pointermove', e => {
      if (!drag || drag.id !== e.pointerId) return;
      const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
      if (!drag.moved && Math.hypot(dx, dy) >= 10) {
        drag.moved = true;
        fab.classList.add('dragging');
      }
      if (!drag.moved) return;
      const pos = clampFab(drag.x + dx, drag.y + dy);
      fab.style.left = `${pos.x}px`;
      fab.style.top = `${pos.y}px`;
      e.preventDefault();
    });
    function finishDrag(e) {
      if (!drag || drag.id !== e.pointerId) return;
      const wasMoved = drag.moved;
      const r = fab.getBoundingClientRect();
      drag = null;
      fab.classList.remove('dragging');
      if (wasMoved) {
        const pos = clampFab(r.left, r.top);
        GM_setValue(FAB_POS_KEY, pos);
      } else {
        openPanel();
      }
    }
    fab.addEventListener('pointerup', finishDrag);
    fab.addEventListener('pointercancel', e => {
      if (!drag || drag.id !== e.pointerId) return;
      drag = null;
      fab.classList.remove('dragging');
    });
    window.addEventListener('resize', applyFabPosition);
    window.visualViewport?.addEventListener('resize', applyFabPosition);
    applyFabPosition();
    if (!isCrackChatRoute()) fab.style.display = 'none';
    scheduleCmuSidebarSync();

    async function refreshStatus() {
      if (busy) return;
      cleanupExpired();
      const jobId = GM_getValue(CURRENT, null);
      if (!jobId) return;
      const s = getStatus(jobId);
      if (!s) return;
      if (s.state === 'pending') status.textContent = '웹 전송 대기 중 · ChatGPT 웹에서 원하는 채팅을 선택하세요.';
      else if (s.state === 'processing') status.textContent = s.message || 'ChatGPT 웹에서 전송 처리 중…';
      else if (s.state === 'error') status.textContent = '전송 오류 · ' + (s.message || 'ChatGPT 웹을 확인해 주세요.');
    }

    function resolveSendContext(presetId) {
      const chatroomIds = [...new Set(
        selectedFiles.map(item => item.checkpoint?.chatroomId).filter(Boolean)
      )];
      if (chatroomIds.length !== 1) {
        return {
          sourceChatroomId: '',
          resumeCheckpoint: null,
          linkedConversation: null,
          mixedChatrooms: chatroomIds.length > 1
        };
      }

      const sourceChatroomId = chatroomIds[0];
      const candidates = selectedFiles.filter(item => item.checkpoint?.chatroomId === sourceChatroomId);
      const newest = candidates.reduce((best, item) => {
        if (!best) return item;
        return Number(item.checkpoint?.totalSaved) >= Number(best.checkpoint?.totalSaved) ? item : best;
      }, null);
      const currentCursor = getResumeCursor(sourceChatroomId);
      const canAdvanceCursor = newest?.checkpoint && !newest.checkpointCommitted &&
        (!currentCursor || Number(newest.checkpoint.totalSaved) >= Number(currentCursor.totalSaved));

      return {
        sourceChatroomId,
        resumeCheckpoint: canAdvanceCursor ? newest.checkpoint : null,
        linkedConversation: getChatGPTLink(sourceChatroomId, presetId),
        mixedChatrooms: false
      };
    }

    send.addEventListener('click', async () => {
      if (busy) return;
      busy = true;
      send.disabled = true;
      send.textContent = '준비 중…';
      try {
        if (presetEditMode) throw new Error('프리셋 편집 내용을 먼저 저장하거나 취소해 주세요.');
        const p = currentPreset();
        if (!selectedFiles.length) throw new Error('먼저 현재 채팅을 추출하거나 기존 TXT 파일을 하나 이상 추가해 주세요.');
        if (!p?.prompt?.trim()) throw new Error('선택한 프리셋의 지침이 비어 있습니다. 편집에서 지침을 저장해 주세요.');
        const sendContext = resolveSendContext(p.id);
        const { jobId } = await createJob(
          selectedFiles.map(x => x.file),
          p.prompt,
          p.name || '',
          {
            sourceChatroomId: sendContext.sourceChatroomId,
            presetId: p.id,
            resumeCheckpoint: sendContext.resumeCheckpoint,
            targetWasLinked: !!sendContext.linkedConversation
          }
        );
        const message = sendContext.linkedConversation
          ? '이 작품 + 선택 프리셋에 연결된 기존 ChatGPT 대화방을 여는 중입니다. 열린 채팅에서 “이 채팅으로 전송”을 누르세요.'
          : sendContext.sourceChatroomId
            ? '이 작품 + 선택 프리셋의 첫 ChatGPT 전송입니다. 전송을 완료한 대화방이 같은 프리셋의 다음 전송부터 자동으로 연결됩니다.'
            : sendContext.mixedChatrooms
              ? '여러 Crack 채팅의 파일이 섞여 있어 자동 연결 없이 ChatGPT 새 화면을 엽니다.'
              : '웹 전송 대기 중 · ChatGPT 웹에서 새 채팅 또는 기존 채팅을 고른 뒤 “이 채팅으로 전송”을 누르세요.';
        status.textContent = message;
        setStatus(jobId, { state: 'pending', message });
        send.textContent = '웹 여는 중…';

        // 같은 Crack 채팅 + 같은 프리셋은 이전에 연결된 ChatGPT 대화방을, 처음 보는 조합은 홈을 엽니다.
        const target = sendContext.linkedConversation?.url || CHATGPT_HOME;
        try {
          // Android 모바일 브라우저에서 setParent:true가 자식/팝업 탭 형태로 열리면서
          // ChatGPT가 검은 빈 화면에 멈추는 경우가 있어 일반 최상위 탭으로 엽니다.
          // 옵션도 최소화해 Tampermonkey/브라우저별 탭 생성 차이를 줄입니다.
          GM_openInTab(target, { active: true });
        } catch {
          const w = window.open(target, '_blank');
          if (!w) location.href = target;
        }
      } catch (e) {
        status.textContent = '⚠️ ' + (e?.message || String(e));
      } finally {
        busy = false;
        send.disabled = false;
        send.textContent = 'ChatGPT 웹으로 보내기';
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        renderResumeState();
        refreshStatus();
      }
    });
    setInterval(() => { if (!document.hidden) refreshStatus(); }, 1500);
    setInterval(() => { if (!document.hidden) renderResumeState(); }, 60000);
    refreshStatus();
  }

  // ---------- ChatGPT web bridge + per-chat conversation linking ----------
  const visible = el => !!(el && el.isConnected && el.getClientRects().length &&
    getComputedStyle(el).visibility !== 'hidden');

  const enabled = el => visible(el) && !el.disabled && el.getAttribute('aria-disabled') !== 'true';

  function currentRouteKey() {
    return location.pathname + location.search;
  }

  function currentChatGPTConversationUrl() {
    return normalizeChatGPTConversationUrl(location.href);
  }

  // 새 채팅에서 첫 메시지를 보낸 직후에는 ChatGPT SPA의 /c/{대화ID} 주소 반영이
  // 메시지 전송 완료보다 늦을 수 있습니다. 이 탭에 작품×프리셋 연결 대상을 잠시 기억해 두고,
  // URL이 뒤늦게 생겨도 같은 탭에서 확정 저장합니다. sessionStorage라 다른 GPT 탭과 섞이지 않습니다.
  const TAB_LINK_CAPTURE_KEY = PREFIX + 'tab-link-capture:v1';
  const TAB_LINK_CAPTURE_TTL_MS = 3 * 60 * 1000;

  function readTabLinkCapture() {
    try {
      const raw = sessionStorage.getItem(TAB_LINK_CAPTURE_KEY);
      if (!raw) return null;
      const value = JSON.parse(raw);
      if (!value?.sourceChatroomId || !value?.presetId || !value?.jobId) {
        sessionStorage.removeItem(TAB_LINK_CAPTURE_KEY);
        return null;
      }
      if (!Number(value.armedAt) || Date.now() - Number(value.armedAt) > TAB_LINK_CAPTURE_TTL_MS) {
        sessionStorage.removeItem(TAB_LINK_CAPTURE_KEY);
        return null;
      }
      return value;
    } catch {
      return null;
    }
  }

  function armTabLinkCapture(meta, jobId) {
    if (!meta?.sourceChatroomId || !meta?.presetId || !jobId) return;
    try {
      sessionStorage.setItem(TAB_LINK_CAPTURE_KEY, JSON.stringify({
        sourceChatroomId: String(meta.sourceChatroomId),
        presetId: String(meta.presetId),
        jobId: String(jobId),
        armedAt: Date.now()
      }));
    } catch {}
  }

  function clearTabLinkCapture(jobId = '') {
    try {
      if (!jobId) {
        sessionStorage.removeItem(TAB_LINK_CAPTURE_KEY);
        return;
      }
      const current = readTabLinkCapture();
      if (current?.jobId === String(jobId)) sessionStorage.removeItem(TAB_LINK_CAPTURE_KEY);
    } catch {}
  }

  function tryCommitTabLinkCapture() {
    const capture = readTabLinkCapture();
    if (!capture) return null;
    const conversationUrl = currentChatGPTConversationUrl();
    if (!conversationUrl) return null;
    const linked = commitChatGPTLink(capture.sourceChatroomId, capture.presetId, conversationUrl);
    if (linked) clearTabLinkCapture(capture.jobId);
    return linked;
  }

  function openChatGPTConversationInApp(conversationUrl) {
    const target = normalizeChatGPTConversationUrl(conversationUrl) || CHATGPT_HOME;
    if (!/Android/i.test(navigator.userAgent)) {
      location.href = target;
      return;
    }

    const u = new URL(target);
    const path = `${u.host}${u.pathname}${u.search}${u.hash}`;
    const fallback = encodeURIComponent(target);
    location.href = `intent://${path}#Intent;scheme=https;package=com.openai.chatgpt;S.browser_fallback_url=${fallback};end`;
  }

  function waitFor(fn, ms, error, routeCheck) {
    return new Promise((resolve, reject) => {
      const started = Date.now();
      let timer = null, observer = null;
      const done = (err, value) => {
        clearInterval(timer);
        observer?.disconnect();
        err ? reject(err) : resolve(value);
      };
      const check = () => {
        try {
          if (routeCheck && !routeCheck())
            throw new Error('전송 준비 중 채팅을 이동했습니다. 원하는 채팅에서 다시 눌러 주세요.');
          const v = fn();
          if (v) return done(null, v);
          if (Date.now() - started > ms) return done(new Error(error));
        } catch (e) { done(e); }
      };
      timer = setInterval(check, 200);
      observer = new MutationObserver(check);
      observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, characterData: true });
      check();
    });
  }

  function readEditor(el) {
    if (el instanceof HTMLTextAreaElement) return el.value;
    function inline(node) {
      if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
      if (node.nodeName === 'BR') return '\n';
      return [...node.childNodes].map(inline).join('');
    }
    return [...el.childNodes].map(node => {
      let value = inline(node);
      if (node.nodeType === Node.ELEMENT_NODE &&
          /^(P|DIV)$/.test(node.nodeName) &&
          node.lastChild?.nodeName === 'BR') value = value.slice(0, -1);
      return value;
    }).join('\n');
  }

  const norm = s => String(s || '').replace(/\r\n?/g, '\n');

  function filenameVisible(form, editor, fileName) {
    const walker = document.createTreeWalker(form, NodeFilter.SHOW_TEXT);
    for (let node; (node = walker.nextNode()); ) {
      if (!node.textContent?.includes(fileName) || editor.contains(node)) continue;
      const p = node.parentElement;
      if (p && visible(p)) return true;
    }
    return false;
  }

  function findSendButton(form) {
    const selectors = [
      'button[data-testid="send-button"]',
      'button[data-testid="composer-submit-button"]',
      'button[type="submit"]',
      'button[aria-label="Send prompt"]',
      'button[aria-label="프롬프트 보내기"]'
    ];
    const nodes = selectors.map(s => form.querySelector(s)).filter(Boolean);
    return nodes.find(visible) || nodes[0] || null;
  }

  async function attachFile(file, form, editor, routeCheck) {
    const acceptsText = input =>
      !input.disabled &&
      (!input.accept || input.accept.split(',').some(t =>
        ['.txt', 'text/plain', 'text/*', '*/*'].includes(t.trim().toLowerCase())));

    const findInput = () => {
      const known = form.querySelector('input#upload-files[type="file"]');
      if (known && acceptsText(known)) return known;
      const list = [...form.querySelectorAll('input[type="file"]')].filter(acceptsText);
      return list[0] || null;
    };

    let input = findInput();
    if (!input) {
      const plus = form.querySelector('button[data-testid="composer-plus-btn"]');
      if (enabled(plus) && plus.getAttribute('aria-expanded') !== 'true') plus.click();
      input = await waitFor(findInput, 10000,
        'ChatGPT의 파일 첨부 input을 찾지 못했습니다.', routeCheck);
    }

    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));

    await waitFor(
      () => filenameVisible(form, editor, file.name),
      20000,
      `${file.name} 첨부를 확인하지 못했습니다.`,
      routeCheck
    );
  }

  async function injectPrompt(editor, text, routeCheck) {
    if (readEditor(editor).trim()) throw new Error('ChatGPT 입력창에 기존 초안이 있습니다.');

    editor.focus();
    editor.dispatchEvent(new InputEvent('beforeinput', {
      bubbles: true, cancelable: true, inputType: 'insertText', data: text
    }));

    if (editor instanceof HTMLTextAreaElement) {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
      if (!setter) throw new Error('ChatGPT textarea 입력 방식을 찾지 못했습니다.');
      setter.call(editor, text);
      editor.dispatchEvent(new InputEvent('input', {
        bubbles: true, inputType: 'insertText', data: text
      }));
    } else {
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);

      for (let offset = 0; offset < text.length;) {
        if (routeCheck && !routeCheck())
          throw new Error('전송 준비 중 채팅을 이동했습니다. 원하는 채팅에서 다시 눌러 주세요.');
        let end = Math.min(offset + 2048, text.length);
        const last = text.charCodeAt(end - 1);
        if (end < text.length && last >= 0xD800 && last <= 0xDBFF) end--;
        const part = text.slice(offset, end);
        if (!document.execCommand('insertText', false, part))
          throw new Error('ChatGPT 입력창에 지침을 넣지 못했습니다.');
        offset = end;
        await sleep(0);
      }
      editor.dispatchEvent(new InputEvent('input', {
        bubbles: true, inputType: 'insertText', data: text
      }));
    }

    editor.dispatchEvent(new Event('change', { bubbles: true }));
    await waitFor(
      () => norm(readEditor(editor)) === norm(text),
      5000,
      '지침 입력 검증에 실패했습니다.',
      routeCheck
    );
  }

  function initChatGPTBridge() {
    cleanupExpired();
    if (document.getElementById('crack-gpt-web-bridge-host')) return;

    const host = document.createElement('div');
    host.id = 'crack-gpt-web-bridge-host';
    host.style.cssText = 'all:initial;position:fixed;inset:0;z-index:2147483647;pointer-events:none';
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = `
      <style>
        :host{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#fff}
        *{box-sizing:border-box}
        #box{
          pointer-events:auto;position:fixed;left:10px;right:10px;
          bottom:calc(12px + env(safe-area-inset-bottom,0px));margin:auto;max-width:430px;
          display:none;gap:8px;align-items:center;padding:10px;border-radius:17px;
          border:1px solid #ffffff24;background:#17191ff2;box-shadow:0 10px 35px #0008;
          backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)
        }
        #box.on{display:flex}
        #info{flex:1;min-width:0;padding-left:3px}
        #title{font-size:12px;font-weight:850;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        #sub{font-size:10px;color:#aeb6c6;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        #sendHere{
          flex:0 0 auto;min-height:44px;border:0;border-radius:12px;padding:8px 12px;
          background:#f3f4f6;color:#121318;font:800 12px/1.2 inherit;touch-action:manipulation
        }
        #sendHere:disabled{opacity:.55}
        #cancel{
          flex:0 0 38px;width:38px;height:38px;border:1px solid #ffffff1d;border-radius:11px;
          background:#242730;color:#fff;font-size:18px;touch-action:manipulation
        }
        #openApp{
          pointer-events:auto;position:fixed;left:12px;bottom:calc(160px + env(safe-area-inset-bottom,0px));
          display:none;min-height:40px;border:1px solid #ffffff24;border-radius:12px;padding:8px 11px;
          background:#17191ff2;color:#fff;font:800 11px/1.2 inherit;box-shadow:0 8px 25px #0007;
          backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);touch-action:manipulation
        }
        #openApp.on{display:block}
        #toast{
          pointer-events:none;position:fixed;left:16px;right:16px;
          bottom:calc(82px + env(safe-area-inset-bottom,0px));margin:auto;max-width:400px;
          display:none;padding:10px 12px;border-radius:12px;background:#101218ee;color:#fff;
          font:700 12px/1.45 inherit;text-align:center;box-shadow:0 8px 25px #0007
        }
        #toast.on{display:block}
      </style>
      <div id="box">
        <div id="info">
          <div id="title">📎 GPT 전송 대기</div>
          <div id="sub"></div>
        </div>
        <button id="sendHere" type="button">이 채팅으로 전송</button>
        <button id="cancel" type="button" aria-label="전송 대기 취소">×</button>
      </div>
      <button id="openApp" type="button">📱 이 채팅 앱에서 열기</button>
      <div id="toast"></div>
    `;
    document.documentElement.appendChild(host);

    const $ = q => root.querySelector(q);
    const box = $('#box'), title = $('#title'), sub = $('#sub');
    const sendHere = $('#sendHere'), cancel = $('#cancel'), openApp = $('#openApp'), toast = $('#toast');
    let busy = false, toastTimer = null;

    function showToast(message, ms = 3200) {
      toast.textContent = message;
      toast.classList.add('on');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toast.classList.remove('on'), ms);
    }

    function refreshAppButton() {
      const conversationUrl = currentChatGPTConversationUrl();
      const canOpenApp = /Android/i.test(navigator.userAgent) && !!conversationUrl;
      openApp.classList.toggle('on', canOpenApp);
      openApp.dataset.url = conversationUrl || '';
    }

    openApp.addEventListener('click', () => {
      const conversationUrl = openApp.dataset.url || currentChatGPTConversationUrl();
      if (!conversationUrl) return showToast('현재 ChatGPT 대화방 주소를 아직 확인하지 못했습니다.');
      openChatGPTConversationInApp(conversationUrl);
    });

    function pendingMeta() {
      const jobId = GM_getValue(CURRENT, null);
      if (!jobId) return null;
      const meta = getMeta(jobId);
      if (!meta) return null;
      if (Date.now() - meta.createdAt > PENDING_TTL_MS) {
        cleanupJob(jobId);
        return null;
      }
      const st = getStatus(jobId);
      if (st?.state === 'done') return null;
      return { jobId, meta, status: st };
    }

    function refresh() {
      refreshAppButton();
      // 첫 전송 직후 URL 생성이 늦어져도 이 탭에서 작품×프리셋 링크를 확정합니다.
      tryCommitTabLinkCapture();
      const p = pendingMeta();
      if (!p) {
        box.classList.remove('on');
        return;
      }
      box.classList.add('on');
      const pendingFiles = Array.isArray(p.meta.files) ? p.meta.files : [{ fileName: p.meta.fileName || 'Crack-RP-Log.txt' }];
      title.textContent = pendingFiles.length === 1
        ? `📎 ${pendingFiles[0].fileName}`
        : `📎 TXT ${pendingFiles.length.toLocaleString()}개`;
      const preset = p.meta.presetName ? ` · ${p.meta.presetName}` : '';
      const linkState = p.meta.sourceChatroomId
        ? (p.meta.targetWasLinked ? '연결된 작품·프리셋 대화방' : '첫 전송 후 이 작품·프리셋에 연결')
        : '자동 연결 없음';
      sub.textContent = busy ? '현재 채팅으로 전송 중…' : `전송 대기${preset} · ${linkState}`;
    }

    cancel.addEventListener('click', () => {
      if (busy) return;
      const p = pendingMeta();
      if (!p) return refresh();
      if (!confirm('이 GPT 전송 대기를 취소할까요?')) return;
      cleanupJob(p.jobId);
      refresh();
      showToast('전송 대기를 취소했습니다.');
    });

    sendHere.addEventListener('click', async () => {
      if (busy) return;
      const p = pendingMeta();
      if (!p) return refresh();
      const { jobId, meta } = p;

      const oldClaim = GM_getValue(key('claim', jobId), null);
      if (oldClaim?.clicked) {
        showToast('이미 전송 버튼을 누른 작업입니다. 중복 전송을 막았습니다.', 4500);
        return;
      }

      busy = true;
      sendHere.disabled = true;
      sendHere.textContent = '전송 중…';
      GM_setValue(key('claim', jobId), { at: Date.now(), clicked: false });
      setStatus(jobId, { state: 'processing', message: '선택한 ChatGPT 채팅으로 전송 중…' });
      refresh();

      let clicked = false;
      const startRoute = currentRouteKey();
      const routeCheck = () => currentRouteKey() === startRoute;

      try {
        const jobFiles = readJobFiles(meta);
        if (!jobFiles.length) throw new Error('전송할 TXT 파일이 없습니다.');
        for (const item of jobFiles) {
          if (!item.text.trim()) throw new Error(`${item.info.fileName}: TXT 파일이 비어 있습니다.`);
        }

        const editor = await waitFor(
          () => {
            const el = document.querySelector('#prompt-textarea');
            return visible(el) && (el.isContentEditable || el instanceof HTMLTextAreaElement) && el;
          },
          20000,
          '현재 화면에서 ChatGPT 입력창을 찾지 못했습니다.',
          routeCheck
        );

        if (readEditor(editor).trim())
          throw new Error('현재 채팅 입력창에 작성 중인 내용이 있습니다. 비운 뒤 다시 눌러 주세요.');

        const form = editor.closest('form');
        if (!form) throw new Error('ChatGPT 입력 폼 구조가 변경되었습니다.');

        const files = jobFiles.map(item =>
          new File(
            [item.text],
            item.info.fileName,
            { type: item.info.fileType || 'text/plain;charset=utf-8' }
          )
        );
        if (meta.prompt.length > LONG_PROMPT) {
          let instructionName = INSTRUCTION_FILE;
          const usedNames = new Set(files.map(f => f.name.toLowerCase()));
          if (usedNames.has(instructionName.toLowerCase())) instructionName = 'Crack-GPT-Instructions (guide).txt';
          files.push(new File([meta.prompt], instructionName, { type: 'text/plain;charset=utf-8' }));
        }

        for (const f of files) {
          if (filenameVisible(form, editor, f.name))
            throw new Error(`현재 입력창에 같은 파일(${f.name})이 이미 있습니다.`);
          setStatus(jobId, { state: 'processing', message: `ChatGPT에 ${f.name} 첨부 중…` });
          await attachFile(f, form, editor, routeCheck);
        }

        const promptText = makePrompt(meta.prompt);
        setStatus(jobId, { state: 'processing', message: '요약 지침 입력 중…' });
        await injectPrompt(editor, promptText, routeCheck);

        setStatus(jobId, { state: 'processing', message: 'ChatGPT 전송 준비 확인 중…' });
        const send = await waitFor(
          () => {
            const b = findSendButton(form);
            return enabled(b) && b;
          },
          60000,
          'ChatGPT 전송 버튼이 준비되지 않았습니다. 파일 업로드 상태를 확인해 주세요.',
          routeCheck
        );

        if (norm(readEditor(editor)) !== norm(promptText))
          throw new Error('전송 직전에 지침 내용이 변경되었습니다.');

        const previous = new Set(document.querySelectorAll('[data-message-author-role="user"]'));
        clicked = true;
        GM_setValue(key('claim', jobId), { at: Date.now(), clicked: true });
        setStatus(jobId, { state: 'processing', message: 'ChatGPT로 최종 전송 중…' });
        // 이 탭을 현재 작품×프리셋의 연결 대상 탭으로 묶습니다.
        // 새 채팅의 /c/{대화ID}가 늦게 생겨도 아래 감시 로직이 같은 탭에서 저장합니다.
        armTabLinkCapture(meta, jobId);
        send.click();

        await waitFor(
          () => [...document.querySelectorAll('[data-message-author-role="user"]')]
            .some(el => !previous.has(el)) || !readEditor(editor).trim(),
          30000,
          '전송 버튼은 눌렀지만 완료를 확인하지 못했습니다. 현재 채팅을 직접 확인해 주세요.',
          null
        );

        let linkedConversation = meta.sourceChatroomId && meta.presetId
          ? getChatGPTLink(meta.sourceChatroomId, meta.presetId)
          : null;
        if (meta.sourceChatroomId && meta.presetId) {
          setStatus(jobId, { state: 'processing', message: '전송 완료 · 이 작품 + 프리셋의 ChatGPT 대화방 연결 저장 중…' });

          // 이미 /c/ 주소가 생겼다면 즉시 확정합니다. 새 채팅은 URL 반영이 늦을 수 있으므로
          // 기존 12초보다 충분히 길게 기다리고, 그래도 늦으면 탭 감시가 뒤에서 이어받습니다.
          linkedConversation = tryCommitTabLinkCapture() || linkedConversation;
          if (!linkedConversation) {
            const conversationUrl = currentChatGPTConversationUrl() || await waitFor(
              currentChatGPTConversationUrl,
              60000,
              'ChatGPT 대화방 주소 확인 시간 초과',
              null
            ).catch(() => null);
            if (conversationUrl) {
              linkedConversation = commitChatGPTLink(meta.sourceChatroomId, meta.presetId, conversationUrl) || linkedConversation;
              if (linkedConversation) clearTabLinkCapture(jobId);
            }
          }
        }

        // 전체 추출 파일을 기기에 따로 저장하지 않고 GPT로만 보낸 경우에도
        // 전송 성공 시점을 이어서 TXT 기준으로 기록합니다. 기존의 더 최신 기준은 되돌리지 않습니다.
        if (meta.resumeCheckpoint?.chatroomId && meta.resumeCheckpoint?.lastMessageId) {
          try {
            const currentCursor = getResumeCursor(meta.resumeCheckpoint.chatroomId);
            if (!currentCursor || Number(meta.resumeCheckpoint.totalSaved) >= Number(currentCursor.totalSaved)) {
              commitResumeCursor(meta.resumeCheckpoint);
            }
          } catch (cursorError) {
            console.warn('[Crack GPT Bridge] 이어서 저장 기준 기록 실패:', cursorError);
          }
        }

        // 전송 성공이 확인되면 TXT 조각, 일회성 지침/파일 메타데이터, 상태/claim/current를 즉시 모두 삭제.
        cleanupJob(jobId);
        showToast(meta.sourceChatroomId
          ? linkedConversation
            ? '✅ 전송 완료 · 다음부터 이 Crack 채팅 + 같은 프리셋은 현재 ChatGPT 대화방으로 연결됩니다.'
            : '✅ 전송 완료 · 대화방 주소가 늦게 생성되고 있어 이 탭에서 연결 저장을 계속 확인합니다.'
          : '✅ 현재 채팅으로 전송했습니다. 전송 대기 데이터도 삭제했습니다.', 5200);
      } catch (e) {
        const message = e?.message || String(e);
        setStatus(jobId, {
          state: 'error',
          message: clicked
            ? `전송 클릭 후 확인 실패: ${message}\n중복 방지를 위해 자동 재시도하지 않습니다.`
            : `전송 실패: ${message}`
        });
        if (!clicked) {
          GM_deleteValue(key('claim', jobId));
          clearTabLinkCapture(jobId);
        }
        showToast('⚠️ ' + message, 5200);
      } finally {
        busy = false;
        sendHere.disabled = false;
        sendHere.textContent = '이 채팅으로 전송';
        refresh();
      }
    });

    // ChatGPT는 SPA라 채팅을 이동해도 페이지 전체 reload가 없을 수 있다.
    const mo = new MutationObserver(refresh);
    mo.observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener('pageshow', refresh);
    window.addEventListener('popstate', () => setTimeout(refresh, 0));
    setInterval(refresh, 1200);
    refresh();
  }

  if (location.hostname === 'crack.wrtn.ai') initCrack();
  else if (location.hostname === 'chatgpt.com') initChatGPTBridge();

})();
