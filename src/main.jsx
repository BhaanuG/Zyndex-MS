import { createRoot } from "react-dom/client";
import App from "./app/App.jsx";
import "./styles/index.css";

// Force favicon update dynamically across all browsers / tabs
try {
  const updateFavicons = () => {
    const iconUrl = `/favicon.svg?v=${Date.now()}`;
    let link = document.querySelector("link[rel*='icon']");
    if (!link) {
      link = document.createElement('link');
      link.type = 'image/svg+xml';
      link.rel = 'icon';
      document.getElementsByTagName('head')[0].appendChild(link);
    }
    link.href = iconUrl;
  };
  updateFavicons();
} catch (e) {
  console.error("Favicon set error:", e);
}

createRoot(document.getElementById("root")).render(<App />);
