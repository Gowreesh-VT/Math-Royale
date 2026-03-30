import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { connectDB } from "@/lib/db";
import Team from "@/models/Team";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },

  secret: process.env.NEXTAUTH_SECRET,

  // Use NEXTAUTH_URL from environment variables
  ...(process.env.NEXTAUTH_URL && { 
    url: process.env.NEXTAUTH_URL 
  }),

  pages: {
    signIn: '/login',
    error: '/login',
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production'
        ? '__Secure-next-auth.session-token'
        : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },

  callbacks: {
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl + "/round1";
    },

    async signIn({ user }) {
      try {
        await connectDB();

        if (!user.email) {
          console.log("Sign-in denied: No email provided in user object.");
          return false;
        }

        const teamExists = await Team.findOne({ email: user.email });

        if (!teamExists) {
          console.log(`Sign-in denied: Email ${user.email} not found in team database.`);
          return false;
        }

        console.log(`Sign-in successful: ${user.email}`);
        return true;
      } catch (error) {
        console.error("Sign-in error:", error);
        return false;
      }
    },



    //  Runs on login & every request (JWT creation)
    async jwt({ token }) {
      if (!token.email) return token;

      await connectDB();

      const team = await Team.findOne({ email: token.email });

      if (team) {
        token.teamId = team._id.toString();
        token.teamName = team.teamName;
        token.setCodeforcesHandle = team.codeforcesHandle == null;
        token.hasRound2Access = team.hasRound2Access || false;
        token.codeforcesHandle = team.codeforcesHandle || "";
      }

      return token;
    },

    // Expose value to frontend session
    async session({ session, token }) {
      if (session.user) {
        session.user.setCodeforcesHandle =
          token.setCodeforcesHandle as boolean;
        session.user.teamId = token.teamId as string;
        session.user.teamName = token.teamName as string;
        session.user.hasRound2Access = token.hasRound2Access as boolean;
        session.user.codeforcesHandle = token.codeforcesHandle as string;
      }

      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };