
import { adminAuth, db } from "./firebase-admin.mjs";

const VALID_ROLES = [
  "admin",
  "teacher",
  "student"
];

export async function authenticate(request) {
  const header = request.headers.get("authorization");

  if (!header || !header.startsWith("Bearer ")) {
    throw new Error("UNAUTHENTICATED");
  }

  const token = header.substring(7).trim();

  if (!token) {
    throw new Error("UNAUTHENTICATED");
  }

  let decoded;

  try {
    decoded = await adminAuth.verifyIdToken(token, true);
  } catch {
    throw new Error("UNAUTHENTICATED");
  }

  const userRef = db.collection("users").doc(decoded.uid);
  const userSnapshot = await userRef.get();

  if (!userSnapshot.exists) {
    throw new Error("ACCOUNT_NOT_CONFIGURED");
  }

  const user = userSnapshot.data();

  if (user.active !== true) {
    throw new Error("ACCOUNT_DISABLED");
  }

  if (!VALID_ROLES.includes(user.role)) {
    throw new Error("INVALID_ROLE");
  }

  return {
    uid: decoded.uid,
    role: user.role,
    active: user.active,
    displayName: user.displayName || ""
  };
}
