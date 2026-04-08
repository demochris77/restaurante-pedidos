import crypto from 'crypto'

/**
 * Generates a 6-digit TOTP code based on a secret and current time.
 */
export function generateTOTP(secret: string, interval = 60): string {
    // We use a 60-second interval by default for restaurants (less aggressive than 30s)
    const time = Math.floor(Date.now() / 1000 / interval)
    return calculateOTP(secret, time)
}

/**
 * Validates a TOTP code, allowing for a window of drift (default ±1 interval).
 */
export function validateTOTP(secret: string, code: string, interval = 60, window = 1): boolean {
    const time = Math.floor(Date.now() / 1000 / interval)
    
    for (let i = -window; i <= window; i++) {
        if (calculateOTP(secret, time + i) === code) {
            return true
        }
    }
    
    return false
}

/**
 * Calculates the OTP for a specific time step.
 * Implements HMAC-based One-Time Password (HOTP) / Time-based (TOTP)
 */
function calculateOTP(secret: string, time: number): string {
    const timeBuf = Buffer.alloc(8)
    // Write time as a 64-bit big-endian integer
    // Note: JS numbers are 64-bit floats, so for timestamps we use BigInt
    timeBuf.writeBigInt64BE(BigInt(time))

    const hmac = crypto.createHmac('sha1', secret)
    hmac.update(timeBuf)
    const digest = hmac.digest()

    // Dynamic truncation
    const offset = digest[digest.length - 1] & 0xf
    const binary = (
        ((digest[offset] & 0x7f) << 24) |
        ((digest[offset + 1] & 0xff) << 16) |
        ((digest[offset + 2] & 0xff) << 8) |
        (digest[offset + 3] & 0xff)
    )

    const otp = binary % 1000000
    return otp.toString().padStart(6, '0')
}

/**
 * Generates a random secret for Dynamic Security mode
 */
export function generateSecuritySecret(): string {
    return crypto.randomBytes(20).toString('hex')
}
