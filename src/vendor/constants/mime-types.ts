/**
 * MIME Types Constants
 *
 * Comprehensive list of MIME types for static file serving.
 * Used by the static server to set appropriate Content-Type headers.
 */

export const MIME_TYPES: Record<string, string> = {
    // Default
    default: 'application/octet-stream',

    // Text files
    html: 'text/html; charset=UTF-8',
    htm: 'text/html; charset=UTF-8',
    txt: 'text/plain; charset=UTF-8',
    xml: 'text/xml; charset=UTF-8',
    csv: 'text/csv; charset=UTF-8',

    // JavaScript and JSON
    js: 'application/javascript; charset=UTF-8',
    mjs: 'application/javascript; charset=UTF-8',
    json: 'application/json; charset=UTF-8',
    jsonld: 'application/ld+json; charset=UTF-8',

    // Stylesheets
    css: 'text/css; charset=UTF-8',
    scss: 'text/x-scss; charset=UTF-8',
    sass: 'text/x-sass; charset=UTF-8',
    less: 'text/x-less; charset=UTF-8',

    // Images
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    ico: 'image/x-icon',
    bmp: 'image/bmp',
    tiff: 'image/tiff',
    tif: 'image/tiff',
    avif: 'image/avif',

    // Audio
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    oga: 'audio/ogg',
    flac: 'audio/flac',
    aac: 'audio/aac',
    m4a: 'audio/mp4',
    weba: 'audio/webm',

    // Video
    mp4: 'video/mp4',
    webm: 'video/webm',
    ogv: 'video/ogg',
    avi: 'video/x-msvideo',
    mov: 'video/quicktime',
    wmv: 'video/x-ms-wmv',
    flv: 'video/x-flv',
    mkv: 'video/x-matroska',
    m4v: 'video/mp4',

    // Fonts
    woff: 'font/woff',
    woff2: 'font/woff2',
    ttf: 'font/ttf',
    otf: 'font/otf',
    eot: 'application/vnd.ms-fontobject',

    // Documents
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    odt: 'application/vnd.oasis.opendocument.text',
    ods: 'application/vnd.oasis.opendocument.spreadsheet',
    odp: 'application/vnd.oasis.opendocument.presentation',
    rtf: 'application/rtf',

    // Archives
    zip: 'application/zip',
    rar: 'application/vnd.rar',
    '7z': 'application/x-7z-compressed',
    tar: 'application/x-tar',
    gz: 'application/gzip',
    bz2: 'application/x-bzip2',
    xz: 'application/x-xz',

    // Web application files
    manifest: 'application/manifest+json',
    webmanifest: 'application/manifest+json',

    // Programming languages
    ts: 'application/typescript; charset=UTF-8',
    tsx: 'application/typescript; charset=UTF-8',
    jsx: 'application/javascript; charset=UTF-8',
    php: 'application/x-httpd-php; charset=UTF-8',
    py: 'text/x-python; charset=UTF-8',
    rb: 'text/x-ruby; charset=UTF-8',
    java: 'text/x-java-source; charset=UTF-8',
    c: 'text/x-c; charset=UTF-8',
    cpp: 'text/x-c++; charset=UTF-8',
    h: 'text/x-c; charset=UTF-8',
    hpp: 'text/x-c++; charset=UTF-8',
    cs: 'text/x-csharp; charset=UTF-8',
    go: 'text/x-go; charset=UTF-8',
    rs: 'text/x-rust; charset=UTF-8',

    // Configuration files
    yaml: 'application/x-yaml; charset=UTF-8',
    yml: 'application/x-yaml; charset=UTF-8',
    toml: 'application/toml; charset=UTF-8',
    ini: 'text/plain; charset=UTF-8',
    conf: 'text/plain; charset=UTF-8',

    // Markdown and documentation
    md: 'text/markdown; charset=UTF-8',
    markdown: 'text/markdown; charset=UTF-8',

    // Other common formats
    bin: 'application/octet-stream',
    exe: 'application/octet-stream',
    dmg: 'application/octet-stream',
    iso: 'application/octet-stream',
    deb: 'application/vnd.debian.binary-package',
    rpm: 'application/x-rpm',
    apk: 'application/vnd.android.package-archive',
} as const;

/**
 * Binary file extensions list
 * Used to determine whether to read files as binary or text
 */
export const BINARY_EXTENSIONS: string[] = [
    // Images
    'png',
    'jpg',
    'jpeg',
    'gif',
    'webp',
    'svg',
    'ico',
    'bmp',
    'tiff',
    'tif',
    'avif',

    // Audio
    'mp3',
    'wav',
    'ogg',
    'oga',
    'flac',
    'aac',
    'm4a',
    'weba',

    // Video
    'mp4',
    'webm',
    'ogv',
    'avi',
    'mov',
    'wmv',
    'flv',
    'mkv',
    'm4v',

    // Fonts
    'woff',
    'woff2',
    'ttf',
    'otf',
    'eot',

    // Documents
    'pdf',
    'doc',
    'docx',
    'xls',
    'xlsx',
    'ppt',
    'pptx',
    'odt',
    'ods',
    'odp',

    // Archives
    'zip',
    'rar',
    '7z',
    'tar',
    'gz',
    'bz2',
    'xz',

    // Other binary formats
    'bin',
    'exe',
    'dmg',
    'iso',
    'deb',
    'rpm',
    'apk',
];
