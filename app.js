//jshint esversion:6
require('dotenv').config()

const express = require("express");

const admin = require("firebase-admin");

const app = express();

app.use(express.json());

app.use(express.urlencoded());

var serviceAccount = require("./service_acc.json");

admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

app.post("/oauth", function(req, res){
  const idToken = req.body.jwt;
  const decryptedToken = admin.auth().verifyIdToken(idToken);
});

// Easter egg
app.get("/traqr", function(req, res){
  res.send("sai gae");
});

//DATABASE MODEL
const mongoose = require("mongoose");

mongoose.connect("mongodb+srv://TraQR-admin:WTTTQR-access@traqrdb.db1i1.mongodb.net/test-traqrDB", {useNewUrlParser: true, useUnifiedTopology: true});

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

const studentSchema = new mongoose.Schema({ 
  registrationNumber: String,
  studentName: String,
  coursesTaken: [
    {
      courseID: String,
      courseName: String,
      slot: String
    },
  ],
})

const facultySchema = new mongoose.Schema({
  facultyID: String,
  facultyName: String,
  coursesHandled: [
    {
      courseID: String,
      courseName: String,
    },
  ],
});

const doubtSchema = new mongoose.Schema({
  facultyID: String,
  doubts: [
    {
      courseID: String,
      doubt: String,
    },
  ],
});

const Student = mongoose.model("Student", studentSchema);

const Faculty = mongoose.model("Faculty", facultySchema);

const Course = mongoose.model("Course", courseSchema);

const Doubts = mongoose.model("Doubts", doubtSchema);

app.post("/courses", function(req, res){
  // Retrieveing fields from Student object
  var regNo = req.body.regNo;

  const studentCoursesTaken = Student.find({registrationNumber: regNo}, {coursesTaken: 1});
  res.send(studentCoursesTaken);
});

app.post("/courses/:courseID", function(req,res){
  // Retrieving fields from course object
  var cID = req.body.courseID;

  const courseInfo = Course.find({courseID: cID}, {courseID: 1, courseName: 1, slot: 1, facultyID: 1});
  res.send(courseInfo);
});

app.post("/courses/:courseID/attendance", function(req,res){
  var regNo = req.body.regNo;
  var cID = req.body.courseID;
  var attendance = Course.find({courseID: cID}, {attendance: 1});
  
  // Checks the array of objects in attendance for the requested regNo
  // and stores those exact details in attendanceList which is then sent.
  
  for (var key in attendance) {
    if (key.registrationNumber === regNo) {
      var attendanceList = {
        "attendancePercentage": key.attendancePercentage,
        "attendanceHistory": key.historyOfAttendance
      };
    }
  }

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

  res.send(attendanceList);
});

app.post("/attendance", function(req,res){
  var regNo = req.body.regNo;
  var percentageList = [];

  var allCourses = Student.find({registrationNumber: regNo}, {coursesTaken: 1});
  // sai hella gae
  for(var key in allCourses) {
    var cID = key.courseID;
    var attendance = Course.find({courseID: cID},{attendance: 1})
    for(var key1 in attendance){
        //TODO: sais ass paining too much
        if(key1.registrationNumber === regNo){
          let attendanceSummary = {
            "courseID": cID,
            "courseName": key.courseName,
            "attendancePercentage": key1.attendancePercentage
          }
          percentageList.push(attendanceSummary);
        }
    }
    res.send(percentageList);
  }
  

});

app.get("/doubts", function(req,res){
  const doubts = Doubts.find({}, {doubts: 1});
  
  res.send(doubts);
});

app.post("/doubts", function(req,res){
  // facID should be substituted for the corresponding front-end variable
  const doubts = Doubts.find({facultyID: req.body.facID}, {doubts: 1});
  
  res.send(doubts);
});

let port = process.env.PORT;
if(port == null || port == ""){
  port = 3000
}

app.listen(port, function(req, res){
  console.log("Server started on the port");
});