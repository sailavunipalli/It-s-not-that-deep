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
//   The same button appears in three places: the Fly page, a public
//   feed card, and a card on the author's own profile. They all call
//   into the same two functions below so the behaviour cannot drift
//   between them.
//
//   State is read before anything is clickable, and the server's count
//   is painted after every write. The number on screen is always the
//   number the server returned.
// =========================================================

const LIKE_SIGN_IN_PATH = "index.html";

// The one definition of what a like control looks like. The public feed
// card and the author's own profile card both call this, so the two
// lists cannot drift apart visually. Rendered disabled: the real state
// arrives from hydrateLikeButtons once it is known.
function buildLikeButtonHtml(flyId, likeCount) {
  const count = Number(likeCount) || 0;
  return `
    <button type="button"
            class="like-btn"
            data-fly-id="${escapeHtml(flyId || "")}"
            aria-pressed="false"
            aria-label="Like this Fly. ${count} ${count === 1 ? "like" : "likes"}."
            disabled>
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
      <span class="like-count">${count}</span>
    </button>`;
}

function setLikeNote(message, isError, scope) {
  const note = (scope || document).querySelector(".like-note");
  if (!note) return;
  note.textContent = message;
  note.className = isError ? "like-note is-error" : "like-note";
}

// The current page, minus cache-busting junk, so a signed-out tap can
// be sent to sign in and brought back to where they were.
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

async function toggleLike(button, flyId, scope) {
  if (button.disabled || button.dataset.busy === "true") return;

  // Resolve the session here rather than trusting the state captured at
  // load, in case the visitor signed in on another tab.
  const { data: { session } } = await supabaseClient.auth.getSession();

  if (!session) {
    const next = encodeURIComponent(currentFlyReturnPath());
    window.location.href = LIKE_SIGN_IN_PATH + "?next=" + next;
    return;
  }

  const liked = button.getAttribute("aria-pressed") === "true";
  const current = Number(button.querySelector(".like-count").textContent) || 0;

  button.dataset.busy = "true";
  button.disabled = true;
  setLikeNote("", false, scope);

  // Optimistic, so the tap feels immediate. The server's count wins
  // either way and is painted below.
  paintLikeButton(button, liked ? current - 1 : current + 1, !liked);

  const { data, error } = await supabaseClient.rpc(liked ? "unlike_fly" : "like_fly", {
    p_fly_id: flyId,
  });

  button.dataset.busy = "false";
  button.disabled = false;

  if (error) {
    // Roll back to what we last knew was true rather than the guess.
    paintLikeButton(button, current, liked);
    setLikeNote(
      error.message === "You must be signed in to like a Fly." ||
      error.message === "You must be signed in to remove a like."
        ? "Sign in to like Flies."
        : "Couldn't save that. Try again.",
      true,
      scope
    );
    return;
  }

  if (data && data.length > 0) {
    const row = Array.isArray(data) ? data[0] : data;
    paintLikeButton(button, row.like_count, row.viewer_has_liked);
  }
}

// One delegated listener per container rather than one per button.
function wireLikeButtons(root) {
  if (!root || root.dataset.likesWired === "true") return;
  root.dataset.likesWired = "true";

  root.addEventListener("click", (event) => {
    const button = event.target.closest(".like-btn");
    if (!button || !root.contains(button)) return;
    const flyId = button.dataset.flyId;
    if (!flyId) return;
    event.preventDefault();
    event.stopPropagation();
    toggleLike(button, flyId, root);
  });
}

// Paint every button in root from a lookup of fly_id -> {like_count,
// viewer_has_liked}, and enable them. Split out from hydrateLikeButtons
// so a caller that already has the rows does not have to ask again.
function applyLikeState(root, byId) {
  if (!root) return;

  const buttons = Array.from(root.querySelectorAll(".like-btn"));
  if (buttons.length === 0) return;

  wireLikeButtons(root);

  buttons.forEach((button) => {
    const row = byId.get(button.dataset.flyId);
    if (!row) {
      button.disabled = true;
      return;
    }
    paintLikeButton(button, row.like_count, row.viewer_has_liked);
    button.disabled = false;
    button.dataset.ready = "true";
  });
}

// One query for every card on screen. Buttons are rendered disabled and
// only enabled once this resolves, so nobody can click a button whose
// filled or outline state is still a guess.
async function hydrateLikeButtons(root) {
  if (!root) return;

  const buttons = Array.from(root.querySelectorAll(".like-btn"));
  if (buttons.length === 0) return;

  wireLikeButtons(root);

  const flyIds = buttons
    .map((b) => b.dataset.flyId)
    .filter((id, i, arr) => id && arr.indexOf(id) === i);

  const { data, error } = await supabaseClient.rpc("get_fly_like_counts", {
    p_fly_ids: flyIds,
  });

  if (error || !data) {
    setLikeNote("Likes are unavailable right now.", true, root);
    buttons.forEach((b) => {
      b.disabled = true;
      b.dataset.failed = "true";
    });
    return;
  }

  applyLikeState(root, new Map(data.map((row) => [row.fly_id, row])));
}

// The Fly page has exactly one button and reads its own state.
async function hydrateSingleLike(button, flyId) {
  const { data, error } = await supabaseClient.rpc("get_fly_like_state", {
    p_fly_id: flyId,
  });

  if (error || !data || data.length === 0) {
    setLikeNote("Likes are unavailable right now.", true, document);
    button.disabled = true;
    return;
  }

  const row = Array.isArray(data) ? data[0] : data;
  paintLikeButton(button, row.like_count, row.viewer_has_liked);
  button.disabled = false;
  button.dataset.ready = "true";
}

function initFlyLike() {
  const button = document.getElementById("fly-like");
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

  button.addEventListener("click", () => toggleLike(button, flyId, document));
  hydrateSingleLike(button, flyId);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initFlyLike);
} else {
  initFlyLike();
}
