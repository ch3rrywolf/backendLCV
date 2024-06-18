require("dotenv").config();

function checkRoleAdmin(req, res, next) {
  if (res.locals.RoleSession !== process.env.ADMIN) {
    return res.sendStatus(401);
  }
  next();
}

module.exports = { checkRoleAdmin };