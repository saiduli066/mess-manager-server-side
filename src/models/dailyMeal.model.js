// models/dailyMeal.model.js
import { Schema, model } from "mongoose";

const dailyMealSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    messId: { type: Schema.Types.ObjectId, ref: "Mess", required: true },
    date: { type: Date, required: true, index: true },
    meals: {
      lunch: {
        count: { type: Number, default: 0, min: 0 }, // Supports fractions like 0.5, 1, 1.5, etc.
      },
      dinner: {
        count: { type: Number, default: 0, min: 0 }, // Supports fractions like 0.5, 1, 1.5, etc.
      },
    },
    totalMeals: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

dailyMealSchema.index({ messId: 1, date: 1 });
dailyMealSchema.index({ userId: 1, date: 1 });
dailyMealSchema.index({ userId: 1, messId: 1, date: 1 }, { unique: true });

// Pre-save hook to ensure totalMeals is always consistent with lunch + dinner counts
dailyMealSchema.pre("save", function (next) {
  const lunchCount = this.meals?.lunch?.count || 0;
  const dinnerCount = this.meals?.dinner?.count || 0;
  const calculatedTotal = lunchCount + dinnerCount;

  // Ensure totalMeals matches the sum
  if (this.totalMeals !== calculatedTotal) {
    console.warn(
      `⚠️ Correcting totalMeals inconsistency: ${this.totalMeals} -> ${calculatedTotal}`
    );
    this.totalMeals = calculatedTotal;
  }
  next();
});

const DailyMeal = model("DailyMeal", dailyMealSchema);
export default DailyMeal;
