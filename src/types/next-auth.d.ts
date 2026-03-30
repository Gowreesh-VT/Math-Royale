import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      setCodeforcesHandle: boolean;
      teamId: string;
      teamName: string;
      hasRound2Access: boolean;
      codeforcesHandle:string|null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    setCodeforcesHandle: boolean;
    teamId: string;
    teamName: string;
    hasRound2Access: boolean;
    codeforcesHandle:string;
  }
}


