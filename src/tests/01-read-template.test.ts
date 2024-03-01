import { describe, expect, test } from "vitest";
import Ganko from "../Ganko";

describe("Simple and basic tests", () => {
	test("Initialisation", () => {
		expect(Ganko.hasTemplate("yoyo")).toEqual(false);
		expect(Ganko.getTemplate("yoyo")).toBeUndefined();
	});

	test("Read from string", () => {
		const name = Ganko.fromString(`
			<template>
				<h1>Hello</h1>
			</template>
		`);
		expect(Ganko.hasTemplate(name)).toBeTruthy();
	});

	test("Read simple file with no declarative and no name", async () => {
		const templateFile = "./no-declarative.templ";
		await Ganko.read(templateFile);
		const template = Ganko.getTemplate(templateFile)!;
		expect(Ganko.hasTemplate(templateFile)).toBeTruthy();
		expect(Object.keys(template.props).length).toEqual(0);
		expect(Object.keys(template.events).length).toEqual(0);
		expect(template.name).toEqual(templateFile);
		expect(template.evaluations.length).toEqual(0);
	});

	test("Discard a template", () => {
		expect(Ganko.discardTemplate("./no-declarative.templ")).toBeTruthy();
		expect(Ganko.hasTemplate("./no-declarative.templ")).toBeFalsy();
	});
});