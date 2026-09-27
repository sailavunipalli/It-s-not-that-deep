// =========================================================
//   INTD — Public feed renderer
//   Single renderer shared by index.html (home) and feed.html.
//   Renders real published Flies via the get_public_flies RPC.
//   Requires config.js to be loaded first (supabaseClient).
// =========================================================

const FEED_PAGE_SIZE = 6;

function buildFlyCard(fly) {
  const card = document.createElement("article");
  card.className = "feed-card";

  let thumbnailUrl = null;
  if (fly.evidence_image_path) {
    const { data } = supabaseClient.storage
      .from(EVIDENCE_BUCKET)
      .getPublicUrl(fly.evidence_image_path);
    thumbnailUrl = data?.publicUrl || null;
  } else if (fly.image_urls && fly.image_urls.length > 0) {
    thumbnailUrl = fly.image_urls[0];
  }

  const imageHtml = thumbnailUrl
    ? `<div class="feed-card-image"><img src="${escapeHtml(thumbnailUrl)}" alt="Evidence for: ${escapeHtml(fly.claim)}" loading="lazy" /></div>`
    : "";

  const formattedDate = fly.created_at
    ? new Date(fly.created_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";

  card.innerHTML = `
    <a href="fly.html?id=${encodeURIComponent(fly.id)}" class="feed-card-link">
      ${imageHtml}
      <div class="feed-card-content">
        <div class="feed-card-meta">
          <span>FLY</span>
          ${formattedDate ? ` • <span>${escapeHtml(formattedDate)}</span>` : ""}
        </div>
        <h2 class="feed-card-claim">${escapeHtml(fly.claim)}</h2>
        <p class="feed-card-description">${escapeHtml(truncateText(fly.description || "", 180))}</p>
        <span class="feed-card-read">Read Fly →</span>
      </div>
    </a>`;

  return card;
}

function renderEmptyState(container, title, body, actionHref, actionLabel) {
  container.innerHTML = `
    <div class="feed-state">
      <p class="eyebrow">NOTHING HERE YET</p>
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(body)}</p>
      ${actionHref ? `<a href="${escapeHtml(actionHref)}" class="text-link">${escapeHtml(actionLabel)}</a>` : ""}
    </div>`;
}

async function renderPublicFeed() {
  const container =
    document.getElementById("feed-container") || document.getElementById("feed-list");
  if (!container) return;

  container.innerHTML = `<div class="feed-state"><p>Loading Flies...</p></div>`;

  const { data, error } = await supabaseClient.rpc("get_public_flies");

  if (error) {
    console.error("Error loading public Flies:", error);
    container.innerHTML = `
      <div class="feed-state feed-error">
        <h2>Couldn't load the public record</h2>
        <p>Something went wrong retrieving published Flies. Refresh to try again.</p>
      </div>`;
    return;
  }

  if (!data || data.length === 0) {
    renderEmptyState(
      container,
      "No published Flies yet.",
      "Once a Fly is published, it appears here as part of the public record.",
      "index.html",
      "Back to home →"
    );
    return;
  }

  container.innerHTML = "";
  data.slice(0, FEED_PAGE_SIZE).forEach((fly) => {
    container.appendChild(buildFlyCard(fly));
  });

  if (data.length > FEED_PAGE_SIZE) {
    const more = document.createElement("div");
    more.className = "feed-state";
    more.innerHTML = `<a href="feed.html" class="text-link">See all ${data.length} published Flies →</a>`;
    container.appendChild(more);
  }
}

document.addEventListener("DOMContentLoaded", renderPublicFeed);
