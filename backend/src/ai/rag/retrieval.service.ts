import { Injectable } from '@nestjs/common';
import { Locale, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface RetrievedChunk {
  lessonId: string;
  title: string;
  snippet: string;
  rank: number;
}

/**
 * Retrieval half of Jojo's RAG loop (architecture §11). Deliberately built
 * on Postgres full-text search (`tsvector`/`ts_rank`), not an embeddings +
 * vector-index pipeline:
 *
 *  - The corpus is curated curriculum content — hundreds of lessons, not
 *    millions of documents — where keyword/BM25-style retrieval already
 *    finds the right lesson reliably.
 *  - It needs no new datastore, no embedding API cost per lesson, and no
 *    re-indexing job to keep in sync with edits — a lesson published via
 *    CurriculumService is searchable the instant the transaction commits.
 *  - It matches the project's own principle (§01): boring, operable
 *    infrastructure over cleverness, for a small team to run.
 *
 * If the curriculum corpus grows enough that recall becomes the bottleneck
 * (Phase 3+), the upgrade path is a `LessonEmbedding` table plus pgvector —
 * this service's public interface (`search`) wouldn't need to change.
 */
@Injectable()
export class RetrievalService {
  constructor(private readonly prisma: PrismaService) {}

  /** Top-k published lesson excerpts relevant to `query`, scoped to one locale (and optionally one grade). */
  async search(query: string, locale: Locale, opts: { grade?: number; topK?: number } = {}): Promise<RetrievedChunk[]> {
    const topK = opts.topK ?? 3;

    // Raw SQL: Prisma's query builder has no full-text operators, and this
    // is exactly the kind of query worth writing by hand rather than
    // approximating with `contains`. `Prisma.sql`/`Prisma.empty` compose the
    // optional grade filter safely — string-interpolating it directly would
    // reopen the SQL-injection hole $queryRaw's tagged template exists to close.
    const gradeFilter = opts.grade ? Prisma.sql`AND s.grade = ${opts.grade}` : Prisma.empty;

    const rows = await this.prisma.$queryRaw<{ lessonId: string; title: string; bodyMarkdown: string; rank: number }[]>(
      Prisma.sql`
        SELECT ll."lessonId" AS "lessonId", ll.title, ll."bodyMarkdown",
               ts_rank(to_tsvector('simple', ll.title || ' ' || ll."bodyMarkdown"), plainto_tsquery('simple', ${query})) AS rank
        FROM lesson_locales ll
        JOIN lessons l ON l.id = ll."lessonId"
        JOIN curriculum_units cu ON cu.id = l."unitId"
        JOIN subjects s ON s.id = cu."subjectId"
        WHERE ll.locale = ${locale}::"Locale"
          AND l.published = true
          ${gradeFilter}
          AND to_tsvector('simple', ll.title || ' ' || ll."bodyMarkdown") @@ plainto_tsquery('simple', ${query})
        ORDER BY rank DESC
        LIMIT ${topK}
      `,
    );

    return rows.map((r) => ({
      lessonId: r.lessonId,
      title: r.title,
      snippet: this.excerpt(r.bodyMarkdown, query),
      rank: r.rank,
    }));
  }

  /** A short window of text around the first matching word, so the prompt gets context, not the whole lesson body. */
  private excerpt(body: string, query: string, radius = 160): string {
    const firstTerm = query.split(/\s+/)[0]?.toLowerCase();
    const idx = firstTerm ? body.toLowerCase().indexOf(firstTerm) : -1;
    if (idx === -1) return body.slice(0, radius * 2);
    const start = Math.max(0, idx - radius);
    return `${start > 0 ? '…' : ''}${body.slice(start, start + radius * 2)}…`;
  }
}
