const express = require("express");
const connection = require("../connection");
const router = express.Router();
const auth = require("../services/authentication");
var checkRoleAdmin = require("../services/checkRole");

require("dotenv").config();

router.get(
  "/",
  auth.authenticateToken,
  checkRoleAdmin.checkRoleAdmin,
  async (req, res) => {
    try {
      //voiture
      const NbrTotalVoiture = await getCount("voiture");

      //contrat
      const NbrTotalContrat = await getCount("contrat");

      //reservation
      const NbrTotalReservation = await getCount("reservation");
      const NbrReservationEnAttente = await getCount(
        "reservation",
        "statusReserv",
        "EN ATTENTE"
      );
      const NbrReservationConfirmer = await getCount(
        "reservation",
        "statusReserv",
        "CONFIRMER"
      );
      const NbrReservationAnnuler = await getCount(
        "reservation",
        "statusReserv",
        "ANNULER"
      );

      res.json({
        //voiture
        NbrTotalVoiture,

        //contrat
        NbrTotalContrat,

        //reservation
        NbrTotalReservation,
        NbrReservationEnAttente,
        NbrReservationConfirmer,
        NbrReservationAnnuler,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

//FN//
function getCount(table, column = "", value = "") {
  return new Promise((resolve, reject) => {
    let query;
    if (column && value) {
      query = `SELECT COUNT(*) AS count FROM ${table}  WHERE ${column}='${value}'`;
    } else {
      query = `SELECT COUNT(*) AS count FROM ${table} `;
    }
    connection.query(query, (err, results) => {
      if (err) {
        reject(err);
      } else {
        resolve(results[0].count);
      }
    });
  });
}
module.exports = router;
