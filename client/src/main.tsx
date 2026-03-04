import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

import { AuthProvider } from "./context/AuthContext";
import { SocialProvider } from "./context/SocialContext";
import { ChallengeProvider } from "./context/ChallengeContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <SocialProvider>
        <ChallengeProvider>
          <App />
        </ChallengeProvider>
      </SocialProvider>
    </AuthProvider>
  </StrictMode>,
);
