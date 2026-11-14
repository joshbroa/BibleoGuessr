import { describe, it, expect } from 'vitest';
import { bookForPage, splitTestaments } from '@/lib/contents';

const contents = [
  { book: 'Genesis', page: 1 },
  { book: 'Exodus', page: 152 },
  { book: 'Ruth', page: 773 },
  { book: 'I Samuel', page: 783 },
];

describe('bookForPage', () => {
  it('finds the book a page belongs to', () => {
    expect(bookForPage(contents, 1).book).toBe('Genesis');
    expect(bookForPage(contents, 151).book).toBe('Genesis');
    expect(bookForPage(contents, 152).book).toBe('Exodus');
    expect(bookForPage(contents, 780).book).toBe('Ruth');
    expect(bookForPage(contents, 3000).book).toBe('I Samuel');
  });

  it('copes with no contents yet', () => {
    expect(bookForPage([], 10)).toBeNull();
    expect(bookForPage(null, 10)).toBeNull();
  });
});

describe('splitTestaments', () => {
  it('puts the first 39 books in the Old Testament and the rest in the New', () => {
    const all = Array.from({ length: 66 }, (_, i) => ({ book: `Book ${i + 1}`, page: i + 1 }));
    const { oldTestament, newTestament } = splitTestaments(all);
    expect(oldTestament).toHaveLength(39);
    expect(newTestament).toHaveLength(27);
    expect(newTestament[0].book).toBe('Book 40');
  });
});
