import type { HttpContext } from '#vendor/types/types.js';
import { audioAdapter } from '#app/services/ai/ai-provider.js';
import { llmAudioUsageService } from '#app/services/llm-audio-usage-service.js';
import type { TeacherSttResponse } from 'shared';

export default {
    async transcribe(context: HttpContext): Promise<TeacherSttResponse> {
        context.logger.info('teacher STT transcribe handler');

        if (!context.auth.check()) {
            context.responseData.status = 401;
            return { status: 'error', message: 'Unauthorized' };
        }

        const file = context.httpData.files?.get('audio');
        if (file === undefined) {
            context.responseData.status = 400;
            return { status: 'error', message: 'No audio file provided' };
        }

        const mimeType = file.type.split(';')[0] ?? file.type;

        const maxAttempts = 2;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const text = await audioAdapter.transcribe({ audioBuffer: file.data, mimeType });
                const rawUserId = context.auth.getUserId();
                if (rawUserId !== null) {
                    llmAudioUsageService.record({
                        userId: BigInt(rawUserId),
                        model: audioAdapter.model,
                        feature: 'TEACHER_STT',
                        audioBytes: file.data.byteLength,
                        textLength: text.length,
                    });
                }
                return { status: 'success', text };
            } catch (err) {
                if (attempt < maxAttempts) {
                    context.logger.warn({ err, attempt }, 'STT transcription failed, retrying');
                    continue;
                }
                context.logger.error({ err }, 'STT transcription failed after retry');
                context.responseData.status = 500;
                return { status: 'error', message: 'Transcription failed' };
            }
        }
        // Unreachable, but satisfies TypeScript
        context.responseData.status = 500;
        return { status: 'error', message: 'Transcription failed' };
    },
};
