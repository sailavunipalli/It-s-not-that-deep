// =========================================================
//   INTD — Profile page
//   Avatar upload + display name editing with a 14-day lock.
//
//   The 14-day lock is ENFORCED IN POSTGRES by a trigger
//   (supabase/migrations/0001_profile_customization.sql). The disabling
//   of the input below is only a courtesy. Do not treat it as the lock.
// =========================================================

const avatarButton = document.getElementById("avatar-button");
const avatarInput = document.getElementById("avatar-input");
const avatarImg = document.getElementById("avatar-img");
const avatarFallback = document.getElementById("avatar-fallback");
const displayNameEl = document.getElementById("display-name");
const displayEmailEl = document.getElementById("display-email");
const editProfileBtn = document.getElementById("edit-profile-btn");
const profileEditor = document.getElementById("profile-editor");
const nameInput = document.getElementById("display-name-input");
const saveNameBtn = document.getElementById("save-name-btn");
const nameLockNote = document.getElementById("name-lock-note");
const profileStatus = document.getElementById("profile-status");

let currentUser = null;
let currentAvatarPath = null;
let nameLockedUntil = null;

function setProfileStatus(message, isError) {
  profileStatus.textContent = message;
  profileStatus.className = isError ? "error-text" : "auth-status-ok";
}

function renderAvatar(path) {
  if (path) {
    const { data } = supabaseClient.storage.from(GALLERY_BUCKET).getPublicUrl(path);
    avatarImg.src = data.publicUrl;
    avatarImg.hidden = false;
    avatarFallback.hidden = true;
    return;
  }
  avatarImg.hidden = true;
  avatarImg.removeAttribute("src");
  avatarFallback.hidden = false;
}

function applyNameCooldown() {
  if (!nameLockedUntil) {
    nameInput.disabled = false;
    saveNameBtn.disabled = false;
    nameLockNote.textContent =
      "You can change this once every " + DISPLAY_NAME_COOLDOWN_DAYS + " days.";
    return;
  }

  nameInput.disabled = true;
  saveNameBtn.disabled = true;
  nameLockNote.textContent =
    "Name locked until " +
    nameLockedUntil.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }) +
    ". You can change it once every " + DISPLAY_NAME_COOLDOWN_DAYS + " days.";
}

function computeNameLock(updatedAt) {
  if (!updatedAt) return null;
  const next = new Date(updatedAt);
  next.setDate(next.getDate() + DISPLAY_NAME_COOLDOWN_DAYS);
  return next.getTime() > Date.now() ? next : null;
}

avatarButton.addEventListener("click", () => avatarInput.click());

avatarInput.addEventListener("change", async () => {
  const raw = avatarInput.files[0];
  avatarInput.value = "";
  if (!raw) return;
  if (!isAcceptedImage(raw)) {
    setProfileStatus("That file isn't an image.", true);
    return;
  }

  setProfileStatus("Processing photo...");
  avatarButton.disabled = true;

  let file;
  try {
    file = await processFileForUpload(raw);
  } catch (err) {
    console.error("Avatar conversion failed:", err);
    setProfileStatus("Couldn't process that photo. Try a different file.", true);
    avatarButton.disabled = false;
    return;
  }

  const filePath = `${currentUser.id}/${AVATAR_PREFIX}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabaseClient.storage
    .from(GALLERY_BUCKET)
    .upload(filePath, file, { upsert: true });

  if (uploadError) {
    setProfileStatus("Upload failed: " + uploadError.message, true);
    avatarButton.disabled = false;
    return;
  }

  const { error: updateError } = await supabaseClient
    .from("profiles")
    .update({ avatar_path: filePath })
    .eq("id", currentUser.id);

  if (updateError) {
    await supabaseClient.storage.from(GALLERY_BUCKET).remove([filePath]);
    setProfileStatus("Couldn't save your photo: " + updateError.message, true);
    avatarButton.disabled = false;
    return;
  }

  currentAvatarPath = filePath;
  renderAvatar(filePath);
  setProfileStatus("Profile photo updated.");
  avatarButton.disabled = false;
});

editProfileBtn.addEventListener("click", () => {
  const opening = profileEditor.hidden;
  profileEditor.hidden = !opening;
  editProfileBtn.textContent = opening ? "Done" : "Customize";
  if (opening) {
    setProfileStatus("");
    applyNameCooldown();
    if (!nameInput.disabled) nameInput.focus();
  }
});

saveNameBtn.addEventListener("click", async () => {
  const nextName = nameInput.value.trim();

  if (!nextName) {
    setProfileStatus("Display name can't be empty.", true);
    return;
  }
  if (nextName === displayNameEl.textContent) {
    setProfileStatus("That's already your display name.");
    return;
  }

  saveNameBtn.disabled = true;
  setProfileStatus("Saving...");

  const { error } = await supabaseClient
    .from("profiles")
    .update({ display_name: nextName })
    .eq("id", currentUser.id);

  if (error) {
    saveNameBtn.disabled = false;
    // The trigger raises the 14-day error. Surface it as-is.
    setProfileStatus(error.message, true);
    return;
  }

  displayNameEl.textContent = nextName;
  const until = new Date();
  until.setDate(until.getDate() + DISPLAY_NAME_COOLDOWN_DAYS);
  nameLockedUntil = until;
  applyNameCooldown();
  setProfileStatus("Display name updated. It's locked for " + DISPLAY_NAME_COOLDOWN_DAYS + " days.");
});

async function loadMyFlies(user) {
  const { data: flies, error: fliesError } = await supabaseClient
    .from("flies")
    .select("id, claim, description, created_at, evidence_image_path")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const fliesList = document.getElementById("flies-list");
  fliesList.innerHTML = "";

  if (fliesError) {
    fliesList.innerHTML = `<div class="feed-state"><p>Error loading Flies: ${escapeHtml(fliesError.message)}</p></div>`;
    return;
  }

  if (flies.length === 0) {
    fliesList.innerHTML = `<div class="feed-state"><p>No Flies created yet.</p></div>`;
    return;
  }

  for (const fly of flies) {
    const article = document.createElement("article");
    article.className = "my-fly-card";

    let imageHtml = "";
    if (fly.evidence_image_path) {
      const { data: signedData } = await supabaseClient.storage
        .from(EVIDENCE_BUCKET)
        .createSignedUrl(fly.evidence_image_path, 3600);
      if (signedData) {
        imageHtml = `<div class="feed-card-image"><img src="${signedData.signedUrl}" alt="Evidence thumbnail" /></div>`;
      }
    }

    article.innerHTML = `
      ${imageHtml}
      <div class="feed-card-content">
        <div class="feed-card-meta">CREATED ${new Date(fly.created_at).toLocaleDateString()}</div>
        <h2 class="feed-card-claim">${escapeHtml(fly.claim)}</h2>
        <p class="feed-card-description">${escapeHtml(fly.description)}</p>
        <div class="feed-card-footer">
          <a href="edit.html?id=${encodeURIComponent(fly.id)}" class="secondary-btn">Edit Fly</a>
          <button type="button" class="secondary-btn delete-btn" data-id="${fly.id}" data-image="${fly.evidence_image_path || ""}">Delete</button>
        </div>
      </div>`;

    fliesList.appendChild(article);
  }

  fliesList.addEventListener("click", function (e) {
    if (e.target.classList.contains("delete-btn")) {
      deleteFly(e.target.dataset.id, e.target.dataset.image, e.target.closest("article"));
    }
  });
}

async function deleteFly(flyId, imagePath, cardElement) {
  const confirmed = confirm("Delete this Fly? This action cannot be undone.");
  if (!confirmed) return;

  const { error } = await supabaseClient.from("flies").delete().eq("id", flyId);
  if (error) {
    alert("Error deleting Fly: " + error.message);
    return;
  }

  if (imagePath) {
    await supabaseClient.storage.from(EVIDENCE_BUCKET).remove([imagePath]);
  }

  cardElement.remove();
}

async function init() {
  const {
    data: { session },
  } = await supabaseClient.auth.getSession();

  if (!session) {
    window.location.href = "index.html";
    return;
  }

  currentUser = session.user;
  displayEmailEl.textContent = session.user.email || "";

  const { data: profile } = await supabaseClient
    .from("profiles")
    .select("display_name, avatar_path, display_name_updated_at")
    .eq("id", currentUser.id)
    .maybeSingle();

  const displayName = profile?.display_name || currentUser.email || "Author Profile";
  displayNameEl.textContent = displayName;
  nameInput.value = displayName;

  currentAvatarPath = profile?.avatar_path || null;
  renderAvatar(currentAvatarPath);

  nameLockedUntil = computeNameLock(profile?.display_name_updated_at);
  applyNameCooldown();

  await loadMyFlies(currentUser);
}

init();
