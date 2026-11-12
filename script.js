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
const storage = firebase.storage();
const wishlistsRef = db.collection("wishlists");

const authForm = document.getElementById("auth-form");
const authEmail = document.getElementById("auth-email");
const authPassword = document.getElementById("auth-password");
const authMessage = document.getElementById("auth-message");
const signInBtn = document.getElementById("sign-in-btn");
const signUpBtn = document.getElementById("sign-up-btn");
const signedOutView = document.getElementById("signed-out-view");
const signedInView = document.getElementById("signed-in-view");
const profileMenuWrap = document.getElementById("profile-menu-wrap");
const profileButton = document.getElementById("profile-button");
const profileMenu = document.getElementById("profile-menu");
const accountButton = document.getElementById("account-button");
const menuSignOutButton = document.getElementById("menu-sign-out-btn");
const wishlistManagement = document.getElementById("wishlist-management");
const wishlistHelpNote = document.getElementById("wishlist-help-note");
const accountView = document.getElementById("account-view");
const accountEmail = document.getElementById("account-email");
const accountMessage = document.getElementById("account-message");
const changePasswordButton = document.getElementById("change-password-btn");
const wishlistTabButtons = Array.from(document.querySelectorAll("[data-wishlist-tab]"));
const wishlistTabPanels = Array.from(document.querySelectorAll(".wishlist-tab-panel"));
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
let claimsUnsubscribe = null;

let viewModel = {
  wishlist: null,
  isOwner: false,
  claims: {}
};

function activateWishlistTab(tabName) {
  wishlistTabButtons.forEach((button) => {
    const active = button.dataset.wishlistTab === tabName;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
    button.tabIndex = active ? 0 : -1;
  });
  wishlistTabPanels.forEach((panel) => {
    const active = panel.id === `panel-${tabName}`;
    panel.hidden = !active;
    panel.classList.toggle("hidden", !active);
  });
}

wishlistTabButtons.forEach((button) => {
  button.addEventListener("click", () => activateWishlistTab(button.dataset.wishlistTab));
});

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
  if (!authForm.reportValidity()) return;

  try {
    await auth.createUserWithEmailAndPassword(
      authEmail.value.trim(),
      authPassword.value
    );
  } catch (error) {
    if (error.code === "auth/email-already-in-use") {
      authPassword.value = "";
      showAuthMessage(
        "This email already has an account. Enter its password, then select Sign in."
      );
      authPassword.focus();
      return;
    }

    showAuthMessage(error.message);
  }
}

function stopWatchingClaims() {
  if (claimsUnsubscribe) {
    claimsUnsubscribe();
    claimsUnsubscribe = null;
  }
}

function watchClaims(wishlistId) {
  stopWatchingClaims();

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

async function loadWishlistById(id, updateUrl = false) {
  stopWatchingClaims();

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
    myWishlists.textContent =
      `Could not load your wishlists: ${error.message}`;
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
    status.textContent = isOwner
      ? ""
      : claimed
        ? "No longer needed"
        : "Available";
    meta.appendChild(status);

    main.append(titleRow, meta);

    const actions = document.createElement("div");
    actions.className = "item-actions";

    if (isOwner) {
      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "btn ghost small";
      editButton.textContent = "Edit";
      editButton.addEventListener("click", () => showItemEditor(li, item));
      actions.appendChild(editButton);

      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "btn danger small";
      removeButton.textContent = "Remove";
      removeButton.addEventListener("click", () => handleDeleteItem(item.id));
      actions.appendChild(removeButton);

    }  else if (claimed) {
  const label = document.createElement("span");
  label.className = "item-purchased-label";
  label.textContent = "No longer needed";
  actions.appendChild(label);

  const claim = claims[item.id];

  if (currentUser && claim?.claimedBy === currentUser.uid) {
    const undoButton = document.createElement("button");
    undoButton.type = "button";
    undoButton.className = "btn ghost small";
    undoButton.textContent = "Undo claim";
    undoButton.addEventListener("click", () => undoClaim(item.id));
    actions.appendChild(undoButton);
  }
}else {
      const claimButton = document.createElement("button");
      claimButton.type = "button";
      claimButton.className = "btn primary small";
      claimButton.textContent = "Purchase this";
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

function showItemEditor(itemCard, item) {
  if (itemCard.querySelector(".item-edit-form")) return;

  const form = document.createElement("form");
  form.className = "item-edit-form";
  form.dataset.itemId = item.id;

  const addField = (labelText, name, type, value = "") => {
    const group = document.createElement("div");
    group.className = "field-group compact";
    const label = document.createElement("label");
    label.textContent = labelText;
    const input = document.createElement("input");
    input.name = name;
    input.type = type;
    input.value = value;
    if (name === "imageFile") input.accept = "image/*";
    if (name === "title") input.required = true;
    group.append(label, input);
    form.appendChild(group);
  };

  addField("Item", "title", "text", item.title || "");
  addField("Price", "price", "text", item.price || "");
  addField("Store link", "link", "url", item.link || "");
  addField("Replace photo (optional)", "imageFile", "file");

  const actions = document.createElement("div");
  actions.className = "item-edit-actions";
  const save = document.createElement("button");
  save.type = "submit";
  save.className = "btn primary small";
  save.textContent = "Save";
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.className = "btn ghost small";
  cancel.textContent = "Cancel";
  cancel.addEventListener("click", () => form.remove());
  actions.append(save, cancel);
  form.appendChild(actions);
  form.addEventListener("submit", handleEditItem);
  itemCard.appendChild(form);
}

async function uploadWishlistImage(file, wishlistId, itemId) {
  if (!file) return null;
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Choose an image smaller than 5 MB.");

  const imageRef = storage.ref().child(
    `wishlist-images/${currentUser.uid}/${wishlistId}/${itemId}`
  );
  const snapshot = await imageRef.put(file);
  return snapshot.ref.getDownloadURL();
}

async function handleEditItem(event) {
  event.preventDefault();
  if (!viewModel.isOwner || !viewModel.wishlist) return;

  const form = event.currentTarget;
  const itemId = form.dataset.itemId;
  const data = new FormData(form);
  const oldItem = viewModel.wishlist.items.find((entry) => entry.id === itemId);
  if (!oldItem) return;

  const saveButton = form.querySelector('button[type="submit"]');
  saveButton.disabled = true;
  saveButton.textContent = "Saving…";

  try {
    const imageFile = data.get("imageFile");
    const image = imageFile?.size
      ? await uploadWishlistImage(imageFile, viewModel.wishlist.id, itemId)
      : oldItem.image;
    const updatedItem = {
      ...oldItem,
      title: String(data.get("title") || "").trim(),
      price: String(data.get("price") || "").trim(),
      link: String(data.get("link") || "").trim(),
      image
    };
    const updatedWishlist = {
      ...viewModel.wishlist,
      items: viewModel.wishlist.items.map((entry) =>
        entry.id === itemId ? updatedItem : entry
      )
    };
    await wishlistsRef.doc(updatedWishlist.id).set(updatedWishlist);
    await loadWishlistById(updatedWishlist.id);
  } catch (error) {
    alert(`Could not update item: ${error.message}`);
    saveButton.disabled = false;
    saveButton.textContent = "Save";
  }
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
    activateWishlistTab("my-wishlists");
  } catch (error) {
    console.error("Could not create wishlist:", error);
    alert(`Could not create wishlist: ${error.message}`);
  }
}

async function handleAddItem(event) {
  event.preventDefault();

  if (!viewModel.isOwner || !viewModel.wishlist) return;

  const data = new FormData(addItemForm);
  const itemId = createId();
  const imageFile = data.get("imageFile");
  const addButton = addItemForm.querySelector('button[type="submit"]');
  addButton.disabled = true;
  addButton.textContent = "Adding…";

  try {
    const image = imageFile?.size
      ? await uploadWishlistImage(imageFile, viewModel.wishlist.id, itemId)
      : "";
    const item = {
      id: itemId,
      title: String(data.get("title") || "").trim(),
      price: String(data.get("price") || "").trim(),
      link: String(data.get("link") || "").trim(),
      image
    };
    if (!item.title) return;

    const next = {
      ...viewModel.wishlist,
      items: [...viewModel.wishlist.items, item]
    };
    await wishlistsRef.doc(next.id).set(next);
    addItemForm.reset();
    await loadWishlistById(next.id);
  } catch (error) {
    console.error("Could not add item:", error);
    alert(`Could not add item: ${error.message}`);
  } finally {
    addButton.disabled = false;
    addButton.textContent = "Add item";
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

    const claimRef = wishlistsRef
      .doc(id)
      .collection("claims")
      .doc(itemId);

    const claimDoc = await claimRef.get();
    if (claimDoc.exists) {
      await claimRef.delete();
    }

    await loadWishlistById(id);
  } catch (error) {
    console.error("Could not remove item:", error);
    alert(`Could not remove item: ${error.message}`);
  }
}

async function undoClaim(itemId) {
  if (!currentUser || !viewModel.wishlist) return;

  const claimRef = wishlistsRef
    .doc(viewModel.wishlist.id)
    .collection("claims")
    .doc(itemId);

  try {
    const claimDoc = await claimRef.get();

    if (!claimDoc.exists || claimDoc.data().claimedBy !== currentUser.uid) {
      alert("Only the person who claimed this item can undo the claim.");
      return;
    }

    await claimRef.delete();
  } catch (error) {
    console.error("Could not undo claim:", error);
    alert(`Could not undo claim: ${error.message}`);
  }
}
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

async function handleOpenLink(event) {
  event.preventDefault();

  const raw = new FormData(openLinkForm).get("openLink");

  try {
    const url = new URL(String(raw));
    const id = url.searchParams.get("w");

    if (!id) {
      throw new Error("The link must include a wishlist ID.");
    }

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
    setTimeout(() => {
      copyLinkBtn.textContent = "Copy";
    }, 1500);
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
profileButton.addEventListener("click", () => {
  const isOpen = profileMenu.classList.toggle("hidden") === false;
  profileButton.setAttribute("aria-expanded", String(isOpen));
});
accountButton.addEventListener("click", () => {
  profileMenu.classList.add("hidden");
  profileButton.setAttribute("aria-expanded", "false");
  wishlistManagement.classList.add("hidden");
  openLinkForm.classList.add("hidden");
  wishlistHelpNote.classList.add("hidden");
  signedInView.classList.add("account-mode");
  accountView.classList.remove("hidden");
  accountMessage.textContent = "";
});
document.getElementById("back-to-wishlists-btn").addEventListener("click", () => {
  accountView.classList.add("hidden");
  signedInView.classList.remove("account-mode");
  wishlistManagement.classList.remove("hidden");
  openLinkForm.classList.remove("hidden");
  wishlistHelpNote.classList.remove("hidden");
});
menuSignOutButton.addEventListener("click", () => auth.signOut());
changePasswordButton.addEventListener("click", async () => {
  if (!currentUser?.email) return;
  try {
    await auth.sendPasswordResetEmail(currentUser.email);
    accountMessage.textContent = `Password reset instructions sent to ${currentUser.email}.`;
  } catch (error) {
    accountMessage.textContent = error.message;
  }
});
ownerForm.addEventListener("submit", handleCreateOwner);
openLinkForm.addEventListener("submit", handleOpenLink);
addItemForm.addEventListener("submit", handleAddItem);
copyLinkBtn.addEventListener("click", handleCopyLink);

auth.onAuthStateChanged(async (user) => {
  currentUser = user;
  signedOutView.classList.toggle("hidden", Boolean(user));
  signedInView.classList.toggle("hidden", !user);
  profileMenuWrap.classList.toggle("hidden", !user);
  accountEmail.value = user?.email || "";
  if (!user) {
    signedInView.classList.remove("account-mode");
    accountView.classList.add("hidden");
    wishlistManagement.classList.remove("hidden");
    openLinkForm.classList.remove("hidden");
    profileMenu.classList.add("hidden");
  }

  await loadMyWishlists();

  const id = getWishlistIdFromUrl();

  if (id) {
    await loadWishlistById(id);
  } else {
    stopWatchingClaims();
    viewModel = { wishlist: null, isOwner: false, claims: {} };
    render();
  }
});
