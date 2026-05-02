import logger from '#vendor/utils/logger.js';
import type { HttpRequest, HttpResponse } from '#vendor/start/server.js';
import { validateHeader } from '#app/validate/checkers/header-checker.js';
import { validateParameter } from '#app/validate/checkers/parameter-checker.js';
import type { Payload, UploadedFile } from '#vendor/types/types.js';
import { validateCookie } from '#app/validate/checkers/cookie-checker.js';
import config from '#config/app.js';
import { getParts } from 'uWebSockets.js';
import { PayloadTooLargeError } from '#vendor/utils/network/errors/payload-too-large-error.js';

// ─── Body kind detection ──────────────────────────────────────────────────────

export type BodyKind = 'json' | 'multipart' | 'urlencoded' | 'text' | 'octet' | 'other';

const JSON_RE = /^application\/json\s*(;|$)/i;

export const detectBodyKind = (contentType: string): BodyKind => {
    const ct = contentType.toLowerCase();
    if (JSON_RE.test(ct)) return 'json';
    if (ct.startsWith('multipart/form-data')) return 'multipart';
    if (ct.startsWith('application/x-www-form-urlencoded')) return 'urlencoded';
    if (ct.startsWith('text/plain')) return 'text';
    if (ct.startsWith('application/octet-stream')) return 'octet';
    return 'other';
};

export const resolveMaxBodySize = (kind: BodyKind): number => {
    switch (kind) {
        case 'json': return config.maxJsonBodySize;
        case 'multipart': return config.maxMultipartBodySize;
        case 'octet': return config.maxOctetStreamBodySize;
        case 'urlencoded':
        case 'text':
        case 'other':
            return config.maxBodySize;
    }
};

// ─── Headers ─────────────────────────────────────────────────────────────────

const getHeaders = (req: HttpRequest): Map<string, string> => {
    const headers: Map<string, string> = new Map<string, string>();
    req.forEach((key, value) => {
        if (validateHeader(key, value)) {
            headers.set(key, value.trim());
        } else {
            logger.warn(`Invalid header detected and skipped: ${key}`);
        }
    });

    return headers;
};

// ─── Body reading ─────────────────────────────────────────────────────────────

/**
 * Single-slot abort signal shared between setHttpHandler and readData.
 * uWebSockets.js res.onAborted() is a single-slot — registering it twice
 * silently replaces the first handler. We register it once in setHttpHandler
 * and wire readData via this object to avoid overwriting the aborted flag.
 */
export interface RequestAbortSignal {
    /** Set to true by setHttpHandler's onAborted. */
    aborted: boolean;
    /** Called by readData to receive abort notification. */
    onAbort?: () => void;
}

const readData = (
    res: HttpResponse,
    limit: number,
    contentType: string,
    abortSignal: RequestAbortSignal,
): Promise<Buffer | null> => {
    return new Promise((resolve: (value: Buffer | null) => void, reject: (reason?: unknown) => void) => {
        // Race-safety: abort may have already fired between setHttpHandler
        // registering res.onAborted and us getting here. In that window
        // abortSignal.onAbort was undefined, so abort was lost — bail out
        // immediately instead of waiting for onData that will never fire.
        if (abortSignal.aborted) {
            reject(new Error('request aborted'));
            return;
        }

        let stopped = false;
        const chunks: Buffer[] = [];
        let totalSize = 0;

        const cleanup = (): void => {
            delete abortSignal.onAbort;
        };

        abortSignal.onAbort = (): void => {
            if (stopped) return;
            stopped = true;
            cleanup();
            reject(new Error('request aborted'));
        };

        res.onData((ab, isLast) => {
            if (stopped) return;
            try {
                const chunk = Buffer.from(new Uint8Array(ab));
                totalSize += chunk.length;

                if (totalSize > limit) {
                    stopped = true;
                    cleanup();
                    reject(new PayloadTooLargeError(limit, contentType));
                    return;
                }

                chunks.push(chunk);

                if (isLast) {
                    stopped = true;
                    cleanup();
                    resolve(chunks.length === 1 ? chunks[0] ?? null : Buffer.concat(chunks));
                }
            } catch (e) {
                stopped = true;
                cleanup();
                logger.error(e, 'error read data');
                reject(new Error('error read data'));
            }
        });
    });
};

// ─── Body parsers ─────────────────────────────────────────────────────────────

const readJson = (body: string): Record<string, unknown> => {
    if (body === '') return {};
    try {
        const result = JSON.parse(body) as unknown;
        if (result !== null && !Array.isArray(result) && typeof result === 'object') return result as Record<string, unknown>;
        throw new Error('error parse json');
    } catch (e) {
        console.error(e);
        throw new Error(`error parse json: ${String(e)}`);
    }
};

interface FormDataResult {
    payload: Record<string, string>;
    files: Map<string, UploadedFile>;
}

const parseUrlEncoded = (buffer: Buffer): Record<string, string> => {
    const payload = Object.create(null) as Record<string, string>;
    const params = new URLSearchParams(buffer.toString());
    for (const [key, value] of params) {
        payload[key] = value;
    }
    return payload;
};

const parseMultipart = (buffer: Buffer, contentType: string): FormDataResult => {
    const payload = Object.create(null) as Record<string, string>;
    const files = new Map<string, UploadedFile>();

    const parts = getParts(buffer, contentType);
    if (parts === undefined) return { payload, files };

    for (const part of parts) {
        if (part.filename !== undefined && part.filename !== '') {
            files.set(part.name, {
                name: part.name,
                filename: part.filename,
                type: part.type ?? 'application/octet-stream',
                data: part.data,
            });
        } else {
            const decoder = new TextDecoder();
            payload[part.name] = decoder.decode(part.data);
        }
    }

    return { payload, files };
};

const buildOctetFile = (buffer: Buffer, headers: Map<string, string>): Map<string, UploadedFile> => {
    const disposition = headers.get('content-disposition') ?? '';
    const filenameMatch = /filename="([^"]+)"/.exec(disposition);
    const filename = filenameMatch?.[1] ?? headers.get('x-filename') ?? 'file';
    const files = new Map<string, UploadedFile>();
    files.set(filename, {
        name: filename,
        filename,
        type: 'application/octet-stream',
        data: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer,
    });
    return files;
};

// ─── getData ──────────────────────────────────────────────────────────────────

const getData = async (
    res: HttpResponse,
    contentType: string,
    headers: Map<string, string>,
    limit: number,
    abortSignal: RequestAbortSignal,
): Promise<{ payload: Payload | null; files: Map<string, UploadedFile> | null }> => {
    const buffer = await readData(res, limit, contentType, abortSignal);
    if (buffer === null) return { payload: null, files: null };

    const kind = detectBodyKind(contentType);
    switch (kind) {
        case 'json':
            return { payload: readJson(buffer.toString()), files: null };
        case 'multipart': {
            const r = parseMultipart(buffer, contentType);
            return { payload: r.payload, files: r.files.size > 0 ? r.files : null };
        }
        case 'urlencoded':
            return { payload: parseUrlEncoded(buffer), files: null };
        case 'text':
            return { payload: buffer.toString(), files: null };
        case 'octet':
            return { payload: null, files: buildOctetFile(buffer, headers) };
        case 'other':
            return { payload: null, files: null };
    }
};

// ─── URL / params helpers ─────────────────────────────────────────────────────

const normalizePath = (path: string): string => {
    if (path === '') return '';
    let normalizedPath = path;
    if (normalizedPath.endsWith('/'))
        normalizedPath = normalizedPath.slice(0, -1);
    if (normalizedPath.startsWith('/'))
        normalizedPath = normalizedPath.slice(1);
    return normalizedPath;
};

const isValidUrl = (url: string): boolean => {
    // Check for multiple consecutive slashes (e.g., //, ///)
    return !/\/\/+/.test(url);
};

const extractParameters = (paramNames: string[], req: HttpRequest): Record<string, string> => {
    const params: Record<string, string> = {};
    for (let i = 0; i < paramNames.length; i++) {
        const paramName = paramNames[i];
        const paramValue = req.getParameter(i) ?? '';
        validateParameter(paramValue, paramName);
        params[paramName ?? 'unknown'] = paramValue;
    }
    return params;
};

const parseCookies = (cookieHeader: string): Map<string, string> => {
    const list = new Map<string, string>();
    if (cookieHeader !== "") {
        const handler = (cookie: string): void => {
            const separatorIndex = cookie.indexOf("=");
            if (separatorIndex === -1) return;
            try {
                const key = cookie.slice(0, separatorIndex).trim();
                const value = cookie.slice(separatorIndex + 1).trim();
                if (validateCookie(key, value)) {
                    list.set(key, decodeURIComponent(value));
                }
            } catch (error) {
                console.error(`Error decoding cookie value ${cookieHeader}":`, error);
            }
        };

        let start = 0;

        for (let i = 0; i <= cookieHeader.length; i++) {
            if (i === cookieHeader.length || cookieHeader[i] === ";") {
                handler(cookieHeader.slice(start, i).trim());
                start = i + 1;
            }
        }
    }

    return list;
};

export { getHeaders, getData, extractParameters, normalizePath, isValidUrl, parseCookies };
