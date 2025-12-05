import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Register service worker to enable PWA install and offline support
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
	window.addEventListener('load', () => {
		const swUrl = '/sw.js';
		navigator.serviceWorker
			.register(swUrl)
			.then((reg) => {
				// eslint-disable-next-line no-console
				console.log('Service worker registered:', reg.scope);
			})
			.catch((err) => {
				// eslint-disable-next-line no-console
				console.warn('Service worker registration failed:', err);
			});
	});
}
