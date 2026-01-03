import User from "../models/user.model.js";
import Mess from "../models/mess.model.js";
import DailyMeal from "../models/dailyMeal.model.js";
import { createNotificationForMess } from "../utils/notification.js";

// Submit meals for all members for a specific date
export const submitMeals = async (req, res) => {
  try {
    const userId = req.user._id;
    const { date, meals } = req.body;

    // Validate input
    if (!date || !meals || !Array.isArray(meals)) {
      return res.status(400).json({
        message: "Date and meals array are required",
      });
    }

    const user = await User.findById(userId);
    if (!user.messId) {
      return res.status(400).json({ message: "Not in a mess" });
    }

    // Check if user is admin
    if (user.role !== "admin") {
      return res.status(403).json({
        message: "Only admin can add meal counts",
      });
    }

    // Parse the date to start of day
    const mealDate = new Date(date);
    mealDate.setHours(0, 0, 0, 0);

    // Validate all members belong to the same mess
    const memberIds = meals.map((m) => m.userId);
    const members = await User.find({
      _id: { $in: memberIds },
      messId: user.messId,
    });

    if (members.length !== memberIds.length) {
      return res.status(400).json({
        message: "Some members do not belong to your mess",
      });
    }

    // Process each member's meal data
    const results = [];
    for (const mealData of meals) {
      const { userId: memberId, lunch, dinner } = mealData;

      // Validate meal counts
      const lunchCount = parseFloat(lunch) || 0;
      const dinnerCount = parseFloat(dinner) || 0;

      if (lunchCount < 0 || dinnerCount < 0) {
        return res.status(400).json({
          message: "Meal counts cannot be negative",
        });
      }

      // Find or create daily meal record
      let dailyMeal = await DailyMeal.findOne({
        userId: memberId,
        messId: user.messId,
        date: mealDate,
      });

      if (dailyMeal) {
        // Update existing record
        dailyMeal.meals.lunch.count = lunchCount;
        dailyMeal.meals.dinner.count = dinnerCount;
        dailyMeal.totalMeals = lunchCount + dinnerCount;
      } else {
        // Create new record
        dailyMeal = new DailyMeal({
          userId: memberId,
          messId: user.messId,
          date: mealDate,
          meals: {
            lunch: { count: lunchCount },
            dinner: { count: dinnerCount },
          },
          totalMeals: lunchCount + dinnerCount,
        });
      }

      await dailyMeal.save();
      results.push({
        userId: memberId,
        success: true,
      });
    }

    // Create notification for all members (only if there are actual meals)
    const hasAnyMeals = meals.some((m) => {
      const lunchCount = parseFloat(m.lunch) || 0;
      const dinnerCount = parseFloat(m.dinner) || 0;
      return lunchCount > 0 || dinnerCount > 0;
    });

    if (hasAnyMeals) {
      const dateStr = mealDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      await createNotificationForMess(user.messId, {
        type: "meal_entry",
        title: "Meal Counts Added",
        message: `${user.name} added meal counts for ${dateStr}`,
        data: {
          performedBy: userId,
          entryType: "meal_count",
        },
      });
    }

    res.json({
      message: "Meals submitted successfully",
      date: mealDate,
      results,
    });
  } catch (error) {
    console.error("Submit meals error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get meals for all members for a specific date
export const getMealsForDate = async (req, res) => {
  try {
    const userId = req.user._id;
    const { date } = req.query;

    console.log("📅 getMealsForDate called:", { userId, date });

    if (!date) {
      return res.status(400).json({ message: "Date is required" });
    }

    const user = await User.findById(userId);
    if (!user.messId) {
      console.log("❌ User not in a mess");
      return res.status(400).json({ message: "Not in a mess" });
    }

    console.log("✅ User found:", { messId: user.messId });

    // Parse the date to start of day
    const mealDate = new Date(date);
    mealDate.setHours(0, 0, 0, 0);

    // Get all members of the mess
    const members = await User.find({ messId: user.messId })
      .select("name image role")
      .lean();

    console.log("👥 Members found:", members.length);

    // Get all meal records for this date
    const mealRecords = await DailyMeal.find({
      messId: user.messId,
      date: mealDate,
    }).lean();

    // Create a map of meal records by userId
    const mealMap = {};
    mealRecords.forEach((record) => {
      mealMap[record.userId.toString()] = record;
    });

    // Combine members with their meal data
    const mealsData = members.map((member) => {
      const mealRecord = mealMap[member._id.toString()];
      return {
        userId: member._id,
        name: member.name,
        image: member.image,
        role: member.role,
        lunch: mealRecord?.meals?.lunch?.count || 0,
        dinner: mealRecord?.meals?.dinner?.count || 0,
        total: mealRecord?.totalMeals || 0,
      };
    });

    console.log("📊 Returning meals data:", mealsData.length, "members");

    res.json({
      date: mealDate,
      members: mealsData,
    });
  } catch (error) {
    console.error("Get meals for date error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get Meal Summary for Home Page (All Members)
export const getMealSummary = async (req, res) => {
  try {
    const userId = req.user._id;
    const { month, year } = req.query;

    const user = await User.findById(userId);
    if (!user.messId) {
      return res.status(400).json({ message: "Not in a mess" });
    }

    const selectedMonth = parseInt(month) || new Date().getMonth() + 1;
    const selectedYear = parseInt(year) || new Date().getFullYear();

    const startDate = new Date(selectedYear, selectedMonth - 1, 1);
    const endDate = new Date(selectedYear, selectedMonth, 0);
    endDate.setHours(23, 59, 59, 999);

    // Get all members
    const members = await User.find({ messId: user.messId }).select(
      "name image role totalDeposit"
    );

    // Get all meal records for the month
    const mealRecords = await DailyMeal.find({
      messId: user.messId,
      date: { $gte: startDate, $lte: endDate },
    });

    // Calculate meal counts for each member
    const summary = members.map((member) => {
      const memberRecords = mealRecords.filter(
        (record) => record.userId.toString() === member._id.toString()
      );

      const lunchCount = memberRecords.reduce(
        (sum, record) => sum + (record.meals?.lunch?.count || 0),
        0
      );
      const dinnerCount = memberRecords.reduce(
        (sum, record) => sum + (record.meals?.dinner?.count || 0),
        0
      );
      const totalMeals = lunchCount + dinnerCount;

      return {
        user: {
          _id: member._id,
          name: member.name,
          image: member.image,
          role: member.role,
        },
        meals: {
          lunch: lunchCount,
          dinner: dinnerCount,
          total: totalMeals,
        },
        deposit: member.totalDeposit || 0,
      };
    });

    res.json({
      summary,
      month: selectedMonth,
      year: selectedYear,
      totalDays: endDate.getDate(),
    });
  } catch (error) {
    console.error("Get meal summary error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get User's Meal Statistics (Individual User Table)
export const getUserMealStatistics = async (req, res) => {
  try {
    const userId = req.user._id;
    const { month, year } = req.query;

    const user = await User.findById(userId);
    if (!user.messId) {
      return res.status(400).json({ message: "Not in a mess" });
    }

    const selectedMonth = parseInt(month) || new Date().getMonth() + 1;
    const selectedYear = parseInt(year) || new Date().getFullYear();

    const startDate = new Date(selectedYear, selectedMonth - 1, 1);
    const endDate = new Date(selectedYear, selectedMonth, 0);
    endDate.setHours(23, 59, 59, 999);

    // Get all daily meal records for THIS USER only
    const mealRecords = await DailyMeal.find({
      userId,
      messId: user.messId,
      date: { $gte: startDate, $lte: endDate },
    }).sort({ date: 1 });

    // Format data for table
    const statistics = mealRecords.map((record) => ({
      date: record.date.toISOString().split("T")[0],
      lunch: record.meals?.lunch?.count || 0,
      dinner: record.meals?.dinner?.count || 0,
      total: record.totalMeals,
    }));

    // Calculate monthly totals
    const monthlyTotals = {
      lunch: statistics.reduce((sum, day) => sum + day.lunch, 0),
      dinner: statistics.reduce((sum, day) => sum + day.dinner, 0),
      total: statistics.reduce((sum, day) => sum + day.total, 0),
    };

    res.json({
      statistics,
      monthlyTotals,
      month: selectedMonth,
      year: selectedYear,
      totalDays: endDate.getDate(),
    });
  } catch (error) {
    console.error("Get user meal statistics error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
