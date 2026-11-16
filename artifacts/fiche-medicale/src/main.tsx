import { createRoot } from "react-dom/client";
import { setBaseUrl, setCsrfTokenGetter } from "@workspace/api-client-react";
import App from "./App";
import { API_BASE_URL } from "./lib/api";
import { getOwnerCsrfToken } from "./lib/owner-session";
import "./index.css";

setBaseUrl(API_BASE_URL || null);
setCsrfTokenGetter(getOwnerCsrfToken);

createRoot(document.getElementById("root")!).render(<App />);
