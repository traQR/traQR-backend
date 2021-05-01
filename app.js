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

//DATABASE MODEL
const mongoose = require("mongoose");

mongoose.connect("mongodb://localhost:27017/TraQRdb", {useNewUrlParser: true, useUnifiedTopology: true});

const courseSchema = new mongoose.Schema({
    courseID: {
      type: String,
      required: [true, "There must be a course ID"]
    }, 
    courseName: String,
    slot: String,
    facultyID: String,
    attendance: [
      {
        registrationNumber: String,
        attendancePercentage: Number,
        historyOfAttendance: [
          {
            attendanceDate: String,
            status: String,
          },
        ],
      },
    ]
});

const StudentSchema = new mongoose.Schema({ 
  registrationNumber: String,
  studentName: String,
  coursesTaken: [
    {
      courseID: String,
      courseName: String,
      slot: String,
    },
  ],
})

const FacultySchema = new mongoose.Schema({
  facultyID: String,
  facultyName: String,
  coursesHandled: [
    {
      courseID: String,
      courseName: String,
    },
  ],
});

const Student = mongoose.model("Student", StudentSchema);

const Faculty = mongoose.model("Faculty", FacultySchema);

const Course = mongoose.model("Course", CourseSchema);

app.get("/courses", function(req, res){
    //Student.
})

app.listen(process.env.PORT || 3000, function(req, res){
  console.log("Server started on the port");
});