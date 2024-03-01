import { expect, describe, test } from "vitest";
import Ganko from "../Ganko";

describe("Templates with directives", () => {
  test("Read named component", () => {
		const name = Ganko.fromString(`
			@name TestComponent

			<template>
				<h1>Hello</h1>
			</template>
		`);
		expect(name).toStrictEqual("TestComponent");
		expect(Ganko.hasTemplate("TestComponent")).toBeTruthy();
	});

	test("Custom props", () => {
		Ganko.fromString(`
			@name TitleCard

			@use title
			@use name ?? "Thomas"
			
			<template>
				<h1>#{title == "yo" ? "yoyo" : title}</h1>
				<p>Je m'appelle #{name.toUpperCase()}</p>
			</template>
		`);
		const template = Ganko.getTemplate("TitleCard")!;
		expect(Ganko.hasTemplate("TitleCard")).toBeTruthy();
		expect("title" in template.props).toBeTruthy();
		expect("name" in template.props).toBeTruthy();
		expect(template.props["title"]).toBeNull();
		expect(template.props["name"]).toEqual("Thomas");
		expect(template.evaluations.length).toEqual(2);
		expect(template.evaluations[0].javascript).toEqual(`title == "yo" ? "yoyo" : title`);
		expect(template.evaluations[1].javascript).toEqual("name.toUpperCase()");
		expect(template.evaluations[0].dependencies).toEqual(["title"]);
		expect(template.evaluations[1].dependencies).toEqual(["name"]);
		expect(Object.keys(template.events).length).toEqual(0);
	});

	test("Custom event", () => {
		Ganko.fromString(`
			@name CustomEvent
			@bind click on "btn"

			<template>
				<button gk="btn">Click</button>
			</template>
		`);
		const templ = Ganko.getTemplate("CustomEvent")!;
		expect(templ).toBeDefined();
		expect(Object.keys(templ.props).length).toEqual(0);
		expect(Object.keys(templ.events).length).toEqual(1);
		expect(Object.keys(templ.events)[0]).toEqual("btn");
		expect(templ.events["btn"]).toEqual(["click"]);
	});
});