import { useRouter } from "@tanstack/react-router";
import { createContext, ReactNode, useCallback, useContext, useState } from "react";

export type Meldung = { t: "ok" | "fehler"; x: string } | null;
interface Ctx {
  msg: Meldung;
  setMsg: (m: Meldung) => void;
}

const MsgContext = createContext<Ctx>({ msg: null, setMsg: () => undefined });
export const useMsg = () => useContext(MsgContext);

export function MsgProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<Meldung>(null);
  return <MsgContext.Provider value={{ msg, setMsg }}>{children}</MsgContext.Provider>;
}

/**
 * Führt eine Aktion aus: Erfolgsmeldung bzw. Fehler als Hinweis anzeigen und danach die
 * Daten der Seite neu laden. Liefert true, wenn die Aktion erfolgreich war.
 */
export function useAktion() {
  const router = useRouter();
  const { setMsg } = useMsg();
  return useCallback(
    async (fn: () => Promise<string | void>): Promise<boolean> => {
      setMsg(null);
      let ok = true;
      try {
        const text = await fn();
        if (text) setMsg({ t: "ok", x: text });
      } catch (e) {
        ok = false;
        setMsg({ t: "fehler", x: (e as Error).message });
      }
      await router.invalidate();
      return ok;
    },
    [router, setMsg],
  );
}
