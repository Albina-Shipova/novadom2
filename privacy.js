/* Укажите ID счётчика здесь. Не добавляйте отдельный код Метрики или noscript-пиксель в HTML. */
(() => {
    'use strict';
    const COUNTER_ID = null;
    const KEY = 'nova-dom-privacy-v2';
    const CONSENT_VERSION = '2026-11-12';
    const TTL = 180 * 24 * 60 * 60 * 1000;
    const policyUrl = new URL('privacy.html', document.currentScript.src).href;
    const consentUrl = new URL('consent.html', document.currentScript.src).href;
    let choice = null;
    let started = false;
    let loader = null;
    try {
        const saved = JSON.parse(localStorage.getItem(KEY));
        if (saved && saved.version === CONSENT_VERSION && ['accepted', 'rejected'].includes(saved.value) && saved.at <= Date.now() && Date.now() - saved.at < TTL) choice = saved.value;
    } catch (_) { /* Хранилище может быть недоступно. */ }
    const banner = document.createElement('section');
    banner.className = 'cookie-notice';
    banner.setAttribute('aria-label', 'Использование cookies');
    banner.innerHTML = `<div class="cookie-copy"><p>Нажимая «Разрешить аналитику», вы даёте <a href="${consentUrl}">согласие на обработку данных</a> Яндекс Метрикой. <a href="${policyUrl}">Политика</a></p><p class="cookie-status" aria-live="polite"></p></div><div class="cookie-actions"><button type="button" data-choice="accepted">Разрешить аналитику</button><button type="button" data-choice="rejected">Отклонить</button></div>`;
    banner.hidden = choice !== null;
    document.body.append(banner);
    function start() {
        if (started || choice !== 'accepted' || !Number.isSafeInteger(COUNTER_ID) || COUNTER_ID <= 0) return;
        started = true;
        window.ym = window.ym || function () { (window.ym.a = window.ym.a || []).push(arguments); };
        window.ym.l = Date.now();
        loader = document.createElement('script');
        loader.async = true;
        loader.src = 'https://mc.yandex.ru/metrika/tag.js';
        document.head.append(loader);
        window.ym(COUNTER_ID, 'init', { clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: false });
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
        banner.querySelector('.cookie-status').textContent = choice === 'accepted' ? 'Ваш текущий выбор: аналитика разрешена.' : choice === 'rejected' ? 'Ваш текущий выбор: аналитика отключена.' : '';
        banner.querySelector('button').focus({ preventScroll: true });
    }
    document.querySelectorAll('[data-cookie-settings]').forEach(button => button.addEventListener('click', openSettings));
    banner.addEventListener('click', event => {
        const button = event.target.closest('[data-choice]');
        if (!button) return;
        choice = button.dataset.choice;
        try { localStorage.setItem(KEY, JSON.stringify({ value: choice, at: Date.now(), version: CONSENT_VERSION })); } catch (_) {}
        banner.hidden = true;
        opener?.focus({ preventScroll: true });
        if (choice === 'accepted') start();
        else if (stop()) location.reload();
    });
    window.addEventListener('storage', event => {
        if (event.key === KEY || event.key === null) location.reload();
    });
    start();
})();
