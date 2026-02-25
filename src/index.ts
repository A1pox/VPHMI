import {
  calculateArea,
  capitalizeFirstLetter,
  createBook,
  createUser,
  findById,
  getFirstElement,
  getStatusColor,
  type HasId,
  trimAndFormat,
} from "./tasks";

const bookWithYear = createBook({
  title: "1984",
  author: "Джордж Оруэлл",
  year: 1949,
  genre: "fiction",
});

const bookWithoutYear = createBook({
  title: "Слово о полку Игореве",
  author: "Аноним",
  genre: "fiction",
});

const numbers = [1, 2, 3, 4, 5];
const strings = ["яблоко", "бургер", "вишня"];
const emptyArray: number[] = [];

const firstNumber = getFirstElement(numbers);
const firstString = getFirstElement(strings);
const firstEmpty = getFirstElement(emptyArray);

interface Product extends HasId {
  name: string;
  price: number;
}

const products: Product[] = [
  { id: 1, name: "Тушь", price: 1000 },
  { id: 2, name: "Карандаш для глаз", price: 100 },
  { id: 3, name: "Помада", price: 300 },
];

const foundProduct = findById(products, 2);
const notFoundProduct = findById(products, 99);

console.log("Пример использования функций\n");

const user1 = createUser(1, "Екатерина", "ecaterina@example.com");
const user2 = createUser(2, "Поликарп", undefined, false);
console.log("Пользователи:", user1, user2);

console.log("\nКниги:", bookWithYear, bookWithoutYear);

const circleArea = calculateArea("circle", 5);
const squareArea = calculateArea("square", 4);
console.log("\nПлощадь круга (радиус 5):", circleArea);
console.log("Площадь квадрата (сторона 4):", squareArea);

console.log("\nЦвета статусов:");
console.log("active:", getStatusColor("active"));
console.log("inactive:", getStatusColor("inactive"));
console.log("new:", getStatusColor("new"));

console.log("\nФорматирование строк:");
console.log(
  'capitalizeFirstLetter("hello"):',
  capitalizeFirstLetter("hello")
);
console.log(
  'capitalizeFirstLetter("hello", true):',
  capitalizeFirstLetter("hello", true)
);
console.log('trimAndFormat("  hello world  "):', trimAndFormat("  hello world  "));
console.log(
  'trimAndFormat("  hello world  ", true):',
  trimAndFormat("  hello world  ", true)
);

console.log("\nПервые элементы массивов:");
console.log("numbers:", firstNumber);
console.log("strings:", firstString);
console.log("emptyArray:", firstEmpty);

console.log("\nПоиск товаров:");
console.log("Товар с ID 2:", foundProduct);
console.log("Товар с ID 99:", notFoundProduct);
