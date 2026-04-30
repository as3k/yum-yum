import { Resend } from "resend"

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM = process.env.EMAIL_FROM ?? "YumYum <noreply@yumyum.app>"

function appUrl() {
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL.replace(/\/$/, "")
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return "http://localhost:3000"
}

export async function sendInviteEmail(to: string, name: string | null, token: string) {
  const url = `${appUrl()}/invite/${token}`

  if (!resend) {
    console.log(`[email] No RESEND_API_KEY — invite link for ${to}: ${url}`)
    return
  }

  await resend.emails.send({
    from: FROM,
    to,
    subject: "You're invited to YumYum 🍽️",
    html: `
      <p>Hi ${name ?? "there"},</p>
      <p>You've been approved! Set your password and get cooking:</p>
      <p><a href="${url}" style="background:#16a34a;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block">Accept invite</a></p>
      <p style="color:#6b7280;font-size:14px">Or copy this link: ${url}</p>
      <p style="color:#6b7280;font-size:14px">Link expires in 7 days.</p>
    `,
  })
}
