import { describe, expect, it } from "vitest";
import {
  calculateArea,
  capitalizeFirstLetter,
  createBook,
  createUser,
  findById,
  getFirstElement,
  getStatusColor,
  trimAndFormat,
  type Book,
  type HasId,
} from "./tasks";

describe("createUser", () => {
  it("creates user with default isActive=true", () => {
    const user = createUser(1, "Alice", "alice@example.com");
    expect(user).toEqual({
      id: 1,
      name: "Alice",
      email: "alice@example.com",
      isActive: true,
    });
  });

  it("creates user with provided isActive", () => {
    const user = createUser(2, "Bob", undefined, false);
    expect(user.isActive).toBe(false);
  });
});

describe("createBook", () => {
  it("returns book with year", () => {
    const book: Book = {
      title: "1984",
      author: "George Orwell",
      year: 1949,
      genre: "fiction",
    };
    expect(createBook(book)).toEqual(book);
  });

  it("returns book without optional year", () => {
    const book: Book = {
      title: "Sapiens",
      author: "Yuval Noah Harari",
      genre: "non-fiction",
    };
    expect(createBook(book)).toEqual(book);
  });
});

describe("calculateArea", () => {
  it("calculates circle area", () => {
    expect(calculateArea("circle", 5)).toBeCloseTo(78.5398, 4);
  });

  it("calculates square area", () => {
    expect(calculateArea("square", 4)).toBe(16);
  });
});

describe("getStatusColor", () => {
  it("returns green for active", () => {
    expect(getStatusColor("active")).toBe("green");
  });

  it("returns red for inactive", () => {
    expect(getStatusColor("inactive")).toBe("red");
  });

  it("returns blue for new", () => {
    expect(getStatusColor("new")).toBe("blue");
  });
});

describe("string formatters", () => {
  it("capitalizes first letter", () => {
    expect(capitalizeFirstLetter("hello")).toBe("Hello");
  });

  it("capitalizes and uppercases when uppercase=true", () => {
    expect(capitalizeFirstLetter("hello", true)).toBe("HELLO");
  });

  it("trims spaces", () => {
    expect(trimAndFormat("  hello world  ")).toBe("hello world");
  });

  it("trims and uppercases when uppercase=true", () => {
    expect(trimAndFormat("  hello world  ", true)).toBe("HELLO WORLD");
  });
});

describe("getFirstElement", () => {
  it("returns first number from array", () => {
    expect(getFirstElement([1, 2, 3])).toBe(1);
  });

  it("returns first string from array", () => {
    expect(getFirstElement(["a", "b", "c"])).toBe("a");
  });

  it("returns undefined for empty array", () => {
    expect(getFirstElement<number>([])).toBeUndefined();
  });
});

describe("findById", () => {
  interface Product extends HasId {
    name: string;
  }

  const products: Product[] = [
    { id: 1, name: "One" },
    { id: 2, name: "Two" },
  ];

  it("finds item by id", () => {
    expect(findById(products, 2)).toEqual({ id: 2, name: "Two" });
  });

  it("returns undefined when id is not found", () => {
    expect(findById(products, 999)).toBeUndefined();
  });
});
