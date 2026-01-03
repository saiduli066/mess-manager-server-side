// controllers/bill.controller.js
import Bill from "../models/bill.model.js";
import Mess from "../models/mess.model.js";
import User from "../models/user.model.js";
import {
  createNotificationForMess,
  createNotificationForUser,
} from "../utils/notification.js";

// Create a new bill
export const createBill = async (req, res) => {
  try {
    const { name, totalAmount, date } = req.body;
    const userId = req.user._id;

    // Verify user has a mess and is admin
    const user = await User.findById(userId);
    if (!user.messId) {
      return res.status(400).json({ error: "You need to join a mess first" });
    }
    if (user.role !== "admin") {
      return res.status(403).json({ error: "Only admin can create bills" });
    }

    // Get mess and members
    const mess = await Mess.findById(user.messId).populate("members");
    if (!mess) {
      return res.status(404).json({ error: "Mess not found" });
    }

    const billDate = date ? new Date(date) : new Date();

    // Validate member count to prevent division by zero
    if (!mess.members || mess.members.length === 0) {
      return res.status(400).json({ error: "Mess has no members" });
    }

    const perHeadAmount = parseFloat(
      (totalAmount / mess.members.length).toFixed(2)
    );

    // Validate perHeadAmount calculation
    if (isNaN(perHeadAmount) || !isFinite(perHeadAmount)) {
      return res.status(400).json({ error: "Invalid bill calculation" });
    }

    // Create member payment records
    const members = mess.members.map((member) => ({
      userId: member._id,
      paid: false,
    }));

    const bill = await Bill.create({
      messId: mess._id,
      name,
      totalAmount,
      perHeadAmount,
      month: billDate.getMonth() + 1,
      year: billDate.getFullYear(),
      date: billDate,
      members,
      createdBy: userId,
    });

    const populatedBill = await Bill.findById(bill._id).populate(
      "members.userId",
      "name image"
    );

    // Create notification for all members
    await createNotificationForMess(mess._id, {
      type: "bill_created",
      title: "New Bill Added",
      message: `${user.name} added a new bill: ${name} (৳${totalAmount})`,
      data: {
        performedBy: userId,
        billId: bill._id,
        billName: name,
        amount: totalAmount,
      },
    });

    res.status(201).json(populatedBill);
  } catch (error) {
    console.error("Error in createBill:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get all bills for user's mess
export const getBills = async (req, res) => {
  try {
    const userId = req.user._id;
    const { month, year } = req.query;

    const user = await User.findById(userId);
    if (!user.messId) {
      return res.status(400).json({ error: "You need to join a mess first" });
    }

    let query = { messId: user.messId };

    // Filter by month/year if provided
    if (month) query.month = parseInt(month);
    if (year) query.year = parseInt(year);

    const bills = await Bill.find(query)
      .populate("members.userId", "name image")
      .sort({ date: -1 });

    res.json(bills);
  } catch (error) {
    console.error("Error in getBills:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get a specific bill
export const getBill = async (req, res) => {
  try {
    const { billId } = req.params;
    const userId = req.user._id;

    const user = await User.findById(userId);
    const bill = await Bill.findById(billId).populate(
      "members.userId",
      "name image"
    );

    if (!bill) {
      return res.status(404).json({ error: "Bill not found" });
    }

    // Verify user is in the same mess
    if (bill.messId.toString() !== user.messId.toString()) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(bill);
  } catch (error) {
    console.error("Error in getBill:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Toggle payment status for a member
export const togglePayment = async (req, res) => {
  try {
    const { billId, memberId } = req.params;
    const userId = req.user._id;

    // Verify user is admin
    const user = await User.findById(userId);
    if (user.role !== "admin") {
      return res
        .status(403)
        .json({ error: "Only admin can update payment status" });
    }

    const bill = await Bill.findById(billId);
    if (!bill) {
      return res.status(404).json({ error: "Bill not found" });
    }

    // Verify user is in the same mess
    if (bill.messId.toString() !== user.messId.toString()) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Toggle payment status
    const memberIndex = bill.members.findIndex(
      (m) => m.userId.toString() === memberId
    );

    if (memberIndex === -1) {
      return res.status(404).json({ error: "Member not found in bill" });
    }

    bill.members[memberIndex].paid = !bill.members[memberIndex].paid;
    bill.members[memberIndex].paidAt = bill.members[memberIndex].paid
      ? new Date()
      : null;

    await bill.save();

    const populatedBill = await Bill.findById(bill._id).populate(
      "members.userId",
      "name image"
    );

    // Create notification for the member whose payment status was toggled
    const toggledMember = await User.findById(memberId);
    if (toggledMember) {
      const status = bill.members[memberIndex].paid
        ? "marked as paid"
        : "marked as unpaid";
      await createNotificationForUser(memberId, bill.messId, {
        type: "bill_payment",
        title: "Bill Payment Update",
        message: `Your payment for "${bill.name}" has been ${status} by ${user.name}`,
        data: {
          performedBy: userId,
          billId: bill._id,
          billName: bill.name,
          amount: bill.perHeadAmount,
        },
      });
    }

    res.json(populatedBill);
  } catch (error) {
    console.error("Error in togglePayment:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Delete a bill
export const deleteBill = async (req, res) => {
  try {
    const { billId } = req.params;
    const userId = req.user._id;

    // Verify user is admin
    const user = await User.findById(userId);
    if (user.role !== "admin") {
      return res.status(403).json({ error: "Only admin can delete bills" });
    }

    const bill = await Bill.findById(billId);
    if (!bill) {
      return res.status(404).json({ error: "Bill not found" });
    }

    // Verify user is in the same mess
    if (bill.messId.toString() !== user.messId.toString()) {
      return res.status(403).json({ error: "Access denied" });
    }

    await Bill.findByIdAndDelete(billId);
    res.json({ message: "Bill deleted successfully" });
  } catch (error) {
    console.error("Error in deleteBill:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Update bill amount
export const updateBillAmount = async (req, res) => {
  try {
    const { billId } = req.params;
    const { totalAmount } = req.body;
    const userId = req.user._id;

    // Verify user is admin
    const user = await User.findById(userId);
    if (user.role !== "admin") {
      return res.status(403).json({ error: "Only admin can update bills" });
    }

    const bill = await Bill.findById(billId);
    if (!bill) {
      return res.status(404).json({ error: "Bill not found" });
    }

    // Verify user is in the same mess
    if (bill.messId.toString() !== user.messId.toString()) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Validate total amount
    if (!totalAmount || totalAmount <= 0) {
      return res.status(400).json({ error: "Invalid bill amount" });
    }

    // Validate member count to prevent division by zero
    if (!bill.members || bill.members.length === 0) {
      return res.status(400).json({ error: "Bill has no members" });
    }

    // Update amount and recalculate per head
    bill.totalAmount = totalAmount;
    bill.perHeadAmount = parseFloat(
      (totalAmount / bill.members.length).toFixed(2)
    );
    await bill.save();

    const populatedBill = await Bill.findById(bill._id).populate(
      "members.userId",
      "name image"
    );

    // Create notification for all members
    const mess = await Mess.findById(bill.messId);
    await createNotificationForMess(bill.messId, {
      type: "bill_updated",
      title: "Bill Amount Updated",
      message: `${user.name} updated the bill "${
        bill.name
      }" to ৳${totalAmount} (৳${bill.perHeadAmount.toFixed(2)} per person)`,
      data: {
        performedBy: userId,
        billId: bill._id,
        billName: bill.name,
        amount: totalAmount,
      },
    });

    res.json(populatedBill);
  } catch (error) {
    console.error("Error in updateBillAmount:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get bill summary for a month/year
export const getBillSummary = async (req, res) => {
  try {
    const userId = req.user._id;
    const { month, year } = req.query;

    const user = await User.findById(userId);
    if (!user.messId) {
      return res.status(400).json({ error: "You need to join a mess first" });
    }

    const query = {
      messId: user.messId,
      month: parseInt(month),
      year: parseInt(year),
    };

    const bills = await Bill.find(query)
      .populate("members.userId", "name image")
      .sort({ date: 1 });

    const mess = await Mess.findById(user.messId).populate(
      "members",
      "name image"
    );

    // Calculate totals
    const totalAmount = bills.reduce((sum, bill) => sum + bill.totalAmount, 0);
    const totalPerHead = bills.reduce(
      (sum, bill) => sum + bill.perHeadAmount,
      0
    );

    // Calculate per member totals and payment status
    const memberSummary = mess.members.map((member) => {
      let totalOwed = 0;
      let totalPaid = 0;
      const billDetails = [];

      bills.forEach((bill) => {
        const memberPayment = bill.members.find(
          (m) => m.userId._id.toString() === member._id.toString()
        );
        if (memberPayment) {
          totalOwed += bill.perHeadAmount;
          if (memberPayment.paid) {
            totalPaid += bill.perHeadAmount;
          }
          billDetails.push({
            billName: bill.name,
            amount: bill.perHeadAmount,
            paid: memberPayment.paid,
          });
        }
      });

      return {
        userId: member._id,
        name: member.name,
        image: member.image,
        totalOwed,
        totalPaid,
        totalPending: totalOwed - totalPaid,
        billDetails,
      };
    });

    const summary = {
      month: parseInt(month),
      year: parseInt(year),
      totalBills: bills.length,
      totalAmount,
      totalPerHead,
      bills: bills.map((bill) => ({
        id: bill._id,
        name: bill.name,
        totalAmount: bill.totalAmount,
        perHeadAmount: bill.perHeadAmount,
        date: bill.date,
        paidCount: bill.members.filter((m) => m.paid).length,
        totalMembers: bill.members.length,
      })),
      memberSummary,
      mess: {
        id: mess._id,
        name: mess.name,
        totalMembers: mess.members.length,
      },
    };

    res.json(summary);
  } catch (error) {
    console.error("Error in getBillSummary:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
