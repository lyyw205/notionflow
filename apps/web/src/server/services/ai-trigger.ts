const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";
const WEB_CALLBACK_URL = process.env.WEB_CALLBACK_URL || "http://localhost:3000/api";

export async function triggerAIProcessing(
  pageId: string,
  plainText: string
): Promise<void> {
  try {
    const callbackUrl = `${WEB_CALLBACK_URL}/ai/callback`;

    fetch(`${AI_SERVICE_URL}/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        page_id: pageId,
        plain_text: plainText,
        callback_url: callbackUrl,
      }),
    }).catch((err) => {
      console.error(`AI trigger failed for page ${pageId}:`, err.message);
    });
  } catch (err) {
    console.error(`AI trigger error for page ${pageId}:`, err);
  }
}
