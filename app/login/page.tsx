import { redirect } from "next/navigation"
import { getSession } from "@/lib/jwt"
import { LoginForm } from "@/components/login-form"

export interface Branch {
  bankCode: string
  branchName: string
}

async function fetchBranches(): Promise<Branch[]> {
  try {
    const res = await fetch(`${process.env.API_BASE_URL}/branches`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export default async function LoginPage() {
  const session = await getSession()
  if (session) redirect("/dashboard")

  const branches = await fetchBranches()

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/login-background.png" alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative z-10 w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="HDC Coop Bank" className="h-20 w-auto drop-shadow-lg" />
          <p className="text-white text-2xl font-bold tracking-widest drop-shadow uppercase">Loan Recovery System</p>
        </div>
        <LoginForm branches={branches} />
      </div>
    </div>
  )
}
