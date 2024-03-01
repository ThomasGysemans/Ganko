import GankoTemplate from "./GankoTemplate";

export default class Ganko {
  private static LOCAL_STORAGE_DEFAULT_KEY = "Ganko";
  private static REGEX_DIRECTIVE = /^\s*@(?:(use)\s+(\w+)(?:\s*\?\?\s*?(.+)?)?)|(?:(bind)\s+(\w+)\s+on\s+"([\w]*?)"\s*?)|(?:(name)\s+(\w+))$/mig;
  private static REGEX_JAVASCRIPT_VARIABLES = /\b((?<!\.)[a-zA-Z_]\w*)\b/g;
  private static REGEX_OPENING_HTML_TAG = /^<([a-z]+\d*)(\s+[^>]*)?>$/i;
  private static REGEX_TEMPLATE_CONTENT = /<template>([\s\S]*)<\/template>/gm;
  private static REGEX_GANKO_ATTRIBUTE = /^gk-\w+$/;
  private static REGEX_EVAL = /#{(.*?)}/gmi;
  private static IDX_USE = 1;
  private static IDX_BIND = 4;
  private static IDX_NAME = 7;

  /**
   * The name of a template with its raw data.
   */
  private static templates: Map<string, Template> = new Map();

  /**
   * Holds the template files and their custom name.
   * If they don't have a custom name, then the file path (the key) becomes the name (the value).
   */
  private static names: Map<string, string> = new Map();

  /**
   * Checks if a template exists.
   * @param template The custom name of a template, or its file path.
   * @returns `true` if the template of this name, or located at this path, were already interpreted and saved as raw data.
   */
  public static hasTemplate(template: string) {
    return this.templates.has(template) || this.names.has(template);
  }

  /**
   * Gets the raw data of a template, if it exists.
   * Use its custom name or its file path to find it.
   * @param template The custom name of a template, or its file path.
   * @returns The template's raw data, or undefined if it doesn't exist.
   */
  public static getTemplate(template: string) {
    return this.templates.get(template) ?? (this.templates.get(this.names.get(template) ?? ""));
  }

  /**
   * Transforms the templates into JSON.
   */
  public static toJSON(): string {
    return JSON.stringify({
      templates: Array.from(this.templates.entries()),
      names: Array.from(this.names.entries())
    });
  }

  /**
   * Reads the templates as JSON.
   * @param json Templates as JSON string.
   * @returns `true` if the JSON was parsed successfully.
   */
  public static fromJSON(json: string): boolean {
    const parsed = JSON.parse(json);
    const templates = parsed?.templates;
    const names = parsed?.names;
    if (templates && names) {
      this.templates = new Map(templates)
      this.names = new Map(names);
      return true;
    }
    return false;
  }

  /**
   * Creates a new template from text.
   * @param text The template's contents.
   * @param file The name of the file that was read, or a generated random name.
   * @returns The name of the template that was created.
   */
  public static fromString(text: string, file?: string): string {
    if (!file) {
      file = "file-" + this.generateUID();
    }
    const template = this.readTemplate(file, text);
    this.templates.set(template.name, template);
    this.names.set(file, template.name);
    return template.name;
  }

  /**
   * Reads a JSON file that holds all the templates.
   * @param file The path to a JSON file.
   * @returns `true` if the file was parsed successfully.
   */
  public static async fromJSONFile(file: string): Promise<boolean> {
    const res = await fetch(file);
    if (res.ok) {
      const json = await res.text();
      return this.fromJSON(json);
    } else {
      throw new Error(`Could not read file ${file}, status: ${res.status}`);
    }
  }

  /**
   * Puts the templates in cache for future use.
   * Might be useful when the app is accessed multiple times
   * and that the templates don't change.
   * @param key The key in the local storage.
   */
  public static cacheTemplates(key = this.LOCAL_STORAGE_DEFAULT_KEY) {
    localStorage.setItem(key, this.toJSON());
  }

  /**
   * Checks if templates are cached.
   * @param key The key in the local storage.
   * @returns `true` if templates were cached and stored using this key.
   */
  public static hasCache(key = this.LOCAL_STORAGE_DEFAULT_KEY) {
    return localStorage.getItem(key) != null;
  }

  /**
   * Reads the templates stored in cache, if there are any.
   * @param key The key in the local storage.
   * @returns `true` if the cache was successfully parsed.
   */
  public static readCache(key = this.LOCAL_STORAGE_DEFAULT_KEY): boolean {
    const json = localStorage.getItem(key);
    if (json) {
      return this.fromJSON(json);
    }
    return false;
  }

  /**
   * Clears the cache.
   * @param key The key in the local storage.
   */
  public static clearCache(key = this.LOCAL_STORAGE_DEFAULT_KEY) {
    localStorage.removeItem(key);
  }

  /**
   * Creates a template and add it to the DOM through a portal.
   * @param template The name of the template to use.
   * @param portal The HTML element that should contain the template.
   * @param props The custom props to be given to the template.
   * @param events The custom events to bind to elements within the template.
   * @returns An instance of GankoTemplate but only if the evaluation has event bindings (otherwise it returns null).
   */
  public static useTemplate<P, E = Event>(template: string, portal: Element, props: Partial<P> = {}, events: AppliedEvents<P, E> = {}): GankoTemplate<P> | null {
    const html = this.buildSync(template, props);
    const templ = this.getTemplate(template)!;
    const templateContainer = this.createTemplateContainer(template, html);
    const gkElements = templateContainer.querySelectorAll("[gk]");
    let gankoTemplate: GankoTemplate<P> | null = null;
    if (gkElements.length > 0) {
      for (const element of gkElements) {
        if (!(element.getAttribute("gk")! in events)) {
          throw new Error(`Missing event binding for "${element.getAttribute("gk")}"`);
        }
      }
      const expectedEvents = Object.keys(templ.events);
      for (const appliedEvent of Object.keys(events)) {
        if (!expectedEvents.includes(appliedEvent)) {
          throw new Error(`Template ${template} was given unexpected event "${appliedEvent}"`);
        }
      }
      const templCopy = structuredClone(templ);
      gankoTemplate = new GankoTemplate<P>(templCopy, {...templCopy.props, ...props} as P);
      for (const element of gkElements) {
        const gk = element.getAttribute("gk")!;
        for (const event of Object.keys(events[gk])) {
          element.addEventListener(event, (e) => events[gk][event](e as E, gankoTemplate!));
        }
      }
      // Save the element in which each evaluation appears
      // to allow dynamic changes and re-evaluations.
      for (let i = 0; i < templCopy.evaluations.length; i++) {
        const ev = templCopy.evaluations[i];
        if (ev.isAttribute) {
          ev.elementWithAttr = this.locateElementWithGankoAttribute(ev.uid, ev.attr!, templateContainer);
          ev.dynamic = ev.elementWithAttr != undefined;
        } else {
          ev.textNode = this.locateEvaluationTextNode(ev.uid, templateContainer);
          ev.dynamic = ev.textNode != undefined;
        }
      }
    }
    portal.appendChild(templateContainer);
    return gankoTemplate;
  }

  /**
   * Gets the nearest HTML element of an evaluation.
   * It simplifies the calculations that make an evaluation dynamic.
   * @param uid the unique ID of an evaluation.
   * @param container The container that holds the template.
   * @returns The nearest HTML element to the evaluation.
   */
  private static locateNearestElementOfEvaluation(uid: string, container: HTMLDivElement): HTMLElement | undefined {
    const nearestEvAttr = "data-"+uid;
    return (container.querySelector(`[${nearestEvAttr}]`) as HTMLElement | undefined) ?? undefined;
  }

  /**
   * Gets the HTML element that has the Ganko attribute defined by the evaluation of index `i`.
   * @param uid The UID of the evaluation.
   * @param expectedAttribute The Ganko attribute.
   * @param container The container that holds the template.
   * @returns The HTML element that has the Ganko attribute.
   */
  private static locateElementWithGankoAttribute(uid: string, expectedAttribute: string, container: HTMLDivElement): HTMLElement | undefined {
    const nearestElement = this.locateNearestElementOfEvaluation(uid, container);
    if (nearestElement && nearestElement.hasAttribute(expectedAttribute)) {
      nearestElement.removeAttribute("data-" + uid);
      return nearestElement;
    }
  }

  /**
   * Gets the node that an evaluation is creating within the template.
   * @param id The UID of the evaluation.
   * @param container The container that holds the template.
   * @returns The node that the evaluation created.
   */
  private static locateEvaluationTextNode(uid: string, container: HTMLDivElement): Node | undefined {
    const nearestElement = this.locateNearestElementOfEvaluation(uid, container);
    const isExpectedCommentNode = (c: ChildNode) => c.nodeType === c.COMMENT_NODE && c.textContent === `evuid=${uid}`;
    if (nearestElement) {
      // The nearest element might be the element with the dta-uid attribute.
      // If it's not, then we check with the parent element.
      // If the comment isn't found, then updating the evaluation won't be possible.
      const commentNode = Array.from(nearestElement.childNodes).find(isExpectedCommentNode) ?? (nearestElement.parentElement ? Array.from(nearestElement.parentElement.childNodes).find(isExpectedCommentNode) : undefined);
      nearestElement.removeAttribute("data-"+uid);
      return commentNode?.nextSibling ?? undefined;
    }
  }

  /**
   * Creates a container in which to put a template meant to be inserted into the DOM.
   * @param name The name of the template to insert into the DOM.
   * @param html The template that was built with custom props.
   * @returns A container for the newly created template.
   */
  private static createTemplateContainer(name: string, html: string): HTMLDivElement {
    const templateContainer = document.createElement("div");
    templateContainer.setAttribute("data-template", name);
    templateContainer.innerHTML = html;
    return templateContainer;
  }

  /**
   * Requests a template with custom props and events.
   * It if the template is new, then `template` should be the file path and it will get read.
   * If the template is named, use either the name of the file path.
   * @param template The name of the template to request. If it's unknown, it will try and read the file.
   * @param data The data to send to the template so as to evaluate the JavaScript contents.
   * @returns A template with custom props and events.
   */
  public static async build(template: string, props: Props = {}): Promise<string> {
    if (!this.hasTemplate(template)) {
      await this.read(template);
    }

    return this.request(template, props);
  }

  /**
   * Requests a template with custom props and events.
   * @param template The name of the template to request. If it's unknown, an error will get thrown.
   * @param data The data to send to the template so as to evaluate the JavaScript contents.
   * @returns A template with custom props and events.
   */
  public static buildSync(template: string, props: Props = {}): string {
    if (!this.hasTemplate(template)) {
      throw new Error(`Template of name "${template}" doesn't exist.`);
    }

    return this.request(template, props);
  }

  /**
   * Requests an existing template with custom props and events.
   * Props that were given but don't exist in the template will trigger an error.
   * Props that do not have a default value within the template will also trigger an error if not defined.
   * @param template The name of the template to request.
   * @param data The data to send to the template so as to evaluate the JavaScript contents.
   * @returns A template with custom props and events.
   */
  private static request(template: string, props: Props = {}): string {
    const templ = this.getTemplate(template)!;
    const originalProps = Object.keys(templ.props);

    for (const key of Object.keys(props)) {
      if (!originalProps.includes(key)) {
        throw new Error(`Unknown prop "${key}" was given to the request of "${template}"`);
      }
    }

    for (const key of originalProps) {
      if (!(key in props) && templ.props[key] == null) {
        throw new Error(`Mandatory prop "${key}" was not defined when requesting template "${template}"`);
      }
    }

    const mergedProps = { ...templ.props, ...props };

    let output = templ.template;
    let offset = 0;
    for (let i = 0; i < templ.evaluations.length; i++) {
      const evaluation = templ.evaluations[i];
      const ev = (new Function(createEvaluationContext(mergedProps) + "return " + evaluation.javascript)());
      let result: string | undefined;
      if (!evaluation.isAttribute) {
        result = `<!--evuid=${evaluation.uid}-->` + ev + "<!--endev-->";
      }
      output = output.substring(0, evaluation.startIdx + offset) + (result ?? ev) + output.substring(evaluation.endIdx + 1 + offset);
      if ((result ?? ev) != undefined) {
        offset += `${(result ?? ev)}`.length - evaluation.javascript.length - 3 
      } else {
        offset += evaluation.javascript.length - 3;
      }
    }

    return output;
  }

  /**
   * Reads a template file and stores it.
   * @param file The path to the file to read.
   */
  public static async read(file: string): Promise<void> {
    const res = await fetch(file);
    if (res.ok) {
      const text = (await res.text()).trim();
      this.fromString(text, file);
    } else {
      throw new Error("Error happened when trying to read file '" + file + "' : " + res.status);
    }
  }

  /**
   * Interprets a ".templ" file and creates the proper representation it needs to then be re-used.
   * @param file The path to the ".templ" currently being read.
   * @param plain The contents of the file.
   * @returns A template.
   */
  private static readTemplate(file: string, plain: string): Template {
    const data: Template = { template: "", name: file, evaluations: [], props: {}, events: {} };
    const templatePos = plain.indexOf("<template>");
    const template = plain.substring(templatePos).trim(); 
    if (!template.endsWith("</template>")) {
      throw new Error(`Template file "${file}" should finish with template tag`);
    }
    data.template = template.replace(this.REGEX_TEMPLATE_CONTENT, "$1").trim();
    if (templatePos === 0) {
      return data;
    }
    const dataSection = plain.substring(0, templatePos).trim();
    let match: RegExpExecArray | null = null;
    while ((match = this.REGEX_DIRECTIVE.exec(dataSection)) != null) {
      if (match[this.IDX_USE] === "use") {
        this.readUseDirective(match, data, data.props);
      } else if (match[this.IDX_BIND] === "bind") {
        this.readBindDirective(match, data);
      } else if (match[this.IDX_NAME] === "name") {
        const name = match[this.IDX_NAME+1];
        if (this.templates.has(name)) {
          throw new Error(`Duplicated template named "${name}"`);
        } else {
          data.name = name;
        }
      } else {
        throw new Error(`Unknown directive in "${match[0].trim()}" in file "${file}"`);
      }
    }
    this.readEvaluations(data);
    return data;
  }

  /**
   * Reads evaluations and transforms the template so as to prepare the ground for the virtual dom.
   * @param data The template's data being built.
   */
  private static readEvaluations(data: Template) {
    const expectedProps = Object.keys(data.props);
    const evPositions: number[] = [];
    let foundElement = false;
    let foundAttribute = false;
    let evAttr: string | null = null;
    let match: RegExpExecArray | null = null;
    while ((match = this.REGEX_EVAL.exec(data.template)) != null) {
      for (let i = match.index; i >= 0; i--) {
        if (this.isHTMLElement(i, data)) {
          foundElement = true;
          evPositions.push(i);
          break;
        } else {
          const attr = this.isGankoAttribute(i, data);
          if (attr != null) {
            evAttr = attr.attr;
            foundAttribute = true;
            evPositions.push(attr.attrIdx);
            break;
          }
        }
      }
      if (!foundElement && !foundAttribute) {
        throw new Error(`Evaluation was done outside of an HTML element in template "${data.name}"`);
      }
      const js = match[1].trim();
      data.evaluations.push({
        uid: this.generateUID(),
        endIdx: match.index + match[0].length - 1,
        startIdx: match.index,
        javascript: match[1].trim(),
        dependencies: this.identifyEvaluationDependencies(js, expectedProps),
        isAttribute: foundAttribute,
        attr: evAttr?.substring(3) ?? undefined // .substring(3) is to skip the "gk-" prefix
      });
      foundElement = foundAttribute = false;
      evAttr = null;
    }
    let offset = 0;
    let attr = "";
    for (let i = 0; i < evPositions.length; i++) {
      attr = ` data-${data.evaluations[i].uid}`;
      data.template = data.template.substring(0, evPositions[i] + offset) + attr + data.template.substring(evPositions[i] + offset);
      offset += attr.length;
      // Remove the "gk-" prefix from the attribute
      if (data.evaluations[i].isAttribute) {
        data.template = data.template.substring(0, evPositions[i] + offset) + " " + data.template.substring(evPositions[i] + offset + 4); // the length of "gk-" + 1
        offset -= 3;
      }
      data.evaluations[i].startIdx += offset;
      data.evaluations[i].endIdx += offset;
    }
  }

  /**
   * Creates a unique string of 4 characters in [a-z] for an evaluation.
   * Each evaluation needs to be identified in a unique way
   * to simplify the instantiation of a template.
   */
  private static generateUID(): string {
    const max = 'z'.charCodeAt(0);
    const min = 'a'.charCodeAt(0);
    let uid = "";
    for (let i = 0; i < 4; i++) {
      uid += String.fromCharCode(Math.floor(Math.random() * (max - min) + min));
    }
    return uid;
  }

  /**
   * Identifies the variables used in a JavaScript statement.
   * It will ignore any that is not defined as a prop.
   * @param js A JavaScript string meant to be evaluated.
   * @param expectedProps The template's props. Any variable that's not in this array won't get included in the dependency list.
   * @returns An array holding the variables used in the JavaScript statement.
   */
  private static identifyEvaluationDependencies(js: string, expectedProps: string[]): string[] {
    const variables = js.match(this.REGEX_JAVASCRIPT_VARIABLES)?.filter(v => expectedProps.includes(v));
    if (variables == null) {
      return [];
    }
    return [...new Set(variables)];
  }

  /**
   * Checks if the given index is pointing at the end of an opening HTML tag within a text.
   * @param idx The ending position of a potential opening tab of an HTML element within the given text.
   * @param template The full text of the template
   * @returns `true` if the `idx` is pointing at the end of an opening HTML tag.
   */
  private static isHTMLElement(idx: number, { template }: { template: string }): boolean {
    if (template[idx] !== ">") {
      return false;
    }
    let element = "";
    do {
      element += template[idx];
    } while (idx >= 0 && template[idx--] !== "<");
    return this.REGEX_OPENING_HTML_TAG.test(element.split("").reverse().join(""));
  }

  /**
   * Checks if an evaluation is in a Ganko attribute, and if it is,
   * then it returns the exact name of the attribute and its starting position.
   * @param idx The ending position of a potential Ganko HTML attribute within the given text.
   * @param template The full text of the template. 
   * @returns The exact attribute and its starting position.
   */
  private static isGankoAttribute(idx: number, { template }: { template: string }): { attr: string, attrIdx: number } | null {
    if (this.isJavaScriptQuote(template[idx])) {
      idx -= 2;
    } else if (template[idx] === "=") {
      idx--;
    } else {
      return null;
    }
    let attr = "";
    do {
      attr += template[idx];
    } while (idx >= 0 && template[--idx] !== "-");
    if (template.substring(idx - 2, idx) !== "gk") {
      return null;
    }
    const reversed = "gk-" + attr.split("").reverse().join("");
    if (!this.REGEX_GANKO_ATTRIBUTE.test(reversed)) {
      return null;
    }
    return {
      attr: reversed,
      attrIdx: idx - 3
    };
  }

  /**
   * Checks if a character is a quote.
   * @param char A character.
   * @returns `true` if the character is a JavaScript-valid quote.
   */
  private static isJavaScriptQuote(char: string): boolean {
    return char === "'" || char === '"' || char === "`";
  }

  /**
   * Interprets a "use" directive for custom props of template files.
   * It can use props already declared before for the default value.
   * @param match The directive that the regular expression has read.
   * @param data The template currently being interpreted.
   */
  private static readUseDirective(match: RegExpExecArray, data: Template, props: Props) {
    const name = match[this.IDX_USE+1];
    if (name in data.props) {
      throw new Error(`Duplicated "use" directive of name "${name}"`);
    } else {
      if (match[this.IDX_USE+2] != null) {
        data.props[name] = new Function(createEvaluationContext(props) + "return " + match[this.IDX_USE+2])();
      } else {
        data.props[name] = null;
      }
    }
  }

  /**
   * Interprets a "bind" directive for custom events of template files.
   * @param match The directive that the regular expression has read.
   * @param data The template currently being interpreted.
   */
  private static readBindDirective(match: RegExpExecArray, data: Template) {
    const event = match[this.IDX_BIND+1];
    const targetName = match[this.IDX_BIND+2];
    if (targetName in data.events && data.events[targetName].includes(event)) {
      throw new Error(`Duplicated "bind" directive of name "${event}"`);
    } else {
      if (targetName in data.events) {
        data.events[targetName].push(event);
      } else {
        data.events[targetName] = [event];
      }
    }
  }
}

/**
* Creates constant variables to be used within a Function constructor when evaluating JavaScript expressions of a template.
* @param props The props of the template.
* @returns The statements to add at the beginning of a Function's body.
*/
export function createEvaluationContext(props: Props): string {
  return Object.keys(props).reduce((p, c) => {
    if (typeof props[c] === "string") {
      return p + ("const " + c + " = String.raw`" + props[c] + "`;")
    } else {
      return p + ("const " + c + " = " + props[c] + ";");
    }
 }, "");
}