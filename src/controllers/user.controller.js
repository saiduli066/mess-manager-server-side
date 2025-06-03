import bcrypt from "bcryptjs";
import { generateToken } from "../utils/jwt-token.js";
import Mess from "../models/mess.model.js";
import User from "../models/user.model.js";
import cloudinary from "../utils/cloudinary.js";

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
        phone: newUser.phone,
        image:newUser?.image,
        role: newUser.role,
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    console.log("error from signup controller: ", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

//login

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    generateToken(user._id, res);
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone:user?.phone,
      image:user?.image,
      role: user.role,
    });
  } catch (error) {
    console.log("error from login controller: ", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

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


//check auth
export const checkAuth = (req, res) => {
  try {
    res.status(200).json(req.user);
  } catch (error) {
    console.log("error in checkAuth controller: ", error.message);
    res.status(500).json({ message: "Internal server error." });
  }
};

//  user's profile---

export const getUserProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select(
      "name email phone image messId"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let messName = "Not joined in any mess";

    if (user.messId) {
      const mess = await Mess.findById(user.messId).select("name");
      if (mess) messName = mess.name;
    }

    res.status(200).json({
      name: user.name,
      email: user.email,
      phone: user?.phone,
      image: user?.image,
      role:user?.role,
      messName,
    });
  } catch (error) {
    console.error("Error in getUserProfile:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};



//update user's profile-

// export const updateUserProfile = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { phone, image } = req.body;

//     const updatedUser = await User.findByIdAndUpdate(
//       userId,
//       { phone, image },
//       { new: true, runValidators: true }
//     ).select("name email phone image");

//     if (!updatedUser) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     res.status(200).json({
//       message: "Profile updated successfully",
//       user: updatedUser,
//     });
//   } catch (error) {
//     console.error("Error in updateUserProfile:", error.message);
//     res.status(500).json({ message: "Internal Server Error" });
//   }
// };





export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { phone } = req.body;

    let imageUrl;

    //  image upload to Cloudinary
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "mess-manager/user-profiles",
      });
      imageUrl = result.secure_url;
    }

    const updateFields = {};
    if (phone) updateFields.phone = phone;
    if (imageUrl) updateFields.image = imageUrl;

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateFields, {
      new: true,
      runValidators: true,
    }).select("name email phone image");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

   return res.status(200).json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error in updateUserProfile:", error);
   return  res.status(500).json({ message: "Internal Server Error" });
  }
};