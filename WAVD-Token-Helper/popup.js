const button = document.getElementById("copy-token");
const status = document.getElementById("status");

function setStatus(message, type = "") {
  status.textContent = message;
  status.className = `status${type ? ` ${type}` : ""}`;
}

function isSunoPage(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname === "suno.com" || hostname.endsWith(".suno.com");
  } catch {
    return false;
  }
}

function tokenExpiryLabel(token) {
  try {
    const payloadPart = token.split(".")[1];
    const normalized = payloadPart.replaceAll("-", "+").replaceAll("_", "/");
    const payload = JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")));
    if (!Number.isFinite(payload.exp)) return "";
    const minutes = Math.max(0, Math.floor((payload.exp * 1000 - Date.now()) / 60000));
    return minutes > 0 ? ` It expires in about ${minutes} min.` : " It is already expired.";
  } catch {
    return "";
  }
}

async function readSunoToken(tabId) {
  const [injection] = await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    func: async () => {
      for (let attempt = 0; attempt < 20; attempt += 1) {
        if (globalThis.Clerk?.session?.getToken) {
          const token = await globalThis.Clerk.session.getToken();
          return token || null;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      return null;
    },
  });
  return injection?.result || null;
}

button.addEventListener("click", async () => {
  button.disabled = true;
  setStatus("Scanning Suno life signs…");
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !isSunoPage(tab.url)) {
      throw new Error("Wrong planet. Open a signed-in page on suno.com first.");
    }
    const token = await readSunoToken(tab.id);
    if (!token) {
      throw new Error("No Suno life signs detected. Refresh the page and sign in again.");
    }
    await navigator.clipboard.writeText(token);
    setStatus(`Token teleported.${tokenExpiryLabel(token)} Paste it into WAVD Desktop before the portal closes.`, "success");
  } catch (error) {
    setStatus(error?.message || "The token teleporter coughed up smoke. Could not copy the token.", "error");
  } finally {
    button.disabled = false;
  }
});
