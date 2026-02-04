import crypto from "crypto";

const COOKIE_NAME = "spotify_refresh";
const STATE_COOKIE = "spotify_oauth_state";

function requireEnv(name: string) {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env var: ${name}`);
    return v;
}

function base64urlEncode(buf: Buffer) {
    return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64urlDecode(s: string) {
    s = s.replace(/-/g, "+").replace(/_/g, "/");
    while (s.length % 4) s += "=";
    return Buffer.from(s, "base64");
}

function keyFromSecret() {
    const secret = requireEnv("COOKIE_SECRET");
    return crypto.createHash("sha256").update(secret, "utf8").digest(); // 32 bytes
}

/**
 * AES-256-GCM seal: output is base64url(iv || tag || ciphertext)
 */
export function sealRefreshToken(refreshToken: string) {
    const key = keyFromSecret();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

    const ciphertext = Buffer.concat([cipher.update(refreshToken, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();

    return base64urlEncode(Buffer.concat([iv, tag, ciphertext]));
}

export function unsealRefreshToken(sealed: string) {
    const key = keyFromSecret();
    const raw = base64urlDecode(sealed);

    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const ciphertext = raw.subarray(28);

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);

    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plaintext.toString("utf8");
}

export function refreshCookieName() {
    return COOKIE_NAME;
}

export function stateCookieName() {
    return STATE_COOKIE;
}
