import {
  groupBy,
  having,
  query,
  sort,
  where,
  type Group,
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

const userWhere = where<User>();
const userSort = sort<User>();
const userGroupBy = groupBy<User>();
const userHaving = having<User>();
const groupSort = sort<Group<User, "city">>();

const search = query(
  userWhere("name", "John"),
  userWhere("surname", "Doe"),
  userSort("age")
);

const groupAndFilter = query(
  userGroupBy("city"),
  userHaving<"city">((group) => group.items.length > 1)
);

const pipeline = query(
  userWhere("surname", "Doe"),
  userGroupBy("city"),
  userHaving<"city">((group) => group.items.some((user) => user.age > 34)),
  groupSort("key")
);

const filteredUsers = search(users);
const groupedUsers = groupAndFilter(users);
const groupedByAdults = pipeline(users);

const printGroups = (title: string, groups: Group<User, "city">[]) => {
  console.log(`\n${title}:`);
  console.log(JSON.stringify(groups, null, 2));
};

console.log("Пример конвейера преобразований");
console.log("\nОтфильтрованные и отсортированные пользователи:");
console.log(JSON.stringify(filteredUsers, null, 2));

printGroups("Группировка по городу с фильтрацией групп", groupedUsers);
printGroups("Комбинированный конвейер", groupedByAdults);
