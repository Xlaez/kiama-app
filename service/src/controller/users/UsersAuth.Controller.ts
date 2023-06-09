import { Request, Response } from "express";
import Users, { IUser } from "../../model/users/UsersAuth.Model";
import Roles, { IRole } from "../../model/Role.Model";
import Profiles, { IProfile } from "../../model/users/Profiles.Model";
import Sessions, { ISession } from "../../model/users/Sessions.Model";
import mongoose from "mongoose";
import userServices from "../../services/users/User.Services";
import AppResponse from "../../services/index";
import AuthService from "../../services/users/Auth.Services";

import joiValidation from "../../libs/joiValidation";

import jwt from "jsonwebtoken";

class UserController {
  // initialisation constructor
  constructor() { }

  // =========================================================================
  // Add user
  // =========================================================================
  AddUser = async (req: Request, res: Response, body: any) => {
    // validation signup
    const { error } = joiValidation.signupValidation(req.body);
    if (error) return res.status(400).json(error.message);

    // validation email
    const emailExist = await Users.findOne({ email: req.body.email });
    if (emailExist)
      return res.status(400).json({ message: "email already exists" });

    // saving new User
    try {
      const user: IUser = new Users({
        name: {
          first: req.body.name.first,
          last: req.body.name.last,
        },
        username: req.body.username,
        gender: req.body.gender,
        birthday: req.body.birthday,
        email: req.body.email,
        avatar: req.file?.path,
        password: req.body.password,
        role: req.body.role,
        status: req.body.status,
        personalAbility: req.body.personalAbility,
      });
      user.password = await user.encryptPassword(user.password);
      let usernameFinal = userServices.proposeUsername(req.body.username);
      usernameFinal
        .then((username) => {
          user.username = username;
        })
        .then(() => {
          user.save();
          // add user id into the profile
          const profile: IProfile = new Profiles({
            user: user._id,
          });
          profile.save();
          const session: ISession = new Sessions({
            user: user._id,
          });
          session.save();
          res
            .status(201)
            .json({
              success: true,
              message: "user created",
              user: user,
            });
        })
    } catch (e) {
      res.status(400).json({ success: false, message: e });
    }
  };

  // =========================================================================
  // Login user
  // =========================================================================

  Login = async (req: Request, res: Response) => {
    // Login validation
    const { error } = joiValidation.loginValidation(req.body);
    if (error) return res.status(400).json(error.message);

    // validation
    const user = await Users.findOne({
      email: req.body.email,
      status: "active",
    });

    if (!user)
      return res.status(400).json({
        success: false,
        message: "Email not found, please check your email and try again",
      });

    // validation password
    const correctPassword: Boolean = await user.validatePassword(
      req.body.password
    );
    if (!correctPassword)
      return res.status(400).json({
        success: false,
        message: "Password is incorrect",
      });

    // generate token
    const token = AuthService.generateJWT(user._id);
    const cookie = AuthService.createCookie(token);

    // populate user roleId
    const userRole = await Roles.findById(user.role);

    // get user data
    const userData = {
      _id: user._id,
      firstName: user.name.first,
      lastName: user.name.last,
      role: userRole?.name,
      ability: userRole?.ability.concat(user.personalAbility),
      avatar: user.avatar,
    };

    res.setHeader('Set-Cookie', [cookie]);
    res.json({
      success: true,
      message: "user logged in",
      user: userData,
    });
  };

  // =========================================================================
  // Get profile user
  // =========================================================================
  profile = async (req: Request, res: Response) => {
    // verification user payload token with no password
    const user = await Users.findById(req.body, {
      password: 0,
      createdAt: 0,
      updatedAt: 0,
    });
    const token = req.header("Authorization");
    if (!user) {
      return res.status(404).json("No User found");
    }

    res.json({ token, user });
  };

  // =========================================================================
  // refresh token
  // =========================================================================
  refreshToken = async (req: Request, res: Response) => {
    const token = req.header("Authorization");
    if (!token) return res.status(401).json("No token provided");

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'defaultToken');
    if (!decoded) return res.status(401).json("Invalid token");

    // @ts-ignore
    const user = await Users.findById(decoded._id);
    if (!user) return res.status(404).json("No user found");

    const newToken = AuthService.generateJWT(user._id);
    const cookie = AuthService.createCookie(newToken);

    res.setHeader('Set-Cookie', [cookie]);
    res.json({
      success: true,
      message: "token refreshed",
      token: newToken,
    });
  };

  // Update password for user
  UpdatePassword = async (req: Request, res: Response) => {
    // validation update password
    const { error } = joiValidation.updatePasswordValidation(req.body);
    if (error) return res.status(400).json(error.message);

    const user = await Users.findById({ _id: req.params.id });
    if (!user) return res.status(400).json({ message: "user not found" });

    // validation password
    const correctPassword: Boolean = await user.validatePassword(
      req.body.oldPassword
    );
    if (!correctPassword)
      return res.status(400).json({ message: "Incorrect password" });

    user.password = await user.encryptPassword(req.body.newPassword);
    await user.save();
    res.json({ success: true, message: "Password changed successfully" });
  };

  // =========================================================================
  // logout user
  // =========================================================================
  // @desc    : logout user
  // @route   : PUT /api/v1/user/logout
  // @access  : Private
  // @param   : id

  Logout = async (req: Request, res: Response) => {
    try {
      res.setHeader('Set-Cookie', [AuthService.createCookie("")]);
      AppResponse.success(res, ` Logout successfully`);
    } catch (error) {
      AppResponse.fail(res, error);
    }
  }
}

const userController = new UserController();

export default userController;
