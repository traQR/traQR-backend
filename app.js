//jshint esversion:6
require('dotenv').config()

const express = require("express");

const admin = require("firebase-admin");

const app = express();

app.use(express.json());

app.use(express.urlencoded({
  extended: true
}
));

var serviceAccount = require("./service_acc.json");

admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

// app.post("/oauth", function(req, res){
//   const idToken = req.body.jwt;
//   const decryptedToken = admin.auth().verifyIdToken(idToken);
// });

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

// ***  ROUTES *** //

app.post("/newUser", function(req, res){
  let {isStudent, studentName, regNo, facID, facultyName} = req.body;
  if(isStudent){
    const user = new Student({
      registrationNumber: regNo,
      studentName: studentName,
      coursesTaken: []
    })
    user.save();
  }
  else{
    const user = new Faculty({
      facultyID: facID,
      facultyName: facultyName,
      coursesHandled: []
    })
    user.save();
  }
})

app.post("/courses", function(req, res){
  // Retrieveing fields from Student object
  var regNo = req.body.regNo;
  Student.findOne({registrationNumber: regNo}, {coursesTaken: 1}, function(err, studentCoursesTaken){
    if(err){
      res.send(err);
    }
    else{
      res.send(studentCoursesTaken);
    }
  });
});

app.post("/courses/courseID", function(req,res){
  // Retrieving fields from course object
  var cID = req.body.courseID;

  Course.findOne({courseID: cID}, {courseID: 1, courseName: 1, slot: 1, facultyID: 1}, function(err, courseInfo){
    if(err){
      res.send(err)
    }
    else{
      res.send(courseInfo);
    }
  });
});

app.post("/courses/courseID/attendance", function(req,res){
  // Checks the array of objects in attendance for the requested regNo
  // and stores those exact details in attendanceList which is then sent.
  
  var regNo = req.body.regNo;
  var cID = req.body.courseID;
  
  Course.findOne({courseID: cID}, {attendance: 1}, function(err, tempAttendance){
    if(err){
      res.send(err);
    }
    else{
      var i;
      var len = tempAttendance.attendance.length;

      for(i=0; i<len; i++){
        if(tempAttendance.attendance[i].registrationNumber === regNo){
          res.send(tempAttendance.attendance[i]);
        }
      }
    }
  });

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
});

app.post("/attendance", function(req,res){
  var regNo = req.body.regNo;
  var percentageList = [];

  var allCourses = Student.find({registrationNumber: regNo}, {coursesTaken: 1});
  for(var key in allCourses) {
    var cID = key.courseID;
    var attendance = Course.find({courseID: cID},{attendance: 1})
    for(var key1 in attendance){
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

app.post("/faculty", function(req, res){
  const courses = Faculty.find({facultyID: req.body.facID}, {coursesHandeled: 1});

  res.send(courses);
})

// Returns attendance statistics of the students based on particular courseID
app.post("/attendance-stats", function(req, res){
  var cID = req.body.courseID;
  var attendance = Course.find({courseID: cID}, {attendance: 1});
  var attendanceList = [];

  for(var key in attendance){
    var studentName = Student.find({registrationNumber: key.registrationNumber},{StudentName: 1}); 
    let obj = {
      "registrationNumber": key.registrationNumber,
      "studentName": studentName,
      "attendancePercentage": key.attendancePercentage
    }
    attendanceList.push(obj);
  }

  res.send(attendanceList);
});

// Returns studentName and attendanceStatus for a particular course on a particular date
app.post("/faculty/attendance", function(req, res){
  var cID = req.body.courseID;
  var date = req.body.date; //"DD-MM-YY"
  var attendance = Course.find({courseID: cID}, {attendance: 1});
  var attendanceList = [];

  for(var key in attendance){
    var studentName = Student.find({registrationNumber: key.registrationNumber},{StudentName: 1});
    for(var key1 in key.historyOfAttendance){
      if(key1.attendanceDate === date){
        let obj = {
          "registrationNumber": key.registrationNumber,
          "studentName": studentName,
          "attendanceStatus": key1.status
        }
        attendanceList.push(obj);
      }
      else{
        res.send("Date doesn't match the Time slot given");
      }
    }
  }

  res.send(attendanceList);
});



let port = process.env.PORT;
if(port == null || port == ""){
  port = 3000
}

app.listen(port, function(req, res){
  console.log("Server started on", port);
});