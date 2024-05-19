const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Initialize the Firebase admin app instance for accessing Firestore.
if (admin.apps.length === 0) {// Vérifie si l'app n'est pas déjà initialisée
  admin.initializeApp();
}

// Scheduled function that triggers every 60 minutes.
// This function checks and updates the status of trips based on current time.
exports.manageTripStatus = functions.region("australia-southeast1")
    .runWith({memory: "128MB"}) // Set the memory allocation for this function.
    .pubsub.schedule("every 60 minutes").onRun((context) => {
      const now = admin.firestore.Timestamp.now(); // Current timestamp.
      const logs = []; // Array to store log messages for debugging.
      logs.push(`Current time: ${now.toDate()}`);

      // Calculate the time for "five days ago" from the current time.
      const fiveDaysAgo = new Date(
          now.toDate().getTime() - (5 * 24 * 60 * 60 * 1000),
      );
      logs.push(`Five days ago: ${fiveDaysAgo}`);

      // Reference to the 'trips' collection in Firestore.
      const tripsRef = admin.firestore().collection("trips");

      // Retrieve all trip documents from Firestore.
      return tripsRef.get().then((snapshot) => {
        const batch = admin.firestore().batch(); // Batch to do multiple updates

        // Iterate over each trip document.
        snapshot.forEach((doc) => {
          const trip = doc.data(); // Data for the trip document.
          logs.push(`Analyzing trip ${doc.id}, status: ${trip.status}`);

          // Skip updating if the trip is canceled.
          if (trip.status === "canceled") {
            logs.push(`Trip ${doc.id} is canceled, skipping.`);
            return;
          }

          // Convert Firestore Timestamps to JavaScript Date objects.
          const startTime = trip.startTime.toDate();
          const endTime = trip.endTime.toDate();
          logs.push(`Trip ${doc.id} start: ${startTime}, end: ${endTime}`);

          // Determine the new status based on the trip's start and end times.
          let newStatus = trip.status;

          // Logic to update the trip status based on the current time.
          if (now.toDate() < startTime) {
            newStatus = "confirmed";
            logs.push(`Trip ${doc.id} set to confirmed.`);
          } else if (now.toDate() >= startTime && now.toDate() <= endTime) {
            newStatus = "ongoing";
            logs.push(`Trip ${doc.id} is ongoing.`);
          } else if (now.toDate() > endTime && endTime > fiveDaysAgo) {
            newStatus = "completed";
            logs.push(`Trip ${doc.id} recently completed.`);
          } else if (now.toDate() > fiveDaysAgo) {
            newStatus = "closed";
            logs.push(`Trip ${doc.id} is closed, ended more than 5 days ago.`);
          }

          // Update the document in Firestore if the status has changed.
          if (newStatus !== trip.status) {
            logs.push(`Updating ${doc.id}
             from ${trip.status} to ${newStatus}.`);
            batch.update(doc.ref, {status: newStatus});
          } else {
            logs.push(`No change required for trip ${doc.id}.`);
          }
        });

        // Commit the batch update and log the result.
        return batch.commit().then(() => {
          console.log("Statuses updated successfully.", logs);
        });
      }).catch((error) => {
        // Log any errors that occur during the update process.
        console.error(`Error updating statuses: ${error}`, logs);
      });
    });
