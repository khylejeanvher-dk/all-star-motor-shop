// slideshow.js — Hero slideshow logic


const slides = document.querySelectorAll('.slide');
const dots = document.querySelectorAll('.dot');
const prevBtn = document.getElementById('slidePrev');
const nextBtn = document.getElementById('slideNext');
const slidesWrapper = document.getElementById('slidesWrapper');

let current = 0;
let autoTimer = null;

function goTo(index) {
  slides[current].classList.remove('active');
  dots[current].classList.remove('active');
  current = (index + slides.length) % slides.length;
  slides[current].classList.add('active');
  dots[current].classList.add('active');
}

function startAuto() {
  autoTimer = setInterval(() => goTo(current + 1), 5000);
}

function resetAuto() {
  clearInterval(autoTimer);
  startAuto();
}

function initSlideshow() {
  prevBtn.addEventListener('click', () => { goTo(current - 1); resetAuto(); });
  nextBtn.addEventListener('click', () => { goTo(current + 1); resetAuto(); });

  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      goTo(+dot.dataset.index);
      resetAuto();
    });
  });

  // Touch swipe support
  let touchStartX = 0;
  slidesWrapper.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });

  slidesWrapper.addEventListener('touchend', e => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      goTo(diff > 0 ? current + 1 : current - 1);
      resetAuto();
    }
  });

  startAuto();
}

export { initSlideshow };
