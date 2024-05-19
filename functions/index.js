// Importer les fonctions Firebase
const findClosestTripsOld = require("./findClosestTrips");
const manageTripStatus = require("./manageTripStatus");
const updateWalletOnTripClosed = require("./updateWalletOnTripClosed");


// Exporter les fonctions pour qu'elles puissent être déployées
exports.findClosestTripsOld = findClosestTripsOld;
exports.manageTripStatus = manageTripStatus;
exports.updateWalletOnTripClosed =
 updateWalletOnTripClosed.updateWalletOnTripClosed;
