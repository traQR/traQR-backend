//jshint esversion:6
require("dotenv").config();

const express = require("express");

var cors = require("cors");

const admin = require("firebase-admin");

const { v4: uuidv4 } = require("uuid");

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

// DATABASE MODELS AND SCHEMAS
const mongoose = require("mongoose");

mongoose.connect(
  "mongodb+srv://TraQR-admin:WTTTQR-access@traqrdb.db1i1.mongodb.net/test-traqrDB",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

mongoose.set("useFindAndModify", false);

//Course collection
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
          attendanceDate: Date,
          status: String,
        },
      ],
    },
  ],
});

//Student collection
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

//Faculty collection
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

//Doubt collection
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

const Doubt = mongoose.model("Doubt", doubtSchema);

//* Sleep function *//
function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

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

    res.send("Successfully inserted Student user");
  } else {
    const user = new Faculty({
      facultyID: facID,
      facultyName: facultyName,
      coursesHandled: [],
    });

    user.save();

    let newDoubt = new Doubt({
      facultyID: facID,
      doubts: [],
    });

    newDoubt.save();

    res.send("Successfully inserted Faculty user");
  }
});

//getDetails get details of student or faculty based on isStudent
app.post("/getDetails", function (req, res) {
  let { isStudent, regNo, facID } = req.body;
  if (isStudent) {
    Student.findOne(
      { registrationNumber: regNo },
      { registrationNumber: 1, studentName: 1 },
      function (err, details) {
        if (err) {
          res.send(err);
        } else {
          if (details == null) {
            res.sendStatus(404);
          } else {
            res.send(details);
          }
        }
      }
    );
  } else {
    Faculty.findOne(
      { facultyID: facID },
      { facultyID: 1, facultyName: 1 },
      function (err, details) {
        if (err) {
          res.send(err);
        } else {
          if (details == null) {
            res.sendStatus(404);
          } else {
            res.send(details);
          }
        }
      }
    );
  }
});

// Retrieveing fields from Student object
app.post("/courses", function (req, res) {
  var regNo = req.body.regNo;
  Student.find(
    {
      registrationNumber: regNo,
    },
    {
      coursesTaken: 1,
    },
    function (err, studentCoursesTaken) {
      if (err) {
        res.send(err);
      } else {
        if (studentCoursesTaken == null) {
          res.sendStatus(404);
        } else {
          res.send(studentCoursesTaken);
        }
      }
    }
  );
});

// Retrieving fields from course object
app.post("/courses/courseID", function (req, res) {
  var cID = req.body.courseID;
  let info = [];
  Course.findOne(
    {
      courseID: cID,
    },
    {
      courseID: 1,
      courseName: 1,
      slot: 1,
      facultyID: 1,
    },
    async function (err, courseInfo) {
      if (err) {
        res.send(err);
      } else {
        if (courseInfo == null) {
          res.sendStatus(404);
        } else {
          await Faculty.findOne(
            {
              facultyID: courseInfo.facultyID,
            },
            {
              facultyID: 1,
              facultyName: 1,
            },
            function (err, facultyInfo) {
              if (err) {
              } else {
                if (facultyInfo == null) {
                  res.sendStatus(404);
                } else {
                  let obj = {
                    courseID: courseInfo.courseID,
                    courseName: courseInfo.courseName,
                    slot: courseInfo.slot,
                    facultyID: courseInfo.facultyID,
                    facultyName: facultyInfo.facultyName,
                  };
                  info.push(obj);
                  res.send({
                    info: obj,
                  });
                }
              }
            }
          );
        }
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
    {
      courseID: cID,
    },
    {
      attendance: 1,
    },
    function (err, tempAttendance) {
      if (err) {
        res.send(err);
      } else {
        if (tempAttendance == null) {
          res.sendStatus(404);
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
    }
  );
});

// Sends courseName, slot and attendancePercent based on registration number
app.post("/attendance", function (req, res) {
  var regNo = req.body.regNo;
  var percentageList = [];

  Student.findOne(
    {
      registrationNumber: regNo,
    },
    {
      coursesTaken: 1,
    },
    async function (err, studentCourses) {
      if (err) {
        res.send(err);
      } else {
        if (studentCourses == null) {
          res.sendStatus(404);
        } else {
          var len = studentCourses.coursesTaken.length;
          for (var i = 0; i < len; i++) {
            await Course.findOne(
              {
                courseID: studentCourses.coursesTaken[i].courseID,
              },
              {
                courseID: 1,
                courseName: 1,
                slot: 1,
                attendance: 1,
              },
              function (err, attendanceSummary) {
                if (err) {
                  res.send(err);
                } else {
                  var len1 = attendanceSummary.attendance.length;
                  for (var j = 0; j < len1; j++) {
                    if (
                      attendanceSummary.attendance[j].registrationNumber ===
                      regNo
                    ) {
                      //Calculating attendance percentage
                      let tot =
                        attendanceSummary.attendance[j].historyOfAttendance
                          .length;
                      let present = 0;

                      for (let k = 0; k < tot; k++) {
                        if (
                          attendanceSummary.attendance[j].historyOfAttendance[k]
                            .status == "Present"
                        ) {
                          present++;
                        }
                      }
                      let absent = tot - present;
                      let obj = {
                        courseID: attendanceSummary.courseID,
                        courseName: attendanceSummary.courseName,
                        slot: attendanceSummary.slot,
                        attendancePercent:
                          attendanceSummary.attendance[j].attendancePercentage,
                        present: present,
                        absent: absent,
                      };
                      percentageList.push(obj);
                    }
                  }
                }
              }
            );
          }
          res.send({
            percentageList,
          });
        }
      }
    }
  );
});

// Send teacherCourses
app.post("/faculty", function (req, res) {
  Faculty.findOne(
    {
      facultyID: req.body.facID,
    },
    {
      coursesHandled: 1,
    },
    function (err, teacherCourses) {
      if (err) {
        res.send(err);
      } else {
        if (teacherCourses == null) {
          res.sendStatus(404);
        } else {
          res.send(teacherCourses);
        }
      }
    }
  );
});

// Returns attendance statistics of the students based on particular courseID
app.post("/attendance-stats", function (req, res) {
  var cID = req.body.courseID;
  let attendanceList = [];

  Course.findOne(
    {
      courseID: cID,
    },
    {
      attendance: 1,
    },
    async function (err, stats) {
      if (err) {
        res.send(err);
      } else {
        if (stats == null) {
          res.sendStatus(404);
        } else {
          var len = stats.attendance.length;
          for (var i = 0; i < len; i++) {
            await Student.findOne(
              {
                registrationNumber: stats.attendance[i].registrationNumber,
              },
              {
                studentName: 1,
              },
              function (err, asnap) {
                if (err) {
                  res.send(err);
                } else {
                  if (asnap == null) {
                    res.sendStatus(404);
                  } else {
                    // asnap = attendance student name and percentage
                    let obj = {
                      registrationNumber:
                        stats.attendance[i].registrationNumber,
                      studentName: asnap.studentName,
                      attendancePercentage:
                        stats.attendance[i].attendancePercentage,
                    };
                    attendanceList.push(obj);
                  }
                }
              }
            );
          }
          res.send(attendanceList);
        }
      }
    }
  );
});

// Returns studentName and attendanceStatus for a particular course on a particular date
app.post("/faculty/attendance", function (req, res) {
  //TODO: Have to provide studentName to frontend (NOT DONE)
  var cID = req.body.courseID;
  var date = new Date(req.body.date); //"DD-MM-YY"
  let attendanceList = [];
  Course.findOne(
    {
      courseID: cID,
    },
    {
      attendance: 1,
    },
    async function (err, studentAttendance) {
      if (err) {
        res.send(err);
      } else {
        if (studentAttendance == null) {
          res.sendStatus(404);
        } else {
          let len = studentAttendance.attendance.length;
          for (let i = 0; i < len; i++) {
            let len1 =
              studentAttendance.attendance[i].historyOfAttendance.length;
            for (let j = 0; j < len1; j++) {
              if (
                studentAttendance.attendance[i].historyOfAttendance[
                  j
                ].attendanceDate.getTime() === date.getTime()
              ) {
                let obj = {
                  registrationNumber:
                    studentAttendance.attendance[i].registrationNumber,
                  attendanceStatus:
                    studentAttendance.attendance[i].historyOfAttendance[j]
                      .status,
                };
                attendanceList.push(obj);
              }
            }
          }
          res.send({
            attendanceList,
          });
        }
      }
    }
  );
});

// Updates the database based on whether the student's scan
// was valid or invalid
app.post("/markAttendance", function (req, res) {
  // var facID = req.body.facID; // This is in da QR
  var regNo = req.body.regNo;
  var cID = req.body.courseID;
  var date = new Date(req.body.date);
  var isPresent = req.body.status; // This is bool bitch

  if (isPresent) {
    Course.findOne(
      {
        courseID: cID,
      },
      async function (err, course) {
        if (err) {
          res.send(err);
        } else {
          if (course == null) {
            res.sendStatus(404);
          } else {
            var len = course.attendance.length;
            let percent = 0;
            let present = 1;
            for (let i = 0; i < len; i++) {
              if (course.attendance[i].registrationNumber === regNo) {
                let tot = course.attendance[i].historyOfAttendance.length;

                for (let k = 0; k < tot; k++) {
                  if (
                    course.attendance[i].historyOfAttendance[k].status ==
                    "Present"
                  ) {
                    present++;
                  }
                }
                percent = (present / (tot + 1)) * 100;
              }
            }

            for (var i = 0; i < len; i++) {
              if (course.attendance[i].registrationNumber === regNo) {
                let obj = {
                  registrationNumber: regNo,
                  attendancePercentage: percent,
                  historyOfAttendance: course.attendance[i].historyOfAttendance,
                };
                obj.historyOfAttendance.push({
                  attendanceDate: date,
                  status: "Present",
                });

                // deleting before pushing
                Course.findOneAndUpdate(
                  {
                    courseID: cID,
                  },
                  {
                    $pull: {
                      attendance: {
                        registrationNumber: regNo,
                      },
                    },
                  },
                  async function (err) {
                    if (err) {
                      res.send(err);
                    } else {
                      Course.findOneAndUpdate(
                        {
                          courseID: cID,
                        },
                        {
                          $push: {
                            attendance: obj,
                          },
                        },
                        function (err, doc) {
                          if (err) {
                            res.send(err);
                          } else {
                            // res.send(doc);
                          }
                        }
                      );
                    }
                  }
                );
                // Adding updated object
              }
            }
            res.send("Updated student, marked as Present");
          }
        }
      }
    );
  } else {
    Course.findOne(
      {
        courseID: cID,
      },
      async function (err, course) {
        if (err) {
          res.send(err);
        } else {
          if (course == null) {
            res.sendStatus(404);
          } else {
            var len = course.attendance.length;
            let percent = 0;
            let present = 0;
            for (let i = 0; i < len; i++) {
              if (course.attendance[i].registrationNumber === regNo) {
                let tot = course.attendance[i].historyOfAttendance.length;

                for (let k = 0; k < tot; k++) {
                  if (
                    course.attendance[i].historyOfAttendance[k].status ==
                    "Present"
                  ) {
                    present++;
                  }
                }
                percent = (present / (tot + 1)) * 100;
              }
            }

            for (var i = 0; i < len; i++) {
              if (course.attendance[i].registrationNumber === regNo) {
                let obj = {
                  registrationNumber: regNo,
                  attendancePercentage: percent,
                  historyOfAttendance: course.attendance[i].historyOfAttendance,
                };
                obj.historyOfAttendance.push({
                  attendanceDate: date,
                  status: "Absent",
                });

                // deleting before pushing
                Course.findOneAndUpdate(
                  {
                    courseID: cID,
                  },
                  {
                    $pull: {
                      attendance: {
                        registrationNumber: regNo,
                      },
                    },
                  },
                  async function (err) {
                    if (err) {
                      res.send(err);
                    } else {
                      Course.findOneAndUpdate(
                        {
                          courseID: cID,
                        },
                        {
                          $push: {
                            attendance: obj,
                          },
                        },
                        function (err, doc) {
                          if (err) {
                            res.send(err);
                          } else {
                            // res.send(doc);
                          }
                        }
                      );
                    }
                  }
                );
                // Adding updated object
              }
            }
            res.send("Updated student, marked as Absent");
          }
        }
      }
    );
  }
});

// To add a new course to the database
app.post("/newCourse", function (req, res) {
  let facID = req.body.facultyID;
  let cName = req.body.courseName;
  let slot = req.body.slot;

  let newCourseID = uuidv4();

  Course.find(
    {
      facultyID: facID,
    },
    {
      courseName: 1,
      slot: 1,
    },

    async (err, checkCourse) => {
      if (err) {
        res.send(err);
      } else {
        let duplicate = false;

        for (var i = 0; i < checkCourse.length; i++) {
          //added direct len
          if (
            checkCourse[i].courseName === cName &&
            checkCourse[i].slot === slot
          ) {
            duplicate = true;
            break;
          }
        }

        //Checking for duplicates
        if (duplicate) {
          res.send("Error: Sending duplicate course");
        } else {
          //new course object
          let newCourse = new Course({
            courseID: newCourseID,
            courseName: cName,
            slot: slot,
            facultyID: facID,
            attendance: [],
          });

          //save the new course
          newCourse.save((err) => {
            if (!err) {
              // console.log("Updated successfully");
            } else {
              res.send(err);
            }
          });

          let facultyHandled = {
            courseID: newCourseID,
            courseName: cName,
          };

          Faculty.findOneAndUpdate(
            {
              facultyID: facID,
            },
            {
              $push: {
                coursesHandled: facultyHandled,
              },
            },
            function (err, result) {
              if (err) {
                res.send(err);
              } else {
                // console.log(result);
                // res.write("Updated faculty schema Successfully");
              }
            }
          );
          res.send("Updated Faculty and Course Schema");
        }
      }
    }
  );
});

app.post("/checkCourse", function (req, res) {
  let cID = req.body.cID;
  let regNo = req.body.regNo;
  Course.findOne(
    { courseID: cID },
    { attendance: 1 },
    function (err, attendanceList) {
      if (err) {
        res.send(err);
      } else {
        let len = attendanceList.attendance;
        let check = false;
        for (let i = 0; i < len; i++) {
          if (attendanceList.attendance[i].registrationNumber === regNo) {
          }
        }
      }
    }
  );
});

// To add a student to a course
app.post("/addStudent", function (req, res) {
  regNo = req.body.regNo;
  cID = req.body.courseID;

  Student.findOne(
    {
      registrationNumber: regNo,
    },
    {
      coursesTaken: 1,
    },
    async function (err, coursesList) {
      if (err) {
        res.send(err);
      } else {
        if (coursesList == null) {
          res.sendStatus(404);
        } else {
          let duplicate = false;
          let len = coursesList.coursesTaken.length;
          for (let i = 0; i < len; i++) {
            if (coursesList.coursesTaken[i].courseID === cID) {
              duplicate = true;
              break;
            }
          }

          if (duplicate) {
            res.send("Inserting duplicate course, rejected request");
          } else {
           

            Course.findOne(
              { courseID: cID },
              { courseID: 1, courseName: 1, slot: 1 },
              function (err, courseDetails) {
                if (err) {
                  res.send(err);
                } else {
                  if (courseDetails == null) {
                    res.sendStatus(404);
                  } else {
                    let obj = {
                      courseID: cID,
                      courseName: courseDetails.courseName,
                      slot: courseDetails.slot,
                    };
                    Student.findOneAndUpdate(
                      {
                        registrationNumber: regNo,
                      },
                      {
                        $push: {
                          coursesTaken: obj,
                        },
                      },
                      function (err) {
                        if (err) {
                          res.send(err);
                        }
                      }
                    );
                  }
                }
              }
            );

            Course.findOne(
              { courseID: cID },
              { attendance: 1 },
              function (err, attendanceList) {
                if (err) {
                  res.send(err);
                } else {
                  if (attendanceList == null) {
                    res.sendStatus(404);
                  } else {
                    let obj = {
                      registrationNumber: regNo,
                      attendancePercentage: 0,
                      historyOfAttendance: [],
                    };
                    Course.findOneAndUpdate(
                      { courseID: cID },
                      { $push: { attendance: obj } },
                      function (err, response) {
                        if (err) {
                          res.send(err);
                        }
                      }
                    );
                  }
                }
              }
            );

            res.send("Student has been added successfully");
          }
        }
      }
    }
  );
});

// ** DOUBT ROUTES ** //

// GET route that sends the doubt object
app.get("/doubts", function (req, res) {
  const doubts = Doubt.find(
    {},
    {
      doubts: 1,
    }
  );

  res.send(doubts);
});

// POST route that sends courseID, courseName and the marked
// doubts based on the facultyID
app.post("/doubts", function (req, res) {
  // facID should be substituted for the corresponding front-end variable
  let facID = req.body.facID;
  doubtsList = [];
  Doubt.findOne(
    {
      facultyID: facID,
    },
    {
      doubts: 1,
    },
    async function (err, markedDoubts) {
      if (err) {
        res.send(err);
      } else {
        if (markedDoubts == null) {
          res.sendStatus(404);
        } else {
          var len = markedDoubts.doubts.length;
          var i;
          for (i = 0; i < len; i++) {
            await Course.findOne(
              {
                courseID: markedDoubts.doubts[i].courseID,
              },
              {
                courseID: 1,
                courseName: 1,
                slot: 1,
              },
              function (err, cnas) {
                //cnas = course name and slot
                if (err) {
                  res.send(err);
                } else {
                  if (cnas == null) {
                    res.sendStatus(404);
                  } else {
                    let obj = {
                      doubtID: markedDoubts.doubts[i]._id,
                      courseID: cnas.courseID,
                      courseName: cnas.courseName,
                      doubt: markedDoubts.doubts[i].doubt,
                    };
                    doubtsList.push(obj);
                  }
                }
              }
            );
            await sleep(100);
          }
          res.send(doubtsList);
        }
      }
    }
  );
});

// To add doubt
app.post("/addDoubt", function (req, res) {
  var facID = req.body.facID;
  var cID = req.body.courseID;
  var doubt = req.body.doubt;

  let obj = {
    courseID: cID,
    doubt: doubt,
  };
  Doubt.findOneAndUpdate(
    { facultyID: facID },
    { $push: { doubts: obj } },
    function (err, result) {
      if (err) {
        res.send(err);
      } else {
        res.send("Updated Successfully");
      }
    }
  );
});

app.post("/deleteDoubt", function (req, res) {
  var facID = req.body.facID;
  var id = req.body.doubtID;

  Doubt.findOneAndUpdate(
    { facultyID: facID },
    {
      $pull: {
        doubts: {
          _id: id,
        },
      },
    },
    function (err, result) {
      if (err) {
        res.send(err);
      } else {
        res.send("Updated Successfully");
      }
    }
  );
});

//Server port for Heroku
//Server port for localhost:3000
let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function (req, res) {
  console.log("Server started on", port);
});
