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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-xl font-bold text-primary-foreground">HDC</span>
          </div>
          <h1 className="text-2xl font-bold text-secondary">HDC Coop Bank</h1>
          <p className="text-muted-foreground text-sm mt-1">Loan Recovery System</p>
        </div>
        <LoginForm branches={branches} />
      </div>
    </div>
  )
}
