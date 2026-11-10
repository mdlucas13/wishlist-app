// SECTION: State & Storage
// In this demo, wishlists are stored in localStorage by id.
// A real app would use a backend so links work across devices.

const STORAGE_KEY = "wishlink_registries_v1";

/** @typedef {{
 *  id: string;
 *  ownerName: string;
 *  title: string;
 *  items: WishlistItem[];
 * }} Wishlist
 */

/** @typedef {{
 *  id: string;
 *  title: string;
 *  price: string;
 *  link: string;
 *  image: string;
 *  purchased: boolean;
 *  purchasedAt?: string;
 * }} WishlistItem
 */

/** @typedef {{
 *  isOwner: boolean;
 *  wishlist: Wishlist | null;
 * }} ViewModel
 */

// SECTION: DOM
const ownerForm = document.getElementById("create-owner-form");
const openLinkForm = document.getElementById("open-link-form");
const addItemForm = document.getElementById("add-item-form");

const wishlistShell = document.getElementById("active-wishlist-shell");
const wishlistOwnerLabel = document.getElementById("wishlist-owner-label");
const wishlistTitleLabel = document.getElementById("wishlist-title-label");
const shareInput = document.getElementById("share-link");
const copyLinkBtn = document.getElementById("copy-link-btn");

const itemsEmpty = document.getElementById("items-empty");
const itemsList = document.getElementById("items-list");
const wishlistFooter = document.getElementById("wishlist-footer");
const noWishlistMessage = document.getElementById("no-wishlist-message");

// SECTION: Utilities
function loadAllWishlists() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to parse wishlists", e);
    return {};
  }
}

function saveAllWishlists(map) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

function createId() {
  return Math.random().toString(36).slice(2, 10);
}

function getWishlistIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("w") || null;
}

function buildShareLink(id) {
  const url = new URL(window.location.href);
  url.searchParams.set("w", id);
  return url.toString();
}

// SECTION: Render
/** @type {ViewModel} */
let viewModel = { isOwner: false, wishlist: null };

function render() {
  const { wishlist, isOwner } = viewModel;

  if (!wishlist) {
    wishlistShell.classList.add("hidden");
    itemsList.innerHTML = "";
    itemsEmpty.classList.add("hidden");
    wishlistFooter.textContent = "";
    noWishlistMessage.classList.remove("hidden");
    addItemForm.classList.add("hidden");
    return;
  }

  noWishlistMessage.classList.add("hidden");
  wishlistShell.classList.remove("hidden");

  wishlistOwnerLabel.textContent = `${wishlist.ownerName}'s wishlist`;
  wishlistTitleLabel.textContent = wishlist.title;

  const shareLink = buildShareLink(wishlist.id);
  shareInput.value = shareLink;

  if (isOwner) {
    addItemForm.classList.remove("hidden");
  } else {
    addItemForm.classList.add("hidden");
  }

  // Items
  itemsList.innerHTML = "";
  if (!wishlist.items.length) {
    itemsEmpty.classList.remove("hidden");
  } else {
    itemsEmpty.classList.add("hidden");
  }

  wishlist.items.forEach((item) => {
    const visiblePurchased = isOwner ? false : item.purchased;
    const li = document.createElement("li");
    li.className = "item-card" + (visiblePurchased ? " purchased" : "");
    li.dataset.itemId = item.id;

    li.innerHTML = `
      <div class="item-media">
        ${
          item.image
            ? `<img src="${item.image}" alt="${
                item.title || "Wishlist item"
              }" class="item-image">`
            : `<div class="item-placeholder"></div>`
        }
      </div>
      <div class="item-main">
        <div class="item-title-row">
          <p class="item-title">${item.title || "Untitled item"}</p>
          ${
            item.price
              ? `<span class="item-price">${item.price}</span>`
              : ""
          }
        </div>
        <div class="item-meta">
          ${
            item.link
              ? `<a href="${item.link}" target="_blank" rel="noopener noreferrer" class="item-link">View link</a>`
              : ""
          }
           <span class="item-status-pill">${
             visiblePurchased ? "Purchased" : "Available"
           }</span>
        </div>
      </div>
      <div class="item-actions"></div>
    `;

    const actions = li.querySelector(".item-actions");

    if (visiblePurchased) {
      const purchaserLabel = document.createElement("div");
      purchaserLabel.className = "item-purchased-label";
      purchaserLabel.textContent = "Marked as purchased";
      const note = document.createElement("div");
      note.className = "item-purchased-note";
      note.textContent = "Others will see that this is no longer available.";

      actions.appendChild(purchaserLabel);
      actions.appendChild(note);

      if (isOwner) {
        const ownerControls = document.createElement("div");
        ownerControls.className = "item-owner-controls";

        const markAvailableBtn = document.createElement("button");
        markAvailableBtn.type = "button";
        markAvailableBtn.className = "btn ghost small";
        markAvailableBtn.textContent = "Mark available";
        markAvailableBtn.addEventListener("click", () =>
          handleTogglePurchased(item.id)
        );

        const deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.className = "btn danger small";
        deleteBtn.textContent = "Remove";
        deleteBtn.addEventListener("click", () => handleDeleteItem(item.id));

        ownerControls.appendChild(markAvailableBtn);
        ownerControls.appendChild(deleteBtn);
        actions.appendChild(ownerControls);
      }
    } else {
      // Not purchased yet
      if (isOwner) {
        const ownerControls = document.createElement("div");
        ownerControls.className = "item-owner-controls";

        const markPurchasedBtn = document.createElement("button");
        markPurchasedBtn.type = "button";
        markPurchasedBtn.className = "btn secondary small";
        markPurchasedBtn.textContent = "Mark purchased";
        markPurchasedBtn.addEventListener("click", () =>
          handleTogglePurchased(item.id)
        );

        const deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.className = "btn danger small";
        deleteBtn.textContent = "Remove";
        deleteBtn.addEventListener("click", () => handleDeleteItem(item.id));

        ownerControls.appendChild(markPurchasedBtn);
        ownerControls.appendChild(deleteBtn);
        actions.appendChild(ownerControls);
      } else {
        const claimBtn = document.createElement("button");
        claimBtn.type = "button";
        claimBtn.className = "btn primary small";
        claimBtn.textContent = "I purchased this";
        claimBtn.addEventListener("click", () => handleTogglePurchased(item.id));
        actions.appendChild(claimBtn);
      }
    }

    itemsList.appendChild(li);
  });

  // Footer summary
  const total = wishlist.items.length;
  const purchasedCount = wishlist.items.filter((i) => i.purchased).length;
  const visiblePurchasedCount = isOwner ? 0 : purchasedCount;
  const remaining = total - visiblePurchasedCount;

  if (!total) {
    wishlistFooter.textContent = "";
    return;
  }
 
  const purchasedLabel = isOwner
    ? "(hidden from owner)"
    : `${visiblePurchasedCount} purchased`;
 
  wishlistFooter.innerHTML = `
    <span><strong>${remaining}</strong> still available</span>
    <span aria-hidden="true">·</span>
    <span>${purchasedLabel}</span>
  `;
}

// SECTION: Mutations
function setWishlist(nextWishlist) {
  const all = loadAllWishlists();
  all[nextWishlist.id] = nextWishlist;
  saveAllWishlists(all);
  viewModel = { ...viewModel, wishlist: nextWishlist };
  render();
}

function handleCreateOwner(event) {
  event.preventDefault();
  const formData = new FormData(ownerForm);
  const ownerName = (formData.get("ownerName") || "").toString().trim();
  const wishlistTitle = (formData.get("wishlistTitle") || "").toString().trim();
  if (!ownerName || !wishlistTitle) return;

  const id = createId();
  const wishlist = {
    id,
    ownerName,
    title: wishlistTitle,
    items: [],
  };

  viewModel.isOwner = true;
  setWishlist(wishlist);
  window.history.replaceState({}, "", buildShareLink(id));
}

function handleOpenLink(event) {
  event.preventDefault();
  const raw = openLinkForm.openLink.value.trim();
  if (!raw) return;

  try {
    const url = new URL(raw);
    const id = url.searchParams.get("w");
    if (!id) {
      alert("That URL doesn't look like a wishlist link.");
      return;
    }
    loadWishlistById(id, false, true);
  } catch (e) {
    alert("Please paste a full wishlist link including 'https://' .");
  }
}

function handleAddItem(event) {
  event.preventDefault();
  if (!viewModel.wishlist) return;

  const data = new FormData(addItemForm);
  const title = (data.get("title") || "").toString().trim();
  const price = (data.get("price") || "").toString().trim();
  const link = (data.get("link") || "").toString().trim();
  const image = (data.get("image") || "").toString().trim();

  if (!title && !link) {
    alert("Add at least a title or a link for the item.");
    return;
  }

  const item = {
    id: createId(),
    title,
    price,
    link,
    image,
    purchased: false,
  };

  const wishlist = {
    ...viewModel.wishlist,
    items: [...viewModel.wishlist.items, item],
  };

  addItemForm.reset();
  setWishlist(wishlist);
}

function handleTogglePurchased(itemId) {
  if (!viewModel.wishlist) return;

  const wishlist = {
    ...viewModel.wishlist,
    items: viewModel.wishlist.items.map((i) =>
      i.id === itemId ? { ...i, purchased: !i.purchased } : i
    ),
  };

  setWishlist(wishlist);
}

function handleDeleteItem(itemId) {
  if (!viewModel.wishlist) return;
  const confirmed = window.confirm("Remove this item from the wishlist?");
  if (!confirmed) return;

  const wishlist = {
    ...viewModel.wishlist,
    items: viewModel.wishlist.items.filter((i) => i.id !== itemId),
  };

  setWishlist(wishlist);
}

function handleCopyLink() {
  if (!shareInput.value) return;

  shareInput.select();
  shareInput.setSelectionRange(0, shareInput.value.length);

  try {
    document.execCommand("copy");
  } catch (e) {
    // execCommand may fail in some environments; ignore
  }

  copyLinkBtn.textContent = "Copied";
  copyLinkBtn.disabled = true;
  setTimeout(() => {
    copyLinkBtn.textContent = "Copy";
    copyLinkBtn.disabled = false;
  }, 1500);
}

// SECTION: Navigation / Loading
function loadWishlistById(id, isOwner, pushUrl) {
  const all = loadAllWishlists();
  const wishlist = all[id] || null;

  viewModel = { isOwner, wishlist };
  render();

  if (wishlist && pushUrl) {
    window.history.replaceState({}, "", buildShareLink(id));
  }
}

// Boot
function init() {
  ownerForm.addEventListener("submit", handleCreateOwner);
  openLinkForm.addEventListener("submit", handleOpenLink);
  addItemForm.addEventListener("submit", handleAddItem);
  copyLinkBtn.addEventListener("click", handleCopyLink);

  const idFromUrl = getWishlistIdFromUrl();
  if (idFromUrl) {
    // Visitor comes from a shared link – viewer mode by default
    loadWishlistById(idFromUrl, false, false);
  } else {
    // No active wishlist yet – keep empty state; owner can create
    viewModel = { isOwner: false, wishlist: null };
    render();
  }
}

window.addEventListener("DOMContentLoaded", init);
