import {
  createRootRoute, createRoute, createRouter, Link, Outlet, redirect, useNavigate, useRouter, useRouterState,
} from '@tanstack/react-router';
import { ReactElement, useEffect } from 'react';
import { istRolle, Rolle, ROLLEN, TABS } from './constants';
import { MsgProvider, useMsg } from './store';
import { VIEWS } from './views';

const ersterTab = (rolle: Rolle) => TABS[rolle][0][0];

/* ---------- Wurzel: stellt den Meldungs-Kontext bereit ---------- */
const rootRoute = createRootRoute({
  component: (): ReactElement => (
    <MsgProvider>
      <Outlet />
    </MsgProvider>
  ),
});

// "/" -> Admin
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/$rolle', params: { rolle: 'admin' } });
  },
});

/* ---------- /$rolle: Kopf mit Rollenumschalter, Navigation, Hinweisfeld ---------- */
const rolleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '$rolle',
  beforeLoad: ({ params }) => {
    if (!istRolle(params.rolle)) throw redirect({ to: '/$rolle', params: { rolle: 'admin' } });
  },
  component: RolleLayout,
});

function RolleLayout(): ReactElement {
  const { rolle: roh } = rolleRoute.useParams();
  const rolle = roh as Rolle;
  const navigate = useNavigate();
  const router = useRouter();
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

  return (
    <>
      <header>
        <div className="kopf">
          <h1>Restaurantverwaltung</h1>
          <div id="rollen" role="group" aria-label="Rolle wählen">
            {(Object.keys(ROLLEN) as Rolle[]).map((r) => (
              <button key={r} aria-pressed={r === rolle} onClick={() => navigate({ to: '/$rolle', params: { rolle: r } })}>
                {ROLLEN[r]}
              </button>
            ))}
          </div>
        </div>
      </header>
      <nav id="nav" aria-label="Bereiche">
        {TABS[rolle].map(([k, t]) => (
          <Link key={k} to="/$rolle/$tab" params={{ rolle, tab: k }}>{t}</Link>
        ))}
      </nav>
      <main id="main">
        {msg && <p className={`hinweis ${msg.t}`} role="status">{msg.x}</p>}
        <Outlet />
      </main>
    </>
  );
}

// "/admin" -> erster Reiter der Rolle
const rolleIndexRoute = createRoute({
  getParentRoute: () => rolleRoute,
  path: '/',
  beforeLoad: ({ params }) => {
    throw redirect({ to: '/$rolle/$tab', params: { rolle: params.rolle, tab: ersterTab(params.rolle as Rolle) } });
  },
});

/* ---------- /$rolle/$tab: lädt die Daten der Ansicht per Loader ---------- */
const tabRoute = createRoute({
  getParentRoute: () => rolleRoute,
  path: '$tab',
  beforeLoad: ({ params }) => {
    if (!TABS[params.rolle as Rolle].some(([k]) => k === params.tab)) {
      throw redirect({ to: '/$rolle', params: { rolle: params.rolle } });
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
const routeTree = rootRoute.addChildren([indexRoute, rolleRoute.addChildren([rolleIndexRoute, tabRoute])]);

export const router = createRouter({
  routeTree,
  defaultErrorComponent: ({ error }) => <p className="hinweis fehler">{error instanceof Error ? error.message : String(error)}</p>,
  defaultNotFoundComponent: () => <p className="hinweis fehler">Seite nicht gefunden.</p>,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
