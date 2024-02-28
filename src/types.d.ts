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
    element?: HTMLElement; // the HTML element in which the evaluation happens
    dependencies: string[];
  }

  type Template = {
    template: string;
    name: string;
    evaluations: Evaluation[];
  } & TemplateData;

  type Props = { [key: string]: unknown };
  type StoredEvents = { [key: string]: string[] };
  type AppliedEvents<P> = { [key: string]: { [key: string]: (e: Event, templ: GankoTemplate<P>) => void } }; // { "btn": { "click": (e) => console.log(e) } }
}

export {};