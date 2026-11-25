/* Укажите ID счётчика здесь. Не добавляйте отдельный код Метрики или noscript-пиксель в HTML. */
(() => {
    'use strict';
    const COUNTER_ID = null;
    const analyticsConfigured = Number.isSafeInteger(COUNTER_ID) && COUNTER_ID > 0;
    const KEY = 'nova-dom-privacy-v2';
    const CONSENT_VERSION = '2026-11-25';
    const JOURNAL_URL = 'https://asama79164.tw1.ru/api/site-consent/';
    const TTL = 180 * 24 * 60 * 60 * 1000;
    const policyUrl = new URL('privacy.html', document.currentScript.src).href;
    const consentUrl = new URL('consent.html', document.currentScript.src).href;
    let choice = null;
    let started = false;
    let loader = null;
    function readState() {
        try {
            const saved = JSON.parse(localStorage.getItem(KEY));
            return saved?.version === CONSENT_VERSION ? saved : {};
        } catch (_) {
            return {};
        }
    }
    const saved = readState();
    if (['accepted', 'rejected'].includes(saved.value) && saved.at <= Date.now() && Date.now() - saved.at < TTL) choice = saved.value;
    function saveState(state) {
        localStorage.setItem(KEY, JSON.stringify({ ...state, version: CONSENT_VERSION }));
    }
    function makeEvent(action, browserId) {
        return { action, browser_id: browserId, event_id: crypto.randomUUID(), version: CONSENT_VERSION };
    }
    async function record(event) {
        const response = await fetch(JOURNAL_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'omit',
            referrerPolicy: 'no-referrer',
            signal: AbortSignal.timeout(7000),
            body: JSON.stringify(event)
        });
        if (!response.ok || !(await response.json()).saved) throw new Error('Не удалось записать выбор');
    }
    async function completeRevocation(event) {
        await record(event);
        if (readState().pending?.event_id === event.event_id) {
            saveState({ value: 'rejected', at: readState().at });
        }
    }
    const banner = document.createElement('section');
    banner.className = 'cookie-notice';
    banner.setAttribute('aria-label', 'Использование cookies');
    banner.innerHTML = `<div class="cookie-copy"><p>С вашего согласия Яндекс Метрика использует cookies и записывает действия на сайте через Вебвизор. <a href="${consentUrl}">Текст согласия</a> · <a href="${policyUrl}">Политика</a></p><p class="cookie-status" aria-live="polite"></p></div><div class="cookie-actions"><button type="button" data-choice="accepted">Разрешить аналитику</button><button type="button" data-choice="rejected">Отклонить</button></div>`;
    banner.hidden = !analyticsConfigured || choice !== null;
    banner.querySelector('[data-choice="accepted"]').hidden = !analyticsConfigured;
    document.body.append(banner);
    function start() {
        if (started || choice !== 'accepted' || !analyticsConfigured) return;
        started = true;
        window.ym = window.ym || function () { (window.ym.a = window.ym.a || []).push(arguments); };
        window.ym.l = Date.now();
        loader = document.createElement('script');
        loader.async = true;
        loader.src = 'https://mc.yandex.ru/metrika/tag.js';
        document.head.append(loader);
        window.ym(COUNTER_ID, 'init', { clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: true });
    }
    function stop() {
        // Destroy before reloading so an already initialized counter stops immediately.
        if (started && window.ym) window.ym(COUNTER_ID, 'destruct');
        loader?.remove();
        for (const item of document.cookie.split(';')) {
            const name = item.split('=')[0].trim();
            if (!name.startsWith('_ym_')) continue;
            const domains = location.hostname.split('.');
            const paths = location.pathname.split('/');
            const cookiePaths = new Set(['/']);
            for (let i = 1; i < paths.length; i++) cookiePaths.add(paths.slice(0, i).join('/') || '/');
            for (const path of cookiePaths) {
                const expired = `${name}=; Max-Age=0; path=${path}`;
                document.cookie = expired;
                for (let i = 0; i < domains.length - 1; i++) document.cookie = `${expired}; domain=.${domains.slice(i).join('.')}`;
            }
        }
        return started;
    }
    let opener = null;
    function openSettings(event) {
        opener = event.currentTarget;
        banner.hidden = false;
        banner.querySelector('.cookie-status').textContent = !analyticsConfigured ? 'Аналитика пока не подключена.' : choice === 'accepted' ? 'Ваш текущий выбор: аналитика разрешена.' : choice === 'rejected' ? 'Ваш текущий выбор: аналитика отключена.' : '';
        banner.querySelector('button:not([hidden])').focus({ preventScroll: true });
    }
    document.querySelectorAll('[data-cookie-settings]').forEach(button => button.addEventListener('click', openSettings));
    let updating = false;
    banner.addEventListener('click', async event => {
        const button = event.target.closest('[data-choice]');
        if (!button || updating) return;
        const status = banner.querySelector('.cookie-status');
        updating = true;
        status.textContent = 'Сохраняем выбор…';
        try {
            const state = readState();
            if (button.dataset.choice === 'accepted') {
                if (!analyticsConfigured) return;
                if (state.pending?.action === 'revoke') await completeRevocation(state.pending);
                if (choice !== 'accepted') {
                    const browserId = state.browserId || crypto.randomUUID();
                    const grant = state.pending?.action === 'grant' ? state.pending : makeEvent('grant', browserId);
                    saveState({ browserId, pending: grant });
                    await record(grant);
                    if (readState().pending?.event_id !== grant.event_id) return;
                    saveState({ value: 'accepted', at: Date.now(), browserId });
                    choice = 'accepted';
                    start();
                }
            } else {
                choice = 'rejected';
                const wasStarted = stop();
                const pending = state.pending?.action === 'revoke' ? state.pending :
                    state.browserId ? makeEvent('revoke', state.browserId) : null;
                try {
                    saveState({ value: 'rejected', at: Date.now(), pending });
                } catch (_) {
                    if (pending) throw _;
                }
                if (wasStarted) {
                    location.reload();
                    return;
                }
                if (pending) await completeRevocation(pending);
            }
            banner.hidden = true;
            opener?.focus({ preventScroll: true });
        } catch (_) {
            status.textContent = choice === 'rejected' && button.dataset.choice === 'rejected'
                ? 'Аналитика отключена. Если отзыв ещё не записан, повторите попытку.'
                : 'Не удалось записать согласие. Аналитика не запущена.';
        } finally {
            updating = false;
        }
    });
    window.addEventListener('storage', event => {
        if (event.key === KEY || event.key === null) location.reload();
    });
    if (saved.pending?.action === 'revoke') completeRevocation(saved.pending).catch(() => {});
    start();
})();
