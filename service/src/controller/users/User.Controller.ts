import { Request, Response } from "express";
import Users, { IUser } from "../../model/users/UsersAuth.Model";
import mongoose from "mongoose";
import AppResponse from "../../services/index";
import userServices from "../../services/users/User.Services";

import sortData from "../../middleware/utils";

class UserController {
  // initialisation constructor
  constructor() { }

  // =========================================================================
  // Get all users
  // =========================================================================
  GetAllUsers = (req: Request, res: Response) => {
    let query;
    Users.find(query || {})
      .select("-password -createdAt -updatedAt")
      .populate("role")
      .then((user) => {
        const {
          q = "",
          perPage = 10,
          page = 1,
          sortBy = "createdAt",
          sortDesc = false,
          role = "",
          status = "",
          select = "all",
        } = req.query;

        const queryLowered = q.toLowerCase();

        const filteredData = user.filter((item) => {
          return (
            // search
            (
              item.name.last.toLowerCase().includes(queryLowered) ||
              item.name.first.toLowerCase().includes(queryLowered) ||
              item.username.toLowerCase().includes(queryLowered) ||
              item.email.toLowerCase().includes(queryLowered) ||
              item.role.toLowerCase().includes(queryLowered) ||
              item.status.toLowerCase().includes(queryLowered)) &&
            item.role.toString() ===
            (role.toString() || item.role.toString()) &&
            item.status.toString() ===
            (status.toString() || item.status.toString())
          );
        });

        const sortedData = filteredData.sort(sortData.sortCompare(sortBy));
        if (sortDesc === "true") {
          sortedData.reverse();
        }

        // result to show
        const dataFinal = sortData.selectFields(sortedData, select);

        res.status(200).json({
          success: true,
          users: sortData.paginateArray(dataFinal, perPage, page),
          total: filteredData.length,
          message: "List of all users",
        });
      })
      .catch((err) => {
        res.status(500).end();
      });
  };

  // =========================================================================
  // Get user by id
  // =========================================================================
  GetUser(req: any, res: Response): void {
    Users.findOne({ _id: req.params.id })
      .then((user) => {
        res.status(200).json({
          success: true,
          message: "One user found",
          body: user,
        });
      })
      .catch((err) => {
        res.status(404).json({ success: false, message: err });
      });
  }

  // =========================================================================
  // Change statut user inactive
  // =========================================================================
  InactiveUser(req: any, res: Response): void {
    Users.findOneAndUpdate({ _id: req.params.id }, { status: "inactive" })
      .then((user) => {
        res.json({ success: true, message: `user ${req.params.id} deleted !` });
      })
      .catch((err) => {
        res.json({ success: false, message: err });
      });
  }

  // =========================================================================
  // update user by id
  // =========================================================================
  UpdateUser(req: any, res: Response): void {
    Users.findOneAndUpdate({ _id: req.params.id }, req.body, {
      new: true,
      upsert: true,
    })
      .then((user) => {
        res.json({
          success: true,
          messsage: `User ${req.params.id} updated !`,
          body: user,
        });
      })
      .catch((err) => {
        res.json({ success: false, message: err });
      });
  }

  // =========================================================================
  // delete user by id
  // =========================================================================
  DeleteUser(req: any, res: Response): void {
    Users.deleteOne({ _id: req.params.id })
      .then((user) => {
        res.json({ success: true, message: `User ${req.params.id} deleted !` });
      })
      .catch((err) => {
        res.json({ success: false, message: err });
      });
  }

  // =========================================================================
  // blocked user by id
  // =========================================================================
  // @desc    : blocked user by id
  // @route   : POST /api/v1/user/blocked/:id
  // @access  : Private
  // @param   : id
  blockUser(req: any, res: Response): void {
    const userId = req.user
    const userToBlock = req.params.id
    userServices.userFindOne(userId)
      .then((user) => {
        if (user?.blockedUsers.includes(userToBlock)) {
          AppResponse.fail(res, "User already blocked")
        } else {
          Users.findOneAndUpdate({ _id: userId }, { $push: { blockedUsers: userToBlock } }, { new: true })
            .then((user) => {
              AppResponse.success(res, `User ${userToBlock} blocked !`)
            }).catch((err) => {
              AppResponse.fail(res, err)
            })
        }
      })
      .catch((err) => {
        AppResponse.fail(res, err)
      });
  }

  // =========================================================================
  // unblocked user by id
  // =========================================================================
  // @desc    : unblocked user by id
  // @route   : POST /api/v1/user/unblocked/:id
  // @access  : Private
  // @param   : id
  unblockUser(req: any, res: Response): void {
    const userId = req.user
    const userToBlock = req.params.id
    userServices.userFindOne(userId)
      .then((user) => {
        if (user?.blockedUsers.includes(userToBlock)) {
          Users.findOneAndUpdate({ _id: userId }, { $pull: { blockedUsers: userToBlock } }, { new: true })
            .then((user) => {
              AppResponse.success(res, `User ${userToBlock} unblocked !`)
            }).catch((err) => {
              AppResponse.fail(res, err)
            })
        } else {
          AppResponse.fail(res, "User not blocked")
        }
      }).catch((err) => {
        AppResponse.fail(res, err)
      })
  }

  // =========================================================================
  // get blocked users
  // =========================================================================
  // @desc    : get blocked users
  // @route   : GET /api/v1/user/blocked
  // @access  : Private
  getBlockedUsers(req: any, res: Response): void {
    const userId = req.user
    userServices.userFindOne(userId)
      .then((user: any) => {
        if (user?.blockedUsers.length > 0) {
          Users.find({ _id: { $in: user.blockedUsers } })
            .then((users) => {
              const data = users.map((user) => {
                return {
                  _id: user._id,
                  lastname: user.name.last,
                  firstname: user.name.first,
                  email: user.email,
                }
              }).sort((a, b) => {
                return a._id.localeCompare(b._id)
              })
              AppResponse.success(res, data, users.length)
            }).catch((err) => {
              AppResponse.fail(res, err)
            })
        } else {
          AppResponse.fail(res, "No blocked users")
        }
      }).catch((err) => {
        AppResponse.fail(res, err)
      })
  }

}

const userController = new UserController();

export default userController;
