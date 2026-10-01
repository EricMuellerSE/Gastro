import type { ComponentType } from 'react';
import { api } from '../api';
import type { Rolle } from '../constants';
import { BarView } from './Bar';
import { EigeneView, TablettView } from './Bestellen';
import { BestandView, LagerView } from './Lager';
import { MitarbeiterView } from './Mitarbeiter';
import { RechnungenView } from './Rechnungen';
import { RezepteView } from './Rezepte';
import { TischeView } from './Tische';
import { UmsatzView } from './Umsatz';
import type { ViewProps } from './types';

/** Eine Ansicht = Ladefunktion (Router-Loader) + Komponente. */
interface ViewDef<T> { load: (rolle: Rolle) => Promise<T>; View: ComponentType<ViewProps<T>> }
const view = <T,>(load: ViewDef<T>['load'], View: ViewDef<T>['View']): ViewDef<unknown> => ({ load, View } as ViewDef<unknown>);

/** Schlüssel = Pfadname des Reiters (siehe TABS) */
export const VIEWS: Record<string, ViewDef<unknown>> = {
  mitarbeiter: view(api.mitarbeiter, MitarbeiterView),
  lager: view(api.lager, LagerView),
  bestand: view(api.lager, BestandView),
  rezepte: view(api.rezepte, RezepteView),
  tische: view(api.tische, TischeView),
  umsatz: view(api.umsatz, UmsatzView),
  bar: view(api.bar, BarView),
  tablett: view(api.bestellformular, TablettView),
  eigene: view(api.bestellformular, EigeneView),
  rechnungen: view(api.rechnungen, RechnungenView),
};
