import { Pipe, PipeTransform } from '@angular/core';

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

@Pipe({ name: 'highlight' })
export class HighlightPipe implements PipeTransform {
  transform(text: string | number | null | undefined, term: string | null | undefined): string {
    const value = escapeHtml(text == null ? '' : String(text));
    const query = (term ?? '').trim();
    if (!query) return value;
    const pattern = new RegExp(`(${escapeRegex(escapeHtml(query))})`, 'gi');
    return value.replace(pattern, '<mark>$1</mark>');
  }
}
