import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

import { AuthProvider } from "./context/AuthContext";
import { SocialProvider } from "./context/SocialContext";
import { ChallengeProvider } from "./context/ChallengeContext";
import { ToastProvider } from "./context/ToastContext";
import { GgpoProvider } from "./ggpo/context/GgpoContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <SocialProvider>
        <ChallengeProvider>
          <ToastProvider>
            <GgpoProvider>
              <App />
            </GgpoProvider>
          </ToastProvider>
        </ChallengeProvider>
      </SocialProvider>
    </AuthProvider>
  </StrictMode>,
);
