/* NOVA DOM — интерактив */
'use strict';

/* ---------- Шапка: тень при скролле ---------- */

const header = document.querySelector('[data-header]');

const syncHeader = () => {
    header?.classList.toggle('scrolled', window.scrollY > 8);
};

syncHeader();
window.addEventListener('scroll', syncHeader, { passive: true });

/* ---------- Мобильное меню ---------- */

const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('.navlinks');
const syncMenuGeometry = () => {
    header?.style.setProperty('--menu-top', `${header.getBoundingClientRect().bottom}px`);
};

const closeMenu = () => {
    nav?.classList.remove('open');
    menuButton?.setAttribute('aria-expanded', 'false');
    menuButton?.setAttribute('aria-label', 'Открыть меню');
    if (menuButton) {
        menuButton.textContent = 'Меню';
    }
    document.body.classList.remove('menu-open');
};

menuButton?.addEventListener('click', () => {
    const open = !nav.classList.contains('open');
    nav.classList.toggle('open', open);
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    menuButton.textContent = open ? 'Закрыть' : 'Меню';
    document.body.classList.toggle('menu-open', open);
    if (open) syncMenuGeometry();
});

nav?.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));

window.addEventListener('resize', () => {
    syncMenuGeometry();
    if (window.innerWidth > 980) {
        closeMenu();
    }
});
if (header) new ResizeObserver(syncMenuGeometry).observe(header);

/* ---------- Активный раздел в меню ---------- */

(() => {
    const anchors = Array.from(nav?.querySelectorAll(':scope > a') || []).flatMap(link => {
        const url = new URL(link.href, window.location.href);
        if (!url.hash || url.origin !== location.origin || url.pathname !== location.pathname) return [];
        const section = document.getElementById(decodeURIComponent(url.hash.slice(1)));
        return section ? [{ link, section }] : [];
    });
    if (!anchors.length) return;

    let pending = false;
    const update = () => {
        pending = false;
        // Match the anchor offset while keeping the section below the sticky header.
        const marker = Math.max(110, (header?.getBoundingClientRect().bottom || 0) + 20);
        anchors.forEach(({ link, section }) => {
            const rect = section.getBoundingClientRect();
            const active = rect.top <= marker && rect.bottom > marker;
            if (active) link.setAttribute('aria-current', 'location');
            else link.removeAttribute('aria-current');
        });
    };
    const schedule = () => {
        if (pending) return;
        pending = true;
        requestAnimationFrame(update);
    };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('hashchange', schedule);
    window.addEventListener('load', schedule);
    document.fonts?.ready.then(schedule);
    update();
})();

/* ---------- Год в подвале ---------- */

document.querySelectorAll('[data-year]').forEach(el => {
    el.textContent = new Date().getFullYear();
});

/* ---------- Появление при скролле ---------- */

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
/* Appearance is handled below; content remains visible without JavaScript. */
document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));

/* ---------- FAQ: аккордеон с закрытием остальных ---------- */

const faqItems = document.querySelectorAll('.faq-item');

faqItems.forEach(item => {
    item.addEventListener('toggle', () => {
        if (!item.open) {
            return;
        }
        faqItems.forEach(other => {
            if (other !== item) {
                other.open = false;
            }
        });
    });
});

/* ---------- Фильтр галереи ---------- */

const filters = document.querySelectorAll('.filter');
const galleryItems = document.querySelectorAll('.gallery-item');
const projectTiles = Array.from(document.querySelectorAll('.portfolio-tile'));
const featuredGrid = document.querySelector('.portfolio-featured-grid');
const projectGrid = document.querySelector('.portfolio-grid');
const showProjects = document.querySelector('[data-show-projects]');
const featuredProjects = projectTiles.slice(0, 3);
let projectCategory = 'all';
let projectsExpanded = false;

const renderProjects = () => {
    if (!featuredGrid || !projectGrid) return;
    const all = projectCategory === 'all';
    featuredGrid.hidden = !all;
    // В категории избранные становятся обычными карточками общей сетки.
    featuredProjects.forEach(item => item.classList.toggle('portfolio-featured', all));
    if (all) featuredProjects.forEach(item => featuredGrid.append(item));
    else featuredProjects.slice().reverse().forEach(item => projectGrid.prepend(item));
    projectTiles.forEach((item, index) => {
        item.hidden = all ? (!projectsExpanded && index >= 9) : item.dataset.category !== projectCategory;
    });
    const visible = projectTiles.filter(item => !item.hidden).length;
    const status = document.querySelector('.project-results');
    if (status) status.textContent = all ? `Показано ${visible} из ${projectTiles.length} проектов` : `Найдено проектов: ${visible}`;
    if (showProjects) showProjects.hidden = !all || projectsExpanded;
};
renderProjects();
showProjects?.addEventListener('click', () => {
    const firstNew = projectTiles.find(item => item.hidden);
    projectsExpanded = true;
    renderProjects();
    firstNew?.querySelector('a')?.focus({ preventScroll: true });
});

filters.forEach(button => {
    button.addEventListener('click', () => {
        filters.forEach(b => {
            b.classList.remove('active');
            b.setAttribute('aria-pressed', 'false');
        });

        button.classList.add('active');
        button.setAttribute('aria-pressed', 'true');

        const value = button.dataset.filter;
        galleryItems.forEach(item => {
            item.classList.toggle('hidden', value !== 'all' && item.dataset.category !== value);
        });
        projectCategory = value;
        projectsExpanded = false;
        renderProjects();
    });
});

/* ---------- Лайтбокс ---------- */

const lightbox = document.querySelector('.lightbox');
const lightboxImage = lightbox?.querySelector('img');
const lightboxCaption = lightbox?.querySelector('.lightbox-caption');
const viewerItems = Array.from(document.querySelectorAll('[data-viewer]'));
let lastFocus = null;
let imageIndex = 0;
let viewerGroup = [];
let inertElements = [];
let photoScale = 1, photoX = 0, photoY = 0;
const photoPointers = new Map();
let photoGesture = null;
let photoMoved = false;
const paintPhotoZoom = () => {
    const maxX = lightboxImage.offsetWidth * (photoScale - 1) / 2;
    const maxY = lightboxImage.offsetHeight * (photoScale - 1) / 2;
    photoX = Math.max(-maxX, Math.min(maxX, photoX));
    photoY = Math.max(-maxY, Math.min(maxY, photoY));
    lightboxImage.style.transform = `translate(${photoX}px, ${photoY}px) scale(${photoScale})`;
    lightboxImage.classList.toggle('is-zoomed', photoScale > 1);
};
const resetPhotoZoom = () => {
    photoScale = 1; photoX = 0; photoY = 0;
    photoPointers.clear(); photoGesture = null;
    if (lightboxImage) paintPhotoZoom();
};

const displayImage = index => {
    resetPhotoZoom();
    imageIndex = (index + viewerGroup.length) % viewerGroup.length;
    const item = viewerGroup[imageIndex];
    const source = item.querySelector('img');
    lightboxImage.src = source.src;
    lightboxImage.alt = source.alt;
    const caption = item.dataset.caption || item.querySelector('figcaption span')?.textContent || source.alt;
    lightboxCaption.textContent = `${caption} · ${imageIndex + 1} / ${viewerGroup.length}`;
    lightbox.querySelectorAll('.lightbox-prev, .lightbox-next').forEach(button => {
        button.hidden = viewerGroup.length < 2;
    });
};

const closeLightbox = () => {
    if (!lightbox?.classList.contains('open')) return;
    lightbox.classList.remove('open');
    resetPhotoZoom();
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('lightbox-open');
    inertElements.forEach(element => { element.inert = false; });
    inertElements = [];
    lightbox.dispatchEvent(new CustomEvent('viewer-close', { detail: { items: viewerGroup, index: imageIndex } }));
    lastFocus?.focus();
};

const openImageViewer = (items, index, origin) => {
    if (!lightbox || !lightboxImage || !items.length) return;
    lastFocus = origin;
    viewerGroup = items;
    displayImage(index);
    lightbox.classList.add('open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lightbox-open');
    inertElements = Array.from(document.body.children).filter(el => el !== lightbox && !el.inert && el.tagName !== 'SCRIPT');
    inertElements.forEach(element => { element.inert = true; });
    lightbox.querySelector('.lightbox-close').focus();
};

viewerItems.forEach(item => {
    if (item.tagName !== 'BUTTON') {
        item.tabIndex = 0;
        item.setAttribute('role', 'button');
        item.setAttribute('aria-label', `Рассмотреть: ${item.querySelector('img')?.alt}`);
    }
    const open = () => {
        if (!lightbox || !lightboxImage) return;
        const group = item.closest('.gallery, .screenshot-carousel, .credentials-grid, .about-credentials');
        const items = group ? Array.from(group.querySelectorAll('[data-viewer]')) : [item];
        openImageViewer(items, items.indexOf(item), item);
    };
    item.addEventListener('click', open);
    if (item.tagName !== 'BUTTON') item.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); }
    });
});
lightbox?.querySelector('.lightbox-close')?.addEventListener('click', closeLightbox);
lightbox?.querySelector('.lightbox-prev')?.addEventListener('click', () => displayImage(imageIndex - 1));
lightbox?.querySelector('.lightbox-next')?.addEventListener('click', () => displayImage(imageIndex + 1));
lightboxImage?.addEventListener('click', () => {
    if (photoMoved || photoScale > 1) return;
    if (viewerGroup.length > 1) displayImage(imageIndex + 1);
});
const beginPhotoGesture = () => {
    const points = [...photoPointers.values()];
    if (!points.length) { photoGesture = null; return; }
    const [a, b] = points;
    photoGesture = { x: a.x, y: a.y, scale: photoScale, panX: photoX, panY: photoY };
    if (b) {
        const rect = lightboxImage.getBoundingClientRect();
        photoGesture.distance = Math.hypot(b.x - a.x, b.y - a.y);
        photoGesture.x = (a.x + b.x) / 2;
        photoGesture.y = (a.y + b.y) / 2;
        photoGesture.centerX = rect.left + rect.width / 2 - photoX;
        photoGesture.centerY = rect.top + rect.height / 2 - photoY;
    }
};
lightboxImage?.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (!photoPointers.size) photoMoved = false;
    photoPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    lightboxImage.setPointerCapture(event.pointerId);
    if (photoPointers.size > 1) photoMoved = true;
    beginPhotoGesture();
});
lightboxImage?.addEventListener('pointermove', event => {
    if (!photoPointers.has(event.pointerId) || !photoGesture) return;
    photoPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const [a, b] = [...photoPointers.values()];
    const g = photoGesture;
    if (b && g.distance) {
        photoScale = Math.max(1, Math.min(4, g.scale * Math.hypot(b.x - a.x, b.y - a.y) / g.distance));
        const ratio = photoScale / g.scale;
        photoX = (a.x + b.x) / 2 - g.centerX - (g.x - g.centerX - g.panX) * ratio;
        photoY = (a.y + b.y) / 2 - g.centerY - (g.y - g.centerY - g.panY) * ratio;
    } else if (photoScale > 1) {
        photoX = g.panX + a.x - g.x;
        photoY = g.panY + a.y - g.y;
    }
    if (Math.hypot(a.x - g.x, a.y - g.y) > 6) photoMoved = true;
    paintPhotoZoom();
});
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => lightboxImage?.addEventListener(type, event => {
    photoPointers.delete(event.pointerId);
    beginPhotoGesture();
}));
window.addEventListener('resize', resetPhotoZoom);
lightbox?.addEventListener('click', event => { if (event.target === lightbox) closeLightbox(); });
document.addEventListener('keydown', event => {
    if (event.key === 'Escape') { closeLightbox(); closeMenu(); }
    if (!lightbox?.classList.contains('open')) return;
    if (event.key === 'ArrowLeft') { event.preventDefault(); displayImage(imageIndex - 1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); displayImage(imageIndex + 1); }
    if (event.key === 'Tab') {
        const buttons = Array.from(lightbox.querySelectorAll('button')).filter(button => !button.hidden);
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
});

/* ---------- Отзывы: карусель ---------- */

document.querySelectorAll('[data-review-carousel]').forEach(reviewsCarousel => {
    const slides = Array.from(reviewsCarousel.querySelectorAll('.review-slide'));
    const counter = reviewsCarousel.querySelector('.review-counter');
    const track = reviewsCarousel.querySelector('.reviews-track, .screenshot-slides');
    if (!track || !slides.length) return;
    reviewsCarousel.classList.add('reviews-scroll-ready');
    let reviewIndex = 0;
    let autoplayTimer = null;

    const showReview = next => {
        reviewIndex = (next + slides.length) % slides.length;
        slides.forEach((slide, index) => slide.classList.toggle('is-active', index === reviewIndex));
        counter.textContent = `${reviewIndex + 1} / ${slides.length}`;
        track.scrollTo({ left: slides[reviewIndex].offsetLeft - slides[0].offsetLeft, behavior: reduced ? 'instant' : 'smooth' });
    };

    reviewsCarousel.querySelector('[data-review-prev]')?.addEventListener('click', () => showReview(reviewIndex - 1));
    reviewsCarousel.querySelector('[data-review-next]')?.addEventListener('click', () => showReview(reviewIndex + 1));

    reviewsCarousel.addEventListener('keydown', event => {
        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            showReview(reviewIndex - 1);
        }

        if (event.key === 'ArrowRight') {
            event.preventDefault();
            showReview(reviewIndex + 1);
        }
    });

    let settleTimer;
    let touching = false;
    const settle = () => {
        clearTimeout(settleTimer);
        settleTimer = setTimeout(() => {
            if (touching) return;
            const left = slides[reviewIndex].offsetLeft - slides[0].offsetLeft;
            if (Math.abs(track.scrollLeft - left) > 1) {
                track.scrollTo({ left, behavior: reduced ? 'instant' : 'smooth' });
            }
        }, 160);
    };
    track.addEventListener('pointerdown', () => { touching = true; });
    ['pointerup', 'pointercancel'].forEach(type => track.addEventListener(type, () => {
        touching = false;
        settle();
    }));
    // Native touch scrolling follows the finger and retains momentum on phones.
    track.addEventListener('scroll', () => {
        settle();
        const index = Math.max(0, Math.min(slides.length - 1, Math.round(track.scrollLeft / track.clientWidth)));
        if (index === reviewIndex) return;
        reviewIndex = index;
        slides.forEach((slide, i) => slide.classList.toggle('is-active', i === index));
        counter.textContent = `${index + 1} / ${slides.length}`;
    }, { passive: true });
    new ResizeObserver(() => {
        track.scrollTo({ left: slides[reviewIndex].offsetLeft - slides[0].offsetLeft, behavior: 'instant' });
    }).observe(track);

    /* Автопрокрутка отключена для тех, кто предпочитает меньше анимации */
    if (!reduced && slides.length > 1 && reviewsCarousel.dataset.autoplay !== 'false') {
        autoplayTimer = setInterval(() => { if (!lightbox?.classList.contains('open')) showReview(reviewIndex + 1); }, 12000);

        ['pointerdown', 'focusin'].forEach(eventType => {
            reviewsCarousel.addEventListener(eventType, () => {
                clearInterval(autoplayTimer);
                autoplayTimer = null;
            }, { once: true });
        });
    }
});

/* ---------- Быстрая связь и кнопка «Наверх» ---------- */
const quickContact = document.querySelector('.quick-contact');
const quickToggle = quickContact?.querySelector('.quick-toggle');
const quickOptions = quickContact?.querySelector('.quick-options');
const setQuickOpen = open => {
    if (!quickToggle || !quickOptions) return;
    quickOptions.hidden = !open;
    quickContact.closest('.floating-tools')?.classList.toggle('contact-open', open);
    quickToggle.setAttribute('aria-expanded', String(open));
    quickToggle.setAttribute('aria-label', open ? 'Закрыть способы связи' : 'Выбрать способ связи');
};
quickToggle?.addEventListener('click', () => setQuickOpen(quickOptions.hidden));
document.addEventListener('click', event => {
    if (quickContact && !quickContact.contains(event.target)) setQuickOpen(false);
});
quickOptions?.addEventListener('click', event => {
    if (event.target.closest('a')) { setQuickOpen(false); quickToggle.focus(); }
});
document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && quickOptions && !quickOptions.hidden) {
        setQuickOpen(false);
        quickToggle.focus();
    }
});
const backToTop = document.querySelector('.back-to-top');
const syncBackToTop = () => { if (backToTop) backToTop.hidden = window.scrollY < 600; };
window.addEventListener('scroll', syncBackToTop, { passive: true });
syncBackToTop();
backToTop?.addEventListener('click', () => {
    setQuickOpen(false);
    window.scrollTo({ top: 0, behavior: reduced ? 'instant' : 'smooth' });
    // После возврата кнопка скрывается, поэтому переносим фокус на логотип.
    document.querySelector('.header .brand')?.focus({ preventScroll: true });
});

/* ---------- Просмотр проекта с миниатюрами ---------- */
document.querySelectorAll('[data-project-viewer]').forEach(viewer => {
    const thumbs = Array.from(viewer.querySelectorAll('[data-gallery-thumb]'));
    const image = viewer.querySelector('.project-current-image');
    const counter = viewer.querySelector('[data-gallery-counter]');
    const strip = viewer.querySelector('.project-thumbnails');
    const stage = viewer.querySelector('.project-stage');
    if (!thumbs.length || !image) return;
    const syncPhotoBounds = () => {
        const width = Number(image.getAttribute('width')) || image.naturalWidth;
        const height = Number(image.getAttribute('height')) || image.naturalHeight;
        if (!width || !height) return;
        const imageButton = viewer.querySelector('.project-stage-image');
        const imageStyle = getComputedStyle(imageButton);
        const availableWidth = stage.clientWidth - parseFloat(imageStyle.paddingLeft) - parseFloat(imageStyle.paddingRight);
        const scale = Math.min(availableWidth / width, stage.clientHeight / height);
        stage.style.setProperty('--display-width', `${width * scale}px`);
        stage.style.setProperty('--display-height', `${height * scale}px`);
    };
    image.addEventListener('load', syncPhotoBounds);
    window.addEventListener('resize', syncPhotoBounds);
    if ('ResizeObserver' in window) new ResizeObserver(syncPhotoBounds).observe(stage);
    syncPhotoBounds();
    let current = Math.min(Number(viewer.dataset.initialPhoto ?? 1), thumbs.length - 1);
    const show = index => {
        current = (index + thumbs.length) % thumbs.length;
        const source = thumbs[current].querySelector('img');
        const width = Number(source.getAttribute('width')) || source.naturalWidth;
        const height = Number(source.getAttribute('height')) || source.naturalHeight;
        if (width && height) {
            image.width = width;
            image.height = height;
        }
        image.src = source.src;
        image.alt = source.alt;
        syncPhotoBounds();
        thumbs.forEach((thumb, i) => {
            thumb.classList.toggle('is-active', i === current);
            thumb.setAttribute('aria-pressed', String(i === current));
        });
        counter.textContent = `${current + 1} из ${thumbs.length}`;
        const horizontal = getComputedStyle(strip).flexDirection === 'row';
        strip.scrollTo({
            left: horizontal ? thumbs[current].getBoundingClientRect().left - strip.getBoundingClientRect().left + strip.scrollLeft - (strip.clientWidth - thumbs[current].offsetWidth) / 2 : 0,
            top: horizontal ? 0 : thumbs[current].getBoundingClientRect().top - strip.getBoundingClientRect().top + strip.scrollTop - (strip.clientHeight - thumbs[current].offsetHeight) / 2,
            behavior: reduced ? 'instant' : 'smooth'
        });
    };
    thumbs.forEach((thumb, index) => thumb.addEventListener('click', () => show(index)));
    viewer.querySelector('[data-gallery-prev]')?.addEventListener('click', () => show(current - 1));
    viewer.querySelector('[data-gallery-next]')?.addEventListener('click', () => show(current + 1));
    viewer.querySelectorAll('[data-gallery-open]').forEach(button => button.addEventListener('click', () => openImageViewer(thumbs, current, button)));
    document.querySelector('[data-hero-open]')?.addEventListener('click', event => openImageViewer(thumbs, 0, event.currentTarget));
    viewer.addEventListener('keydown', event => {
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
            event.preventDefault();
            show(current + (['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1));
        }
    });
    lightbox?.addEventListener('viewer-close', event => {
        if (event.detail.items === thumbs) show(event.detail.index);
    });
    let start = null;
    let swiped = false;
    stage.addEventListener('pointerdown', event => {
        swiped = false;
        start = event.pointerType === 'touch' ? { x: event.clientX, y: event.clientY } : null;
    });
    stage.addEventListener('pointercancel', () => { start = null; });
    stage.addEventListener('pointerup', event => {
        if (!start) return;
        const dx = event.clientX - start.x, dy = event.clientY - start.y;
        start = null;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
            swiped = true;
            show(current + (dx < 0 ? 1 : -1));
        }
    });
    stage.addEventListener('click', event => {
        if (!swiped) return;
        swiped = false;
        event.preventDefault();
        event.stopImmediatePropagation();
    }, true);
});


/* ---------- Homepage project coverflow ---------- */
document.querySelectorAll('[data-coverflow]').forEach(carousel => {
    const stage = carousel.querySelector('.coverflow-stage');
    const cards = Array.from(stage.querySelectorAll('.coverflow-card'));
    if (cards.length < 3) return;
    const counter = carousel.querySelector('[data-coverflow-counter]');
    const status = carousel.querySelector('[data-coverflow-status]');
    let current = 0;
    const render = (offset = 0) => {
        cards.forEach((card, i) => {
            let slot = ((i - current + cards.length * 1.5) % cards.length) - cards.length / 2;
            // Place the incoming outer card on the side of the gesture.
            if (slot === -cards.length / 2 && offset < 0) slot += cards.length;
            slot += offset;
            const distance = Math.abs(slot);
            const depth = Math.min(distance, 1);
            card.style.top = '0px';
            card.style.transform = `translateX(calc(-50% + var(--cover-offset) * ${slot})) translateY(${20 * depth}px) translateZ(${-100 * depth}px) rotateY(${12 * Math.max(-1, Math.min(1, slot))}deg) scale(${1 - .1 * depth})`;
            card.style.opacity = String(Math.max(0, Math.min(1, 2 - distance)));
            card.style.visibility = distance < 2 ? 'visible' : 'hidden';
            card.style.zIndex = String(Math.round((3 - Math.min(distance, 2)) * 100));
        });
    };
    function show(index) {
        current = (index + cards.length) % cards.length;
        cards.forEach((card, i) => {
            const position = i === current ? 'active' : i === (current + cards.length - 1) % cards.length ? 'prev' : i === (current + 1) % cards.length ? 'next' : 'hidden';
            if (position === 'hidden' && card.contains(document.activeElement)) stage.focus({ preventScroll: true });
            card.dataset.position = position;
            card.inert = position === 'hidden';
            card.setAttribute('aria-hidden', String(position === 'hidden'));
        });
        counter.textContent = `${String(current + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`;
        status.textContent = `${current + 1} из ${cards.length}: ${cards[current].querySelector('h3').textContent}`;
        render();
    }
    carousel.querySelector('[data-coverflow-prev]').addEventListener('click', () => show(current - 1));
    carousel.querySelector('[data-coverflow-next]').addEventListener('click', () => show(current + 1));
    carousel.addEventListener('keydown', event => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        show(current + (event.key === 'ArrowRight' ? 1 : -1));
    });
    let start = null;
    let suppressClick = false;
    let wheelDelta = 0;
    let wheelTime = 0;
    let wheelChangedAt = -Infinity;
    stage.addEventListener('wheel', event => {
        // Preserve browser zoom and let touch gestures finish independently.
        if (event.ctrlKey || start || !event.deltaX && !event.deltaY) return;
        event.preventDefault();
        const now = performance.now();
        const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? stage.clientWidth : 1;
        const delta = (Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY) * unit;
        if (now - wheelTime > 180 || Math.sign(delta) !== Math.sign(wheelDelta)) wheelDelta = 0;
        wheelTime = now;
        // A trackpad's momentum must not race through several projects.
        if (now - wheelChangedAt < (reduced ? 200 : 700)) {
            wheelDelta = 0;
            return;
        }
        wheelDelta += delta;
        if (Math.abs(wheelDelta) < 40) return;
        show(current + Math.sign(wheelDelta));
        wheelDelta = 0;
        wheelChangedAt = now;
    }, { passive: false });
    stage.addEventListener('pointerdown', event => {
        if (!event.isPrimary || event.button !== 0 || start) return;
        suppressClick = false;
        start = { x: event.clientX, y: event.clientY, id: event.pointerId, dragging: false };
    });
    stage.addEventListener('pointermove', event => {
        if (!start || event.pointerId !== start.id) return;
        const dx = event.clientX - start.x, dy = event.clientY - start.y;
        if (!start.dragging) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) < 6) return;
            if (Math.abs(dy) > Math.abs(dx)) { start = null; return; }
            start.dragging = true;
            suppressClick = true;
            stage.setPointerCapture(event.pointerId);
            stage.classList.add('is-dragging');
        }
        const card = cards[current];
        const offset = parseFloat(getComputedStyle(carousel).getPropertyValue('--cover-offset')) / 100;
        const step = Math.max(1, card.offsetWidth * offset);
        // Rebase the gesture after every full card, keeping the mouse captured.
        // The remaining distance continues to move the next card immediately.
        const passed = Math.trunc(dx / step);
        if (passed) {
            start.x += passed * step;
            show(current - passed % cards.length);
        }
        render((event.clientX - start.x) / step);
    });
    const finishDrag = event => {
        if (!start || event.pointerId !== start.id) return;
        const gesture = start;
        const dx = event.clientX - gesture.x;
        start = null;
        stage.classList.remove('is-dragging');
        if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
        if (gesture.dragging && event.type === 'pointerup' && Math.abs(dx) >= Math.min(70, stage.clientWidth * .12)) {
            show(current + (dx < 0 ? 1 : -1));
        } else render();
    };
    stage.addEventListener('pointerup', finishDrag);
    stage.addEventListener('pointercancel', finishDrag);
    stage.addEventListener('lostpointercapture', event => {
        // Touch starts with implicit capture on the image/link. Its loss bubbles
        // when capture moves to the stage; only the stage losing capture ends a drag.
        if (event.target === stage) finishDrag(event);
    });
    stage.addEventListener('pointerleave', event => {
        if (start && !start.dragging) finishDrag(event);
    });
    stage.addEventListener('click', event => {
        if (!suppressClick) return;
        event.preventDefault();
        event.stopPropagation();
        suppressClick = false;
    }, true);
    stage.addEventListener('dragstart', event => event.preventDefault());
    show(0);
    carousel.classList.add('is-ready');
    carousel.querySelector('.coverflow-controls').hidden = false;
});


/* Reserve the actual sticky navigation and mobile contact bar heights. */
(() => {
    const section = document.querySelector('.home-projects');
    if (!section) return;
    const header = document.querySelector('.header');
    const mobileBar = document.querySelector('.mobile-bar');
    const update = () => {
        section.style.setProperty('--projects-header-height', `${header?.getBoundingClientRect().height || 0}px`);
        section.style.setProperty('--projects-mobile-bar-height', `${mobileBar?.getBoundingClientRect().height || 0}px`);
    };
    const observer = new ResizeObserver(update);
    [header, mobileBar].filter(Boolean).forEach(element => observer.observe(element));
    update();
})();

/* ---------- First-screen slideshow ---------- */
document.querySelectorAll('[data-hero-slideshow]').forEach(carousel => {
    const slides = Array.from(carousel.querySelectorAll('.hero-slide'));
    const count = carousel.querySelector('[data-hero-count]');
    const backdrop = document.querySelector('.hero-backdrop');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let current = 0;
    let paused = motion.matches;
    let timer;
    const stop = () => window.clearTimeout(timer);
    const schedule = () => {
        stop();
        if (!paused && !document.hidden && !carousel.matches(':hover') && !carousel.contains(document.activeElement)) {
            timer = window.setTimeout(() => show(current + 1), 6500);
        }
    };
    const show = async index => {
        stop();
        current = (index + slides.length) % slides.length;
        const target = current;
        const next = slides[target];
        next.loading = 'eager';
        try { await next.decode(); } catch { /* Keep navigation available if an image cannot decode. */ }
        if (current !== target) return;
        slides.forEach((slide, i) => {
            slide.classList.toggle('is-active', i === current);
            slide.setAttribute('aria-hidden', String(i !== current));
        });
        count.textContent = `${String(current + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
        const title = carousel.querySelector('[data-hero-title]');
        if (title) {
            title.textContent = next.dataset.projectTitle;
            title.href = next.dataset.projectUrl;
        }
        if (backdrop) backdrop.src = next.src;
        schedule();
    };
    carousel.querySelector('[data-hero-prev]').addEventListener('click', () => show(current - 1));
    carousel.querySelector('[data-hero-next]').addEventListener('click', () => show(current + 1));
    carousel.addEventListener('mouseenter', stop);
    carousel.addEventListener('mouseleave', schedule);
    carousel.addEventListener('focusin', stop);
    carousel.addEventListener('focusout', () => window.setTimeout(schedule, 0));
    carousel.addEventListener('keydown', event => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        show(current + (event.key === 'ArrowRight' ? 1 : -1));
    });
    document.addEventListener('visibilitychange', schedule);
    motion.addEventListener('change', () => { paused = motion.matches; schedule(); });
    carousel.querySelector('.hero-slide-controls').hidden = false;
    schedule();
});

/* Continuous, slow homepage slideshow without pointer-triggered pauses. */
document.querySelectorAll('[data-hero-ambient]').forEach(figure => {
    const frames = Array.from(figure.querySelectorAll('.ambient-frame'));
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    frames[0]?.classList.add('is-zooming');
    let current = 0;
    let timer;
    const schedule = () => {
        clearTimeout(timer);
        if (!document.hidden && !motion.matches && frames.length > 1) {
            timer = setTimeout(advance, 5000);
        }
    };
    const advance = async () => {
        const next = (current + 1) % frames.length;
        const frame = frames[next];
        frame.loading = 'eager';
        try { await frame.decode(); } catch { schedule(); return; }
        if (document.hidden || motion.matches) { schedule(); return; }
        const outgoing = frames[current];
        outgoing.classList.remove('is-active');
        outgoing.setAttribute('aria-hidden', 'true');
        setTimeout(() => outgoing.classList.remove('is-zooming'), 2500);
        frame.classList.add('is-zooming', 'is-active');
        frame.removeAttribute('aria-hidden');
        current = next;
        schedule();
    };
    document.addEventListener('visibilitychange', schedule);
    motion.addEventListener('change', schedule);
    schedule();
});

/* ---------- Cinematic entrances, once per element ---------- */
(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motion.matches || !('IntersectionObserver' in window) || !Element.prototype.animate) return;
    const main = document.querySelector('main');
    if (!main) return;
    const ease = 'cubic-bezier(.22,.61,.36,1)';
    const headings = new Map();
    const animations = new Set();
    const completed = new WeakSet();
    const play = (element, frames, duration, delay = 0) => {
        const animation = element.animate(frames, { duration, delay, easing: ease, fill: 'both' });
        animations.add(animation);
        animation.finished.then(() => {
            animation.cancel();
            animations.delete(animation);
        }).catch(() => animations.delete(animation));
    };
    // Measure the actual font and available width; keep emphasis and explicit breaks.
    const splitLines = heading => {
        const original = headings.get(heading);
        heading.replaceChildren(...Array.from(original.childNodes, node => node.cloneNode(true)));
        const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
        const texts = [];
        while (walker.nextNode()) texts.push(walker.currentNode);
        texts.forEach(text => {
            const fragment = document.createDocumentFragment();
            text.textContent.split(/(\s+)/).filter(Boolean).forEach(part => {
                if (/^\s+$/.test(part)) fragment.append(document.createTextNode(part));
                else {
                    const word = document.createElement('span');
                    word.dataset.cinemaWord = '';
                    word.textContent = part;
                    fragment.append(word);
                }
            });
            text.replaceWith(fragment);
        });
        const rows = [];
        heading.querySelectorAll('[data-cinema-word]').forEach(word => {
            const top = word.getBoundingClientRect().top;
            let row = rows[rows.length - 1];
            if (!row || Math.abs(top - row.top) > parseFloat(getComputedStyle(heading).fontSize) * .5) {
                row = { top, words: [] }; rows.push(row);
            }
            let content = document.createTextNode(word.textContent);
            for (let parent = word.parentElement; parent && parent !== heading; parent = parent.parentElement) {
                const wrapper = parent.cloneNode(false);
                wrapper.removeAttribute('id');
                wrapper.append(content); content = wrapper;
            }
            row.words.push(content);
        });
        const accessible = original.cloneNode(true);
        accessible.querySelectorAll('br').forEach(br => br.replaceWith(' '));
        heading.setAttribute('aria-label', accessible.textContent.replace(/\s+/g, ' ').trim());
        heading.replaceChildren(...rows.map(row => {
            const mask = document.createElement('span'); mask.className = 'cinema-line'; mask.setAttribute('aria-hidden', 'true');
            const inner = document.createElement('span'); inner.className = 'cinema-line-inner';
            row.words.forEach((word, index) => { if (index) inner.append(' '); inner.append(word); });
            mask.append(inner); return mask;
        }));
    };
    const headingEntrance = (heading, delay = 0) => {
        // Filtered portfolio cards need measurement after becoming visible.
        if (headings.has(heading)) splitLines(heading);
        heading.querySelectorAll('.cinema-line-inner').forEach((line, index) => {
            play(line, [{ transform: 'translateY(115%)' }, { transform: 'translateY(0)' }], 1050, delay + index * 110);
        });
    };
    const textEntrance = (element, delay) => play(element, [
        { opacity: 0, filter: 'blur(4px)', translate: '0 18px' },
        { opacity: 1, filter: 'blur(0px)', translate: '0 0' }
    ], 820, delay);
    const elementEntrance = (element, delay = 0) => play(element, [
        { opacity: 0, translate: '0 18px' }, { opacity: 1, translate: '0 0' }
    ], 850, delay);
    const observer = new IntersectionObserver(entries => {
        entries.forEach(({ target, isIntersecting }) => {
            if (!isIntersecting || completed.has(target)) return;
            completed.add(target); observer.unobserve(target);
            const type = target.dataset.cinema;
            if (type === 'sequence') {
                target.querySelectorAll('h1, h2').forEach(h => headingEntrance(h));
                target.querySelectorAll('p').forEach((p, i) => textEntrance(p, 240 + i * 80));
                target.querySelectorAll('.hero-actions, .actions, .btn, .text-link, .hero-portfolio-link, .project-back, .project-gallery-link, .contact-link, .hours').forEach(el => {
                    if (!el.parentElement.closest('.hero-actions, .actions')) elementEntrance(el, 420);
                });
            } else if (type === 'heading') headingEntrance(target);
            else if (type === 'photo') {
                play(target, [{ opacity: 0 }, { opacity: 1 }], 1100);
                // Slideshow frames already have their continuous cinematic movement.
                if (!target.matches('[data-hero-ambient]')) {
                    target.querySelectorAll('img').forEach(img => play(img, [
                        { scale: '1.06', opacity: 0 }, { scale: '1', opacity: 1 }
                    ], 1250));
                }
            } else elementEntrance(target, Number(target.dataset.cinemaDelay || 0));
        });
    }, { threshold: .08, rootMargin: '0px 0px -4% 0px' });
    const register = (element, type, delay = 0) => {
        if (element.dataset.cinema) return;
        element.dataset.cinema = type; element.dataset.cinemaDelay = delay;
        observer.observe(element);
    };
    const init = () => {
        if (motion.matches) return;
        main.querySelectorAll('h1, h2').forEach(h => {
            if (!h.textContent.trim()) return;
            headings.set(h, h.cloneNode(true)); splitLines(h);
        });
        main.querySelectorAll('.hero-copy, .page-hero-copy, .section-head, .statement-copy, .principle-copy, .journal-heading, .cta-band, .project-story-copy, .portfolio-intro, .contact-panel, .project-viewer-heading').forEach(el => register(el, 'sequence'));
        headings.forEach((_, h) => { if (!h.closest('[data-cinema="sequence"]')) register(h, 'heading'); });
        main.querySelectorAll('.service-grid, .project-packages, .service-extras, .process-grid, .include-grid').forEach(grid => {
            Array.from(grid.children).forEach((card, i) => register(card, 'element', i * 100));
        });
        main.querySelectorAll('.services-finale').forEach(el => register(el, 'element', 150));
        main.querySelectorAll('.hero-figure, .page-hero-figure, .statement-media, .principle-photo, .portfolio-cover, .project-images > *, .project-story-image').forEach(el => register(el, 'photo'));
        // Observe metadata separately: it can enter the viewport after the hero title.
        main.querySelectorAll('.hero-meta > span, .project-stage, .project-thumb-rail, .filters, .project-results, .portfolio-more, .journal-signature').forEach((el, i) => register(el, 'element', (i % 2) * 100));
        main.querySelectorAll('.reveal').forEach(el => {
            if (!el.dataset.cinema && !el.querySelector('[data-cinema]') && !el.closest('[data-cinema]')) register(el, 'element');
        });
        // Cover text outside the named compositions, without animating nested content twice.
        main.querySelectorAll('p, h3, h4, ul, ol, dl, .actions, .text-link, .portfolio-caption, .project-navigation, .project-nav, .project-next, .project-prev, .project-gallery-link, .btn').forEach(el => {
            if (!el.closest('[data-cinema]') && !el.querySelector('[data-cinema]')) register(el, 'element');
        });
        document.querySelectorAll('.footer-grid > *, .footer-bottom, .footer-wordmark').forEach(el => register(el, 'element'));
    };
    Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 800))]).then(init);
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => headings.forEach((_, h) => splitLines(h)), 180);
    });
    motion.addEventListener('change', () => {
        if (!motion.matches) return;
        observer.disconnect(); animations.forEach(animation => animation.cancel()); animations.clear();
        headings.forEach((original, heading) => {
            heading.replaceChildren(...Array.from(original.childNodes, node => node.cloneNode(true)));
            heading.removeAttribute('aria-label');
        });
        headings.clear();
    });
})();
/* Keep one live carousel, relocating it below the hero heading on phones. */
(() => {
    const carousel = document.querySelector('.home-projects [data-coverflow]');
    const heading = document.querySelector('.hero-copy h1');
    if (!carousel || !heading) return;
    const origin = document.createComment('Portfolio carousel position');
    carousel.before(origin);
    const slot = document.createElement('div');
    slot.className = 'home-projects mobile-hero-gallery';
    heading.after(slot);
    const mobile = window.matchMedia('(max-width: 600px)');
    const relocate = () => {
        if (mobile.matches) slot.append(carousel);
        else origin.after(carousel);
    };
    mobile.addEventListener('change', relocate);
    relocate();
})();

/* Дипломы: стрелки, клавиатура и нативный свайп */
(() => {
    const track = document.querySelector('.about-credentials');
    if (!track) return;
    const controls = track.parentElement.querySelector('.credentials-controls');
    const prev = controls?.querySelector('[data-credentials-prev]');
    const next = controls?.querySelector('[data-credentials-next]');
    if (!prev || !next) return;
    controls.hidden = false;
    const update = () => {
        prev.disabled = track.scrollLeft <= 2;
        next.disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
    };
    const step = direction => {
        const card = track.querySelector('.credential-card');
        const gap = parseFloat(getComputedStyle(track).gap) || 0;
        track.scrollBy({ left: direction * (card.getBoundingClientRect().width + gap), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    };
    prev.addEventListener('click', () => step(-1));
    next.addEventListener('click', () => step(1));
    track.addEventListener('scroll', update, { passive: true });
    track.addEventListener('keydown', event => {
        if (event.target !== track) return;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault();
            step(event.key === 'ArrowRight' ? 1 : -1);
        }
    });
    // Touch uses native scrolling with momentum; mouse and pen follow the pointer.
    let drag = null;
    let suppressClick = false;
    track.addEventListener('pointerdown', event => {
        suppressClick = false;
        if (event.pointerType === 'touch' || event.button !== 0) return;
        drag = { id: event.pointerId, x: event.clientX, y: event.clientY, left: track.scrollLeft, lastX: event.clientX, time: performance.now(), velocity: 0, active: false };
    });
    track.addEventListener('pointermove', event => {
        if (!drag || event.pointerId !== drag.id) return;
        const dx = event.clientX - drag.x;
        if (!drag.active) {
            if (Math.abs(dx) < 6) return;
            if (Math.abs(event.clientY - drag.y) > Math.abs(dx)) { drag = null; return; }
            drag.active = true;
            track.classList.add('is-dragging');
            track.setPointerCapture(event.pointerId);
        }
        event.preventDefault();
        const now = performance.now();
        drag.velocity = (drag.lastX - event.clientX) / Math.max(1, now - drag.time);
        drag.lastX = event.clientX;
        drag.time = now;
        track.scrollLeft = drag.left - dx;
    });
    const finish = event => {
        if (!drag || event.pointerId !== drag.id) return;
        const gesture = drag;
        drag = null;
        track.classList.remove('is-dragging');
        if (!gesture.active) return;
        suppressClick = true;
        if (track.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId);
        const card = track.querySelector('.credential-card');
        const gap = parseFloat(getComputedStyle(track).gap) || 0;
        const stride = card.getBoundingClientRect().width + gap;
        const momentum = event.type === 'pointerup' && performance.now() - gesture.time < 100 ? Math.max(-stride, Math.min(stride, gesture.velocity * 160)) : 0;
        const destination = Math.round((track.scrollLeft + momentum) / stride) * stride;
        track.scrollTo({ left: Math.max(0, Math.min(track.scrollWidth - track.clientWidth, destination)), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    };
    track.addEventListener('pointerup', finish);
    track.addEventListener('pointercancel', finish);
    track.addEventListener('lostpointercapture', finish);
    window.addEventListener('pointerup', finish);
    track.addEventListener('click', event => {
        if (!suppressClick || event.detail === 0) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        suppressClick = false;
    }, true);
    track.addEventListener('dragstart', event => event.preventDefault());
    new ResizeObserver(update).observe(track);
    update();
})();
