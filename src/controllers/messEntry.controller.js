import { startSession, Types } from "mongoose";
import MessEntry from "../models/messEntry.model.js";
import User from "../models/user.model.js";
import Mess from "../models/mess.model.js";



export const addMessEntry = async (req, res) => {
  const { type, entries } = req.body;

  if (!["meal", "deposit"].includes(type)) {
    return res.status(400).json({ message: "Invalid entry type." });
  }

  if (!Array.isArray(entries) || entries.length === 0) {
    return res
      .status(400)
      .json({ message: "Entries must be a non-empty array." });
  }

  const session = await startSession();
  session.startTransaction();

  try {
    const bulkUserOps = [];
    const entryDocs = [];

    for (const entry of entries) {
      const { userId, messId, amount } = entry;

      if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(messId)) {
        throw new Error("Invalid userId or messId.");
      }

      entryDocs.push({
        userId,
        messId,
        amount,
        type,
      });

      bulkUserOps.push({
        updateOne: {
          filter: { _id: userId },
          update: {
            $inc:
              type === "meal"
                ? { mealCount: amount || 0 }
                : { totalDeposit: amount || 0 },
          },
        },
      });
    }

    // Inserting all entries at once
    await MessEntry.insertMany(entryDocs, { session });

    //  user updates in bulk
    if (bulkUserOps.length > 0) {
      await User.bulkWrite(bulkUserOps, { session });
    }

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({ message: "Entries added successfully." });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error in addMessEntry:", error.message);
    return res.status(500).json({ message: "Internal server error." });
  }
};



export const getMessEntries = async (req, res) => {
  try {
    const { messId } = req.params;
    let { month } = req.query;

    if (!mongoose.Types.ObjectId.isValid(messId)) {
      return res.status(400).json({ message: "Invalid mess ID." });
    }

    const mess = await Mess.findById(messId).lean();
    if (!mess) {
      return res.status(404).json({ message: "Mess not found." });
    }

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
      messId: new mongoose.Types.ObjectId(messId),
      createdAt: { $gte: start, $lt: end },
    };

    const [entries, users] = await Promise.all([
      MessEntry.find(filter).populate("userId", "name image email").lean(),
      User.find({ messId }).select("name image email _id").lean(),
    ]);

    let totalMeals = 0;
    let totalDeposits = 0;

    const userEntryMap = {};

    for (const entry of entries) {
      const uid = entry.userId._id.toString();

      if (!userEntryMap[uid]) {
        userEntryMap[uid] = { meals: 0, deposits: 0 };
      }

      if (entry.type === "meal") {
        totalMeals += entry.amount;
        userEntryMap[uid].meals += entry.amount;
      } else if (entry.type === "deposit") {
        totalDeposits += entry.amount;
        userEntryMap[uid].deposits += entry.amount;
      }
    }

    const mealRate =
      totalMeals > 0 ? parseFloat((totalDeposits / totalMeals).toFixed(2)) : 0;

    const summary = users.map((user) => {
      const { meals = 0, deposits = 0 } =
        userEntryMap[user._id.toString()] || {};
      const balance = parseFloat((deposits - meals * mealRate).toFixed(2));

      return {
        userId: user._id,
        name: user.name,
        email: user.email,
        image: user.image,
        totalMeal: meals,
        totalDeposit: deposits,
        balance,
      };
    });

    return res.status(200).json({
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
    return res.status(500).json({ message: "Internal server error" });
  }
};