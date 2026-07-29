import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Wires the page scroll to the 3D scene — issue #2 (wheel listener):
 * scrolling down gradually sinks and rotates the wall (applied in
 * App.update from `state.scrollProgress`), fades the hero copy out,
 * dims the canvas and reveals the content sections.
 */
export function initScrollAnimation(app) {
  // main driver: raw progress consumed by the render loop
  ScrollTrigger.create({
    trigger: '#scroll-driver',
    start: 'top top',
    end: 'bottom top',
    onUpdate(self) {
      app.state.scrollProgress = self.progress;
      if (self.progress > 0.04) app.focus.release();
    },
  });

  // hero copy: fade & lift away over the first half viewport
  gsap.to('#hero .hero-inner', {
    opacity: 0,
    y: -70,
    ease: 'none',
    scrollTrigger: { start: 0, end: () => window.innerHeight * 0.55, scrub: true },
  });

  // scroll hint disappears immediately
  gsap.to('.scroll-hint', {
    opacity: 0,
    ease: 'none',
    scrollTrigger: { start: 0, end: () => window.innerHeight * 0.2, scrub: true },
  });

  // canvas dims near the end of the intro so content takes over
  gsap.to('#gl', {
    opacity: 0.12,
    ease: 'none',
    scrollTrigger: {
      start: () => window.innerHeight * 1.4,
      end: () => window.innerHeight * 2.4,
      scrub: true,
    },
  });

  // content sections reveal
  ScrollTrigger.batch('.reveal', {
    start: 'top 85%',
    once: true,
    onEnter: (batch) =>
      gsap.to(batch, { opacity: 1, y: 0, duration: 0.9, stagger: 0.12, ease: 'power3.out', overwrite: true }),
  });

  // header gets a glass background once scrolling starts
  const header = document.getElementById('site-header');
  ScrollTrigger.create({
    start: 40,
    onEnter: () => header.classList.add('scrolled'),
    onLeaveBack: () => header.classList.remove('scrolled'),
  });

  // hero CTA scrolls to the content
  document.getElementById('cta-explore')?.addEventListener('click', () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  });

  return ScrollTrigger;
}
