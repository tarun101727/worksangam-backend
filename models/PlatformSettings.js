const PlatformSettingsSchema = new mongoose.Schema({
  registrationsOpen: Boolean,
  jobsEnabled: Boolean,
  maintenanceMode: Boolean,
});

export default mongoose.model("PlatformSettings", PlatformSettingsSchema);
