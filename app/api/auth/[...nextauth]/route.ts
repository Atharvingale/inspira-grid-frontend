import NextAuth, { NextAuthOptions } from 'next-auth';
import GithubProvider from 'next-auth/providers/github';
import { getFirestore, initAdmin } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export const authOptions: NextAuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'read:user user:email public_repo',
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        if (account?.provider === 'github' && profile) {
          // Store GitHub data in Firestore
          initAdmin();
          const db = getFirestore();
          
          // Get the Firebase user ID from session or create mapping
          // For now, we'll use GitHub ID as reference
          const githubProfile = profile as any;
          
          // You can link this to your Firebase user later
          // For now, store GitHub profile data
          console.log('GitHub sign in successful:', {
            id: githubProfile.id,
            login: githubProfile.login,
            name: githubProfile.name,
          });
          
          return true;
        }
        return true;
      } catch (error) {
        console.error('Error in signIn callback:', error);
        return false;
      }
    },
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.githubId = (profile as any).id;
        token.githubLogin = (profile as any).login;
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).githubId = token.githubId;
        (session.user as any).githubLogin = token.githubLogin;
        (session.user as any).accessToken = token.accessToken;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
