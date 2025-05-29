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
      totalDeposit: 0,
    });

   return res.status(201).json({ message: "Mess created", mess });

    
  } catch (error) {
    console.error("Error in createMess:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};


// join mess via invite code


export const joinMess = async (req, res) => {
  try {
    const userId = req.user._id;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Prevent joining multiple messes
    if (user.mess) {
      return res.status(400).json({ message: "You already joined a mess." });
    }

    // code from either query or body
    const codeFromQuery = req.query.code;
    const codeFromBody = req.body.code;
    const messCode = codeFromQuery || codeFromBody;

    if (!messCode) {
      return res.status(400).json({ message: "Mess code is required" });
    }

    // Find the mess
    const mess = await Mess.findOne({ code: messCode });
    if (!mess) {
      return res.status(404).json({ message: "Invalid mess code" });
    }

    // Add user to mess
     mess.members.push(userId);
    await mess.save();

    // Update user's mess reference
     user.mess = mess._id;
    await user.save();

    return res.status(200).json({ message: "Successfully joined mess", mess });
  } catch (error) {
    console.error("Join mess error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};




// get mess info of a specific user. 

export const getMessInfo = async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate("messId");

    if (!user.messId) {
     return res.status(404).json({ message: "User has not joined any mess yet!" });
    }

   return res.status(200).json({ mess: user.messId });


  } catch (error) {
    console.error("Error in getMessInfo:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};


//leave a mess

// Leave mess
export const leaveMess = async (req, res) => {
  const userId = req.userId;  //from protect middleware

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: "User not found" });

  if (!user.messId) {
    return res.status(400).json({ message: "You are not joined in any mess" });
  }

  const mess = await Mess.findById(user.messId);
  if (!mess) return res.status(404).json({ message: "Mess not found" });

  // user.messId = null;
  // await user.save();

  // mess.members = mess.members.filter((member) => member.toString() !== userId);
  // await mess.save();

  //improved version of these lines-
  await Promise.all([
    User.findByIdAndUpdate(userId, { messId: null }),
    Mess.findByIdAndUpdate(mess._id, {
      $pull: { members: userId },
    }),
  ]);

  return res.status(200).json({ message: "Left mess successfully" });
};



// get mess members data--->

export const messMembersData = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.messId) {
      return res
        .status(400)
        .json({ message: "You are not joined in any mess." });
    }

    const membersData = await User.find({ messId: user.messId })
      .select("image name totalDeposit mealCount role")
      .sort({ role: 1 });

    return res.status(200).json({ membersData });
  } catch (error) {
    console.error("Error in messMembersData:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
