import { useEffect, useState, type ReactNode, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LockKeyhole, ShieldCheck, LoaderCircle } from "lucide-react";
import { apiUrl } from "@/lib/api";
import { setOwnerCsrfToken, getOwnerCsrfToken } from "@/lib/owner-session";

type AuthState = "checking" | "locked" | "ready" | "unreachable";
type SessionResponse = { authenticated: boolean; csrfToken?: string };

export default function OwnerGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>("checking");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    const controller = new AbortController();
    fetch(apiUrl("/api/auth/session"), { credentials: "include", cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (response.status === 401) { setState("locked"); return; }
        if (!response.ok) { setState("unreachable"); return; }
        const result = (await response.json()) as SessionResponse;
        if (!result.authenticated || !result.csrfToken) { setState("locked"); return; }
        setOwnerCsrfToken(result.csrfToken);
        setState("ready");
      })
      .catch(() => { if (!controller.signal.aborted) setState("unreachable"); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const logout = async () => {
      try {
        await fetch(apiUrl("/api/auth/logout"), {
          method: "POST", credentials: "include", cache: "no-store",
          headers: { "X-SMT-CSRF": getOwnerCsrfToken() ?? "" },
        });
      } finally {
        queryClient.clear();
        setOwnerCsrfToken(null);
        setPassword("");
        setState("locked");
      }
    };
    const handler = () => { void logout(); };
    window.addEventListener("smt:logout", handler);
    return () => window.removeEventListener("smt:logout", handler);
  }, [queryClient]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !password) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(apiUrl("/api/auth/login"), {
        method: "POST", credentials: "include", cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) {
        setError(response.status === 429 ? "Trop de tentatives. Réessayez plus tard." :
          response.status === 503 ? "L'accès personnel n'est pas encore configuré sur le serveur." :
          "Mot de passe incorrect ou service indisponible.");
        return;
      }
      const session = (await response.json()) as SessionResponse;
      if (!session.authenticated || !session.csrfToken) throw new Error("Invalid session response");
      setOwnerCsrfToken(session.csrfToken);
      setPassword("");
      setState("ready");
    } catch {
      setError("Connexion au serveur impossible.");
    } finally {
      setBusy(false);
    }
  }

  if (state === "ready") return <>{children}</>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 px-5 py-8">
      <div className="w-full max-w-md bg-white/95 rounded-3xl shadow-2xl border border-white/20 p-8 sm:p-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-12 w-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Gestion SMT</h1>
            <p className="text-xs text-slate-500">Accès personnel sécurisé</p>
          </div>
        </div>
        {state === "checking" ? (
          <div className="flex items-center gap-2 text-sm text-slate-600" role="status">
            <LoaderCircle className="animate-spin h-4 w-4" /> Vérification de votre session…
          </div>
        ) : state === "unreachable" ? (
          <div role="alert" className="text-sm text-amber-800 bg-amber-50 border border-amber-200 p-4 rounded-xl">
            Serveur privé indisponible. L'aperçu de l'interface ne donne pas accès aux données médicales.
            <button type="button" className="block mt-3 underline" onClick={() => window.location.reload()}>Réessayer</button>
          </div>
        ) : (
          <form onSubmit={(event) => { void login(event); }} className="space-y-5">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Connexion</h2>
              <p className="text-sm text-slate-500 mt-1">Cette application est réservée à son propriétaire.</p>
            </div>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Mot de passe personnel</span>
              <div className="relative mt-2">
                <LockKeyhole className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <input autoComplete="current-password" autoFocus type="password" minLength={1} maxLength={256}
                  value={password} onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-10 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
              </div>
            </label>
            {error && <p role="alert" className="text-red-600 text-sm">{error}</p>}
            <button type="submit" disabled={busy} className="w-full rounded-xl bg-blue-600 text-white font-semibold py-3 hover:bg-blue-700 disabled:opacity-60 transition-colors">
              {busy ? "Vérification…" : "Accéder à mon espace"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
