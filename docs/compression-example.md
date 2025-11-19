# Compression Support Example

## Current Implementation
```typescript
// Add compression hint for text files
if (
    mimeType.startsWith('text/') ||
    mimeType.includes('javascript') ||
    mimeType.includes('json')
) {
    res.writeHeader('Vary', 'Accept-Encoding');
}
```

## Future Enhancement - Adding Compression

### 1. Check Accept-Encoding Header
```typescript
const acceptEncoding = req.getHeader('accept-encoding') || '';
const supportsGzip = acceptEncoding.includes('gzip');
const supportsBrotli = acceptEncoding.includes('br');
```

### 2. Compress Content
```typescript
import { gzipSync, brotliCompressSync } from 'zlib';

const compressContent = (data: string | Buffer, encoding: string): Buffer => {
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
    
    switch (encoding) {
        case 'br':
            return brotliCompressSync(buffer);
        case 'gzip':
            return gzipSync(buffer);
        default:
            return buffer;
    }
};
```

### 3. Enhanced Cache Handler
```typescript
const staticCacheHandlerWithCompression = (
    res: HttpResponse,
    req: HttpRequest,
    cachedData: string | Buffer,
) => {
    const acceptEncoding = req.getHeader('accept-encoding') || '';
    const isTextFile = mimeType.startsWith('text/') || 
                      mimeType.includes('javascript') || 
                      mimeType.includes('json');
    
    let finalData = cachedData;
    let contentEncoding = '';
    
    if (isTextFile) {
        if (acceptEncoding.includes('br')) {
            finalData = compressContent(cachedData, 'br');
            contentEncoding = 'br';
        } else if (acceptEncoding.includes('gzip')) {
            finalData = compressContent(cachedData, 'gzip');
            contentEncoding = 'gzip';
        }
        
        // Include encoding in ETag for proper caching
        const etag = `"${finalData.length}-${url.replace(/[^a-zA-Z0-9]/g, '')}-${contentEncoding}"`;
        
        res.writeHeader('Vary', 'Accept-Encoding');
        if (contentEncoding) {
            res.writeHeader('Content-Encoding', contentEncoding);
        }
    }
    
    res.writeHeader('Content-Length', finalData.length.toString());
    res.end(finalData);
};
```

## Benefits of Compression

### Bandwidth Savings
- HTML: ~75% reduction
- CSS: ~65% reduction  
- JavaScript: ~60% reduction
- JSON: ~85% reduction

### Performance Impact
- Faster page loads
- Reduced server bandwidth costs
- Better user experience on slow connections

### SEO Benefits
- Google considers page speed as ranking factor
- Compressed files load faster
- Better Core Web Vitals scores
