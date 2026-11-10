const firebaseConfig = {
  apiKey: "AIzaSyDfGgPJbp_r7u2pmCMBf0eh-P0m9ix1rbQ",
  authDomain: "wishlist-app-4dc57.firebaseapp.com",
  projectId: "wishlist-app-4dc57",
  storageBucket: "wishlist-app-4dc57.firebasestorage.app",
  messagingSenderId: "877035972393",
  appId: "1:877035972393:web:83b0bfbe7a54f857717938",
  measurementId: "G-SFH33ZGYRT"
};

/* global firebase */
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();
const wishlistsRef = db.collection("wishlists");

const authForm = document.getElementById("auth-form");
const authEmail = document.getElementById("auth-email");
const authPassword = document.getElementById("auth-password");
const authMessage = document.getElementById("auth-message");
const authStatus = document.getElementById("auth-status");
const signInBtn = document.getElementById("sign-in-btn");
const signUpBtn = document.getElementById("sign-up-btn");
const signOutBtn = document.getElementById("sign-out-btn");
const signedInControls = document.getElementById("signed-in-controls");
const myWishlists = document.getElementById("my-wishlists");

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

let currentUser = null;
let viewModel = {
  wishlist: null,
  isOwner: false,
  claims: {}
};

function createId() {
  return Math.random().toString(36).slice(2, 10);
}

function getWishlistIdFromUrl() {
  return new URLSearchParams(window.location.search).get("w");
}

function buildShareLink(id) {
  const url = new URL(window.location.href);
  url.searchParams.set("w", id);
  return url.toString();
}

function showAuthMessage(message) {
  authMessage.textContent = message || "";
}

async function signIn() {
  showAuthMessage("");
  try {
    await auth.signInWithEmailAndPassword(
      authEmail.value.trim(),
      authPassword.value
    );
  } catch (error) {
    showAuthMessage(error.message);
  }
}

async function signUp() {
  showAuthMessage("");
  try {
    await auth.createUserWithEmailAndPassword(
      authEmail.value.trim(),
      authPassword.value
    );
  } catch (error) {
    showAuthMessage(error.message);
  }
}

async function loadClaims(wishlistId) {
  let claimsUnsubscribe = null;

function watchClaims(wishlistId) {
  if (claimsUnsubscribe) {
    claimsUnsubscribe();
  }

  claimsUnsubscribe = wishlistsRef
    .doc(wishlistId)
    .collection("claims")
    .onSnapshot(
      (snapshot) => {
        if (viewModel.wishlist?.id !== wishlistId) return;

        const claims = {};
        snapshot.forEach((doc) => {
          claims[doc.id] = doc.data();
        });

        viewModel = { ...viewModel, claims };
        render();
      },
      (error) => {
        console.error("Could not listen for item claims:", error);
      }
    );
}
}

async function loadWishlistById(id, updateUrl = false) {
  try {
    const doc = await wishlistsRef.doc(id).get();

    if (!doc.exists) {
      viewModel = { wishlist: null, isOwner: false, claims: {} };
      render();
      return;
    }

    const wishlist = doc.data();

    viewModel = {
      wishlist: { ...wishlist, items: wishlist.items || [] },
      isOwner: Boolean(currentUser && wishlist.ownerUid === currentUser.uid),
      claims: {}
    };

    if (updateUrl) {
      window.history.replaceState({}, "", buildShareLink(id));
    }

    render();
    watchClaims(id);
  } catch (error) {
    console.error("Could not load wishlist:", error);
    alert(`Could not load wishlist: ${error.message}`);
  }
}

async function loadMyWishlists() {
  myWishlists.replaceChildren();

  if (!currentUser) return;

  try {
    const snapshot = await wishlistsRef
      .where("ownerUid", "==", currentUser.uid)
      .get();

    if (snapshot.empty) {
      myWishlists.textContent = "You haven’t created any wishlists yet.";
      return;
    }

    snapshot.forEach((doc) => {
      const wishlist = doc.data();
      const button = document.createElement("button");
      button.type = "button";
      button.className = "btn ghost full-width wishlist-select";
      button.textContent = wishlist.title || "Untitled wishlist";
      button.addEventListener("click", () => loadWishlistById(doc.id, true));
      myWishlists.appendChild(button);
    });
  } catch (error) {
    console.error("Could not load your wishlists:", error);
    myWishlists.textContent = `Could not load your wishlists: ${error.message}`;
  }
}

function render() {
  const { wishlist, isOwner, claims } = viewModel;

  if (!wishlist) {
    wishlistShell.classList.add("hidden");
    itemsList.replaceChildren();
    itemsEmpty.classList.add("hidden");
    wishlistFooter.textContent = "";
    addItemForm.classList.add("hidden");
    noWishlistMessage.classList.toggle("hidden", !getWishlistIdFromUrl());
    return;
  }

  noWishlistMessage.classList.add("hidden");
  wishlistShell.classList.remove("hidden");
  wishlistOwnerLabel.textContent = `${wishlist.ownerName}'s wishlist`;
  wishlistTitleLabel.textContent = wishlist.title || "Wishlist";
  shareInput.value = buildShareLink(wishlist.id);
  addItemForm.classList.toggle("hidden", !isOwner);

  itemsList.replaceChildren();
  itemsEmpty.classList.toggle("hidden", wishlist.items.length > 0);

  wishlist.items.forEach((item) => {
    const claimed = Boolean(claims[item.id] || item.purchased);
    const li = document.createElement("li");
    li.className = `item-card${claimed && !isOwner ? " purchased" : ""}`;

    const media = document.createElement("div");
    media.className = "item-media";
    if (item.image) {
      const img = document.createElement("img");
      img.className = "item-image";
      img.src = item.image;
      img.alt = item.title || "Wishlist item";
      media.appendChild(img);
    } else {
      const placeholder = document.createElement("div");
      placeholder.className = "item-placeholder";
      media.appendChild(placeholder);
    }

    const main = document.createElement("div");
    main.className = "item-main";

    const titleRow = document.createElement("div");
    titleRow.className = "item-title-row";

    const title = document.createElement("p");
    title.className = "item-title";
    title.textContent = item.title || "Untitled item";
    titleRow.appendChild(title);

    if (item.price) {
      const price = document.createElement("span");
      price.className = "item-price";
      price.textContent = item.price;
      titleRow.appendChild(price);
    }

    const meta = document.createElement("div");
    meta.className = "item-meta";

    if (item.link) {
      const link = document.createElement("a");
      link.className = "item-link";
      link.href = item.link;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "View link";
      meta.appendChild(link);
    }

    const status = document.createElement("span");
    status.className = "item-status-pill";
    status.textContent = isOwner ? "" : claimed ? "No longer needed" : "Available";
    meta.appendChild(status);

    main.append(titleRow, meta);

    const actions = document.createElement("div");
    actions.className = "item-actions";

    if (isOwner) {
      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "btn danger small";
      removeButton.textContent = "Remove";
      removeButton.addEventListener("click", () => handleDeleteItem(item.id));
      actions.appendChild(removeButton);

      if (claims[item.id]) {
        const availableButton = document.createElement("button");
        availableButton.type = "button";
        availableButton.className = "btn ghost small";
        availableButton.textContent = "Mark available";
        availableButton.addEventListener("click", () => clearClaim(item.id));
        actions.appendChild(availableButton);
      }
    } else if (claimed) {
      const label = document.createElement("span");
      label.className = "item-purchased-label";
      label.textContent = "No longer needed";
      actions.appendChild(label);
    } else {
      const claimButton = document.createElement("button");
      claimButton.type = "button";
      claimButton.className = "btn primary small";
      claimButton.textContent = "I purchased this";
      claimButton.addEventListener("click", () => claimItem(item.id));
      actions.appendChild(claimButton);
    }

    li.append(media, main, actions);
    itemsList.appendChild(li);
  });

  const claimedCount = Object.keys(claims).length;
  wishlistFooter.textContent = isOwner
    ? `${wishlist.items.length} item(s). Claim status is hidden from you.`
    : `${Math.max(0, wishlist.items.length - claimedCount)} still available · ${claimedCount} claimed`;
}

async function handleCreateOwner(event) {
  event.preventDefault();

  if (!currentUser) {
    alert("Sign in before creating a wishlist.");
    return;
  }

  const formData = new FormData(ownerForm);
  const ownerName = String(formData.get("ownerName") || "").trim();
  const title = String(formData.get("wishlistTitle") || "").trim();
  if (!ownerName || !title) return;

  const id = createId();
  const wishlist = {
    id,
    ownerUid: currentUser.uid,
    ownerName,
    title,
    items: [],
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  try {
    await wishlistsRef.doc(id).set(wishlist);
    window.history.replaceState({}, "", buildShareLink(id));
    await loadMyWishlists();
    await loadWishlistById(id);
    ownerForm.reset();
  } catch (error) {
    console.error("Could not create wishlist:", error);
    alert(`Could not create wishlist: ${error.message}`);
  }
}

async function handleAddItem(event) {
  event.preventDefault();
  if (!viewModel.isOwner || !viewModel.wishlist) return;

  const data = new FormData(addItemForm);
  const item = {
    id: createId(),
    title: String(data.get("title") || "").trim(),
    price: String(data.get("price") || "").trim(),
    link: String(data.get("link") || "").trim(),
    image: String(data.get("image") || "").trim()
  };

  if (!item.title) return;

  const next = {
    ...viewModel.wishlist,
    items: [...viewModel.wishlist.items, item]
  };

  try {
    await wishlistsRef.doc(next.id).set(next);
    addItemForm.reset();
    await loadWishlistById(next.id);
  } catch (error) {
    console.error("Could not add item:", error);
    alert(`Could not add item: ${error.message}`);
  }
}

async function handleDeleteItem(itemId) {
  if (!viewModel.isOwner || !viewModel.wishlist) return;
  if (!confirm("Remove this item from the wishlist?")) return;

  const id = viewModel.wishlist.id;
  const next = {
    ...viewModel.wishlist,
    items: viewModel.wishlist.items.filter((item) => item.id !== itemId)
  };

  try {
    await wishlistsRef.doc(id).set(next);
    const claimRef = wishlistsRef.doc(id).collection("claims").doc(itemId);
    const claimDoc = await claimRef.get();
    if (claimDoc.exists) await claimRef.delete();
    await loadWishlistById(id);
  } catch (error) {
    console.error("Could not remove item:", error);
    alert(`Could not remove item: ${error.message}`);
  }
}

async function claimItem(itemId) {
  async function claimItem(itemId) {
  if (!currentUser) {
    alert("Sign in to claim an item.");
    return;
  }

  const wishlistId = viewModel.wishlist.id;
  const claimRef = wishlistsRef
    .doc(wishlistId)
    .collection("claims")
    .doc(itemId);

  try {
    await db.runTransaction(async (transaction) => {
      const claimDoc = await transaction.get(claimRef);

      if (claimDoc.exists) {
        throw new Error("Someone has already claimed this item.");
      }

      transaction.set(claimRef, {
        itemId,
        claimedBy: currentUser.uid,
        claimedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    });
  } catch (error) {
    console.error("Could not claim item:", error);
    alert(`Could not claim item: ${error.message}`);
  }
}
}

async function clearClaim(itemId) {
  if (!viewModel.isOwner || !viewModel.wishlist) return;

  try {
    await wishlistsRef
      .doc(viewModel.wishlist.id)
      .collection("claims")
      .doc(itemId)
      .delete();
    await loadWishlistById(viewModel.wishlist.id);
  } catch (error) {
    console.error("Could not clear claim:", error);
    alert(`Could not mark item available: ${error.message}`);
  }
}

async function handleOpenLink(event) {
  event.preventDefault();
  const raw = new FormData(openLinkForm).get("openLink");
  try {
    const url = new URL(String(raw));
    const id = url.searchParams.get("w");
    if (!id) throw new Error("The link must include a wishlist ID.");
    await loadWishlistById(id, true);
  } catch (error) {
    alert(error.message || "Enter a valid full wishlist link.");
  }
}

async function handleCopyLink() {
  if (!shareInput.value) return;
  try {
    await navigator.clipboard.writeText(shareInput.value);
    copyLinkBtn.textContent = "Copied";
    setTimeout(() => (copyLinkBtn.textContent = "Copy"), 1500);
  } catch {
    shareInput.select();
    document.execCommand("copy");
  }
}

signInBtn.addEventListener("click", (event) => {
  event.preventDefault();
  signIn();
});

authForm.addEventListener("submit", (event) => {
  event.preventDefault();
  signIn();
});

signUpBtn.addEventListener("click", signUp);
signOutBtn.addEventListener("click", () => auth.signOut());
ownerForm.addEventListener("submit", handleCreateOwner);
openLinkForm.addEventListener("submit", handleOpenLink);
addItemForm.addEventListener("submit", handleAddItem);
copyLinkBtn.addEventListener("click", handleCopyLink);

auth.onAuthStateChanged(async (user) => {
  currentUser = user;

  signedInControls.classList.toggle("hidden", !user);
  signInBtn.classList.toggle("hidden", Boolean(user));
  signUpBtn.classList.toggle("hidden", Boolean(user));
  signOutBtn.classList.toggle("hidden", !user);
  authEmail.disabled = Boolean(user);
  authPassword.disabled = Boolean(user);

  authStatus.textContent = user ? `Signed in: ${user.email}` : "Not signed in";
  showAuthMessage("");

  await loadMyWishlists();

  const id = getWishlistIdFromUrl();
  if (id) {
    await loadWishlistById(id);
  } else {
    viewModel = { wishlist: null, isOwner: false, claims: {} };
    render();
  }
});
