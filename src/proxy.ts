import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    "/onboarding/:path*",
    "/dashboard/:path*",
    "/transactions/:path*",
    "/categories/:path*",
    "/cards/:path*",
    "/invoices/:path*",
    "/recurring/:path*",
    "/budgets/:path*",
    "/goals/:path*",
    "/reports/:path*",
    "/api/accounts/:path*",
    "/api/transactions/:path*",
    "/api/categories/:path*",
    "/api/cards/:path*",
    "/api/invoices/:path*",
    "/api/recurring-transactions/:path*",
    "/api/budgets/:path*",
    "/api/savings-goals/:path*",
    "/api/reports/:path*",
  ],
};
