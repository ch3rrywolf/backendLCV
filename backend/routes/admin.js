const express = require("express");
const connection = require("../connection");
const router = express.Router();
require("dotenv").config();
var checkRoleAdmin = require("../services/checkRole");

const auth = require("../services/authentication");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    cb(null, true);
  },
});

const fs = require("fs");
const path = require("path");

const PDFDocument = require("pdfkit");
const pdfService = require("../services/pdf-contrat");

//create account //
router.post(
  "/signup",
  auth.authenticateToken,
  checkRoleAdmin.checkRoleAdmin,
  (req, res) => {
    let sessionBody = req.body;

    bcrypt.hash(sessionBody.passwordSession, 10, (err, hashedPassword) => {
      if (err) {
        return res.status(500).json({ error: "Error hashing password" });
      }

      query = "SELECT emailSession FROM session WHERE emailSession=?";
      connection.query(query, [sessionBody.emailSession], (err, results) => {
        if (!err) {
          if (results.length <= 0) {
            query =
              "INSERT INTO session(emailSession, passwordSession) VALUES(?,?)";
            connection.query(
              query,
              [sessionBody.emailSession, hashedPassword],
              (err, results) => {
                if (!err) {
                  return res
                    .status(200)
                    .json({ message: "Successfully Registered" });
                } else {
                  return res.status(500).json(err);
                }
              }
            );
          } else {
            return res.status(400).json({ message: "Email déjà utilisé!" });
          }
        } else {
          return res.status(500).json(err);
        }
      });
    });
  }
);
//Login_Session
router.post("/login", (req, res) => {
  const sessionBody = req.body;

  query =
    "SELECT emailSession, passwordSession, RoleSession, statusSession FROM session WHERE emailSession=?";
  connection.query(query, [sessionBody.emailSession], (err, results) => {
    if (!err) {
      if (results.length <= 0) {
        return res
          .status(401)
          .json({ message: "Incorrect Email ? Password ?" });
      }

      const hashedPasswordFromDatabase = results[0].passwordSession;

      bcrypt.compare(
        sessionBody.passwordSession,
        hashedPasswordFromDatabase,
        (err, passwordMatch) => {
          if (passwordMatch) {
            if (results[0].statusSession !== "ACTIVE") {
              return res
                .status(401)
                .json({ message: "Votre Session n'est pas vérifié" });
            }

            const response = {
              emailSession: results[0].emailSession,
              RoleSession: results[0].RoleSession,
            };

            const accessToken = jwt.sign(response, process.env.ACCESS_TOKEN, {
              expiresIn: "8h",
            });

            res.status(200).json({ token: accessToken, infoUser: response });
          } else {
            return res
              .status(401)
              .json({ message: "Incorrect Email ? Password ?" });
          }
        }
      );
    } else {
      return res.status(500).json(err);
    }
  });
});
//========================================
//SESSION_APIs
//========================================
//Get_Sessions
router.get(
  "/session/all",
  auth.authenticateToken,
  checkRoleAdmin.checkRoleAdmin,
  (req, res) => {
    var query = "select emailSession, RoleSession, statusSession from session";

    connection.query(query, (err, results) => {
      if (!err) {
        return res.status(200).json(results);
      } else {
        return res.status(500).json(err);
      }
    });
  }
);
//Get_Sessions_By_emailSession
router.get(
  "/session/byone",
  auth.authenticateToken,
  checkRoleAdmin.checkRoleAdmin,
  (req, res) => {
    let sessionQuery = req.query;
    var query =
      "select emailSession, RoleSession, statusSession from session where emailSession=?";

    connection.query(query, [sessionQuery.emailSession], (err, results) => {
      if (!err) {
        return res.status(200).json(results);
      } else {
        return res.status(500).json(err);
      }
    });
  }
);
//Update_Session_By_emailSession
router.patch(
  "/session/update",
  auth.authenticateToken,
  checkRoleAdmin.checkRoleAdmin,
  (req, res) => {
    const { emailSession } = req.query;
    const {
      RoleSession,
      statusSession,
      emailSession: emailSessionBody,
    } = req.body;

    let query = "UPDATE session SET";
    const queryParams = [];
    if (RoleSession !== undefined) {
      query += " RoleSession=?,";
      queryParams.push(RoleSession);
    }
    if (statusSession !== undefined) {
      query += " statusSession=?,";
      queryParams.push(statusSession);
    }
    query = query.slice(0, -1) + " WHERE emailSession=?";

    queryParams.push(emailSession || emailSessionBody);

    connection.query(query, queryParams, (err, results) => {
      if (!err) {
        if (results.affectedRows === 0) {
          return res.status(404).json({ message: "Session does not exist" });
        }
        return res
          .status(200)
          .json({ message: "Session Updated Successfully" });
      } else {
        return res.status(500).json(err);
      }
    });
  }
);
//Delete_Session_By_emailSession
router.delete(
  "/session/del",
  auth.authenticateToken,
  checkRoleAdmin.checkRoleAdmin,
  (req, res) => {
    const sessionQuery = req.query;
    var query = "DELETE FROM session WHERE emailSession=?";

    connection.query(query, [sessionQuery.emailSession], (err, results) => {
      if (!err) {
        if (results.affectedRows > 0) {
          return res
            .status(200)
            .json({ message: "Session deleted successfully" });
        } else {
          return res.status(404).json({ message: "Session not found" });
        }
      } else {
        return res.status(500).json(err);
      }
    });
  }
);
//========================================
//VOITURE_APIs
//========================================
//ADD_Voiture
router.post(
  "/voiture/add",
  auth.authenticateToken,
  checkRoleAdmin.checkRoleAdmin,
  upload.fields([
    { name: "imageVoiture", maxCount: 1 },
    { name: "carteGrise", maxCount: 1 },
    { name: "assurance", maxCount: 1 },
    { name: "laissePasse", maxCount: 1 },
    { name: "vignette", maxCount: 1 },
  ]),
  (req, res, next) => {
    const contratBody = req.body;
    const { files } = req;

    const imageVoitureFile = files["imageVoiture"]
      ? files["imageVoiture"][0]
      : null;
    const carteGriseFile = files["carteGrise"] ? files["carteGrise"][0] : null;
    const assuranceFile = files["assurance"] ? files["assurance"][0] : null;
    const laissePasseFile = files["laissePasse"]
      ? files["laissePasse"][0]
      : null;
    const vignetteFile = files["vignette"] ? files["vignette"][0] : null;

    const imageVoitureBuffer = imageVoitureFile
      ? imageVoitureFile.buffer
      : null;
    const carteGriseBuffer = carteGriseFile ? carteGriseFile.buffer : null;
    const assuranceBuffer = assuranceFile ? assuranceFile.buffer : null;
    const laissePasseBuffer = laissePasseFile ? laissePasseFile.buffer : null;
    const vignetteBuffer = vignetteFile ? vignetteFile.buffer : null;

    const voitureQuery =
      "INSERT INTO voiture (matriculeVoiture, modelVoiture, imageVoiture, nbrPlace, boiteVitesse, caution, prixParJour, carteGrise, assurance, laissePasse, vignette) VALUES (?,?,?,?,?,?,?,?,?,?,?)";
    connection.query(
      voitureQuery,
      [
        contratBody.matriculeVoiture,
        contratBody.modelVoiture,
        imageVoitureBuffer,
        contratBody.nbrPlace,
        contratBody.boiteVitesse,
        contratBody.caution,
        contratBody.prixParJour,
        carteGriseBuffer,
        assuranceBuffer,
        laissePasseBuffer,
        vignetteBuffer,
      ],
      (err, results) => {
        if (err) {
          console.error("Error adding voiture:", err);
          return res.status(500).json({ error: "Failed to add voiture" });
        }
        console.log("Voiture added successfully");
        return res.status(200).json({ message: "Voiture added successfully" });
      }
    );
  }
);
//Get_Voitures
router.get(
  "/voiture/all",
  auth.authenticateToken,
  checkRoleAdmin.checkRoleAdmin,
  (req, res) => {
    var query =
      "select matriculeVoiture, modelVoiture, imageVoiture, nbrPlace, boiteVitesse, caution, prixParJour, statusVoiture from voiture";

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
  auth.authenticateToken,
  checkRoleAdmin.checkRoleAdmin,
  (req, res) => {
    let voitureQuery = req.query;
    var query =
      "select matriculeVoiture, modelVoiture, imageVoiture, nbrPlace, boiteVitesse, caution, prixParJour, carteGrise, assurance, laissePasse, vignette, statusVoiture from voiture where matriculeVoiture=?";

    connection.query(query, [voitureQuery.matriculeVoiture], (err, results) => {
      if (!err) {
        return res.status(200).json(results);
      } else {
        return res.status(500).json(err);
      }
    });
  }
);
//Update_Voiture_By_matriculeVoiture
router.put(
  "/voiture/update",
  auth.authenticateToken,
  checkRoleAdmin.checkRoleAdmin,
  upload.fields([
    { name: "imageVoiture", maxCount: 1 },
    { name: "carteGrise", maxCount: 1 },
    { name: "assurance", maxCount: 1 },
    { name: "laissePasse", maxCount: 1 },
    { name: "vignette", maxCount: 1 },
  ]),
  (req, res, next) => {
    let contratBody = req.body;
    let voitureQuery = req.query;
    let updateFields = [];

    if (contratBody.modelVoiture) {
      updateFields.push("modelVoiture=?");
    }
    if (req.files["imageVoiture"]) {
      updateFields.push("imageVoiture=?");
      contratBody.imageVoitureBuffer = req.files["imageVoiture"][0].buffer;
    }
    if (contratBody.nbrPlace) {
      updateFields.push("nbrPlace=?");
    }
    if (contratBody.boiteVitesse) {
      updateFields.push("boiteVitesse=?");
    }
    if (contratBody.caution) {
      updateFields.push("caution=?");
    }
    if (contratBody.prixParJour) {
      updateFields.push("prixParJour=?");
    }
    if (req.files["carteGrise"]) {
      updateFields.push("carteGrise=?");
      contratBody.carteGriseBuffer = req.files["carteGrise"][0].buffer;
    }
    if (req.files["assurance"]) {
      updateFields.push("assurance=?");
      contratBody.assuranceBuffer = req.files["assurance"][0].buffer;
    }
    if (req.files["laissePasse"]) {
      updateFields.push("laissePasse=?");
      contratBody.laissePasseBuffer = req.files["laissePasse"][0].buffer;
    }
    if (req.files["vignette"]) {
      updateFields.push("vignette=?");
      contratBody.vignetteBuffer = req.files["vignette"][0].buffer;
    }
    if (contratBody.statusVoiture) {
      updateFields.push("statusVoiture=?");
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    let query =
      "UPDATE voiture SET " +
      updateFields.join(", ") +
      " WHERE matriculeVoiture=?";
    let params = [];

    if (contratBody.modelVoiture) {
      params.push(contratBody.modelVoiture);
    }
    if (contratBody.imageVoitureBuffer) {
      params.push(contratBody.imageVoitureBuffer);
    }
    if (contratBody.nbrPlace) {
      params.push(contratBody.nbrPlace);
    }
    if (contratBody.boiteVitesse) {
      params.push(contratBody.boiteVitesse);
    }
    if (contratBody.caution) {
      params.push(contratBody.caution);
    }
    if (contratBody.prixParJour) {
      params.push(contratBody.prixParJour);
    }
    if (contratBody.carteGriseBuffer) {
      params.push(contratBody.carteGriseBuffer);
    }
    if (contratBody.assuranceBuffer) {
      params.push(contratBody.assuranceBuffer);
    }
    if (contratBody.laissePasseBuffer) {
      params.push(contratBody.laissePasseBuffer);
    }
    if (contratBody.vignetteBuffer) {
      params.push(contratBody.vignetteBuffer);
    }
    if (contratBody.statusVoiture) {
      params.push(contratBody.statusVoiture);
    }

    params.push(voitureQuery.matriculeVoiture);

    connection.query(query, params, (err, results) => {
      if (!err) {
        return res
          .status(200)
          .json({ message: "Voiture updated successfully" });
      } else {
        return res.status(500).json(err);
      }
    });
  }
);
//DELETE_Voiture_By_matriculeVoiture
router.delete(
  "/voiture/del",
  auth.authenticateToken,
  checkRoleAdmin.checkRoleAdmin,
  (req, res) => {
    const voitureQuery = req.query;

    if (!voitureQuery) {
      return res
        .status(400)
        .json({ error: "MatriculeVoiture parameter is required" });
    }

    const query = "DELETE FROM voiture WHERE matriculeVoiture = ?";
    connection.query(query, [voitureQuery.matriculeVoiture], (err, results) => {
      if (err) {
        console.error("Error deleting voiture:", err);
        return res.status(500).json({ error: "Failed to delete voiture" });
      }

      if (results.affectedRows === 0) {
        return res.status(404).json({ error: "Voiture not found" });
      }

      console.log("Voiture deleted successfully");
      return res.status(200).json({ message: "Voiture deleted successfully" });
    });
  }
);
//========================================
//RESERVATION_APIs
//========================================
//Get_Reservation
router.get(
  "/reserv/all",
  auth.authenticateToken,
  checkRoleAdmin.checkRoleAdmin,
  (req, res) => {
    var query =
      "select reservationid, DATE_FORMAT(logReserv, '%Y-%m-%d %h:%m:%s') AS logReserv, modelVoiture, nomClient, numTel, DATE_FORMAT(DateDebReserv, '%Y-%m-%d') AS DateDebReserv, DATE_FORMAT(DateFinReserv, '%Y-%m-%d') AS DateFinReserv, noteReserv, statusReserv from reservation";

    connection.query(query, (err, results) => {
      if (!err) {
        return res.status(200).json(results);
      } else {
        return res.status(500).json(err);
      }
    });
  }
);
//Get_Reservation_By_id
router.get(
  "/reserv/byone",
  auth.authenticateToken,
  checkRoleAdmin.checkRoleAdmin,
  (req, res) => {
    let reservQuery = req.query;
    var query =
      "select reservationid, DATE_FORMAT(logReserv, '%Y-%m-%d %h:%m:%s') AS logReserv, modelVoiture, nomClient, numTel, DATE_FORMAT(DateDebReserv, '%Y-%m-%d') AS DateDebReserv, DATE_FORMAT(DateFinReserv, '%Y-%m-%d') AS DateFinReserv, noteReserv, statusReserv  from reservation where reservationid=?";

    connection.query(query, [reservQuery.reservationid], (err, results) => {
      if (!err) {
        return res.status(200).json(results);
      } else {
        return res.status(500).json(err);
      }
    });
  }
);
//Update_Reservation
router.put(
  "/reserv/update",
  auth.authenticateToken,
  checkRoleAdmin.checkRoleAdmin,

  (req, res, next) => {
    let reservBody = req.body;
    let reservQuery = req.query;
    let updateFields = [];

    if (reservBody.statusReserv) {
      updateFields.push("statusReserv=?");
    }
    if (reservBody.noteReserv) {
      updateFields.push("noteReserv=?");
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    let query =
      "UPDATE reservation SET " +
      updateFields.join(", ") +
      " WHERE reservationid=?";
    let params = [];

    if (reservBody.statusReserv) {
      params.push(reservBody.statusReserv);
    }

    params.push(reservQuery.reservationid);

    connection.query(query, params, (err, results) => {
      if (!err) {
        return res
          .status(200)
          .json({ message: "Reservation updated successfully" });
      } else {
        return res.status(500).json(err);
      }
    });
  }
);
//Add_Reservation
router.post(
  "/reserv/add",
  auth.authenticateToken,
  checkRoleAdmin.checkRoleAdmin,
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
          console.error("Error adding Réservation:", err);
          return res.status(500).json({ error: "Failed to add Réservation" });
        }
        console.log("Réservation added successfully");
        return res
          .status(200)
          .json({ message: "Réservation added successfully" });
      }
    );
  }
);
//========================================
//========================================
//CONTRAT_APIs
//========================================
//ADD_Contrat
router.post(
  "/contrat/add",
  auth.authenticateToken,
  checkRoleAdmin.checkRoleAdmin,
  // upload.fields([{ name: "fileContrat", maxCount: 1 }]),
  (req, res, next) => {
    const contratBody = req.body;

    const contratQuery =
      "INSERT INTO contrat (matriculeVoiture, NomCondu1, PrenomCondu1, DateDeNaiCondu1, AdresseCondu1, NumTelCondu1, NumPermisCondu1, DelivrePermisCondu1, TypeIdentityCondu1, NumCinPassCondu1, DelivreCinPassCondu1, NomCondu2, PrenomCondu2, DateDeNaiCondu2, AdresseCondu2, NumTelCondu2, NumPermisCondu2, DelivrePermisCondu2, TypeIdentityCondu2, NumCinPassCondu2, DelivreCinPassCondu2, DateDepContrat, LieuDepContrat, DateFinContrat, LieuFinContrat, TypePaie, NumCheque, TVAContrat) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)";
    connection.query(
      contratQuery,
      [
        contratBody.matriculeVoiture,
        contratBody.NomCondu1,
        contratBody.PrenomCondu1,
        contratBody.DateDeNaiCondu1,
        contratBody.AdresseCondu1,
        contratBody.NumTelCondu1,
        contratBody.NumPermisCondu1,
        contratBody.DelivrePermisCondu1,
        contratBody.TypeIdentityCondu1,
        contratBody.NumCinPassCondu1,
        contratBody.DelivreCinPassCondu1,
        contratBody.NomCondu2,
        contratBody.PrenomCondu2,
        contratBody.DateDeNaiCondu2,
        contratBody.AdresseCondu2,
        contratBody.NumTelCondu2,
        contratBody.NumPermisCondu2,
        contratBody.DelivrePermisCondu2,
        contratBody.TypeIdentityCondu2,
        contratBody.NumCinPassCondu2,
        contratBody.DelivreCinPassCondu2,
        contratBody.DateDepContrat,
        contratBody.LieuDepContrat,
        contratBody.DateFinContrat,
        contratBody.LieuFinContrat,
        contratBody.TypePaie,
        contratBody.NumCheque,
        contratBody.TVAContrat,
      ],
      (err, results) => {
        if (err) {
          console.error("Error adding Contrat:", err);
          return res.status(500).json({ error: "Failed to add Contrat" });
        }
        console.log("Contrat added successfully");
        return res.status(200).json({ message: "Contrat added successfully" });
      }
    );
  }
);
//Get_Contrat
router.get(
  "/contrat/all",
  auth.authenticateToken,
  checkRoleAdmin.checkRoleAdmin,
  (req, res) => {
    var query =
      "SELECT c.contratId, c.matriculeVoiture, v.modelVoiture, v.prixParJour, c.NomCondu1, c.PrenomCondu1, DATE_FORMAT(c.DateDepContrat, '%Y-%m-%d') AS DateDepContrat, DATE_FORMAT(c.DateFinContrat, '%Y-%m-%d') AS DateFinContrat, c.statusContrat FROM contrat c JOIN voiture v ON c.matriculeVoiture = v.matriculeVoiture";

    connection.query(query, (err, results) => {
      if (!err) {
        return res.status(200).json(results);
      } else {
        return res.status(500).json(err);
      }
    });
  }
);
//Get_Contrat_By_contratId
router.get(
  "/contrat/byone",
  auth.authenticateToken,
  checkRoleAdmin.checkRoleAdmin,
  (req, res) => {
    const contratQuery = req.query;
    var query =
      "SELECT c.contratId, c.matriculeVoiture, v.modelVoiture, v.prixParJour, c.NomCondu1, c.PrenomCondu1, DATE_FORMAT(c.DateDeNaiCondu1, '%Y-%m-%d') AS DateDeNaiCondu1, c.AdresseCondu1, c.NumTelCondu1, c.NumPermisCondu1, DATE_FORMAT(c.DelivrePermisCondu1, '%Y-%m-%d') AS DelivrePermisCondu1, c.TypeIdentityCondu1, c.NumCinPassCondu1, DATE_FORMAT(c.DelivreCinPassCondu1, '%Y-%m-%d') AS DelivreCinPassCondu1, c.NomCondu2, c.PrenomCondu2, DATE_FORMAT(c.DateDeNaiCondu2, '%Y-%m-%d') AS DateDeNaiCondu2, c.AdresseCondu2, c.NumTelCondu2, c.NumPermisCondu2, DATE_FORMAT(c.DelivrePermisCondu2, '%Y-%m-%d') AS DelivrePermisCondu2, c.TypeIdentityCondu2, c.NumCinPassCondu2, DATE_FORMAT(c.DelivreCinPassCondu2, '%Y-%m-%d') AS DelivreCinPassCondu2, DATE_FORMAT(c.DateDepContrat, '%Y-%m-%d') AS DateDepContrat, c.LieuDepContrat, DATE_FORMAT(c.DateFinContrat, '%Y-%m-%d') AS DateFinContrat, c.LieuFinContrat, c.TypePaie, c.NumCheque, c.TVAContrat, c.statusContrat, DATE_FORMAT(c.LogContrat, '%Y-%m-%d %h:%m:%s') AS LogContrat FROM contrat c JOIN voiture v ON c.matriculeVoiture = v.matriculeVoiture WHERE c.contratId=?";

    connection.query(query, [contratQuery.contratId], (err, results) => {
      if (!err) {
        return res.status(200).json(results);
      } else {
        return res.status(500).json(err);
      }
    });
  }
);
function fetchContratData(contratQuery) {
  return new Promise((resolve, reject) => {
    const query = `SELECT contratId, matriculeVoiture, NomCondu1, PrenomCondu1, DATE_FORMAT(DateDeNaiCondu1, '%Y-%m-%d') AS DateDeNaiCondu1, AdresseCondu1, NumTelCondu1, NumPermisCondu1, DATE_FORMAT(DelivrePermisCondu1, '%Y-%m-%d') AS DelivrePermisCondu1, TypeIdentityCondu1, NumCinPassCondu1, DATE_FORMAT(DelivreCinPassCondu1, '%Y-%m-%d') AS DelivreCinPassCondu1, NomCondu2, PrenomCondu2, DATE_FORMAT(DateDeNaiCondu2, '%Y-%m-%d') AS DateDeNaiCondu2, AdresseCondu2, NumTelCondu2, NumPermisCondu2, DATE_FORMAT(DelivrePermisCondu2, '%Y-%m-%d') AS DelivrePermisCondu2, TypeIdentityCondu2, NumCinPassCondu2, DATE_FORMAT(DelivreCinPassCondu2, '%Y-%m-%d') AS DelivreCinPassCondu2, DATE_FORMAT(DateDepContrat, '%Y-%m-%d') AS DateDepContrat, LieuDepContrat, DATE_FORMAT(DateFinContrat, '%Y-%m-%d') AS DateFinContrat, LieuFinContrat, TypePaie, NumCheque, TVAContrat FROM contrat WHERE contratId = ?`;
    connection.query(query, [contratQuery], (error, results) => {
      if (error) {
        reject(error);
      } else {
        resolve(results[0]);
      }
    });
  });
}
//Update_Contrat
router.put(
  "/contrat/update",
  auth.authenticateToken,
  checkRoleAdmin.checkRoleAdmin,

  (req, res, next) => {
    let contratBody = req.body;
    let contratQuery = req.query;
    let updateFields = [];

    if (contratBody.matriculeVoiture) {
      updateFields.push("matriculeVoiture=?");
    }
    if (contratBody.NomCondu1) {
      updateFields.push("NomCondu1=?");
    }
    if (contratBody.PrenomCondu1) {
      updateFields.push("PrenomCondu1=?");
    }
    if (contratBody.DateDeNaiCondu1) {
      updateFields.push("DateDeNaiCondu1=?");
    }
    if (contratBody.AdresseCondu1) {
      updateFields.push("AdresseCondu1=?");
    }
    if (contratBody.NumTelCondu1) {
      updateFields.push("NumTelCondu1=?");
    }
    if (contratBody.NumPermisCondu1) {
      updateFields.push("NumPermisCondu1=?");
    }
    if (contratBody.DelivrePermisCondu1) {
      updateFields.push("DelivrePermisCondu1=?");
    }
    if (contratBody.TypeIdentityCondu1) {
      updateFields.push("TypeIdentityCondu1=?");
    }
    if (contratBody.NumCinPassCondu1) {
      updateFields.push("NumCinPassCondu1=?");
    }
    if (contratBody.DelivreCinPassCondu1) {
      updateFields.push("DelivreCinPassCondu1=?");
    }

    if (contratBody.NomCondu2) {
      updateFields.push("NomCondu2=?");
    }
    if (contratBody.PrenomCondu2) {
      updateFields.push("PrenomCondu2=?");
    }
    if (contratBody.DateDeNaiCondu2) {
      updateFields.push("DateDeNaiCondu2=?");
    }
    if (contratBody.AdresseCondu2) {
      updateFields.push("AdresseCondu2=?");
    }
    if (contratBody.NumTelCondu2) {
      updateFields.push("NumTelCondu2=?");
    }
    if (contratBody.NumPermisCondu2) {
      updateFields.push("NumPermisCondu2=?");
    }
    if (contratBody.DelivrePermisCondu2) {
      updateFields.push("DelivrePermisCondu2=?");
    }
    if (contratBody.TypeIdentityCondu2) {
      updateFields.push("TypeIdentityCondu2=?");
    }
    if (contratBody.NumCinPassCondu2) {
      updateFields.push("NumCinPassCondu2=?");
    }
    if (contratBody.DelivreCinPassCondu2) {
      updateFields.push("DelivreCinPassCondu2=?");
    }

    if (contratBody.DateDepContrat) {
      updateFields.push("DateDepContrat=?");
    }
    if (contratBody.LieuDepContrat) {
      updateFields.push("LieuDepContrat=?");
    }
    if (contratBody.DateFinContrat) {
      updateFields.push("DateFinContrat=?");
    }
    if (contratBody.LieuFinContrat) {
      updateFields.push("LieuFinContrat=?");
    }

    if (contratBody.TypePaie) {
      updateFields.push("TypePaie=?");
    }
    if (contratBody.NumCheque) {
      updateFields.push("NumCheque=?");
    }
    if (contratBody.TVAContrat) {
      updateFields.push("TVAContrat=?");
    }
    if (contratBody.statusContrat) {
      updateFields.push("statusContrat=?");
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    let query =
      "UPDATE contrat SET " +
      updateFields.join(", ") +
      " WHERE contratId=?";
    let params = [];

    if (contratBody.matriculeVoiture) {
      params.push(contratBody.matriculeVoiture);
    }

    if (contratBody.NomCondu1) {
      params.push(contratBody.NomCondu1);
    }
    if (contratBody.PrenomCondu1) {
      params.push(contratBody.PrenomCondu1);
    }
    if (contratBody.DateDeNaiCondu1) {
      params.push(contratBody.DateDeNaiCondu1);
    }
    if (contratBody.AdresseCondu1) {
      params.push(contratBody.AdresseCondu1);
    }
    if (contratBody.NumTelCondu1) {
      params.push(contratBody.NumTelCondu1);
    }
    if (contratBody.NumPermisCondu1) {
      params.push(contratBody.NumPermisCondu1);
    }
    if (contratBody.DelivrePermisCondu1) {
      params.push(contratBody.DelivrePermisCondu1);
    }
    if (contratBody.TypeIdentityCondu1) {
      params.push(contratBody.TypeIdentityCondu1);
    }
    if (contratBody.NumCinPassCondu1) {
      params.push(contratBody.NumCinPassCondu1);
    }
    if (contratBody.DelivreCinPassCondu1) {
      params.push(contratBody.DelivreCinPassCondu1);
    }

    if (contratBody.NomCondu2) {
      params.push(contratBody.NomCondu2);
    }
    if (contratBody.PrenomCondu2) {
      params.push(contratBody.PrenomCondu2);
    }
    if (contratBody.DateDeNaiCondu2) {
      params.push(contratBody.DateDeNaiCondu2);
    }
    if (contratBody.AdresseCondu2) {
      params.push(contratBody.AdresseCondu2);
    }
    if (contratBody.NumTelCondu2) {
      params.push(contratBody.NumTelCondu2);
    }
    if (contratBody.NumPermisCondu2) {
      params.push(contratBody.NumPermisCondu2);
    }
    if (contratBody.DelivrePermisCondu2) {
      params.push(contratBody.DelivrePermisCondu2);
    }
    if (contratBody.TypeIdentityCondu2) {
      params.push(contratBody.TypeIdentityCondu2);
    }
    if (contratBody.NumCinPassCondu2) {
      params.push(contratBody.NumCinPassCondu2);
    }
    if (contratBody.DelivreCinPassCondu2) {
      params.push(contratBody.DelivreCinPassCondu2);
    }


    if (contratBody.DateDepContrat) {
      params.push(contratBody.DateDepContrat);
    }
    if (contratBody.LieuDepContrat) {
      params.push(contratBody.LieuDepContrat);
    }
    if (contratBody.DateFinContrat) {
      params.push(contratBody.DateFinContrat);
    }
    if (contratBody.LieuFinContrat) {
      params.push(contratBody.LieuFinContrat);
    }


    if (contratBody.TypePaie) {
      params.push(contratBody.TypePaie);
    }
    if (contratBody.NumCheque) {
      params.push(contratBody.NumCheque);
    }
    if (contratBody.TVAContrat) {
      params.push(contratBody.TVAContrat);
    }
    if (contratBody.statusContrat) {
      params.push(contratBody.statusContrat);
    }
    
    

    params.push(contratQuery.contratId);

    connection.query(query, params, (err, results) => {
      if (!err) {
        return res
          .status(200)
          .json({ message: "Contrat updated successfully" });
      } else {
        return res.status(500).json(err);
      }
    });
  }
);
//Generate_Contrat
router.post("/contrat/GenContratVoiturePDF", async (req, res, next) => {
  try {
    const contratQuery = req.query.contratId;
    
    

    const [contratData] = await Promise.all([fetchContratData(contratQuery)]);

    const contratDataCombined = {
      ...contratData,
      
    };

    const pdfChunks = [];

    pdfService.buildPDFContratVoiture(
      (chunk) => {
        pdfChunks.push(chunk);
      },
      async () => {
        try {
          const pdfBuffer = Buffer.concat(pdfChunks);
          const uploadDirectory = path.join(__dirname, "upload", contratQuery);
          const filename = `${contratQuery}-Contrat.pdf`;
          const filePath = path.join(uploadDirectory, filename);

          if (!fs.existsSync(uploadDirectory)) {
            fs.mkdirSync(uploadDirectory, { recursive: true });
          }

          fs.writeFileSync(filePath, pdfBuffer);

          res.status(200).send(filePath);
        } catch (error) {
          console.error("Error saving PDF to directory:", error);
          res.status(500).send("Internal Server Error");
        }
      },
      (error) => {
        console.error("Error generating PDF:", error);
        res.status(500).send("Internal Server Error");
      },
      contratDataCombined
    );
  } catch (error) {
    console.error("Error:", error);
    res.status(400).send("Bad Request");
  }
});
//download contrat
router.get("/downloadPDF", (req, res) => {
  const { contratId } = req.query;
  const fileName = `${contratId}-Contrat.pdf`;
  const filePath = path.join(__dirname, "upload", contratId, fileName);
  try {
    if (fs.existsSync(filePath)) {
      res.download(filePath, fileName, (err) => {
        if (err) {
          console.error("Error downloading PDF:", err);
          res.status(500).send("Internal Server Error");
        }
      });
    } else {
      res.status(404).send("File Not Found");
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Internal Server Error");
  }
});
//========================================

//========================================
//========================================
//========================================
//FACTURE_APIs
//========================================
//ADD_Facture
router.post(
  "/facture/add",
  auth.authenticateToken,
  checkRoleAdmin.checkRoleAdmin,
  (req, res, next) => {
    const factureBody = req.body;

    const factureQuery =
      "INSERT INTO facture (contratId) VALUES (?)";
    connection.query(
      factureQuery,
      [
       factureBody.contratId,
      ],
      (err, results) => {
        if (err) {
          console.error("Error adding Facture:", err);
          return res.status(500).json({ error: "Failed to add Facture" });
        }
        console.log("Facture added successfully");
        return res.status(200).json({ message: "Facture added successfully" });
      }
    );
  }
);
//Get_Facture
router.get("/facture/all", (req, res) => {
  var query = 
  "SELECT f.factureId, c.contratId, c.NomCondu1, c.PrenomCondu1, DATE_FORMAT(c.DateDepContrat, '%Y-%m-%d') AS DateDepContrat, DATE_FORMAT(c.DateFinContrat, '%Y-%m-%d') AS DateFinContrat, c.TVAContrat, v.prixParJour, f.statusFacture, DATE_FORMAT(f.LogFacture, '%Y-%m-%d') AS LogFacture  FROM facture f JOIN contrat c ON f.contratId = c.contratId JOIN voiture v ON c.matriculeVoiture = v.matriculeVoiture";
  
  connection.query(query, (err, results) => {
    if (!err) {
      results.forEach(result => {
        result.totalDays =((new Date(result.DateFinContrat) - new Date(result.DateDepContrat)) / (1000 * 60 * 60 * 24));
        const totalPrix = result.prixParJour *  result.totalDays;
        result.TVA = totalPrix * (result.TVAContrat / 100);
        result.totalPrixTVA = totalPrix + (totalPrix * (result.TVAContrat / 100));
      });

      return res.status(200).json(results);
    } else {
      return res.status(500).json(err);
    }
  });
});
//Get_Facture_By_factureId
router.get(
  "/facture/byone",
 
  (req, res) => {
    const factureQuery = req.query;
    var query =
    "SELECT f.factureId, c.contratId, c.NomCondu1, c.PrenomCondu1, c.AdresseCondu1, c.NumTelCondu1, DATE_FORMAT(c.DateDepContrat, '%Y-%m-%d') AS DateDepContrat, DATE_FORMAT(c.DateFinContrat, '%Y-%m-%d') AS DateFinContrat, c.TVAContrat, v.prixParJour, v.modelVoiture, v.prixParJour, f.statusFacture, DATE_FORMAT(f.LogFacture, '%Y-%m-%d %h:%m:%s') AS LogFacture  FROM facture f JOIN contrat c ON f.contratId = c.contratId JOIN voiture v ON c.matriculeVoiture = v.matriculeVoiture WHERE f.factureId=?"
    connection.query(query, [factureQuery.factureId], (err, results) => {
      if (!err) {
        results.forEach(result => {
          result.totalDays =((new Date(result.DateFinContrat) - new Date(result.DateDepContrat)) / (1000 * 60 * 60 * 24));
          const totalPrix = result.prixParJour *  result.totalDays;
          result.totalPrix = totalPrix;
          result.TVA = totalPrix * (result.TVAContrat / 100);
          result.totalPrixTVA = totalPrix + (totalPrix * (result.TVAContrat / 100));
          
        });
        return res.status(200).json(results);
      } else {
        return res.status(500).json(err);
      }
    });
  }
);
//Update_Facture
router.put(
  "/facture/update",

  (req, res, next) => {
    let factureBody = req.body;
    let factureQuery = req.query;
    let updateFields = [];

    if (factureBody.statusFacture) {
      updateFields.push("statusFacture=?");
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    let query =
      "UPDATE facture SET " +
      updateFields.join(", ") +
      " WHERE factureId=?";
    let params = [];

    if (factureBody.statusFacture) {
      params.push(factureBody.statusFacture);
    }

    params.push(factureQuery.factureId);

    connection.query(query, params, (err, results) => {
      if (!err) {
        return res
          .status(200)
          .json({ message: "Facture updated successfully" });
      } else {
        return res.status(500).json(err);
      }
    });
  }
);
//Generate_Facture
//Download_Facture
function fetchFactureData(factureId) {
  return new Promise((resolve, reject) => {
    const query = `SELECT f.factureId, c.contratId, c.NomCondu1, c.PrenomCondu1, DATE_FORMAT(c.DateDepContrat, '%Y-%m-%d') AS DateDepContrat, DATE_FORMAT(c.DateFinContrat, '%Y-%m-%d') AS DateFinContrat, c.TVAContrat, v.prixParJour, f.statusFacture FROM facture f JOIN contrat c ON f.contratId = c.contratId JOIN voiture v ON c.matriculeVoiture = v.matriculeVoiture WHERE f.factureId=?`;

    connection.query(query, [factureId], (error, results) => {
      if (error) {
        reject(error);
      } else {
        if (results.length > 0) {
          const result = results[0];
          const totalDays = (new Date(result.DateFinContrat) - new Date(result.DateDepContrat)) / (1000 * 60 * 60 * 24);
          const totalPrix = result.prixParJour * totalDays;
          const TVA = totalPrix * (result.TVAContrat / 100);
          const totalPrixTVA = totalPrix + TVA;

          result.totalDays = totalDays;
          result.totalPrix = totalPrix;
          result.TVA = TVA;
          result.totalPrixTVA = totalPrixTVA;
        }
        resolve(results[0]);
      }
    });
  });
}

//Generate_Contrat
router.post("/facture/GenFactureVoiturePDF", async (req, res, next) => {
  try {
    const factureQuery = req.query.factureId;  
    const [factureData] = await Promise.all([fetchFactureData(factureQuery)]);
    const factureDataCombined = {
      ...factureData,
     
    };

    const pdfChunks = [];

    pdfService.buildPDFFactureVoiture(
      (chunk) => {
        pdfChunks.push(chunk);
      },
      async () => {
        try {
          const pdfBuffer = Buffer.concat(pdfChunks);
          const uploadDirectory = path.join(__dirname, "upload", factureQuery);
          const filename = `${factureQuery}-Facture.pdf`;
          const filePath = path.join(uploadDirectory, filename);

          if (!fs.existsSync(uploadDirectory)) {
            fs.mkdirSync(uploadDirectory, { recursive: true });
          }

          fs.writeFileSync(filePath, pdfBuffer);

          res.status(200).send(filePath);
        } catch (error) {
          console.error("Error saving PDF to directory:", error);
          res.status(500).send("Internal Server Error");
        }
      },
      (error) => {
        console.error("Error generating PDF:", error);
        res.status(500).send("Internal Server Error");
      },
      factureDataCombined
    );
  } catch (error) {
    console.error("Error:", error);
    res.status(400).send("Bad Request");
  }
});
//download facture
router.get("/facture/downloadPDF2", (req, res) => {
  const { factureId } = req.query;
  const fileName = `${factureId}-Facture.pdf`;
  const filePath = path.join(__dirname, "upload", factureId, fileName);
  try {
    if (fs.existsSync(filePath)) {
      res.download(filePath, fileName, (err) => {
        if (err) {
          console.error("Error downloading PDF:", err);
          res.status(500).send("Internal Server Error");
        }
      });
    } else {
      res.status(404).send("File Not Found");
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Internal Server Error");
  }
});
//CheckToken
router.get("/checkToken", auth.authenticateToken, (req, res) => {
  return res.status(200).json({ message: "true" });
});

module.exports = router;
