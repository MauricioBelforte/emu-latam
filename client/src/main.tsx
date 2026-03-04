import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

import { AuthProvider } from "./context/AuthContext";
import { SocialProvider } from "./context/SocialContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <SocialProvider>
        <App />
      </SocialProvider>
    </AuthProvider>
  </StrictMode>,
);
