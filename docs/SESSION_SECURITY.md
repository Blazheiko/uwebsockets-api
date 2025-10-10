# Session Security

## Architecture

The system uses a **two-layer session protection** approach:

1. **HMAC signature** - protects against token forgery
2. **Redis storage** - the single source of truth

## How it works

### Session creation

```
1. Generate UUID sessionId (crypto.randomUUID)
2. Build cookie value: "userId.sessionId" or "sessionId"
3. Add HMAC signature: data.signature
4. Encode in base64
5. Save to Redis with TTL
```

### Session verification

```
1. Decode base64 → get data.signature
2. Verify HMAC signature (constant-time comparison)
3. Extract sessionId from data
4. Query Redis: GET session:userId:sessionId
5. If not found in Redis → create a new guest session
```

## Attack protections

### ✅ Session Fixation

**Protection:** On login, the old session is destroyed and a new one with a fresh sessionId is created.

```typescript
// In context.auth.login:
await destroySession(oldSessionId, oldUserId);
const newSessionInfo = await createSessionInfo({ userId: user.id });
```

### ✅ Token forgery

**Protection:** HMAC signature with a secret key.

```typescript
// Without knowing SECRET_KEY, a valid signature cannot be created
const signature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(data)
    .digest('hex');
```

### ✅ Timing attacks

**Protection:** `crypto.timingSafeEqual()` is used for signature comparison.

```typescript
crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
```

### ✅ Session hijacking

**Protection:**

- httpOnly cookies (not accessible from JavaScript)
- secure cookies (HTTPS only in production)
- sameSite: 'Lax' (configurable)

### ✅ Session expiration

**Protection:** Redis TTL automatically removes expired sessions.

```typescript
// In config/session.ts:
age: Math.floor(duration('2h') / 1000); // Automatic expiration after 2 hours
```

### ✅ SessionId brute force

**Protection:**

- UUID v4 (122 bits of entropy)
- HMAC signature prevents brute forcing attempts

## Protection layers

### Layer 1: Cookie settings

```typescript
{
    httpOnly: true,      // XSS protection
    secure: true,        // HTTPS only
    sameSite: 'Strict',  // CSRF protection
    maxAge: 7200         // 2 hours
}
```

### Layer 2: HMAC signature

- Prevents forgery
- Detects tampering
- Protection against timing attacks
- Uses HMAC-SHA256 (not MD5!)

### Layer 3: Redis validation

- Single source of truth
- Automatic expiration (TTL)
- Centralized session management

## Production setup

### 1. Set the secret key

```bash
export APP_KEY="your-very-long-random-key-minimum-32-characters"
```

**Key generation:**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Configure cookies

```typescript
// config/session.ts
cookie: {
    httpOnly: true,
    secure: true,                    // IMPORTANT: true in production
    sameSite: 'Strict',              // Or 'Lax' if some cross-site flows are needed
    domain: 'yourdomain.com'         // Set your domain
}
```

### 3. Configure Redis

- Use TLS for Redis connections
- Restrict access by IP
- Use a password for Redis

### 4. Monitoring

The system logs suspicious activity:

```typescript
logger.warn({
    ip: context.httpData.ip,
    userAgent: context.httpData.headers.get('user-agent'),
}, 'Invalid or expired access token');
```

Configure alerts for such events.

## Additional recommendations

### Rate Limiting

Add limits on the number of failed attempts:

```typescript
// Maximum 5 failed attempts per hour from one IP
const FAILED_ATTEMPTS_LIMIT = 5;
```

### Secret rotation

For rotating SECRET_KEY without breaking sessions:

```typescript
const SECRETS = [
    process.env.SESSION_SECRET_CURRENT, // Current
    process.env.SESSION_SECRET_PREVIOUS, // Previous (for grace period)
];
```

### Security logging

Log all important events:

- Successful login
- Failed login
- Logout
- Logout all
- Invalid tokens

### CSRF protection

Add CSRF tokens for critical operations:

```typescript
const csrfToken = crypto.randomBytes(32).toString('hex');
sessionInfo.data.csrfToken = csrfToken;
```

## Security verification

### Checklist

- [ ] APP_KEY set in environment variables
- [ ] secure: true in production
- [ ] Redis uses TLS
- [ ] Redis requires a password
- [ ] Monitoring of suspicious activity configured
- [ ] Rate limiting configured
- [ ] Security events are logged
- [ ] Alerts configured

## Testing

### Token forgery test

```bash
# Attempting to use a forged token should be rejected
echo -n "fake.session" | base64
# Result: the server will create a new guest session
```

### Expiration test

```bash
# Wait for TTL to expire
# The old token must be rejected
```

### Session Fixation test

```bash
# 1. Get sessionId before login
# 2. Perform login
# 3. Verify that sessionId has changed
```

## References

- [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [Redis Security](https://redis.io/docs/management/security/)
- [HMAC Best Practices](https://www.rfc-editor.org/rfc/rfc2104)
