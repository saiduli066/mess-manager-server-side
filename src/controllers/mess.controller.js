// // controllers/mess.controller.js
// import crypto from "crypto";
// import Mess from "../models/mess.model.js";
// import User from "../models/user.model.js";

// export const createMess = async (req, res) => {
//   try {
//     const { name } = req.body;
//     const userId = req.user._id;

//     const code = crypto.randomBytes(4).toString("hex");

//     const mess = new Mess({
//       name,
//       code,
//       createdBy: userId,
//       members: [userId],
//     });

//     await mess.save();

//     await User.findByIdAndUpdate(userId, {
//       messId: mess._id,
//       role: "admin",
//     });

//     res.status(201).json({ message: "Mess created successfully", mess });
//   } catch (error) {
//     res.status(500).json({ message: "Server error" });
//   }
// };

// export const joinMess = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { code } = req.body;

//     const user = await User.findById(userId);
//     if (user.messId) {
//       return res.status(400).json({ message: "You already joined a mess" });
//     }

//     const mess = await Mess.findOne({ code });
//     if (!mess) {
//       return res.status(404).json({ message: "Invalid mess code" });
//     }

//     mess.members.push(userId);
//     await mess.save();

//     user.messId = mess._id;
//     await user.save();

//     res.json({ message: "Successfully joined mess", mess });
//   } catch (error) {
//     res.status(500).json({ message: "Server error" });
//   }
// };

// export const getMessInfo = async (req, res) => {
//   try {
//     const user = await User.findById(req.user._id).populate("messId");
//     if (!user.messId) {
//       return res.status(404).json({ message: "Not joined any mess" });
//     }
//     res.json({ mess: user.messId });
//   } catch (error) {
//     res.status(500).json({ message: "Server error" });
//   }
// };

// export const leaveMess = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const user = await User.findById(userId);

//     if (!user.messId) {
//       return res.status(400).json({ message: "Not in any mess" });
//     }

//     await User.findByIdAndUpdate(userId, { messId: null, role: "member" });
//     await Mess.findByIdAndUpdate(user.messId, {
//       $pull: { members: userId },
//     });

//     res.json({ message: "Left mess successfully" });
//   } catch (error) {
//     res.status(500).json({ message: "Server error" });
//   }
// };

// export const messMembersData = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const user = await User.findById(userId);

//     if (!user.messId) {
//       return res.status(400).json({ message: "Not in a mess" });
//     }

//     // Return proper mealCounts structure
//     const membersData = await User.find({ messId: user.messId })
//       .select("name email image role totalDeposit mealCounts mealSwitches")
//       .lean();

//     // Transform data to match TMember interface
//     const formattedMembers = membersData.map((member) => ({
//       _id: member._id,
//       name: member.name,
//       email: member.email,
//       image: member.image,
//       totalDeposit: member.totalDeposit || 0,
//       role: member.role,
//       mealCounts: member.mealCounts || { breakfast: 0, lunch: 0, dinner: 0 },
//       mealSwitches: member.mealSwitches,
//     }));

//     res.json({ membersData: formattedMembers });
//   } catch (error) {
//     console.error("Get mess members error:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// // NEW: Promote member to admin
// export const promoteToAdmin = async (req, res) => {
//   try {
//     const { messId } = req.params;
//     const { userId } = req.body;
//     const adminId = req.user._id;

//     // Verify the requester is admin of this mess
//     const admin = await User.findById(adminId);
//     if (
//       !admin ||
//       admin.messId?.toString() !== messId ||
//       admin.role !== "admin"
//     ) {
//       return res.status(403).json({ message: "Admin access required" });
//     }

//     // Verify the target user is in the same mess
//     const targetUser = await User.findById(userId);
//     if (!targetUser || targetUser.messId?.toString() !== messId) {
//       return res.status(400).json({ message: "User not found in this mess" });
//     }

//     // Promote user to admin
//     targetUser.role = "admin";
//     await targetUser.save();

//     res.json({ message: "User promoted to admin successfully" });
//   } catch (error) {
//     console.error("Promote to admin error:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// // NEW: Demote admin to member
// export const demoteToMember = async (req, res) => {
//   try {
//     const { messId } = req.params;
//     const { userId } = req.body;
//     const adminId = req.user._id;

//     // Verify the requester is admin of this mess
//     const admin = await User.findById(adminId);
//     if (
//       !admin ||
//       admin.messId?.toString() !== messId ||
//       admin.role !== "admin"
//     ) {
//       return res.status(403).json({ message: "Admin access required" });
//     }

//     // Prevent self-demotion
//     if (userId === adminId) {
//       return res.status(400).json({ message: "Cannot demote yourself" });
//     }

//     // Verify the target user is in the same mess and is an admin
//     const targetUser = await User.findById(userId);
//     if (
//       !targetUser ||
//       targetUser.messId?.toString() !== messId ||
//       targetUser.role !== "admin"
//     ) {
//       return res
//         .status(400)
//         .json({ message: "Admin user not found in this mess" });
//     }

//     // Demote user to member
//     targetUser.role = "member";
//     await targetUser.save();

//     res.json({ message: "User demoted to member successfully" });
//   } catch (error) {
//     console.error("Demote to member error:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// // NEW: Remove member from mess (preserve historical data)
// export const removeMemberFromMess = async (req, res) => {
//   try {
//     const { messId } = req.params;
//     const { userId } = req.body;
//     const adminId = req.user._id;

//     // Verify the requester is admin of this mess
//     const admin = await User.findById(adminId);
//     if (
//       !admin ||
//       admin.messId?.toString() !== messId ||
//       admin.role !== "admin"
//     ) {
//       return res.status(403).json({ message: "Admin access required" });
//     }

//     // Prevent self-removal
//     if (userId === adminId) {
//       return res
//         .status(400)
//         .json({ message: "Cannot remove yourself from mess" });
//     }

//     // Verify the target user is in the same mess
//     const targetUser = await User.findById(userId);
//     if (!targetUser || targetUser.messId?.toString() !== messId) {
//       return res.status(400).json({ message: "User not found in this mess" });
//     }

//     // Remove user from mess by clearing messId - PRESERVES ALL HISTORICAL DATA
//     targetUser.messId = undefined;
//     targetUser.role = "member"; // Reset role to member
//     await targetUser.save();

//     // Remove from Mess members array
//     await Mess.findByIdAndUpdate(messId, {
//       $pull: { members: userId },
//     });

//     res.json({
//       message:
//         "Member removed from mess successfully. Historical data preserved.",
//     });
//   } catch (error) {
//     console.error("Remove member error:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// };
import crypto from "crypto";
import Mess from "../models/mess.model.js";
import User from "../models/user.model.js";
import {
  createNotificationForMess,
  createNotificationForUser,
} from "../utils/notification.js";

export const createMess = async (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.user._id;

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
    });

    res.status(201).json({ message: "Mess created successfully", mess });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const joinMess = async (req, res) => {
  try {
    const userId = req.user._id;
    const { code } = req.body;

    const user = await User.findById(userId);
    if (user.messId) {
      return res.status(400).json({ message: "You already joined a mess" });
    }

    const mess = await Mess.findOne({ code });
    if (!mess) {
      return res.status(404).json({ message: "Invalid mess code" });
    }

    mess.members.push(userId);
    await mess.save();

    user.messId = mess._id;
    await user.save();

    // Create notification for all existing members about new member
    await createNotificationForMess(mess._id, {
      type: "member_added",
      title: "New Member Joined",
      message: `${user.name} joined the mess`,
      data: {
        performedBy: userId,
      },
    });

    res.json({ message: "Successfully joined mess", mess });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const getMessInfo = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate("messId");
    if (!user.messId) {
      return res.status(404).json({ message: "Not joined any mess" });
    }
    res.json({ mess: user.messId });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const leaveMess = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user.messId) {
      return res.status(400).json({ message: "Not in any mess" });
    }

    await User.findByIdAndUpdate(userId, { messId: null, role: "member" });
    await Mess.findByIdAndUpdate(user.messId, {
      $pull: { members: userId },
    });

    res.json({ message: "Left mess successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const messMembersData = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user.messId) {
      return res.status(400).json({ message: "Not in a mess" });
    }

    // Return proper structure
    const membersData = await User.find({ messId: user.messId })
      .select("name email image role totalDeposit phone")
      .lean();

    // Transform data to match TMember interface
    const formattedMembers = membersData.map((member) => ({
      _id: member._id,
      name: member.name,
      email: member.email,
      image: member.image,
      phone: member.phone,
      totalDeposit: member.totalDeposit || 0,
      role: member.role,
    }));

    res.json({ membersData: formattedMembers });
  } catch (error) {
    console.error("Get mess members error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// NEW: Promote member to admin
export const promoteToAdmin = async (req, res) => {
  try {
    const { messId } = req.params;
    const { userId } = req.body;
    const adminId = req.user._id;

    // Verify the requester is admin of this mess
    const admin = await User.findById(adminId);
    if (
      !admin ||
      admin.messId?.toString() !== messId ||
      admin.role !== "admin"
    ) {
      return res.status(403).json({ message: "Admin access required" });
    }

    // Verify the target user is in the same mess
    const targetUser = await User.findById(userId);
    if (!targetUser || targetUser.messId?.toString() !== messId) {
      return res.status(400).json({ message: "User not found in this mess" });
    }

    // Promote user to admin
    targetUser.role = "admin";
    await targetUser.save();

    // Create notification for the promoted user
    await createNotificationForUser(userId, messId, {
      type: "system",
      title: "Promoted to Admin",
      message: `Congratulations! You have been promoted to Admin by ${admin.name}`,
      data: {
        performedBy: adminId,
      },
    });

    // Notify all other members about the promotion
    await createNotificationForMess(messId, {
      type: "system",
      title: "New Admin",
      message: `${targetUser.name} has been promoted to Admin role`,
      data: {
        performedBy: adminId,
      },
    });

    res.json({ message: "User promoted to admin successfully" });
  } catch (error) {
    console.error("Promote to admin error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// NEW: Demote admin to member
export const demoteToMember = async (req, res) => {
  try {
    const { messId } = req.params;
    const { userId } = req.body;
    const adminId = req.user._id;

    // Verify the requester is admin of this mess
    const admin = await User.findById(adminId);
    if (
      !admin ||
      admin.messId?.toString() !== messId ||
      admin.role !== "admin"
    ) {
      return res.status(403).json({ message: "Admin access required" });
    }

    // Prevent self-demotion
    if (userId === adminId) {
      return res.status(400).json({ message: "Cannot demote yourself" });
    }

    // Verify the target user is in the same mess and is an admin
    const targetUser = await User.findById(userId);
    if (
      !targetUser ||
      targetUser.messId?.toString() !== messId ||
      targetUser.role !== "admin"
    ) {
      return res
        .status(400)
        .json({ message: "Admin user not found in this mess" });
    }

    // Demote user to member
    targetUser.role = "member";
    await targetUser.save();

    // Create notification for the demoted user
    await createNotificationForUser(userId, messId, {
      type: "system",
      title: "Role Changed",
      message: `Your admin privileges have been revoked by ${admin.name}`,
      data: {
        performedBy: adminId,
      },
    });

    // Notify all other members about the demotion
    await createNotificationForMess(messId, {
      type: "system",
      title: "Admin Role Changed",
      message: `${targetUser.name} has been changed to Member role`,
      data: {
        performedBy: adminId,
      },
    });

    res.json({ message: "User demoted to member successfully" });
  } catch (error) {
    console.error("Demote to member error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// NEW: Remove member from mess (preserve historical data)
export const removeMemberFromMess = async (req, res) => {
  try {
    const { messId } = req.params;
    const { userId } = req.body;
    const adminId = req.user._id;

    // Verify the requester is admin of this mess
    const admin = await User.findById(adminId);
    if (
      !admin ||
      admin.messId?.toString() !== messId ||
      admin.role !== "admin"
    ) {
      return res.status(403).json({ message: "Admin access required" });
    }

    // Prevent self-removal
    if (userId === adminId) {
      return res
        .status(400)
        .json({ message: "Cannot remove yourself from mess" });
    }

    // Verify the target user is in the same mess
    const targetUser = await User.findById(userId);
    if (!targetUser || targetUser.messId?.toString() !== messId) {
      return res.status(400).json({ message: "User not found in this mess" });
    }

    // Remove user from mess by clearing messId - PRESERVES ALL HISTORICAL DATA
    targetUser.messId = undefined;
    targetUser.role = "member"; // Reset role to member
    await targetUser.save();

    // Remove from Mess members array
    await Mess.findByIdAndUpdate(messId, {
      $pull: { members: userId },
    });

    // Create notification for all remaining members
    await createNotificationForMess(messId, {
      type: "member_removed",
      title: "Member Removed",
      message: `${admin.name} removed ${targetUser.name} from the mess`,
      data: {
        performedBy: adminId,
      },
    });

    // Create notification for the removed user
    await createNotificationForUser(userId, messId, {
      type: "member_removed",
      title: "Removed from Mess",
      message: `You have been removed from the mess by ${admin.name}`,
      data: {
        performedBy: adminId,
      },
    });

    res.json({
      message:
        "Member removed from mess successfully. Historical data preserved.",
    });
  } catch (error) {
    console.error("Remove member error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
