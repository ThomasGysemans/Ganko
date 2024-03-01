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

  test("Request with custom event", async () => {
		Ganko.fromString(`
      @name Counter

      @use count
      @use init ?? 0
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
});