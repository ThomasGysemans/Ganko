import { expect, describe, test } from "vitest";
import Ganko from "../Ganko";

describe("Templates with directives", () => {
  test("Read named component", async () => {
		const name = Ganko.fromString(`
			@name TestComponent

			<template>
				<h1>Hello</h1>
			</template>
		`);
		expect(name).toStrictEqual("TestComponent");
		expect(Ganko.hasTemplate("TestComponent")).toBeTruthy();
	});

	test("Custom props", async () => {
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
	});
});