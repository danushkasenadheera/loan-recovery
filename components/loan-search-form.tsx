"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Loader2 } from "lucide-react"

interface LoanType {
  code: string
  description: string
}

interface Props {
  loanTypes: LoanType[]
  userBankCode: string
  defaultValues: {
    bankCode: string
    loanType: string
    loanCode: string
  }
}

export function LoanSearchForm({ loanTypes, userBankCode, defaultValues }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const isHeadOffice = userBankCode === "000"

  const [bankCode, setBankCode] = useState(defaultValues.bankCode)
  const [loanType, setLoanType] = useState(defaultValues.loanType)
  const [loanCode, setLoanCode] = useState(defaultValues.loanCode)

  const canSearch = bankCode.trim() !== "" && loanType !== "" && loanCode.trim() !== ""

  const handleSearch = () => {
    if (!canSearch) return
    startTransition(() => {
      const params = new URLSearchParams({ BankCode: bankCode, LoanType: loanType, LoanCode: loanCode })
      router.push(`/dashboard?${params}`)
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-secondary">
          <Search className="h-5 w-5" />
          Loan Search
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Bank Code</Label>
            <Input
              value={bankCode}
              onChange={(e) => isHeadOffice && setBankCode(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!isHeadOffice}
              className={!isHeadOffice ? "bg-muted cursor-not-allowed" : ""}
              placeholder="000"
            />
            {!isHeadOffice && (
              <p className="text-xs text-muted-foreground">Auto-populated from your account</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Loan Type</Label>
            <Select value={loanType} onValueChange={setLoanType}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select loan type" />
              </SelectTrigger>
              <SelectContent>
                {loanTypes.map((type) => (
                  <SelectItem key={type.code} value={type.code}>
                    {type.code} — {type.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Loan Code</Label>
            <Input
              value={loanCode}
              onChange={(e) => setLoanCode(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="00000028"
              maxLength={8}
            />
            <p className="text-xs text-muted-foreground">8-digit loan code</p>
          </div>
        </div>

        <Button onClick={handleSearch} disabled={!canSearch || isPending} className="w-full">
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              Get Loan
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
