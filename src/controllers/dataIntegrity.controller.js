// controllers/dataIntegrity.controller.js
import User from "../models/user.model.js";
import MessEntry from "../models/messEntry.model.js";
import DailyMeal from "../models/dailyMeal.model.js";
import Bill from "../models/bill.model.js";
import mongoose from "mongoose";

/**
 * Verify data integrity across the database
 * Checks for inconsistencies in:
 * - Meal counts (totalMeals field vs calculated lunch + dinner)
 * - Deposit totals (User.totalDeposit vs sum of MessEntry deposits)
 * - Bill calculations (perHeadAmount vs totalAmount / members)
 */
export const verifyDataIntegrity = async (req, res) => {
  try {
    const issues = [];
    const userId = req.user._id;
    const user = await User.findById(userId);

    // Only admins can run integrity checks
    if (user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const messId = user.messId;
    if (!messId) {
      return res.status(400).json({ message: "Not in a mess" });
    }

    console.log("🔍 Starting data integrity check for mess:", messId);

    // 1. Check DailyMeal totalMeals consistency
    const mealRecords = await DailyMeal.find({ messId });
    let mealIssuesCount = 0;

    for (const record of mealRecords) {
      const lunchCount = record.meals?.lunch?.count || 0;
      const dinnerCount = record.meals?.dinner?.count || 0;
      const calculatedTotal = lunchCount + dinnerCount;

      if (Math.abs(record.totalMeals - calculatedTotal) > 0.01) {
        mealIssuesCount++;
        issues.push({
          type: "meal_count_mismatch",
          recordId: record._id,
          userId: record.userId,
          date: record.date,
          stored: record.totalMeals,
          calculated: calculatedTotal,
          difference: record.totalMeals - calculatedTotal,
        });
      }
    }

    // 2. Check User totalDeposit consistency
    const members = await User.find({ messId });
    let depositIssuesCount = 0;

    for (const member of members) {
      const depositEntries = await MessEntry.find({
        userId: member._id,
        messId,
        type: "deposit",
      });

      const calculatedTotal = depositEntries.reduce(
        (sum, entry) => sum + entry.amount,
        0
      );

      const storedTotal = member.totalDeposit || 0;

      if (Math.abs(storedTotal - calculatedTotal) > 0.01) {
        depositIssuesCount++;
        issues.push({
          type: "deposit_mismatch",
          userId: member._id,
          userName: member.name,
          stored: storedTotal,
          calculated: calculatedTotal,
          difference: storedTotal - calculatedTotal,
        });
      }
    }

    // 3. Check Bill perHeadAmount consistency
    const bills = await Bill.find({ messId });
    let billIssuesCount = 0;

    for (const bill of bills) {
      if (bill.members.length === 0) {
        billIssuesCount++;
        issues.push({
          type: "bill_no_members",
          billId: bill._id,
          billName: bill.name,
        });
        continue;
      }

      const calculatedPerHead = bill.totalAmount / bill.members.length;
      const storedPerHead = bill.perHeadAmount;

      if (Math.abs(storedPerHead - calculatedPerHead) > 0.01) {
        billIssuesCount++;
        issues.push({
          type: "bill_calculation_mismatch",
          billId: bill._id,
          billName: bill.name,
          totalAmount: bill.totalAmount,
          memberCount: bill.members.length,
          stored: storedPerHead,
          calculated: calculatedPerHead,
          difference: storedPerHead - calculatedPerHead,
        });
      }
    }

    const summary = {
      totalChecks: mealRecords.length + members.length + bills.length,
      totalIssues: issues.length,
      breakdown: {
        mealCountIssues: mealIssuesCount,
        depositIssues: depositIssuesCount,
        billIssues: billIssuesCount,
      },
    };

    console.log("✅ Data integrity check completed:", summary);

    res.json({
      status: issues.length === 0 ? "healthy" : "issues_found",
      summary,
      issues,
    });
  } catch (error) {
    console.error("❌ Error in data integrity check:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

/**
 * Fix data integrity issues
 * Automatically corrects inconsistencies found in the database
 */
export const fixDataIntegrity = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user._id;
    const user = await User.findById(userId).session(session);

    // Only admins can fix integrity issues
    if (user.role !== "admin") {
      await session.abortTransaction();
      return res.status(403).json({ message: "Admin access required" });
    }

    const messId = user.messId;
    if (!messId) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Not in a mess" });
    }

    console.log("🔧 Starting data integrity fix for mess:", messId);

    const fixed = [];

    // 1. Fix DailyMeal totalMeals
    const mealRecords = await DailyMeal.find({ messId }).session(session);
    for (const record of mealRecords) {
      const lunchCount = record.meals?.lunch?.count || 0;
      const dinnerCount = record.meals?.dinner?.count || 0;
      const calculatedTotal = lunchCount + dinnerCount;

      if (Math.abs(record.totalMeals - calculatedTotal) > 0.01) {
        record.totalMeals = calculatedTotal;
        await record.save({ session });
        fixed.push({
          type: "meal_count_fixed",
          recordId: record._id,
          oldValue: record.totalMeals,
          newValue: calculatedTotal,
        });
      }
    }

    // 2. Fix User totalDeposit
    const members = await User.find({ messId }).session(session);
    for (const member of members) {
      const depositEntries = await MessEntry.find({
        userId: member._id,
        messId,
        type: "deposit",
      }).session(session);

      const calculatedTotal = depositEntries.reduce(
        (sum, entry) => sum + entry.amount,
        0
      );

      const storedTotal = member.totalDeposit || 0;

      if (Math.abs(storedTotal - calculatedTotal) > 0.01) {
        member.totalDeposit = calculatedTotal;
        await member.save({ session });
        fixed.push({
          type: "deposit_fixed",
          userId: member._id,
          userName: member.name,
          oldValue: storedTotal,
          newValue: calculatedTotal,
        });
      }
    }

    // 3. Fix Bill perHeadAmount
    const bills = await Bill.find({ messId }).session(session);
    for (const bill of bills) {
      if (bill.members.length === 0) {
        fixed.push({
          type: "bill_skipped",
          billId: bill._id,
          reason: "No members in bill",
        });
        continue;
      }

      const calculatedPerHead = parseFloat(
        (bill.totalAmount / bill.members.length).toFixed(2)
      );
      const storedPerHead = bill.perHeadAmount;

      if (Math.abs(storedPerHead - calculatedPerHead) > 0.01) {
        bill.perHeadAmount = calculatedPerHead;
        await bill.save({ session });
        fixed.push({
          type: "bill_fixed",
          billId: bill._id,
          billName: bill.name,
          oldValue: storedPerHead,
          newValue: calculatedPerHead,
        });
      }
    }

    await session.commitTransaction();

    console.log(`✅ Fixed ${fixed.length} data integrity issues`);

    res.json({
      message: "Data integrity issues fixed successfully",
      fixedCount: fixed.length,
      details: fixed,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("❌ Error fixing data integrity:", error);
    res.status(500).json({ message: "Internal Server Error" });
  } finally {
    session.endSession();
  }
};
