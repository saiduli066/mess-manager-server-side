// utils/notification.js
import Notification from "../models/notification.model.js";
import Mess from "../models/mess.model.js";

// Helper to create notifications for all mess members
export const createNotificationForMess = async (messId, notificationData) => {
  try {
    const mess = await Mess.findById(messId).populate("members");
    if (!mess) return;

    const notifications = mess.members.map((member) => ({
      userId: member._id,
      messId,
      ...notificationData,
    }));

    await Notification.insertMany(notifications);
  } catch (error) {
    console.error("Error creating mess notifications:", error);
  }
};

// Helper to create notification for specific user
export const createNotificationForUser = async (
  userId,
  messId,
  notificationData
) => {
  try {
    await Notification.create({
      userId,
      messId,
      ...notificationData,
    });
  } catch (error) {
    console.error("Error creating user notification:", error);
  }
};

// Helper to create notifications for multiple users
export const createNotificationForUsers = async (
  userIds,
  messId,
  notificationData
) => {
  try {
    const notifications = userIds.map((userId) => ({
      userId,
      messId,
      ...notificationData,
    }));

    await Notification.insertMany(notifications);
  } catch (error) {
    console.error("Error creating user notifications:", error);
  }
};
