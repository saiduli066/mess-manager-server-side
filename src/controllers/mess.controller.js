import crypto from "crypto";
import Mess from "../models/mess.model";
import User from "../models/user.model";


export const createMess = async (req, res) => {
    try {
        const name = req.body;   //Mess name;
        const userId = req.userId
        
        //generate invite HEX code
        const inviteCode = crypto.randomBytes(4).toString("hex");

        const mess = new Mess({
            name,
            inviteCode,
            createdBy: userId

        });

        await mess.save();

        await User.findByIdAndUpdate(userId, {
            messId: mess._id,
            role: "admin"
        });

        res.status(201).json({ message: "Mess created", mess });


    } catch (error) {
        console.error("Error in createMess:", error.message);
        res.status(500).json({ message: "Internal server error" });
        
    }
}
