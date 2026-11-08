
import { authenticate } from "./lib/auth-middleware.mjs";
import { jsonResponse, errorResponse } from "./lib/response.mjs";
import { API_ERRORS } from "./lib/errors.mjs";

function getRoutePath(request) {
  const pathname = new URL(request.url).pathname;

  return pathname
    .replace(/^\/\.netlify\/functions\/api/, "")
    .replace(/^\/api/, "") || "/";
}

export default async function handler(request, context) {
  const path = getRoutePath(request);
  const method = request.method;

  try {
    // Public health endpoint
    if (path === "/health" && method === "GET") {
      return jsonResponse({
        success: true,
        application: "STEM Academy",
        version: "1.1.0",
        status: "operational"
      });
    }

    // Protected session endpoint
    if (path === "/me" && method === "GET") {
      const user = await authenticate(request);

      return jsonResponse({
        success: true,
        data: {
          uid: user.uid,
          role: user.role,
          displayName: user.displayName
        }
      });
    }

    // Unknown route
    return errorResponse(
      "NOT_FOUND",
      "API endpoint not found.",
      404
    );

  } catch (error) {
    const code = API_ERRORS[error.message]
      ? error.message
      : "INTERNAL_ERROR";

    if (code === "INTERNAL_ERROR") {
      // Do not expose internal errors to clients.
      return errorResponse(
        code,
        "An unexpected server error occurred.",
        500
      );
    }

    const details = API_ERRORS[code];

    return errorResponse(
      code,
      details.message,
      details.status
    );
  }
}
