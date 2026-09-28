// =========================================================
//   INTD — Likes
//   Requires config.js to be loaded first (supabaseClient).
//
//   One like per viewer per Fly, enforced by the primary key on
//   fly_likes rather than by anything here. The UI can be clicked
//   twice, double-tapped, or raced across tabs; the database absorbs
//   all of it. This file's job is to reflect the database, not to
//   enforce the rule.
//
//   State is read once on load and then reconciled after every write.
//   The count on screen is always the count the server returned.
// =========================================================

const LIKE_SIGN_IN_PATH = "index.html";

function getFlyLikeButton() {
  return document.getElementById("fly-like");
}

function setLikeNote(message, isError) {
  const note = document.getElementById("like-note");
  if (!note) return;
  note.textContent = message;
  note.className = isError ? "like-note is-error" : "like-note";
}

// The current page, minus the cache-busting junk, so a signed-out tap
// can be sent to sign in and brought back to the same Fly.
function currentFlyReturnPath() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  return id ? "fly.html?id=" + encodeURIComponent(id) : "fly.html";
}

function paintLikeButton(button, likeCount, liked) {
  button.setAttribute("aria-pressed", String(liked));
  button.classList.toggle("is-liked", liked);

  const count = button.querySelector(".like-count");
  if (count) count.textContent = String(likeCount);

  // aria-label overrides the button's own text, so the count has to be
  // named here or a screen reader never hears it.
  const verb = liked ? "Remove your like" : "Like this Fly";
  const noun = likeCount === 1 ? "like" : "likes";
  button.setAttribute("aria-label", verb + ". " + likeCount + " " + noun + ".");
}

// Resolve the session before the first RPC. The server decides
// viewer_has_liked from auth.uid(), so firing the request before the
// persisted session has restored would go out as anonymous and report
// the viewer's own like as absent. The button ships disabled so this
// resolves before anything is clickable.
async function hydrateFlyLike(button, flyId) {
  const { data: { session } } = await supabaseClient.auth.getSession();

  const { data, error } = await supabaseClient.rpc("get_fly_like_state", {
    p_fly_id: flyId,
  });

  if (error || !data || data.length === 0) {
    setLikeNote("Likes are unavailable right now.", true);
    button.disabled = true;
    return;
  }

  const row = Array.isArray(data) ? data[0] : data;
  paintLikeButton(button, row.like_count, row.viewer_has_liked);
  button.disabled = false;
  button.dataset.ready = "true";

  if (session) return;

  // Signed out. The count is public, so the button stays live and
  // sends the visitor to sign in rather than sitting there inert.
  button.addEventListener(
    "click",
    () => {
      const next = encodeURIComponent(currentFlyReturnPath());
      window.location.href = LIKE_SIGN_IN_PATH + "?next=" + next;
    },
    { once: true }
  );
}

async function toggleFlyLike(button, flyId) {
  if (button.disabled || button.dataset.busy === "true") return;

  const liked = button.getAttribute("aria-pressed") === "true";
  const current = Number(button.querySelector(".like-count").textContent) || 0;

  button.dataset.busy = "true";
  button.disabled = true;
  setLikeNote("", false);

  // Optimistic, so the tap feels immediate. The server's count wins
  // either way and is painted below.
  paintLikeButton(button, liked ? current - 1 : current + 1, !liked);

  const { data, error } = await supabaseClient.rpc(liked ? "unlike_fly" : "like_fly", {
    p_fly_id: flyId,
  });

  button.dataset.busy = "false";
  button.disabled = false;

  if (error) {
    // Roll back to what we last knew was true rather than the guess we
    // just made.
    paintLikeButton(button, current, liked);
    setLikeNote(
      error.message === "You must be signed in to like a Fly." ||
      error.message === "You must be signed in to remove a like."
        ? "Sign in to like Flies."
        : "Couldn't save that. Try again.",
      true
    );
    return;
  }

  if (data && data.length > 0) {
    const row = Array.isArray(data) ? data[0] : data;
    paintLikeButton(button, row.like_count, row.viewer_has_liked);
  }
}

function initFlyLike() {
  const button = getFlyLikeButton();
  if (!button) return;

  const flyId = button.dataset.flyId;
  if (!flyId) return;

  // The Fly page renders its template asynchronously, after the Fly
  // itself loads, so this can be reached twice: once from
  // DOMContentLoaded (no button yet, no-op) and once from loadFly right
  // after it injects the markup. Whichever lands second must not wire a
  // second listener onto the same button.
  if (button.dataset.wired === "true") return;
  button.dataset.wired = "true";

  button.addEventListener("click", () => toggleFlyLike(button, flyId));
  hydrateFlyLike(button, flyId);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initFlyLike);
} else {
  initFlyLike();
}
