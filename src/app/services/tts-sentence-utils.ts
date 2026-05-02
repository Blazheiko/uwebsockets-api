const EMOJI_REGEX = /[\p{Extended_Pictographic}\p{Regional_Indicator}\u{1F3FB}-\u{1F3FF}\u20E3\uFE0F\u200D]/gu;
const BULLET_REGEX = /[•▪◦●◉○■□◆◇►▶]/g;

export class TtsSentenceQueue {
    private readonly buffer: string[] = [];
    private waiter: (() => void) | null = null;
    private done = false;

    push(sentence: string): void {
        this.buffer.push(sentence);
        if (this.waiter !== null) {
            this.waiter();
            this.waiter = null;
        }
    }

    close(): void {
        this.done = true;
        if (this.waiter !== null) {
            this.waiter();
            this.waiter = null;
        }
    }

    async *[Symbol.asyncIterator](): AsyncGenerator<string> {
        while (true) {
            const item = this.buffer.shift();
            if (item !== undefined) {
                yield item;
            } else if (this.done) {
                return;
            } else {
                await new Promise<void>(resolve => { this.waiter = resolve; });
            }
        }
    }
}

export function extractCompleteSentences(buffer: string): { sentences: string[]; remainder: string } {
    const sentences: string[] = [];
    let segmentStart = 0;
    let pos = 0;

    while (pos < buffer.length) {
        const ch = buffer[pos];
        if (ch !== undefined && /[.!?…؟！？。]/.test(ch)) {
            let end = pos + 1;
            while (end < buffer.length) {
                const nextCh = buffer[end];
                if (nextCh === undefined || !/[.!?…؟！？。]/.test(nextCh)) break;
                end++;
            }
            const afterPunct = buffer[end];
            if (afterPunct !== undefined && /\s/.test(afterPunct)) {
                const sentence = buffer.slice(segmentStart, end).trim();
                if (sentence.length > 0) {
                    sentences.push(sentence);
                }
                end++;
                while (end < buffer.length) {
                    const spaceCh = buffer[end];
                    if (spaceCh === undefined || !/\s/.test(spaceCh)) break;
                    end++;
                }
                segmentStart = end;
                pos = end;
                continue;
            }
        }
        pos++;
    }

    return { sentences, remainder: buffer.slice(segmentStart) };
}

export function prepareTextForTts(text: string): string {
    return text
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/`[^`]*`/g, ' ')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/https?:\/\/\S+/g, ' ')
        .replace(/^#{1,6}\s*/gm, '')
        .replace(/\*{2,3}([^*\n]+)\*{2,3}/g, '$1')
        .replace(/_{2,3}([^_\n]+)_{2,3}/g, '$1')
        .replace(/\*([^*\n]+)\*/g, '$1')
        .replace(/_([^_\n]+)_/g, '$1')
        .replace(/~~([^~\n]+)~~/g, '$1')
        .replace(/^>\s*/gm, '')
        .replace(EMOJI_REGEX, ' ')
        .replace(BULLET_REGEX, '. ')
        .replace(/\n{2,}/g, '. ')
        .replace(/\n/g, ' ')
        .replace(/\s+([,.;!?])/g, '$1')
        .replace(/\s{2,}/g, ' ')
        .trim();
}
