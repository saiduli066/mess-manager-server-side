//controller/messEntry.controller
import MessEntry from "../models/messEntry.model.js";
import User from "../models/user.model.js";
import Mess from "../models/mess.model.js";
import DailyMeal from "../models/dailyMeal.model.js";
import mongoose from "mongoose";
import cron from "node-cron";
import Notification from "../models/notification.model.js";

// Get Mess Entries Report - UPDATED for consistency
export const getMessEntries = async (req, res) => {
  try {
    const { messId } = req.params;
    const { month, year } = req.query;

    // Validate mess exists
    const mess = await Mess.findById(messId);
    if (!mess) {
      return res.status(404).json({ message: "Mess not found" });
    }

    // Calculate date range for the selected month/year
    const selectedMonth = parseInt(month) || new Date().getMonth() + 1;
    const selectedYear = parseInt(year) || new Date().getFullYear();

    const startDate = new Date(selectedYear, selectedMonth - 1, 1);
    const endDate = new Date(selectedYear, selectedMonth, 0);
    endDate.setHours(23, 59, 59, 999);

    // Get all members of the mess
    const members = await User.find({ messId })
      .select("name email image role totalDeposit")
      .lean();

    // Get all meal records for the month - only counted meals
    const mealRecords = await DailyMeal.find({
      messId,
      date: { $gte: startDate, $lte: endDate },
    });

    // Get all deposit entries for the month
    const depositEntries = await MessEntry.find({
      messId,
      type: "deposit",
      date: { $gte: startDate, $lte: endDate },
    });

    // Calculate totals and create summary
    let totalMeals = 0;
    let totalDeposits = 0;

    const summary = members.map((member) => {
      // Calculate meals for this member (using new count-based structure)
      const memberMealRecords = mealRecords.filter(
        (record) => record.userId.toString() === member._id.toString()
      );

      const lunchCount = memberMealRecords.reduce(
        (sum, record) => sum + (record.meals?.lunch?.count || 0),
        0
      );
      const dinnerCount = memberMealRecords.reduce(
        (sum, record) => sum + (record.meals?.dinner?.count || 0),
        0
      );

      const memberTotalMeals = lunchCount + dinnerCount;
      totalMeals += memberTotalMeals;

      // Calculate deposits for this member (monthly only for report consistency)
      const memberDeposits = depositEntries
        .filter((entry) => entry.userId.toString() === member._id.toString())
        .reduce((sum, entry) => sum + entry.amount, 0);

      totalDeposits += memberDeposits;

      return {
        userId: member._id.toString(),
        name: member.name,
        email: member.email,
        image: member.image,
        totalDeposit: memberDeposits, // Fixed: Use monthly only for report
        totalMeal: memberTotalMeals,
        balance: 0, // Will calculate after meal rate
        lifetimeDeposit: member.totalDeposit || 0, // Add for reference, but not used in balance
      };
    });

    // Calculate meal rate and balances
    const totalMealCost = totalMeals > 0 ? totalDeposits / totalMeals : 0;
    const mealRate = parseFloat(totalMealCost.toFixed(2));

    // Calculate balances for each member (using monthly deposits)
    summary.forEach((member) => {
      member.balance = parseFloat(
        (member.totalDeposit - member.totalMeal * mealRate).toFixed(2)
      );
    });

    // Check if this month has been settled (simple flag based on current date)
    const now = new Date();
    const isSettled = now > endDate;

    res.json({
      messName: mess.name,
      messCode: mess.code,
      reportMonth: `${selectedMonth}/${selectedYear}`,
      totalMeals,
      totalDeposits,
      mealRate,
      summary,
      settled: isSettled, // New: Indicate if costs have been deducted
    });
  } catch (error) {
    console.error("Get mess entries error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Add Mess Entry (Deposits only) - With transaction for integrity
export const addMessEntry = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user._id;
    const { entries } = req.body;

    console.log("💰 addMessEntry called:", { userId, entries });

    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Entries array is required" });
    }

    const user = await User.findById(userId).session(session);
    if (!user.messId) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Not in a mess" });
    }

    console.log("✅ User found, messId:", user.messId);

    // Validate all users belong to the same mess (batch query for performance)
    const userIds = entries.map((e) => e.userId);
    const entryUsers = await User.find({
      _id: { $in: userIds },
      messId: user.messId,
    }).session(session);

    if (entryUsers.length !== entries.length) {
      console.log("❌ Some users don't belong to the mess or don't exist");
      await session.abortTransaction();
      return res.status(400).json({ message: "Invalid user in entries" });
    }

    console.log("✅ All users validated");

    // Validate deposit amounts
    for (const entry of entries) {
      if (entry.amount < 0) {
        await session.abortTransaction();
        return res
          .status(400)
          .json({ message: "Deposit amount cannot be negative" });
      }
      if (!isFinite(entry.amount) || isNaN(entry.amount)) {
        await session.abortTransaction();
        return res.status(400).json({ message: "Invalid deposit amount" });
      }
    }

    // Create deposit entries
    const depositEntries = entries.map((entry) => ({
      userId: entry.userId,
      messId: user.messId,
      amount: entry.amount,
      type: "deposit",
      createdBy: userId,
      date: new Date(),
    }));

    console.log("📝 Creating deposit entries:", depositEntries.length);

    await MessEntry.insertMany(depositEntries, { session });

    console.log("✅ Deposit entries created");

    // Update users' total deposits (batch update for performance)
    const bulkOps = entries.map((entry) => ({
      updateOne: {
        filter: { _id: entry.userId },
        update: { $inc: { totalDeposit: entry.amount } },
      },
    }));

    await User.bulkWrite(bulkOps, { session });
    console.log("✅ Updated totalDeposit for all users");

    // Create notifications (batch insert for performance) - skip 0 amounts
    const notifications = entries
      .filter((entry) => entry.amount > 0)
      .map((entry) => ({
        userId: entry.userId,
        messId: user.messId,
        type: "deposit",
        title: "Deposit Added",
        message: `A deposit of ${entry.amount} has been added to your account.`,
      }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications, { session });
      console.log(`✅ Created ${notifications.length} notifications`);
    } else {
      console.log("ℹ️ No notifications created (all amounts were 0)");
    }

    await session.commitTransaction();
    console.log("✅ Transaction committed successfully");

    res.json({ message: "Deposits added successfully" });
  } catch (error) {
    await session.abortTransaction();
    console.error("❌ Add mess entry error:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

// NEW: Monthly Settlement - Deduct costs from totalDeposit
const settleMonthly = async () => {
  try {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    lastMonthEnd.setHours(23, 59, 59, 999);

    console.log(
      `📊 Starting monthly settlement for ${lastMonth.toLocaleString(
        "default",
        { month: "long" }
      )} ${lastMonth.getFullYear()}`
    );

    // Get all messes
    const messes = await Mess.find();

    for (const mess of messes) {
      const messId = mess._id;

      // Replicate getMessEntries logic to calculate balances
      const members = await User.find({ messId }).select("_id totalDeposit");
      const mealRecords = await DailyMeal.find({
        messId,
        date: { $gte: lastMonth, $lte: lastMonthEnd },
      });
      const depositEntries = await MessEntry.find({
        messId,
        type: "deposit",
        date: { $gte: lastMonth, $lte: lastMonthEnd },
      });

      let totalMeals = 0;
      let totalDeposits = 0;

      const summaries = members.map((member) => {
        const memberMealRecords = mealRecords.filter(
          (r) => r.userId.toString() === member._id.toString()
        );
        const memberTotalMeals = memberMealRecords.reduce(
          (sum, r) =>
            sum + (r.meals?.lunch?.count || 0) + (r.meals?.dinner?.count || 0),
          0
        );
        totalMeals += memberTotalMeals;

        const memberDeposits = depositEntries
          .filter((e) => e.userId.toString() === member._id.toString())
          .reduce((sum, e) => sum + e.amount, 0);
        totalDeposits += memberDeposits;

        return {
          userId: member._id,
          totalMeal: memberTotalMeals,
          monthlyDeposit: memberDeposits,
        };
      });

      const mealRate = totalMeals > 0 ? totalDeposits / totalMeals : 0;

      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        for (const summary of summaries) {
          const cost = summary.totalMeal * mealRate;
          await User.findByIdAndUpdate(
            summary.userId,
            { $inc: { totalDeposit: -cost } },
            { session }
          );
          // Log settlement (could add a Settlement model for audit)
          console.log(
            `💸 Settled for user ${summary.userId}: Deducted ${cost.toFixed(2)}`
          );

          // NEW: Create notification for user on settlement
          const notification = new Notification({
            userId: summary.userId,
            messId,
            type: "system",
            title: "Monthly Settlement",
            message: `Your account has been deducted ${cost.toFixed(
              2
            )} for last month's meals.`,
          });
          await notification.save({ session });
        }
        await session.commitTransaction();
      } catch (err) {
        await session.abortTransaction();
        console.error(`❌ Settlement error for mess ${messId}:`, err);
      } finally {
        session.endSession();
      }
    }

    console.log("✅ Monthly settlement completed");
  } catch (error) {
    console.error("❌ Monthly settlement system error:", error);
  }
};

// NEW: Setup Monthly Settlement Cron
export const setupMonthlySettlement = () => {
  // Run on the 1st of every month at 00:00
  cron.schedule("0 0 1 * *", async () => {
    await settleMonthly();
  });
  console.log("✅ Monthly settlement scheduled for the 1st of each month");
};
