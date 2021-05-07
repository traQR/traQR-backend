//jshint esversion:6
require("dotenv").config();

const express = require("express");

var cors = require("cors");

const admin = require("firebase-admin");

const {v4 : uuidv4} = require('uuid');

const app = express();

app.use(express.json());

app.use(cors());

app.use(
  express.urlencoded({
    extended: true,
  })
);

var serviceAccount = require("./service_acc.json");

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

// app.post("/oauth", function(req, res){
//   const idToken = req.body.jwt;
//   const decryptedToken = admin.auth().verifyIdToken(idToken);
// });

// Easter egg
app.get("/traqr", function (req, res) {
  res.send("sai gae");
});

//DATABASE MODEL
const mongoose = require("mongoose");

mongoose.connect(
  "mongodb+srv://TraQR-admin:WTTTQR-access@traqrdb.db1i1.mongodb.net/test-traqrDB",
  { useNewUrlParser: true, useUnifiedTopology: true }
);

const courseSchema = new mongoose.Schema({
  courseID: {
    type: String,
    required: [true, "There must be a course ID"],
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
  ],
});

const studentSchema = new mongoose.Schema({
  registrationNumber: String,
  studentName: String,
  coursesTaken: [
    {
      courseID: String,
      courseName: String,
      slot: String,
    },
  ],
});

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


// To create new user
app.post("/newUser", function (req, res) {
  let { isStudent, studentName, regNo, facID, facultyName } = req.body;
  if (isStudent) {
    const user = new Student({
      registrationNumber: regNo,
      studentName: studentName,
      coursesTaken: [],
    });
    user.save();
  } else {
    const user = new Faculty({
      facultyID: facID,
      facultyName: facultyName,
      coursesHandled: [],
    });
    user.save();
  }
  res.send("Successfully inserted");
});


  // Retrieveing fields from Student object
app.post("/courses", function (req, res) {
  var regNo = req.body.regNo;
  Student.find(
    { registrationNumber: regNo },
    { coursesTaken: 1 },
    function (err, studentCoursesTaken) {
      if (err) {
        res.send(err);
      } else {
        res.send(studentCoursesTaken);
      }
    }
  );
});


// Retrieving fields from course object
app.post("/courses/courseID", function (req, res) {
  var cID = req.body.courseID;

  Course.findOne(
    { courseID: cID },
    { courseID: 1, courseName: 1, slot: 1, facultyID: 1 },
    function (err, courseInfo) {
      if (err) {
        res.send(err);
      } else {
        res.send(courseInfo);
      }
    }
  );
});


// Checks the array of objects in attendance for the requested regNo
// and stores those exact details in attendanceList which is then sent.
app.post("/courses/courseID/attendance", function (req, res) {
  var regNo = req.body.regNo;
  var cID = req.body.courseID;

  Course.findOne(
    { courseID: cID },
    { attendance: 1 },
    function (err, tempAttendance) {
      if (err) {
        res.send(err);
      } else {
        var i;
        var len = tempAttendance.attendance.length;

        for (i = 0; i < len; i++) {
          if (tempAttendance.attendance[i].registrationNumber === regNo) {
            res.send(tempAttendance.attendance[i]);
          }
        }
      }
    }
  );

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


// Sends courseName, slot and attendancePercent based on registration number
app.post("/attendance", function (req, res) {
  var regNo = req.body.regNo;
  var percentageList = [];

  Student.findOne(
    { registrationNumber: regNo },
    { coursesTaken: 1 },
    async function (err, studentCourses) {
      if (err) {
        res.send(err);
      } else {
        var len = studentCourses.coursesTaken.length;
        for (var i = 0; i < len; i++) {
          await Course.findOne(
            { courseID: studentCourses.coursesTaken[i].courseID },
            { courseName: 1, slot: 1, attendance: 1 },
            function (err, attendanceSummary) {
              if (err) {
                res.send(err);
              } else {
                var len1 = attendanceSummary.attendance.length;
                for (var j = 0; j < len1; j++) {
                  if (
                    attendanceSummary.attendance[j].registrationNumber === regNo
                  ) {
                    let obj = {
                      courseName: attendanceSummary.courseName,
                      slot: attendanceSummary.slot,
                      attendancePercent: attendanceSummary.attendance[j].attendancePercentage
                    };
                    percentageList.push(obj);
                  }
                }
              }
            }
          );
        }
        res.send(percentageList);
      }
    }
  );
});


// Send teacherCourses
app.post("/faculty", function (req, res) {
  Faculty.findOne(
    { facultyID: req.body.facultyID },
    { coursesHandled: 1 },
    function (err, teacherCourses) {
      if (err) {
        res.send(err);
      } else {
        res.send(teacherCourses);
      }
    }
  );
});


// Returns attendance statistics of the students based on particular courseID
app.post("/attendance-stats", function (req, res) {
  var cID = req.body.courseID;
  let attendanceList = [];

  var attendance = Course.findOne(
    { courseID: cID },
    { attendance: 1 },
    async function (err, stats) {
      var len = stats.attendance.length;
      for(var i=0; i<len; i++){
        await Student.findOne(
          { registrationNumber: stats.attendance[i].registrationNumber },
          { studentName: 1 },
          function(err, asnap) {// asnap = attendance student name and percentage
            let obj = {
              registrationNumber: stats.attendance[i].registrationNumber,
              studentName: asnap.studentName,
              attendancePercentage: stats.attendance[i].attendancePercentage
            };
            attendanceList.push(obj);
          }
        );
      }
      res.send(attendanceList);
    }
  );
});


// Returns studentName and attendanceStatus for a particular course on a particular date
app.post("/faculty/attendance", function (req, res) {
  var cID = req.body.courseID;
  var date = req.body.date; //"DD-MM-YY"
  var attendance = Course.find({ courseID: cID }, { attendance: 1 });
  var attendanceList = [];

  for (var key in attendance) {
    var studentName = Student.find(
      { registrationNumber: key.registrationNumber },
      { StudentName: 1 }
    );
    for (var key1 in key.historyOfAttendance) {
      if (key1.attendanceDate === date) {
        let obj = {
          registrationNumber: key.registrationNumber,
          studentName: studentName,
          attendanceStatus: key1.status,
        };
        attendanceList.push(obj);
      } else {
        res.send("Date doesn't match the Time slot given");
      }
    }
  }

  res.send(attendanceList);
});


// Updates the database based on whether the student's scan 
// was valid or invalid
app.post("/markAttendance", function (req, res) {
  var facID = req.body.facID; // This is in da QR
  var regNo = req.body.regNo;
  var cID = req.body.courseID;
  var date = req.body.date;
  var isPresent = req.body.status; // This is bool bitch

  let attendanceList = [];
  if (isPresent) {
    
    Course.findOne({ courseID: cID }, async function (err, course) {
      if (err) {
        res.send(err);
      } else {
        var len = course.attendance.length;
        for (var i = 0; i < len; i++) {
          if (course.attendance[i].registrationNumber === regNo) {
            let obj = {
              attendanceDate: date,
              status: "Present",
            };
            attendanceList.push(obj);
          }
        }
      }
    });


    Course.updateOne({courseID: cID, attendance: {$elemMatch: {registrationNumber: regNo}}}, {attendance: {historyOfAttendance: {$push: {
      attendanceDate: date,
      status: "Present"
    }}}}, function(err, doc){
      if(err){
        res.send(err)
      }
      else{
        res.send("Successfully updated");
      }
    })
    // Course.updateOne({courseID: cID}, {$set:{ attendance[index].registrationNumber }})
  } else {
  }
});


// To add a new course to the database
app.post("/newCourse", function(req, res) {
  let facID = req.body.facultyID;
  let cName = req.body.courseName;
  let slot = req.body.slot;

  let newCourseID = uuidv4();
  let newCourse = new Course({
    courseID: newCourseID,
    courseName: cName,
    slot: slot,
    facultyID: facID,
    attendance: []
  });

  newCourse.save(function(err){
    if(!err){
      res.status(200).send(newCourse);
    } else{
      res.send(err);
    }
  }); 
});

// ** DOUBT ROUTES ** //

// GET route that sends the doubt object
app.get("/doubts", function (req, res) {
  const doubts = Doubts.find({}, { doubts: 1 });

  res.send(doubts);
});


// POST route that sends courseID, courseName and the marked
// doubts based on the facultyID
app.post("/doubts", function (req, res) {
  // facID should be substituted for the corresponding front-end variable
  let doubtsList = [];
  Doubts.findOne(
    { facultyID: req.body.facID },
    { doubts: 1 },
    async function (err, markedDoubts) {
      if (err) {
        res.send(err);
      } else {
        var len = markedDoubts.doubts.length;
        var i;
        for (i = 0; i < len; i++) {
          await Course.findOne(
            { courseID: markedDoubts.doubts[i].courseID },
            { courseID: 1, courseName: 1, slot: 1 },
            function (err, cnas) { //cnas = course name and slot
              if (err) {
                res.send(err);
              } else {
                var index = 0;
                let obj = {
                  courseID: cnas.courseID,
                  courseName: cnas.courseName,
                  doubt: markedDoubts.doubts[index].doubt,
                };
                doubtsList.push(obj);
                index++;
              }
            }
          );
        }
        res.send(doubtsList);
      }
    }
  );
});

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function (req, res) {
  console.log("Server started on", port);
});
