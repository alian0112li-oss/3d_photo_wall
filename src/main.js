import './styles/main.css';
import { App } from './core/App.js';
import { Intro } from './intro/Intro.js';

const app = new App(document.getElementById('gl'));
app.start();

// Opening sequence: falling card deck -> FLIP viewport mask -> wall.
// Skipped for reduced-motion users (straight to the wall).
const introRoot = document.getElementById('intro');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let intro = null;
if (reduceMotion || !introRoot) {
  introRoot?.remove();
  app.enableInput();
} else {
  app.hideWall(); // cards stay hidden until the black cover lifts
  intro = new Intro({
    root: introRoot,
    ready: app.ready,
    onDone: () => {
      app.revealWall(); // photos pop in one by one at their positions
      app.enableInput();
    },
  });
  intro.play();
}

// Small debug/QA handle (harmless in production, useful for e2e checks).
window.__PHOTO_WALL__ = { app, intro };
