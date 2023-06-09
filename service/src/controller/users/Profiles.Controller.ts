import { Request, Response } from "express";
import Profiles, { IProfile } from "../../model/users/Profiles.Model";
import Users, { IUser } from "../../model/users/UsersAuth.Model";
import AppResponse from "../../services/index";
import sortData from "../../middleware/utils";
import checkObjectId from "../../middleware/checkObjectId";
import JoiValidate from "../../libs/joiValidation";
import normalizeUrl from "normalize-url";
class ProfileController {
	constructor() {}
	// =========================================================================
	// Add a new profile
	// =========================================================================
	// @desc    : Add a new profile
	// @route   : POST /api/v1/profile
	// @access  : Private
	create(req: Request, res: Response): void {
		Profiles.create(req.body)
			.then((profile) => {
				AppResponse.created(res, profile);
			})
			.catch((err) => {
				AppResponse.fail(res, err);
			});
	}

	// =========================================================================
	// update a profile
	// =========================================================================
	// @desc    : Update a profile
	// @route   : PUT /api/v1/profile/:id
	// @access  : Private
	// @param   : id
	update(req: any, res: Response): void {
		Profiles.findOneAndUpdate({ _id: req.params.id }, req.body, {
			new: true,
			upsert: true,
		})
			.then((profile) => {
				AppResponse.success(res, profile);
			})
			.catch((err) => {
				AppResponse.fail(res, err);
			});
	}

	// =========================================================================
	// delete a profile
	// =========================================================================
	// @desc    : Delete profile
	// @route   : DELETE /api/v1/profile/:id
	// @access  : Private
	// @param   : id
	deleteOne(req: Request, res: Response): void {
		Profiles.deleteOne({ _id: req.params.id })
			.then((profile) => {
				AppResponse.success(res, profile);
			})
			.catch((err) => {
				AppResponse.fail(res, err);
			});
	}

	// =========================================================================
	// Get all profiles
	// =========================================================================
	// @desc    : Get all profiles
	// @route   : GET /api/v1/profile
	// @access  : Private
	// @params   : search, perPage, page, sortBy, sortDesc, user, select
	getAll(req: Request, res: Response): void {
		let query;
		Profiles.find(query || {})
			.then((profile) => {
				const {
					search = "",
					perPage = 10,
					page = 1,
					sortBy = "createdAt",
					sortDesc = false,
					about = "",
					select = "all",
				} = req.query;

				const queryLowered = search.toLowerCase();

				const filteredData = profile.filter((item) => {
					return (
						// search
						item.about?.toLowerCase().includes(queryLowered) &&
						// Filter
						item.about.toString() ===
							(about.toString() || item.about.toString())
					);
				});

				const sortedData = filteredData.sort(sortData.sortCompare(sortBy));
				if (sortDesc === "true") {
					sortedData.reverse();
				}

				// result to show
				const dataFinal = sortData.selectFields(sortedData, select);
				AppResponse.success(
					res,
					sortData.paginateArray(dataFinal, perPage, page),
					filteredData.length
				);
			})
			.catch((err) => {
				console.log(err);
				AppResponse.fail(res, err);
			});
	}

	// =========================================================================
	// Get one profile
	// =========================================================================
	// @desc    : Get one profile
	// @route   : GET /api/v1/profile/:id
	// @access  : Private
	// @param   : id
	getOne(req: any, res: Response): void {
		Profiles.findOne({ user: req.params.id })
			.then((profile) => {
				AppResponse.success(res, profile);
			})
			.catch((err) => {
				AppResponse.fail(res, err);
			});
	}

	// =========================================================================
	// follow a profile
	// =========================================================================
	// @desc    : follow a profile
	// @route   : POST /api/v1/profile/:id/follow
	// @access  : Private
	// @param   : id
	followUser = async (req: any, res: Response, next: any): Promise<void> => {
		const userToFollow: any = await Profiles.findOne({ user: req.params.id });
		const user: any = await Profiles.findOne({ user: req.user });

		if (!userToFollow) {
			AppResponse.fail(res, "User not found");
		} else {
			if (user.following.includes(userToFollow._id)) {
				const indexFollowing = user.following.indexOf(userToFollow._id);
				user.following.splice(indexFollowing, 1);

				const indexFollower = userToFollow.followers.indexOf(user._id);
				userToFollow.followers.splice(indexFollower, 1);

				await user.save();
				await userToFollow.save();

				AppResponse.success(res, "Unfollowed");
			} else {
				user.following.push(userToFollow._id);
				userToFollow.followers.push(user._id);

				await user.save();
				await userToFollow.save();

				AppResponse.success(res, "Followed");
			}
		}
	};

	// =========================================================================
	// Get all followers
	// =========================================================================
	// @desc    : Get all followers for user by everyone
	// @route   : GET /api/v1/profile/:id/followers
	// @access  : Private
	// @param   : id
	getFollowers = async (req: any, res: Response, next: any): Promise<void> => {
		const user: any = await Profiles.findOne({ user: req.params.id }).select(
			"followers followersType"
		);
		if (!user) {
			AppResponse.fail(res, "User not found");
		} else {
			if (user._id === req.user) {
				const followers = await Profiles.find({ _id: { $in: user.followers } })
					.select("user")
					.populate({
						path: "user",
						select: "name avatar",
					});

				AppResponse.success(res, followers);
			} else {
				if (user.followersType === "public") {
					const followers = await Profiles.find({
						_id: { $in: user.followers },
					})
						.select("user")
						.populate({
							path: "user",
							select: "name avatar",
						});

					AppResponse.success(res, followers);
				} else {
					AppResponse.fail(res, "You can't see followers");
				}
			}
		}
	};

	// =========================================================================
	// Get all following
	// =========================================================================
	// @desc    : Get all following for user by everyone
	// @route   : GET /api/v1/profile/:id/following
	// @access  : Private
	// @param   : id
	getFollowing = async (req: any, res: Response, next: any): Promise<void> => {
		const user: any = await Profiles.findOne({ user: req.params.id }).select(
			"following followingType"
		);

		if (!user) {
			AppResponse.fail(res, "User not found");
		} else {
			if (req.user === req.params.id) {
				const following = await Profiles.find({ _id: { $in: user.following } })
					.select("user")
					.populate({
						path: "user",
						select: "name avatar",
					});
				AppResponse.success(res, following);
			} else {
				if (user.followingType === "public") {
					const following = await Profiles.find({
						_id: { $in: user.following },
					})
						.select("user")
						.populate({
							path: "user",
							select: "name avatar",
						});

					AppResponse.success(res, following);
				} else {
					AppResponse.fail(res, "You can't see following");
				}
			}
		}
	};

	// =========================================================================
	// Get profile by userId
	// =========================================================================
	// @desc    : Get profile by userId
	// @route   : GET /api/v1/profile/user/:id
	// @access  : Private
	// @param   : id
	getProfileByUserId = async (
		req: any,
		res: Response,
		next: any
	): Promise<void> => {
		// if (!checkObjectId.isValid(res, req.params.id)) {
		//     return next();
		// }

		const profile = await Profiles.findOne({ user: req.params.id });
		if (!profile) {
			AppResponse.fail(res, "User not found");
		} else {
			AppResponse.success(res, profile);
		}
	};

	// =========================================================================
	// Function for education into the profile
	// =========================================================================
	// @desc    : Function for education into the profile
	// @route   : POST /api/v1/profile/education
	// @access  : Private
	// @param   : id
	addEducation = async (req: any, res: Response, next: any): Promise<void> => {
		const { errors } = JoiValidate.educationValidation(req.body);
		if (errors) {
			AppResponse.fail(res, errors);
		} else {
			const profile = await Profiles.findOne({ user: req.user });
			if (!profile) {
				AppResponse.fail(res, "User not found");
			} else {
				const newEducation = {
					school: req.body.school,
					degree: req.body.degree,
					fieldofstudy: req.body.fieldofstudy,
					from: req.body.from,
					to: req.body.to,
					current: req.body.current,
					description: req.body.description,
				};
				profile.education.unshift(newEducation);
				await profile.save();
				AppResponse.success(res, profile);
			}
		}
	};
	/**
	 * @desc    : delete education from the profile
	 * @route   : DELETE /api/v1/profile/education/:edu_id
	 * @access  : Private
	 * @param: edu_id
	 */
	deleteEducation = async (
		req: any,
		res: Response,
		next: any
	): Promise<void> => {
		const profile = await Profiles.findOne({ user: req.user });
		if (!profile) {
			AppResponse.fail(res, "User not found");
		} else {
			const removeIndex = profile.education
				.map((item: any) => item._id)
				.indexOf(req.params.edu_id);
			profile.education.splice(removeIndex, 1);
			await profile.save();
			AppResponse.success(res, profile);
		}
	};
	/**
	 * @desc    : update education from the profile
	 * @route   : PATCH /api/v1/profile/education/:edu_id
	 * @access  : Private
	 * @param   : edu_id
	 */
	updateEducation = async (
		req: any,
		res: Response,
		next: any
	): Promise<void> => {
		const { errors } = JoiValidate.educationValidation(req.body);
		if (errors) {
			AppResponse.fail(res, errors);
		} else {
			const profile = await Profiles.findOne({ user: req.user });
			if (!profile) {
				AppResponse.fail(res, "User not found");
			} else {
				const removeIndex = profile.education
					.map((item: any) => item.id)
					.indexOf(req.params.edu_id);
				profile.education[removeIndex] = {
					school: req.body.school,
					degree: req.body.degree,
					fieldofstudy: req.body.fieldofstudy,
					from: req.body.from,
					to: req.body.to,
					current: req.body.current,
					description: req.body.description,
				};
				await profile.save();
				console.log(profile);
				AppResponse.success(res, profile);
			}
		}
	};
	/**
	 * @desc    : get education from the profile
	 * @route   : GET /api/v1/profile/education/:edu_id
	 * @access  : Private
	 * @param   : edu_id
	 * @return  : education
	 */
	getEducation = async (req: any, res: Response, next: any): Promise<void> => {
		const profile = await Profiles.findOne({ user: req.user });
		if (!profile) {
			AppResponse.fail(res, "User not found");
		} else {
			const removeIndex = profile.education
				.map((item: any) => item.id)
				.indexOf(req.params.edu_id);
			AppResponse.success(res, profile.education[removeIndex]);
		}
	};

	// =========================================================================
	// Function for experience into the profile
	// =========================================================================
	/**
	 * @desc    : Function for experience into the profile
	 * @route   : POST /api/v1/profile/experience
	 * @access  : Private
	 * @param   : id
	 * @return  : experience
	 */
	addExperience = async (req: any, res: Response, next: any): Promise<void> => {
		const { errors } = JoiValidate.experienceValidation(req.body);
		if (errors) {
			AppResponse.fail(res, errors);
		} else {
			const profile = await Profiles.findOne({ user: req.user });
			if (!profile) {
				AppResponse.fail(res, "User not found");
			} else {
				const newExperience = {
					title: req.body.title,
					company: req.body.company,
					location: req.body.location,
					from: req.body.from,
					to: req.body.to,
					current: req.body.current,
					description: req.body.description,
				};
				profile.experience.unshift(newExperience);
				await profile.save();
				AppResponse.success(res, profile);
			}
		}
	};

	/**
	 * @desc    : delete experience from the profile
	 * @route   : DELETE /api/v1/profile/experience/:exp_id
	 * @access  : Private
	 * @param: exp_id
	 * @return  : experience
	 */
	deleteExperience = async (
		req: any,
		res: Response,
		next: any
	): Promise<void> => {
		const profile = await Profiles.findOne({ user: req.user });
		if (!profile) {
			AppResponse.fail(res, "User not found");
		} else {
			const removeIndex = profile.experience
				.map((item: any) => item._id)
				.indexOf(req.params.exp_id);
			profile.experience.splice(removeIndex, 1);
			await profile.save();
			AppResponse.success(res, profile);
		}
	};

	/**
	 * @desc    : update experience from the profile
	 * @route   : PATCH /api/v1/profile/experience/:exp_id
	 * @access  : Private
	 * @param   : exp_id
	 * @return  : experience
	 */
	updateExperience = async (
		req: any,
		res: Response,
		next: any
	): Promise<void> => {
		const { errors } = JoiValidate.experienceValidation(req.body);
		if (errors) {
			AppResponse.fail(res, errors);
		} else {
			const profile = await Profiles.findOne({ user: req.user });
			if (!profile) {
				AppResponse.fail(res, "User not found");
			} else {
				const removeIndex = profile.experience
					.map((item: any) => item.id)
					.indexOf(req.params.exp_id);
				profile.experience[removeIndex] = {
					title: req.body.title,
					company: req.body.company,
					location: req.body.location,
					from: req.body.from,
					to: req.body.to,
					current: req.body.current,
					description: req.body.description,
				};
				await profile.save();
				AppResponse.success(res, profile);
			}
		}
	};

	/**
	 * @desc    : get experience from the profile
	 * @route   : GET /api/v1/profile/experience/:exp_id
	 * @access  : Private
	 * @param   : exp_id
	 * @return  : experience
	 */
	getExperience = async (req: any, res: Response, next: any): Promise<void> => {
		const profile = await Profiles.findOne({ user: req.user });
		if (!profile) {
			AppResponse.fail(res, "User not found");
		} else {
			const removeIndex = profile.experience
				.map((item: any) => item.id)
				.indexOf(req.params.exp_id);
			AppResponse.success(res, profile.experience[removeIndex]);
		}
	};

	// =========================================================================
	// Function to add profile
	// =========================================================================
	/**
	 * @desc    : Function to add the profile
	 * @route   : POST /api/v1/profile
	 * @access  : Private
	 * @param   : id
	 * @return  : social
	 */
	addProfile = async (req: any, res: Response, next: any): Promise<void> => {
		const {
			websites,
			skills,
			youtube,
			twitter,
			instagram,
			linkedin,
			facebook,
			languages,
			interests,
			music,
			movies,
			books,
			sports,
			toC,
			fromC,
			...rest
		} = req.body;
		const profile = await Profiles.findOne({ user: req.user });
		if (!profile) {
			AppResponse.fail(res, "User not found");
		} else {
			// build a profile
			const profileFields = {
				user: req.user,
				websites:
					websites && websites !== ""
						? normalizeUrl(websites, { forceHttps: true })
						: "",
				skills: skills && skills !== "" ? skills.split(",") : [],
				languages: languages && languages !== "" ? languages.split(",") : [],
				interests: interests && interests !== "" ? interests.split(",") : [],
				music: music && music !== "" ? music.split(",") : [],
				movies: movies && movies !== "" ? movies.split(",") : [],
				books: books && books !== "" ? books.split(",") : [],
				sports: sports && sports !== "" ? sports.split(",") : [],
				...rest,
			};

			// Build socialFields object
			const socialFields = { youtube, twitter, instagram, linkedin, facebook };
			const contryFields = { toC, fromC };

			// normalize social fields to ensure valid url
			for (const [key, value] of Object.entries(socialFields)) {
				if (value && value.length > 0)
					// @ts-ignore
					socialFields[key] = normalizeUrl(value, { forceHttps: true });
			}
			for (const [key, value] of Object.entries(contryFields)) {
				if (value && value.length > 0)
					// @ts-ignore
					contryFields[key] = value;
			}
			// Build social object and add to profileFields
			profileFields.social = socialFields;
			profileFields.country = contryFields;

			try {
				// Using upsert option (creates new doc if no match is found):
				let profile = await Profiles.findOneAndUpdate(
					{ user: req.user },
					{ $set: profileFields },
					{ new: true, upsert: true }
				);
				AppResponse.success(res, profile);
			} catch (error) {
				AppResponse.fail(res, error);
			}
		}
	};
}

const profilesController = new ProfileController();

export default profilesController;
