const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const managerSchema = new Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Secure storage required
});

// ✅ Prevents duplicate model compilation
const ManagerModel =
  mongoose.models.registrations ||
  mongoose.model("registrations", managerSchema);

module.exports = ManagerModel;
