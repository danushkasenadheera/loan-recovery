"use client"

import { useActionState, useState } from "react"
import { loginAction } from "@/app/actions/auth-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, LogIn } from "lucide-react"

interface Branch {
  bankCode: string
  branchName: string
}

export function LoginForm({ branches }: { branches: Branch[] }) {
  const [state, formAction, isPending] = useActionState(loginAction, null)
  const [bankCode, setBankCode] = useState("")

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary font-bold">
          <LogIn className="h-5 w-5 text-accent" />
          Sign In
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4" suppressHydrationWarning>
          <input type="hidden" name="bankCode" value={bankCode} />

          <div className="space-y-2">
            <Label>Branch</Label>
            <Select value={bankCode} onValueChange={setBankCode}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={branches.length === 0 ? "No branches available" : "Select your branch"} />
              </SelectTrigger>
              <SelectContent>
                {branches.map((branch) => (
                  <SelectItem key={branch.bankCode} value={branch.bankCode}>
                    {branch.branchName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="userName">Username</Label>
            <Input
              id="userName"
              name="userName"
              type="text"
              required
              autoComplete="username"
              placeholder="Enter your username"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="Enter your password"
            />
          </div>

          {state?.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" disabled={isPending || !bankCode} className="w-full">
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
