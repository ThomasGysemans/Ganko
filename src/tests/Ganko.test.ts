import { describe, expect, test } from "vitest";
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import Ganko from "../Ganko";

class ResponseFake {
	ok = true;
  constructor(public buffer: Buffer) {}
  async text() {
    return this.buffer.toString();
  }
}

(global.fetch as any) = (url: string) => {
	return readFile(resolve(__dirname, url)).then(
		(buffer) => new ResponseFake(buffer)
	);
};

function getLines(text: string): string[] {
	const lines = text.split("\n");
	const toRemove: number[] = [];
	for (let i = 0; i < lines.length; i++) {
		if (lines[i].trim().length === 0) {
			toRemove.push(i);
		}
	}
	for (let i = toRemove.length - 1; i >= 0; i--) {
		lines.splice(toRemove[i], 1);
	}
	return lines;
}

function compareOutput(actual: string, expected: string) {
	const expectedLines = getLines(expected);
	const actualLines = getLines(actual);
	// console.log("expectedLines = ", expectedLines);
	// console.log("actualLines = ", actualLines);
	expect(expectedLines.length).toEqual(actualLines.length);
	for (let i = 0; i < expectedLines.length; i++) {
		expect(expectedLines[i].trim()).toStrictEqual(actualLines[i].trim());
	}
}

describe("Simple and basic tests", () => {
	test("Initialisation", () => {
		expect(Ganko.hasTemplate("yoyo")).toEqual(false);
		expect(Ganko.getTemplate("yoyo")).toBeUndefined();
	});

	test("Read simple file with no declarative and no name", async () => {
		const templateName = "./no-declarative.templ";
		await Ganko.read(templateName);
		const template = Ganko.getTemplate(templateName)!;
		expect(Ganko.hasTemplate(templateName));
		expect(Object.keys(template.props).length).toEqual(0);
		expect(Object.keys(template.events).length).toEqual(0);
		expect(template.name).toEqual(templateName);
		expect(template.evaluations.length).toEqual(0);
	});

	test("Read named component", async () => {
		await Ganko.read("./named-template.templ");
		expect(Ganko.hasTemplate("TestComponent"));
	});

	test("Custom props", async () => {
		await Ganko.read("./simple-prop.templ");
		const template = Ganko.getTemplate("TitleCard")!;
		expect(Ganko.hasTemplate("TitleCard"));
		expect("title" in template.props).toBeTruthy();
		expect("name" in template.props).toBeTruthy();
		expect(template.props["title"]).toBeNull();
		expect(template.props["name"]).toEqual("Thomas");
		expect(template.evaluations.length).toEqual(2);
		expect(template.evaluations[0].javascript).toEqual(`title == "yo" ? "yoyo" : title`);
		expect(template.evaluations[1].javascript).toEqual("name.toUpperCase()");
		expect(template.evaluations[0].dependencies).toEqual(["title"]);
		expect(template.evaluations[1].dependencies).toEqual(["name"]);
	});

	test("Request with simple props", () => {
		expect(Ganko.hasTemplate("TitleCard"));
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
		await Ganko.read("./counter.templ");
		expect(Ganko.hasTemplate("Counter"));
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