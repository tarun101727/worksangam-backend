// controllers/adminController.js

import User from "../models/User.js";
import HirerPost from "../models/HirerPost.js";
import { logAdminAction } from "../utils/adminLogger.js";

/**
 * GET /owner/users
 */
export const getAllUsers = async (req, res) => {
  try {
    const {
      search = "",
      role = "",
    } = req.query;

    /*
    =========================
    FILTER OBJECT
    =========================
    */

    const filter = {};

    /*
    =========================
    ROLE FILTER
    =========================
    */

    if (
      role &&
      role.trim() !== ""
    ) {
      filter.role = role;
    }

    /*
    =========================
    SEARCH FILTER
    =========================
    */

    if (
      search &&
      search.trim() !== ""
    ) {
      filter.$or = [
        {
          email: {
            $regex: search,
            $options: "i",
          },
        },

        {
          firstName: {
            $regex: search,
            $options: "i",
          },
        },

        {
          lastName: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    /*
    =========================
    FETCH USERS
    =========================
    */

    const users =
      await User.find(filter)

        .sort({
          createdAt: -1,
        })

        .select(`
          email
          firstName
          lastName
          role
          isGuest
          isVerified
          isDisabled
          profession
          professionType
          createdAt
        `);

    res.json({
      users,
    });

  } catch (err) {

    console.error(
      "Get users error:",
      err,
    );

    res.status(500).json({
      msg:
        "Failed to fetch users",
    });
  }
};

/**
 * GET /owner/stats
 */
export const getAdminStats = async (
  req,
  res,
) => {
  try {

    const todayStart =
      new Date();

    todayStart.setHours(
      0,
      0,
      0,
      0,
    );

    const [
      totalUsers,
      totalEmployees,
      totalHirers,
      totalOwners,
      liveEmployees,
      totalJobPosts,
      jobsFilledToday,
    ] = await Promise.all([

      User.countDocuments({
        role: {
          $ne: "guest",
        },
      }),

      User.countDocuments({
        role: "employee",
      }),

      User.countDocuments({
        role: "hirer",
      }),

      User.countDocuments({
        role: "owner",
      }),

      User.countDocuments({
        role: "employee",
        isAvailable: true,
      }),

      HirerPost.countDocuments(),

      HirerPost.countDocuments({
        status: "filled",

        updatedAt: {
          $gte: todayStart,
        },
      }),
    ]);

    res.json({
      totalUsers,
      totalEmployees,
      totalHirers,
      totalOwners,
      liveEmployees,
      totalJobPosts,
      jobsFilledToday,
    });

  } catch (err) {

    console.error(
      "Owner stats error:",
      err,
    );

    res.status(500).json({
      msg:
        "Failed to load owner stats",
    });
  }
};

/**
 * PATCH /owner/users/:id/toggle-disable
 */
export const toggleUserDisable =
  async (
    req,
    res,
  ) => {
    try {

      const user =
        await User.findById(
          req.params.id,
        );

      if (!user) {
        return res.status(404).json({
          msg: "User not found",
        });
      }

      user.isDisabled =
        !user.isDisabled;

      await user.save();

      /*
      =========================
      OWNER LOG
      =========================
      */

      await logAdminAction({
        adminId:
          req.user.id,

        action:
          "TOGGLE_USER_DISABLE",

        targetType:
          "user",

        targetId:
          user._id,
      });

      res.json({
        msg:
          user.isDisabled
            ? "User disabled"
            : "User enabled",

        isDisabled:
          user.isDisabled,
      });

    } catch (err) {

      console.error(
        "Toggle disable error:",
        err,
      );

      res.status(500).json({
        msg: "Action failed",
      });
    }
  };

/**
 * PATCH /owner/users/:id/role
 */
export const changeUserRole =
  async (
    req,
    res,
  ) => {
    try {

      const { role } =
        req.body;

      /*
      =========================
      VALIDATE ROLE
      =========================
      */

      if (
        ![
          "hirer",
          "employee",
          "guest",
          "owner",
        ].includes(role)
      ) {
        return res.status(400).json({
          msg:
            "Invalid role",
        });
      }

      /*
      =========================
      FIND USER
      =========================
      */

      const user =
        await User.findById(
          req.params.id,
        );

      if (!user) {
        return res.status(404).json({
          msg:
            "User not found",
        });
      }

      /*
      =========================
      UPDATE ROLE
      =========================
      */

      user.role = role;

      /*
      KEEP GUEST FLAG IN SYNC
      */

      user.isGuest =
        role === "guest";

      await user.save();

      /*
      =========================
      OWNER LOG
      =========================
      */

      await logAdminAction({
        adminId:
          req.user.id,

        action:
          "CHANGE_USER_ROLE",

        targetType:
          "user",

        targetId:
          user._id,

        meta: {
          newRole: role,
        },
      });

      res.json({
        msg:
          "Role updated",

        role:
          user.role,
      });

    } catch (err) {

      console.error(
        "Change role error:",
        err,
      );

      res.status(500).json({
        msg:
          "Role update failed",
      });
    }
  };

/**
 * PATCH /owner/users/:id/soft-delete
 */
export const softDeleteUser =
  async (
    req,
    res,
  ) => {
    try {

      const user =
        await User.findById(
          req.params.id,
        );

      if (!user) {
        return res.status(404).json({
          msg:
            "User not found",
        });
      }

      /*
      PREVENT DOUBLE DELETE
      */

      if (user.isDeleted) {
        return res.status(400).json({
          msg:
            "User already deleted",
        });
      }

      user.isDeleted = true;

      user.deletedAt =
        new Date();

      await user.save();

      /*
      =========================
      OWNER LOG
      =========================
      */

      await logAdminAction({
        adminId:
          req.user.id,

        action:
          "SOFT_DELETE_USER",

        targetType:
          "user",

        targetId:
          user._id,
      });

      res.json({
        msg:
          "User soft deleted successfully",
      });

    } catch (err) {

      console.error(
        "Soft delete error:",
        err,
      );

      res.status(500).json({
        msg:
          "Failed to delete user",
      });
    }
  };
