import * as dotenv from "dotenv";
import * as path from "path";
import stripe from "stripe";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "string";

// initialize stripe payment

const stripeConfig = new stripe(STRIPE_SECRET_KEY, {
	apiVersion: "2020-08-27",
});

class PaymentService {
	constructor() {}

	// generates a stripe card token
	async genCardToken(
		data: object | any // data = req.body;
	) {
		const token = await stripeConfig.tokens.create({
			card: {
				number: data.cardNumber,
				exp_month: data.expiryMnt,
				exp_year: data.expiryYr,
				cvc: data.cvc,
			},
		});
		return token.id;
	}

	// actual charge of card with the token id returned from the method above
	async chargeCard(
		data: object | any // data = { orderObject, tokenId }
	) {
		const { price, currency, tokenId, description } = data;
		const chargeCard = await stripeConfig.charges.create({
			amount: price,
			source: tokenId,
			currency,
			description,
		});
		return chargeCard;
	}

	// validates if charge was successful
	async validateCharge(chargeId: string) {
		const details = await stripeConfig.charges.retrieve(chargeId);

		if (!details.paid) throw new Error("payment unsuccessful");

		return details;
	}
}

/**
 * Since stripe doesn't support all countries especially African countries,
 * We will add other payment methods as we continue build and see need fit we use best
 */

const stripePayment = new PaymentService();

export default stripePayment;
