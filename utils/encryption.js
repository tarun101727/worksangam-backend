import crypto from "crypto";

const SECRET = process.env.CHAT_SECRET || "guild_secret_key";

// create a 32 byte key for AES-256
const key = crypto.createHash("sha256").update(SECRET).digest();

export function encryptMessage(message) {
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv("aes-256-ctr", key, iv);

  const encrypted = Buffer.concat([
    cipher.update(message, "utf8"),
    cipher.final(),
  ]);

  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

export function decryptMessage(hash) {
  const [ivHex, encryptedHex] = hash.split(":");

  const iv = Buffer.from(ivHex, "hex");
  const encryptedText = Buffer.from(encryptedHex, "hex");

  const decipher = crypto.createDecipheriv("aes-256-ctr", key, iv);

  const decrypted = Buffer.concat([
    decipher.update(encryptedText),
    decipher.final(),
  ]);

  return decrypted.toString();
}