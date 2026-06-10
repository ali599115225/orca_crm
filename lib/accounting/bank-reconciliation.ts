import { prisma } from '@/lib/prisma';

export interface BankStatementLine {
  date: string;
  description: string;
  reference: string;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
  rawLine: string;
}

export interface ReconciliationMatch {
  statementLine: BankStatementLine;
  glEntry: {
    id: string;
    date: string;
    description: string;
    amount: number;
    entryNumber: number;
  };
  difference: number;
  confidence: number;
}

export interface ReconciliationResult {
  matches: ReconciliationMatch[];
  unmatchedStatement: BankStatementLine[];
  unmatchedGL: {
    id: string;
    date: string;
    description: string;
    amount: number;
    entryNumber: number;
  }[];
  reconciled: boolean;
  summary: {
    totalStatementCredits: number;
    totalStatementDebits: number;
    totalGLCredits: number;
    totalGLDebits: number;
    netDifference: number;
  };
}

function parseAmount(amountStr: string): number {
  const cleaned = amountStr.replace(/[^\d.-]/g, '');
  return parseFloat(cleaned) || 0;
}

export function parseCsvStatement(csvContent: string): BankStatementLine[] {
  const lines = csvContent.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const results: BankStatementLine[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map((c) => c.replace(/^"|"$/g, '').trim());
    if (cols.length < 3) continue;

    const date = cols[0];
    const description = cols[1];
    const reference = cols.length > 3 ? cols[2] : '';
    const amountIdx = cols.length > 3 ? 3 : 2;
    const amountCol = cols[amountIdx] || '0';
    const amount = parseAmount(amountCol);

    results.push({
      date,
      description,
      reference,
      amount: Math.abs(amount),
      type: amount >= 0 ? 'CREDIT' : 'DEBIT',
      rawLine: line,
    });
  }
  return results;
}

function fuzzyMatchScore(desc1: string, desc2: string): number {
  const normalize = (s: string) =>
    s.toLowerCase().replace(/[^a-zA-Z0-9\u0621-\u064A]/g, ' ').replace(/\s+/g, ' ').trim();
  const a = normalize(desc1);
  const b = normalize(desc2);
  if (a === b) return 1.0;
  const wordsA = new Set(a.split(' '));
  const wordsB = b.split(' ');
  let matches = 0;
  for (const w of wordsB) {
    if (wordsA.has(w)) matches++;
  }
  return wordsB.length > 0 ? matches / wordsB.length : 0;
}

export async function reconcileBankStatement(
  tenantId: string,
  statementLines: BankStatementLine[],
  cashAccountCodes: string[] = ['1.1.1', '1.1.2']
): Promise<ReconciliationResult> {
  const cashAccounts = await prisma.account.findMany({
    where: { tenantId, code: { in: cashAccountCodes }, isActive: true },
  });

  const cashAccountIds = cashAccounts.map((a) => a.id);

  const glLines = await prisma.journalLine.findMany({
    where: {
      accountId: { in: cashAccountIds },
      journalEntry: { tenantId, status: 'POSTED' },
    },
    include: {
      journalEntry: { select: { id: true, entryNumber: true, description: true, postedAt: true } },
    },
    orderBy: { journalEntry: { postedAt: 'desc' } },
  });

  const glEntries = glLines.map((l) => ({
    id: l.journalEntry.id,
    date: l.journalEntry.postedAt.toISOString().split('T')[0],
    description: l.journalEntry.description,
    amount: Number(l.debit) || Number(l.credit),
    type: Number(l.debit) > 0 ? ('DEBIT' as const) : ('CREDIT' as const),
    entryNumber: l.journalEntry.entryNumber,
  }));

  const matches: ReconciliationMatch[] = [];
  const unmatchedStatement: BankStatementLine[] = [];
  const matchedGLIds = new Set<string>();

  for (const stmtLine of statementLines) {
    let bestMatch: (typeof glEntries)[0] | null = null;
    let bestScore = 0;
    let bestDiff = Infinity;

    for (const gl of glEntries) {
      if (matchedGLIds.has(gl.id)) continue;
      const diff = Math.abs(stmtLine.amount - gl.amount);
      const descScore = fuzzyMatchScore(stmtLine.description, gl.description);
      const amountScore = diff < 1 ? 1 : diff < 10 ? 0.5 : 0;
      const score = descScore * 0.4 + amountScore * 0.6;

      if (score > bestScore && diff < stmtLine.amount * 0.5) {
        bestScore = score;
        bestMatch = gl;
        bestDiff = diff;
      }
    }

    if (bestMatch && bestScore > 0.3) {
      matchedGLIds.add(bestMatch.id);
      matches.push({
        statementLine: stmtLine,
        glEntry: bestMatch,
        difference: bestDiff,
        confidence: bestScore,
      });
    } else {
      unmatchedStatement.push(stmtLine);
    }
  }

  const unmatchedGL = glEntries
    .filter((gl) => !matchedGLIds.has(gl.id))
    .map((gl) => ({
      id: gl.id,
      date: gl.date,
      description: gl.description,
      amount: gl.amount,
      entryNumber: gl.entryNumber,
    }));

  const totalStatementCredits = statementLines
    .filter((s) => s.type === 'CREDIT')
    .reduce((sum, s) => sum + s.amount, 0);
  const totalStatementDebits = statementLines
    .filter((s) => s.type === 'DEBIT')
    .reduce((sum, s) => sum + s.amount, 0);
  const totalGLCredits = glEntries
    .filter((g) => g.type === 'CREDIT')
    .reduce((sum, g) => sum + g.amount, 0);
  const totalGLDebits = glEntries
    .filter((g) => g.type === 'DEBIT')
    .reduce((sum, g) => sum + g.amount, 0);

  return {
    matches,
    unmatchedStatement,
    unmatchedGL,
    reconciled: unmatchedStatement.length === 0 && unmatchedGL.length === 0,
    summary: {
      totalStatementCredits,
      totalStatementDebits,
      totalGLCredits,
      totalGLDebits,
      netDifference: (totalStatementCredits - totalStatementDebits) - (totalGLCredits - totalGLDebits),
    },
  };
}
