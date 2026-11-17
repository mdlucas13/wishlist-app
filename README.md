# Wishlist App

This is a Christmas wishlist for Kenz and Ash.

## Deploy Firestore rules

The rules in `firestore.rules` protect wishlist ownership, validate claims against each list's `availableItemIds`, and keep claimant UIDs in private `claimOwners` documents. Public `claims` documents contain only an item ID and timestamp so visitors can still see that an item is unavailable.

Deploy them with the Firebase CLI:

```sh
firebase deploy --only firestore:rules --project wishlist-app-4dc57
```

Existing wishlists are initialized with `availableItemIds` when their owner opens each list in the updated app. Until then, new claims on those lists will be rejected by the rules.

Existing claims created by the old app include claimant UIDs in public documents. The updated app migrates a claim into the private `claimOwners` collection and removes the UID when that claimant opens the list while signed in. Until each existing claim is migrated or removed, its UID remains readable from Firestore. For a clean launch, migrate or clear those old claim records before sharing the updated app.
