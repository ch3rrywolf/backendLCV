const express = require("express");
const bodyParser = require("body-parser");
var cors = require("cors");

const SessionRoute = require("./routes/session");
const AdminRoute = require("./routes/admin");
const ClientRoute = require("./routes/client");
const DashboardARouter = require("./routes/dashboardAG");

const app = express();

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use("/session", SessionRoute);
app.use("/admin", AdminRoute);
app.use("/client", ClientRoute);
app.use("/admin/dashboard", DashboardARouter);

module.exports = app;
