import type { Rolle } from "../constants";

export interface ViewProps<T> {
  rolle: Rolle;
  data: T;
}
