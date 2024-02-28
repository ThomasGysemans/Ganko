/// <reference types="vite/client" />

import type GankoTemplate from "./GankoTemplate";

declare global {
  interface TemplateData {
    props: Props;
    events: StoredEvents;
  }

  interface Evaluation {
    javascript: string;
    startIdx: number;
    endIdx: number;
    node?: Node; // the HTML element in which the evaluation happens
    dependencies: string[];
  }

  type Template = {
    template: string;
    name: string;
    evaluations: Evaluation[];
  } & TemplateData;

  type Props = { [key: string]: unknown };
  type StoredEvents = { [key: string]: string[] };
  type AppliedEvents<P, E = Event> = { [key: string]: { [key: string]: (e: E, templ: GankoTemplate<P>) => void } }; // { "btn": { "click": (e) => console.log(e) } }
}

export {};