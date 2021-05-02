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

const DoubtSchema = new mongoose.Schema({
  facultyID: String,
  doubts: [
    {
      courseID: String,
      doubt: String,
    },
  ],
});

const Student = mongoose.model("Student", StudentSchema);

const Faculty = mongoose.model("Faculty", FacultySchema);

const Course = mongoose.model("Course", CourseSchema);

const Doubts = mongoose.model("Doubts", DoubtsSchema);

app.get("/courses", function(req, res){
  // Retrieveing fields from Student object
  const studentCoursesTaken = Student.find({}, {coursesTaken: 1});
  res.send(studentCoursesTaken);
});

app.get("/courses/:courseID", function(req,res){
  // Retrieving fields from course object
  const courseInfo = Course.find({}, {courseID: 1, courseName: 1, slot: 1, facultyID: 1});
  res.send(courseInfo);
});

app.post("/courses/:courseID/attendance", function(req,res){
  const attendance = Course.find({}, {attendance: 1});
  const attendanceHistory = attendance.historyOfAttendance;
  
  // //Calculating attendance percentage
  // var tot = Object.size(attendanceHistory);
  // var present = 0;
  // for(var key in attendanceHistory){
  //   if(JSON.parse(attendanceHistory).status == "Present"){
  //     present++;
  //   }
  // }
  // var attendancePercentage = (present/tot) * 100;
  // attendanceHistory.attendancePercentage
  res.send(attendanceHistory);
});

app.get("/attendance", function(req,res){
  const student = Student.find({}, {coursesTaken: 1}, );
  // sai hella gae

});

app.get("/doubts", function(req,res){
  const doubts = Doubts.find({}, {doubts: 1});
  
  res.send(doubts);
});

app.post("/doubts", function(req,res){
  // facID should be substituted for the corresponding front-end variable
  const doubts = Doubts.find({facultyID: req.params.uID}, {doubts: 1});
  
  res.send(doubts);
});

let port = process.env.PORT;
if(port == null || port == ""){
  port = 3000
}

app.listen(port, function(req, res){
  console.log("Server started on the port");
});