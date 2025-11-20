import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

// never ever store the scre
//Generate Access Token (valid for 15 mins)
export const generateAccessToken = (payload) => {
  const { _id, username } = payload;
  console.log(process.env.JWT_SECRET);
  return jwt.sign(
    {
      _id,
      username: username || null,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
};

export const generateRefreshToken = (payload) => {
  const { _id, name, username } = payload;
  return jwt.sign(
    {
      _id,
      name: name || null,
      username: username || null,
    },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "10d" }
  );
};

export const verifyJWT = async (req, res, next) => {
  console.log("token came for verification");
  const token =
    req.cookies.accessToken ||
    req.header("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decodedToken._id).select(
      "-password -refreshToken"
    );
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid Access Token" });
  }
};
