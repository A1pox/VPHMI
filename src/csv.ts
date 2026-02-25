import { readFile, writeFile } from "node:fs/promises";

function parseCellValue(value: string): number | string {
  const trimmed = value.trim();
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }
  return trimmed;
}

export function csvToJSON(input: string[], delimiter: string): object[] {
  if (!Array.isArray(input)) {
    throw new Error("input must be an array of strings");
  }
  if (typeof delimiter !== "string" || delimiter.length === 0) {
    throw new Error("delimiter must be a non-empty string");
  }
  if (input.length === 0) {
    throw new Error("input must contain at least header row");
  }
  if (!input.every((row) => typeof row === "string")) {
    throw new Error("all rows in input must be strings");
  }

  const headers = input[0].split(delimiter).map((header) => header.trim());
  if (headers.length === 0 || headers.some((header) => header.length === 0)) {
    throw new Error("header contains empty column name");
  }

  return input.slice(1).map((row, rowIndex) => {
    const values = row.split(delimiter);
    if (values.length !== headers.length) {
      throw new Error(
        `row ${rowIndex + 2} has ${values.length} values but expected ${headers.length}`
      );
    }

    return headers.reduce<Record<string, number | string>>((acc, header, idx) => {
      acc[header] = parseCellValue(values[idx]);
      return acc;
    }, {});
  });
}

export async function formatCSVFileToJSONFile(
  input: string,
  output: string,
  delimiter: string
): Promise<void> {
  if (typeof input !== "string" || input.length === 0) {
    throw new Error("input path must be a non-empty string");
  }
  if (typeof output !== "string" || output.length === 0) {
    throw new Error("output path must be a non-empty string");
  }
  if (typeof delimiter !== "string" || delimiter.length === 0) {
    throw new Error("delimiter must be a non-empty string");
  }

  const fileContent = await readFile(input, { encoding: "utf-8" });
  const rows = fileContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const jsonData = csvToJSON(rows, delimiter);
  await writeFile(output, JSON.stringify(jsonData, null, 2), { encoding: "utf-8" });
}
