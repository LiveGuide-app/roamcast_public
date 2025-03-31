import { stripe } from "../../lib/utils";

export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      const { account } = req.body;

      const accountLink = await stripe.accountLinks.create({
        account: account,
        refresh_url: `${req.headers.origin}/refresh/${account}`,
        return_url: `${req.headers.origin}/return/${account}`,
        type: "account_onboarding",
      });

      res.json({
        url: accountLink.url,
      });
    } catch (error) {
      console.error(
        "An error occurred when calling the Stripe API to create an account link:",
        error
      );
      res.status(500);
      res.send({ error: error.message });
    }
  }
}