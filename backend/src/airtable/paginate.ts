export interface Page<T> {
  items: T[];
  offset?: string;
}

export async function paginate<T>(
  fetchPage: (offset?: string) => Promise<Page<T>>,
  onPage: (items: T[]) => Promise<void>
): Promise<number> {
  let offset: string | undefined;
  let total = 0;

  do {
    const page = await fetchPage(offset);
    await onPage(page.items);
    total += page.items.length;
    offset = page.offset;
  } while (offset);

  return total;
}
