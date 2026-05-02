import { db, pool } from '#database/db.js';
import { teacherPhraseAudio } from '#database/schema.js';
import {
    buildStudyAudioHash,
    canonicalizeStudyAudioLanguage,
} from '#app/services/shared/study-audio.js';
import { sql } from 'drizzle-orm';

type LegacyStudyAudioRow = {
    scope: 'syntax_example' | 'syntax_exercise' | 'vocabulary_word' | 'vocabulary_example';
    scope_id: bigint | string;
    voice: string;
    language: string;
    text_value: string;
    voice_src: string;
    created_at: Date | string;
};

async function tableExists(tableName: 'teacher_phrase_audio_legacy' | 'teacher_vocabulary_word_audio' | 'teacher_vocabulary_example_audio'): Promise<boolean> {
    const result = await db.execute(sql`
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name = ${tableName}
        ) AS exists
    `);

    return Boolean((result.rows as { exists: boolean }[]).at(0)?.exists);
}

function toBigInt(value: bigint | string): bigint {
    return typeof value === 'string' ? BigInt(value) : value;
}

async function loadLegacyRows(): Promise<LegacyStudyAudioRow[]> {
    const hasPhraseLegacy = await tableExists('teacher_phrase_audio_legacy');
    const queries: ReturnType<typeof sql>[] = [];

    if (hasPhraseLegacy) {
        queries.push(sql`
            SELECT
                a.scope::text AS scope,
                a.scope_id,
                a.voice,
                l.lang_learning AS language,
                e.sentence AS text_value,
                a.voice_src,
                a.created_at
            FROM teacher_phrase_audio_legacy a
            JOIN teacher_syntax_examples e
              ON a.scope = 'syntax_example' AND a.scope_id = e.id
            JOIN teacher_syntax_lessons l
              ON e.lesson_id = l.id
        `);
        queries.push(sql`
            SELECT
                a.scope::text AS scope,
                a.scope_id,
                a.voice,
                l.lang_learning AS language,
                x.repeat_phrase AS text_value,
                a.voice_src,
                a.created_at
            FROM teacher_phrase_audio_legacy a
            JOIN teacher_syntax_exercises x
              ON a.scope = 'syntax_exercise' AND a.scope_id = x.id
            JOIN teacher_syntax_lessons l
              ON x.lesson_id = l.id
        `);
    }

    if (await tableExists('teacher_vocabulary_word_audio')) {
        queries.push(sql`
            SELECT
                'vocabulary_word'::text AS scope,
                a.word_id AS scope_id,
                a.voice,
                c.lang_learning AS language,
                w.word AS text_value,
                a.voice_src,
                a.created_at
            FROM teacher_vocabulary_word_audio a
            JOIN teacher_vocabulary_words w
              ON a.word_id = w.id
            JOIN teacher_vocabulary_collections c
              ON w.collection_id = c.id
        `);
    }

    if (await tableExists('teacher_vocabulary_example_audio')) {
        queries.push(sql`
            SELECT
                'vocabulary_example'::text AS scope,
                a.example_id AS scope_id,
                a.voice,
                c.lang_learning AS language,
                e.sentence AS text_value,
                a.voice_src,
                a.created_at
            FROM teacher_vocabulary_example_audio a
            JOIN teacher_vocabulary_examples e
              ON a.example_id = e.id
            JOIN teacher_vocabulary_words w
              ON e.word_id = w.id
            JOIN teacher_vocabulary_collections c
              ON w.collection_id = c.id
        `);
    }

    if (queries.length === 0) {
        return [];
    }

    const result = await db.execute(sql.join(queries, sql.raw('\nUNION ALL\n')));
    return result.rows as LegacyStudyAudioRow[];
}

async function main(): Promise<void> {
    const legacyRows = await loadLegacyRows();
    if (legacyRows.length === 0) {
        console.info('No legacy study audio rows found');
        return;
    }

    const deduped = new Map<string, {
        scope: LegacyStudyAudioRow['scope'];
        scopeId: bigint;
        voice: string;
        language: string;
        contentHash: string;
        voiceSrc: string;
        createdAt: Date;
    }>();

    const sortedRows = legacyRows
        .map((row) => ({
            ...row,
            createdAtDate: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
        }))
        .sort((left, right) => right.createdAtDate.getTime() - left.createdAtDate.getTime());

    for (const row of sortedRows) {
        const scopeId = toBigInt(row.scope_id);
        const language = canonicalizeStudyAudioLanguage(row.language);
        const contentHash = buildStudyAudioHash({
            text: row.text_value,
            language,
        });
        const key = [
            row.scope,
            String(scopeId),
            row.voice,
            language,
            contentHash,
        ].join(':');

        if (!deduped.has(key)) {
            deduped.set(key, {
                scope: row.scope,
                scopeId,
                voice: row.voice,
                language,
                contentHash,
                voiceSrc: row.voice_src,
                createdAt: row.createdAtDate,
            });
        }
    }

    const rows = [...deduped.values()];
    const chunkSize = 500;
    await db.transaction(async (tx) => {
        for (let index = 0; index < rows.length; index += chunkSize) {
            const chunk = rows.slice(index, index + chunkSize);
            await tx.insert(teacherPhraseAudio).values(chunk).onConflictDoNothing();
        }
    });

    console.info(`Backfilled ${rows.length} shared study audio rows`);
}

main()
    .catch((error) => {
        console.error('Failed to backfill shared study audio', error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await pool.end();
    });
