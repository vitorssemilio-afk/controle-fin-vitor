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
    "/api/accounts/:path*",
    "/api/transactions/:path*",
    "/api/categories/:path*",
    "/api/cards/:path*",
    "/api/invoices/:path*",
  ],
};
