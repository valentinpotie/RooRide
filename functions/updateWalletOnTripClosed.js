const functions = require("firebase-functions");
const admin = require("firebase-admin");

exports.updateWalletOnTripClosed = functions.region("australia-southeast1")
    .runWith({memory: "128MB"})
    .firestore.document("trips/{tripId}")
    .onUpdate(async (change, context) => {
      const newValue = change.after.data();
      const oldValue = change.before.data();

      if (oldValue.status !== "closed" && newValue.status === "closed") {
        const driverPath = newValue.driverId;
        const driverId = driverPath.split("/")[1]; // Correct split index

        const driverRef = admin.firestore().collection("users").doc(driverId);
        const price = newValue.pricePerSeat;
        const passengers = newValue.numberOfPassengers;
        const earnings = price * passengers;

        try {
          await admin.firestore().runTransaction(async (transaction) => {
            const driverDoc = await transaction.get(driverRef);
            if (!driverDoc.exists) {
              throw new Error("Driver document missing");
            }
            const newBalance = (driverDoc.data().walletBalance || 0) + earnings;
            transaction.update(driverRef, {walletBalance: newBalance});

            for (let i = 0; i < passengers; i++) {
              const transRef =
              admin.firestore().collection("walletTransactions").doc();
              transaction.set(transRef, {
                userId: driverId,
                transactionType: "tripEarning",
                amount: price,
                transactionDate: admin.firestore.FieldValue.serverTimestamp(),
                relatedTrip: context.params.tripId,
                description: "Earnings from trip",
              });
            }
          });
          console.log(`Wallet updated for driver ${driverId}`);
        } catch (error) {
          console.error("Error updating wallet: ", error);
          throw new functions.https.
          HttpsError("unknown", "Wallet update failed", error);
        }
      }
    });
