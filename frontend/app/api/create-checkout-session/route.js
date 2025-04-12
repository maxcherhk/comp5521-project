import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
	apiVersion: "2023-10-16",
});

export async function POST(req) {
	try {
		// Parse the request body to get the amount
		const { amount } = await req.json();

		// Validate the amount (optional)
		if (!amount || amount <= 0) {
			return new Response(JSON.stringify({ error: "Invalid amount" }), { status: 400 });
		}

		// Create a Stripe checkout session
		const session = await stripe.checkout.sessions.create({
			metadata: {
				walletAddress: req.body.walletAddress,
				token: req.body.token,
			},
			payment_method_types: ["card"],
			line_items: [
				{
					price_data: {
						currency: "hkd",
						product_data: {
							name: "Buy Crypto Token",
						},
						unit_amount: amount, // Use the received amount
					},
					quantity: 1,
				},
			],
			mode: "payment",
			success_url: "http://localhost:3000/success",
			cancel_url: "http://localhost:3000/trade/buy",
		});

		return new Response(JSON.stringify({ url: session.url }), { status: 200 });
	} catch (error) {
		console.error("Error creating checkout session:", error);
		return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
	}
}
