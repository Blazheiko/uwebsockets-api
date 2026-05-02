export type ServiceErrorCode =
    | 'BAD_REQUEST'
    | 'UNAUTHORIZED'
    | 'NOT_FOUND'
    | 'CONFLICT'
    | 'INTERNAL';

export interface ServiceSuccess<T> {
    ok: true;
    data: T;
}

export interface ServiceFailure {
    ok: false;
    code: ServiceErrorCode;
    message: string;
}

export type ServiceResult<T> = ServiceSuccess<T> | ServiceFailure;

export function success<T>(data: T): ServiceSuccess<T> {
    return { ok: true, data };
}

export function failure(code: ServiceErrorCode, message: string): ServiceFailure {
    return { ok: false, code, message };
}
