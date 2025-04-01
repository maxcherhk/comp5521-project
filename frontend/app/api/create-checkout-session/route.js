import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
	apiVersion: "2023-10-16",
});

export async function POST() {
	const session = await stripe.checkout.sessions.create({
		payment_method_types: ["card"],
		line_items: [
			{
				price_data: {
					currency: "usd",
					product_data: {
						name: "Buy Crypto Token",
					},
					unit_amount: 1000, // $10.00
				},
				quantity: 1,
			},
		],
		mode: "payment",
		success_url: "http://localhost:3000/success",
		cancel_url: "http://localhost:3000/cancel",
	});

	return Response.json({ url: session.url });
}
