import express from "express";
import {
  createStudent,
  getStudents,
  updateStudent,
  deleteStudent,
} from "../controllers/studentController.js";
const router = express.Router();
router.post("/", createStudent);
router.get("/", getStudents);
router.put("/", updateStudent);
router.delete("/:id", deleteStudent);
export default router;
