import { beforeEach, describe, expect, it, vi } from "vitest";
import { csvToJSON, formatCSVFileToJSONFile } from "./csv";
import { readFile, writeFile } from "node:fs/promises";

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
}));

describe("csvToJSON", () => {
  it("converts csv rows to array of objects", () => {
    const result = csvToJSON(
      ["p1;p2;p3;p4", "1;A;b;c", "2;B;v;d"],
      ";"
    );

    expect(result).toEqual([
      { p1: 1, p2: "A", p3: "b", p4: "c" },
      { p1: 2, p2: "B", p3: "v", p4: "d" },
    ]);
  });

  it("returns empty array when there is only header", () => {
    expect(csvToJSON(["id;name"], ";")).toEqual([]);
  });

  it("throws on invalid argument types", () => {
    expect(() => csvToJSON("id;name" as unknown as string[], ";")).toThrow(Error);
    expect(() => csvToJSON(["id;name"], "")).toThrow(Error);
    expect(() => csvToJSON([1 as unknown as string], ";")).toThrow(Error);
  });

  it("throws when column count differs from header", () => {
    expect(() =>
      csvToJSON(["id;name;role", "1;Alice"], ";")
    ).toThrow(/expected 3/);
  });

  it("throws when header has empty column name", () => {
    expect(() => csvToJSON(["id;;name", "1;2;Alice"], ";")).toThrow(Error);
  });
});

describe("formatCSVFileToJSONFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reads csv, converts and writes json with expected args", async () => {
    vi.mocked(readFile).mockResolvedValue("id;name\n1;Alice\n2;Bob");
    vi.mocked(writeFile).mockResolvedValue();

    await formatCSVFileToJSONFile("input.csv", "output.json", ";");

    expect(readFile).toHaveBeenCalledWith("input.csv", { encoding: "utf-8" });
    expect(writeFile).toHaveBeenCalledWith(
      "output.json",
      JSON.stringify(
        [
          { id: 1, name: "Alice" },
          { id: 2, name: "Bob" },
        ],
        null,
        2
      ),
      { encoding: "utf-8" }
    );
  });

  it("propagates error from readFile", async () => {
    vi.mocked(readFile).mockRejectedValue(new Error("read failed"));

    await expect(
      formatCSVFileToJSONFile("input.csv", "output.json", ";")
    ).rejects.toThrow("read failed");
    expect(writeFile).not.toHaveBeenCalled();
  });

  it("throws on invalid function arguments", async () => {
    await expect(
      formatCSVFileToJSONFile("", "output.json", ";")
    ).rejects.toThrow(Error);
    await expect(
      formatCSVFileToJSONFile("input.csv", "", ";")
    ).rejects.toThrow(Error);
    await expect(
      formatCSVFileToJSONFile("input.csv", "output.json", "")
    ).rejects.toThrow(Error);
  });
});
