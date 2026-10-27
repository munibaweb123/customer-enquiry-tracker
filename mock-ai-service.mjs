
import { createServer } from "node:http";

const PORT = 8787;

// Har enquiry ID ki attempts track hongi.
const attempts = new Map();

const VALID_CATEGORIES = ["Sales", "Support", "Billing", "Other"];

function categorizeMessage(message) {
  const text = message.toLowerCase();

  if (/price|pricing|cost|quote|buy|purchase|sales/.test(text)) {
    return "Sales";
  }

  if (/invoice|bill|billing|payment|refund|charge/.test(text)) {
    return "Billing";
  }

  if (/login|password|error|bug|broken|support|not working/.test(text)) {
    return "Support";
  }

  return "Other";
}

const server = createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  function send(statusCode, data) {
    res.writeHead(statusCode);
    res.end(JSON.stringify(data));
  }

  if (req.method !== "POST" || req.url !== "/categorize") {
    return send(404, { error: "Endpoint not found" });
  }

  let body = "";

  try {
    for await (const chunk of req) {
      body += chunk;

      if (body.length > 1_000_000) {
        return send(413, { error: "Request body too large" });
      }
    }

    const { enquiryId, message } = JSON.parse(body);

    if (
      typeof enquiryId !== "string" ||
      !enquiryId.trim() ||
      typeof message !== "string" ||
      !message.trim()
    ) {
      return send(400, {
        error: "enquiryId and message are required",
      });
    }

    const id = enquiryId.trim();
    const text = message.trim();
    const attempt = (attempts.get(id) ?? 0) + 1;

    attempts.set(id, attempt);

    // Test 1: First attempt fails; retry succeeds.
    if (text.includes("[FAIL_ONCE]") && attempt === 1) {
      return send(503, {
        error: "Temporary mock AI failure",
      });
    }

    // Test 2: First attempt returns an invalid category.
    if (text.includes("[INVALID_ONCE]") && attempt === 1) {
      return send(200, { category: "Unexpected" });
    }

    const cleanMessage = text
      .replace("[FAIL_ONCE]", "")
      .replace("[INVALID_ONCE]", "")
      .trim();

    const category = categorizeMessage(cleanMessage);

    if (!VALID_CATEGORIES.includes(category)) {
      return send(500, { error: "Invalid category" });
    }

    return send(200, { category });
  } catch {
    return send(400, { error: "Invalid JSON request" });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Mock AI service running at http://127.0.0.1:${PORT}`);
  console.log(`Categorization endpoint: http://127.0.0.1:${PORT}/categorize`);
});
