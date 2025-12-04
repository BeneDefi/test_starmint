import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

console.log('✅ main.tsx loaded, React root mounted');

window.addEventListener('load', () => {
  const canvas = document.createElement('canvas');
  canvas.width = 200;
  canvas.height = 200;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = 'blue';
    ctx.fillRect(10, 10, 100, 100);
    console.log('✅ Canvas smoke test successful');
  } else {
    console.error('❌ Canvas context creation failed');
  }
});
