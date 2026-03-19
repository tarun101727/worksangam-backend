// utils/adminLogger.js
import AdminLog from "../models/AdminLog.js";

export const logAdminAction = async ({
  adminId,
  action,
  targetType,
  targetId,
  meta = {},
}) => {
  await AdminLog.create({
    adminId,
    action,
    targetType,
    targetId,
    meta,
  });
};
