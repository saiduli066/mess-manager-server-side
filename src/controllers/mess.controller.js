import crypto from "crypto";
import Mess from "../models/mess.model.js";
import User from "../models/user.model.js";

export const createMess = async (req, res) => {
  try {
    const { name } = req.body; //Mess name;
    const userId = req.userId;

    //generate invite HEX code
    const code = crypto.randomBytes(4).toString("hex");

    const mess = new Mess({
      name,
      code,
      createdBy: userId,
      members: [userId],
    });

    await mess.save();

    await User.findByIdAndUpdate(userId, {
      messId: mess._id,
      role: "admin",
      mealCount: 0,
      depositAmount: 0,
    });

    res.status(201).json({ message: "Mess created", mess });
  } catch (error) {
    console.error("Error in createMess:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// join mess via invite code

export const joinMess = async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.userId;

    const mess = await Mess.findOne({ code });

    if (!mess) {
      return res.status(404).json({ message: "Invalid invitation code" });
    }

    if (mess.members.includes(userId)) {
      res
        .status(400)
        .json({ message: `You're already a member of ${mess.name} mess` });
      }
      

      //update mess info

      mess.members.push(userId);
      await mess.save();


    //updating user's mess info
    await User.findByIdAndUpdate(userId, {
      messId: mess._id,
      role: "member",
      mealCount: 0,
      depositAmount: 0,
    });
      
    res.status(200).json({ message: "Successfully joined the mess", mess });

  } catch (error) {
    console.error("Error in joinMess:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// get mess info of a specific user. 

export const getMessInfo = async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate("messId");

    if (!user.messId) {
      res.status(404).json({ message: "User has not joined any mess yet!" });
    }

    res.status(200).json({ mess: user.messId });


  } catch (error) {
    console.error("Error in getMessInfo:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};


//leave a mess

// Leave mess
export const leaveMess = async (req, res) => {
  try {
    const userId = req.user._id; // From protect middleware

    const user = await User.findById(userId);

    if (!user || !user.messId) {
      return res.status(400).json({ message: "User is not part of any mess" });
    }

    // Removing user from Mess.members array
    await Mess.findByIdAndUpdate(user.messId, { $pull: { members: userId } });

    user.messId = null;
    user.mealCount = 0;
    user.totalDeposit = 0;

    await user.save();

    res.status(200).json({ message: "You have successfully left the mess" });
  } catch (error) {
    console.error("error from leaveMess controller: ", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


// get mess members data--->

export const messMembersData = async(req, res) => {
  
 try {
   const user = await User.findById(req.userId);

   if (!user.messId) {
     res.status(400).json({ message: "You are not joined in any mess." });
   }

   // finding the members data of the same mess using user's  messId.
   const membersData = await User.find({ messId: user.messId })
     .select("Image name totalDeposit mealCount role")
     .sort({ role: 1 });
   
   
   res.status(200).json({ membersData });

   
 } catch (error) {
   console.error("Error in getMessMembersData:", error.message);
   res.status(500).json({ message: "Internal server error" });
 }
}