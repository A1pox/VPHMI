import { useEffect, useState } from "react";
import { BookCard } from "./book-card";
import "./app.css";

type ApiBook = {
  id: number;
  title: string;
  isbn: string;
  pageCount: number;
  authors: string[];
};

type BookWithCover = ApiBook & {
  coverBlob: Blob | null;
};

const BOOKS_API_URL = "https://fakeapi.extendsclass.com/books";
const GOOGLE_BOOKS_API_URL = "https://www.googleapis.com/books/v1/volumes";
const MAX_BOOKS = 18;

async function fetchBooks(): Promise<ApiBook[]> {
  const response = await fetch(BOOKS_API_URL);

  if (!response.ok) {
    throw new Error(`Не удалось получить список книг: ${response.status}`);
  }

  const books = (await response.json()) as ApiBook[];
  return books.slice(0, MAX_BOOKS);
}

async function fetchCoverBlob(isbn: string): Promise<Blob | null> {
  if (!isbn) {
    return null;
  }

  const searchResponse = await fetch(`${GOOGLE_BOOKS_API_URL}?q=isbn:${encodeURIComponent(isbn)}`);

  if (!searchResponse.ok) {
    return null;
  }

  const searchResult = (await searchResponse.json()) as {
    items?: Array<{
      volumeInfo?: {
        imageLinks?: {
          thumbnail?: string;
          smallThumbnail?: string;
        };
      };
    }>;
  };

  const thumbnail =
    searchResult.items?.[0]?.volumeInfo?.imageLinks?.thumbnail ??
    searchResult.items?.[0]?.volumeInfo?.imageLinks?.smallThumbnail;

  if (!thumbnail) {
    return null;
  }

  const imageResponse = await fetch(thumbnail.replace("http://", "https://"));

  if (!imageResponse.ok) {
    return null;
  }

  return imageResponse.blob();
}

export default function App() {
  const [books, setBooks] = useState<BookWithCover[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadBooks() {
      try {
        setLoading(true);
        setError(null);

        const apiBooks = await fetchBooks();
        const booksWithCovers = await Promise.all(
          apiBooks.map(async (book) => ({
            ...book,
            coverBlob: await fetchCoverBlob(book.isbn),
          }))
        );

        if (!cancelled) {
          setBooks(booksWithCovers);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error ? loadError.message : "Произошла ошибка при загрузке книг"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadBooks();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="page-shell">
      <section className="hero">
        <p className="hero__eyebrow">Домашнее задание 7</p>
        <h1 className="hero__title">Каталог книг с обложками из Google Books</h1>
        <p className="hero__subtitle">
          Данные о книгах загружаются из `fakeapi.extendsclass.com`, а изображения приходят в
          карточки как `Blob`.
        </p>
      </section>

      {loading ? <p className="status-card">Загрузка книг...</p> : null}
      {error ? <p className="status-card status-card--error">{error}</p> : null}

      {!loading && !error ? (
        <section className="books-grid" aria-label="Список книг">
          {books.map((book) => (
            <BookCard
              key={book.id}
              title={book.title}
              authors={book.authors}
              coverBlob={book.coverBlob}
            />
          ))}
        </section>
      ) : null}
    </main>
  );
}
