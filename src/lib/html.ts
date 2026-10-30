/**
 * Tiny escaping template helper.
 * Interpolated strings are HTML-escaped; nested `html` results are passed through.
 */
export class Safe {
  readonly value: string;
  constructor(value: string) {
    this.value = value;
  }
  toString(): string {
    return this.value;
  }
}

export type Part = string | number | null | undefined | false | Safe | Part[];

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export const esc = (value: unknown): string => String(value).replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c);

export const raw = (value: string): Safe => new Safe(value);

const render = (part: Part): string => {
  if (Array.isArray(part)) return part.map(render).join("");
  if (part instanceof Safe) return part.value;
  if (part === null || part === undefined || part === false) return "";
  return esc(part);
};

export const html = (strings: TemplateStringsArray, ...values: Part[]): Safe =>
  new Safe(strings.reduce((out, chunk, i) => out + chunk + (i < values.length ? render(values[i] as Part) : ""), ""));
