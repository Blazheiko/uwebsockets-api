export const makeBroadcastJson = (event: string, status: number, payload: any) => makeJson({ event: `broadcast:${event}`, status, payload });
    
export const makeJson = (value: any) => JSON.stringify(value, (_, v) => (typeof v === 'bigint' ? v.toString() : v));