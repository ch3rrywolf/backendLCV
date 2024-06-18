const express = require("express");
const connection = require("../connection");
const router = express.Router();
require("dotenv").config();

//Get_Voitures
router.get(
  "/voiture/all",

  (req, res) => {
    var query =
      "SELECT DISTINCT modelVoiture, imageVoiture, nbrPlace, boiteVitesse, caution, prixParJour FROM voiture";

    connection.query(query, (err, results) => {
      if (!err) {
        return res.status(200).json(results);
      } else {
        return res.status(500).json(err);
      }
    });
  }
);
//Get_Voiture_By_matriculeVoiture
router.get(
  "/voiture/byone",

  (req, res) => {
    let voitureQuery = req.query;
    var query =
      "SELECT modelVoiture, imageVoiture, nbrPlace, boiteVitesse, caution, prixParJour FROM voiture WHERE modelVoiture=? LIMIT 1";

    connection.query(query, [voitureQuery.modelVoiture], (err, results) => {
      if (!err) {
        return res.status(200).json(results);
      } else {
        return res.status(500).json(err);
      }
    });
  }
);
//Reserve_Voiture
router.post(
  "/reserv",

  (req, res, next) => {
    const reservBody = req.body;

    const reservQuery =
      "INSERT INTO reservation (modelVoiture, nomClient, numTel, DateDebReserv, DateFinReserv) VALUES (?,?,?,?,?)";
    connection.query(
      reservQuery,
      [
        reservBody.modelVoiture,
        reservBody.nomClient,
        reservBody.numTel,
        reservBody.DateDebReserv,
        reservBody.DateFinReserv,
      ],
      (err, results) => {
        if (err) {
          console.error("Error adding Reservation:", err);
          return res.status(500).json({ error: "Failed to add Reservation" });
        }
        console.log("Reservation added successfully");
        return res
          .status(200)
          .json({ message: "Reservation added successfully" });
      }
    );
  }
);
module.exports = router;
