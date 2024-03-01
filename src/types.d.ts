/// <reference types="vite/client" />

import type GankoTemplate from "./GankoTemplate";

declare global {
  interface TemplateData {
    props: Props;
    events: StoredEvents;
  }

  interface Evaluation {
    uid: string;
    javascript: string;
    startIdx: number;
    endIdx: number;
    textNode?: Node; // the HTML element in which the evaluation happens
    isAttribute: boolean;
    attr?: string;
    elementWithAttr?: HTMLElement;
    dynamic?: boolean; // "true" for an evaluation that can be updated (textNode and elementWithAttr are not both undefined)
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