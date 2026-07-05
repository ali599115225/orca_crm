const ARABIC_SCRIPT_RE = /[\u0600-\u06FF]/;
const ARABIC_DIACRITICS_RE =
  /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;

const TOKEN_OVERRIDES: Readonly<Record<string, string>> = Object.freeze({
  "علي": "Ali",
  "محمد": "Mohammed",
  "فيصل": "Faisal",
  "ساره": "Sarah",
  "سليمان": "Sulaiman",
  "عبدالله": "Abdullah",
  "احمد": "Ahmed",
  "خالد": "Khalid",
  "فهد": "Fahad",
  "سلطان": "Sultan",
  "تركي": "Turki",
  "بدر": "Badr",
  "راشد": "Rashed",
  "الشمري": "Al-Shammari",
  "العتيبي": "Al-Otaibi",
  "الحربي": "Al-Harbi",
  "الغامدي": "Al-Ghamdi",
  "الزهراني": "Al-Zahrani",
  "المطيري": "Al-Mutairi",
  "القحطاني": "Al-Qahtani",
  "الدوسري": "Al-Dossari",
  "الشهري": "Al-Shehri",
  "السالم": "Al-Salem",
});

const LETTER_MAP: Readonly<Record<string, string>> = Object.freeze({
  "ا": "a", "ب": "b", "ت": "t", "ث": "th", "ج": "j",
  "ح": "h", "خ": "kh", "د": "d", "ذ": "dh", "ر": "r",
  "ز": "z", "س": "s", "ش": "sh", "ص": "s", "ض": "d",
  "ط": "t", "ظ": "z", "ع": "a", "غ": "gh", "ف": "f",
  "ق": "q", "ك": "k", "ل": "l", "م": "m", "ن": "n",
  "ه": "h", "و": "w", "ي": "y", "ء": "'",
});

function canonicalArabic(value: string): string {
  return value
    .normalize("NFKC")
    .replace(ARABIC_DIACRITICS_RE, "")
    .replace(/\u0640/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .trim();
}

function capitalize(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
}

function transliterateCore(token: string): string {
  let output = "";
  for (const character of Array.from(token)) {
    if (LETTER_MAP[character]) output += LETTER_MAP[character];
    else if (/[A-Za-z0-9'-]/.test(character)) output += character;
  }
  return output.replace(/'{2,}/g, "'").replace(/^['-]+|['-]+$/g, "");
}

function transliterateToken(token: string): string {
  const canonical = canonicalArabic(token);
  if (!canonical) return "";

  const override = TOKEN_OVERRIDES[canonical];
  if (override) return override;
  if (!ARABIC_SCRIPT_RE.test(canonical)) return token;

  if (canonical.startsWith("ال") && canonical.length > 2) {
    const stem = transliterateCore(canonical.slice(2));
    return stem ? `Al-${capitalize(stem)}` : "Al";
  }

  return capitalize(transliterateCore(canonical));
}

export function containsArabicScript(value: string): boolean {
  return ARABIC_SCRIPT_RE.test(value);
}

export function transliterateArabicPersonName(value: string): string {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) return "";
  return normalized.split(" ").map(transliterateToken).filter(Boolean).join(" ");
}
