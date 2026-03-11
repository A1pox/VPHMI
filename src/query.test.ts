import { describe, expect, expectTypeOf, it } from "vitest";
import {
  groupBy,
  having,
  query,
  sort,
  where,
  type Group,
  type GroupByStep,
  type HavingStep,
  type SortStep,
  type Transform,
  type WhereStep,
} from "./query";

type User = {
  id: number;
  name: string;
  surname: string;
  age: number;
  city: string;
};

const users: User[] = [
  { id: 1, name: "John", surname: "Doe", age: 34, city: "NY" },
  { id: 2, name: "John", surname: "Doe", age: 33, city: "NY" },
  { id: 3, name: "John", surname: "Doe", age: 35, city: "LA" },
  { id: 4, name: "Mike", surname: "Doe", age: 35, city: "LA" },
];

describe("query pipeline", () => {
  const userWhere = where<User>();
  const userSort = sort<User>();
  const userGroupBy = groupBy<User>();
  const userHaving = having<User>();
  const groupSort = sort<Group<User, "city">>();

  it("filters objects by a typed key and value", () => {
    const byCity = userWhere("city", "NY");

    expect(byCity(users)).toEqual([
      { id: 1, name: "John", surname: "Doe", age: 34, city: "NY" },
      { id: 2, name: "John", surname: "Doe", age: 33, city: "NY" },
    ]);
  });

  it("sorts a copy of data by the selected field", () => {
    const byAge = userSort("age");
    const result = byAge(users);

    expect(result.map((user) => user.age)).toEqual([33, 34, 35, 35]);
    expect(result).not.toBe(users);
    expect(users.map((user) => user.age)).toEqual([34, 33, 35, 35]);
  });

  it("composes filtering and sorting steps", () => {
    const search = query(
      userWhere("name", "John"),
      userWhere("surname", "Doe"),
      userSort("age")
    );

    expect(search(users)).toEqual([
      { id: 2, name: "John", surname: "Doe", age: 33, city: "NY" },
      { id: 1, name: "John", surname: "Doe", age: 34, city: "NY" },
      { id: 3, name: "John", surname: "Doe", age: 35, city: "LA" },
    ]);
  });

  it("groups items by a selected key", () => {
    const grouped = userGroupBy("city")(users);

    expect(grouped).toEqual<Group<User, "city">[]>([
      {
        key: "NY",
        items: [
          { id: 1, name: "John", surname: "Doe", age: 34, city: "NY" },
          { id: 2, name: "John", surname: "Doe", age: 33, city: "NY" },
        ],
      },
      {
        key: "LA",
        items: [
          { id: 3, name: "John", surname: "Doe", age: 35, city: "LA" },
          { id: 4, name: "Mike", surname: "Doe", age: 35, city: "LA" },
        ],
      },
    ]);
  });

  it("filters groups with having", () => {
    const grouped = query(
      userGroupBy("city"),
      userHaving<"city">((group) => group.items.length > 1)
    );

    expect(grouped(users)).toHaveLength(2);
  });

  it("supports a mixed pipeline with object and group steps", () => {
    const pipeline = query(
      userWhere("surname", "Doe"),
      userGroupBy("city"),
      userHaving<"city">((group) => group.items.some((user) => user.age > 34)),
      groupSort("key")
    );

    expect(pipeline(users)).toEqual([
      {
        key: "LA",
        items: [
          { id: 3, name: "John", surname: "Doe", age: 35, city: "LA" },
          { id: 4, name: "Mike", surname: "Doe", age: 35, city: "LA" },
        ],
      },
    ]);
  });

  it("returns the same data shape when no steps are provided", () => {
    const identity = query<User>();

    expect(identity(users)).toBe(users);
  });

  it("preserves TypeScript inference for flat and grouped pipelines", () => {
    const search = query(userWhere("name", "John"), userSort("age"));
    const grouped = query(
      userGroupBy("city"),
      userHaving<"city">((group) => group.items.length > 1),
      groupSort("key")
    );
    const typedSearch: Transform<User> = search;
    const typedGrouped: Group<User, "city">[] = grouped(users);

    expectTypeOf(userWhere("name", "John")).toEqualTypeOf<WhereStep<User>>();
    expectTypeOf(userSort("age")).toEqualTypeOf<SortStep<User>>();
    expectTypeOf(userGroupBy("city")).toEqualTypeOf<GroupByStep<User, "city">>();
    expectTypeOf(userHaving<"city">((group) => group.items.length > 1)).toMatchTypeOf<
      HavingStep<User, "city">
    >();
    expect(typedSearch(users)).toHaveLength(3);
    expect(typedGrouped).toHaveLength(2);
  });

  it("accepts only where then optional groupBy then having then sort", () => {
    const validFlat = query(userWhere("surname", "Doe"), userSort("age"));
    const validGrouped = query(
      userWhere("surname", "Doe"),
      userGroupBy("city"),
      userHaving<"city">((group) => group.items.length > 1),
      groupSort("key")
    );

    // @ts-expect-error sort cannot go before where
    query(userSort("age"), userWhere("surname", "Doe"));

    // @ts-expect-error having requires a preceding groupBy
    query(userHaving<"city">((group) => group.items.length > 1));

    // @ts-expect-error where cannot appear after groupBy
    query(userGroupBy("city"), userWhere("surname", "Doe"));

    // @ts-expect-error sort on original objects cannot appear after groupBy
    query(userGroupBy("city"), userHaving<"city">((group) => group.items.length > 1), userSort("age"));

    expect(validFlat(users)).toHaveLength(4);
    expect(validGrouped(users)).toHaveLength(2);
  });
});
