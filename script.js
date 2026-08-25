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
    if (menuButton) {
        menuButton.textContent = 'Меню';
    }
    document.body.classList.remove('menu-open');
};

menuButton?.addEventListener('click', () => {
    const open = !nav.classList.contains('open');
    nav.classList.toggle('open', open);
    menuButton.setAttribute('aria-expanded', String(open));
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
    });
});

/* ---------- Лайтбокс ---------- */

const lightbox = document.querySelector('.lightbox');
const lightboxImage = lightbox?.querySelector('img');
const lightboxCaption = lightbox?.querySelector('.lightbox-caption');

let lastFocus = null;

const closeLightbox = () => {
    if (!lightbox) {
        return;
    }

    lightbox.classList.remove('open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('lightbox-open');
    lastFocus?.focus();
};

galleryItems.forEach(item => {
    item.setAttribute('tabindex', '0');

    const open = () => {
        if (!lightbox || !lightboxImage) {
            return;
        }

        lastFocus = item;
        const image = item.querySelector('img');
        lightboxImage.src = image.src;
        lightboxImage.alt = image.alt;

        if (lightboxCaption) {
            const label = item.querySelector('figcaption span')?.textContent ?? '';
            const title = item.querySelector('figcaption b')?.textContent ?? '';
            lightboxCaption.textContent = '';
            if (label) {
                const tag = document.createElement('b');
                tag.textContent = label;
                lightboxCaption.append(tag);
            }
            lightboxCaption.append(title);
        }

        lightbox.classList.add('open');
        lightbox.setAttribute('aria-hidden', 'false');
        document.body.classList.add('lightbox-open');
        lightbox.querySelector('.lightbox-close')?.focus();
    };

    item.addEventListener('click', open);
    item.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            open();
        }
    });
});

lightbox?.querySelector('.lightbox-close')?.addEventListener('click', closeLightbox);

lightbox?.addEventListener('click', e => {
    if (e.target === lightbox) {
        closeLightbox();
    }
});

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        closeLightbox();
        closeMenu();
    }
});

/* ---------- Отзывы: карусель ---------- */

const reviewsCarousel = document.querySelector('.reviews-carousel');

if (reviewsCarousel) {
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
    if (!reduced && slides.length > 1) {
        autoplayTimer = setInterval(() => showReview(reviewIndex + 1), 7000);

        ['pointerdown', 'focusin'].forEach(eventType => {
            reviewsCarousel.addEventListener(eventType, () => {
                clearInterval(autoplayTimer);
                autoplayTimer = null;
            }, { once: true });
        });
    }
}
