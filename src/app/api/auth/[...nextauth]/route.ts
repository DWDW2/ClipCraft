import NextAuth, { NextAuthOptions, Session, User } from "next-auth";
import { JWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";

interface ExtendedJWT extends JWT {
  accessToken?: string;
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          scope: [
            "openid",
            "profile",
            "email",
            "https://www.googleapis.com/auth/calendar",
          ].join(" "),
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }): Promise<ExtendedJWT> {
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({
      session,
      token,
    }: {
      session: Session;
      token: ExtendedJWT;
      user: User;
      newSession?: Session;
      trigger?: "update";
    }): Promise<Session> {
      if (token.accessToken) {
        (session as any).accessToken = token.accessToken;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 60,
    updateAge: 60 * 60,
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
