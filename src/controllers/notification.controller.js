// controllers/notification.controller.js
import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";

// Get notifications with time filtering
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const { filter } = req.query; // thisWeek, month-year (e.g., "01-2026")

    const user = await User.findById(userId);
    if (!user.messId) {
      return res.status(400).json({ error: "You need to join a mess first" });
    }

    let query = {
      userId,
      messId: user.messId,
    };

    // Apply time-based filtering
    if (filter === "today") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      query.createdAt = { $gte: today };
    } else if (filter === "thisWeek") {
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
      weekStart.setHours(0, 0, 0, 0);

      query.createdAt = { $gte: weekStart };
    } else if (filter === "thisMonth") {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      monthStart.setHours(0, 0, 0, 0);

      query.createdAt = { $gte: monthStart };
    } else if (filter && filter.includes("-")) {
      // Format: "MM-YYYY" or "M-YYYY"
      const [month, year] = filter.split("-");
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0);
      endDate.setHours(23, 59, 59, 999);

      query.createdAt = { $gte: startDate, $lte: endDate };
    }

    const notifications = await Notification.find(query)
      .populate({
        path: "data.performedBy",
        select: "name image",
        options: { strictPopulate: false },
      })
      .sort({ createdAt: -1 })
      .limit(100);

    // Mark all as read
    await Notification.updateMany({ userId, isRead: false }, { isRead: true });

    res.json(notifications);
  } catch (error) {
    console.error("Error in getNotifications:", error);
    console.error("Error stack:", error.stack);
    res
      .status(500)
      .json({ error: "Internal server error", message: error.message });
  }
};

// Get unread count
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id;

    const count = await Notification.countDocuments({
      userId,
      isRead: false,
    });

    res.json({ count });
  } catch (error) {
    console.error("Error in getUnreadCount:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Mark notification as read
export const markAsRead = async (req, res) => {
  try {
    const userId = req.user._id;
    const { notificationId } = req.params;

    const notification = await Notification.findOne({
      _id: notificationId,
      userId,
    });

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    notification.isRead = true;
    await notification.save();

    res.json({ message: "Notification marked as read" });
  } catch (error) {
    console.error("Error in markAsRead:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Mark all as read
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user._id;

    await Notification.updateMany({ userId, isRead: false }, { isRead: true });

    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error("Error in markAllAsRead:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get available time periods (months/years with notifications)
export const getAvailablePeriods = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user.messId) {
      return res.status(400).json({ error: "You need to join a mess first" });
    }

    // Get all notifications grouped by month/year
    const periods = await Notification.aggregate([
      {
        $match: {
          userId: user._id,
          messId: user.messId,
        },
      },
      {
        $group: {
          _id: {
            month: { $month: "$createdAt" },
            year: { $year: "$createdAt" },
          },
          count: { $sum: 1 },
          latestDate: { $max: "$createdAt" },
        },
      },
      {
        $sort: { latestDate: -1 },
      },
      {
        $project: {
          _id: 0,
          month: "$_id.month",
          year: "$_id.year",
          count: 1,
          label: {
            $concat: [
              {
                $arrayElemAt: [
                  [
                    "",
                    "January",
                    "February",
                    "March",
                    "April",
                    "May",
                    "June",
                    "July",
                    "August",
                    "September",
                    "October",
                    "November",
                    "December",
                  ],
                  "$_id.month",
                ],
              },
              " ",
              { $toString: "$_id.year" },
            ],
          },
          value: {
            $concat: [
              {
                $cond: [
                  { $lt: ["$_id.month", 10] },
                  { $concat: ["0", { $toString: "$_id.month" }] },
                  { $toString: "$_id.month" },
                ],
              },
              "-",
              { $toString: "$_id.year" },
            ],
          },
        },
      },
    ]);

    res.json(periods);
  } catch (error) {
    console.error("Error in getAvailablePeriods:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
