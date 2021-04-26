//jshint esversion:6
require('dotenv').config()

const express = require("express");

const admin = require("firebase-admin");


const app = express();

app.use(express.urlencoded());

var serviceAccount = require("C:\Users\abhil\Documents\firebase_auth\traqr-4b1c8-firebase-adminsdk-h045g-e37a5ebc62.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});;

app.post("/oauth", function(req, res){
  const idToken = req.body.id;
  const decryptedToken = admin.verifyIdToken(idToken);
  res.send(decryptedToken);
})

app.listen(process.env.PORT || 3000, function(req, res){
  console.log("Server started on the port");
});