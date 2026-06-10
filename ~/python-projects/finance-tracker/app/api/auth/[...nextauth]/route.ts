import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import db, { initDB } from '@/lib/db';
import bcrypt from 'bcryptjs';

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        await initDB();
        const result = await db.execute({
          sql: 'SELECT * FROM users WHERE email = ?',
          args: [credentials.email],
        });
        const user = result.rows[0];
        if (!user) return null;
        const valid = await bcrypt.compare(credentials.password, user.password as string);
        if (!valid) return null;
        return { id: String(user.id), email: user.email as string };
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user) (session.user as { id?: string }).id = token.id as string;
      return session;
    },
  },
});

export { handler as GET, handler as POST };
