from pathlib import Path


def swap(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text(encoding="utf-8")
    if text.count(old) != 1:
        raise SystemExit(f"unexpected fixture shape: {path}")
    file.write_text(text.replace(old, new, 1), encoding="utf-8")


swap(
    "tests/offer-unit-integrity.test.ts",
    "        update: vi.fn(),\n      },\n      lead: {",
    "        update: vi.fn(),\n        updateMany: vi.fn().mockResolvedValue({ count: 0 }),\n      },\n      lead: {",
)

swap(
    "tests/support-operational-closure.test.ts",
    '    expect(destination).toContain("SUPPORT_NOTIFICATION_TIMEOUT_MS");',
    '    expect(destination).not.toContain("Promise.race");\n    expect(destination).not.toContain("SUPPORT_NOTIFICATION_TIMEOUT_MS");\n    expect(destination).toContain("textBody: input.message");',
)

print("R1C_VERIFICATION_FIXTURES_APPLIED")
