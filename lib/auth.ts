import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { eq } from "drizzle-orm"
import bcrypt from "bcryptjs"
import { db } from "./db"
import { users, householdMembers } from "./db/schema"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await db.query.users.findFirst({
          where: eq(users.email, credentials.email as string),
        })
        if (!user) return null

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        )
        if (!valid) return null

        const membership = await db.query.householdMembers.findFirst({
          where: eq(householdMembers.userId, user.id),
        })

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          householdId: membership?.householdId ?? null,
          role: user.role,
        }
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.householdId = (user as { householdId?: string | null }).householdId ?? null
        token.role = (user as { role?: string }).role ?? "user"
      }
      return token
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string
        session.user.householdId = (token.householdId as string | null) ?? null
        session.user.role = (token.role as string) ?? "user"
      }
      return session
    },
  },
})
