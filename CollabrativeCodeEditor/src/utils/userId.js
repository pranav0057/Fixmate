import { v4 as uuidv4 } from "uuid"; // install: npm i uuid

export const getUserId = () => {
  let userId = sessionStorage.getItem("userId");
  if (!userId) {
    userId = uuidv4();
    sessionStorage.setItem("userId", userId);
  }
  return userId;
};