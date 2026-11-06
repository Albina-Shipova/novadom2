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
});

nav?.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));

window.addEventListener('resize', () => {
    if (window.innerWidth > 980) {
        closeMenu();
    }
});

/* ---------- Год в подвале ---------- */

document.querySelectorAll('[data-year]').forEach(el => {
    el.textContent = new Date().getFullYear();
});

/* ---------- Появление при скролле ---------- */

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const reveals = document.querySelectorAll('.reveal');

if (reduced || !('IntersectionObserver' in window)) {
    reveals.forEach(el => el.classList.add('visible'));
} else {
    const groups = ['.service-grid', '.process-grid', '.principles', '.project-images', '.include-grid'];

    groups.forEach(selector => {
        document.querySelectorAll(selector).forEach(group => {
            group.querySelectorAll(':scope > .reveal').forEach((el, index) => {
                el.style.transitionDelay = `${Math.min(index, 4) * 70}ms`;
            });
        });
    });

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0, rootMargin: '0px 0px -6% 0px' });

    reveals.forEach(el => observer.observe(el));
}

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
const projectTiles = document.querySelectorAll('.portfolio-tile');

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
        projectTiles.forEach(item => { item.hidden = value !== 'all' && item.dataset.category !== value; });
        const status = document.querySelector('.project-results');
        if (status) status.textContent = `Показано проектов: ${Array.from(projectTiles).filter(item => !item.hidden).length}`;
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

const displayImage = index => {
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
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('lightbox-open');
    inertElements.forEach(element => { element.inert = false; });
    inertElements = [];
    lastFocus?.focus();
};

viewerItems.forEach(item => {
    if (item.tagName !== 'BUTTON') {
        item.tabIndex = 0;
        item.setAttribute('role', 'button');
        item.setAttribute('aria-label', `Рассмотреть: ${item.querySelector('img')?.alt}`);
    }
    const open = () => {
        if (!lightbox || !lightboxImage) return;
        lastFocus = item;
        // Отзывы и документы можно листать независимо от галереи проекта.
        const group = item.closest('.gallery, .screenshot-carousel, .credentials-grid');
        viewerGroup = group ? Array.from(group.querySelectorAll('[data-viewer]')) : [item];
        displayImage(viewerGroup.indexOf(item));
        lightbox.classList.add('open');
        lightbox.setAttribute('aria-hidden', 'false');
        document.body.classList.add('lightbox-open');
        inertElements = Array.from(document.body.children).filter(el => el !== lightbox && !el.inert && el.tagName !== 'SCRIPT');
        inertElements.forEach(element => { element.inert = true; });
        lightbox.querySelector('.lightbox-close').focus();
    };
    item.addEventListener('click', open);
    if (item.tagName !== 'BUTTON') item.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); }
    });
});
lightbox?.querySelector('.lightbox-close')?.addEventListener('click', closeLightbox);
lightbox?.querySelector('.lightbox-prev')?.addEventListener('click', () => displayImage(imageIndex - 1));
lightbox?.querySelector('.lightbox-next')?.addEventListener('click', () => displayImage(imageIndex + 1));
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
    let reviewIndex = 0;
    let autoplayTimer = null;

    const showReview = next => {
        reviewIndex = (next + slides.length) % slides.length;
        slides.forEach((slide, index) => slide.classList.toggle('is-active', index === reviewIndex));
        counter.textContent = `${reviewIndex + 1} / ${slides.length}`;
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

    let startX = 0;

    reviewsCarousel.addEventListener('pointerdown', event => {
        startX = event.clientX;
    });

    reviewsCarousel.addEventListener('pointerup', event => {
        const delta = event.clientX - startX;

        if (Math.abs(delta) > 42) {
            showReview(reviewIndex + (delta < 0 ? 1 : -1));
        }
    });

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
