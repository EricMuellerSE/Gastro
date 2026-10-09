import {
  createRootRoute,
  createRoute,
  createRouter,
  Link,
  Outlet,
  redirect,
  useNavigate,
  useRouter,
  useRouterState,
} from "@tanstack/react-router";
import { ReactElement, useEffect } from "react";
import { api } from "./api";
import { istRolle, Rolle, ROLLEN, TABS } from "./constants";
import { MsgProvider, useMsg } from "./store";
import { LoginSeite } from "./views/Login";
import { VIEWS } from "./views";

const ersterTab = (rolle: Rolle) => TABS[rolle][0][0];

/* ---------- Wurzel: stellt den Meldungs-Kontext bereit ---------- */
const rootRoute = createRootRoute({
  component: (): ReactElement => (
    <MsgProvider>
      <Outlet />
    </MsgProvider>
  ),
});

// "/" -> Ansicht der eigenen Rolle, ohne Anmeldung die Anmeldeseite
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: async () => {
    const { benutzer } = await api.ich();
    if (benutzer) throw redirect({ to: "/$rolle", params: { rolle: benutzer.rolle } });
    throw redirect({ to: "/login" });
  },
});

// "/login" (bereits angemeldet -> direkt zur eigenen Ansicht)
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "login",
  beforeLoad: async () => {
    const { benutzer } = await api.ich();
    if (benutzer) throw redirect({ to: "/$rolle", params: { rolle: benutzer.rolle } });
  },
  component: LoginSeite,
});

/* ---------- /$rolle: Kopf mit Ansichtsumschalter und Konto, Navigation, Hinweisfeld ---------- */
const rolleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "$rolle",
  beforeLoad: async ({ params }) => {
    if (!istRolle(params.rolle)) throw redirect({ to: "/" });
    const { benutzer } = await api.ich();
    // Die Kundenansicht (Tablet) ist ohne Anmeldung erreichbar, alle anderen Ansichten nur für die eigene Rolle
    if (params.rolle !== "kunde") {
      if (!benutzer) throw redirect({ to: "/login" });
      if (benutzer.rolle !== params.rolle)
        throw redirect({ to: "/$rolle", params: { rolle: benutzer.rolle } });
    }
    return { benutzer };
  },
  component: RolleLayout,
});

function RolleLayout(): ReactElement {
  const { rolle: roh } = rolleRoute.useParams();
  const rolle = roh as Rolle;
  const navigate = useNavigate();
  const router = useRouter();
  const { benutzer } = rolleRoute.useRouteContext();
  const { msg, setMsg } = useMsg();
  const pfad = useRouterState({ select: (s) => s.location.pathname });

  // Hinweis verschwindet beim Seitenwechsel
  useEffect(() => setMsg(null), [pfad, setMsg]);

  // Alle 5 Sekunden aktualisieren (nicht während ein Formular offen ist) – wie in der Vorlage
  // useEffect(() => {
  //   const t = setInterval(() => {
  //     const tab = router.state.location.pathname.split('/')[2];
  //     if (!document.querySelector('main form') && tab !== 'tablett' && tab !== 'eigene') void router.invalidate();
  //   }, 5000);
  //   return () => clearInterval(t);
  // }, [router]);

  const abmelden = async () => {
    await api.logout();
    await navigate({ to: "/$rolle", params: { rolle: "kunde" } }); // Tablet kehrt in die Kundenansicht zurück
    await router.invalidate();
  };
  // Angemeldete Mitarbeiter wechseln zwischen ihrer Rolle und der Kundenansicht; Gäste sehen nur die Kundenansicht
  const ansichten: Rolle[] = benutzer ? [benutzer.rolle, "kunde"] : [];

  return (
    <>
      <header>
        <div className="kopf">
          <h1>Restaurantverwaltung</h1>
          <div className="rechts">
            {ansichten.length > 0 && (
              <div id="rollen" role="group" aria-label="Ansicht wählen">
                {ansichten.map((r) => (
                  <button
                    key={r}
                    aria-pressed={r === rolle}
                    onClick={() => navigate({ to: "/$rolle", params: { rolle: r } })}
                  >
                    {ROLLEN[r]}
                  </button>
                ))}
              </div>
            )}
            <div id="konto">
              {benutzer ? (
                <>
                  <span className="name">Angemeldet: {benutzer.name}</span>
                  <button onClick={abmelden}>Abmelden</button>
                </>
              ) : (
                <button onClick={() => navigate({ to: "/login" })}>Login</button>
              )}
            </div>
          </div>
        </div>
      </header>
      <nav id="nav" aria-label="Bereiche">
        {TABS[rolle].map(([k, t]) => (
          <Link key={k} to="/$rolle/$tab" params={{ rolle, tab: k }}>
            {t}
          </Link>
        ))}
      </nav>
      <main id="main">
        {msg && (
          <p className={`hinweis ${msg.t}`} role="status">
            {msg.x}
          </p>
        )}
        <Outlet />
      </main>
    </>
  );
}

// "/admin" -> erster Reiter der Rolle
const rolleIndexRoute = createRoute({
  getParentRoute: () => rolleRoute,
  path: "/",
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/$rolle/$tab",
      params: { rolle: params.rolle, tab: ersterTab(params.rolle as Rolle) },
    });
  },
});

/* ---------- /$rolle/$tab: lädt die Daten der Ansicht per Loader ---------- */
const tabRoute = createRoute({
  getParentRoute: () => rolleRoute,
  path: "$tab",
  beforeLoad: ({ params }) => {
    if (!TABS[params.rolle as Rolle].some(([k]) => k === params.tab)) {
      throw redirect({ to: "/$rolle", params: { rolle: params.rolle } });
    }
  },
  loader: ({ params }) => VIEWS[params.tab].load(params.rolle as Rolle),
  component: TabSeite,
});

function TabSeite(): ReactElement {
  const { rolle, tab } = tabRoute.useParams();
  const data = tabRoute.useLoaderData();
  const { View } = VIEWS[tab];
  // key: beim Wechsel von Reiter oder Rolle wird der lokale Zustand (offene Formulare usw.) zurückgesetzt
  return <View key={`${rolle}/${tab}`} rolle={rolle as Rolle} data={data} />;
}

/* ---------- Router ---------- */
const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  rolleRoute.addChildren([rolleIndexRoute, tabRoute]),
]);

export const router = createRouter({
  routeTree,
  defaultErrorComponent: ({ error }) => (
    <p className="hinweis fehler">{error instanceof Error ? error.message : String(error)}</p>
  ),
  defaultNotFoundComponent: () => <p className="hinweis fehler">Seite nicht gefunden.</p>,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
