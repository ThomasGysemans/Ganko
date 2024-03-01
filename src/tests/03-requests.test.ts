import { describe, test, expect } from "vitest";
import { compareOutput } from "./lib/helper-functions";
import Ganko from "../Ganko";

describe("Requests", () => {
  test("Request with simple props", () => {
    Ganko.fromString(`
      @name TitleCard

      @use title
      @use name ?? "Thomas"
      
      <template>
        <h1>#{title == "yo" ? "yoyo" : title}</h1>
        <p>Je m'appelle #{name.toUpperCase()}</p>
      </template>
    `);
    expect(Ganko.hasTemplate("TitleCard")).toBeTruthy();
    const output = Ganko.buildSync("TitleCard", { title: "yoyo" });
    const templ = Ganko.getTemplate("TitleCard");
    const uid0 = templ!.evaluations[0].uid;
    const uid1 = templ!.evaluations[1].uid;
    compareOutput(output, `
      <h1 data-${uid0}><!--evuid=${uid0}-->yoyo<!--endev--></h1>
      <p data-${uid1}>Je m'appelle <!--evuid=${uid1}-->THOMAS<!--endev--></p>
    `.trim());
  });

  test("Request with custom event", () => {
		Ganko.fromString(`
      @name Counter

      @use init ?? 5
      @use count ?? init
      @use step ?? 1
      
      @bind click on "btn"
      
      <template>
        <button gk="btn">Click to increase by #{step}</button>
        <span>The counter is #{count}</span>
      </template>
    `);
		expect(Ganko.hasTemplate("Counter")).toBeTruthy();
		const output = Ganko.buildSync("Counter", { count: 0 });
		const templ = Ganko.getTemplate("Counter");
		const uid0 = templ!.evaluations[0].uid;
		const uid1 = templ!.evaluations[1].uid;
		compareOutput(output, `
			<button gk="btn" data-${uid0}>Click to increase by <!--evuid=${uid0}-->1<!--endev--></button>
			<span data-${uid1}>The counter is <!--evuid=${uid1}-->0<!--endev--></span>
		`);
	});

  test("Use template without event bindings and update it", () => {
    interface TitleCardProps {
      title: string;
      name: string;
    }
    const portal = document.createElement("div");
    const gankoTemplate = Ganko.useTemplate<TitleCardProps>("TitleCard", portal, { title: "This is a title" });
    expect(gankoTemplate.getName()).toStrictEqual("TitleCard");
    expect(gankoTemplate.isFullyDynamic()).toBeTruthy();
    expect(gankoTemplate.getState()).toStrictEqual({
      title: "This is a title",
      name: "Thomas"
    });
    const createdDiv = portal.querySelector("div")!;
    expect(createdDiv).toBeDefined();
    expect(createdDiv.hasAttribute("data-template")).toBeTruthy();
    expect(createdDiv.getAttribute("data-template")).toEqual("TitleCard");
    gankoTemplate.update({
      title: "NewTitle",
      name: "NewName"
    } satisfies TitleCardProps);
    const h1 = createdDiv.querySelector("h1")!;
    expect(h1).toBeDefined();
    expect(h1.textContent).toStrictEqual("NewTitle");
    const p = createdDiv.querySelector("p")!;
    expect(p).toBeDefined();
    expect(p.textContent).toStrictEqual("Je m'appelle NEWNAME");
  });

  test("Use template with event bindings and update it", () => {
    interface CounterProps {
      count: number;
      init: number;
      step: number;
    }
    const portal = document.createElement("div");
    const gankoTemplate = Ganko.useTemplate<CounterProps, MouseEvent>("Counter", portal, { }, {
      btn: {
        click: (_, templ) => {
          templ.update({
            count: templ.getState().count + templ.getState().step,
          });
        }
      }
    });
    expect(gankoTemplate.getName()).toStrictEqual("Counter");
    expect(gankoTemplate.isFullyDynamic()).toBeTruthy();
    expect(gankoTemplate.getState()).toStrictEqual({
      count: 5,
      init: 5,
      step: 1
    } satisfies CounterProps);
    const container = portal.querySelector("div") as HTMLDivElement;
    const button = container.querySelector("button") as HTMLButtonElement;
    const span = container.querySelector("span") as HTMLSpanElement;
    expect(button.getAttribute("gk")).toStrictEqual("btn");
    expect(span.textContent).toStrictEqual("The counter is 5");
    button.click();
    expect(gankoTemplate.getState()).toStrictEqual({
      count: 6,
      init: 5,
      step: 1
    } satisfies CounterProps);
    expect(span.textContent).toStrictEqual("The counter is 6");
  });
});