import './styles/main.css';
import { App } from './core/App.js';

const app = new App(document.getElementById('gl'));
app.start();

// Small debug/QA handle (harmless in production, useful for e2e checks).
window.__PHOTO_WALL__ = { app };
