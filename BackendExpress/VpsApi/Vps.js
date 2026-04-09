// src/models/Vps.js
import mongoose from "mongoose";
const { Schema } = mongoose;

const VpsSchema = new Schema(
  {
    // Human-readable label the user gives their VPS
    name: { type: String, required: true },

    // The Docker container running this VPS
    containerId: { type: String, required: true },

    // Random host port Docker assigned to nginx port 80
    port: { type: Number, required: true },

    // Public access URL:  http://vps-<shortId>.localhost:<port>
    url: { type: String, required: true },

    // Subdomain label (used in the URL)
    subdomain: { type: String, required: true },

    // Path on the host that is bind-mounted into /home/user
    workspacePath: { type: String, required: true },

    // Container lifecycle status
    status: {
      type: String,
      enum: ["running", "stopped", "error"],
      default: "running",
    },

    // Owner — references User._id
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

const Vps = mongoose.model("Vps", VpsSchema);
export default Vps;
