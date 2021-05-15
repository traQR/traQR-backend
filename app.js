//jshint esversion:6
require("dotenv").config();

const express = require("express");

var cors = require("cors");

const admin = require("firebase-admin");

const {
  v4: uuidv4
} = require("uuid");

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
  "mongodb+srv://TraQR-admin:WTTTQR-access@traqrdb.db1i1.mongodb.net/test-traqrDB", {
    useNewUrlParser: true,
    useUnifiedTopology: true
  }
);

mongoose.set("useFindAndModify", false);

const courseSchema = new mongoose.Schema({
  courseID: {
    type: String,
    required: [true, "There must be a course ID"],
  },
  courseName: String,
  slot: String,
  facultyID: String,
  attendance: [{
    registrationNumber: String,
    attendancePercentage: Number,
    historyOfAttendance: [{
      attendanceDate: String,
      status: String,
    }, ],
  }, ],
});

const studentSchema = new mongoose.Schema({
  registrationNumber: String,
  studentName: String,
  coursesTaken: [{
    courseID: String,
    courseName: String,
    slot: String,
  }, ],
});

const facultySchema = new mongoose.Schema({
  facultyID: String,
  facultyName: String,
  coursesHandled: [{
    courseID: String,
    courseName: String,
  }, ],
});

const doubtSchema = new mongoose.Schema({
  facultyID: String,
  doubts: [{
    courseID: String,
    doubt: String,
  }, ],
});

const Student = mongoose.model("Student", studentSchema);

const Faculty = mongoose.model("Faculty", facultySchema);

const Course = mongoose.model("Course", courseSchema);

const Doubts = mongoose.model("Doubts", doubtSchema);

// ***  ROUTES *** //

// To create new user
app.post("/newUser", function (req, res) {
  let {
    isStudent,
    studentName,
    regNo,
    facID,
    facultyName
  } = req.body;
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
    res.send("Successfully inserted Faculty user");
  }
});

// Retrieveing fields from Student object
app.post("/courses", function (req, res) {
  var regNo = req.body.regNo;
  Student.find({
      registrationNumber: regNo
    }, {
      coursesTaken: 1
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
  Course.findOne({
      courseID: cID
    }, {
      courseID: 1,
      courseName: 1,
      slot: 1,
      facultyID: 1
    },
    async function (err, courseInfo) {
      if (err) {
        res.send(err);
      } else {
        if (courseInfo == null) {
          res.status(404).send(cID, " not found");
        } else {
          await Faculty.findOne({
              facultyID: courseInfo.facultyID
            }, {
              facultyID: 1,
              facultyName: 1
            },
            function (err, facultyInfo) {
              if (err) {} else {
                if (facultyInfo == null) {
                  res
                    .status(404)
                    .send("faculty not found");
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
                    info: obj
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

  Course.findOne({
      courseID: cID
    }, {
      attendance: 1
    },
    function (err, tempAttendance) {
      if (err) {
        res.send(err);
      } else {
        if (tempAttendance == null) {
          res.status(404).send(cid, " not found");
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

  Student.findOne({
      registrationNumber: regNo
    }, {
      coursesTaken: 1
    },
    async function (err, studentCourses) {
      if (err) {
        res.send(err);
      } else {
        if (studentCourses == null) {
          res.status(404).send("Student of ", regNo, " doesnt exist");
        } else {
          var len = studentCourses.coursesTaken.length;
          for (var i = 0; i < len; i++) {
            await Course.findOne({
                courseID: studentCourses.coursesTaken[i].courseID
              }, {
                courseID: 1,
                courseName: 1,
                slot: 1,
                attendance: 1
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
                        attendancePercent: attendanceSummary.attendance[j].attendancePercentage,
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
            percentageList
          });
        }
      }
    }
  );
});

// Send teacherCourses
app.post("/faculty", function (req, res) {
  Faculty.findOne({
      facultyID: req.body.facID
    }, {
      coursesHandled: 1
    },
    function (err, teacherCourses) {
      if (err) {
        res.send(err);
      } else {
        if (teacherCourses == null) {
          res.status(404).send("Faculty information not found in database");
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

  Course.findOne({
      courseID: cID
    }, {
      attendance: 1
    },
    async function (err, stats) {
      if (err) {
        res.send(err);
      } else {
        if (stats == null) {
          res.status(404).send("Course ", cID, " doesnt exist in database");
        } else {
          var len = stats.attendance.length;
          for (var i = 0; i < len; i++) {
            await Student.findOne({
                registrationNumber: stats.attendance[i].registrationNumber
              }, {
                studentName: 1
              },
              function (err, asnap) {
                if (err) {
                  res.send(err);
                } else {
                  if (asnap == null) {
                    res
                      .status(404)
                      .send("Student details not found in database");
                  } else {
                    // asnap = attendance student name and percentage
                    let obj = {
                      registrationNumber: stats.attendance[i].registrationNumber,
                      studentName: asnap.studentName,
                      attendancePercentage: stats.attendance[i].attendancePercentage,
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
  var date = req.body.date; //"DD-MM-YY"
  let attendanceList = [];
  Course.findOne({
      courseID: cID
    }, {
      attendance: 1
    },
    async function (err, studentAttendance) {
      if (err) {
        res.send(err);
      } else {
        if (studentAttendance == null) {
          res.status(404).send("Course ", cID, " not found");
        } else {
          let len = studentAttendance.attendance.length;
          for (let i = 0; i < len; i++) {
            let len1 =
              studentAttendance.attendance[i].historyOfAttendance.length;
            for (let j = 0; j < len1; j++) {
              if (
                studentAttendance.attendance[i].historyOfAttendance[j]
                .attendanceDate === date
              ) {
                let obj = {
                  registrationNumber: studentAttendance.attendance[i].registrationNumber,
                  attendanceStatus: studentAttendance.attendance[i].historyOfAttendance[j]
                    .status,
                };
                attendanceList.push(obj);
              }
            }
          }
          res.send({
            attendanceList
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
  var date = req.body.date;
  var isPresent = req.body.status; // This is bool bitch

  if (isPresent) {
    Course.findOne({
      courseID: cID
    }, async function (err, course) {
      if (err) {
        res.send(err);
      } else {
        if (course == null) {
          res.status(404).send("Course ", cID, " not found");
        } else {
          var len = course.attendance.length;
          let percent = 0;
          let present = 1;
          for (let i = 0; i < len; i++) {
            if (course.attendance[i].registrationNumber === regNo) {
              let tot = course.attendance[i].historyOfAttendance.length;

              for (let k = 0; k < tot; k++) {
                if (course.attendance[i].historyOfAttendance[k].status == "Present") {
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
              Course.findOneAndUpdate({
                  courseID: cID
                }, {
                  $pull: {
                    attendance: {
                      registrationNumber: regNo
                    }
                  }
                },
                async function (err) {
                  if (err) {
                    res.send(err);
                  } else {
                    Course.findOneAndUpdate({
                        courseID: cID
                      }, {
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
        }
        res.send("Updated student, marked as Present");
      }
    });
  } else {
    Course.findOne({
      courseID: cID
    }, async function (err, course) {
      if (err) {
        res.send(err);
      } else {
        if (course == null) {
          res.status(404).send("Course ", cID, " not found");
        } else {
          var len = course.attendance.length;
          let percent = 0;
          let present = 0;
          for (let i = 0; i < len; i++) {
            if (course.attendance[i].registrationNumber === regNo) {
              let tot = course.attendance[i].historyOfAttendance.length;

              for (let k = 0; k < tot; k++) {
                if (course.attendance[i].historyOfAttendance[k].status == "Present") {
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
              Course.findOneAndUpdate({
                  courseID: cID
                }, {
                  $pull: {
                    attendance: {
                      registrationNumber: regNo
                    }
                  }
                },
                async function (err) {
                  if (err) {
                    res.send(err);
                  } else {
                    Course.findOneAndUpdate({
                        courseID: cID
                      }, {
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
        }
        res.send("Updated student, marked as Absent");
      }
    });
  }
});

// To add a new course to the database
app.post("/newCourse", async function (req, res) {
  let facID = req.body.facultyID;
  let cName = req.body.courseName;
  let slot = req.body.slot;

  let newCourseID = uuidv4();

  await Course.find({
      facultyID: facID
    }, {
      courseName: 1,
      slot: 1
    },

    async (err, checkCourse) => {
      if (err) {
        res.write(err);
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
              console.log("Updated successfully");
            } else {
              res.send(err);
            }
          });

          let facultyHandled = {
            courseID: newCourseID,
            courseName: cName,
          };

          Faculty.findOneAndUpdate({
              facultyID: facID
            }, {
              $push: {
                coursesHandled: facultyHandled,
              },
            },
            function (err, result) {
              if (err) {
                res.send(err);
              } else {
                console.log(result);
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


// To add a student to a course
app.post("/addStudent", function (req, res) {
  regNo = req.body.regNo;
  cID = req.body.courseID;
  cName = req.body.courseName;
  slot = req.body.slot;

  Student.findOne({
      registrationNumber: regNo
    }, {
      coursesTaken: 1
    },
    async function (err, coursesList) {
      if (err) {
        res.send(err);
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
          res.status(400).send("You have already been added to this course.");
        } else {
          let obj = {
            courseID: cID,
            courseName: cName,
            slot: slot
          };

          Student.findOneAndUpdate({
            registrationNumber: regNo
          }, {
            $push: {
              coursesTaken: obj
            }
          }, function (err) {
            if (err) {
              res.send(err);
            } else {
              res.send("Student added course successfullly.");
            }
          });
        }
      }
    });
});

// ** DOUBT ROUTES ** //

// GET route that sends the doubt object
app.get("/doubts", function (req, res) {
  const doubts = Doubts.find({}, {
    doubts: 1
  });

  res.send(doubts);
});

// POST route that sends courseID, courseName and the marked
// doubts based on the facultyID
app.post("/doubts", function (req, res) {
  // facID should be substituted for the corresponding front-end variable
  let doubtsList = [];
  Doubts.findOne({
      facultyID: req.body.facID
    }, {
      doubts: 1
    },
    async function (err, markedDoubts) {
      if (err) {
        res.send(err);
      } else {
        if (markedDoubts == null) {
          res.status(404).send("Faculty ", facID, " is not found in database");
        } else {
          var len = markedDoubts.doubts.length;
          var i;
          for (i = 0; i < len; i++) {
            await Course.findOne({
                courseID: markedDoubts.doubts[i].courseID
              }, {
                courseID: 1,
                courseName: 1,
                slot: 1
              },
              function (err, cnas) {
                //cnas = course name and slot
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