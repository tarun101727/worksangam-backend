import validator from "validator";
import dns from "dns/promises";

// Disposable domains blacklist (extend anytime)
const DISPOSABLE_DOMAINS = [
  "mailinator.com",
  "tempmail.com",
  "10minutemail.com",
  "guerrillamail.com",
  "yopmail.com",
];

export const validateEmail = async (email) => {
  // Basic format check
  if (!validator.isEmail(email)) {
    return { valid: false, msg: "Invalid email format" };
  }

  const domain = email.split("@")[1].toLowerCase();

  // Block disposable emails
  if (DISPOSABLE_DOMAINS.includes(domain)) {
    return { valid: false, msg: "Disposable email not allowed" };
  }

  // MX record check (can this domain receive email?)
  try {
    const mx = await dns.resolveMx(domain);
    if (!mx || mx.length === 0) {
      return { valid: false, msg: "Email domain cannot receive emails" };
    }
  } catch {
    return { valid: false, msg: "Invalid email domain" };
  }

  return { valid: true };
};
