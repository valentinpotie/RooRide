const functions = require("firebase-functions");
const admin = require("firebase-admin");
const geolib = require("geolib"); // Library for geolocation calculations

// Initialize Firebase admin app if not already initialized
if (admin.apps.length === 0) {
  admin.initializeApp();
}

// Define the cloud function 'findClosestTrips'
exports.findClosestTripsOld = functions.region("australia-southeast1")
    .https.onRequest(async (req, res) => {
      // Validate request parameters for start and end coordinates
      if (!req.query.startLat || !req.query.startLong ||
          !req.query.endLat || !req.query.endLong) {
        return res.status(400).send({
          message: "Missing coordinates in request",
        });
      }

      // Parse user start and end coordinates from request
      const userStart = {
        latitude: parseFloat(req.query.startLat),
        longitude: parseFloat(req.query.startLong),
      };
      const userEnd = {
        latitude: parseFloat(req.query.endLat),
        longitude: parseFloat(req.query.endLong),
      };

      try {
        // Retrieve all trip documents from Firestore
        const tripsSnapshot = await admin.firestore().collection("trips").get();
        const sortedTripIds = [];

        // Calculate total distance for each trip from user's locations
        tripsSnapshot.forEach((doc) => {
          const trip = doc.data();
          const tripStart = trip.startLocation.coordinates;
          const tripEnd = trip.endLocation.coordinates;

          const distanceStart = geolib.getDistance(userStart, tripStart);
          const distanceEnd = geolib.getDistance(userEnd, tripEnd);
          const totalDistance = distanceStart + distanceEnd;

          // Add trip ID and total distance to the array
          sortedTripIds.push({
            id: doc.id,
            totalDistance: totalDistance,
          });
        });

        // Sort trips by total distance in ascending order
        sortedTripIds.sort((a, b) => a.totalDistance - b.totalDistance);

        // Map sorted array to return only trip IDs
        const tripIds = sortedTripIds.map((trip) => trip.id);

        // Send sorted trip IDs as response
        res.status(200).send({sortedTripIds: tripIds});
      } catch (error) {
        // Handle errors, such as issues with Firestore access
        console.error("Error retrieving trips from Firestore:", error);
        res.status(500).send({
          message: "Internal Server Error",
          error: error,
        });
      }
    });
