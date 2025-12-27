import { Router } from "express";
import { auth } from "../middlewares/auth.js";
import {
  createTodo,
  getPersonalRoomState,
  getWeeklyStudyStats,
  listTodos,
  startTodoTimer,
  stopTodoTimer,
  updatePersonalRoomState,
  updateTodo,
} from "../controllers/personalRoom.controller.js";

const r = Router();

r.use(auth(true));

r.get("/state", getPersonalRoomState);
r.put("/state", updatePersonalRoomState);

r.get("/todos", listTodos);
r.post("/todos", createTodo);
r.patch("/todos/:todoId", updateTodo);

r.post("/todos/:todoId/timer/start", startTodoTimer);
r.post("/todos/:todoId/timer/end", stopTodoTimer);

r.get("/study-stats/weekly", getWeeklyStudyStats);

export default r;


