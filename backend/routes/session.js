const express = require("express");
const connection = require("../connection");
const router = express.Router();
require("dotenv").config();

const auth = require("../services/authentication");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
var checkRoleAdmin = require("../services/checkRole");

//create account //
router.post("/signup", auth.authenticateToken,
checkRoleAdmin.checkRoleAdmin,(req, res) => {
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
});

//Login_Session
router.post("/login",  (req, res) => {
  const sessionBody = req.body;

  query = "SELECT emailSession, passwordSession, RoleSession, statusSession FROM session WHERE emailSession=?";
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
              Email: results[0].emailSession,
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

//CheckToken
router.get("/checkToken", auth.authenticateToken, (req, res) => {
  return res.status(200).json({ message: "true" });
});

module.exports = router;
