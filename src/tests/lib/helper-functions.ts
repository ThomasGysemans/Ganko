import { expect } from "vitest";

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

export function compareOutput(actual: string, expected: string) {
	const expectedLines = getLines(expected);
	const actualLines = getLines(actual);
	// console.log("expectedLines = ", expectedLines);
	// console.log("actualLines = ", actualLines);
	expect(expectedLines.length).toEqual(actualLines.length);
	for (let i = 0; i < expectedLines.length; i++) {
		expect(expectedLines[i].trim()).toStrictEqual(actualLines[i].trim());
	}
}