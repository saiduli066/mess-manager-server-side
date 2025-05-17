import bcrypt from "bcryptjs";
import User from "../models/user.model.js";
import { generateToken } from "../utils/jwt-token.js";



//Sign Up
export const signup = async (req, res) => {
   try {
    const { name, email, password, phone, image } = req.body;

    const isExist = await User.findOne({ email });
    if (isExist) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      phone,
      image,
    });

    if (newUser) {
      generateToken(newUser._id, res);
      await newUser.save();
      res.status(201).json({
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }

   } catch (error) {
    console.log("error from signup controller: ", error.message);
    res.status(500).json({ message: "Internal Server Error" });
 
   }
}


//login

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user =await User.findOne({ email });

        if (!user) {
            return res
              .status(400)
              .json({ message: "Invalid email or password" });

        }
        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res
              .status(400)
              .json({ message: "Invalid email or password" });

        }
      
            generateToken(user._id, res);
            res.json({
              _id: user._id,
              name: user.name,
              email: user.email,
              role: user.role,
            });
        



    } catch (error) {
        console.log("error from login controller: ", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }


}

//logout
export const logout = async (req, res) => {
  try {
    res.clearCookie("jwt", {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV !== "development",
    });

    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("error from logout controller: ", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
  