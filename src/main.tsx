import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Registra o Service Worker assim que a página carrega
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => console.log("✅ SW registrado:", reg))
      .catch((err) => console.error("❌ Erro no SW:", err));
  });
}

createRoot(document.getElementById("root")!).render(<App />);