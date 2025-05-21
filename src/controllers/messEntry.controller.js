import { startSession } from "mongoose";
import MessEntry from "../models/messEntry.model";
import User from "../models/user.model";
import Mess from "../models/mess.model";

export const addMessEntry = async (req, res) => {
  const { type, entries } = req.body;

  if (!["meal", "deposit"].includes(type)) {
    return res.status(400).json({ message: "Invalid entry." });
  }

  const session = await startSession();
  session.startTransaction();

    
    
  try {
    for (const entry of entries) {
      const { userId, messId, amount } = entry;

      // new mess entry
      const messEntry = new MessEntry({
        userId,
        messId,
        amount,
        type,
      });

      await messEntry.save({ session });

      //updating user's collection

      if (type === "meal") {
        await User.findByIdAndUpdate(userId, {
          $inc: { mealCount: amount || 0 },
        });
      } else if (type === "deposit") {
        await User.findByIdAndUpdate(userId, {
          $inc: { totalDeposit: amount || 0 },
        });
      }

      await session.commitTransaction();
      session.endSession();


      res.status(200).json({ message: "Entries added successfully." });
    }
  } catch (error) {
    session.abortTransaction();
    session.endSession();
    console.log("error in add mess entry controller :", error.message);
    res.status(500).json({ message: "Internal server error." });
  }
};



export const getMessEntries = async (req, res) => {
  try {
    const { messId } = req.params;
    let { month } = req.query; //( 2025-05)

    if (!mongoose.Types.ObjectId.isValid(messId)) {
      return res.status(400).json({ message: "Invalid mess ID" });
    }

    const mess = await Mess.findById(messId);
    if (!mess) {
      return res.status(404).json({ message: "Mess not found" });
    }

    // Default to current month if month not provided
    if (!month) {
      const now = new Date();
      month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
        2,
        "0"
      )}`;
    }

    const start = new Date(`${month}-01`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);

    const filter = {
      messId,
      createdAt: { $gte: start, $lt: end },
    };

    const users = await User.find({ messId }).select("name image email _id");

    const entries = await MessEntry.find(filter).populate(
      "userId",
      "name image email"
    );

    // Calculate totalMeals and totalDeposits of the mess
    const totalMeals = entries
      .filter((e) => e.type === "meal")
      .reduce((sum, e) => sum + e.amount, 0);

    const totalDeposits = entries
      .filter((e) => e.type === "deposit")
      .reduce((sum, e) => sum + e.amount, 0);

    const mealRate =
      totalMeals > 0 ? parseFloat((totalDeposits / totalMeals).toFixed(2)) : 0;

    const summary = users.map((user) => {
      const userEntries = entries.filter(
        (entry) => entry.userId._id.toString() === user._id.toString()
      );

      const totalMeal = userEntries
        .filter((e) => e.type === "meal")
        .reduce((sum, e) => sum + e.amount, 0);

      const totalDeposit = userEntries
        .filter((e) => e.type === "deposit")
        .reduce((sum, e) => sum + e.amount, 0);

      const balance = parseFloat(
        (totalDeposit - totalMeal * mealRate).toFixed(2)
      );

      return {
        userId: user._id,
        name: user.name,
        email: user.email,
        image: user.image,
        totalMeal,
        totalDeposit,
        balance,
      };
    });

    res.status(200).json({
      messName: mess.name,
      messCode: mess.code,
      reportMonth: month,
      totalMeals,
      totalDeposits,
      mealRate,
      summary,
    });
  } catch (error) {
    console.error("Error in getMessEntries:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
