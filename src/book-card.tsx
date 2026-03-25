import { useEffect, useState } from "react";

type BookCardProps = {
  title: string;
  authors: string[];
  coverBlob: Blob | null;
};

export function BookCard({ title, authors, coverBlob }: BookCardProps) {
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!coverBlob) {
      setCoverUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(coverBlob);
    setCoverUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [coverBlob]);

  return (
    <article className="book-card">
      <div className="book-card__cover-wrap">
        {coverUrl ? (
          <img className="book-card__cover" src={coverUrl} alt={`Обложка книги ${title}`} />
        ) : (
          <div className="book-card__fallback">
            <span className="book-card__fallback-label">No cover</span>
          </div>
        )}
      </div>
      <div className="book-card__content">
        <h2 className="book-card__title">{title}</h2>
        <p className="book-card__authors">{authors.join(", ") || "Автор неизвестен"}</p>
      </div>
    </article>
  );
}
